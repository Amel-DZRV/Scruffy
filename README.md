# Scruffy

Scruffy takes bugs and features, in repos you don't own, to a draft PR with proof. One entry point, `/scruffy`: hand it a ticket, an issue, a PR, a Slack thread or plain text. It classifies each item, interviews you once for what only a human can supply, then runs the bug lane or the feature lane. Bugs get a cause, a red test that fails on exactly what was reported, a fix and a proof block. Features get a spec, a plan you approve, and a built, verified branch. The third lane, `/scruffy review <pr>`, reviews someone else's PR: two blind reviewers on different models, a red-green test check when it applies, a judge that checks every finding against the code, then drafts in your voice, posted only on your go.

| Skill | Owns |
|---|---|
| `scruffy` | The dispatcher, and the only skill you type. Intake, bug-or-feature classification, the interview, the hand-off to a lane, and `watch` mode for PRs already open |
| `scruffy-bug` | The bug lane: preflight, dossier, clustering, the budget, then per bug: gather, already dead?, reproduce, investigate, red test, propose, fix, verify, clean up, draft PR. Then the final report, the ledger and learning |
| `scruffy-feature` | The feature lane (formerly Taimi): a team of roles that specs, plans, builds and reviews a feature, with a council mechanism for decisions |
| `scruffy-review` | The review lane: Opus 5.5 and GPT-6.1 Sol review blind (Fable 5.1 when there is no GPT), the red-green test check on codeless and shared-code PRs, a Sonnet 5.5 judge, follow-up questions, drafts, posting on go, and learning from your edits |
| `verification` | Proof. Red tests, the four claims, the proof block. Called by the bug and feature lanes, run standalone on a branch or a diff, or as the red-green test check on someone else's PR |

`scruffy-bug`, `scruffy-feature` and `scruffy-review` are entered only through the dispatcher. `shared/` and `memory/` are not skills.

Agents the skills dispatch, never called directly:

| Agent | Does |
|---|---|
| `proof-auditor` | Runs the four claims and awards the verdict, in a fresh context with no write tools. The model that wrote a fix never grades it |
| `step-reviewer` | Reviews one implementation step from its two SHAs, with none of the implementer's reasoning |
| `pr-reviewer` | The review lane's reviewer and judge on the no-T3 transport: read-only, in a detached worktree at someone else's PR head |
| `evidence-capturer` | Takes the before/after pair from a simulator or emulator by a recorded path, gated on the accessibility tree and the installed binary's hash |
| `developer` | Implements one track of a plan in its own worktree, from a packet the Team Lead writes |

## Install

```bash
scripts/install.sh
scripts/selfcheck.sh
```

Symlink only. The skills reach `shared/` and `memory/` relative to their own directory, and recorded recipes and paths are written back through the links into the repo, where you can commit them. A copy install breaks both. The installer links the four skills flat under `~/.claude/skills/` (Claude Code discovers one level deep; nesting stops `verification` being invocable on its own), links `shared` and `memory` beside them, copies the agents to `~/.claude/agents/`, and removes the skills and the agent left over from the earlier layouts (see `scripts/install.sh` for the names).

`brew install cameroncooke/axe/axe` for iOS captures; without it the pair is `ungated` and the verdict caps at REVIEW NEEDED on UI diffs.

`scruffy` registers a Stop hook (`scruffy-bug/scripts/goal-check.sh`) from its frontmatter, so it is live for the whole `/scruffy` run; it drives the bug lane's autonomous phase, does nothing unless a dossier holds `evidence/goal.active`, and needs hooks enabled and the folder trusted. With hooks off the bug lane prints a `/goal` line to paste instead.

On Windows, Git Bash's `ln -s` copies instead of linking unless Developer Mode is on; a directory junction needs no admin. From `cmd.exe`:

```bat
mklink /J "%USERPROFILE%\.claude\skills\scruffy" "C:\dev\Scruffy\scruffy"
mklink /J "%USERPROFILE%\.claude\skills\scruffy-bug" "C:\dev\Scruffy\scruffy-bug"
mklink /J "%USERPROFILE%\.claude\skills\scruffy-feature" "C:\dev\Scruffy\scruffy-feature"
mklink /J "%USERPROFILE%\.claude\skills\scruffy-review" "C:\dev\Scruffy\scruffy-review"
mklink /J "%USERPROFILE%\.claude\skills\verification" "C:\dev\Scruffy\verification"
mklink /J "%USERPROFILE%\.claude\skills\shared" "C:\dev\Scruffy\shared"
mklink /J "%USERPROFILE%\.claude\skills\memory" "C:\dev\Scruffy\memory"
```

Without the agents everything still runs, but verification grades in-context and caps the verdict at REVIEW NEEDED.

## Use

```
/scruffy MOSAIC-3559
/scruffy <feature idea> --project <path>
/scruffy MOSAIC-3559 MOSAIC-3561 MOSAIC-3570
/scruffy watch <pr>
/scruffy review <pr>
verification <pr>
```

The dispatcher classifies each item as a bug or a feature. Several bugs at once are taken in together, so two tickets with one root cause become one PR. `watch` monitors a PR you already opened: bots, human reviewers, the loop, the exits. `review` reviews a PR someone else opened. `verification` also runs on its own against the current worktree.

## The idea

The old shape was: ask a human to look at a simulator and say whether the bug is real, then ask again whether it's fixed. That's two 35-minute builds someone has to be present for, and it's why runs never finished.

The new shape is **a test that fails on exactly what the reporter complained about, then passes.** Plus suite output, snapshot diffs, and before/after captures for anything visual, taken by an agent from a recorded path rather than by you. You read the PR instead of watching the work.

Never claim a thing is verified without output you can point at.

## Design notes

- **Discovery over configuration.** Build system, test command, PR conventions, lint rules, and feedback-loop cost are all read from the repo at run time. The only thing configured is which repo a ticket belongs to, because nothing can infer that.
- **The red test must be watched failing first.** A test written after a fix is the classic way to end up with one that would have passed anyway. Its file is hashed the moment it goes red and re-checked after, so it can't be quietly edited until green.
- **Two stops, batched.** The dispatcher's interview, where everything only a human can supply is asked once, and a choice between two equally correct fixes. Nothing else interrupts.
- **A PR is not the only exit.** `recommend close`, `needs info`, `decision needed`, `blocked` and `deferred` are all real outcomes, and forcing a PR onto a policy question is worse than saying so.
- **The ledger is the health metric.** One row per item, PR outcome backfilled by the *next* run. A workflow grading its own output is the bias this design exists to remove.

## Structure

```
Scruffy/
├── README.md
├── scruffy/                      the dispatcher — the only skill Amel types
│   ├── SKILL.md                  intake → classify → interview → lane; `watch` mode
│   └── references/
│       ├── intake.md             sources, whole-field reads, bug-vs-feature test
│       ├── interview.md          bug checklist, confidence rule, feature hand-off
│       └── watch.md              PR monitoring: bots, humans, loop, exits
├── scruffy-bug/                  the bug lane
│   ├── SKILL.md                  steps 1–10
│   ├── references/               dossier, models, preflight, repo-routing, ticktick, worktrees, apps, platforms/
│   └── scripts/                  goal-check.sh, watch-tick.sh, pair-diff.py, tree-diff.py, ui-touch.sh, publish-evidence.sh
├── scruffy-feature/              the feature lane (formerly Taimi)
│   ├── SKILL.md                  the driver
│   ├── README.md, DESIGN.md, ROLES.md
│   ├── roles/<role>/             persona / skills / tools
│   ├── memory/global/<role>.md   judgment memory per role
│   ├── mechanisms/council/RUNNER.md
│   ├── mechanisms/pipeline/      RUNNER.md, references/{verification,worktrees,spec-and-plan,pr-format}.md
│   ├── rules/engineering-discipline.md
│   └── scripts/init-project.sh
├── scruffy-review/               the review lane
│   ├── SKILL.md                  resolve → blind review → red-green → judge → follow-ups → drafts → post on go
│   ├── seats.json                reviewer-a, reviewer-b, judge, with fallbacks
│   ├── references/               reviewer.md, judge.md, contract.md
│   └── scripts/resolve-seats.py  seats + live capabilities → the models that run
├── shared/                       read by the lanes; not a skill
│   ├── orchestration.md          Team Lead mechanics: tracks, worktrees, developer packet, integration, fail memo
│   ├── pr.md                     evidence publishing, image verification, ticket comment
│   ├── proof-block.md            the block shape and the three tiers, one copy
│   └── learning.md               the learning layer's contract
├── memory/                       what the workflow has learned, versioned here
│   ├── rules.md                  judgment corrections
│   ├── voice/                    pairs.md (draft vs posted), rules.md (approved voice rules)
│   ├── README.md, README-paths.md, TEMPLATE-recipe.md, TEMPLATE-path.md
│   └── <repo>/
│       ├── recipes/<name>.md     build Consumer for sim, install DevApp, screenshot, pin status bar …
│       └── paths/<screen>.md     recorded navigation
├── verification/                 the proof engine, separately invocable
├── agents/                       proof-auditor, step-reviewer, evidence-capturer, developer, pr-reviewer
├── scripts/                      install.sh, selfcheck.sh, check-paths.py, test_resolve_seats.py
└── docs/superpowers/             specs and plans, history
```

`docs/superpowers/plans/` and `scruffy-feature/DESIGN.md` predate the merge and use the old skill names. They are history and left as written. The original five-skill state is the `pre-split` tag.

## Learning

- **Recipes** (`memory/<repo>/recipes/`): how to build, install and capture in a repo, written after a run that worked it out, reused by the next.
- **Paths** (`memory/<repo>/paths/`): recorded navigation to a screen, replayed by `evidence-capturer`.
- **Rules** (`memory/rules.md`): judgment corrections from you. The skill wins where they conflict. Contract in `shared/learning.md`.
- **Voice** (`memory/voice/`): every posted review comment next to its draft, and the voice rules you approved from your edits. Read by `pr-review-comments`.

## Status

Written, not yet run end to end as merged; the first ticket writes the first recipe.
