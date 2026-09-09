# Evidence Ladder — implementation plan

Replaces "take before/after screenshots" as the primary proof mechanism in the bug
lane. Source: `scruffyevidenceladderplan.md`. Touches `verification` (owns the ladder),
`bug-eater` (steps 3, 7, 9), and `scruffy` (ledger, models, dossier).

**Status:** not started. Six phases, in dependency order. Each phase ships on its own
and leaves the skillset usable.

---

## Goal

Every claim a run makes must be judgeable by something that did not write the fix.
Today the bug lane's proof is a red test plus a before/after screenshot pair, and the
screenshot pair is explicitly non-falsifiable — `verification/SKILL.md` already says so
("This cannot fail and is not proof"). That leaves visual bugs with a proof gap the
skill admits to and does not close.

The ladder closes it by making the artifact set a **function of the diff**, declared
before verification runs, checked mechanically, and graded by an agent that never sees
the diff.

## Current state

| Piece | Where it lives today |
|---|---|
| Four claims, red-test hash, revert check | `verification/SKILL.md` |
| Chain budget 3 / fix budget 3 | `verification/SKILL.md`, `scruffy/references/models.md` |
| Screenshot capture, device pinning | `bug-eater/SKILL.md` step 3, `bug-eater/references/platforms/ios.md` |
| `[DEBUG-*]` probe removal | `bug-eater/SKILL.md` step 8 — prose instruction, read by the model that inserted them |
| PR body structure | `bug-eater/SKILL.md` step 9 |
| Ledger columns | `scruffy/references/dossier.md` |
| Caps table | `scruffy/references/models.md` |

Nothing in the repo runs outside model context. There are no scripts, no hooks, and no
tests. Every rule is prose the model is asked to follow, including the two rules whose
whole value is that they cannot be reasoned away (probe removal, and not editing the
red test).

## Desired end state

- `evidence/declaration.json` exists in every bug dossier before verification starts.
- A guard hook fails hard when the declaration's classes do not match the touched files.
- Tier 1 checks run as scripts, produce a machine-readable report, and are not
  self-graded.
- A PR with an unmet tier leads with the gap, names the manual check, and carries a
  label that blocks rubber-stamping.
- `LEDGER.md` carries seven new columns, so `tiers_unmet × regression_found_in_review`
  becomes answerable from rows rather than from intuition.

**Verified by:** `tests/run.sh` green (fixture-driven, no network, no Xcode), plus one
real bug run through the lane end to end.

## Not doing

Carried verbatim from the source document's exclusions, plus two of my own:

- **Vision model vs. Figma as a gate.** Hint into the Tier 4 verifier's context only.
- **Snapshot references for every screen up front.** Per-bug adoption as bugs land.
- **All tiers on every fix.** Selection is the point; accumulation buys ceremony.
- *(added)* **No new Xcode/Bazel tooling in this repo.** The scripts here shell out to
  whatever the target repo already has. Scruffy runs against repos Amel does not own;
  anything that requires adding a dependency to those repos is out of scope.
- *(added)* **No changes to `feature-dev` in phases 1–5.** Its acceptance-test step
  overlaps with phase 6 and should be reconciled once, at the end, not twice.

---

## Design decisions taken before writing code

The source document leaves four things underdetermined. Resolving them now, because
each one changes file layout.

### D1 — Tier 0 and Tier 1 are not new machinery

Tier 0 *is* claims 1 and 2 in `verification/SKILL.md`, including the red-test hash.
Tier 2's "full suite green" and "untouched components clean" *are* claims 2 and 3.
The ladder is therefore a **selection and reporting layer over the existing claims**,
not a parallel system. `verification/SKILL.md` gets a mapping table; it does not get a
second set of rules that can drift from the first.

### D2 — Test-file modification needs an allowlist, not a ban

Tier 1 says "no test files modified in the fix commit". But step 6 of `bug-eater`
*requires* relocating the red test into the repo's suite. A flat ban fails every
correct run.

Rule: the red-test path is recorded in `state.md` and echoed into
`declaration.json` as `red_test.path`. Tier 1 fails on any test file touched by the
diff that is **not** that path. This also catches the real failure mode — editing a
neighbouring test to stop it failing — which a flat ban would have caught by accident
and this catches on purpose.

### D3 — The guard hook gates PR creation, not tool use generally

"PreToolUse-style, outside model context" is right about the property that matters
(not self-graded) but a `PreToolUse` hook on every tool call has nowhere sensible to
fire. The gate belongs at the point of no return: the hook matches `Bash` calls whose
command contains `gh pr create`, and refuses when the declaration is missing, invalid,
or contradicted by the diff. Tier 1's other checks run as an explicit script at step 7
and write their report into `evidence/`; the hook re-reads that report rather than
recomputing it, so a missing report is itself a failure.

### D4 — The step 3 approval replaces stop 3; it is not a fourth stop

`scruffy/SKILL.md` promises at most three stops and treats a fourth as a defect in the
skill. §5 of the source document ("Amel approves the checks, not the implementation
plan") is stop 3 moved earlier and given a better subject, not an addition. Phase 6
rewrites the stop-3 row rather than appending to the table.

---

## Phase 1 — Tier 1 static checks and the guard hook

Highest value, no model involvement, catches the failure class nothing else catches.
Build this before anything that depends on a declaration existing.

### Files

| File | Change |
|---|---|
| `verification/scripts/tier1.sh` | new — runs the five structural checks, writes `evidence/tier1.json` |
| `verification/scripts/lib/diff.sh` | new — touched-file enumeration against the merge base, shared with the hook |
| `verification/scripts/guard-declaration.py` | new — the `gh pr create` gate |
| `verification/references/evidence-ladder.md` | new — the ladder itself; `verification/SKILL.md` links to it |
| `hooks/settings.snippet.json` | new — hook wiring to paste into `~/.claude/settings.json` |
| `tests/run.sh`, `tests/fixtures/` | new — fixture repos exercising each check's pass and fail path |
| `README.md` | install step for the hook |

### `tier1.sh` — the five checks

Each writes a `{name, status, detail}` record. `status` is `pass`, `fail`, or
`unavailable`; `unavailable` is never silently a pass and is what a repo without
coverage tooling produces.

1. **Symbol resolution.** Compile the touched targets with the repo's own command,
   discovered at gather time and read from `state.md`. Catches hallucinated APIs. On a
   repo where the cheap path is a full app build, this check is `unavailable` rather
   than a 35-minute blocking run — record which, do not stall.
2. **Test-file guard.** Per D2. Fails naming every offending path.
3. **Surviving probes.** `git diff <base>...HEAD -U0 | grep '^+.*\[DEBUG-'`. Diff-scoped,
   not tree-scoped, so it cannot be satisfied by deleting someone else's line.
4. **Coverage on touched lines.** Per-language, `unavailable` where absent.
5. **Build-warning delta.** Warning count on the base vs. HEAD; a positive delta is a
   `fail` that names the new warnings.

### Success criteria

**Automated**
- `tests/run.sh` passes: each check has a fixture that fails it and a fixture that
  passes it, and check 3's fixture proves tree-scoped grep would have passed where
  diff-scoped fails.
- `guard-declaration.py` exits non-zero with no declaration, an unparseable one, and a
  stale `tier1.json` (report older than the HEAD commit).
- `shellcheck verification/scripts/*.sh` clean.

**Manual**
- Run `tier1.sh` against the MOSAIC-3559 worktree from the first Scruffy run. The
  unscoped-string-replace incident in `LEARNED.md` must come back as a check-2 failure.
  If it does not, check 2 is mis-specified.

---

## Phase 2 — Declaration, trigger rules, ledger columns

### Files

| File | Change |
|---|---|
| `verification/references/declaration.schema.json` | new |
| `verification/references/evidence-ladder.md` | trigger table, escalation/downgrade rules |
| `verification/scripts/derive-classes.py` | new — globs → classes, the same code the hook uses |
| `scruffy/references/dossier.md` | `evidence/declaration.json` in the file table; seven ledger columns |
| `scruffy/references/models.md` | caps table gains the artifact-repair cap of 2 |
| `bug-eater/SKILL.md` | step 7 writes the declaration before verifying |

### Trigger rules

Derived from the **final diff**, not the ticket text, and recomputed after the last
commit. Matches union; a diff touching a view manager and a view gets both ladders.

| Trigger | Class | Tiers |
|---|---|---|
| view/layout/storyboard/asset paths | `visual` | 2, 3, 4 |
| model/service/manager paths only | `logic` | 2 |
| crash log attached to the ticket | `crash` | 2, crash-free launch assertion |
| perf metric named in the ticket | `perf` | 2, XCTMetric delta as the assertion |

Glob sets are per-platform and live beside the existing platform references
(`bug-eater/references/platforms/{ios,android}.md`), because `Sources/Views/**` is an
iOS fact and `**/res/layout/**` is an Android one. `derive-classes.py` reads them; it
does not hardcode them.

Escalation free, downgrade requires `downgrades[]` with a reason, surfaced in the PR.

### Ledger columns

`declared_classes`, `tiers_run`, `tiers_unmet`, `downgrade_reason`, `repair_attempts`,
`blind_verifier_result`, `regression_found_in_review`.

The last one is backfilled by the *next* run's preflight, like `PR outcome` — a run
grading its own regressions is the bias the ledger exists to remove. This means
`scruffy/references/learning.md`'s backfill command grows a field; that edit belongs
in this phase, not phase 5.

### Success criteria

**Automated**
- Schema validation fixture: a declaration missing `downgrades[]` for a dropped tier
  is rejected.
- `derive-classes.py` fixtures: view-only diff → `visual`; view-model-only → `logic`;
  both → both. The third is the drift case the hook exists to catch and needs its own
  fixture.
- Guard hook (phase 1) now fails a declaration whose `classes` omit a class
  `derive-classes.py` derives.

**Manual**
- Read one real past diff, declare by hand, confirm the derivation agrees.

---

## Phase 3 — Tier 3, snapshot testing with pinned capture

### Files

| File | Change |
|---|---|
| `bug-eater/references/platforms/ios.md` | pinned-capture block; `recordVideo` for multi-step flows |
| `bug-eater/references/platforms/android.md` | equivalent, Paparazzi-first |
| `verification/references/evidence-ladder.md` | Tier 3 section: the diff image is the proof, stills are supporting |
| `bug-eater/SKILL.md` | step 3's visual-bug ordering updated to match the tier language |

### Pinned capture conditions

Device and scale by UDID, light and dark, locale, animations off by launch argument,
`xcrun simctl status_bar override` for a clean bar. Both appearances, because a
cart-total alignment bug that only shows in dark mode is exactly the case the current
single screenshot misses.

**Constraint carried forward:** `bug-eater` already forbids inventing a snapshot suite
where none exists, and iOS snapshot suites are rare on these repos. So Tier 3's ordering
is: existing snapshot suite → accessibility-tree snapshot diff → pinned stills, with
the fallback recorded as a downgrade with a reason. Adding
`swift-snapshot-testing` to a repo Amel does not own is a PR of its own, not part of a
bug fix.

### Success criteria

**Automated**
- Capture script is idempotent: two runs against the same build produce
  byte-identical PNGs. If they do not, a condition is unpinned and the diff image is
  worthless.

**Manual**
- One visual bug captured light and dark, diff image attached to a draft PR, read back
  as a reviewer.

---

## Phase 4 — Repair cap and the PR gap template

### Files

| File | Change |
|---|---|
| `verification/references/evidence-ladder.md` | §3: cap 2, different route each attempt, actual error text logged |
| `bug-eater/SKILL.md` | step 9 gap block at the **top** of the body; label application |
| `scruffy/references/models.md` | caps table row |

Cap is 2, below the 3 for solution failures, because a missing artifact is usually
environmental. Each attempt must take a **different route** — a different UDID,
generating the reference from the current build, XCUITest → accessibility dump, video →
stills. The same command twice does not count, and the script records the command line
of each attempt so "different" is checkable rather than asserted.

After two failures: open the PR, do not block. Tier 0 is the exception and stays a
solution failure routing to the existing 3-attempt path.

Gap block leads the body, names what the reviewer must check **by hand** — "cart total
alignment in dark mode, iPhone SE width", not "visual verification incomplete" — and
applies `unverified-visual` / `unverified-behavioural`.

### Success criteria

**Automated**
- Attempt log rejects a repeat command; fixture with two identical routes fails.
- PR-body renderer fixture: unmet tier produces the block first, with a non-empty
  manual-check line. Empty manual-check line is a hard failure — a gap with no
  instruction is an apology, not a handoff.

**Manual**
- Labels exist on the target repos, or the step degrades to a body-only gap with a note.
  Amel does not own these repos and may not be able to create labels; find out before
  relying on them.

---

## Phase 5 — Blind verifier at step 7

### Files

| File | Change |
|---|---|
| `verification/references/blind-verifier.md` | new — the context contract and the two questions |
| `verification/SKILL.md` | claim 4 replaced by the blind verification step |
| `scruffy/references/models.md` | verifier model row (sonnet; opus on escalation only) |
| `bug-eater/SKILL.md` | step 7 hands off |

Separate agent. Receives acceptance criteria, the artifacts, and the tier declaration.
**Never the diff** — this is the whole property, and it is enforced by constructing the
context from a file allowlist rather than by instructing the agent not to look.

Two questions: do these artifacts cover these criteria, and is anything claimed the
artifacts do not show. A `no` on either is a step 7 failure of the same weight as a red
test not going green.

Figma comparison may enter as a hint. Never a gate.

### Success criteria

**Automated**
- Context-assembly test: the payload handed to the verifier contains no path under the
  diff's touched files and no `git diff` output. Assert on the payload, not on the
  prompt text.

**Manual**
- Adversarial run: hand it a real artifact set with one criterion deliberately
  uncovered. It must return `no`. A verifier that passes that set is worth nothing and
  the instruction needs sharpening before it ships.

---

## Phase 6 — Step 3: acceptance criteria → executable checks

Largest workflow change. Last, once the evidence side is proven.

### Files

| File | Change |
|---|---|
| `bug-eater/SKILL.md` | step 3 reframed as translation; stop 3 rewritten per D4 |
| `scruffy/SKILL.md` | stop table row 3 |
| `feature-dev/SKILL.md` | reconcile its acceptance-test step with the same shape |
| `verification/SKILL.md` | red test sourced from an approved check |

The agent translates each acceptance criterion into an executable check — test,
assertion, or snapshot reference — **before implementing**. Amel approves the checks,
not the plan. Implementation then proceeds against approved checks, verified by
construction.

The rationale is the one that makes the rest of this worth building: when the agent
writes most of the code, the scarce human input moves from "is this code right?" to "is
this the right check for this criterion?". It also removes most of the screenshot
problem, leaving genuine visual polish as the only residue needing an eye.

**Risk to watch:** `bug-eater` infers expected behaviour about 80% of the time and is
explicitly told to infer loudly rather than ask. Translating an inferred criterion into
a check Amel approves turns that inference into something he sees — good — but it also
means stop 3 now fires on items where it previously did not. The ledger's stop columns
will show whether that trade is worth it; give it twenty rows before adjusting.

### Success criteria

**Automated**
- Every criterion in the approval payload carries a check; an unmapped criterion blocks
  the stop rather than being dropped.

**Manual**
- Two real tickets through the new step 3. Did approving checks take less of his
  attention than approving a plan?

---

## Build order and sequencing notes

1. Phase 1 — static checks and hook
2. Phase 2 — declaration, triggers, ledger
3. Phase 3 — Tier 3 capture
4. Phase 4 — repair cap and gap template
5. Phase 5 — blind verifier
6. Phase 6 — AC translation

Phases 1 and 2 are the ones that pay for themselves without any behaviour change in the
lane: the hook catches a class of drift nothing else catches, and the ledger columns
start collecting the data that decides whether Tier 3 should ever become a hard block.
That question is currently a guess. Do not answer it before the rows exist.

Phases 3–5 are independent of each other and can reorder if a real ticket makes one
urgent. Phase 6 depends on 5 having proven that an artifact set can be graded by
something that did not write it — until that holds, approving checks up front just
moves the unfalsifiable step earlier.
