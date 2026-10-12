---
name: verification
description: The proof engine of Scruffy. Use to prove a fix actually works — invoked by scruffy, run standalone on a branch or diff, or pointed at someone else's PR to check whether their fix does what it claims. Also on "verify this".
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
| 1 | The diagnosis is real | skeptics on expensive loops, then the red test going red |
| 2 | The test can fail | red test observed failing on the symptom, **before any fix** |
| 3 | The fix works | that test green, no new suite failures against baseline |
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

Before anything else, find out what a test run costs. This governs almost every behavioural choice below, and it is discoverable rather than configured. Scruffy may already have done it at gather — `state.md` carries the class, the command, and the baseline; when it does, use them rather than re-deriving.

- What is the build system — `BUILD.bazel`, `Package.swift`, `build.gradle`, `package.json`, `go.mod`?
- How does CI run the tests? The CI config is the most reliable source for the real command.
- Time one run. Actually time it.

| Loop | Looks like | Behaviour |
|---|---|---|
| **Cheap** — seconds | Jest, package targets, unit tests, Go | Revert check mandatory. Iterate freely. No batching, no build slot. |
| **Expensive** — minutes to tens of minutes | full app build, emulator, integration suites | Revert check skipped. Probes batched — one build, many answers. Build slot semaphore. |

Record which it is in `state.md`. A module that assumes expensive on a Jest repo wastes hours; one that assumes cheap on a Bazel iOS repo produces a silent 35-minute failure, which is the most expensive thing that can happen in a run.

**The timing run is also the baseline run.** It happens on the parent commit, before any change — so keep its result: pass count and the names of any failures, in `evidence/baseline.txt`, counts in `state.md`. "The suite is green" is not a claim until the suite's starting state is known; a repo whose main is already red makes claim 4 unfalsifiable without this. Every later suite claim reads **no new failures against baseline**, not "green". When the loop is too expensive to afford a full baseline run, say so in the proof block rather than implying a clean start.

**The build slot, when expensive.** Everything before the build runs unbounded parallel — reading, grepping, chaining, writing the test. Builds and device work pass through a semaphore of N, sized from the machine and not from the repo. Two concurrent full builds contend on CPU, RAM and disk regardless of which repos they belong to, and the failures look like bugs. N is 1 on a laptop unless a remote build cache exists.

## Nothing here asks for anything

The dispatcher's interview (`../scruffy/references/interview.md`) is the only point in a run that asks a human for input. Verification never pauses for a device, a screenshot, a path or a missing field. What cannot be produced is a named gap: the row reads `MISSING: <status>`, the `Not proven` line repeats it, and the verdict table decides the tier.

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

## Who runs what

The model that wrote a fix does not grade it. Everything that *produces* evidence runs in the caller's context; everything that *judges* it runs in the `proof-auditor` agent, which gets SHAs, commands and hashes — never the chain, the plan, or the implementer's reasoning.

| Step | Runs in | Why |
|---|---|---|
| Economics, baseline | caller, inline | needed before diagnosis starts |
| 1a skeptics | **dispatched by the main thread** | a subagent cannot start subagents, so the skeptics are never launched from inside another agent |
| 1b red test | caller, inline | it loops with the chain-attempt budget |
| 1c, 1d, the verdict, the proof block | **`proof-auditor` agent** | the one step that must not be self-graded |
| Reviewer evidence (captures) | **`evidence-capturer` agent** for the before, dispatched at Scruffy's step 3; the after is taken **inline** by Scruffy (its step 8) so output reaches the transcript, then checked by the auditor at 1c | gated on the tree and the installed binary; identical packets except the SHA, so the pair differs only by the diff |
| Pair diff, UI-touch decision | `proof-auditor` | the auditor runs `pair-diff.py` and `ui-touch.sh` itself; a pass reported by the caller is not a pass |

**Dispatching the auditor.** Hand it the packet its file lists — mode, repo and dossier paths, `parent` / `test_commit` / `head` SHAs, test file(s) with their recorded hash, test and suite commands, cost class, `evidence/baseline.txt`, and the symptom in the reporter's words, the two capture reports and images when a pair was taken, and the `ui-touch.sh` output for `parent..head`. **Nothing else.** Pasting `chain.md` or the plan into the packet re-creates the bias the split exists to remove. On an expensive loop, dispatch it only while holding the build slot.

It returns a proof block, a verdict tier, and one line per failed claim. It counts no budgets and fixes nothing — whether a failure is a fix attempt, a chain attempt, or a process failure is the caller's call, from the auditor's output.

**When the agent is not installed**, run 1c and 1d inline and put `audited in-context, not independent` on the `Not proven` line. That demotes the verdict to REVIEW NEEDED at best. A self-graded MERGE-READY is the thing this module exists to prevent.

---

# Mode 1 — Called by Scruffy

Scruffy owes you: the symptom in the reporter's words, the suspect area, the conditions, and its top-ranked chain — whether that chain survives is decided here. You owe it: a red test, a verdict, and the proof block for its PR body.

## 1a. Refute the diagnosis — expensive loops only

**Cheap loop: skip this step, go straight to 1b.** This step exists to kill a wrong answer before paying for a build; on a cheap loop there is no build to protect, and the red test refutes at the same cost while being stricter — a skeptic argues, a test fails.

Expensive loop: two independent skeptics on the chain, each told to **prove it wrong**, defaulting to refuted when uncertain. Both refute → Scruffy promotes its next hypothesis. All refuted → `blocked`, with both skeptics' reasoning kept.

Either way, **this is the only skeptic pass in the pipeline.** Scruffy does not run its own — the same chain refuted twice by four agents buys nothing the first two did not.

Skeptics, not debaters. Do not run a consensus round: models converge on the most confidently argued answer rather than the correct one, and agreement between agents feels like strong evidence while being nearly none. Disagreement is the signal worth having.

## 1b. Write the red test and watch it fail

Against the surviving chain, at a seam, asserting the reporter's symptom.

**When the expected behaviour was inferred rather than stated** — Scruffy's usual case — the inference is the assertion, **verbatim, not a paraphrase of it.** The PR body's assumption line then names this test, so the riskiest guess in the run gets challenged in the one line of code the reviewer was going to read anyway, instead of in a body sentence nobody connects to the diff.

**Run it. Watch it go red.** Keep the failure output in `evidence/` — it is not a log, it is claim 2's proof, and the revert check below depends on it existing.

**Then commit the test on its own, before any fix exists.** The branch history becomes `parent → test-only commit → fix commit(s)`, and that ordering is the reviewer-facing proof: git shows the test predates the fix and shows every byte that changed in it since, and neither can be reasoned away after the fact. A red test squashed into the fix commit is self-attested; a red test with its own commit is on the record. Record the test-commit SHA in `state.md` — the proof block needs it.

**Hash the test file and record the hash in `state.md`:**

```bash
shasum -a 256 <test file> | tee -a evidence/red-test.sha
```

This is the in-run guard behind claim 1 — the commit is for the reviewer, the hash is for you, mid-run, before anything is committed. Comparing the assertion by eye is an instruction a model gives itself and can rationalize its way out of; a hash mismatch cannot be reasoned away. Record it here, check it after the fix.

Does not go red → the chain is wrong, however well it read. Report back to Scruffy; it drops to the next hypothesis. **Chain-attempt budget**, three, then `blocked`.

Record the exact command in `state.md`. It becomes the regression test in the PR.

## 1c. After the fix — the four claims

Run by `proof-auditor`. What follows is what it checks; the caller's job is the packet and acting on the result.

**1. The red test is green.**

Same test. **Re-hash the file and compare against the hash recorded in 1b.**

```bash
shasum -a 256 <test file>          # must match evidence/red-test.sha
```

A mismatch means the test changed during implementation. **Report it; do not absorb it.** A red test edited until it passed proves nothing, and this comparison is the only thing standing between you and that failure. If the test genuinely had to move — relocated into the repo's suite, for instance — re-run it red on the parent commit, record a new hash, and give it a **new test-only commit**, rather than waving the mismatch through. `git log --follow -p` over the test file must tell the same story the proof block does.

**2. No new suite failures against baseline.**

The repo's suite, not the changed file's tests, compared against `evidence/baseline.txt` from the economics step. Paste commands and the delta — pass counts, not full logs. "Same two pre-existing failures as parent" is a pass; a clean-sounding "suite green" with no baseline behind it is not a claim.

**3. Nothing else moved.**

- Snapshot failure on a component the diff touched → intentional, update the baseline.
- Snapshot failure on one it did not touch → **possible regression, `decision needed`, never auto-updated.**
- A suite re-run to green is `blocked` and flagged flaky. **Not a pass.** Re-running until green is laundering, and it is indistinguishable from a real intermittent failure until someone looks.

**Before flagging it and moving on, check for the ordinary cause.** Most flaky tests are guessing at timing — a fixed `sleep`/`setTimeout` racing real async work — rather than something environmental. The auditor reports whether the test waits on a wall-clock delay; if it does, the caller replaces it with a poll on the actual condition (the value existing, the state reached, the file written) and re-dispatches the auditor before escalating. A test that goes from flaky to reliably green after this swap was never a regression; one that stays flaky after it is a real finding, not a timing guess, and `blocked` is correct.

**4. Reviewer evidence, where the diff touches UI.**

`ui-touch.sh <repo> <parent> <head>` decides, mechanically, whether a pair is owed. `NON-UI` → this claim reads `not applicable — NON-UI` and nothing else. `UI` → all of the following, or the claim fails:

- `evidence/capture-before.md` and `capture-after.md` exist, each with the three-line header, `build_identity: match`, and the same gate element.
- The before header's SHA is `parent`; the after header's SHA is `head`.
- **Stage one:** `pair-diff.py capture-before.png capture-after.png --mask <mask from the after report, or none>` exits 0. The script treats `none` as no mask, and it always masks the status bar, so `masked=1` with `mask: none` is expected. **Exit 3 — nothing changed inside the mask, including a byte-identical pair — fails the claim**: a fix that changed nothing visible is not a fix, and the row reads `FAILED: nothing visibly changed (inside=0.00000)`.
- **Stage two:** a model judges whether the *right* thing changed — the change inside the gate element's frame is the one the symptom describes, in the direction the expected-behaviour sentence states, with nothing else visibly altered. The auditor does this itself from the two images, the symptom and the mask frame, never from the implementer's reasoning, and defaults to fail when unsure. It writes one sentence into the row.
- **Accessibility tree:** `tree-diff.py` on the two tree dumps. **Reported on its own row, never gating** — it does not change the verdict in either direction. A tree can look correct while the UI is visibly broken (off-screen, clipped, overlapping, wrong colour), so it cannot stand in for stages one and two; it exists to surface accessibility regressions a screenshot cannot show.
- **The mask must be the gate element's frame**, in screenshot pixels. `mask: none` is valid only for a pair expected to be pixel-identical; a UI fix passes the gate element's frame, because a change outside every mask is what exits 1 — a pass with no mask over the fix is the fix going unexamined. The auditor rejects a mask covering more than half the screenshot, which is what exit 2 reports.
- **Exit 2 is a process failure, not a diff result and never a pass.** The row reads `MISSING: size mismatch <bw>x<bh> vs <aw>x<ah>`, `MISSING: mask invalid <value>`, or `MISSING: mask too large <value>`, taken from the script's contract line, and repeats on the `Not proven` line.

A pair can now fail — stage one rejects an unchanged screen and stage two rejects the wrong change — but it still does not assert the symptom the way the red test does, so it is not proof of the diagnosis. It is what gets the PR approved, which is a different and equally real goal. But a *missing* pair on a UI diff is a gap the reviewer will hit first, so it is `Not proven` material and demotes the verdict.

## 1d. The revert check

Revert the diff, confirm the test goes red again. Catches the case where something *other* than the fix made it pass — a stale build artifact, an unrelated edit in the same commit.

**Cheap loop: mandatory.** Expensive loop: skip it. The 1b failure output already establishes the test failing on code without the fix, provided the file is unchanged — which is exactly what claim 1's hash check and the test-only commit prove. That is most of the value at none of the cost.

---

# Mode 2 — Standalone on a branch or diff

No chain, no ticket. "Verify this."

Same four claims, minus the refutation. What changes:

- **Find the test that covers this change.** If one exists and was added by this diff, treat it as the red test and check it the same way: does it fail on the parent commit? A test added alongside a fix that passes without the fix is the failure this mode exists to catch.
- **If no test covers the change, say so plainly.** Do not manufacture one to make the run look complete. "This diff has no test proving it does anything" is the verdict, and it is a useful one.
- Suite, regression and evidence checks run unchanged.

The whole mode runs in `proof-auditor` — there is nothing to produce, only a diff to judge. Dispatch it with `mode: standalone`; `test_commit` is the commit that added the covering test, or absent when none exists.

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

Step 2 runs in the main thread, in a throwaway worktree at the parent commit, committed to a local scratch branch — never to theirs. Steps 3–5 run in `proof-auditor` with `mode: review`: the test, its hash, the parent SHA and their head. The shallow review is the auditor alone. Separating writer from runner is what keeps "your test passes on their fix" from being a claim you made about your own test.

Their fix passing your test is a strong result. Their fix passing on the parent commit too means the test proves nothing about their change — say so.

## Output

A review verdict, not a PR and not a commit. **Never push to someone else's branch.**

- What the PR claims
- Whether an independent test confirms it
- What it does not cover
- The test itself, offered — it is more useful to them than a comment

**No pair on an external PR.** Build identity is what makes a pair evidence, and you cannot produce it for someone else's branch — no install of yours, no hash to compare. So on a `UI` diff the Reviewer evidence row reads `not applicable — external PR, no build identity available`, and it **does not demote the verdict and is not repeated on the `Not proven` line** — that line is for gaps that demote, and nothing here was ever obtainable. This is the one exception to the gate below; a review of a UI change is not held at PROOF INCOMPLETE for a picture nobody could have taken.

Log it: date, PR, radius, whether the independent test confirmed the claim. Separate from the bug ledger. Over time it answers a question worth knowing — how often does a fix that reads correctly fail an independent test.

---

# The proof block

The shape, the rules, and the three verdict tiers are in `../shared/proof-block.md`. Paste the block verbatim into the PR description, inside `<details><summary>Proof — <tier></summary>`. Mode 2 puts it in the dossier verdict; Mode 3 in the review.

---

## Dossier

`evidence/` holds every command and its output, including — especially — the 1b red failure and the baseline. Verdicts, attempt counts, the red-test hash and the test-commit SHA go in `state.md`.

**Every evidence file starts with a three-line header:** commit SHA it ran against, the exact command, toolchain or device identifier. Output with no provenance cannot be re-trusted later — a pass count that does not say which commit it counted is a log, not evidence.

What is written for Amel goes in plain words. The verdict block first:

```markdown
**Verdict:** MERGE-READY / REVIEW NEEDED / PROOF INCOMPLETE, and the one-line reason.
**Proven:** the test that failed before and passes now, named.
**Not proven:** what could not be checked, and why.
**Regressions:** none against baseline, or the exact ones.
```

A check that could not run is stated, never omitted. A verification quiet about what it could not verify is worse than one that admits it — the whole point of this module is that its output is trustworthy, and silence about gaps is the fastest way to lose that.
