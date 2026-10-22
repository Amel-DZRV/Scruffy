# The proof block

Everything else in the verification discipline exists to produce this artifact. **One block, fixed shape, pasted verbatim into the PR description (in a collapsible section headed by the verdict tier).** The dossier is for resumption; the proof block is for the reviewer, and the whole point of a fixed shape is that Amel learns to read it in ten seconds.

## Block

```markdown
## Proof

**Verdict: MERGE-READY**   (or REVIEW NEEDED / PROOF INCOMPLETE — with the reason, one line)

| Claim | Evidence |
|---|---|
| Fails without fix | `<command>` at `<test-commit sha>` — exit 1, "<one-line failure excerpt>" |
| Passes with fix | same command at `<head sha>` — pass |
| Test unchanged since red | test-only commit `<sha>`, untouched since — `git log --follow -p <file>` |
| Suite | <N> passed at head; baseline at parent: <N> passed (or: same <k> pre-existing failures, named) |
| Revert check | done / skipped — expensive loop, the red commit stands in |
| Accessibility check (informational — never changes the verdict) | `tree-diff.py` — `a11y: UNCHANGED / CHANGED / ATTENTION` and its findings, or `not applicable` / `UNAVAILABLE <why>` |
| Reviewer evidence | `capture-before.png` @ `<parent sha>`, `capture-after.png` @ `<head sha>`, gate `<label role>`, pair-diff `changed=<f> inside=<f>` exit 0, right-change: "<one sentence>" — or `not applicable — NON-UI` — or `not applicable — external PR, no build identity available` (Mode 3) — or `MISSING: <status the agent returned>` / `MISSING: size mismatch <bw>x<bh> vs <aw>x<ah>` / `MISSING: mask invalid <value>` / `MISSING: mask too large <value>` |

**Replay:** `git checkout <test-commit> && <command>`  (expect red) `&& git checkout <head> && <command>`  (expect green)
**Not proven:** what could not be checked and why — or "nothing".
```

## Rules

- **Every cell is a command, a SHA, or a count.** A cell that reads "verified ✓" is the self-attestation this block exists to replace.
- **Replay is generated on cheap loops, always.** On expensive loops, state the cost instead — "replay is a 35-minute build; red output archived below" — and fold the raw red failure output into a `<details>` block under the table. Trust-me is acceptable only with the receipt attached.
- **The `Not proven` line is mandatory**, even when it says "nothing". Its absence is indistinguishable from silence about a gap.
- A `MISSING` cell in the Reviewer evidence row is repeated on the `Not proven` line. A `not applicable` cell never is — `Not proven` carries gaps that demote, and neither `NON-UI` nor an external PR is one.

## Verdict tiers

Three tiers, so "can I just merge this" is mechanical rather than a feeling:

| Verdict | Means | Criteria — all of them |
|---|---|---|
| **MERGE-READY** | approve on the proof alone | contained blast radius (Mode 3's radius table), all four claims proven, revert check done or expensive-loop exemption, suite delta against baseline is zero, nothing in `Not proven`, Reviewer evidence row is a pair or `not applicable` |
| **REVIEW NEEDED** | the proof holds but the judgement is his | shared blast radius, a design or trade-off embedded in the diff, or any earned exception — no seam |
| **PROOF INCOMPLETE** | do not merge on this | any process failure, any claim that could not run, a `UI` diff with a `MISSING` Reviewer evidence row |

**A UI diff without a verified pair cannot be MERGE-READY.** This is a gate, not a reminder — an agent that forgot to capture cannot talk its way past a row that reads `MISSING`. It governs Modes 1 and 2; Mode 3's `not applicable — external PR, no build identity available` is the single named exception, because there no pair was ever obtainable.

**Radius trumps greenness.** A shared-radius change self-demotes to REVIEW NEEDED however green it is — the tests (or criteria) prove the claim, not the blast radius. And the tier is a claim like any other: the ledger's PR-outcome column is what eventually says whether MERGE-READY predicts `approved as-is`, which is the number this entire module is trying to earn.

### Feature lane tier criteria

The feature lane reads the three tiers with these criteria in place of the table above (its claims are numbered 1–12 in `../scruffy-feature/mechanisms/pipeline/references/verification.md`):

| Verdict | Means | Criteria — all of them |
|---|---|---|
| **MERGE-READY** | eligible for auto-merge on the proof alone | contained blast radius, claims 1–8 proven, claim 9 proven or not applicable, revert check done or expensive-loop exemption, suite delta against baseline is zero, nothing in `Not proven`, Reviewer evidence row is a verified pair or `not applicable` |
| **REVIEW NEEDED** | the proof holds but the judgement is Amel's | shared blast radius, a design or trade-off embedded in the diff, or any earned exception: no seam, an unverifiable criterion |
| **PROOF INCOMPLETE** | do not merge on this | any process failure, any claim that could not run, a `UI` diff with a `MISSING` Reviewer evidence row, an independent audit that could not be dispatched and was not demoted |

The UI-pair gate and radius-trumps-greenness apply unchanged; the feature lane has no Mode 3 exception.

**A new contract at a seam is not, by itself, shared radius.** A cross-platform feature that introduces its own contract (an endpoint, a data shape nothing else reads) and has the Chief of Engineering's seam sign-off is contained. A change that alters a contract other code already reads is shared.

For a cross-platform feature, the **Chief of Engineering reconciles** the platforms' verdicts. The feature's verdict is the lowest tier of any platform, unless the Chief records a reason the lower verdict does not apply to the feature as a whole. A reconciliation never raises a tier above what a platform's own proof supports.

## Lane-specific rows

The bug lane's block has the seven rows above. The feature lane adds `Scope drift` (criteria built, non-goals untouched, nothing else changed) and replaces the single `Fails without fix` / `Passes with fix` pair with one pair per acceptance criterion, named. Cross-platform: the Chief of Engineering's reconciled tier is the one on line 1; it is never higher than any platform's own.

The feature lane's rows, as written in its own block:

| Claim | Evidence |
|---|---|
| Fails without feature — `<criterion 1>` | `<command>` at `<test-commit sha>` — exit 1, "<one-line failure excerpt>" |
| Passes with feature — `<criterion 1>` | same command at `<head sha>` — pass |
| Fails without feature — `<criterion 2>` | … one pair per criterion, named … |
| Passes with feature — `<criterion 2>` | … |
| Tests unchanged since red | test-only commit `<sha>`, untouched since — `git log --follow -p <file>` |
| Scope drift / non-goals | touched components listed; each non-goal checked |

The remaining feature rows (Suite, Revert check, Accessibility check, Reviewer evidence) are the bug lane's. For a cross-platform feature the block also carries each platform's verdict and the Chief of Engineering's reconciled verdict.
