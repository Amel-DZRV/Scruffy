# PR format

**Status: drafted, awaiting Amel's confirmation** (`DESIGN.md` sections 8 and 9), including whether the full structure is kept or trimmed. Until he confirms, this is the format the pipeline uses.

It is the bug lane's PR body, adapted for the feature lane's situation: no external reviewer, auto-merge on a verdict, and a weekly build that reads a changelog.

The body is read by Amel after the fact and by future-Amel, not by a stranger. It also has one machine-readable job: auto-merge gates on the verdict, so the verdict comes first.

## Rules

- **Ready for review, not draft.** GitHub auto-merge does not apply to draft PRs, so feature-lane PRs open ready.
- **No reviewers assigned.** There is no external reviewer.
- **Auto-merge eligibility.** Only a `MERGE-READY` verdict is eligible. `REVIEW NEEDED` and `PROOF INCOMPLETE` PRs stay open for Amel. See `RUNNER.md` step 7.
- **One feature per PR, kept small**, so a bad merge is a one-command revert.
- If the repo has its own PR template, mirror its headings where they do not conflict with the order below.
- The verdict line is exactly `MERGE-READY`, `REVIEW NEEDED` or `PROOF INCOMPLETE`, alone on the first line of the body.

## Body, in order

1. **Verdict.** First line: `MERGE-READY`, `REVIEW NEEDED` or `PROOF INCOMPLETE`.
2. **What this adds.** One line, in the words of someone who wants it, not someone who built it.
3. **Why.** The problem it solves, with a link to the Decisions Log row (or council outcome) that approved it.
4. **Proof block.** Pasted verbatim from QA: verdict tier, claims table with commit hashes, the command to replay it, and the mandatory `Not proven` line. For a cross-platform feature this carries the Chief of Engineering's reconciled verdict.
5. **Acceptance criteria.** A table of each criterion and the passing test that proves it, by name. For a cross-platform feature, split by platform.
6. **Non-goals.** What this deliberately does not do. Pre-empts the "shouldn't it also…" question.
7. **Design.** Two or three sentences, and the rejected alternative with the trade-off when a council disagreement or a real alternative existed.
8. **Blast radius.** What reads this and what it changes. Say plainly when it only adds. For cross-platform work, name the contract at the seam and that the Chief of Engineering signed off.
9. **Evidence.** Screenshots against the design mock from QA's captured pair, and the accessibility tree result, for anything visual. A non-UI change says so in one line.
10. **Assumptions.** One line each wherever the spec was inferred rather than stated, naming the test that asserts the inference.
11. **Unverified criteria.** Named. A PR quiet about what it could not verify is worse than one that admits it.
12. **Review log.** The count of Reviewer findings resolved, plus any Minor findings carried forward.
13. **Docs updated.** The Notion pages and Decisions Log rows the Docs-Keeper changed for this feature.
14. **How to test by hand.** Replaces Scruffy's "how to review". Amel tests manually in the weekly build, so: the screen to open, the device, and what to try.
15. **How to revert.** The one-command undo: a revert of the merge commit, or the flag or config if the repo already uses one.
16. **Follow-ups.** Linked tickets for everything deliberately deferred.
17. **Changelog line.** One user-facing sentence. The weekly build collects these into the changelog.

Section 17 is written under the exact heading `## Changelog line` so the release step can collect it mechanically.

## Template

```markdown
<MERGE-READY | REVIEW NEEDED | PROOF INCOMPLETE>

## What this adds
<one line>

## Why
<problem> — decision: <link to Decisions Log row or council outcome>

<details><summary>Proof — <verdict></summary>

<proof block, verbatim from QA>

</details>

## Acceptance criteria
| # | Criterion | Test |
|---|---|---|

## Non-goals
-

## Design
<two or three sentences; the rejected alternative and trade-off if one existed>

## Blast radius
<what reads this, what it changes; "only adds" if so; seam contract and Chief sign-off if cross-platform>

## Evidence
<screenshots against the mock, a11y result — or "Non-UI change.">

## Assumptions
-

## Unverified criteria
<named, or "none">

## Review log
<N> Reviewer findings resolved. Minor carried forward: <list or none>.

## Docs updated
-

## How to test by hand
<screen, device, what to try>

## How to revert
<one command>

## Follow-ups
-

## Changelog line
<one user-facing sentence>
```
