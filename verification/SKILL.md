---
name: verification
description: The proof engine of Scruffy. Use to prove a fix actually works — invoked by bug-eater and feature-dev, run standalone on a branch or diff, or pointed at someone else's PR to check whether their fix does what it claims. Also on "verify this".
argument-hint: "<branch | PR url | nothing, for the current worktree>"
---

# Scruffy / Verification

The module that replaced Amel watching a build.

Everything else in Scruffy produces a claim. This produces the thing that can say **no**.

## The one rule

**Never claim a thing is verified without output you can point at.**

Not "the fix looks correct." Not "the tests should pass." A command, its output, and what it proves. Every claim below is written so that it can fail — a check that cannot fail is not a check.

## The four claims

In order. Each is independently able to fail.

| # | Claim | Proven by |
|---|---|---|
| 1 | The diagnosis is real | two skeptics, then the red test going red |
| 2 | The test can fail | red test observed failing on the symptom, **before any fix** |
| 3 | The fix works | that test green, full suite green |
| 4 | Nothing else broke | untouched components still passing |

Claim 2 is the load-bearing one. A test written after a fix is the classic way to end up with one that would have passed anyway. **It must be watched failing first, on code without the fix.** Everything downstream rests on that observation.

## What counts as a red test

**Any artifact that fails on the reported symptom before the fix and passes after.** Unit test, integration test, snapshot diff, accessibility-tree assertion, a script. The form does not matter; the falsifiability does.

Three properties, all required:

- **It asserts the reported symptom**, in the reporter's conditions. A fixture the reporter never had proves nothing.
- **It sits at a seam on the real call path.** Not a parallel path that happens to be easier to reach.
- **It was observed red.** Not assumed red, not "would presumably fail."

**The forbidden move is weakening the assertion until it passes.** That is the single easiest thing to cheat in this whole workflow, and it converts the entire system into theatre. If the test will not go red, the diagnosis is wrong — that is information, not an obstacle.

**No seam on the real path** is a real finding, and the exception is *earned*: three genuine attempts, then it gets written into the PR body as a gap. Never a checkbox ticked on attempt one, and never licence to assert something weaker instead.

## Discover the economics first

Before anything else, find out what a test run costs. This governs almost every behavioural choice below, and it is discoverable rather than configured.

- What is the build system — `BUILD.bazel`, `Package.swift`, `build.gradle`, `package.json`, `go.mod`?
- How does CI run the tests? The CI config is the most reliable source for the real command.
- Time one run. Actually time it.

| Loop | Looks like | Behaviour |
|---|---|---|
| **Cheap** — seconds | Jest, package targets, unit tests, Go | Revert check mandatory. Iterate freely. No batching, no build slot. |
| **Expensive** — minutes to tens of minutes | full app build, emulator, integration suites | Revert check skipped. Probes batched — one build, many answers. Build slot semaphore. |

Record which it is in `state.md`. A module that assumes expensive on a Jest repo wastes hours; one that assumes cheap on a Bazel iOS repo produces a silent 35-minute failure, which is the most expensive thing that can happen in a run.

**The build slot, when expensive.** Everything before the build runs unbounded parallel — reading, grepping, chaining, writing the test. Builds and device work pass through a semaphore of N, sized from the machine and not from the repo. Two concurrent full builds contend on CPU, RAM and disk regardless of which repos they belong to, and the failures look like bugs. N is 1 on a laptop unless a remote build cache exists.

## The two failure modes

They demand opposite responses, and conflating them is how a run either gives up too early or loops forever.

| Mode | Looks like | Response |
|---|---|---|
| **Process** | toolchain broken, device gone, suite cannot run, disk full | **No retry loop.** Retrying does not fix a dead toolchain. Report, mark proof incomplete, name the exact failing check. |
| **Solution** | test stays red, suite breaks, the fix does not fix it | **3 repair attempts**, then stop. Summary written: what was tried, why each attempt failed, the options in play. |

### Two budgets, not one

Two loops can run in a single item and they must not share a budget — one exhausting the other is how a correct diagnosis gets abandoned, or a wrong one gets implemented three times.

| Budget | Loop | Exhausted means |
|---|---|---|
| **Chain attempts — 3** | the red test will not go **red** | the diagnosis is wrong. Drop to the next hypothesis; out of hypotheses → `blocked` |
| **Fix attempts — 3** | the red test will not go **green** | the diagnosis was right, the implementation is not working → `blocked` with the summary |

Each is counted separately in `state.md`. A run that burned three chain attempts starts its fix budget at zero.

The summary is written and left to be read. It does not halt the run and wait — one stuck item must not stall the others.

**Never silently discard work.** A failed verification keeps the worktree. Amel may want to dig in.

---

# Mode 1 — Called by a lane

The lane owes you: the symptom in the reporter's words, the suspect area, the conditions, and the surviving chain. You owe it: a red test, and a verdict.

## 1a. Refute the diagnosis

Two independent skeptics on the chain, each told to **prove it wrong**, defaulting to refuted when uncertain.

This is the cheapest place to kill a wrong answer — it runs before any build. Both refute → the lane promotes its next hypothesis. All refuted → `blocked`, with both skeptics' reasoning kept.

Skeptics, not debaters. Do not run a consensus round: models converge on the most confidently argued answer rather than the correct one, and agreement between agents feels like strong evidence while being nearly none. Disagreement is the signal worth having.

## 1b. Write the red test and watch it fail

Against the surviving chain, at a seam, asserting the reporter's symptom.

**Run it. Watch it go red.** Keep the failure output in `evidence/` — it is not a log, it is claim 2's proof, and the revert check below depends on it existing.

**Hash the test file and record the hash in `state.md`:**

```bash
shasum -a 256 <test file> | tee -a evidence/red-test.sha
```

This is the mechanism behind claim 1. Comparing the assertion by eye is an instruction a model gives itself and can rationalize its way out of; a hash mismatch cannot be reasoned away. Record it here, check it after the fix.

Does not go red → the chain is wrong, however well it read. Report back to the lane; it drops to the next hypothesis. **Chain-attempt budget**, three, then `blocked`.

Record the exact command in `state.md`. It becomes the regression test in the PR.

## 1c. After the fix — the four claims

**1. The red test is green.**

Same test. **Re-hash the file and compare against the hash recorded in 1b.**

```bash
shasum -a 256 <test file>          # must match evidence/red-test.sha
```

A mismatch means the test changed during implementation. **Report it; do not absorb it.** A red test edited until it passed proves nothing, and this comparison is the only thing standing between you and that failure. If the test genuinely had to move — relocated into the repo's suite, for instance — re-run it red on the parent commit and record a new hash, rather than waving the mismatch through.

**2. The full suite is green.**

The repo's suite, not the changed file's tests. Paste commands and output — pass counts, not full logs.

**3. Nothing else moved.**

- Snapshot failure on a component the diff touched → intentional, update the baseline.
- Snapshot failure on one it did not touch → **possible regression, `decision needed`, never auto-updated.**
- A suite re-run to green is `blocked` and flagged flaky. **Not a pass.** Re-running until green is laundering, and it is indistinguishable from a real intermittent failure until someone looks.

**Before flagging it and moving on, check for the ordinary cause.** Most flaky tests are guessing at timing — a fixed `sleep`/`setTimeout` racing real async work — rather than something environmental. If the test waits on a wall-clock delay, replace it with a poll on the actual condition (the value existing, the state reached, the file written) and re-run before escalating. A test that goes from flaky to reliably green after this swap was never a regression; one that stays flaky after it is a real finding, not a timing guess, and `blocked` is correct.

**4. Reviewer evidence, where the change is visual.**

"After" capture on the same device and screen as the "before". This cannot fail and is not proof — a before/after pair proves nothing to a skeptic, since the "before" could be any build. It is what gets the PR approved, which is a different and equally real goal. Do not confuse the two.

## 1d. The revert check

Revert the diff, confirm the test goes red again. Catches the case where something *other* than the fix made it pass — a stale build artifact, an unrelated edit in the same commit.

**Cheap loop: mandatory.** Expensive loop: skip it. The 1b failure output already establishes the test failing on code without the fix, provided the file is unchanged — which is exactly what claim 1's hash check proves. That is most of the value at none of the cost.

---

# Mode 2 — Standalone on a branch or diff

No lane, no chain, no ticket. "Verify this."

Same four claims, minus the refutation. What changes:

- **Find the test that covers this change.** If one exists and was added by this diff, treat it as the red test and check it the same way: does it fail on the parent commit? A test added alongside a fix that passes without the fix is the failure this mode exists to catch.
- **If no test covers the change, say so plainly.** Do not manufacture one to make the run look complete. "This diff has no test proving it does anything" is the verdict, and it is a useful one.
- Suite, regression and evidence checks run unchanged.

Writes a dossier — resumption and evidence both need somewhere to live. **No ledger row.** The bug ledger exists to tune stop frequency and PR outcomes, and a standalone run produces neither; rows nobody reads make the ledger worse, not better.

---

# Mode 3 — Reviewing someone else's PR

The mode that justifies this being a separate module. Reading a diff tells you whether it *looks* right. Writing the red test its author did not and running it against their branch tells you whether it **does anything.**

## Depth by blast radius, not by size

Line count is a bad proxy. A 300-line change to a test file is safe; a one-line change to a shared default that fifty components read is not.

| Radius | Looks like | Depth |
|---|---|---|
| **Contained** | one component's internals, tests, docs, isolated behaviour nothing else reads | **Shallow** — read the diff, run their tests, check the suite |
| **Shared** | a default, a protocol, a base class, a config key, a component with many callers | **Deep** — everything above, plus write the missing red test and run it against their branch |

To judge it, look at what reads the thing being changed — grep the callers, not the line count. When it is ambiguous, go deep. A shallow review of a wide change is worth roughly nothing, and the cost of the deep one is a test you can hand them.

## Deep review

1. **Derive the claim.** What does this PR say it fixes? From the description and its linked ticket.
2. **Write the red test for that claim**, at a seam, asserting the symptom.
3. **Run it against the parent commit.** It must fail. If it passes, either the bug was already gone or your test asserts the wrong thing — resolve which before going further.
4. **Run it against their branch.** It must pass.
5. **Check coverage against the reporter's conditions**, all of them. A fix that handles two of three reported cases is the most valuable finding this mode produces, and the one least likely to be caught by reading.

Their fix passing your test is a strong result. Their fix passing on the parent commit too means the test proves nothing about their change — say so.

## Output

A review verdict, not a PR and not a commit. **Never push to someone else's branch.**

- What the PR claims
- Whether an independent test confirms it
- What it does not cover
- The test itself, offered — it is more useful to them than a comment

Log it: date, PR, radius, whether the independent test confirmed the claim. Separate from the bug ledger. Over time it answers a question worth knowing — how often does a fix that reads correctly fail an independent test.

---

## Dossier

`evidence/` holds every command and its output, including — especially — the 1b red failure. Verdicts, attempt counts and the red-test hash go in `state.md`.

What is written for Amel goes in plain words. The verdict block first:

```markdown
**Proven:** the test that failed before and passes now, named.
**Not proven:** what could not be checked, and why.
**Regressions:** none, or the exact ones.
```

A check that could not run is stated, never omitted. A verification quiet about what it could not verify is worse than one that admits it — the whole point of this module is that its output is trustworthy, and silence about gaps is the fastest way to lose that.
