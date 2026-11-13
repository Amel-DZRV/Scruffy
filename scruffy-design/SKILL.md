---
name: scruffy-design
description: Scruffy's design lane. Entered only via /scruffy design <handoff>. Implements a finished Claude Design handoff into an existing or a new app, behaviour included. Preflight, intake against the product document, a foundation wave, a pilot screen, parallel screen developers, a visual QA loop that compares device captures with the rendered design, then a draft PR and a review page where Amel approves or declines every state.
disable-model-invocation: true
---

# Scruffy — design lane

**Input:** from the dispatcher, one of:

- `<handoff> [--spec <path>] [--project <path>]` — a new run, or a resume when its dossier already exists
- `fix <report.zip> [--project <path>]` — a fix round from a downloaded review report (`references/hand-off.md` §Fix round)

This lane is read from `/scruffy design …`, never invoked, so it takes no arguments of its own.

The design is finished and the product document is written. This lane decides nothing about what to build or how it looks: it builds what those two say, checks every state against the design, and hands Amel every state to approve or decline. He is **asked** at two points, preflight and the intake questions, and he **decides** at one, the review page. Everything between runs without him.

Every step announces itself in chat as plain text before and after its tool calls, and prints the progress block at every step change.

| Piece | Where |
|---|---|
| What must exist before a run, and the project profile | `references/preflight.md` |
| Handoff inventory, design-versus-document coverage, the question batch | `references/intake.md` |
| Waves, slices, the developer packet, the round loop, budgets | `references/build.md` |
| Rendering the design, capturing the build, the device slot | `references/capture.md` |
| The QA packet, the rubric, the gap report | `references/visual-qa.md`, agent `design-qa` |
| PR body, the review page, the report, fix rounds | `references/hand-off.md` |
| Review page template and its builder | `assets/review.html`, `scripts/build-review.py`, `scripts/read-report.py` |
| Team Lead mechanics shared with the other lanes | `../shared/orchestration.md` |

## Before anything runs

1. **Read what was learned.** `../shared/learning.md`, then `../memory/rules.md`.
2. **Find the project.** `--project <path>`, else the repo the session's cwd is in. No repo at all is a new app: preflight asks where to create it. Set `owned` by the dispatcher's rule (`../scruffy/SKILL.md` Setup 4).
3. **Dossier.** `~/Projects/tickets/<KEY>/`, where `<KEY>` is `design-<repo>-<feature-slug>` (`../scruffy-bug/references/dossier.md`). If `state.md` exists, read it first, say where the run stopped, and continue from that step. Never redo a finished step and never re-ask an answered question.
4. **Check what the harness can do**: parallel subagents, worktrees, GitHub tools, a headless browser for rendering the design. A missing capability is named up front and the run continues with the gap stated, never silently.

`state.md` carries at least:

```
key: <KEY>
lane: design
repo: <repo>
repo_path: <absolute path>
owned: yes | no
handoff: <path or URL>
spec: <path(s)>
profile: <path>
round: 1
step: <1-7>
```

## Progress

Seven steps, always the same seven. Print this block when a step starts and when it ends, with the counts the step owns, and mirror it in `state.md` under `## Progress`. When the harness has a task list, keep the same seven items there.

```
Design run: <app> / <feature>            round 1
[done] 1 Preflight      6/6 inputs
[done] 2 Intake         9 screens, 31 states, 4 questions answered
[now ] 3 Foundation     components 5/8
[    ] 4 Pilot screen
[    ] 5 Screens        0/8 matched
[    ] 6 Integration
[    ] 7 Hand-off       PR + review page
```

A fix round prints its own four: `1 Read report`, `2 Fix declined states`, `3 Integration`, `4 Hand-off`.

The block reports what is true. A screen that is `blocked` is counted as blocked, not as matched, and a step that ended with gaps says so on its line.

## The steps

| # | Step | Who | Output |
|---|---|---|---|
| 1 | **Preflight** | main thread | every input present or asked for; the project profile proposed, confirmed and proven by running it |
| 2 | **Intake** | main thread | `slices.md`, `design/tokens.md`, `coverage.md`, the rendered design references, one batch of questions |
| 3 | **Foundation** | main thread as Team Lead, `developer`, `step-reviewer`, `design-qa` | tokens and theme, shared components, navigation, the state harness, serially, on the run branch |
| 4 | **Pilot screen** | same | one screen through the full loop, all its states, visuals then behaviour |
| 5 | **Screens** | same, in parallel | every remaining screen, one developer per screen, rounds of merge → capture → QA → fix |
| 6 | **Integration** | main thread, `design-qa` | every state re-captured from the finished branch and judged once more; the suite against baseline |
| 7 | **Hand-off** | main thread | draft PR, `review/round-<n>.html`, the final report |

### 1 — Preflight

`references/preflight.md`. Check each input; ask once, in one message, for whatever is missing. A profile that does not exist is proposed from the repo and confirmed; a new app is scaffolded here first. Then prove it: install, build, launch, open one screen, take one screenshot. A command that fails here ends the run `blocked` naming it. Nothing is built on an unproven profile.

### 2 — Intake

`references/intake.md`. Inventory every screen and state in the handoff, map each to a route and to the lines of the product document it implements, extract the tokens, and render every design reference at the device's size. Compare the design with the document in both directions. Everything unclear goes into **one** numbered batch, a recommended answer beside each. This is the last time Amel is asked anything before the review page.

No open questions → no stop; say so in one line and continue.

### 3 — Foundation

`references/build.md` §Foundation. Serial, because every screen depends on it. The state harness built here is what lets every later capture happen without a human navigating.

### 4 — Pilot screen

`references/build.md` §Pilot. One screen, chosen for covering the most shared components, through visuals, QA, behaviour and re-capture. It exists to find what is wrong with the profile, the harness and the rubric while one developer is waiting on it, not eight. A process failure here is fixed before step 5; a second one ends the run `blocked`.

### 5 — Screens

`references/build.md` §Rounds. One `developer` per remaining screen, in its own worktree, all dispatched together. Developers never capture. Each round the Team Lead merges what came back, builds once, captures every pending state through the device slot, and dispatches one `design-qa` per screen in parallel. Gap reports go back as memos. Three visual rounds per screen, then that screen is `blocked` and the others carry on.

### 6 — Integration

Capture every state again from the head of the run branch, including the ones that matched in an earlier round, and judge each once. A state that matched before and does not now was broken by a later merge: one fix attempt against the screen that merged last, then `blocked`. Run the suite and compare with the baseline by failure name.

### 7 — Hand-off

`references/hand-off.md`. Open the PR as a draft, build the review page, print the final report. The run ends here, at `review pending`.

## Touchpoints

| Touchpoint | When | He sees |
|---|---|---|
| **Missing inputs** | step 1, one message | what is missing and what each is for |
| **Intake questions** | step 2, one batch | numbered questions, a recommended answer beside each |
| **The review page** | after step 7 | every state, design beside build, Approve or Decline |

Nothing else stops for him.

## Running unattended

After the intake answers, no step asks. In place of a question:

- **Ambiguity** → take the conservative reading (the one that changes least and matches the nearest drawn state), write it to `assumptions.md` with the state it affects, carry on. Every assumption is listed in the PR and the final report.
- **A screen out of budget** → `blocked`, with its last gap report. The others finish.
- **A process failure** (device gone, build broken, renderer missing) → no retry loop. The step ends, the failing command is named, and whatever is finished is still handed off.
- **A decision that cannot be undone and could go either way** (deleting a screen the design no longer shows, a data migration) → not taken. The preparatory work is done, the decision is written to `memo.md`, and it is the first item of the final report.

## Budgets

| Loop | Cap | On exhaustion |
|---|---|---|
| Visual rounds, per screen | 3 | that screen `blocked`; its states go to the review page marked blocked |
| Behaviour and review fix attempts, per screen | 3 | behaviour lines left failing are listed under `Not proven` |
| Pilot process failures | 1 repair | the run ends `blocked` |
| Agent invocations, per run | 16 + 10 per screen | remaining screens `deferred`, named (`../scruffy-bug/references/models.md` §Caps) |

The budgets are not shared between screens. The invocation cap is the outer one: a screen that spent all three visual rounds has less left for behaviour fixes.

## Terminal states

| State | Reached at | Artifact |
|---|---|---|
| `review pending` | step 7 | draft PR and `review/round-<n>.html` |
| `approved` | a fix round whose report declines nothing and leaves nothing undecided | PR marked ready (`owned: yes`) |
| `needs info` | steps 1 and 2 | `questions.md`, ready to answer |
| `decision needed` | any step | `memo.md` |
| `blocked` | any step | `blocked.md` with the exact failure; finished work kept |

## What this lane never does

- Decide what to build. A gap between design and document is a question at intake or a logged assumption after it.
- Let a developer grade its own screen. `design-qa` sees the two images and the design source, never the developer's reasoning.
- Call a state matched without a capture taken through the harness on the named build.
- Merge. The PR stays a draft until a review report approves every state, and nothing is merged by this lane even then.
- Pixel-diff the design against the build. A browser and a device render text differently; the comparison is a judged rubric (`references/visual-qa.md`).

## Status

Written, not yet run. The handoff parsing in `references/intake.md` is provisional until the first real handoff, and the starter profiles in `references/preflight.md` are proposals that step 1 proves or rejects.
