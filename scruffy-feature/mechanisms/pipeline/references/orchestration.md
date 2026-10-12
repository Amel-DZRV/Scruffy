# Orchestration

How an approved plan becomes parallel work on **one platform**. Run by that platform's Team Lead. Everything here assumes the plan review ended in "go", the acceptance criteria are locked, and QA has red-committed the acceptance tests on the platform branch.

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

Native first:

1. **The harness's own orchestration tool**, when one exists. In Claude Code, the `Workflow` tool: one `pipeline()` per track with `isolation: 'worktree'` on each `agent()` call, a barrier only at integration, budgets passed in.

   ```js
   const results = await parallel(TRACKS.map(t => () =>
     agent(developerPrompt(t), {isolation: 'worktree', label: `track:${t.id}`})))
   return results
   ```

2. **No workflow tool → parallel subagents**, one per track, worktrees created manually per `worktrees.md`.
3. **No parallel capability at all → serial**, track after track in dependency order, in the platform worktree. Fully valid, not degraded: it produces the identical branch history, just slower.

Whatever the runner, **builds still pass through the build slot.** Parallel implementation on an expensive loop means parallel editing and queued verification; the semaphore does not widen because the work fanned out. N is 1 on a laptop unless a remote build cache exists.

## Track worktrees

- Created at `.worktrees/<feature-key>-<platform>-track-<n>`, branch `<feature-key>-<platform>-track-<n>`, **branched from the platform branch's test commit**. Every track sees the red tests; none sees another track's edits.
- **Removed after successful integration**, always. The merged commits live on the platform branch.
- A **blocked** track's worktree is kept: a failed run is exactly when Amel digs in.

## The Developer contract

Each track's Developer receives, and nothing else from the run's context:

- its track's plan steps, with all four fields
- the spec: what, why, acceptance criteria, non-goals
- the seam notes (`seam.md`) and the project's conventions
- the test command and cost class

It returns commits on its track branch (one per step) and a per-step report: which criterion tests pass, Reviewer findings and their disposition, `[DEBUG-*]` probes added and removed. A Developer that returns prose without commits has returned nothing.

## Per step, per track

Identical whether one track runs or five:

- **One commit per step.**
- **The Reviewer reviews between steps**, in a fresh context. Hand it the two SHAs bounding the step, the plan step and acceptance criteria it was meant to satisfy, and nothing else. Critical and Important findings are fixed before the next step starts (a comment violation is Important). Minor findings carry to the cleanup pass.
- **Run the track's acceptance tests after every step.** It tells you which criterion each step actually delivered.
- The mechanical layer (lint, format, pre-commit hooks) runs before the Reviewer sees the diff.

**Where the Reviewer runs depends on the runner**, because a subagent cannot start subagents:

- **Workflow tool**: the pipeline alternates `agent(implement step)` → `agent(reviewer)` per step, inside each track.
- **Parallel subagents**: a track's Developer cannot launch the Reviewer. It returns its commits; the Team Lead runs the Reviewer over each step's commit range, in order, before integrating. Critical or Important findings go back to a fresh Developer for that track, counted against its fix budget.
- **Serial**: the Team Lead dispatches the Reviewer after each step directly.

Either way the Team Lead does not add a second review of its own. It integrates.

## Integration

Tracks are mutually independent by construction, so merge order is free. Take the smallest track first: the cheapest conflict to unwind, and the fastest first signal that integration works.

After **each** merge, the full acceptance suite on the platform branch. A failure that appears only after a merge is an interaction between tracks: a fix attempt against the merging track's budget, not a mystery.

Conflicts: mechanical → resolve and note it; judgement-shaped → `blocked`. Both are a derivation defect (the DAG said these tracks were disjoint and it was wrong); record the lesson in the Team Lead's project memory.

A seam that has to change mid-build is not settled locally: escalate to the Chief of Engineering.

## Budgets

| Loop | Cap | On exhaustion |
|---|---|---|
| Fix attempts, **per track** | 3 | that track → `blocked`; the others finish and integrate |
| Design attempts (a test will not go red because the behaviour already exists, or the approach will not fit) | 3 | back to the architect's plan |

The two budgets are not shared. The platform is done only when every criterion's test is green on the integrated branch. A dead track ends the platform `blocked`, the integrated branch holding the finished work, the dead track's worktree kept, and a memo naming which criteria landed and which did not. Verification then runs on the integrated branch exactly as if the work had been serial.
