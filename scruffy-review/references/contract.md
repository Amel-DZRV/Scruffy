# Output contract

## Reviewer

One YAML block, nothing else:

```yaml
findings:
  - file: <repo-relative path>
    line: <int, RIGHT side of the diff>
    severity: Critical | Important | Minor
    claim: <one sentence>
    failure_scenario: <concrete input/state → wrong result>
    confidence: high | medium | low
checked_and_sound:
  - <file or file:line range> — <what was checked>
```

`findings` may be empty. `checked_and_sound` is required: it is how the judge tells "the other reviewer didn't look" from "the other reviewer looked and found it fine".

## Judge

One YAML block, nothing else:

```yaml
findings:
  - file: <repo-relative path>
    line: <int>
    severity: Critical | Important | Minor
    claim: <one sentence, merged when both reviewers raised it>
    failure_scenario: <from the reviewer>
    verdict: CONFIRMED | REFUTED | CONTESTED
    agreement: both | reviewer-a | reviewer-b
    evidence: <file:line> — <one sentence>
    outside-diff: true        # only when the line is not in base..head
red_green: <the red-green test check result as given, or "skipped (<reason>)">
```

- **CONFIRMED** — the cited code shows the failure scenario can happen.
- **REFUTED** — a `file:line` shows it can't. No `file:line`, no refutation.
- **CONTESTED** — the code doesn't settle it: the judge can't confirm it and can't show it wrong, or the other reviewer's `checked_and_sound` covers the location and the code doesn't decide between them, or two findings at one location ask for conflicting changes.

**Ranking:** a `FAILED` red-green result first, then by severity, then `agreement: both` before single-reviewer findings.

## Judge, follow-up round

```yaml
finding: <file:line of the finding asked about>
question: <Amel's question, verbatim>
answer: <two or three sentences, citing file:line>
verdict: CONFIRMED | REFUTED | CONTESTED   # updated, or unchanged
changed: true | false
```
