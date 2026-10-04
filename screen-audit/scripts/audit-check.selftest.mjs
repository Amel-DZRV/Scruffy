#!/usr/bin/env node
// Self-test for audit-check.mjs: builds a fixture dossier in a temp dir and runs the hook against it
// with SCRUFFY_TICKETS set. Covers whole-row waivers, property waivers (partial, complete, via `covers`),
// suspect_measurement, a copy-differs data check, an extra row (key format x-<slug>), a not-probeable functional DATA,
// the audit.fixing marker (fresh / stale / removed), a `:: functional` waiver, and the crop-evidence requirement.
//   node scripts/audit-check.selftest.mjs        exit 0 = every expectation held
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, readFileSync, rmSync, utimesSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { execFileSync, spawnSync } from 'node:child_process';

const here = dirname(fileURLToPath(import.meta.url)); const hook = join(here, 'audit-check.mjs');
const tmp = mkdtempSync(join(tmpdir(), 'audit-selftest-'));
const repo = join(tmp, 'repo'); mkdirSync(repo);
const git = (...a) => execFileSync('git', ['-C', repo, '-c', 'user.name=t', '-c', 'user.email=t@t', ...a], { encoding: 'utf8' });
git('init', '-q'); writeFileSync(join(repo, 'a.txt'), 'x'); git('add', '.'); git('commit', '-qm', 'init');
const fp = execFileSync('node', [hook, '--fingerprint', repo], { encoding: 'utf8' }).trim();

const tickets = join(tmp, 'tickets'), ev = join(tickets, 'audit-selftest', 'evidence'), dir = join(ev, 'rounds', '1', 'android', 'f1');
mkdirSync(join(dir, 'crops'), { recursive: true });
const W = (p, o) => writeFileSync(p, typeof o === 'string' ? o : JSON.stringify(o, null, 1));
const chk = (prop, pass = true) => ({ prop, pass });
W(join(dir, 'fingerprint.txt'), fp + '\n'); writeFileSync(join(ev, 'audit.active'), '');
W(join(dir, 'findings.json'), {
  components: [
    { mockId: 1, name: 'Hero', matched: true, checks: [] },
    { mockId: 2, name: 'Dial', matched: true, checks: [chk('inset top (edge → first text)', false)] },
    { mockId: 3, name: 'Tab bar', matched: true, checks: [chk('fill ΔE', false), chk('inset top (edge → first text)', false)] },
    { mockId: 4, name: 'Programs', matched: true, checks: [chk('nearest edge left (container or icon)', false)] },
    { mockId: 5, name: 'Card', matched: true, checks: [] }],
  texts: [{ mockId: 11, text: 'Good morning, Marcus', component: 1, checks: [chk('left'), chk('copy differs', false)] }] });
const judgeDoc = { frame: 1, round: 1, crops_opened: ['c1', 'c2', 'c3', 'c4', 'c5'], components: {
  1: { verdict: 'DATA', name: 'Hero', failing: [], data_checks: ['"Good morning, Marcus" copy differs'] },
  2: { verdict: 'WAIVED', name: 'Dial', failing: [], waived_seen: [{ prop: 'inset top', mock: '62.8', app: '67.4' }] },
  3: { verdict: 'FAIL', name: 'Tab bar', data_checks: [], failing: [
    { prop: 'fill', mock: '#f4f3f1', app: '#ffffff', evidence: 'crop c3: app bar is white', crop_agrees: true },
    { prop: 'icons', mock: 'text only', app: 'icon above label', evidence: 'crop c3: icons above labels', crop_agrees: true, covers: ['inset top'] }] },
  4: { verdict: 'PASS', name: 'Programs', failing: [], data_checks: [],
    suspect_measurement: [{ prop: 'nearest edge left (container or icon)', reason: 'crop c4 shows icon and label in the same place', evidence: 'crop c4' }] },
  5: { verdict: 'PASS', name: 'Card', failing: [], data_checks: [] } },
  extra: [{ text: 'See all', note: 'empty-state button', data: true }] };
W(join(dir, 'judge.json'), judgeDoc);
const row = (key, mockId, name, visual, extra = {}) => ({ key, platform: 'android', frame: 1, mockId, name, visual: { status: visual, round: 1 }, functional: { status: 'NA', round: 1 }, attempts: 0, reason: '', ...extra });
W(join(ev, 'ledger.json'), { repo, platforms: ['android'], budget: 3, frames: [{ platform: 'android', frame: 1, round: 1 }], rows: [
  row('android.f1.c1', 1, 'Hero', 'DATA'),
  row('android.f1.c2', 2, 'Dial', 'WAIVED'),
  row('android.f1.c3', 3, 'Tab bar', 'FAIL'),
  row('android.f1.c4', 4, 'Programs', 'PASS'),
  row('android.f1.c5', 5, 'Card', 'PASS', { functional: { status: 'DATA', round: 1, reason: 'no sessions on this device' } }),
  { key: 'android.f1.x-see-all', type: 'extra', platform: 'android', frame: 1, name: 'See all', text: 'See all', visual: { status: 'DATA', round: 1 }, functional: { status: 'NA' }, attempts: 0, reason: '' }] });

const run = () => spawnSync('node', [hook], { env: { ...process.env, SCRUFFY_TICKETS: tickets }, input: '{}', encoding: 'utf8' });
let failures = 0;
const expect = (name, cond, out) => { console.log(`${cond ? 'ok  ' : 'FAIL'} ${name}`); if (!cond) { failures++; console.log(out); } };

// 1. whole-row waiver on c2 only; c3 has only a partial property waiver; c4 has an unresolved suspect measurement
W(join(ev, 'accepted.md'), ['# accepted', '- android.f1.c2 — Start dial: Amel waived (whole row)', '- android.f1.c3 :: icons'].join('\n'));
let r = run(); console.log('--- run 1 (stderr) ---\n' + r.stderr);
expect('run 1 blocks (exit 2)', r.status === 2, r.stderr);
expect('c3 reports the uncovered "fill"', /c3 \(Tab bar\): FAIL, not covered by property waivers in accepted.md: fill/.test(r.stderr), r.stderr);
expect('c3 does not report "icons" or covered "inset top" as open', !/c3[^\n]*(icons|inset top)/.test(r.stderr), r.stderr);
expect('c4 reports suspect_measurement', /c4 \(Programs\): judge flagged suspect_measurement/.test(r.stderr), r.stderr);
expect('c2 whole-row waiver passes, c1 copy-differs data check passes, extra row passes', !/c2|c1|x-see-all/.test(r.stderr.replace(/android\.f1\.c3|c4/g, '')), r.stderr);
expect('audit.active kept', existsSync(join(ev, 'audit.active')), '');

// 2. a property waiver is not a whole-row waiver: c2 stays waived only because of its own line
W(join(ev, 'accepted.md'), ['- android.f1.c3 :: icons', '- android.f1.c3 :: fill', '- android.f1.c4 :: nearest edge left'].join('\n'));
r = run(); console.log('--- run 2 (stderr) ---\n' + r.stderr);
expect('run 2 blocks only on c2 (WAIVED without a whole-row key)', r.status === 2 && /c2 \(Dial\): WAIVED but not in accepted.md/.test(r.stderr) && !/c3|c4/.test(r.stderr.replace(/android\.f1\.c2[^\n]*/, '')), r.stderr);

// 3. everything covered: c3 by property waivers (fill, icons covering inset top), c4's suspect waived, c2 whole row
W(join(ev, 'accepted.md'), ['- android.f1.c2', '- android.f1.c3 :: icons', '- android.f1.c3 :: fill', '- android.f1.c4 :: nearest edge left'].join('\n'));
r = run(); console.log('--- run 3 (exit ' + r.status + ') ---\n' + r.stderr);
expect('run 3 lets the turn end (exit 0)', r.status === 0, r.stderr);
expect('audit.met lists the open waived items', existsSync(join(ev, 'audit.met')) && /WAIVED with open items/.test(readFileSync(join(ev, 'audit.met'), 'utf8')), '');
if (existsSync(join(ev, 'audit.met'))) console.log(readFileSync(join(ev, 'audit.met'), 'utf8'));

// ---- later cases: re-arm the hook (run 3 met the goal and removed audit.active) ----
const rearm = (accepted) => { W(join(ev, 'audit.active'), ''); rmSync(join(ev, 'audit.met'), { force: true }); W(join(ev, 'accepted.md'), accepted.join('\n')); };
const base = ['- android.f1.c2', '- android.f1.c3 :: icons', '- android.f1.c3 :: fill', '- android.f1.c4 :: nearest edge left'];
const ledger = JSON.parse(readFileSync(join(ev, 'ledger.json'), 'utf8'));
const setRow = (key, patch) => { const l = JSON.parse(JSON.stringify(ledger)); Object.assign(l.rows.find(x => x.key === key), patch); W(join(ev, 'ledger.json'), l); };

// 4. audit.fixing marker
const marker = join(ev, 'audit.fixing');
rearm(['- android.f1.c3 :: icons']); // leaves unmet rows
r = run(); expect('4a no marker: blocks', r.status === 2, r.stderr);
W(marker, ''); r = run();
expect('4b fresh marker: exit 0 and no output', r.status === 0 && r.stderr === '' && r.stdout === '', r.stderr);
expect('4b audit.active kept while fixing', existsSync(join(ev, 'audit.active')), '');
const old = new Date(Date.now() - 31 * 60 * 1000); utimesSync(marker, old, old);
r = run(); expect('4c stale marker (31 min): blocks as before', r.status === 2 && /c3 \(Tab bar\)/.test(r.stderr), r.stderr);
rmSync(marker); r = run(); expect('4d marker removed: blocks', r.status === 2, r.stderr);
W(marker, ''); W(join(ev, 'audit.blocked'), ''); r = run();
expect('4e audit.blocked still handled with a marker present (exit 0, audit.active removed)', r.status === 0 && !existsSync(join(ev, 'audit.active')), r.stderr);
rmSync(marker, { force: true }); rmSync(join(ev, 'audit.blocked'));

// 5. functional WAIVED: whole row or `:: functional`, never another property line
setRow('android.f1.c5', { functional: { status: 'WAIVED', round: 1, reason: 'mutates data; skipped by the gate' } });
rearm([...base, '- android.f1.c5 :: functional']); r = run();
expect('5a functional WAIVED + ":: functional" passes', r.status === 0, r.stderr);
rearm([...base, '- android.f1.c5']); r = run();
expect('5b functional WAIVED + whole-row key passes', r.status === 0, r.stderr);
rearm([...base, '- android.f1.c5 :: inset top']); r = run();
expect('5c functional WAIVED + only ":: inset top" blocks, naming the missing functional waiver', r.status === 2 && /c5 \(Card\): functional WAIVED but not in accepted.md \(needs "- android.f1.c5 :: functional"/.test(r.stderr), r.stderr);
rearm(base); r = run();
expect('5d functional WAIVED + no line blocks', r.status === 2 && /c5 \(Card\): functional WAIVED/.test(r.stderr), r.stderr);
W(join(ev, 'ledger.json'), ledger);

// 6. extra-row key format <platform>.f<n>.x-<slug>: accepted.md key matching allows the hyphens
const extraRow = { key: 'android.f4.x-see-all', type: 'extra', platform: 'android', frame: 4, name: 'See all', text: 'See all', visual: { status: 'WAIVED', round: 1 }, functional: { status: 'NA' }, attempts: 0, reason: '' };
const withExtra = JSON.parse(JSON.stringify(ledger)); withExtra.rows.push(extraRow); W(join(ev, 'ledger.json'), withExtra);
rearm([...base, '- android.f4.x-see-all — Amel waived']); r = run();
expect('6a extra row android.f4.x-see-all WAIVED via accepted.md passes', r.status === 0, r.stderr);
rearm(base); r = run();
expect('6b extra row WAIVED without its accepted.md line blocks', r.status === 2 && /android\.f4\.x-see-all \(See all\): WAIVED but not in accepted.md/.test(r.stderr), r.stderr);
W(join(ev, 'ledger.json'), ledger);

// 7. judge crop evidence, only for judge.json files that carry crops_opened
const judgeNoAgree = JSON.parse(JSON.stringify(judgeDoc)); delete judgeNoAgree.components[3].failing[0].crop_agrees;
W(join(dir, 'judge.json'), judgeNoAgree); rearm(base); r = run();
expect('7a failing entry without crop_agrees blocks: "judge entry for <row> lacks crop evidence"', r.status === 2 && /judge entry for android\.f1\.c3 \(Tab bar\) lacks crop evidence: fill/.test(r.stderr), r.stderr);
const judgeNoEv = JSON.parse(JSON.stringify(judgeDoc)); delete judgeNoEv.components[3].failing[1].evidence;
W(join(dir, 'judge.json'), judgeNoEv); rearm(base); r = run();
expect('7b failing entry without evidence blocks', r.status === 2 && /lacks crop evidence: icons/.test(r.stderr), r.stderr);
delete judgeNoAgree.crops_opened; W(join(dir, 'judge.json'), judgeNoAgree); rearm(base); r = run();
expect('7c old judge.json (no crops_opened) stays readable: exit 0', r.status === 0, r.stderr);
W(join(dir, 'judge.json'), judgeDoc);

console.log(failures ? `${failures} expectation(s) failed` : 'all expectations held');
process.exit(failures ? 1 : 0);
