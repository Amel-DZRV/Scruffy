# Scruffy

A modular skillset for handling bugs and features across repos you don't own.

Four independent skills. Scruffy routes; the others do the work.

| Skill | Owns |
|---|---|
| `scruffy` | Classification, repo routing, preflight, clustering, dispatch, the ledger |
| `bug-eater` | The bug lane. Gather → chain → propose → fix → draft PR |
| `verification` | Proof. Red tests, the four claims, reviewing someone else's PR |
| `feature-dev` | The feature lane. Requirements → design → acceptance tests → draft PR |

## Install

```bash
cp -r scruffy bug-eater verification feature-dev ~/.claude/skills/
```

Flat, one level under `skills/` — that's where Claude Code discovers them. Nesting them breaks discovery and stops `verification` being invocable on its own.

## Use

`/scruffy` is the only entry point you need. It reads the phrasing and routes.

```
/scruffy fix this bug: MOSAIC-3559
/scruffy I want to develop this feature, here's the ticket: MOSAIC-3612
/scruffy verify this solution and review the PR: <url>
/scruffy here's a TickTick task: <task url or id>
```

When you say which it is, the router takes it and doesn't re-litigate. Classification only stops to ask when an item is genuinely ambiguous — a bug report that's really a feature request, a PR that's really a question.

The other three are separately invocable as a fallback, useful when you want to skip classification:

```
bug-eater MOSAIC-3559
feature-dev "add offline caching to the feed"
verification https://github.com/org/repo/pull/1234
```

## The idea

The old shape was: ask a human to look at a simulator and say whether the bug is real, then ask again whether it's fixed. That's two 35-minute builds someone has to be present for, and it's why runs never finished.

The new shape is **a test that fails on exactly what the reporter complained about, then passes.** Plus suite output, snapshot diffs, and before/after captures for anything visual. You read the PR instead of watching the work.

Never claim a thing is verified without output you can point at.

## Design notes

- **Discovery over configuration.** Build system, test command, PR conventions, lint rules, and feedback-loop cost are all read from the repo at run time. The only thing configured is which repo a ticket belongs to, because nothing can infer that.
- **The red test must be watched failing first.** A test written after a fix is the classic way to end up with one that would have passed anyway. Its file is hashed the moment it goes red and re-checked after, so it can't be quietly edited until green.
- **Three stops, batched.** Classification if genuinely ambiguous, missing facts nobody can look up, and a choice between two equally correct fixes. Nothing else interrupts.
- **A PR is not the only exit.** `recommend close`, `needs info`, `decision needed`, `blocked` and `deferred` are all real outcomes, and forcing a PR onto a policy question is worse than saying so.
- **The ledger is the health metric.** One row per item, PR outcome backfilled by the *next* run — a workflow grading its own output is the bias this design exists to remove.

## Structure

```
scruffy/          router + shared spine (preflight, dossier, models, learning, routing)
bug-eater/        the bug lane, with per-platform command references
feature-dev/      the feature lane, cleanup included
verification/     the proof engine, invocable on its own
```

## Status

Written, not yet run. Expect the first real ticket to produce `LEARNED.md` entries — that's the design working, not failing.

A consistency pass has been done over the four files: the run's three stops are numbered the same way everywhere, the red test is written at its final path *before* it's observed red (so a hash mismatch stays abnormal rather than firing every run), `verification` has an explicit entry path for the feature lane, and the ledger has a template so the first append isn't inventing its own columns.

Known gaps: `repo-routing.md` carries over from the prototype and should be checked before the first run — the paths and the `.isolation/state/` layout are the parts nobody but Amel can verify. Nothing has been exercised against a real repo, and the discovery step — which is load-bearing — is the part most likely to need correcting.

**First run should be one bug on a cheap loop** — a Jest or package-target repo, single item, watched. The expensive path (build slot, device claim, batched probes, before/after replay) has the most untested surface and the worst failure cost.
