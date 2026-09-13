# Dossier

One per work item, at `~/Projects/tickets/<KEY>/`.

`<KEY>` is the Jira key, `<repo>-<number>` for GitHub, `ticktick-<taskId>` for a TickTick task, or `<slug>-<today>` for pasted text.

## Files

| File | Holds |
|---|---|
| `state.md` | machine state — step, lane, repo, cost class, device id, red-test command and hash, attempt counters, every stop answer |
| `summary.md` | the one file written for Amel rather than for you |
| `chain.md` | every hypothesis, ranked, with the rejected ones and why they lost |
| `plan.md` | only when the change earned a plan — every step with its four fields: what, files, criteria delivered, depends on |
| `evidence/` | every command and its output — including the red test's failure, which is proof and not a log |
| one terminal artifact | `verdict.md`, `memo.md`, `questions.md`, or `blocked.md` |

## `state.md`

Rewritten after every step, so a fresh session resumes instead of re-deriving. **On invocation, read it first.** If it exists, say where you left off and continue from there.

Carries at minimum:

- step, lane, repo, terminal state if reached
- cost class — cheap or expensive — and the test command that established it
- the suite baseline from the parent commit — pass count, any pre-existing failures by name
- claimed device identifier
- the red-test command, its file hash from the moment it was observed red, and the SHA of its test-only commit
- the proof verdict — MERGE-READY / REVIEW NEEDED / PROOF INCOMPLETE — once verification produced one
- **two separate attempt counters** — chain attempts and fix attempts. They do not share a budget
- on an orchestrated feature: per-track state — current step and fix-attempt counter for each track, so a crashed orchestration resumes track by track rather than restarting the fan-out
- every stop, its answer, and every assumption made in place of one

## `summary.md`

**Append one plain-language line at the end of every step, as you go.** Not reconstructed at the end — a crashed run must still leave something readable.

Verdict first:

```markdown
# <KEY> — what happened

**Root cause is:** one or two sentences, no jargon.
**Solution could be:** what you would change, and where.
**Proof:** the command that failed before and passes now, or what is missing.
**Where it stands:** the terminal state, in plain words.

## Steps

1. **Read the ticket** — what it said, and what it left out.
2. **Checked the machine** — what passed, what did not.
3. ...
```

Rules: no renderer jargon, no file paths in the verdict block — those belong in `chain.md`. One line per step. **Say plainly when a step found nothing or failed.** A step that went wrong is the most useful line in the file.

Run `unslop-prose` over it before printing. It is written for a human to read later, so it has to read like one wrote it.

## Ledger

`~/Projects/tickets/LEDGER.md`, one row per item, appended at the end of the run.

| Column | Why |
|---|---|
| date, key, lane, repo, cost class | Lets rates be sliced — trust is rarely uniform across lanes |
| terminal state | The distribution across the states *is* the health metric |
| stops fired | Stop 2 firing on most items means classification is too weak; stop 3 never firing means its trigger is mis-specified |
| **what the fix touched** | same file / same component / another team's code / a shared contract. Pairs with the stop-3 column to tune its trigger from real rows rather than guesses |
| opus escalated, and why | The honest read on whether sonnet is sufficient |
| chain correct? | Filled in after the fact. The most important column |
| **proof verdict** | `MERGE-READY` / `REVIEW NEEDED` / `PROOF INCOMPLETE`, from the PR's proof block |
| **PR outcome** | `approved as-is` / `approved with comments` / `changes requested` / `closed unmerged` |

**A run never writes its own PR outcome.** Preflight of the *next* run backfills it: for every row with a PR link and a blank outcome, `gh pr view <url> --json state,reviewDecision,mergedAt`. Four lines of bash, no model. A column that never fills makes the whole ledger decorative.

Standalone verification runs write a dossier but **no ledger row** — they produce no stop and no PR, so there is nothing to correlate. PR reviews get their own short log instead; see `verification`.

## What the ledger is for

Amel's bar is: *it will most likely take care of the bug, and have proof of it.* Proof is per-run and already in the PR. "Most likely" is a **rate**, and a rate is invisible from inside one run.

Twenty rows of `approved as-is` is trust as a number. Three consecutive `closed unmerged` means stop and fix the skill.

The proof-verdict column pairs with PR outcome to answer the sharper question: **does `MERGE-READY` predict `approved as-is`?** When it reliably does, approving on the proof block alone is a decision backed by the ledger rather than a leap. A `MERGE-READY` row ending `changes requested` is a defect in the verdict criteria, and worth more attention than any single bug.
