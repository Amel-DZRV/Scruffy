# Interview

## The confidence rule

Ask when the lane cannot proceed without the answer **and** the answer cannot be inferred with confidence. Do not ask what a lookup answers — a question already answered in comment 4 is the same defect as asking a lookup. Do not assume what you are not confident of — a guessed symptom produces a red test for the wrong bug.

The test: *would a reviewer reading the PR body's assumption line nod, or ask "where did you get that"?* Nod → infer, state the inference loudly, record it under `assumptions:` in `state.md`, and (bug lane) it becomes the red test's assertion verbatim. Ask → below.

## Bug checklist

Run against what the ticket and comments already state; ask only for the gaps:

- what exactly is wrong — the symptom in one sentence
- what should happen instead (inferred ~80% of the time — infer and say so)
- platform; device model and OS version
- app version, and the branch or build the reporter was on
- feature flags and experiment arms
- repro steps, if the ticket's are missing or do not work
- the screen or template — for Codeless, the JSON template or payload; for Mosaic, the screen or template name and any account or data state it needs
- **UI bugs only:** a screenshot of the broken state, unless one is attached (then `evidence/reporter-before.<ext>` already holds it)

**Amel's own asks ride in the same message**, because nothing after the interview may ask him anything. They key off `path:` in `state.md`. Before a `record` installs the parent build, run the toolchain rows of `../scruffy-bug/references/preflight.md` for that platform.

- missing path file → `record` it now. Nothing in the record packet (`~/.claude/agents/evidence-capturer.md`) exists yet at dispatcher time, so first: claim a device per `../scruffy-bug/references/platforms/<platform>.md`; build and install from a fresh main checkout (a worktree per `../scruffy-bug/references/worktrees.md`); write `evidence/build-identity-before.txt` per that platform file's Build identity. Record `device:`, `bundle:` (the installed bundle id or package name), `record_worktree:`, `record_sha:` and `build_identity:` in `state.md` for bug step 3 to reuse. Then dispatch `evidence-capturer` in `record` mode; he navigates while it records
- stale path file → `repair path file <path>`, by hand per `../memory/README-paths.md`; a `stale_reason` naming `os` is a `record` into `<screen>@<os>.md`

**Candidate rules ride here too** — the batch from the ledger backfill (`SKILL.md` Setup 1), each with the PR comment it came from. He approves, edits or discards; only approved ones are written.

## Shape

One message, batched across every item. Several turns are fine until the gaps close. Say plainly that the run is stopped and waiting, and on what. **Then it is closed**: no bug-lane step asks a human anything again except Stop 2 (two equally correct fixes, his call).

Three ways out per question: he answers it; he cannot and the reporter must → draft `questions.md`, ready to paste as one ticket comment, and if the item cannot proceed without it → `needs info`; or it is assumed → recorded, surfaced in the PR body.

## Feature items

No checklist here. The feature lane asks at its own points — the step-2 ambiguity batch, council disagreements, the go gate — and those loop until Amel is satisfied. The dispatcher only confirms the classification when it was ambiguous.
