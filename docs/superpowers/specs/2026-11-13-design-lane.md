# Design lane — decisions

Date: 2026-11-13. Status: written, not yet run. The lane itself is `scruffy-design/`; this file records why it is shaped the way it is, so the reasoning does not have to be re-derived from the skill text.

## What it is for

One repeated job on Amel's own apps: a design is made in Claude Design, a product or feature document is written, and then the design is implemented and tested. The lane takes the last part: the handoff plus the document in, a built and checked branch out, with Amel approving every state by eye at the end.

## Why a new lane and not the feature lane

Three agents read the whole repo against this job on 2026-11-13. All three reached the same answer.

- The feature lane **re-decides** what is already decided: two councils and a go gate are mandatory, and nothing lets a run skip them or enter with a finished design.
- It has **no design input**. Developers and QA receive prose; the audit packet names no mock.
- Its visual proof is built for **bug-fix deltas**. `pair-diff.py` compares before and after of the same app; a design reference against a device capture is a different comparison, and a brand-new screen has no "before". `ui-touch.sh` also does not recognise `.tsx`, so a React Native screen reads as `NON-UI`.
- Its track derivation **serialises** any plan where every step depends on shared theme files, which is every design.
- It is sized for **one small feature per PR**, with one audit at the end, not a per-screen loop.

What is shared is reused by reference: `shared/orchestration.md`, the `developer` and `step-reviewer` agents, `shared/pr.md`, the verdict tiers, the dossier, worktrees.

## Decisions Amel made

| # | Decision | Consequence in the lane |
|---|---|---|
| 1 | Main target is a Mac with the iOS simulator; Windows with an Android emulator is tested afterwards | The iOS starter profile is first; Android is a variant; the scripts need Git Bash and `python3` on Windows |
| 2 | The stack is chosen per project | The lane names no stack. A per-project **profile** holds the commands, proposed from the repo, confirmed once, proven by running it |
| 3 | The product document lives in the repo and is the source of truth | The profile stores its path; preflight fails early without it; intake checks the design against it in both directions |
| 4 | The run is unattended after the intake answers | Two asks (missing inputs, intake questions), one decision (the review page). In between: conservative reading plus a logged assumption, never a question |
| 5 | Phase order: intake, foundation, one pilot screen, parallel screens, integration | The seven steps |
| 6 | Visuals on fixture data first, then behaviour | `build.md` §A screen's life. Two unrelated failure kinds in one fix loop do not converge |
| 7 | The final gate is manual, **per state**, on an HTML page: design left, build right, Approve and Decline, a tally on the far right, Generate report | `assets/review.html`, built per round |
| 8 | Declined states need a reason, with optional reference images, before the report is generated | Enforced by the page |
| 9 | The report is downloaded and passed to the agent by hand | `/scruffy design fix <report.zip>`; `scripts/read-report.py` validates it |
| 10 | The simulator capture is the gate; the rendered design is the reference; the design's source supplies exact values | `capture.md`, `visual-qa.md`. No pixel diff between the two |

## Decisions made while writing, for Amel to overrule

- **Developers never capture.** One device cannot serve eight developers. The Team Lead merges a round's work, captures every pending state in one pass through a single slot, and fans out QA.
- **Shared files are frozen** after the foundation. A screen that needs a shared component changed reports it; one developer changes it on the run branch.
- **The PR is always a draft** until a report approves every state, and the lane never merges. Its verdict is `REVIEW NEEDED` at best.
- **Three visual rounds per screen**, then `blocked`; the other screens carry on.
- **Undrawn states** (empty, loading, error that the document implies and the design does not draw) are built to follow the nearest drawn state and shown on the review page with no design beside them.
- **A state approved and later changed** by a shared-component fix has its approval withdrawn and returns to the next review page.
- **A state declined after QA said `MATCH`** becomes a candidate rubric rule, written only when Amel approves it. The count of those is in every final report.
- **Behaviour tests are written inside the screen's track**, red first, by the same developer, with the test files hashed by the Team Lead. Lighter than the feature lane's separate test author; the review page and "How to test by hand" are the backstop.
- **No tests are written when the profile says `test_cmd: none`.** Behaviour then goes to `Not proven`.
- **The state harness stays in the codebase**, development-only, because the next run needs it.

## Open

- **The handoff format.** `references/intake.md` is provisional until the first real Claude Design handoff is read.
- **The starter profiles** have not been run. Preflight proves or rejects them on the first run.
- **Android capture** rests on `scruffy-bug/references/platforms/android.md`, which is itself marked untested.
- **Rendering states that only appear after interaction** in a prototype. For now: the handoff's exported image, else a question at intake.
- **Content below the fold.** Only scroll positions listed as rows are judged.
- **The review page inside a PR.** It is a local file; nothing is attached to the PR.
