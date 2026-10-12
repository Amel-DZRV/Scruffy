# Verification

Owned by the QA role of each platform (`roles/qa-<platform>/`). Everything else in the pipeline produces a claim. This produces the thing that can say **no**, and its verdict is what auto-merge gates on.

## The one rule

**Never claim a thing is verified without output you can point at.**

Not "it looks correct", not "the tests should pass". A command, its output, and what it proves. Every claim below is written so it can fail. A check that cannot fail is not a check.

## Two QA modes

QA does two jobs, and they run as separate agents so the model that built a thing never grades it.

| Mode | When | Context |
|---|---|---|
| **Author** | after acceptance-criteria lock, before any implementation | Writes the red tests and records their hashes. Sees the spec, the criteria, the non-goals and the repo. |
| **Audit** | after implementation | A fresh context, read-only on the repo (it may add files only under `evidence/` and use throwaway worktrees). Receives a packet and nothing else. |

**The audit packet:** repo path, dossier path, `parent` / `test_commit` / `head` SHAs, the test files with the hashes recorded when they went red, the test and suite commands, cost class, `evidence/baseline.txt`, the acceptance criteria and non-goals, the `ui-touch.sh` output for `parent..head`, and the capture reports when a pair was taken.

**Not in the packet:** the plan, the design notes, the seam notes, the Developers' reports, or any implementer reasoning. Including them re-creates the bias the split exists to remove. A caller that includes them is ignored.

Anything in the packet missing → return `PROOF INCOMPLETE` naming the missing field. Do not reconstruct it by guesswork.

If no independent audit agent can be dispatched, run the audit inline and put `audited in-context, not independent` on the `Not proven` line. That demotes the verdict to REVIEW NEEDED at best. A self-graded MERGE-READY is the thing this module exists to prevent.

## Discover the economics first

Before anything else, find out what a test run costs. This governs how many iterations are affordable. It is discovered, not configured. The Team Lead's project memory may already carry it.

- What is the build system (`BUILD.bazel`, `Package.swift`, `build.gradle`, `package.json`, `go.mod`)?
- How does CI run the tests? The CI config is the most reliable source for the real command.
- Time one run. Actually time it.

| Loop | Looks like | Behaviour |
|---|---|---|
| **Cheap**, seconds | Jest, package targets, unit tests, Go | Revert check mandatory. Iterate freely. No batching, no build slot. |
| **Expensive**, minutes to tens of minutes | full app build, emulator, integration suites | Revert check skipped. Probes batched. Build slot semaphore. |

**The timing run is also the baseline run.** It happens on the parent commit before any change. Keep its result: pass count and the names of any failures, in `evidence/baseline.txt`. Every later suite claim reads **no new failures against baseline**, not "green". When the loop is too expensive to afford a full baseline run, say so in the proof block rather than implying a clean start.

## Acceptance tests, red first

**One test per acceptance criterion.** Not one test for the feature. Done is when the last red test goes green and none of the others broke.

A red test is any artifact that fails before the feature exists and passes after: unit, integration, snapshot, accessibility-tree assertion, a script. The form does not matter; the falsifiability does. Three properties, all required:

- It asserts the criterion as locked, in the conditions the criterion states.
- It sits at a seam on the real call path, not a parallel path that happens to be easier to reach.
- It was **observed red**. Not assumed red.

**Where the expected behaviour was inferred rather than stated, the inference is the assertion, verbatim**, so the riskiest guess in the run is challenged in the one line of code the Reviewer reads anyway. The PR's assumption line names this test.

The procedure, in Author mode:

1. Write the tests. Run them. Watch every one go red. Keep the failure output in `evidence/`; it is the proof that the tests can fail.
2. Hash each test file and record it:

   ```bash
   shasum -a 256 <test file> | tee -a evidence/red-test.sha
   ```

3. **Commit the tests on their own, before any implementation commit.** The branch history `parent → tests → implementation` is the reviewer-facing proof the tests were not written to fit the code. Record the test-commit SHA.

**A test that will not go red means the behaviour already exists.** Stop and send it back to the architect: you are about to build something twice. Three attempts, then back to the plan.

**The forbidden move is weakening an assertion until it passes.** It is the easiest thing to cheat in this whole workflow and it turns the system into theatre.

**A criterion with no seam to test it** is an earned exception, never a ticked box: three genuine attempts, then it is named in the PR as unverified. Do not quietly drop it. Do not build a harness nobody asked for.

A visual criterion with a design mock behind it is testable: screenshot-versus-mock comparison and the accessibility tree are QA's evidence for it. A visual criterion with no mock is named as unverified.

## The failure modes

| Mode | Looks like | Response |
|---|---|---|
| **Process** | toolchain broken, device gone, suite cannot run, disk full | **No retry loop.** Report, mark proof incomplete, name the exact failing check. |
| **Solution** | a test stays red, the suite breaks | **3 repair attempts per track**, then that track is blocked with a written summary. |

Never silently discard work. A failed verification keeps the worktree.

## The claims, in Audit mode

Each is independently able to fail.

**1. Tests unchanged since red.** Re-hash every test file at `head`; each must equal the recorded hash. `git log --follow -p <test file>` must show the test arriving in `test_commit` and untouched after. A mismatch is reported, not absorbed. If a test genuinely had to move, re-run it red on the parent commit, record a new hash, and give it a new test-only commit.

**2. Tests fail without the feature.** Run the test command at `test_commit`. Every criterion's test must fail, for the reason the criterion states: read the assertion and compare. A test failing for an unrelated reason (compile error, missing fixture) proves nothing.

**3. Tests pass with the feature.** Same command at `head`. All green.

**4. No new suite failures against baseline.** The repo's suite, compared with `evidence/baseline.txt` by failure name, not only count. Paste commands and the delta: pass counts, not full logs. "Same two pre-existing failures as parent" is a pass. A clean-sounding "suite green" with no baseline behind it is not a claim.

**5. Nothing else moved.**
- Snapshot failure on a component the diff touched → intentional, update the baseline.
- Snapshot failure on one it did not touch → possible regression, `decision needed`, never auto-updated.
- A suite re-run to green is `blocked` and flagged flaky. Not a pass. Before flagging it, check whether the test waits on a wall-clock delay; if so, replace the sleep with a poll on the actual condition and re-audit. A test that stays flaky after the swap is a real finding.

**6. Scope drift and non-goals.** From `git diff --stat <parent> <head>`, list touched components and check each against the criteria. Nothing outside the criteria changed. Read the diff against each non-goal; a feature that quietly grew past its stated boundary is the most common thing to miss, and its author is the last to notice.

**7. Criterion table.** Every acceptance criterion maps to a passing test, **by name**. Not "the suite is green". For a cross-platform feature, the table is split by platform.

**8. Static analysis and dead code.** The project's analyzer and a dead-code check on the diff. New findings against baseline are reported.

**9. Process-death and backgrounding**, for stateful features: kill and background the app mid-flow and show the state survives as the criteria say. Not applicable to stateless changes (say so in the row).

**10. Reviewer evidence, where the diff touches UI.** `../scruffy-bug/scripts/ui-touch.sh <repo> <parent> <head>` decides, mechanically, whether it is owed.
- `NON-UI` → `not applicable — NON-UI` and nothing else.
- `UI` → all of: before and after captures with matching build identity at `parent` and `head`; the screenshot compared against the design mock; the accessibility tree dumped; and `../scruffy-bug/scripts/pair-diff.py before after --mask <the gate element's frame, in screenshot pixels>` exiting 0.
  - Exit 1: the pair differs outside the mask. Not shipped; re-capture once, then `decision needed` with both images.
  - Exit 2: process failure, never a pass. Row reads `MISSING: size mismatch <bw>x<bh> vs <aw>x<ah>`, `MISSING: mask invalid <value>`, or `MISSING: mask too large <value>`.
  - Exit 3: nothing changed inside the mask. `FAILED: nothing visibly changed`.
  - After exit 0, judge from the two images and the mock whether the *right* thing changed, with nothing else visibly altered. Default to fail when unsure. One sentence in the row.
- `../scruffy-bug/scripts/tree-diff.py` on the two tree dumps is reported on its own row and **never changes the verdict**, in either direction. A tree can look correct while the UI is visibly broken, so it cannot stand in for the pair.
- `UI` with no verified pair is `PROOF INCOMPLETE`, named on the `Not proven` line.

**11. Revert check, cheap loop only.** In a scratch worktree at `head`, reverse the implementation while keeping the tests, and expect red:

```bash
git diff <test_commit> <head> -- . ':(exclude)<test file>' | git apply -R
```

Expensive loop: record `skipped — expensive loop, the red commit stands in`.

**12. Blast radius, derived yourself.** For each changed symbol others read (a default, a protocol, a config key, a shared component's props, a stored data shape), grep its callers. Contained or shared, with the caller count as evidence. Do not take the Team Lead's word for it.

## The proof block

One block, fixed shape, pasted verbatim into the PR body (in a collapsible section headed by the verdict tier). A fixed shape is the point: Amel learns to read it in ten seconds.

```markdown
## Proof

**Verdict: MERGE-READY**   (or REVIEW NEEDED / PROOF INCOMPLETE — with the reason, one line)

| Claim | Evidence |
|---|---|
| Fails without feature | `<command>` at `<test-commit sha>` — exit 1, "<one-line failure excerpt per criterion>" |
| Passes with feature | same command at `<head sha>` — pass |
| Tests unchanged since red | test-only commit `<sha>`, untouched since — `git log --follow -p <file>` |
| Suite | <N> passed at head; baseline at parent: <N> passed (or: same <k> pre-existing failures, named) |
| Scope drift / non-goals | touched components listed; each non-goal checked |
| Revert check | done / skipped — expensive loop, the red commit stands in |
| Accessibility check (informational — never changes the verdict) | `tree-diff.py` — `a11y: UNCHANGED / CHANGED / ATTENTION` and its findings, or `not applicable` / `UNAVAILABLE <why>` |
| Reviewer evidence | `capture-before.png` @ `<parent sha>`, `capture-after.png` @ `<head sha>`, gate `<label role>`, pair-diff `changed=<f> inside=<f>` exit 0, right-change: "<one sentence>" — or `not applicable — NON-UI` — or `MISSING: <status>` |

**Replay:** `git checkout <test-commit> && <command>`  (expect red) `&& git checkout <head> && <command>`  (expect green)
**Not proven:** what could not be checked and why — or "nothing".
```

For a cross-platform feature the block also carries each platform's verdict and the Chief of Engineering's reconciled verdict.

Rules:

- **Every cell is a command, a SHA, or a count.** A cell that reads "verified ✓" is the self-attestation this block replaces.
- **Replay is generated on cheap loops, always.** On expensive loops state the cost instead ("replay is a 35-minute build; red output archived below") and fold the raw red failure output into a `<details>` block under the table. Trust-me is acceptable only with the receipt attached.
- **The `Not proven` line is mandatory**, even when it says "nothing". Its absence is indistinguishable from silence about a gap.
- A `MISSING` cell in the Reviewer evidence row is repeated on the `Not proven` line. A `not applicable` cell never is.

## The verdict

Three tiers, so "can this merge on its own" is mechanical rather than a feeling.

| Verdict | Means | Criteria — all of them |
|---|---|---|
| **MERGE-READY** | eligible for auto-merge on the proof alone | contained blast radius, claims 1–8 proven, claim 9 proven or not applicable, revert check done or expensive-loop exemption, suite delta against baseline is zero, nothing in `Not proven`, Reviewer evidence row is a verified pair or `not applicable` |
| **REVIEW NEEDED** | the proof holds but the judgement is Amel's | shared blast radius, a design or trade-off embedded in the diff, or any earned exception: no seam, an unverifiable criterion |
| **PROOF INCOMPLETE** | do not merge on this | any process failure, any claim that could not run, a `UI` diff with a `MISSING` Reviewer evidence row, an independent audit that could not be dispatched and was not demoted |

**A UI diff without a verified pair cannot be MERGE-READY.** This is a gate, not a reminder.

**Radius trumps greenness.** A shared-radius change self-demotes to REVIEW NEEDED however green it is: the tests prove the criteria, not the blast radius.

**A new contract at a seam is not, by itself, shared radius.** A cross-platform feature that introduces its own contract (an endpoint, a data shape nothing else reads) and has the Chief of Engineering's seam sign-off is contained. A change that alters a contract other code already reads is shared.

For a cross-platform feature, the **Chief of Engineering reconciles** the platforms' verdicts. The feature's verdict is the lowest tier of any platform, unless the Chief records a reason the lower verdict does not apply to the feature as a whole. A reconciliation never raises a tier above what a platform's own proof supports.

Auto-merge is eligible only for `MERGE-READY`. `REVIEW NEEDED` and `PROOF INCOMPLETE` PRs stay open for Amel.

## Dossier

`~/Projects/tickets/<KEY>/evidence/` holds every command and its output, including (especially) the red failures and the baseline. Verdicts, attempt counts, the test hashes and the test-commit SHA go in `state.md`.

**Every evidence file starts with a three-line header:** the commit SHA it ran against, the exact command, the toolchain or device identifier. Output with no provenance cannot be re-trusted later.

A check that could not run is stated, never omitted. A verification quiet about what it could not verify is worse than one that admits it.
