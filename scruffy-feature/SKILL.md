---
name: scruffy-feature
description: Scruffy's feature lane — an agent company for feature development. Entered only via /scruffy, which classifies the item and writes the dossier. Product and business council, design and architecture council, per-platform plans, parallel developer benches, review, QA, a PR gated on a MERGE-READY verdict.
disable-model-invocation: true
---

# Scruffy — feature lane

One feature, start to finish, run by standing role agents. Amel is the CEO: he decides what gets built, the company builds it, he tests the result. The dispatcher (`../scruffy/SKILL.md`) has already classified the item as a feature and written the dossier at `~/Projects/tickets/<KEY>/`; read `state.md` there first.

The design is in `DESIGN.md`; the per-role specification is in `ROLES.md`. This file is the driver: it says what runs in what order and where the CEO is asked.

| Piece | Where |
|---|---|
| Roles (persona, skills, tools) | `roles/<role>/` |
| Global judgment memory | `memory/global/<role>.md` |
| Project facts memory | `<project>/memory/projects/<role>.md`, in the project's own repo |
| Council runner | `mechanisms/council/RUNNER.md` |
| Pipeline runner | `mechanisms/pipeline/RUNNER.md` |
| Engineering discipline rule | `rules/engineering-discipline.md` |

## Before anything runs

1. **Find the project.** `--project <path>`, else the current repo. Its Notion hub page is the source of project truth and wins on conflict.
2. **Check the project's memory files exist** at `<project>/memory/projects/<role>.md`. Missing → `scripts/init-project.sh <project>` creates them empty. A new project starts empty on purpose.
3. **Use the dossier** `~/Projects/tickets/<KEY>/` with `state.md`, `evidence/`.
4. **Check what the harness can do**: parallel subagents or a workflow tool, worktrees, GitHub tools, Notion. Roles are standing agents composed from their files by the runners; if a capability a role's `tools.md` needs is missing, say so up front and run with the gap named, never silently.

## The flow

Sequential, with Amel the final authority at every decision point. The **Docs-Keeper** fires as an explicit synchronous step after every lock point marked below.

| # | Step | Who | Output |
|---|---|---|---|
| 1 | The idea | Amel | the request |
| 2 | **Product/Business council** | Product Manager, Business Manager | the vision: what, why, draft criteria, non-goals. Prior art checked first, ambiguity hunted (`mechanisms/pipeline/references/spec-and-plan.md`). **Lock point → Docs-Keeper.** |
| 3 | **Design/Architecture council** | Designer, platform architects, Chief of Engineering when cross-platform | the high-level design. **Lock point → Docs-Keeper.** |
| 4 | **Seam check** | Chief of Engineering | the platform plans agree at the seams before anyone builds. Skipped, with one line saying so, for a single-platform feature. **Lock point → Docs-Keeper.** |
| 5 | **Platform plans** | each touched platform's architect | vertical-slice plan, four fields per step, criteria mapped to steps |
| | **The go gate** | Amel | the plan package; loop until an explicit "go". **Go locks the acceptance criteria → Docs-Keeper.** |
| 6 | **Developer benches** | Team Leads, Developers | pipeline runner Part A: red tests, parallel tracks, one commit per step |
| 7 | **Review** | Reviewers | per step, in a fresh context, lint and format first |
| 8 | **QA** | QA per platform | acceptance, screenshot-vs-mock, accessibility tree, scope drift, proof block and verdict |
| 9 | **Reconcile** | Chief of Engineering | the cross-platform verdict, for a cross-platform feature |
| 10 | **PR** | pipeline runner Part B | ready, no reviewers, format per `mechanisms/pipeline/references/pr-format.md` |
| 11 | **Auto-merge** | pipeline runner Part B | only on `MERGE-READY`, and only where the verdict is wired as a required check |
| 12 | **Weekly build** | pipeline runner Part B step 9 | changelog collected from the PRs, project build triggered |

Steps 2 and 3 run `mechanisms/council/RUNNER.md` with the `product-business` and `design-architecture` persona sets. Steps 6 to 11 run `mechanisms/pipeline/RUNNER.md`, Part A once per platform in parallel, then Part B once.

Nothing here lets a role skip a step another role owns. A Reviewer does not grade; QA does not review code quality; the Team Lead does not award the verdict.

## CEO touchpoints

Everything else runs without him.

| Touchpoint | When | He sees |
|---|---|---|
| **Genuine spec ambiguity** | step 2, one batch | numbered questions, a recommended answer beside each |
| **Council disagreement** | steps 2 and 3, batched | one side, the other side, the synthesis recommendation. His decision is the fourth and final input |
| **The go gate** | after step 5 | the plan package. Nothing is built until he says go |
| **Manual testing** | after QA and the weekly build | the PR's "How to test by hand" |

Memory write-back proposes a global/project split inline with each council decision. It rides along, never blocks, and he corrects it afterwards.

## Terminal states

| State | Reached at | Artifact |
|---|---|---|
| `PR opened` | step 10 | branch and PR |
| `needs info` | step 2 | `questions.md`, ready to paste |
| `decision needed` | any step | `memo.md`: the options, the trade-off, who decides |
| `already exists` | step 2 | `verdict.md`: what already does this, and how to reach it |
| `blocked` | any step | `blocked.md` with the exact failure |

A PR is not the only exit. Forcing a PR onto a policy question is worse than saying so.

## Digital CEO

A silent observer in phase 1: after each real CEO decision the council runner dispatches it to log the decision as training data. It has no authority, no visible output, and no tool that can change the pipeline, the repo or the docs. It never breaks a tie. See `roles/digital-ceo/`.

## What is not decided

These are open in `DESIGN.md` section 9 and `ROLES.md` section 14. The runners take the conservative option and say so; none of them is decided here:

- PR format confirmation (running on the draft)
- Cross-platform PR shape (running on one PR per feature)
- Auto-merge wiring (nothing merges unattended until a project records it as wired)
- Memory file format (running on a provisional entry shape)
- Self-learning engine across projects
- Graduation of council pairs to autonomy (every disagreement still stops at Amel)
- Web QA toolchain
- Per-agent tool enforcement beyond what each `tools.md` states

## Principles that bind every step

- **Proof, not assertion.** Nothing is called verified without output that can be pointed at.
- **Scope discipline.** Criteria and non-goals are the boundary. Anything else is a follow-up.
- **Memory where judgment compounds**; written conventions where the job is the same every time.
- **Auto-merge is a deliberate risk** with firm gating, small PRs and a ledger so a bad merge is a one-command revert.
