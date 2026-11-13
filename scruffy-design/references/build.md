# Build

Steps 3 to 6. The mechanics of the Team Lead, track worktrees, the developer packet, the fail memo and integration are `../shared/orchestration.md`; this file holds what the design lane does differently, and why.

## What differs from the other lanes

| Shared mechanics say | The design lane does | Why |
|---|---|---|
| Tracks are derived from a plan's `files` and `depends on` | **One track per screen**, after a serial foundation | Every screen depends on tokens, theme and shared components. Derived mechanically, that is one serial track |
| Tracks branch from the test-only commit | Tracks branch from the **foundation commit**, and later from the head of the run branch | There are no tests before there is a foundation |
| Red tests exist before any developer runs | Behaviour tests are written **per screen, red first, inside its track**, after the visuals match | The visual oracle is the design, not a test. Tests cover what a picture cannot |
| The auditor judges once, at the end | `design-qa` judges **every round**, per screen | The loop is the point: capture, compare, fix |
| Developers return commits; nobody captures until verification | Developers still never capture. The **Team Lead captures**, through one device slot | One device, one installed app, pinned settings: capture cannot fan out |

Everything not in this table is as `../shared/orchestration.md` says: the main thread is the Team Lead, worktrees are created by it and never by the harness's own isolation, one commit per step, prose without commits is nothing, the fail memo, scope while building.

## Branches and worktrees

- Run branch `scruffy/design-<feature-slug>`, in its own worktree, per `../scruffy-bug/references/worktrees.md`.
- Screen tracks: `<repo_path>/.worktrees/design-<feature-slug>-<screen>`, branch `design-<feature-slug>-<screen>`, created by the Team Lead from the foundation commit:

  ```bash
  git -C <repo_path> worktree add <path> -b <branch> <foundation-sha>
  ```

- The app is built and launched from the **run branch's worktree only**. Track worktrees are for editing and for `check_cmd` / `test_cmd`; they are never launched.

## Shared files are frozen

After step 3, every file matching the profile's `shared_globs` is read-only to screen developers. It is in their packet as `frozen`.

A screen that needs a shared file changed does not change it. Its developer reports the need (`out-of-scope needs`) and builds against what exists. The Team Lead collects those needs each round and, when one is real, dispatches **one** developer on the run branch to make the change, then merges the run branch into every open track before the next round. Then every state that uses the changed component is re-captured, not only the one that asked.

This is the rule that keeps eight developers from writing eight buttons.

## Foundation (step 3)

Serial, on the run branch, in this order. One `developer` dispatch per item, then one `step-reviewer` over the foundation's whole diff.

1. **Tokens and theme.** `design/tokens.md` into the app's theme. Existing app: extend the theme it has, mapping per the tokens file; never a second theme beside it.
2. **Shared components.** Everything that appears on two or more screens in `slices.md`, each with its variants and states as the design draws them.
3. **Navigation shell.** Routes for every screen in `slices.md`, each rendering a placeholder until its track lands.
4. **The state harness.** A development-only entry (excluded from release builds by the stack's own mechanism) that takes `{screen}` and `{state}` and renders that screen in that state from a fixture, with no network and no clock dependence. It also renders a **component sheet**: every shared component in every variant on one scrollable screen. The profile's `open_state_cmd` opens it.
5. **Fixtures.** One per row of `slices.md`, from its `fixture` column.

Then prove the foundation: rebuild if native code changed, open the component sheet through the harness, capture it, and dispatch `design-qa` with the capture and the design's component references. Its gaps are fixed here, with the same three-round cap, before any screen starts. The **foundation commit** is the head of the run branch when this passes; record its SHA in `state.md`.

A foundation that is still failing after three rounds ends the run `blocked`. Building screens on a wrong button multiplies the error by the number of screens.

## Pilot (step 4)

One screen through everything in §A screen's life, alone.

Pick the screen that uses the most shared components and has at least three states; name it and the reason at the end of intake. Not the simplest screen: the pilot is for finding problems.

What it must settle, each written to the profile's `## Traps` when it bites:

- the harness opens every state of a real screen, not only the placeholder
- captures are stable (`capture.md` §Stable) and the right size
- `design-qa`'s reports are specific enough that a developer fixes from them without guessing
- how long one round takes, recorded in `state.md` so step 5 can say what is coming

A process failure in the pilot gets one repair. A second ends the run `blocked`: the same failure across eight parallel screens is eight times the waste.

## A screen's life

Per screen, in its own track:

1. **Visuals, on fixture data.** The developer builds every state of the screen from the design source and the tokens, wired only to the harness's fixtures. One commit per state.
2. **Rounds** (§Rounds) until every state is `MATCH`, or three rounds are spent.
3. **Behaviour.** For each `behaviour` line of the screen in `slices.md`: a test that fails for the reason the line states, committed alone (history reads `visuals → tests → behaviour`), then the wiring that makes it pass: real data, real navigation, real actions. The Team Lead hashes the test files at the test commit and re-checks the hashes before merging; a changed hash is a fail memo, not a merge. `test_cmd: none` → no tests are written; every behaviour line goes to `Not proven` and into "How to test by hand".
4. **Code review.** One `step-reviewer` over the track's whole diff, from the two SHAs and the screen's rows of `slices.md`. Critical and Important findings go back to a fresh developer for that track, against the behaviour budget.
5. **Re-capture** every state of the screen once more, and one `design-qa` pass. Wiring real data is the commonest way a matched screen stops matching.

Visuals before behaviour, always. A screen failing for two unrelated reasons at once gives a fix loop nothing to converge on.

## The developer packet

`agents/developer.md`'s packet, with these fields filled for this lane:

- `worktree`, `steps` — the screen's states (visual pass) or its behaviour lines (behaviour pass), each with `what / files / criteria / depends on`. `criteria` is the state key for a visual step and the test's name for a behaviour step
- `summary` — the screen's rows of `slices.md`: names, routes, `spec` quotes, `behaviour` lines. Answers and assumptions that touch this screen
- `conventions` — the profile's `standards`, lint and format config, `CLAUDE.md`, "match the surrounding code"
- `test_cmd`, `suite_cmd`, `cost_class` — from the profile
- `design` — per state: the reference image `design/<screen>--<state>.png`, the design source file, `design/tokens.md`, the fixture name
- `frozen` — the profile's `shared_globs`
- `red_tests` — the screen's test files, once they exist
- `memo` — from round 2 on: the screen's latest gap report (`visual-qa.md` §The gap report), verbatim. In a fix round: the owner's reason and reference images first (`hand-off.md` §Fix round)

Nothing else. Not another screen's report, not the Team Lead's reading of the design.

## Rounds

One round, for every screen with work outstanding at once:

1. **Collect.** Wait for the dispatched developers. Write `evidence/tracks.pending` while they are out (`../shared/orchestration.md` §Developers).
2. **Merge**, one track at a time, smallest diff first, into the run branch with `--no-ff`. After each: `check_cmd`. A merge that breaks it is undone (`git reset --hard` to the commit before it; the run branch is local until hand-off), and that screen gets a fail memo naming the failure. The others are unaffected. A conflict means a developer touched a frozen or foreign file: same treatment, and a candidate rule for the learning layer.
3. **Take the device slot** (`capture.md` §The slot). Reload, or rebuild if native code changed.
4. **Capture** every pending state, in `slices.md` order, to `evidence/captures/r<round>/<screen>--<state>.png`.
5. **Release the slot.** Dispatch one `design-qa` per screen, all in parallel, each with the packet in `visual-qa.md`.
6. **Read the reports.** Every state `MATCH` → the screen moves on. Any `GAPS` → the report is the next memo, and a fresh developer is dispatched for that track. `CANNOT JUDGE` is a process failure of the capture, not a round: fix the capture and re-judge.
7. **Merge the run branch into every open track** before re-dispatching, so each developer fixes against what is actually on the branch.

After round 3 a screen with gaps left is `blocked`: its track is kept, its last report goes into the PR, and its states go to the review page marked `Blocked after 3 fix rounds`.

Print the progress block after every round, with the count of screens matched.

## Integration (step 6)

On the head of the run branch, with every track merged or blocked:

1. Rebuild from clean, so the capture is of what the PR contains and nothing cached.
2. Capture **every** state in `slices.md`, to `evidence/captures/final/`.
3. One `design-qa` per screen over the final captures.
4. A state that was `MATCH` and is not now: one fix attempt, against the screen whose merge came last before it broke (bisect the merges with the harness when it is not obvious), then `blocked`.
5. `test_cmd` on the whole suite, compared with `evidence/baseline.txt` by failure name. "No new failures against baseline", with the counts.
6. Remove every `[DEBUG-*]` probe, verified by reading the diff. The state harness and fixtures stay: they are how the next run captures.

## Cost

| Where | Invocations, at most |
|---|---|
| Foundation | 16 — five `developer`, one `step-reviewer`, three rounds of `design-qa` plus a fixing `developer`, and four spare for shared-file changes and the pilot's repair |
| Each screen | 10 — three visual rounds of `developer` and `design-qa`, one behaviour `developer`, one `step-reviewer`, one re-check, one at integration |

A run of `n` screens is capped at `16 + 10n`. Behaviour and review fix attempts come out of the screen's own ten, so a screen that used every visual round has less left; what it cannot finish goes to `Not proven`. The run says what it expects before step 5 starts, from the pilot's timing. On the cap, remaining screens are `deferred` and named, never started and abandoned.
