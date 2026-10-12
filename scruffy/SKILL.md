---
name: scruffy
description: Use when handed a Jira key or URL, a GitHub issue or PR URL, a TickTick task, a Slack thread, or plain text describing something broken or something wanted — one item or many. Also on "use scruffy", "scruffy, take this", and "scruffy watch <pr>". Classifies each item as a bug or a feature, interviews for what is missing, and runs the matching lane to a PR with proof.
argument-hint: "<jira key | url | github url | ticktick task | pasted text> ... | watch <pr>"
---

# Scruffy

**Input:** $ARGUMENTS. Empty → take the items from the conversation above. First token `watch` → `references/watch.md` and nothing else in this file.

Amel is a cross-platform triage owner on SDUI renderers — Mosaic (DoorDash) and Codeless Components / RooBlocks (Deliveroo) — across repos he does not own, and the CEO of his own projects. He approves and comments; he does not type code.

This file decides **which lane** an item takes and gets the lane what it needs from a human. It fixes nothing itself. Every step announces itself in chat as plain text before and after its tool calls, as the lanes do.

## Setup 1 — Read what was learned

`../shared/learning.md`, then `../memory/rules.md`. Then, for each repo the items route to, every `../memory/<repo>/recipes/*.md`. Past corrections and recipes apply before anything else.

## Setup 2 — Intake

`references/intake.md`. Per item, the whole ticket, every comment, every attachment described. Never grep a dump for the value you expect.

## Setup 3 — Classify

Per item, one question: **is something broken, or is something wanted?**

| Signal | Lane |
|---|---|
| A behaviour that used to work, a crash, a visual defect, a mismatch with a spec that already exists | `bug` |
| New behaviour, a new screen, a change to what a component promises, debt to remove | `feature` |
| Someone else's PR handed over to be reviewed | neither — read `../verification/SKILL.md` Mode 3 and run it |

Ambiguous → one question in the interview, with your guess and why. A bug wrapped around a feature ("the button is missing" when the button was never built) is a feature; say so in one line.

Bugs cluster across items (one root cause, two symptoms → one chain, one PR) per `../scruffy-bug/SKILL.md` Setup 6. Features never cluster.

## Setup 4 — Route and flag ownership

Repo per `../scruffy-bug/references/repo-routing.md`. Then:

```
owned: no   — ios, android, rooblocks, pedregal, and any repo under a DoorDash / Deliveroo org
owned: yes  — Amel's own projects
```

`owned` switches off Notion, auto-merge, the weekly build and `init-project.sh` in the feature lane, and makes every PR a draft. Record it in `state.md`.

## Setup 5 — Dossier

Create `~/Projects/tickets/<KEY>/` per `../scruffy-bug/references/dossier.md` (both lanes use it), before anything is written to `evidence/`. Write `state.md` with at least:

```
key: <KEY>
lane: bug | feature
repo: <repo>
owned: yes | no
interview: closed | n/a
assumptions:
  - <what the ticket left out and what you assumed>
```

`interview:` is set to `closed` when Setup 7 ends.

## Setup 6 — Path-file lookup (UI bugs only)

`../memory/<repo>/paths/<screen>.md` per `../memory/README-paths.md`. Record `path: fresh | stale | missing` in `state.md`. The interview acts on it.

## Setup 7 — Interview

`references/interview.md`. Bugs: the checklist, the confidence rule, one message, closed once. Features: nothing here — the feature lane's own touchpoints (ambiguity batch, council disagreements, the go gate) are its interview.

## Setup 8 — Hand-off

Read the lane's `SKILL.md` and follow it from its first step. Bug → `../scruffy-bug/SKILL.md`. Feature → `../scruffy-feature/SKILL.md`. The lane reads the dossier and does not re-ask what it answers.

## Close-out

The lane prints its own summary and writes its ledger row with `lane` set. Afterwards run the retro in `../shared/learning.md` §Write, then show Amel any candidate rules.
