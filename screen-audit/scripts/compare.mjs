#!/usr/bin/env node
// Compare one app screen against one mock frame, component by component.
//
//   compare.mjs --mock <dir with mock.png + mock.nodes.json> --app-png <png> --app-tree <json|xml>
//               --scale <device px per dp> --out <dir> [--tolerances <json>] [--tree-units px|dp]
//               [--mock-chrome-top <dp>]
//
// The app tree is mobile-mcp text lines or JSON, uiautomator XML, or raw `axe describe-ui` JSON (iOS: nested,
// frames in points — read natively, --tree-units is ignored for it).
//
// Joins mock text to app text, measures each pair from pixels (ink box, ink height, ink colour),
// measures each mock component (a painting box holding text) against its counterpart, and writes
// findings.json, findings.md and one mock|app crop per component under crops/.
//
// It measures and reports; it does not judge. Exit 0 = report written (with or without failures),
// 2 = process failure (missing input, size mismatch between scale and images).
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { PNG } from 'pngjs';

const args = process.argv.slice(2);
const opt = k => { const i = args.indexOf(k); return i < 0 ? undefined : args[i + 1]; };
const fail = m => { console.error(`compare: ${m}`); process.exit(2); };
const mockDir = opt('--mock'), appPng = opt('--app-png'), appTree = opt('--app-tree'), out = opt('--out');
const scale = Number(opt('--scale'));
for (const [k, v] of Object.entries({ mockDir, appPng, appTree, out })) if (!v || !existsSync(k === 'out' ? '.' : v)) fail(`missing ${k}`);
if (!(scale > 0)) fail('missing --scale');

const TOL = { position_dp: 3, gap_dp: 3, size_ratio: 0.08, size_dp: 1, text_color_de: 6, fill_de: 2, edge_dp: 3, backdrop_de: 8, width_dp: 0.5,
  ...(opt('--tolerances') ? JSON.parse(readFileSync(opt('--tolerances'), 'utf8')) : {}) };

const mock = JSON.parse(readFileSync(join(mockDir, 'mock.nodes.json'), 'utf8'));
const mImg = PNG.sync.read(readFileSync(join(mockDir, 'mock.png')));
const aImg = PNG.sync.read(readFileSync(appPng));
// Width is compared in dp, not px: an integer density leaves the device 374.8-374.9 dp wide, and both
// images are rounded to whole px. Accepts TOL.width_dp (0.5 dp) of difference.
if (Math.abs(mImg.width - aImg.width) / scale > TOL.width_dp) fail(`width mismatch: mock ${mImg.width}px (${(mImg.width / scale).toFixed(1)}dp), app ${aImg.width}px (${(aImg.width / scale).toFixed(1)}dp) at scale ${scale}; more than ${TOL.width_dp}dp apart — pin the device to the mock's dp width (see platforms/<platform>.md)`);

// ---------- app tree: axe JSON / mobile-mcp JSON / mobile-mcp text / uiautomator XML → {text,label,type,frame(dp)} ----------
// Android trees are in device pixels; mobile-mcp on iOS reports points — pass --tree-units dp.
const treeUnits = opt('--tree-units') || 'px';
// mobile-mcp text format, one element per line, optional header line(s) that do not start with a ref:
//   @e24 TextView text="NO ACTIVE PROGRAM" label="..." id="..." at=51,133 size=978x44 [selected] ...
function parseTextTree(raw) {
  const els = [];
  for (const line of raw.split(/\r?\n/)) {
    const h = line.match(/^\s*@\w+\s+(\S+)(.*)$/); if (!h) continue;
    const rest = h[2];
    const q = k => { const m = rest.match(new RegExp(`(?:^|\\s)${k}="((?:[^"\\\\]|\\\\.)*)"`)); return m ? m[1].replace(/\\(.)/g, '$1') : ''; };
    const at = rest.match(/\bat=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/), size = rest.match(/\bsize=(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)/);
    if (!at || !size) continue;
    els.push({ text: q('text'), label: q('label'), type: h[1], id: q('id') || q('identifier'), px: [+at[1], +at[2], +size[1], +size[2]] });
  }
  return els;
}
// axe describe-ui: nested array; StaticText → text = AXLabel, every other node → label = AXLabel (else AXValue). axe emits each StaticText twice: exact duplicates (type, label, frame) are dropped.
function flattenAxe(nodes, acc = [], seen = new Set()) {
  for (const n of nodes) {
    const type = n.type || n.role || '', isText = type === 'StaticText', s = n.AXLabel || n.AXValue || '', f = n.frame;
    if (s && f && !seen.has([type, s, f.x, f.y, f.width, f.height].join('|'))) {
      seen.add([type, s, f.x, f.y, f.width, f.height].join('|'));
      acc.push({ text: isText ? s : '', label: isText ? '' : s, type, id: n.AXUniqueId || '', px: [f.x, f.y, f.width, f.height], dp: true });
    }
    flattenAxe(n.children || [], acc, seen);
  }
  return acc;
}
const isAxe = j => Array.isArray(j) && j.some(n => n && typeof n.frame === 'object' && n.frame && ('AXLabel' in n || 'children' in n));
function loadTree(path) {
  const raw = readFileSync(path, 'utf8').trim();
  let els = [];
  if (!raw.startsWith('[') && !raw.startsWith('{') && !raw.startsWith('<')) {
    els = parseTextTree(raw);
    if (!els.length) fail(`${path}: no elements found (expected axe describe-ui JSON, mobile-mcp JSON, mobile-mcp text lines "@e1 Type text=... at=x,y size=WxH", or uiautomator XML)`);
  } else if (raw.startsWith('[') || raw.startsWith('{')) {
    const j = JSON.parse(raw); const list = Array.isArray(j) ? j : j.elements || [];
    if (isAxe(j)) els = flattenAxe(j); else els = list.map(e => ({ text: e.text || '', label: e.label || '', type: e.type || '', id: e.identifier || '',
      px: [e.coordinates.x, e.coordinates.y, e.coordinates.width, e.coordinates.height] }));
  } else {
    for (const m of raw.matchAll(/<node [^>]*>/g)) {
      const a = k => (m[0].match(new RegExp(`\\b${k}="([^"]*)"`)) || [])[1] || '';
      const b = a('bounds').match(/\d+/g)?.map(Number); if (!b) continue;
      els.push({ text: a('text'), label: a('content-desc'), type: a('class'), id: a('resource-id'), px: [b[0], b[1], b[2] - b[0], b[3] - b[1]] });
    }
  }
  return els.filter(e => !e.id.startsWith('com.android.systemui') && e.px[2] > 0 && e.px[3] > 0)
    .map(e => ({ ...e, frame: e.px.map(v => e.dp || treeUnits === 'dp' ? v : v / scale) })); // axe frames are always points
}
const app = loadTree(appTree);

// ---------- pixels ----------
const px = (img, x, y) => { const i = (img.width * y + x) << 2; return [img.data[i], img.data[i + 1], img.data[i + 2]]; };
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const lab = ([r, g, b]) => {
  const f = c => { c /= 255; return c > 0.04045 ? ((c + 0.055) / 1.055) ** 2.4 : c / 12.92; };
  const [R, G, B] = [f(r), f(g), f(b)];
  const xyz = [(R * .4124 + G * .3576 + B * .1805) / .95047, R * .2126 + G * .7152 + B * .0722, (R * .0193 + G * .1192 + B * .9505) / 1.08883]
    .map(t => t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  return [116 * xyz[1] - 16, 500 * (xyz[0] - xyz[1]), 200 * (xyz[1] - xyz[2])];
};
const dE = (a, b) => { const [p, q] = [lab(a), lab(b)]; return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]); };
const hex = c => '#' + c.map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
const parseRgb = s => (s.match(/[\d.]+/g) || []).slice(0, 3).map(Number);
// Where to look for a mock text's glyphs: its Range rect padded 2dp, else its content box.
const textArea = n => n.glyphs ? [n.glyphs[0] - 2, n.glyphs[1] - 2, n.glyphs[2] + 4, n.glyphs[3] + 4] : (n.content || n.frame);
const clampBox = (img, [x, y, w, h]) => {
  const x0 = Math.max(0, Math.floor(x)), y0 = Math.max(0, Math.floor(y));
  return [x0, y0, Math.max(0, Math.min(img.width, Math.ceil(x + w)) - x0), Math.max(0, Math.min(img.height, Math.ceil(y + h)) - y0)];
};

// Background a text sits on: median of the box's perimeter, 2px outside it. A gradient has no
// mode and a big glyph does, so the mode would pick the text.
function dominant(img, box) {
  const [x0, y0, w, h] = clampBox(img, [box[0] - 2, box[1] - 2, box[2] + 4, box[3] + 4]); const ring = [];
  for (let x = x0; x < x0 + w; x++) { ring.push(px(img, x, y0)); ring.push(px(img, x, y0 + h - 1)); }
  for (let y = y0; y < y0 + h; y++) { ring.push(px(img, x0, y)); ring.push(px(img, x0 + w - 1, y)); }
  if (!ring.length) return [0, 0, 0];
  return [0, 1, 2].map(i => ring.map(c => c[i]).sort((a, b) => a - b)[ring.length >> 1]);
}

// Distance from c to the segment a→b (a text pixel is a mix of background a and text colour b).
function segDist(c, a, b) {
  const ab = b.map((v, i) => v - a[i]), t = Math.max(0, Math.min(1, ab.reduce((s, v, i) => s + v * (c[i] - a[i]), 0) / (ab.reduce((s, v) => s + v * v, 0) || 1)));
  return dist(c, a.map((v, i) => v + t * ab[i]));
}

// Ink: pixels far from the background. Box in px, colour = the strongest third of the ink.
// With `expect` (the mock's own text colour, known exactly) only pixels near it count, so a busy
// background under the mock's text cannot pass for glyphs. The app's colour is unknown (a wrong one
// must stay measurable), so `refine` goes two passes: pass 1 finds the colour the text really is,
// pass 2 re-boxes on that colour, so cloud pixels behind the text stop counting as glyphs. Pass 2 also
// requires the pixel to sit on the background→colour line (a glyph edge is a blend of the two): on a
// light backdrop the ball around the colour is wide enough to swallow grey cloud.
function ink(img, boxDp, expect, refine) {
  const box = clampBox(img, boxDp.map(v => v * scale)); const bg = dominant(img, box);
  let x1 = Infinity, y1 = Infinity, x2 = -1, y2 = -1; const strong = [];
  for (let y = box[1]; y < box[1] + box[3]; y++) for (let x = box[0]; x < box[0] + box[2]; x++) {
    const c = px(img, x, y); const d = dist(c, bg);
    if (d > 48 && (!expect || (dist(c, expect) < 0.5 * dist(expect, bg) + 24 && (!refine || segDist(c, bg, expect) < 16)))) { x1 = Math.min(x1, x); y1 = Math.min(y1, y); x2 = Math.max(x2, x); y2 = Math.max(y2, y); strong.push([d, c]); }
  }
  if (x2 < 0) return null;
  strong.sort((a, b) => b[0] - a[0]); const top = strong.slice(0, Math.max(1, Math.floor(strong.length / 3)));
  const color = top.reduce((s, [, c]) => s.map((v, i) => v + c[i] / top.length), [0, 0, 0]);
  const r = { box: [x1 / scale, y1 / scale, (x2 - x1 + 1) / scale, (y2 - y1 + 1) / scale], color, bg };
  if (!refine || expect) return r;
  const p2 = ink(img, boxDp, color, true); // the reported colour stays pass 1's: the observed one
  return p2 ? { ...r, box: p2.box } : r;
}
const appInk = (img, boxDp) => ink(img, boxDp, undefined, true);

// Edge of a filled container: walk outward from a point until the colour departs from the fill.
function edge(img, xDp, yDp, dx, dy, limitDp = 80) {
  let x = Math.round(xDp * scale), y = Math.round(yDp * scale); const fill = px(img, x, y);
  for (let s = 0; s < limitDp * scale; s++) {
    x += dx; y += dy; if (x < 0 || y < 0 || x >= img.width || y >= img.height) return null;
    if (dist(px(img, x, y), fill) > 24) return (dx ? x : y) / scale;
  }
  return null;
}

// Nearest edge across a band of rows (the ink's own height): one row can fall between an icon's bars
// (a list icon is 111 dp wide on its square rows and 118 on its bar rows) and read a different edge.
function edgeBand(img, xDp, yMidDp, halfDp, dir) {
  const hits = [];
  for (let y = yMidDp - halfDp; y <= yMidDp + halfDp + 1e-6; y += 1 / scale) { const e = edge(img, xDp, y, dir, 0); if (e != null) hits.push(e); }
  if (!hits.length) return null;
  return dir < 0 ? Math.max(...hits) : Math.min(...hits);
}

// ---------- text join ----------
const norm = s => s.toLowerCase().replace(/[’']/g, "'").replace(/[–—]/g, '-').replace(/\s+/g, ' ').trim();
function sim(a, b) { // 1 - normalised Levenshtein
  a = norm(a); b = norm(b); if (a === b) return 1; const m = a.length, n = b.length; if (!m || !n) return 0;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) { const cur = [i]; for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); prev = cur; }
  return 1 - prev[n] / Math.max(m, n);
}
const chromeTop = Number(opt('--mock-chrome-top') || 28); // the mock's own drawn status bar
const mTexts = mock.nodes.filter(n => n.kind === 'text' && n.frame[1] + n.frame[3] > chromeTop && n.frame[1] < mock.frame.height);
const aTexts = app.filter(e => e.text && /TextView|Text$/.test(e.type));
const pairs = []; const usedA = new Set(), usedM = new Set();
const cands = [];
for (const m of mTexts) for (const [ai, a] of aTexts.entries()) { const s = sim(m.text, a.text); if (s >= 0.6) cands.push({ m, ai, s }); }
cands.sort((p, q) => q.s - p.s || Math.abs(p.m.frame[1] - aTexts[p.ai].frame[1]) - Math.abs(q.m.frame[1] - aTexts[q.ai].frame[1]));
for (const c of cands) if (!usedM.has(c.m.id) && !usedA.has(c.ai)) { usedM.add(c.m.id); usedA.add(c.ai); pairs.push({ m: c.m, a: aTexts[c.ai], s: c.s }); }
pairs.sort((p, q) => p.m.frame[1] - q.m.frame[1] || p.m.frame[0] - q.m.frame[0]);

// Vertical offset: the median of matched pairs, so a taller status bar is not a defect everywhere.
const dys = pairs.map(p => p.a.frame[1] - p.m.frame[1]).sort((a, b) => a - b);
const yOffset = dys.length ? dys[Math.floor(dys.length / 2)] : 0;

const r1 = v => Math.round(v * 10) / 10;
const check = (prop, mv, av, delta, tol, unit = '') => ({ prop, mock: mv, app: av, delta: unit === 'ratio' ? Math.round(delta * 100) / 100 : r1(delta), tol, unit, pass: Math.abs(delta) <= tol });

const textRows = pairs.map((p, i) => {
  const mi = ink(mImg, textArea(p.m), parseRgb(p.m.style.color)), ai = appInk(aImg, p.a.frame);
  const row = { mockId: p.m.id, text: p.m.text, appText: p.a.text, copy: p.s === 1 ? 'same' : 'differs', checks: [] };
  if (row.copy === 'differs') {
    const [nm, na] = [norm(p.m.text), norm(p.a.text)];
    const rel = na && nm.startsWith(na) ? 'app text is a prefix of the mock text' : na && nm.endsWith(na) ? 'app text is a suffix of the mock text'
      : na && nm.includes(na) ? 'app text is a substring of the mock text' : nm && na.includes(nm) ? 'mock text is a substring of the app text' : null;
    if (rel) row.checks.push({ prop: 'copy differs', mock: p.m.text, app: p.a.text, pass: false, note: rel });
  }
  if (!mi || !ai) { row.checks.push({ prop: 'ink', pass: false, note: `no ink found in ${!mi ? 'mock' : 'app'}` }); return row; }
  row.mockInk = mi.box.map(r1); row.appInk = ai.box.map(r1);
  const align = p.m.style && /center/.test(p.m.style.textAlign || '') ? 'center' : null;
  const mCx = mi.box[0] + mi.box[2] / 2, aCx = ai.box[0] + ai.box[2] / 2;
  // Horizontal: left edge, or centre when both inks are centred in near-identical boxes.
  const centred = Math.abs(mCx - (p.m.frame[0] + p.m.frame[2] / 2)) < 2 && Math.abs(aCx - (p.a.frame[0] + p.a.frame[2] / 2)) < 2 && p.m.frame[2] - mi.box[2] > 8;
  row.checks.push(centred || align
    ? check('center-x', r1(mCx), r1(aCx), aCx - mCx, TOL.position_dp, 'dp')
    : check('left', r1(mi.box[0]), r1(ai.box[0]), ai.box[0] - mi.box[0], TOL.position_dp, 'dp'));
  // Ink height of a single line tracks font size; skip multi-line and changed copy.
  const lines = Math.round(p.m.frame[3] / (parseFloat(p.m.style.lineHeight) || parseFloat(p.m.style.fontSize) * 1.2));
  if (row.copy === 'same' && lines <= 1) {
    // passes on either a relative or an absolute tolerance: 2px of antialiasing on 11px text is not a font-size change
    const hc = check('ink height (font size)', r1(mi.box[3]), r1(ai.box[3]), (ai.box[3] / mi.box[3]) - 1, TOL.size_ratio, 'ratio');
    const absd = r1(ai.box[3] - mi.box[3]);
    row.checks.push({ ...hc, pass: hc.pass || Math.abs(ai.box[3] - mi.box[3]) <= TOL.size_dp, rule: `Δ ${Math.round(hc.delta * 1000) / 10}% / ${absd}dp, tol ${TOL.size_ratio * 100}% or ${TOL.size_dp}dp (passes on either)` });
    row.checks.push(check('ink width (family/weight/tracking)', r1(mi.box[2]), r1(ai.box[2]), (ai.box[2] / mi.box[2]) - 1, TOL.size_ratio, 'ratio'));
  }
  const spec = parseRgb(p.m.style.color);
  row.checks.push({ ...check('text colour ΔE', hex(mi.color), hex(ai.color), dE(mi.color, ai.color), TOL.text_color_de), spec: hex(spec) });
  row.spec = { fontSize: p.m.style.fontSize, fontWeight: p.m.style.fontWeight, fontFamily: p.m.style.fontFamily.split(',')[0], letterSpacing: p.m.style.letterSpacing, color: hex(spec) };
  return row;
});

// ---------- components: painting boxes that hold text ----------
const inside = (f, g) => g[0] >= f[0] - 0.5 && g[1] >= f[1] - 0.5 && g[0] + g[2] <= f[0] + f[2] + 0.5 && g[1] + g[3] <= f[1] + f[3] + 0.5;
const pairByMock = new Map(pairs.map(p => [p.m.id, p]));
const boxes = mock.nodes.filter(n => n.frame[2] * n.frame[3] >= 400 && n.frame[1] >= 0 && n.frame[0] >= 0 && n.frame[0] + n.frame[2] <= mock.frame.width + 1
  && (n.kind === 'box' || n.style.background !== 'rgba(0, 0, 0, 0)'));
mkdirSync(join(out, 'crops'), { recursive: true });
const components = [];
const textSet = o => [...(o.kind === 'text' ? [o] : []), ...mTexts.filter(t => t !== o && inside(o.frame, t.frame))].map(t => t.id).sort().join();
for (const b of boxes) {
  const texts = mTexts.filter(t => t !== b && inside(b.frame, t.frame));
  const ownText = b.kind === 'text' ? [b] : [];
  const all = [...ownText, ...texts]; if (!all.length) continue;
  // Stacked layers (a blurred photo under a scrim) hold the same texts: one component, the smaller box.
  const sameSet = boxes.find(o => o !== b && o.frame[2] * o.frame[3] <= b.frame[2] * b.frame[3] && (o.frame[2] * o.frame[3] < b.frame[2] * b.frame[3] || o.id > b.id)
    && textSet(o) === textSet(b));
  if (sameSet) continue;
  const anchor = all.map(t => pairByMock.get(t.id)).find(Boolean);
  const name = all[0].text.slice(0, 40);
  const comp = { mockId: b.id, name, mockFrame: b.frame, anchoredBottom: !!b.anchoredBottom, matched: !!anchor, texts: all.map(t => t.text), textIds: all.map(t => t.id), filled: b.style.background !== 'rgba(0, 0, 0, 0)' || parseFloat(b.style.border) > 0, checks: [] };
  if (anchor) {
    // Place the mock box on the app by its anchor text's displacement.
    const mi = ink(mImg, textArea(anchor.m), parseRgb(anchor.m.style.color)), ai = appInk(aImg, anchor.a.frame);
    const dx = mi && ai ? ai.box[0] - mi.box[0] : 0, dy = mi && ai ? ai.box[1] - mi.box[1] : anchor.a.frame[1] - anchor.m.frame[1];
    const est = [b.frame[0] + dx, b.frame[1] + dy, b.frame[2], b.frame[3]];
    comp.appFrameEstimate = est.map(r1);
    const fillSpec = parseRgb(b.style.background);
    if (b.style.background !== 'rgba(0, 0, 0, 0)' && fillSpec.length === 3) {
      // Sample just inside the top-left, clear of the radius and of any text.
      const r = Math.min(parseFloat(b.style.radius) || 0, b.frame[3] / 2);
      const sx = b.frame[0] + Math.max(4, r * 0.6), sy = b.frame[1] + Math.max(4, r * 0.6);
      const mf = px(mImg, Math.round(sx * scale), Math.round(sy * scale)), af = px(aImg, Math.round((sx + dx) * scale), Math.round((sy + dy) * scale));
      comp.checks.push({ ...check('fill ΔE', hex(mf), hex(af), dE(mf, af), TOL.fill_de), spec: hex(fillSpec) });
      // Container edges, walked outward from the anchor text's ink, left and right.
      if (mi && ai) {
        const my = mi.box[1] + mi.box[3] / 2, ay = ai.box[1] + ai.box[3] / 2;
        for (const [side, dir, mx, ax] of [['nearest edge left (container or icon)', -1, mi.box[0] - 2, ai.box[0] - 2], ['nearest edge right (container or icon)', 1, mi.box[0] + mi.box[2] + 2, ai.box[0] + ai.box[2] + 2]]) {
          const me = edgeBand(mImg, mx, my, mi.box[3] / 2, dir), ae = edgeBand(aImg, ax, ay, ai.box[3] / 2, dir);
          if (me != null && ae != null) comp.checks.push(check(side, r1(me), r1(ae), ae - me, TOL.edge_dp, 'dp'));
        }
      }
    }
    comp.spec = { background: b.style.background, radius: b.style.radius, border: b.style.border, padding: b.style.padding };
  }
  // Crop pair: mock box | app region, side by side, 8dp margin. The app region is the estimate
  // widened to every app element carrying one of the component's texts, so an icon above a label
  // is not cut off.
  const union = (f, g) => { const x = Math.min(f[0], g[0]), y = Math.min(f[1], g[1]); return [x, y, Math.max(f[0] + f[2], g[0] + g[2]) - x, Math.max(f[1] + f[3], g[1] + g[3]) - y]; };
  let f = comp.appFrameEstimate || b.frame;
  const names = new Set(comp.texts.map(norm));
  for (const e of app) if ((names.has(norm(e.text)) || names.has(norm(e.label))) && e.frame[2] < mock.frame.width + 2) f = union(f, e.frame);
  comp.appFrame = f.map(r1);
  const pad = r => [r[0] - 8, r[1] - 8, r[2] + 16, r[3] + 16].map(v => v * scale);
  const mc = clampBox(mImg, pad(b.frame)), ac = clampBox(aImg, pad(f));
  const w = Math.max(mc[2], ac[2]), h = Math.max(mc[3], ac[3]); const gap = 12;
  if (w > 0 && h > 0) {
    const pair = new PNG({ width: w * 2 + gap, height: h }); pair.data.fill(255);
    PNG.bitblt(mImg, pair, mc[0], mc[1], mc[2], mc[3], 0, 0);
    PNG.bitblt(aImg, pair, ac[0], ac[1], Math.min(ac[2], aImg.width - ac[0]), Math.min(ac[3], aImg.height - ac[1]), w + gap, 0);
    comp.crop = `crops/c${b.id}.png`; writeFileSync(join(out, comp.crop), PNG.sync.write(pair));
  }
  components.push(comp);
}

// Text rows attach to the smallest component that holds them; the rest stand alone.
const area = c => c.mockFrame[2] * c.mockFrame[3];
for (const t of textRows) {
  const owner = components.filter(c => c.textIds.includes(t.mockId)).sort((p, q) => area(p) - area(q))[0];
  t.component = owner ? owner.mockId : null;
}

// ---------- vertical rhythm, measured where it means something ----------
// Absolute y is useless across platforms (status bar heights differ), so spacing is checked as
// gaps: between texts inside one component, from a filled component's edge to its first and last
// text, and between consecutive top-level components.
const inkOf = new Map(pairs.map(p => [p.m.id, { m: ink(mImg, textArea(p.m), parseRgb(p.m.style.color)), a: appInk(aImg, p.a.frame) }]));
for (const c of components) {
  const rows = textRows.filter(t => t.component === c.mockId && inkOf.get(t.mockId)?.m && inkOf.get(t.mockId)?.a)
    .sort((p, q) => inkOf.get(p.mockId).m.box[1] - inkOf.get(q.mockId).m.box[1]);
  for (let i = 1; i < rows.length; i++) {
    const [p, q] = [inkOf.get(rows[i - 1].mockId), inkOf.get(rows[i].mockId)];
    if (Math.abs(q.m.box[1] - p.m.box[1]) < 2) continue; // same line: a row, not a stack
    // top to top: a descender ("," "g") moves a glyph bottom without moving the layout
    const gm = q.m.box[1] - p.m.box[1], ga = q.a.box[1] - p.a.box[1];
    rows[i].checks.push({ ...check('pitch from text above', r1(gm), r1(ga), ga - gm, TOL.gap_dp, 'dp'), after: rows[i - 1].text });
  }
  if (!c.filled || !rows.length) continue;
  const first = inkOf.get(rows[0].mockId), last = inkOf.get(rows[rows.length - 1].mockId);
  const probeX = k => k.box[0] - 3; // just left of the glyphs, inside the container
  const mt = edge(mImg, probeX(first.m), first.m.box[1], 0, -1), at = edge(aImg, probeX(first.a), first.a.box[1], 0, -1);
  const mb = edge(mImg, probeX(last.m), last.m.box[1] + last.m.box[3], 0, 1), ab = edge(aImg, probeX(last.a), last.a.box[1] + last.a.box[3], 0, 1);
  if (mt != null && at != null) { c.edges = { mTop: mt, aTop: at }; c.checks.push(check('inset top (edge → first text)', r1(first.m.box[1] - mt), r1(first.a.box[1] - at), (first.a.box[1] - at) - (first.m.box[1] - mt), TOL.gap_dp, 'dp')); }
  if (mb != null && ab != null) { c.edges = { ...c.edges, mBottom: mb, aBottom: ab }; c.checks.push(check('inset bottom (last text → edge)', r1(mb - last.m.box[1] - last.m.box[3]), r1(ab - last.a.box[1] - last.a.box[3]), (ab - last.a.box[1] - last.a.box[3]) - (mb - last.m.box[1] - last.m.box[3]), TOL.gap_dp, 'dp')); }
}
const topLevel = components.filter(c => !components.some(o => o !== c && inside(o.mockFrame, c.mockFrame) && area(o) > area(c)))
  .filter(c => c.edges?.mTop != null && c.edges?.mBottom != null).sort((p, q) => p.mockFrame[1] - q.mockFrame[1]);
for (let i = 1; i < topLevel.length; i++) {
  const [p, q] = [topLevel[i - 1], topLevel[i]];
  if (q.anchoredBottom) continue; // pinned to the bottom: the space above it is whatever is left
  const gm = q.edges.mTop - p.edges.mBottom, ga = q.edges.aTop - p.edges.aBottom;
  q.checks.push({ ...check('gap to previous component', r1(gm), r1(ga), ga - gm, TOL.gap_dp, 'dp'), after: p.name });
}

// ---------- backdrops: a gradient / photo / wash behind text ----------
// A box with no solid fill but a background image (or, in an old mock.nodes.json with no
// style.backgroundImage, a painted box with a transparent colour and no border) has no painting
// colour to compare. Sample a coarse grid of mean colours over its region in both images (text, icons
// and solid children masked out), placed on the app by the same anchor displacement as components.
// mockId = 1000 + the mock node id, so it never collides with the component of the same box.
const GRID = [6, 4];
const bdCands = mock.nodes.filter(n => n.kind === 'box' && n.frame[2] * n.frame[3] >= 4000 && n.frame[2] * n.frame[3] <= 0.75 * mock.frame.width * mock.frame.height
  && ((n.style.backgroundImage !== undefined && n.style.backgroundImage !== 'none')
    || (n.style.backgroundImage === undefined && n.style.background === 'rgba(0, 0, 0, 0)' && !(parseFloat(n.style.border) > 0)))
  && mTexts.some(t => inside(n.frame, t.frame)));
const bdTop = bdCands.filter(n => !bdCands.some(o => o !== n && inside(o.frame, n.frame) && (o.frame[2] * o.frame[3] > n.frame[2] * n.frame[3] || (o.frame[2] * o.frame[3] === n.frame[2] * n.frame[3] && o.id > n.id))));
for (const b of bdTop) {
  const texts = mTexts.filter(t => inside(b.frame, t.frame));
  const anchor = texts.map(t => pairByMock.get(t.id)).find(Boolean);
  const comp = { mockId: 1000 + b.id, name: `${texts[0].text.slice(0, 40)} backdrop`, mockFrame: b.frame, anchoredBottom: false, matched: !!anchor, texts: [], textIds: [], filled: false, checks: [],
    spec: { backgroundImage: b.style.backgroundImage ?? '(not recorded; inferred)', box: b.id } };
  if (anchor) {
    const mi = ink(mImg, textArea(anchor.m), parseRgb(anchor.m.style.color)), ai = appInk(aImg, anchor.a.frame);
    const dx = mi && ai ? ai.box[0] - mi.box[0] : 0, dy = mi && ai ? ai.box[1] - mi.box[1] : anchor.a.frame[1] - anchor.m.frame[1];
    const y0 = Math.max(b.frame[1], chromeTop); // the mock's own drawn status bar is not backdrop
    const reg = [b.frame[0], y0, b.frame[2], b.frame[1] + b.frame[3] - y0];
    const masks = mock.nodes.filter(n => n !== b && inside(b.frame, n.frame) && (n.kind !== 'box' || n.style.background !== 'rgba(0, 0, 0, 0)' || parseFloat(n.style.border) > 0)
      && !bdCands.includes(n)).map(n => n.kind === 'text' ? textArea(n) : n.frame);
    const masked = (x, y) => masks.some(m => x >= m[0] - 1 && x <= m[0] + m[2] + 1 && y >= m[1] - 1 && y <= m[1] + m[3] + 1);
    const cells = []; const step = 2 / scale; // every 2nd device px
    for (let gy = 0; gy < GRID[1]; gy++) for (let gx = 0; gx < GRID[0]; gx++) {
      const cx0 = reg[0] + reg[2] * gx / GRID[0], cy0 = reg[1] + reg[3] * gy / GRID[1], cw = reg[2] / GRID[0], ch = reg[3] / GRID[1];
      const mS = [0, 0, 0], aS = [0, 0, 0]; let n = 0;
      for (let y = cy0; y < cy0 + ch; y += step) for (let x = cx0; x < cx0 + cw; x += step) {
        if (masked(x, y)) continue;
        const [mx, my, ax, ay] = [Math.round(x * scale), Math.round(y * scale), Math.round((x + dx) * scale), Math.round((y + dy) * scale)];
        if (mx >= mImg.width || my >= mImg.height || ax < 0 || ay < 0 || ax >= aImg.width || ay >= aImg.height) continue;
        const [mp, ap] = [px(mImg, mx, my), px(aImg, ax, ay)]; for (let k = 0; k < 3; k++) { mS[k] += mp[k]; aS[k] += ap[k]; } n++;
      }
      if (n >= 20) cells.push({ m: mS.map(v => v / n), a: aS.map(v => v / n) });
    }
    if (cells.length) {
      const de = cells.reduce((t, c) => t + dE(c.m, c.a), 0) / cells.length;
      const [ml, al] = [cells.map(c => lab(c.m)), cells.map(c => lab(c.a))];
      const avg = (L, i) => L.reduce((t, v) => t + v[i], 0) / L.length, chroma = L => L.reduce((t, v) => t + Math.hypot(v[1], v[2]), 0) / L.length;
      const dL = avg(al, 0) - avg(ml, 0), dA = avg(al, 1) - avg(ml, 1), dB = avg(al, 2) - avg(ml, 2), dC = chroma(al) - chroma(ml);
      const hueDeg = L => Math.atan2(avg(L, 2), avg(L, 1)) * 180 / Math.PI;
      const meanRgb = k => cells.reduce((t, c) => t.map((v, i) => v + c[k][i] / cells.length), [0, 0, 0]);
      comp.backdrop = { grid: GRID, cells: cells.length, meanColor: { mock: hex(meanRgb('m')), app: hex(meanRgb('a')) },
        meanDeltaE: r1(de), dL: r1(dL), dA: r1(dA), dB: r1(dB), dChroma: r1(dC), mockHue: Math.round(hueDeg(ml)), appHue: Math.round(hueDeg(al)) };
      comp.checks.push({ ...check('backdrop ΔE (mean over grid)', comp.backdrop.meanColor.mock, comp.backdrop.meanColor.app, de, TOL.backdrop_de, ''),
        note: `${cells.length} cells of ${GRID.join('x')}; mean Lab shift ΔL ${r1(dL)}, Δa* ${r1(dA)}, Δb* ${r1(dB)}, chroma ${r1(dC)}, hue ${Math.round(hueDeg(ml))}° → ${Math.round(hueDeg(al))}°` });
    }
    const f = [reg[0] + dx, reg[1] + dy, reg[2], reg[3]];
    comp.appFrame = f.map(r1); comp.appFrameEstimate = comp.appFrame;
    const pad = r => [r[0] - 8, r[1] - 8, r[2] + 16, r[3] + 16].map(v => v * scale);
    const mc = clampBox(mImg, pad(reg)), ac = clampBox(aImg, pad(f)); const w = Math.max(mc[2], ac[2]), h = Math.max(mc[3], ac[3]);
    if (w > 0 && h > 0) {
      const pair = new PNG({ width: w * 2 + 12, height: h }); pair.data.fill(255);
      PNG.bitblt(mImg, pair, mc[0], mc[1], mc[2], mc[3], 0, 0); PNG.bitblt(aImg, pair, ac[0], ac[1], ac[2], ac[3], w + 12, 0);
      comp.crop = `crops/c${comp.mockId}.png`; writeFileSync(join(out, comp.crop), PNG.sync.write(pair));
    }
  }
  components.push(comp);
}

const mockOnly = mTexts.filter(t => !usedM.has(t.id)).map(t => ({ mockId: t.id, text: t.text, frame: t.frame }));
const appOnly = aTexts.filter((_, i) => !usedA.has(i)).map(a => ({ text: a.text, frame: a.frame.map(r1) }));
const failing = [...textRows, ...components].filter(r => r.checks.some(c => c.pass === false)).length;
const report = { frame: mock.frame, scale, yOffset: r1(yOffset), tolerances: TOL, summary: { pairs: pairs.length, components: components.length, failing, mockOnly: mockOnly.length, appOnly: appOnly.length }, components, texts: textRows, mockOnly, appOnly };
writeFileSync(join(out, 'findings.json'), JSON.stringify(report, null, 1));

// ---------- markdown ----------
const L = [`# ${mock.frame.label}`, '', `Matched ${pairs.length} texts; ${components.length} components; vertical offset ${r1(yOffset)}dp (status bar, ignored).`, ''];
const fmt = c => `${c.pass === false ? '✘' : '✔'} ${c.prop}: mock ${c.mock ?? ''} · app ${c.app ?? ''}${c.rule ? ` (${c.rule})` : c.delta !== undefined ? ` (Δ ${c.delta}${c.unit === 'ratio' ? '' : c.unit || ''}, tol ${c.tol})` : ''}${c.spec ? ` · spec ${c.spec}` : ''}${c.note ? ` — ${c.note}` : ''}`;
for (const c of components) {
  L.push(`## c${c.mockId} · ${c.name}${c.matched ? '' : ' — NOT FOUND in app'}`, c.crop ? `crop: ${c.crop}` : '', ...c.checks.map(fmt));
  for (const t of textRows.filter(t => t.component === c.mockId)) L.push(`- "${t.text}"${t.copy === 'differs' ? ` → app "${t.appText}"` : ''}`, ...t.checks.map(x => '  ' + fmt(x)));
  L.push('');
}
const loose = textRows.filter(t => t.component == null);
if (loose.length) { L.push('## Not inside a component'); for (const t of loose) L.push(`- "${t.text}"`, ...t.checks.map(x => '  ' + fmt(x))); L.push(''); }
L.push('## In the mock, not found in the app', ...mockOnly.map(m => `- "${m.text}"`), '', '## In the app, not in the mock', ...appOnly.map(a => `- "${a.text}"`));
writeFileSync(join(out, 'findings.md'), L.join('\n'));
console.log(`compare: ${pairs.length} texts matched, ${components.length} components, ${failing} with failing checks, ${mockOnly.length} mock-only, ${appOnly.length} app-only → ${join(out, 'findings.md')}`);
