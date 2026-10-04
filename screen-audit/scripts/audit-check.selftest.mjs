#!/usr/bin/env node
// Self-test for audit-check.mjs: builds a fixture dossier in a temp dir and runs the hook against it
// with SCRUFFY_TICKETS set. Covers whole-row waivers, property waivers (partial, complete, via `covers`),
// suspect_measurement, a copy-differs data check, an extra row, and a not-probeable functional DATA.
//   node scripts/audit-check.selftest.mjs        exit 0 = every expectation held
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
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
W(join(dir, 'judge.json'), { frame: 1, round: 1, components: {
  1: { verdict: 'DATA', name: 'Hero', failing: [], data_checks: ['"Good morning, Marcus" copy differs'] },
  2: { verdict: 'WAIVED', name: 'Dial', failing: [], waived_seen: [{ prop: 'inset top', mock: '62.8', app: '67.4' }] },
  3: { verdict: 'FAIL', name: 'Tab bar', data_checks: [], failing: [
    { prop: 'fill', mock: '#f4f3f1', app: '#ffffff', evidence: 'crop c3: app bar is white' },
    { prop: 'icons', mock: 'text only', app: 'icon above label', evidence: 'crop c3', covers: ['inset top'] }] },
  4: { verdict: 'PASS', name: 'Programs', failing: [], data_checks: [],
    suspect_measurement: [{ prop: 'nearest edge left (container or icon)', reason: 'crop c4 shows icon and label in the same place', evidence: 'crop c4' }] },
  5: { verdict: 'PASS', name: 'Card', failing: [], data_checks: [] } },
  extra: [{ text: 'See all', note: 'empty-state button', data: true }] });
const row = (key, mockId, name, visual, extra = {}) => ({ key, platform: 'android', frame: 1, mockId, name, visual: { status: visual, round: 1 }, functional: { status: 'NA', round: 1 }, attempts: 0, reason: '', ...extra });
W(join(ev, 'ledger.json'), { repo, platforms: ['android'], budget: 3, frames: [{ platform: 'android', frame: 1, round: 1 }], rows: [
  row('android.f1.c1', 1, 'Hero', 'DATA'),
  row('android.f1.c2', 2, 'Dial', 'WAIVED'),
  row('android.f1.c3', 3, 'Tab bar', 'FAIL'),
  row('android.f1.c4', 4, 'Programs', 'PASS'),
  row('android.f1.c5', 5, 'Card', 'PASS', { functional: { status: 'DATA', round: 1, reason: 'no sessions on this device' } }),
  { key: 'android.f1.xseeall', type: 'extra', platform: 'android', frame: 1, name: 'See all', text: 'See all', visual: { status: 'DATA', round: 1 }, functional: { status: 'NA' }, attempts: 0, reason: '' }] });

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
expect('c2 whole-row waiver passes, c1 copy-differs data check passes, extra row passes', !/c2|c1|xseeall/.test(r.stderr.replace(/android\.f1\.c3|c4/g, '')), r.stderr);
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
console.log(failures ? `${failures} expectation(s) failed` : 'all expectations held');
process.exit(failures ? 1 : 0);
