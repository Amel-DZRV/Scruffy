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
- *(added)* **No new modules or Gradle plugins in target repos.** This rules out
  Macrobenchmark and Gradle Managed Devices on Android, both of which would otherwise be
  the best substitutions available (see Appendix B). They need a `build.gradle` change in
  a repo Amel does not own, which is the same objection that keeps
  `swift-snapshot-testing` out on iOS. Symmetrical exclusion, symmetrical fallbacks.

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

### D3 — The guard hook gates the push, and it is advisory by construction

"PreToolUse-style, outside model context" is right about the property that matters
(not self-graded) but a `PreToolUse` hook on every tool call has nowhere sensible to
fire. The gate belongs at the point of no return.

**Correction to an earlier draft of this plan:** gating on `Bash` commands containing
`gh pr create` is trivially bypassed — `gh api`, the GitHub MCP tool, a shell alias, or
opening the PR from the branch in a browser all route around it. A matcher on one string
is theatre. The gate is therefore three layers, and the plan is explicit that none of
them is authoritative:

1. **`PreToolUse` on the set, not the string** — `Bash` matching `git push`, `gh pr`,
   and `hub`, plus the MCP tool names (`mcp__github__create_pull_request`,
   `mcp__github__push_files`). Catches the ordinary path.
2. **A `pre-push` hook installed into the worktree** by `worktrees.md`'s setup. This one
   sits below the agent's tool layer entirely and catches every route through git.
   `--no-verify` defeats it, which is the point: bypass becomes an explicit, visible act
   in the transcript rather than an accident.
3. **The PR body carries the commands to re-run.** On a repo Amel does not own there is
   no CI check Scruffy can require, so the last authority is the reviewer. Every Tier 1
   and Tier 3 claim in the body names the command that produced it, against a named SHA.

The honest statement, which belongs in `evidence-ladder.md` and not just here: **on a
repo you do not own, the gate cannot be authoritative.** What it can do is make the
compliant path the cheapest one, make bypass visible, and make every claim independently
re-runnable by the reviewer. Appendix C is the rest of that argument.

Tier 1's checks run as an explicit script at step 7 and write their report into
`evidence/`. The hook **recomputes the cheap checks itself** rather than trusting that
report — checks 2, 3 and 6 are pure git operations costing milliseconds — and trusts the
report only for the expensive ones (compile, coverage), which are bound to a HEAD SHA
and a diff hash. A report whose SHA does not match HEAD is a failure, not a warning.

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
| `verification/scripts/tier1.sh` | new — runs the six structural checks, writes `evidence/tier1.json` |
| `verification/scripts/lib/diff.sh` | new — touched-file enumeration against the merge base, shared with the hook |
| `verification/references/platform-matrix.md` | new — per-platform command for every check; see Appendix A |
| `verification/scripts/guard-declaration.py` | new — the `gh pr create` gate |
| `verification/references/evidence-ladder.md` | new — the ladder itself; `verification/SKILL.md` links to it |
| `hooks/settings.snippet.json` | new — hook wiring to paste into `~/.claude/settings.json` |
| `tests/run.sh`, `tests/fixtures/` | new — fixture repos exercising each check's pass and fail path |
| `README.md` | install step for the hook |

### `tier1.sh` — the six checks

Each writes a `{name, status, detail}` record. `status` is `pass`, `fail`, or
`unavailable`; `unavailable` is never silently a pass and is what a repo without
coverage tooling produces.

`tier1.sh` itself is platform-agnostic: it dispatches every check through
`platform-matrix.md`'s command table, keyed on the platform recorded in `state.md`.
The check *definitions* below are the contract; Appendix A gives the iOS and Android
command for each.

1. **Symbol resolution.** Compile the touched targets with the repo's own command,
   discovered at gather time and read from `state.md`. Catches hallucinated APIs. On a
   repo where the cheap path is a full app build, this check is `unavailable` rather
   than a 35-minute blocking run — record which, do not stall.
2. **Test-file guard.** Per D2. Fails naming every offending path. The test-source
   globs are per-platform — Android has three test source sets (`src/test`,
   `src/androidTest`, and variant-specific ones) where iOS has a single `Tests/`
   convention, so a matrix entry rather than a hardcoded pattern.
3. **Surviving probes.** `git diff <base>...HEAD -U0 | grep '^+.*\[DEBUG-'`. Diff-scoped,
   not tree-scoped, so it cannot be satisfied by deleting someone else's line. The one
   check that is genuinely identical on both platforms.
4. **Coverage on touched lines.** Per-language, `unavailable` where absent.
5. **Build-warning delta.** Warning count on the base vs. HEAD; a positive delta is a
   `fail` that names the new warnings.
6. **Golden-image guard.** *(new, and the check Android forced into existence.)* Any
   snapshot reference image the diff adds or modifies must be listed in the
   declaration's `baselines_updated[]` with a reason. Re-recording a golden is the
   visual analogue of weakening an assertion until it passes — `verifyPaparazziDebug`
   goes green after `recordPaparazziDebug` regardless of whether the fix is right, and
   nothing else in the ladder can tell those apart. `verification/SKILL.md` already
   requires this judgement in prose ("failures on components you did not touch →
   `decision needed`, never auto-updated"); this makes it mechanical. iOS needs it
   equally — `isRecording = true` in swift-snapshot-testing is the same move — but it
   bites less often there simply because those suites are rarer.

### Success criteria

**Automated**
- `tests/run.sh` passes: each check has a fixture that fails it and a fixture that
  passes it, and check 3's fixture proves tree-scoped grep would have passed where
  diff-scoped fails.
- **Every check has both an iOS and an Android fixture.** A check with only one is not
  done — this is the rule that keeps parity from rotting, and it is cheap to enforce:
  `tests/run.sh` fails if a check id appears under `fixtures/ios/` but not
  `fixtures/android/`.
- Check 6 fixture: a diff that re-records a Paparazzi golden without declaring it fails;
  the same diff with a `baselines_updated[]` entry passes.
- `guard-declaration.py` exits non-zero with no declaration, an unparseable one, and a
  stale `tier1.json` (report older than the HEAD commit).
- `shellcheck verification/scripts/*.sh` clean.

**Manual**
- Run `tier1.sh` against the MOSAIC-3559 worktree from the first Scruffy run. The
  unscoped-string-replace incident in `LEARNED.md` must come back as a check-2 failure.
  If it does not, check 2 is mis-specified.
- Run it against one Android worktree in `~/Projects/android`. Fixtures prove the
  script works; only a real Gradle module proves the matrix entries are right.

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
| view/layout/storyboard/asset paths, **or a UI content signal in the diff** | `visual` | 2, 3, 4 |
| model/service/manager paths only | `logic` | 2 |
| crash log attached to the ticket | `crash` | 2, crash-free launch assertion |
| perf metric named in the ticket | `perf` | 2, perf delta as the assertion |

Glob sets are per-platform and live beside the existing platform references
(`bug-eater/references/platforms/{ios,android}.md`), because `Sources/Views/**` is an
iOS fact and `**/res/layout/**` is an Android one. `derive-classes.py` reads them; it
does not hardcode them.

**Path globs alone are not enough, and Android is why.** A Compose UI lives in an
ordinary `.kt` file with no path convention — `**/res/layout/**` catches the View-based
half of an Android codebase and misses Compose entirely, which on a modern SDUI renderer
is most of it. So derivation is **globs OR content signal**, where the content signal is
a grep over the diff's added lines:

| Platform | Content signal for `visual` |
|---|---|
| Android | `@Composable`, `@Preview`, `Modifier.`, `setContentView`, `: View(`, `AndroidView(` |
| iOS | `: View`, `some View`, `@ViewBuilder`, `UIView`, `UIViewController`, `CALayer` |

iOS has the same hole — a SwiftUI view is also just a `.swift` file — but it is masked
by these repos' stronger path conventions. Building the signal for both costs one extra
matrix entry and removes the asymmetry rather than papering over it.

This is also the drift case the guard hook exists to catch, stated precisely: a Compose
fix classified `logic` because the diff touched `CartViewModel.kt` and the composable in
the same commit. Fixture it in both directions.

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
| `bug-eater/references/platforms/android.md` | pinned-capture block; `screenrecord`; host-side snapshot ordering |
| `verification/scripts/pin-capture-{ios,android}.sh` | new — apply conditions, capture, **restore** |
| `verification/references/evidence-ladder.md` | Tier 3 section: the diff image is the proof, stills are supporting |
| `bug-eater/SKILL.md` | step 3's visual-bug ordering updated to match the tier language |

### Pinned capture conditions

Same five conditions on both platforms, reached by opposite mechanisms. iOS *selects* a
device that already has the properties; Android *forces* them onto whatever emulator it
claimed. Full command table in Appendix A.

| Condition | iOS | Android |
|---|---|---|
| device + scale | pin the UDID | `wm size` / `wm density`, explicitly set |
| appearance | both, per launch | `cmd uimode night yes\|no` |
| locale | launch argument | `cmd locale set-app-locales` (API 33+), else host-side config |
| animations | launch argument | the three `*_animation_scale` globals set to 0 |
| clean status bar | `simctl status_bar override` | SystemUI demo mode |
| font scale | inherited from the device | `settings put system font_scale 1.0` — **must be pinned explicitly** |

Both appearances always, because a cart-total alignment bug that only shows in dark mode
is exactly the case a single screenshot misses.

**Android's mechanism creates an obligation iOS does not have: restore.** `wm size`,
`wm density`, the animation scales and demo mode are all *persistent global device
state*. A run that captures and exits leaves the emulator at a forced density for
whatever runs next, and the symptom is a later run producing inexplicable layout
diffs. So `pin-capture-android.sh` sets conditions in a trap-guarded block and resets
every one on exit, including on failure. This is a genuine new failure mode, not a
translation of an iOS one, and it is the kind of thing that ends up in `LEARNED.md` the
expensive way if it is not designed in now.

### The ordering, and where Android is stronger

`bug-eater` already forbids inventing a snapshot suite where none exists. Within that
constraint the ladders are not mirror images, and pretending they are would make the
Android path worse:

| Rung | Android | iOS |
|---|---|---|
| 1 | **Paparazzi / Roborazzi golden** — JVM, no device, deterministic | existing `swift-snapshot-testing` suite, if any |
| 2 | Compose semantics tree (`printToString`) diff | `axe describe-ui` accessibility-tree diff |
| 3 | `uiautomator dump` XML diff | — (rung 2 covers it) |
| 4 | pinned stills via `pin-capture-android.sh` | pinned stills via `simctl` |

Rung 1 on Android runs **on the JVM with no emulator at all** — which makes it *cheap*
in the cost-class sense of `verification/SKILL.md`, needs no build slot, and produces a
reference diff image that is byte-stable by construction. Where a repo already has
Paparazzi, Android's Tier 3 is both stronger and cheaper than iOS's best case, and the
repair loop in phase 4 will almost never fire. The existing `android.md` already says
"check here first, Paparazzi is common" — this promotes that note from an aside to the
first rung.

The corollary: on a repo with **no** host-side snapshot suite, Android drops to rung 4
just as iOS does, and the emulator makes it *flakier* than the simulator (`android.md`
already flags boot flakiness as a process failure). So the honest summary is that
parity holds at the top and the bottom of the ladder, and Android's spread between them
is wider. Record which rung was reached in `tiers[]`; a rung-4 capture on a repo that
had Paparazzi available is a downgrade needing a reason.

### Success criteria

**Automated**
- Capture script is idempotent on **both** platforms: two runs against the same build
  produce byte-identical PNGs. If they do not, a condition is unpinned and the diff
  image is worthless. Android is the harder case here — emulator GPU rendering is not
  deterministic by default, so the AVD launch line pins software rendering.
- Restore test: `pin-capture-android.sh` killed mid-run leaves `wm size`, `wm density`,
  the animation scales, `font_scale` and demo mode at their original values.

**Manual**
- One visual bug per platform captured light and dark, diff image attached to a draft
  PR, read back as a reviewer.
- On Android, one bug taken through rung 1 and one through rung 4, to see what the
  reviewer actually gets in each case.

---

## Phase 4 — Repair cap and the PR gap template

### Files

| File | Change |
|---|---|
| `verification/references/evidence-ladder.md` | §3: cap 2, different route each attempt, actual error text logged |
| `bug-eater/SKILL.md` | step 9 gap block at the **top** of the body; label application |
| `scruffy/references/models.md` | caps table row |

Cap is 2, below the 3 for solution failures, because a missing artifact is usually
environmental. Each attempt must take a **different route**, and the route list is
per-platform — the same matrix entry that phases 1–3 read:

| Route | iOS | Android |
|---|---|---|
| different device | another booted UDID | another serial, or a fresh AVD with `-no-snapshot` |
| generate the reference | record the snapshot from the current build | `recordPaparazziDebug` / `recordRoborazziDebug` — **only with a `baselines_updated[]` entry**, per Tier 1 check 6 |
| drop a rung | XCUITest → `axe describe-ui` | Espresso/Compose test → `printToString` → `uiautomator dump` |
| video → stills | `simctl io recordVideo` → screenshots | `screenrecord` → screenshots (also the fallback when a flow exceeds screenrecord's 3-minute cap) |

The same command twice does not count, and the script records the command line of each
attempt so "different" is checkable rather than asserted.

Note the interaction in row 2: on Android the cheapest repair route is also the one Tier
1 check 6 polices. That is intended — regenerating a golden is a legitimate repair when
the reference genuinely did not exist, and an assertion-weakening move when it did. The
declaration entry is what separates them, so the repair path writes it rather than
routing around the check.

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

**This phase is the one place parity is free.** The verifier consumes artifacts, not
tooling: a PNG diff, a tree dump and a pass count read identically whether they came from
`simctl` or `adb`. The only platform-aware part is the artifact manifest, and that is
already per-platform from phase 2. Do not let a platform branch creep in here — if the
verifier can tell which platform it is looking at, the artifact set is leaking
implementation detail it should not need.

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

---

## Appendix A — Platform substitution matrix

The source document is written in iOS vocabulary throughout (`swift-snapshot-testing`,
XCUITest, `simctl`, XCTMetric). This appendix is the Android column, and it is the
content that lands in `verification/references/platform-matrix.md` in phase 1 and gets
split into the two `bug-eater/references/platforms/*.md` files in phase 3.

**Read it as a contract, not a command list.** Each row names what the check must
establish; the two columns are today's way of establishing it on each platform. When a
command moves, the row does not.

### Tier 1 — structural

| Check | iOS | Android |
|---|---|---|
| 1. Symbol resolution | `xcodebuild -target <t>` / `bazel build <target>` / `swift build` | `./gradlew :<module>:compileDebugKotlin` — module-scoped, not `assembleDebug` |
| 2. Test-source globs | `**/Tests/**`, `*Tests.swift`, `*Spec.swift` | `**/src/test/**`, `**/src/androidTest/**`, `**/src/test<Variant>/**`, `*Test.kt` |
| 3. `[DEBUG-*]` probes | identical | identical |
| 4. Touched-line coverage | `xcrun xccov view --report --json` | `koverXmlReport` (Kotlin) or `jacocoTestReport`; parse the XML for the touched lines |
| 5. Warning delta | `xcodebuild` output, warning lines counted | Kotlin `w:` lines **plus** `./gradlew lintDebug` → `lint-results-debug.xml` counts. Android Lint is the stronger signal and has no iOS equivalent — use both, report separately |
| 6. Golden guard | `__Snapshots__/**.png`, and `isRecording = true` appearing in the diff | `**/snapshots/images/**.png` (Paparazzi), `**/roborazzi/**.png`, `**/screenshotTest/reference/**.png` |

Check 5's asymmetry is worth keeping rather than flattening: Android Lint catches a
class of defect (missing content descriptions, resource misuse, API-level guards) that
on iOS has no compiler-level equivalent, and a lint-count delta is exactly the kind of
mechanical, non-LLM signal Tier 1 exists to collect. Treat a `lint-baseline.xml` edit in
the diff the same way as a golden re-record — it is the same move.

### Tier 2 — behavioural

| Assertion | iOS | Android |
|---|---|---|
| Element exists with label after interaction | XCUITest on accessibility identifiers | Compose: `composeTestRule.onNodeWithTag(...).assertIsDisplayed()`; Views: Espresso `onView(withContentDescription(...))`; cross-process: UI Automator `By.res` / `By.desc` |
| Accessibility-tree snapshot diff | `axe describe-ui --udid <UDID>`, dumped before and after | Compose: `onRoot(useUnmergedTree = true).printToString()` — deterministic text, no device. Views: `uiautomator dump` → XML |
| Structured event order | OSLog / in-test recorder | in-test recorder preferred; `adb logcat -b main -s <TAG> -v epoch` as the fallback |
| Crash-free launch | launch, then assert no new report in `~/Library/Logs/DiagnosticReports` | `adb logcat -b crash -c` before, `adb shell am start -W -n <pkg>/<activity>`, then `adb logcat -b crash -d` must be empty; also check for an ANR trace |
| Perf delta | XCTMetric | Macrobenchmark `StartupTimingMetric` / `FrameTimingMetric` **where the module already exists**; otherwise `am start -W` `TotalTime` over N runs, or `dumpsys gfxinfo <pkg> framestats` for jank. See Appendix B |

The accessibility-tree row is the one where Android is quietly ahead: `printToString()`
on the Compose semantics tree is a host-side, device-free, deterministic text dump.
`axe describe-ui` needs a booted simulator and an app on the right screen. For a Compose
bug, rung 2 of the visual ladder is nearly as cheap as rung 1.

### Tier 3 — visual capture

| Condition | iOS | Android |
|---|---|---|
| Snapshot library | `swift-snapshot-testing`, if present | Paparazzi (JVM, views + Compose) → Roborazzi (Robolectric, supports interaction) → AGP's `com.android.compose.screenshot` plugin, if any is present |
| Record / verify | scheme-dependent | `./gradlew recordPaparazziDebug` / `verifyPaparazziDebug`; Roborazzi: `recordRoborazziDebug` / `verifyRoborazziDebug` / `compareRoborazziDebug` (which emits the diff image directly) |
| Device + scale | pin the UDID | `adb shell wm size 1080x2340`, `adb shell wm density 440`; reset with `wm size reset` / `wm density reset` |
| Appearance | per-launch, both | `adb shell cmd uimode night yes` / `no` |
| Locale | launch argument | `adb shell cmd locale set-app-locales <pkg> --locales en-US` (API 33+); below that, set it in the host-side snapshot config instead of on the device |
| Animations off | launch argument | `adb shell settings put global window_animation_scale 0`, same for `transition_animation_scale` and `animator_duration_scale` — all three, not one |
| Clean status bar | `xcrun simctl status_bar <UDID> override --time 9:41 --batteryState charged --batteryLevel 100` | SystemUI demo mode: `settings put global sysui_demo_allowed 1`, then `am broadcast -a com.android.systemui.demo -e command enter`, plus `clock`/`battery`/`network`/`notifications` sub-commands; `-e command exit` to restore |
| Font scale | inherited | `adb shell settings put system font_scale 1.0` — pin it; a device left at 1.3 by a previous accessibility test silently invalidates every diff |
| Deterministic rendering | simulator is software-rendered | launch the AVD with `-gpu swiftshader_indirect -no-snapshot -no-audio`; host GPU rendering is not reproducible across machines |
| Video | `xcrun simctl io <UDID> recordVideo <out>.mp4` | `adb shell screenrecord --time-limit 180 /sdcard/<out>.mp4` then `adb pull`; hard 3-minute cap, no audio, and it drops frames under load — fall back to a still sequence for anything longer |
| Screenshot | `xcrun simctl io <UDID> screenshot` | `adb -s <serial> exec-out screencap -p >` (already in `android.md`) |

### Tier 4 — blind verification

No substitutions. Artifacts only. See phase 5.

---

## Appendix B — Asymmetries that are not substitutable

Four places where the platforms genuinely do not line up. Naming them is the point;
inventing an equivalent that does not exist would be worse than a declared gap, which is
the same principle the PR gap template runs on.

### B1 — Perf: Macrobenchmark needs a module, XCTMetric does not

XCTMetric is available in any existing XCTest target. Macrobenchmark requires a separate
`com.android.test` module with its own manifest and a profileable/debuggable target app.
On a repo Amel does not own, that is a PR of its own.

**Fallback ladder, in order:** an existing Macrobenchmark module if the repo has one →
`am start -W` `TotalTime` across N≥10 runs with the median reported and the spread shown
→ `dumpsys gfxinfo <pkg> framestats` for jank claims. Each rung is weaker; record which
was used in `tiers[]` and treat rungs 2–3 as a declared downgrade rather than a clean
Tier 2 pass. A perf number with no distribution is not evidence on either platform, but
the emulator's variance makes that bite harder on Android — report N and spread, always.

### B2 — Device pinning is selection on iOS, mutation on Android

Covered in phase 3. The consequence worth restating: Android capture has a **cleanup
obligation**, and a killed run leaves the device dirty. Gradle Managed Devices would fix
this properly by declaring the device in the build file, but that is excluded by "no new
modules" above. So: trap-guarded restore, and a preflight check that the emulator is at
default `wm size` / `wm density` / `font_scale` before capture, so a previous run's
leftovers are caught rather than inherited.

### B3 — Android Lint has no iOS counterpart; iOS's compiler is stricter

Two opposite gaps that partly cancel. Swift's type checker catches at compile time much
of what Android Lint catches at analysis time, and Lint catches accessibility and
resource issues Swift has no notion of. Do not try to make check 5 produce a
like-for-like number across platforms — report the platform's own signals and compare
each against its own base, never Android's lint count against iOS's warning count.

### B4 — Emulator flakiness has no simulator equivalent

`android.md` already treats a failed emulator boot as a process failure with no retry
loop, which is the right call and stays. The ladder consequence is that Android's
repair-attempt cap of 2 will be reached more often than iOS's for reasons that are
environmental rather than evidential. That is exactly what `repair_attempts` and
`tiers_unmet` in the ledger are for — if Android rows show a systematically higher unmet
rate at the same `regression_found_in_review`, the cap is wrong for Android, not the
ladder. Slice the ledger by platform before drawing any conclusion from it; the existing
`repo` column already makes that possible.

---

## Parity as a maintained property

Three mechanisms, so this does not decay back to an iOS-first skillset:

1. **The fixture rule** (phase 1): a check with an iOS fixture and no Android fixture
   fails the test run. Mechanical, cheap, and it fails loudly the first time someone
   adds an iOS-only check.
2. **The matrix is a contract, not a command list.** Rows name what must be established.
   A new check adds a row with both columns filled or it does not land.
3. **The ledger is sliced by platform** before any tuning decision. `tiers_unmet ×
   regression_found_in_review` answered on pooled rows would let iOS's numbers set
   Android's thresholds, which is the statistical version of the same bias.

---

## Appendix C — Hardening: what "bullet-proof" can and cannot mean

A claim can be wrong three ways. The ladder as specified covers two of them well.

| Failure | Covered by |
|---|---|
| The artifact does not exist | tier selection, repair cap, gap template, labels |
| The artifact exists but does not cover the criterion | Tier 4 blind verification |
| **The artifact exists and was manufactured** | thin — this appendix |

The third is the one that matters, because a manufactured artifact is
*indistinguishable from a real one* at review time. It is also the failure the source
document's core rule is aimed at ("the agent that produced the diff never grades its own
work") without yet having a mechanism behind it.

**The target is not "cannot be cheated."** A sufficiently determined agent with shell
access can defeat any of this. The target is three properties, in order:

1. **Mechanically caught** — the cheat fails a check that runs outside model context.
2. **Otherwise explicitly declared** — the cheat requires writing down that you did it.
3. **Otherwise statistically visible** — the ledger surfaces it across runs even when a
   single run looks clean.

Anything that is none of the three is an unguarded claim, and §C7 says to write those
down rather than pretend they are covered.

### C1 — Git is the witness, not the file

Every ordering claim in this design is currently an assertion by the thing being
checked. "The red test was written before the fix" is proven by a hash in `state.md` —
a file the same agent writes. "The declaration was computed from the final diff" is
proven by nothing at all.

**Commit evidence at the moment it is produced**, on the work branch:

- The red test and its failing output, committed when it goes red, *before* any fix
  commit exists. Ordering becomes a property of `git log`, not of a field.
- `declaration.json` and `tier1.json` each pinned to the HEAD SHA they describe. Any
  later commit invalidates them and the guard recomputes.

This is the single highest-value hardening item, because it converts three separate
self-reported facts into one thing that cannot be back-dated without rewriting history —
which is itself visible. It also costs almost nothing: the commits are already being
made.

### C2 — Both allowlists are self-declared; bind them to their moment

`red_test.path` (D2) and `baselines_updated[]` (Tier 1 check 6) are allowlists written by
the agent whose work they exempt. As specified, an agent that wants green can name a
neighbouring test as the red test, or declare a golden re-record it should not have made.

Bind each to the moment it was legitimate:

- `red_test.path` is read from the **step-3 commit**, not from the declaration. If the
  declaration names a different path, that is a mismatch and a hard failure — the same
  shape as the existing hash check, which `verification/SKILL.md` already treats as
  non-absorbable.
- A `baselines_updated[]` entry requires the golden's **pre-image to have existed** at
  the step-3 SHA. Recording a reference that never existed is a legitimate first-time
  capture; re-recording one that did is the assertion-weakening move, and git can tell
  them apart even though the working tree cannot.

### C3 — Verdicts are files written by the checker, never model reports

The blind verifier's answer reaches the run as text in a transcript, which means the
orchestrating agent is the one reporting whether it passed. That is exactly the
self-grading the ladder exists to remove, reintroduced at the last step.

The verifier writes `evidence/tier4-verdict.json` itself. The gate reads the file. The
same rule applies to `tier1.json`. **No gate in this design may take its input from a
model's summary of a result** — this is a one-line rule and it should be stated in
`evidence-ladder.md` as such, because it is the kind of thing that erodes quietly.

Corollary for phase 5: the verifier's context payload is assembled by a script from the
declaration's manifest and hashed into `evidence/`. "Never receives the diff" is then
checkable after the fact rather than being an instruction.

### C4 — A red-team corpus, one fixture per known cheat

`tests/run.sh` as specified proves the checks *run*. It does not prove they *catch*
anything, and a check that always returns `pass` would sail through a pass-fixture suite.

Add a corpus of diffs that must fail, one per cheat the design knows about:

| Cheat | Must be caught by |
|---|---|
| Edit a neighbouring test until green | check 2 |
| Re-record a golden instead of fixing | check 6 + C2 |
| Weaken the red test's assertion | red-test hash (existing) |
| Leave a `[DEBUG-*]` probe | check 3 |
| Reference an API that does not exist | check 1 |
| Classify a Compose fix as `logic` | guard hook + content signal |
| Hand-edit `tier1.json` | SHA binding (C1) |
| Feed the verifier the diff | payload hash (C3) |
| Back-date the red test | commit ordering (C1) |

**Rule: a check with no cheat-fixture is a placeholder, not a check.** This is the same
standard `verification/SKILL.md` already applies to tests ("a check that cannot fail is
not a check") — applied to the checking machinery itself.

### C5 — `LEARNED.md` becomes a permanent regression corpus

Four entries exist today; three of them are mechanically checkable and none of them is
checked by anything. They will recur.

Every `LEARNED.md` entry whose rule is mechanical gets a fixture, permanently:

- *"Never run an unscoped string replace"* → the diff from that incident, which must fail
  check 2. Already named as a manual step in phase 1; make it a fixture instead.
- *"Read whole Jira field blocks"* → a gather-stage assertion, not a Tier 1 check, but the
  same principle applies.
- *"Long git operations need a background run"* → a preflight assertion on repo file count.

This closes the correction loop that `learning.md` describes but cannot currently
enforce: today a lesson is prose the next run is asked to remember. A fixture is a lesson
the next run cannot forget. It also gives `LEARNED.md` a natural size limit — entries
that graduate to fixtures stop needing to be read.

### C6 — Meta-checks, because the loop can fail silently

Every mechanism here degrades quietly if its input stops arriving. Three assertions in
preflight, each cheap:

- **Backfill health.** If the last N ledger rows have blank `PR outcome`, the backfill is
  broken and every tuning conclusion downstream is drawn on stale data. Report it; do not
  proceed as though the ledger is live.
- **Label saturation.** If most PRs carry `unverified-*`, the label has stopped meaning
  anything and the ladder is mis-tuned. That is a finding about the ladder, not a reason
  to relax the label.
- **Unmet rate by platform.** Per Appendix B4 — Android hitting the repair cap for
  environmental reasons must not be read as evidence about the ladder's thresholds.

### C7 — Write down what remains unguarded

The residue, stated rather than hidden, because a design that claims total coverage is
less trustworthy than one that names its gaps — which is the same argument
`verification/SKILL.md` already makes about PRs that are quiet about what they could not
verify:

- **The gate is advisory on repos Amel does not own** (D3). No CI check can be required
  there. Bypass is visible, not prevented.
- **The blind verifier is an LLM and is non-deterministic.** Two runs may disagree. Its
  value is measurable — `blind_verifier_result × regression_found_in_review` over twenty
  rows gives a false-pass rate — but it is a gate whose reliability is itself an
  empirical question, and it should not be described as though it were a compiler.
- **Tier 3 rung 4 (pinned stills) remains non-falsifiable.** Pinning conditions makes the
  pair *comparable*; it does not make it *proof*. `verification/SKILL.md` is already
  correct about this and the ladder must not quietly upgrade it by putting it in a table
  next to things that can fail.
- **Perf on Android below Macrobenchmark is a weak signal** (B1), and a median with a
  spread is the most that can be claimed.

### Where this lands in the build order

C1, C2 and C3 are not a seventh phase — they are corrections to phases 1, 2 and 5 and
should be built into those phases rather than bolted on afterwards. C4 and C5 extend
phase 1's test suite. C6 is a phase 2 addition to preflight.

The ordering argument is the same one that put Tier 1 first: **the hardening is worth
more than the tiers it protects.** A ladder with five tiers and a self-graded declaration
is weaker than a ladder with two tiers and a witness, because the first one produces
confident output that cannot be checked and the second produces less output that can.
