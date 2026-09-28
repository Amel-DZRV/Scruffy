# Orchestration

How an approved plan becomes parallel work. Called from step 6; everything here assumes the plan review loop already ended in "go" and the acceptance tests are red-committed on the item branch.

## Deriving tracks

Every plan step carries `files` and `depends on`. Two steps are joined when either connects them; a track is a connected component of that graph.

Worked example, five steps:

| Step | Files | Depends on |
|---|---|---|
| 1 add data model | `Model.swift` | — |
| 2 render the list | `ListView.swift` | 1 |
| 3 empty state | `ListView.swift` | 2 |
| 4 analytics event on open | `Analytics.swift` | — |
| 5 settings toggle | `SettingsView.swift` | — |

1–2–3 join by dependency and by file; 4 and 5 touch nothing the others touch and depend on nothing → **three tracks**: `[1,2,3]`, `[4]`, `[5]`.

Derivation is mechanical — a union-find over the edges, no model. Note what falls out of it: **a `depends on` edge joins tracks**, so tracks are independent by construction — a step that depends on another track's step was never parallel with it, however disjoint their files look. **And when it is ambiguous whether two steps share a file, they share a track.** A false merge costs a little parallelism; a false split costs a conflict.

One component → no orchestration. Run step 6's serial flow in the item worktree and read no further.

## The runner ladder

Native first, same principle as the worktree spine:

1. **The harness's own orchestration tool**, when one exists — in Claude Code, the `Workflow` tool: one `pipeline()` per track with `isolation: 'worktree'` on each `agent()` call, a barrier only at integration, budgets passed in. Sketch:

   ```js
   // one agent per track, each in its own worktree, no barrier between tracks
   const results = await parallel(TRACKS.map(t => () =>
     agent(implementerPrompt(t), {isolation: 'worktree', label: `track:${t.id}`})))
   // integration is inherently serial — done by the orchestrator, in dependency order
   return results
   ```

2. **No workflow tool → parallel subagents** (`superpowers:dispatching-parallel-agents`), one per track, worktrees created manually per `../../scruffy/references/worktrees.md`.
3. **No parallel capability at all → serial** `superpowers:subagent-driven-development`, track after track in dependency order, in the item worktree. This path is fully valid, not degraded — it produces the identical branch history, just slower.

Whatever the runner, **builds still pass through the build slot.** Parallel implementation on an expensive loop means parallel editing and *queued* verification — the semaphore in `models.md` does not widen because the work fanned out.

## Track worktrees

- Created at `.worktrees/<item-key>-track-<n>`, branch `<item-key>-track-<n>`, **branched from the item branch's test commit** — every track sees the red tests, none sees another track's edits.
- **Removed after successful integration**, always — the merged commits live on the item branch; the checkout that produced them outlives its use.
- A **blocked** track's worktree is kept, same rule as everywhere in the spine: a failed run is exactly when Amel digs in.
- The item worktree itself keeps the normal terminal-state lifecycle from the spine; nothing here changes it.

## The implementer contract

Each track agent receives — and nothing else from the run's context:

- its track's plan steps, with all four fields
- the spec: what, why, acceptance criteria, non-goals
- `seam.md`, and the conventions record from `state.md`
- the test command and cost class

It must return: commits on its track branch (one per step), and a per-step report — which criterion tests pass, reviewer findings and their disposition, `[DEBUG-*]` probes added and removed. An implementer that returns prose without commits has returned nothing.

**Where the per-step reviewer runs depends on the runner**, because a subagent cannot start subagents:

- **Workflow tool** — the orchestrator's pipeline alternates `agent(implement step)` → `agent(step-reviewer)` per step, inside each track. Review stays per step.
- **Parallel subagents** — a track agent cannot launch `step-reviewer` itself. It returns its commits; the orchestrator runs `step-reviewer` over each step's commit range, in order, before integrating. Critical or Important findings go back to a fresh implementer for that track, counted against its fix budget.
- **Serial** — the orchestrator is the main thread and dispatches `step-reviewer` after each step directly.

Either way the orchestrator does not add a second review of its own — it integrates.

## Integration

Tracks are mutually independent by construction — a dependency edge would have joined them — so merge order is free. Take the smallest track first: the cheapest conflict to unwind, and the fastest first signal that integration itself works.

After **each** merge: the full acceptance suite on the item branch. A failure that appears only after a merge is an interaction between tracks — treat it as a fix attempt against the merging track's budget, not a mystery.

Conflicts: mechanical → resolve (`mattpocock-skills:resolving-merge-conflicts`) and note it; judgement-shaped → `blocked`. Both cases are a derivation defect and go to `LEARNED.md` — the DAG said these tracks were disjoint and it was wrong.

## Budgets

| Loop | Cap | On exhaustion |
|---|---|---|
| Fix attempts, **per track** | 3 | that track → `blocked`; the others finish and integrate |
| Everything | counts against the run's 60-invocation cap | remaining items `deferred`, per `models.md` |

The feature is done only when every criterion's test is green on the integrated branch. A dead track ends the item `blocked` — integrated branch keeping the finished work, dead track's worktree kept, the memo naming which criteria landed and which did not. Step 7 then runs on the integrated branch exactly as if the work had been serial.
