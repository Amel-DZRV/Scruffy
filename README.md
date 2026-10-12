# Scruffy

Scruffy is the bot that solves bugs, in repos you don't own. Hand it a ticket: it finds the cause, writes a test that fails on exactly what was reported, fixes it, proves the fix, and opens a draft PR.

Feature development moved to Taimi, a separate repo.

Two skills:

| Skill | Owns |
|---|---|
| `scruffy` | Intake, repo routing, preflight, dossier, clustering, the budget, then per bug: gather → already dead? → reproduce → investigate → red test → propose → fix → verify → clean up → draft PR. Then the final report, the ledger, and learning |
| `verification` | Proof. Red tests, the four claims, the proof block. Called by `scruffy`, or run standalone on a branch, a diff or someone else's PR |

Plus three agents the skills dispatch — you never call them directly:

| Agent | Does |
|---|---|
| `proof-auditor` | Runs the four claims and awards the verdict, in a fresh context with no write tools. The model that wrote a fix never grades it |
| `step-reviewer` | Reviews one implementation step from its two SHAs, with none of the implementer's reasoning |
| `evidence-capturer` | Takes the before/after pair from a simulator or emulator by a recorded path, gated on the accessibility tree and the installed binary's hash. You navigate a new screen once; it replays forever after |

## Install

Symlink, so recorded path files are written straight into the repo:

```bash
mkdir -p ~/.claude/skills ~/.claude/agents
for s in scruffy verification; do ln -sfn "$PWD/$s" ~/.claude/skills/$s; done
cp agents/*.md ~/.claude/agents/
chmod +x scruffy/scripts/*.sh scruffy/scripts/*.py
```

The capture agent records new path files under `~/.claude/skills/scruffy/paths/`. With symlinks that *is* the repo, so a recorded path is a file you can commit. With a copy install it isn't, and the recording is lost on the next install.

Copying works too:

```bash
cp -r scruffy verification ~/.claude/skills/
mkdir -p ~/.claude/agents && cp agents/*.md ~/.claude/agents/
chmod +x ~/.claude/skills/scruffy/scripts/*.sh ~/.claude/skills/scruffy/scripts/*.py
```

Under a copy install, copy new files from `~/.claude/skills/scruffy/paths/` back into the repo before committing.

Flat, one level under `skills/` — that's where Claude Code discovers them. Nesting them breaks discovery and stops `verification` being invocable on its own. Agents go flat under `~/.claude/agents/`.

Upgrading from the five-skill layout: remove the skills and agent that no longer exist, or the old `bug-eater` skill keeps answering to its name.

```bash
rm -rf ~/.claude/skills/bug-eater ~/.claude/skills/feature-dev ~/.claude/skills/screen-audit ~/.claude/agents/design-judge.md
```

`brew install cameroncooke/axe/axe` for iOS captures; without it the pair is `ungated` and the verdict caps at REVIEW NEEDED on UI diffs.

`scruffy` registers a Stop hook (`scruffy/scripts/goal-check.sh`) from its frontmatter; it drives the autonomous phase and needs hooks enabled and the folder trusted. With hooks off it prints a `/goal` line to paste instead.

On Windows, Git Bash's `ln -s` copies instead of linking unless Developer Mode is on; a directory junction needs no admin. From `cmd.exe`:

```bat
mklink /J "%USERPROFILE%\.claude\skills\scruffy" "C:\dev\Scruffy\scruffy"
mklink /J "%USERPROFILE%\.claude\skills\verification" "C:\dev\Scruffy\verification"
```

Without the agents everything still runs, but verification grades in-context and caps the verdict at REVIEW NEEDED.

## Use

```
/scruffy fix this bug: MOSAIC-3559
/scruffy here's a TickTick task: <task url or id>
/scruffy MOSAIC-3559 MOSAIC-3561 MOSAIC-3570
```

Several items at once are taken in together, so two tickets with one root cause become one PR. If an item is a feature request, Scruffy says so in one line and points to Taimi instead of working on it.

`verification` is separately invocable:

```
verification https://github.com/org/repo/pull/1234
verification            # the current worktree
```

## The idea

The old shape was: ask a human to look at a simulator and say whether the bug is real, then ask again whether it's fixed. That's two 35-minute builds someone has to be present for, and it's why runs never finished.

The new shape is **a test that fails on exactly what the reporter complained about, then passes.** Plus suite output, snapshot diffs, and before/after captures for anything visual, taken by an agent from a recorded path rather than by you. You read the PR instead of watching the work.

Never claim a thing is verified without output you can point at.

## Design notes

- **Discovery over configuration.** Build system, test command, PR conventions, lint rules, and feedback-loop cost are all read from the repo at run time. The only thing configured is which repo a ticket belongs to, because nothing can infer that.
- **The red test must be watched failing first.** A test written after a fix is the classic way to end up with one that would have passed anyway. Its file is hashed the moment it goes red and re-checked after, so it can't be quietly edited until green.
- **Two stops, batched.** The intake gate — everything only a human can supply, asked once — and a choice between two equally correct fixes. Nothing else interrupts.
- **A PR is not the only exit.** `recommend close`, `needs info`, `decision needed`, `blocked` and `deferred` are all real outcomes, and forcing a PR onto a policy question is worse than saying so.
- **The ledger is the health metric.** One row per item, PR outcome backfilled by the *next* run — a workflow grading its own output is the bias this design exists to remove.

## Structure

```
scruffy/          the skill: SKILL.md, references/ (incl. platforms/), scripts/, paths/, LEARNED.md
verification/     the proof engine, invocable on its own
agents/           proof-auditor, step-reviewer and evidence-capturer, dispatched by the skills
docs/             design plans, kept as history
```

`docs/superpowers/plans/` predates the split and still mentions `bug-eater`, `feature-dev` and `screen-audit` by their old names. It is historical and deliberately left as written. The original five-skill state is the `pre-split` tag.

## Status

Written, not yet run. Expect the first real ticket to produce `LEARNED.md` entries — that's the design working, not failing.

Known gaps: `repo-routing.md` carries over from the prototype and should be checked before the first run. Nothing has been exercised against a real repo, and the discovery step — which is load-bearing — is the part most likely to need correcting.
