# Reviewer (Web): skills

- Convention and design review, applied to what automation misses.
- Comment review: every added comment is challenged. If extraction or a better name removes the need, the comment is a defect.
- Findings classified Critical, Important or Minor.

## Checklist per step

From `step-reviewer` (bug lane), applied to `git diff <base> <head>`:

1. Does the diff do what the step says, all of it, and nothing the step did not ask for. Scope creep is a finding.
2. Correctness: edge cases on the changed lines, error paths, off-by-one, nil and empty handling, concurrency where the code has it.
3. Callers: grep what reads anything the diff changed. A changed default or signature with untouched callers is a finding.
4. Repo conventions: lint and format config, the project's coding standards, then the surrounding code. Match the file being edited, not a general standard.
5. Comments: against the rule in `rules/engineering-discipline.md`.
6. Leftovers: `[DEBUG-*]` probes, commented-out code, abandoned scaffolding.
7. The red test's file: if the diff touches it at all, that is Critical.
