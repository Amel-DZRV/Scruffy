# Models, caps, and concurrency

Two rules: cheapest model that answers reliably, and every loop has a number.

## Minimum viable model

| Work | Model | Why |
|---|---|---|
| Preflight | none — bash | Nothing to reason about |
| Fetching tickets, comments, attachments | haiku | Transcription |
| Grep, `git log`, PR history, file existence | haiku | Mechanical volume |
| Locating screen → template → component → file | haiku | A lookup, not an insight |
| Classification, repo routing | sonnet | haiku mis-routes repos, and that error is expensive downstream |
| Clustering judgement | sonnet | Deciding one fix closes two bugs needs the causal read |
| The causal chain — ×3 blind on expensive loops, ×1 on cheap | sonnet | The chain is the deliverable; haiku returns symptom restatement. The count is the cost class in `state.md`, never a read on the bug |
| Skeptics ×2 — expensive loops only | sonnet | Two at sonnet costs less than one at opus and catches more, because they disagree. On a cheap loop the red test is the skeptic — skip them |
| Red test, implement, verify, PR body | sonnet | Reading call paths and suite output |
| Plan package assembly, track implementers, integration merges | sonnet | Track derivation is mechanical (no model at all); the merge judgement is not |

Cheap agents **locate and transcribe. They do not summarize** — three paragraphs of mush costs a strong model a second read. Give them a strict output contract: fields, sources, claim-vs-verified.

**Opus only on escalation, never on schedule.** It fires when sonnet returns a chain that is shallow, self-contradictory, or describes the symptom without explaining the cause. Say that you escalated and why.

## Caps

Hitting a cap routes to `blocked` with state preserved. Never a silent retry, never an unbounded one.

| Loop | Cap | On exhaustion |
|---|---|---|
| **Chain attempts** — red test will not go red | **3** | Diagnosis is wrong. Next hypothesis; out of hypotheses → `blocked` |
| **Fix attempts** — red test will not go green | **3** | Diagnosis was right, implementation is not → `blocked`, worktree kept |
| Chain refuted → re-investigate | **1** | `blocked`, both skeptics' reasoning recorded |
| Build failure | **3** | `blocked`, worktree kept |
| Flaky suite re-run | **2** | `blocked` and flagged flaky — **never re-run to green** |
| Deep PR review — test-writing attempts | **2** | fall back to shallow, with a note saying why |
| Whole run, **total** agent invocations | **60** cumulative | Remaining items `deferred`, named individually |

**Chain attempts and fix attempts do not share a budget.** One exhausting the other is how a correct diagnosis gets abandoned, or a wrong one gets implemented three times. Counted separately in `state.md`.

## Concurrency and the build slot

Concurrency and total are different numbers. Concurrency is capped by the session; total is capped at 60 by the row above. A large run exceeds both — hence batching.

**Everything before a build runs unbounded parallel.** Gather, chain, refute, reading code, writing the test. That is most of a run and where the wall-clock win actually is.

**Builds and device work pass through a semaphore of N.** Sized from the machine, not from the repo — two concurrent full builds contend on CPU, RAM and disk regardless of which repos they belong to, and the failures look like bugs.

- **N = 1** on a laptop running full Bazel or Gradle app builds.
- **N > 1** with a remote build cache, or when the builds are `devapp`-scale rather than full app.

Check for a cache before assuming:

```bash
grep -rE "remote_cache|remote_executor|bes_backend|remote_download" .bazelrc* 2>/dev/null
```

Repos with a **cheap** cost class — Jest, package targets, Go — need no slot at all. See `verification`, which discovers the class.

## Budget

Declare a token budget at launch. When what remains will not cover a full run for the next item, that item is `deferred` and named — not started and abandoned halfway.

The expensive steps are verification builds and any opus escalation. Everything before the red test is cheap by design, which is why refutation sits before the first build rather than after it.

**Report before the last build, not after.** An item near the ceiling should say so before committing to a 35-minute run, not discover it afterwards with no verdict to show for the spend.

## Batching

Classify **all** items first, then cluster once, then batch the rest.

Clustering needs every classification present. Two bugs sharing one root cause, split across two batches, produce two conflicting PRs — the exact failure clustering exists to prevent. Classification is cheap enough that all items fit in one pass.
