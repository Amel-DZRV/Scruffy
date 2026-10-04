# Scruffy

A modular skillset for handling bugs and features across repos you don't own.

Five independent skills. Scruffy routes; the others do the work.

| Skill | Owns |
|---|---|
| `scruffy` | Classification, repo routing, preflight, clustering, dispatch, the ledger |
| `bug-eater` | The bug lane. Gather → chain → propose → fix → draft PR |
| `verification` | Proof. Red tests, the four claims, reviewing someone else's PR |
| `feature-dev` | The feature lane. Requirements → design → acceptance tests → draft PR |
| `screen-audit` | Design fidelity. A running app against Claude Design mocks, component by component — measured, judged, tapped — and fixed until it matches |

Plus four agents the skills dispatch — you never call them directly:

| Agent | Does |
|---|---|
| `proof-auditor` | Runs the four claims and awards the verdict, in a fresh context with no write tools. The model that wrote a fix never grades it |
| `step-reviewer` | Reviews one implementation step from its two SHAs, with none of the implementer's reasoning |
| `design-judge` | Decides per component whether the app matches the mock, from screen-audit's measurements and crops, in a fresh context. Writes the verdict the fix loop reads and the Stop hook re-checks |
| `evidence-capturer` | Takes the before/after pair from a simulator or emulator by a recorded path, gated on the accessibility tree and the installed binary's hash. You navigate a new screen once; it replays forever after |

## Install

Symlink, so recorded path files are written straight into the repo:

```bash
mkdir -p ~/.claude/skills ~/.claude/agents
for s in scruffy bug-eater verification feature-dev screen-audit; do ln -sfn "$PWD/$s" ~/.claude/skills/$s; done
cp agents/*.md ~/.claude/agents/
chmod +x bug-eater/scripts/*.sh bug-eater/scripts/*.py
```

The capture agent records new path files under `~/.claude/skills/scruffy/paths/`. With symlinks that *is* the repo, so a recorded path is a file you can commit. With a copy install it isn't, and the recording is lost on the next install.

Copying works too:

```bash
cp -r scruffy bug-eater verification feature-dev screen-audit ~/.claude/skills/
mkdir -p ~/.claude/agents && cp agents/*.md ~/.claude/agents/
chmod +x ~/.claude/skills/bug-eater/scripts/*.sh ~/.claude/skills/bug-eater/scripts/*.py
```

Under a copy install, copy new files from `~/.claude/skills/scruffy/paths/` back into the repo before committing.

Flat, one level under `skills/` — that's where Claude Code discovers them. Nesting them breaks discovery and stops `verification` being invocable on its own. Agents go flat under `~/.claude/agents/`.

`brew install cameroncooke/axe/axe` for iOS captures; without it the pair is `ungated` and the verdict caps at REVIEW NEEDED on UI diffs.

Bug-eater registers a Stop hook (`bug-eater/scripts/goal-check.sh`) from its frontmatter; it drives the autonomous phase and needs hooks enabled and the folder trusted. With hooks off the lane prints a `/goal` line to paste instead.

Screen-audit's scripts are Node and drive the system Chrome (no browser download): `npm install` once in `screen-audit/`. It registers its own Stop hook (`screen-audit/scripts/audit-check.mjs`), same requirements as bug-eater's.

On Windows, Git Bash's `ln -s` copies instead of linking unless Developer Mode is on; a directory junction needs no admin: `cmd //c mklink /J "%USERPROFILE%.claudeskillsscreen-audit" "C:devScruffyscreen-audit"`.

Without the agents everything still runs, but verification grades in-context and caps the verdict at REVIEW NEEDED.

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
screen-audit C:/dev/Relentless_V2 "docs/Design/training-flow/Relentless - Training tab flow.html" dashboard --audit-only
```

## The idea

The old shape was: ask a human to look at a simulator and say whether the bug is real, then ask again whether it's fixed. That's two 35-minute builds someone has to be present for, and it's why runs never finished.

The new shape is **a test that fails on exactly what the reporter complained about, then passes.** Plus suite output, snapshot diffs, and before/after captures for anything visual, taken by an agent from a recorded path rather than by you. You read the PR instead of watching the work.

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
agents/           proof-auditor, step-reviewer and evidence-capturer, dispatched by the skills
```

## Status

Written, not yet run. Expect the first real ticket to produce `LEARNED.md` entries — that's the design working, not failing.

Known gaps: `repo-routing.md` carries over from the prototype and should be checked before the first run. Nothing has been exercised against a real repo, and the discovery step — which is load-bearing — is the part most likely to need correcting.
