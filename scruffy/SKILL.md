---
name: scruffy
description: Use when handed a Jira key or URL, a GitHub issue or PR URL, a TickTick task, a support request, a Slack thread, or plain text describing something broken or wanted — one item or many. Also on "use scruffy" or "scruffy, take this".
argument-hint: "<jira key | url | github url | ticktick task | pasted text> ... (one or many)"
---

# Scruffy

**Input:** $ARGUMENTS — one or many items, mixed sources. If empty, take them from the conversation above.

Amel is a cross-platform triage owner on SDUI renderers — Mosaic (DoorDash) and Codeless Components / RooBlocks (Deliveroo) — across repos he does not own. He approves and comments; he does not type code.

**He stops you at most three times. Everything else you prove.**

## What replaced the gates

Old shape: ask him to look at a simulator and say whether the bug is real, then ask again whether it is fixed. That is two ~35-minute builds he has to be present for, and it is why previous runs never finished.

New shape: **a test that fails on exactly what the reporter complained about, then passes.** Plus pasted suite output, snapshot diffs, and before/after captures for anything visual, taken by an agent from a recorded path rather than by him. He reads the PR instead of watching the work.

Never claim a thing is verified without output you can point at.

## This file routes; the modules work

| Module | Owns |
|---|---|
| `bug-eater` | Something is broken. Gather → chain → propose → fix → PR. |
| `verification` | Proof. Red tests, the four claims, reviewing someone else's PR. Called by the lanes, or standalone. |
| `feature-dev` | Something is wanted, or wants removing. Requirements → design → acceptance tests → PR. Cleanup runs here too. |

This file owns what no module can: classification, repo routing, the dossier, the run-wide budget, clustering, and the final report.

## The three stops

A **stop** is a hard halt: ask, wait, act on the answer. Each is batched across every item in the run — never one interrupt per item.

| Stop | Owner | When | You are asking |
|---|---|---|---|
| 1 | this file | after classify | Bug, feature, or review? — **only if genuinely unclear** |
| 2 | the lane | after gather | Everything nobody can look up — **only if something is missing** |
| 3 | the lane | before implementing | Which of two equally correct fixes — **only if the choice is his**. On a feature that earned a plan, this is the plan package, iterated until he says "go" — the one stop that is a conversation |

None of these fire on a well-specified bug. If you are firing all three routinely, the skill is wrong, not him.

## Terminal states

Every item reaches exactly one. **A PR is not the only exit.**

| State | Meaning | Artifact |
|---|---|---|
| `PR opened` | Fixed, verified, draft PR up | branch + draft PR |
| `recommend close` | Already fixed, or not reproducible on current code | `verdict.md`, naming the merged PRs |
| `decision needed` | Real, but the call is product / consistency / ownership — including a colleague's PR already in flight | `memo.md` — what changed, the trade-off, who decides |
| `needs info` | Too thin to act on; only the reporter can answer | `questions.md`, ready to paste as a ticket comment |
| `blocked` | Could not verify — toolchain, access, or a refuted chain | `blocked.md` with the exact failure |
| `deferred` | Budget ran out before this item started | named in the final table, never started-and-abandoned |

Forcing a PR onto a policy question or an already-fixed ticket is worse than saying so.

---

## Step 1 — Read what was learned

`references/learning.md`, then `LEARNED.md` if it exists. Past corrections apply before you do anything else.

Preflight's ledger backfill (step 4) also pulls **new PR comments since the last run.** Generalize each into a candidate rule and show them to Amel before dispatching: *"three comments since the last run — here is what I would write down."* He approves, edits, or discards.

This is the only trigger the correction loop has. A run ends when the PR opens, before he has reviewed it, so nothing else picks his comments up.

## Step 2 — Intake and classify

Per item: Jira via the Atlassian MCP; GitHub via `gh issue view` / `gh pr view --comments --files`; TickTick per `references/ticktick.md`; anything else as-is.

**Read whole field blocks. Never grep a dump for the value you expect** — you cannot see what you did not think to search for. When a Jira dump is too large to read whole, parse it and print the fields you need in full: `labels`, `attachment`, `issuelinks`, `parent`, `components`, `comment.comments`.

Classify each into a lane and state it in one line with your reason:

- **bug** — something is broken → `bug-eater`
- **feature** — something is wanted, or is debt to remove → `feature-dev`
- **review** — someone else's PR → `verification`, mode 3

When the prompt already says which — "fix this bug, here's the ticket" — take it and do not re-litigate.

**STOP 1** only when an item is genuinely ambiguous: a bug report that is really a feature request, a PR that is really a question. Certain classification proceeds without asking.

## Step 3 — Route to a repo

The one fact that is not discoverable. A Jira key does not say which codebase it lives in. `references/repo-routing.md`.

Everything else about a repo — build system, test command, PR template, lint rules, cost class — the lane discovers at gather time. Do not maintain those here; they go stale and the repo is the source of truth.

## Step 4 — Preflight

**Before anything is spent.** Fan out — every check is cheap, independent, read-only. `references/preflight.md`.

Never start a long build to discover the toolchain is broken. A silent 35-minute failure is the single most expensive thing that can happen in a run.

Any failure blocking an item's evidence routes that item to `blocked` now, with the failing check named. Report the pass/fail table before continuing.

## Step 5 — Create dossiers

`references/dossier.md`. One per item. Write `state.md` before dispatching anything.

## Step 6 — Cluster

**Only when more than one item is in play.** Group any that one fix would close — a shared root cause surfacing as two symptoms, or one crash signature reported twice. One work item, one chain, one PR.

Do this once, with every item's classification and repo in hand. Two bugs sharing a cause and split across separate batches produce two conflicting PRs, which is the whole reason clustering happens here and not inside a lane.

## Step 7 — Dispatch

One lane invocation per work item. Route every helper by model — `references/models.md`. Wrong model is the main way this gets expensive.

**Lanes run in the main thread, as skills — never dispatched as subagents.** A lane fans out its own helpers (investigators, skeptics, `step-reviewer`, `proof-auditor`) and holds stops 2 and 3; a subagent can do neither. Parallelism across items comes from the helpers each lane fans out, not from wrapping lanes in agents.

The lane owns its own steps. This file does not reach inside one; it holds the budget, watches for cap exhaustion, and collects terminal states.

**Budget.** Declare it at launch. When what remains will not cover a full run for the next item, that item is `deferred` and named — not started and abandoned halfway. Verification reports what each item cost; use that, do not guess.

**Concurrency.** Everything before a build runs unbounded parallel. Builds and device work pass through the build slot — `references/models.md`.

## Step 8 — Report, ledger, then learn

**Print `summary.md` in full**, per item. It is the last thing Amel reads, so it goes before the table, not after it.

Then append one row per item to `~/Projects/tickets/LEDGER.md`. **Leave the PR-outcome column blank** — a workflow grading its own output is exactly the bias this design exists to remove. The next run's preflight backfills it.

Finish with one table: every input, one row, terminal state, **proof verdict** (`MERGE-READY` / `REVIEW NEEDED` / `PROOF INCOMPLETE`), evidence, PR link. The verdict column is the triage: MERGE-READY rows are the PRs Amel can approve on the proof block alone. Anything deferred or capped is named individually. Silent truncation reads as "covered everything" when it did not.

Then `references/learning.md`: every comment he leaves on a PR is a defect in this skill, not just in that fix. Write it down. Correcting a run fixes one run; writing it down fixes all of them.
