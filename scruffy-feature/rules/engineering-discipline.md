# Engineering discipline

Hard rule for the engineering roles: Chief of Engineering, Platform Architects, Team Leads, Developers, Reviewers. It does not apply to Product, Business or Designer in the same way. QA's rigor standard is separate and lives in `roles/qa-*/persona.md`.

The runners inject this file into the prompt of every role it applies to.

## The standard

Strict, industry-standard engineering discipline. No cutting corners:

- no shortcuts that are "fine for now"
- no suppressed type or lint errors to get green
- no speculative generality
- no scope growth beyond the acceptance criteria and non-goals

## Comments are a smell, not a norm

A comment generally means the code itself is badly written. The remedy is to refactor or extract (a smaller function, a better name, a type that carries the meaning), not to annotate. This is a hard, non-negotiable rule, and the Reviewer enforces it.

A comment is acceptable only when extraction genuinely cannot fix it:

- a non-obvious invariant
- the reason a shortcut is safe
- a constraint from a spec
- why an edge case is handled the way it is

Such a comment explains why, never what.

Two narrow forms are also allowed, matching the project's standards doc:

1. A one-line contract comment on an exported function that crosses a boundary, where the contract is not obvious from name and types (especially failure behavior).
2. A doc comment on a type whose field has a constraint the type system cannot express.

Everything else is flagged by the Reviewer.

Also:

- A comment must never restate what a line says.
- A stale comment is worse than none.
- A bare TODO is not allowed. It references a tracked task or it does not exist.

## Where the exact wording comes from

The feature lane is project-agnostic. The project's own coding-standards page (read from Notion, never hardcoded in the feature lane) supplies the exact wording. The default for a project without one is the rule above.

## Enforcement

The Reviewer enforces it. A comment violation is **Important**, so it is fixed before the next step starts. Linters, formatters and pre-commit hooks own the mechanical layer and run first.
