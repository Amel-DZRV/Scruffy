# Orchestration — the Team Lead

How an approved plan becomes work, in either lane. The mechanics here are shared; who wears the hat is per lane.

## Who is the Team Lead

**The main thread, at implementation time.** A subagent cannot start subagents, so a dispatched Team Lead could never fan out. Instead the main thread *composes* the role and acts as it:

- **Feature lane:** compose `../scruffy-feature/roles/team-lead-<platform>/{persona,skills,tools}.md`, `../scruffy-feature/rules/engineering-discipline.md`, `../scruffy-feature/memory/global/team-lead-<platform>.md`, and the project memory, exactly as `../scruffy-feature/mechanisms/pipeline/RUNNER.md` composes any role — then be that role for the rest of this file.
- **Bug lane:** no role file; the main thread is the Team Lead with the dossier and `../scruffy-bug/references/models.md`.

The model is whatever Amel runs the skill under; Opus on escalation, never on schedule.

## Preconditions

- **Bug lane:** step 5 ended red — test file, hash and test-only SHA in `state.md`; Stop 2 answered if it fired; `evidence/goal.active` armed.
- **Feature lane:** Amel's explicit "go"; the criteria lock recorded by the Docs-Keeper; the Chief of Engineering's seam sign-off for cross-platform work; every plan step carrying all four fields. A missing one stops the platform `blocked`, naming it.

## Plan steps

`superpowers:writing-plans` into `plan.md`. Every step carries **`what / files / criteria / depends on`**. `criteria` is the red test's name (bug) or the acceptance criteria the step delivers (feature); it is what the reviewer checks the step against. A step whose files cannot be named yet is not a step. A one-line fix is a one-step plan — the Team Lead always exists; the bench does not.

## Deriving tracks

Every plan step carries `files` and `depends on`. Two steps are joined when either connects them; a track is a connected component of that graph.

Worked example, five steps:

| Step | Files | Depends on |
|---|---|---|
| 1 add data model | `Model.swift` | none |
| 2 render the list | `ListView.swift` | 1 |
| 3 empty state | `ListView.swift` | 2 |
| 4 analytics event on open | `Analytics.swift` | none |
| 5 settings toggle | `SettingsView.swift` | none |

1, 2 and 3 join by dependency and by file; 4 and 5 touch nothing the others touch and depend on nothing → **three tracks**: `[1,2,3]`, `[4]`, `[5]`.

Derivation is mechanical: a union-find over the edges, no model. Note what falls out of it:

- **A `depends on` edge joins tracks**, so tracks are independent by construction. A step that depends on another track's step was never parallel with it, however disjoint their files look.
- **When it is ambiguous whether two steps share a file, they share a track.** A false merge costs a little parallelism; a false split costs a conflict.

One component → no orchestration. Run the serial flow in the platform worktree.

Parallelism is earned by the DAG, never manufactured. Serial only when the work cannot be split without conflicts.

## The runner ladder

1. **Plain parallel `Agent` calls** from the main thread, one per track, each given its track worktree's absolute path (below) and no `isolation` option. Default. The harness's own isolation branches from the main thread's cwd HEAD — not the test-only SHA, and maybe not even the target repo — so the Team Lead creates the worktrees itself.
2. **The `Workflow` tool**, when Amel opts in for a run: one `pipeline()` per track, reviewer alternating inside each; each `agent()` works in its track's pre-created worktree.
3. **Serial**, when neither is available: track after track in dependency order. Identical history, slower.

Builds still pass through the build slot whatever the runner.

## Track worktrees

- **Created by the Team Lead before dispatch**, from the test-only commit:

  ```bash
  git -C <repo_path> worktree add <path> -b <branch> <test-sha>
  ```

  Feature lane: `<path>` is `<repo_path>/.worktrees/<feature-key>-<platform>-track-<n>`, branch `<feature-key>-<platform>-track-<n>`, `<test-sha>` the platform branch's test commit. Bug lane: `<repo_path>/.worktrees/<KEY>-track-<n>`, branch `<KEY>-track-<n>`, `<test-sha>` the test-only SHA in `state.md`. Every track sees the red tests; none sees another track's edits. The absolute path is the developer packet's `worktree`.
- **Removed after successful integration**, always. The merged commits live on the platform branch.
- A **blocked** track's worktree is kept: a failed run is exactly when Amel digs in.

## Developers

Each track's Developer receives, and nothing else from the run's context:

- its track's plan steps, with all four fields
- the spec or chain summary: what, why, acceptance criteria, non-goals
- the seam notes (`seam.md`) where they exist, and the project's conventions
- the test command and cost class

**While developers are out, write `evidence/tracks.pending`** (one line per track in flight) — at the first dispatch and at every fix-attempt re-dispatch — and remove it when the last returned track is integrated or blocked. Bug lane: the goal's Stop hook (`../scruffy-bug/scripts/goal-check.sh`) lets a turn end while it exists, so waiting on background developers does not read as "GOAL NOT MET".

It returns commits on its track branch (one per step) and a per-step report: which criterion tests pass, Reviewer findings and their disposition, `[DEBUG-*]` probes added and removed. A Developer that returns prose without commits has returned nothing.

## Review between steps

Identical whether one track runs or five:

- **One commit per step.**
- **Run the track's acceptance tests after every step.** It tells you which criterion each step actually delivered.
- The mechanical layer (lint, format, pre-commit hooks) runs before the reviewer sees the diff.
- **Review between steps**, fresh context: the two SHAs bounding the step, the plan step with its `criteria`, nothing else. Bug lane: `step-reviewer`. Feature lane: `reviewer-<platform>`, composed from its role files. A developer cannot launch either, so the Team Lead runs the reviewer over each returned track's commits in order before integrating. Critical / Important → a fresh developer for that track, against **that track's** fix budget.

The Team Lead does not add a second review of its own. It integrates.

## Scope while building

In the criteria → build it. In the non-goals → never, however small. Neither → a follow-up ticket, linked; not this PR. Bug lane: "criteria" is the chain's files and cheap guards along its links; anything else is a ticket.

## Integration

Tracks are mutually independent by construction, so merge order is free. Take the smallest track first: the cheapest conflict to unwind, and the fastest first signal that integration works.

After **each** merge, the full acceptance suite on the platform branch. A failure that appears only after a merge is an interaction between tracks: a fix attempt against the merging track's budget, not a mystery.

Conflicts: mechanical → resolve and note it; judgement-shaped → `blocked`. Both are a derivation defect (the DAG said these tracks were disjoint and it was wrong); record the lesson in the Team Lead's project memory.

A seam that has to change mid-build is not settled locally: escalate to the Chief of Engineering. Either kind of conflict is a derivation defect — write it to the learning layer as a candidate rule.

## Fail memo

On any failed claim from the auditor (`proof-auditor` or `qa-<platform>` Audit mode), write `evidence/fail-memo-<track>-<n>.md`:

```
track: <id>          attempt: <n of 3>
claim failed: <number and name>
evidence: <the auditor's row, verbatim>
may not: edit a red test; weaken an assertion; re-run a flaky suite to green
```

The Team Lead decides which it is — fix attempt, chain / design attempt, process failure — and acts per the budgets below. A fix attempt re-enters "Developers" with the memo appended to that track's packet (evidence, not reasoning). The auditor never sees memos; it re-runs from SHAs.

## Budgets

| Loop | Cap | On exhaustion |
|---|---|---|
| Fix attempts, **per track** | 3 | that track → `blocked`; the others finish and integrate |
| Chain attempts (bug lane) | 3 | next hypothesis; none left → `blocked` |
| Design attempts (a test will not go red because the behaviour already exists, or the approach will not fit) | 3 | back to the architect's plan |

The two budgets are not shared. The platform is done only when every criterion's test is green on the integrated branch. A dead track ends the platform `blocked`, the integrated branch holding the finished work, the dead track's worktree kept, and a memo naming which criteria landed and which did not. Verification then runs on the integrated branch exactly as if the work had been serial.

## Builds still queue

Whatever the runner, **builds still pass through the build slot.** Parallel implementation on an expensive loop means parallel editing and queued verification; the semaphore does not widen because the work fanned out. N is 1 on a laptop unless a remote build cache exists.
