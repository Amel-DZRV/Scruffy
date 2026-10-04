#!/usr/bin/env node
// Stop hook for screen-audit's fix loop. Registered by the skill's frontmatter; runs after every
// turn and does nothing unless a dossier holds evidence/audit.active. Exit 0 lets the turn end;
// exit 2 sends the unmet rows back as the next instruction.
//
// It trusts no status it is told. A PASS counts only when the files it points at say so, and only
// when they were produced against the code as it is now — the fingerprint of HEAD plus the working
// tree. One edit anywhere in the repo makes every earlier PASS stale, which is what forces the last
// round to re-verify everything and catches a fix that broke a neighbour.
import { readFileSync, existsSync, readdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { homedir } from 'node:os';

// `--fingerprint <repo>` prints the fingerprint a round records before it captures.
if (process.argv[2] === '--fingerprint') { console.log(fingerprint(process.argv[3] || '.')); process.exit(0); }
try { readFileSync(0); } catch { /* hook input unused; state lives in the dossier */ }
const root = process.env.SCRUFFY_TICKETS || join(homedir(), 'Projects', 'tickets');
if (!existsSync(root)) process.exit(0);
const dossiers = readdirSync(root).map(k => join(root, k)).filter(d => existsSync(join(d, 'evidence', 'audit.active')));
if (!dossiers.length) process.exit(0);

function fingerprint(repo) { // hoisted: used by --fingerprint above
  const run = cmd => execSync(cmd, { cwd: repo, encoding: 'utf8', maxBuffer: 64 << 20 });
  // HEAD, tracked edits, and the names and contents of untracked files: anything Metro would reload.
  const untracked = run('git ls-files --others --exclude-standard').split('\n').filter(Boolean)
    .map(f => f + '\0' + (existsSync(join(repo, f)) ? readFileSync(join(repo, f)).toString('base64') : '')).join('\n');
  return createHash('sha256').update(run('git rev-parse HEAD') + run('git diff HEAD --binary') + untracked).digest('hex');
}

const read = p => { try { return readFileSync(p, 'utf8'); } catch { return null; } };
const json = p => { const s = read(p); try { return s && JSON.parse(s); } catch { return null; } };
const unmet = [];

for (const dossier of dossiers) {
  const ev = join(dossier, 'evidence'); const key = dossier.split(/[\\/]/).pop();
  if (existsSync(join(ev, 'audit.blocked'))) { rmSync(join(ev, 'audit.active')); continue; }
  const ledger = json(join(ev, 'ledger.json'));
  if (!ledger) { unmet.push(`[${key}]`, '  - evidence/ledger.json missing or not JSON'); continue; }
  let now; try { now = fingerprint(ledger.repo); } catch (e) { unmet.push(`[${key}]`, `  - cannot fingerprint ${ledger.repo}: ${e.message.split('\n')[0]}`); continue; }
  const waived = new Set((read(join(ev, 'accepted.md')) || '').split('\n').map(l => l.match(/^- `?([\w.-]+)`?/)?.[1]).filter(Boolean));
  const budget = ledger.budget || 3; const miss = [];
  const frameDir = (round, platform, frame) => join(ev, 'rounds', String(round), platform, `f${frame}`);
  const fresh = dir => (read(join(dir, 'fingerprint.txt')) || '').trim() === now;

  // Every component the comparison found has a row — none dropped by omission.
  for (const f of ledger.frames || []) {
    const findings = json(join(frameDir(f.round, f.platform, f.frame), 'findings.json'));
    if (!findings) { miss.push(`${f.platform}.f${f.frame}: no findings.json in round ${f.round}`); continue; }
    for (const c of findings.components) if (!ledger.rows.some(r => r.platform === f.platform && r.frame === f.frame && r.mockId === c.mockId))
      miss.push(`${f.platform}.f${f.frame}.c${c.mockId} (${c.name}): in findings, no ledger row`);
  }

  for (const r of ledger.rows) {
    const id = r.key || `${r.platform}.f${r.frame}.c${r.mockId}`; const label = `${id} (${r.name})`;
    const terminal = s => s === 'WAIVED' ? (waived.has(id) || `${label}: WAIVED but not in accepted.md`)
      : s === 'BLOCKED' ? ((r.attempts >= budget && r.reason) || `${label}: BLOCKED needs ${budget} attempts and a reason`) : null;

    // visual
    const v = r.visual || {}; const vt = terminal(v.status);
    if (vt !== null) { if (vt !== true) miss.push(vt); }
    else if (v.status === 'PASS' || v.status === 'DATA') {
      const dir = frameDir(v.round, r.platform, r.frame);
      const findings = json(join(dir, 'findings.json')), judge = json(join(dir, 'judge.json'));
      const j = judge?.components?.[String(r.mockId)];
      if (!fresh(dir)) miss.push(`${label}: visual ${v.status} is from round ${v.round}, before the latest code change — recapture`);
      else if (!findings || !j) miss.push(`${label}: round ${v.round} has no findings.json or no judge.json entry`);
      else if (j.verdict !== v.status) miss.push(`${label}: ledger says ${v.status}, judge said ${j.verdict}`);
      else {
        const comp = findings.components.find(c => c.mockId === r.mockId) || { checks: [] };
        if (comp.matched === false && v.status === 'PASS') { miss.push(`${label}: PASS on a component the comparison could not find in the app`); continue; }
        const rows = [comp, ...findings.texts.filter(t => t.component === r.mockId)];
        const excused = new Set(j.data_checks || []);
        const failing = rows.flatMap(x => x.checks.filter(c => c.pass === false).map(c => `${x.text ? `"${x.text}" ` : ''}${c.prop}`));
        const open = failing.filter(f => !excused.has(f));
        if (open.length) miss.push(`${label}: visual ${v.status} with failing measurements the judge did not attribute to data: ${open.join('; ')}`);
      }
    } else miss.push(`${label}: visual ${v.status || 'not checked'}`);

    // functional
    const fn = r.functional || {}; const ft = terminal(fn.status);
    if (fn.status === 'NA') continue;
    if (ft !== null) { if (ft !== true) miss.push(ft); continue; }
    if (fn.status !== 'PASS') { miss.push(`${label}: functional ${fn.status || 'not probed'}`); continue; }
    const probe = json(join(ev, fn.probe || '-'));
    if (!probe) miss.push(`${label}: functional PASS with no probe file`);
    else if (probe.result !== 'PASS') miss.push(`${label}: probe file says ${probe.result}`);
    else if (probe.fingerprint !== now) miss.push(`${label}: probe ran before the latest code change — re-probe`);
  }

  if (!miss.length) { writeFileSync(join(ev, 'audit.met'), new Date().toISOString() + '\n'); rmSync(join(ev, 'audit.active')); }
  else { unmet.push(`[${key}] ${miss.length} unmet`); for (const m of miss.slice(0, 25)) unmet.push('  - ' + m); if (miss.length > 25) unmet.push(`  - … ${miss.length - 25} more`); }
}

if (!unmet.length) process.exit(0);
process.stderr.write(['SCREEN AUDIT NOT DONE. Keep working; do not stop until every row is PASS on the current code, DATA, WAIVED by Amel, or BLOCKED on budget:', ...unmet,
  'Per-component fix budget is in ledger.json. If the run itself cannot continue (device gone, build broken), write evidence/audit.blocked and blocked.md instead.'].join('\n') + '\n');
process.exit(2);
