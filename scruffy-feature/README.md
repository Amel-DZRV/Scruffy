# Scruffy — feature lane

A general-purpose, project-agnostic agent-company workflow for **feature development**. Amel acts as CEO: he decides what gets built, the company builds it, he tests the result.

- `DESIGN.md`: what the feature lane is and why.
- `ROLES.md`: how each role thinks, what it draws on, what it remembers, what it can call.
- `SKILL.md`: the driver. Start here to run a feature.

## Layout

```
scruffy-feature/
├── SKILL.md                     the driver: flow, CEO touchpoints, terminal states
├── DESIGN.md
├── ROLES.md
├── roles/<role>/                persona.md, skills.md, tools.md (19 roles)
├── memory/global/<role>.md      durable cross-project judgment, one file per role
├── mechanisms/
│   ├── council/RUNNER.md        shared council runner (Product/Business, Design/Architecture)
│   └── pipeline/
│       ├── RUNNER.md            shared per-platform pipeline runner + ship steps
│       └── references/          spec-and-plan, verification, worktrees, pr-format
├── rules/engineering-discipline.md
└── scripts/init-project.sh      creates a project's empty per-role memory files
```

`roles/` is pure definition and project-agnostic. Nothing project-specific ever accumulates there. Per-project facts live in each project's own repo at `memory/projects/<role>.md`, never in this repo.

## Install

Installed by the repo-root README; do not install this directory alone.

Runners and roles are plain files the driver reads, not separate skills, so there is nothing else to register.

For a new project:

```bash
scripts/init-project.sh /path/to/project
```

The visual proof scripts live in `../scruffy-bug/scripts/` and need Python with Pillow (`pip install pillow`).

## Dependencies

Notion — owned projects only (`owned: yes`: the documentation home and the project's source of truth), GitHub (PRs; auto-merge on owned projects only), and a harness that can run parallel subagents and worktrees. QA's mobile toolchain needs a simulator or emulator and the accessibility-tree tooling.

## Status

Written, not yet run. The first real feature will show what the runners get wrong; expect corrections to land in the role memory files, which is the design working.

Open items are listed in `DESIGN.md` section 9 and `ROLES.md` section 14.
