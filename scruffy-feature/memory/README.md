# Memory

Three layers, kept separate on purpose (`ROLES.md` section 1).

| Layer | Where | Holds |
|---|---|---|
| Global judgment memory | `memory/global/<role>.md`, in this repo | "How Amel thinks" lessons. Travels with Amel across projects. |
| Project facts memory | `<project>/memory/projects/<role>.md`, in the project's own repo | That project's specific context for the role. Starts empty. The feature lane only knows where to look. |
| Notion | per project | Product truth: Data Model, locked decisions, coding standards, Decisions Log. Agents read it. They do not store judgment there. |

Judgment never goes into Notion, and truth never goes into judgment memory.

Write-back on council decisions proposes a split between the global and the project file, shown inline with the decision, and never blocks the workflow. See `mechanisms/council/RUNNER.md`.

Create the empty per-project files with `scripts/init-project.sh <project-repo>`.

## Not decided

The internal format of a memory file. The seed files here are headers only. Entries the runners append use the provisional shape in `mechanisms/council/RUNNER.md` until the format is decided (`DESIGN.md` section 9).
