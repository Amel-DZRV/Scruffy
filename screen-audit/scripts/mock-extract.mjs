#!/usr/bin/env node
// Render a Claude Design export and pull one phone frame out of it: a PNG at device scale and
// every visible node with its frame and computed style. The mock is HTML, so its values are
// read, not estimated.
//
// style.backgroundImage records a gradient / url() fill: compare.mjs measures it as a `backdrop`.
//
//   mock-extract.mjs <export.html> --list
//   mock-extract.mjs <export.html> --frame <n|label> --scale <device px per dp> --out <dir>
//
// Exit 0 ok, 2 process failure (no browser, page did not render, frame not found).
import { chromium } from 'playwright-core';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { resolve, join, dirname, basename, extname, normalize } from 'node:path';
import { createServer } from 'node:http';

const args = process.argv.slice(2);
const html = args[0];
const opt = k => { const i = args.indexOf(k); return i < 0 ? undefined : args[i + 1]; };
const fail = msg => { console.error(`mock-extract: ${msg}`); process.exit(2); };
if (!html || !existsSync(html)) fail(`no such file ${html}`);

const CANDIDATES = [
  process.env.SCREEN_AUDIT_BROWSER,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome'
].filter(Boolean);
const executablePath = CANDIDATES.find(p => existsSync(p));
if (!executablePath) fail('no Chrome or Edge found; set SCREEN_AUDIT_BROWSER');

// Served over http, not file://: the export loads its .jsx through Babel's XHR, which file:// blocks.
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.jsx': 'text/babel', '.css': 'text/css',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.ttf': 'font/ttf' };
const docRoot = dirname(resolve(html));
const server = createServer((req, res) => {
  const p = normalize(join(docRoot, decodeURIComponent(new URL(req.url, 'http://x').pathname)));
  if (!p.startsWith(docRoot) || !existsSync(p)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': TYPES[extname(p)] || 'application/octet-stream' });
  res.end(readFileSync(p));
}).listen(0, '127.0.0.1');
await new Promise(r => server.once('listening', r));
const url = `http://127.0.0.1:${server.address().port}/${encodeURIComponent(basename(html))}`;

const scale = Number(opt('--scale') || 1);
const browser = await chromium.launch({ executablePath });
const page = await browser.newPage({ viewport: { width: 1600, height: 1200 }, deviceScaleFactor: scale });
await page.goto(url, { waitUntil: 'networkidle' });
try {
  await page.waitForSelector('figure', { timeout: 30000 });
} catch { await browser.close(); server.close(); fail('page rendered no <figure> phone frames'); }
await page.evaluate(() => document.fonts.ready);

// A frame is a <figure> whose caption names it and whose next child is the phone.
const frames = await page.$$eval('figure', figs => figs.map((f, i) => {
  const cap = f.querySelector('figcaption');
  const lines = cap ? [...cap.children].map(c => c.innerText.trim()) : [];
  const section = f.closest('[id^="sec-"]');
  const phone = f.querySelector(':scope > div');
  return { index: i, section: section ? section.id.replace(/^sec-/, '') : null,
    label: lines[0] || '', note: lines[1] || '', theme: phone?.dataset.theme || 'light',
    width: phone?.offsetWidth || 0, height: phone?.offsetHeight || 0 };
}));

if (args.includes('--list')) {
  for (const f of frames) console.log([f.index, f.section, f.theme, `${f.width}x${f.height}`, f.label].join('\t'));
  await browser.close(); server.close(); process.exit(0);
}

const want = opt('--frame'); const out = opt('--out');
if (want === undefined || !out) { await browser.close(); server.close(); fail('need --frame and --out, or --list'); }
const frame = /^\d+$/.test(want) ? frames[Number(want)] : frames.find(f => f.label === want);
if (!frame) { await browser.close(); server.close(); fail(`frame not found: ${want}`); }
mkdirSync(out, { recursive: true });

const phone = (await page.$$('figure > div'))[frame.index];
await phone.scrollIntoViewIfNeeded();
const box = await phone.evaluate(el => { const b = el.getBoundingClientRect();
  return { x: b.x + scrollX + el.clientLeft, y: b.y + scrollY + el.clientTop, width: el.clientWidth, height: el.clientHeight }; });
await page.screenshot({ path: join(out, 'mock.png'), clip: box, fullPage: true });

const nodes = await phone.evaluate(root => {
  const b = root.getBoundingClientRect(); const r0 = { x: b.x + root.clientLeft, y: b.y + root.clientTop };
  const visible = cs => cs.display !== 'none' && cs.visibility !== 'hidden' && Number(cs.opacity) > 0;
  const paints = cs => (cs.backgroundColor !== 'rgba(0, 0, 0, 0)' && cs.backgroundColor !== 'transparent')
    || cs.backgroundImage !== 'none' || Number.parseFloat(cs.borderTopWidth) > 0;
  const ownText = el => [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join('').trim();
  const out = []; let id = 0;
  const walk = (el, depth) => {
    const cs = getComputedStyle(el);
    if (!visible(cs)) return;
    let r = el.getBoundingClientRect();
    // Intersect with every clipping ancestor: a collapsed accordion's rows have layout but no pixels.
    for (let p = el.parentElement; p && p !== root.parentElement; p = p.parentElement) {
      const pc = getComputedStyle(p); if (pc.overflow === 'visible' && pc.overflowY === 'visible') continue;
      const q = p.getBoundingClientRect();
      const x1 = Math.max(r.left, q.left), y1 = Math.max(r.top, q.top), x2 = Math.min(r.right, q.right), y2 = Math.min(r.bottom, q.bottom);
      r = { x: x1, y: y1, width: Math.max(0, x2 - x1), height: Math.max(0, y2 - y1), left: x1, top: y1, right: x2, bottom: y2 };
    }
    const text = ownText(el);
    const isIcon = el.tagName.toLowerCase() === 'svg';
    if (r.width > 0 && r.height > 0 && (text || paints(cs) || isIcon) && el !== root) {
      out.push({
        id: id++, depth, tag: el.tagName.toLowerCase(),
        kind: isIcon ? 'icon' : text ? 'text' : 'box',
        text: text ? (el.innerText.trim() || text) : '',          // innerText applies text-transform, as RN does
        icon: isIcon ? (el.getAttribute('data-lucide') || [...el.classList].find(c => c.startsWith('lucide-'))?.slice(7) || '') : '',
        frame: [r.x - r0.x, r.y - r0.y, r.width, r.height].map(v => Math.round(v * 10) / 10),
        // inside padding and border: where a text's glyphs can be
        content: (() => { const n = k => Number.parseFloat(cs[k]) || 0;
          const L = n('paddingLeft') + n('borderLeftWidth'), T = n('paddingTop') + n('borderTopWidth');
          return [r.x - r0.x + L, r.y - r0.y + T, r.width - L - n('paddingRight') - n('borderRightWidth'), r.height - T - n('paddingBottom') - n('borderBottomWidth')]
            .map(v => Math.round(v * 10) / 10); })(),
        // the glyphs' own rect, from a Range over the direct text nodes — never the container's border
        glyphs: text ? (() => { let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
          for (const n of el.childNodes) if (n.nodeType === 3 && n.textContent.trim()) {
            const rg = document.createRange(); rg.selectNodeContents(n);
            for (const q of rg.getClientRects()) { x1 = Math.min(x1, q.left); y1 = Math.min(y1, q.top); x2 = Math.max(x2, q.right); y2 = Math.max(y2, q.bottom); }
          }
          return x2 > x1 ? [x1 - r0.x, y1 - r0.y, x2 - x1, y2 - y1].map(v => Math.round(v * 10) / 10) : null; })() : null,
        anchoredBottom: Math.abs(r.y + r.height - (r0.y + root.clientHeight)) < 1,
        style: {
          color: cs.color, background: cs.backgroundColor, backgroundImage: cs.backgroundImage.slice(0, 240), opacity: cs.opacity,
          fontFamily: cs.fontFamily, fontSize: cs.fontSize, fontWeight: cs.fontWeight,
          letterSpacing: cs.letterSpacing, lineHeight: cs.lineHeight, textTransform: cs.textTransform, textAlign: cs.textAlign,
          radius: cs.borderTopLeftRadius, border: `${cs.borderTopWidth} ${cs.borderTopStyle} ${cs.borderTopColor}`,
          padding: [cs.paddingTop, cs.paddingRight, cs.paddingBottom, cs.paddingLeft].join(' ')
        }
      });
    }
    if (!isIcon) for (const c of el.children) walk(c, depth + 1);
  };
  walk(root, 0);
  return out;
});

writeFileSync(join(out, 'mock.nodes.json'), JSON.stringify({ frame, scale, nodes }, null, 1));
console.log(`frame ${frame.index} "${frame.label}" ${frame.width}x${frame.height} → ${nodes.length} nodes, mock.png at ${scale}x`);
await browser.close(); server.close();
