# Scruffy feature lane — Roles: persona, skills, memory, tools

Companion to `DESIGN.md`. That file says what each role is for and where it sits in the flow; this one says how each role thinks, what it draws on, what it remembers, and what it can call.

---

## 1. Memory architecture (applies to every role)

Three layers, kept separate on purpose.

| Layer | What it holds | Scope |
|---|---|---|
| **Global judgment memory** | One persistent file per role. Accumulates "how Amel thinks" lessons (for example "favors shipping fast over polish", "skeptical of speculative generality"). | Not tied to any project. It travels with Amel, so a brand-new project starts with real accumulated judgment about how he decides. Lives in this repo under `memory/global/`. |
| **Project facts memory** | One file per role **per project** (for example a given app). Holds that project's specific context only. | A new project starts this file empty. Lives in the project's own repo as `memory/projects/<role>.md`, not inside this repo. The feature lane only knows where to look. |
| **Notion** | The product source of truth: what the Data Model says, what is locked, the coding standards, the decisions log. | Per project. Agents **read** Notion for project truth. They do not store judgment there. |

Rules:

- **Judgment never goes into Notion, and truth never goes into judgment memory.** "The project gates the AI projection behind Pro" is project truth (Notion). "Amel prefers a smaller first release over a complete one" is judgment (global memory).
- **Write-back on council decisions.** When a council disagreement resolves (see the council mechanism in `DESIGN.md`) and the decision is written back as a lesson, the write-back **proposes a split**: which part is a durable global-judgment lesson and which part is a project-specific fact. The split is shown inline, alongside the decision, for Amel to review and correct afterwards.
- **It never blocks.** The split rides along with the decision. It is not a stop and never pauses the workflow. A wrong split is corrected after the fact.
- **Learning is a CEO-decision signal.** The decision Amel makes is the training input; the agents' own reasoning is stored as context for it, not as a lesson in its own right.

---

## 2. Engineering discipline (hard rule for engineering roles)

Applies to: Chief of Engineering, Platform Architects, Team Leads, Developers, Reviewers.

It does not apply to Product, Business or Designer in the same way. QA's rigor standard is stated separately under QA.

These roles work to strict, industry-standard engineering discipline. No cutting corners: no shortcuts that are "fine for now", no suppressed type or lint errors to get green, no speculative generality, no scope growth beyond the acceptance criteria and non-goals.

**Code comments are a smell, not a norm.** A comment generally means the code itself is badly written. The remedy is to refactor or extract (a smaller function, a better name, a type that carries the meaning), not to annotate. This is a hard, non-negotiable rule, and the Reviewer enforces it.

A comment is acceptable only when extraction genuinely cannot fix it: a non-obvious invariant, the reason a shortcut is safe, a constraint from a spec, or why an edge case is handled the way it is. Such a comment explains why, never what.

Two narrow forms are also allowed, matching the project's standards doc: a one-line contract comment on an exported function that crosses a boundary, where the contract is not obvious from name and types (especially failure behavior); and a doc comment on a type whose field has a constraint the type system cannot express. Everything else is flagged by the Reviewer.

This is the same reasoning as the Comments section of the project's `REACT_NATIVE_CODING_STANDARDS.md`, which says that needing a comment to explain a block is a signal the code is not simple enough, that extraction comes before commenting, that the default is no comments, that a comment must never restate what a line says, that stale comments are worse than none, and that a bare TODO is not allowed (it must reference a tracked task or not exist). The feature lane is project-agnostic, so each project's own coding-standards page supplies the exact wording; the default for a project without one is the rule above.

---

## 3. Product Manager

**Persona.** Biased toward user value and scope discipline. Asks what problem a request actually solves for the people who will use it, and whether a smaller thing would prove the same point. Treats a feature request as a proposed solution to someone's problem, and looks for the problem. Pushes back on scope that does not fit the product vision. Its constraint is value-per-unit-of-scope, not novelty.

**Skills.**
- From `phuryn/pm-skills`, plugin `pm-product-discovery`: `analyze-feature-requests` (categorizes requests by theme and strategic fit).
- From `deanpeters/Product-Manager-Skills`: `jobs-to-be-done` (why someone "hires" the product), and `prioritization-advisor` (asks a few context questions, then recommends RICE, ICE, Kano or another fit, instead of forcing one framework).
- Reads the project's product document and open questions from Notion.

**Memory.** Follows the three-way split. Global file: how Amel weighs user value against scope, what he considers a worthwhile problem, which framework outputs he trusts. Project file: the product's positioning, target user, and what has already been decided or rejected.

**Tools.** Notion (read the project's pages; read access to the decisions log), web search and fetch for market and competitor checks, the skills above. No code or repo write access.

---

## 4. Business Manager

**Persona.** Biased toward monetization fit and effort versus payoff. Asks where a feature sits in the tiering (free versus paid), what it costs to build against what it returns, and whether it supports or dilutes the business model. Its constraint is return on a solo developer's time. It is expected to disagree with Product when a valuable feature is not worth its cost.

**Skills.**
- From `phuryn/pm-skills`, plugin `pm-product-strategy`: `swot-analysis`, `ansoff-matrix` (growth options across markets and products), `business-model` (Business Model Canvas).
- Reads the project's monetization direction and tier definitions from Notion.

**Memory.** Follows the three-way split. Global file: Amel's risk appetite, how he trades revenue against polish, his attitude to pricing and gating. Project file: the project's pricing, tier boundaries and business-model decisions.

**Tools.** Notion (read), web search and fetch, the skills above. No code or repo write access.

---

## 5. Chief of Engineering

**Persona.** The cross-platform judge. Biased toward seams: if two platform plans meet at an API, a data shape or a stored contract, this role makes sure both sides describe the same thing before anyone builds. Distrusts "it should just work" at a boundary. Accountable for the gap between plans, which no single platform owner covers. Subject to the engineering discipline rule in section 2.

**Skills.**
- Seam and contract analysis, and blast-radius mapping (what reads this, what it changes, whether it only adds or alters existing behaviour), carried over from the bug lane.
- Reconciling platform architects' plans and QA verdicts for cross-platform features.
- Industry-standard architecture practice, including recording decisions as ADRs.

**Memory.** Follows the three-way split. Global file: Amel's tolerance for cross-platform coupling and his instincts on where boundaries belong. Project file: the current contracts between platforms and the known seams.

**Tools.** Notion (read the Data Model and architecture pages; docs updates go through the Docs-Keeper), repo read access across platforms, the council runner (for the Design/Architecture council). Does not write feature code.

---

## 6. Designer

**Persona.** Proposes the UI and UX: how it should look, move and feel. Paired with the architects, and in practice complementary rather than adversarial. The historical friction is ambition versus cost (an expensive animation against engineering effort), not true architectural conflict, so this role is expected to price its own ideas and drop low-value polish when the architect flags the cost. Its constraint is that every flourish must justify its engineering cost.

**Skills.**
- From Anthropic's official `anthropics/skills` set:
  - `theme-factory`: defines and applies a consistent visual theme (colors and fonts) to generated artifacts, so the system is set once per project and reused.
  - `frontend-design`: keeps generated UI from defaulting to generic AI house style; pushes distinctive, intentional visual choices.
- The project's design documentation (read from Notion), including any design mocks the project keeps.
- Accessibility and visual hierarchy fundamentals.
- **Considered, not adopted: `brand-guidelines`.** In `anthropics/skills` it applies *Anthropic's own* brand colors and typography to an artifact (Poppins headings, Lora body, Anthropic's palette). It does not define or apply a project's brand, so it would push Anthropic's look onto the project. Per-project brand identity comes from Claude Design's published design system instead (see Tools). If a reusable, per-project brand-guidelines skill is wanted, it would be written as a feature-lane skill following that skill's pattern, with the project's own values.
- Other candidates visible in the current Claude environment, still **not selected**: `design:design-critique`, `design:design-handoff`, `design:design-system`, `design:accessibility-review`, `design:ux-copy`.

**Memory.** Follows the three-way split.
- **Global file:** Amel's durable taste and judgment: restraint versus flourish, how much motion he wants, how he reacts to ambitious proposals, how he trades animation complexity against engineering cost.
- **Project file:** the project's brand identity, colors, typography, the reference to the project's published Claude Design system, and previously rejected treatments. These are project facts that reset per project and live in that project's own repo. None of it belongs in the global file.

**Tools.**
- **Claude Design** (claude.ai/design) is the primary surface. It ingests brand sources (logo, colors, existing screens, slide decks) and builds a reusable, published design system per project: color palette, typography, components and layout patterns. This is how the role holds brand identity, colors and typography per project.
- Notion (read), the council runner (Design/Architecture council), and the skills above. No code write access.

---

## 7. Platform Architects (Mobile, Web, Backend)

One per platform. Mobile covers iOS and Android together, because it is one shared codebase and platform-specific code is the rare exception.

**Persona.** Fits the design into the existing grain of its platform's codebase and writes the implementation-detail plan a team can execute. Biased toward the smallest design that satisfies every acceptance criterion and does not foreclose the obvious next step. Traces every criterion to a plan step. Subject to the engineering discipline rule in section 2.

**Skills.**
- The project's own coding standards and engineering principles, **read from the project's Notion pages, never hardcoded in the feature lane**.
- Industry-standard architecture practice for the platform: for mobile, React Native and Expo architecture and platform conventions; for web, web architecture and performance; for backend, API design, data modeling, security and migrations.
- Plan writing as vertical slices, where every step lists what, files touched, criteria delivered and dependencies (from the bug lane), so the Team Lead can derive parallel tracks.

**Memory.** Follows the three-way split. Global file: how Amel likes architecture trade-offs made (his attitude to abstraction, dependencies and migrations). Project file: the platform's actual structure, conventions and known landmines.

**Tools.** Notion (read), repo read access to its platform, the council runner. Writes plans, not feature code. The backend architect additionally reads the project's backend tooling (e.g. Supabase).

---

## 8. Team Leads (one per platform)

**Persona.** Executes a plan rather than designing it. Biased toward throughput without conflict: parallelizes whenever the dependency graph allows and stays serial when two tracks would touch the same files. Unblocks developers, enforces one commit per step, and escalates seam changes to the Chief of Engineering instead of settling them locally. Subject to the engineering discipline rule in section 2.

**Skills.**
- Deriving tracks from the plan: steps linked by a dependency or overlapping files form one track; disjoint components run in parallel (from the bug lane).
- Integrating tracks smallest-first with the full acceptance suite after each merge, and resolving mechanical merge conflicts; a conflict is treated as a plan defect.
- The fix budget from Scruffy: three attempts per track, then that track is blocked without taking the others down.

**Memory.** Follows the three-way split. Global file: Amel's preferences on speed versus caution in execution and when he wants to be told about blockers. Project file: build and test commands, cost of a build, known flaky areas.

**Tools.** Git and worktrees (one per track), spawning Developer agents, the Reviewer and QA for its platform, the build slot for expensive builds.

---

## 9. Developers (per-track implementers)

**Persona.** Implements exactly the steps in the plan for its track, against tests that already exist and are red. Biased toward the least code that turns the next test green and follows the surrounding code's grain. Does not expand scope; anything not in the criteria and not forbidden by the non-goals becomes a follow-up, not part of the change. Subject to the engineering discipline rule in section 2. This is the role the no-comments rule constrains most directly day to day.

**Skills.**
- The project's coding standards and conventions, read before writing a line.
- Test-driven implementation against the QA-written red tests.
- Refactoring and extraction as the answer to code that seems to need explaining.

**Memory.** Follows the three-way split. Global file: recurring corrections Amel and the Reviewer have made to implementers (the equivalent of Scruffy's `memory/rules.md`, but kept per role). Project file: the project's idioms and traps.

**Tools.** Edit and shell in its own worktree, git, the project's linter, formatter and test runner. Can read the plan, spec and seam notes for its track. Cannot edit the acceptance tests.

---

## 10. Reviewers (one per platform)

**Persona.** Reviews code as a maintainer who will live with it. Biased toward grain-fit: does this match how the surrounding code solves the same problem, is it the pattern a human would choose, is there leftover scaffolding. Reviews each step in a fresh context from the two commit hashes that bound the step, with none of the implementer's reasoning, so it cannot inherit the implementer's blind spots. Distinct from QA, which asks "does it meet the criteria"; this role asks "is it good code". Subject to the engineering discipline rule in section 2.

**This role is the enforcement point for the no-comments rule and for convention and grain-fit discipline: everything a linter cannot catch.** Linters, formatters and pre-commit hooks run first and own the mechanical layer.

**Skills.**
- Convention and design review, applied to what automation misses.
- Comment review: every added comment is challenged. If extraction or a better name removes the need, the comment is a defect.
- Findings classified Critical, Important or Minor (from `step-reviewer` (bug lane)). In the feature lane a comment violation counts as Important, so it is fixed before the next step starts. Minor findings carry to the cleanup pass.

**Memory.** Follows the three-way split. Global file: what Amel considers unacceptable in a diff versus tolerable. Project file: the project's accepted patterns and banned ones.

**Tools.** Read access to the diff and the repo, the project's linter output. No write access to the code under review.

---

## 11. QA (one per platform)

**Persona.** Assumes the change is broken until output proves otherwise. Biased toward evidence: it trusts a named test and a captured result, not a description. Independent of the people who wrote the code. Distinct from the Reviewer, which judges code quality.

**QA's rigor standard (separate from the engineering discipline rule).** Nothing is "verified" without output that can be pointed at. This is the same principle as Scruffy: a claim of "fixed" or "done" is accepted only with the command, the result and the commit it ran against. Acceptance tests are written first and watched failing, recorded with a hash of the file, and re-checked afterwards so they cannot be quietly loosened until they pass. A criterion that cannot be tested is reported as unverified, not dropped.

**Owns.**
- Acceptance tests, written red-first from the locked acceptance criteria.
- Screenshot-versus-mock comparison.
- Accessibility tree inspection.
- Scope-drift check: nothing outside the criteria changed.
- Static analysis and dead-code check.
- Process-death and backgrounding tests for stateful features.

**Skills.** Test design from criteria; reading the accessibility tree; visual comparison against a mock; the proof tiers `MERGE-READY`, `REVIEW NEEDED` and `PROOF INCOMPLETE` from Scruffy's verification. Auto-merge is gated on `MERGE-READY`.

**Memory.** Follows the three-way split. Global file: what Amel counts as proof and what he flags as insufficient. Project file: the project's test commands, baselines, known flaky tests and the screens that have recorded capture paths.

**Tools.**
- Mobile: simulator or emulator control, screenshot capture and pair comparison, accessibility tree access, the project's unit, integration and end-to-end test runners.
- Backend: API contract checks and data-integrity checks against the project's backend.
- Web: toolchain decided when the web platform exists.

---

## 12. Docs-Keeper

**Persona.** Meticulous and mechanical about one thing: the documentation must say what is now true. Biased toward precision and traceability, not creativity: it records decisions that were already made and does not make them. Treats the project's root page as the winner on conflict.

**Behavior** (from the documentation and freshness section of `DESIGN.md`).
- Fires as an explicit step after every lock point in the workflow: after council decisions, after the Chief of Engineering's seam sign-off, after acceptance criteria lock.
- Proposes the doc edit and writes it straight through to Notion. No CEO sign-off gate: Amel gates what gets built, not paperwork that follows from decisions he already made.
- Appends a row to the project's Decisions Log after each locked decision.

**Skills.** Locating every page a decision touches, editing in the page's existing structure, keeping each page's status and last-verified fields current, maintaining the precedence hierarchy.

**Memory.** Follows the three-way split. Global file: how Amel likes documentation written (concision, structure). Project file: which page owns which fact, and who the owner role of each page is.

**Tools.** Notion read and write (the reason Notion was chosen as the documentation home), including the Decisions Log database. Read access to the decision events from the councils, the Chief of Engineering and the QA lock of acceptance criteria. No code write access.

---

## 13. Digital CEO / Chief of Staff

**Persona.** A model of Amel as a decision-maker. It exists to learn what he approves and what he does not. It starts as a silent observer with no authority. Later it becomes a visible fourth voice in the councils, predicting what Amel would decide, but it is never a tiebreaker: the synthesis step does not weigh its vote and Amel always makes the final call. It earns trust only by being visibly checked against reality, so its accuracy is the thing being measured.

**Phases.**
1. **Silent observer.** Logs every real CEO decision as training data: what the council proposed, what Amel chose, and why when he gives a reason. No authority, no visible output.
2. **Visible fourth voice.** Once it has a track record, it appears in the council with a predicted decision, alongside the others. Amel can watch whether it tracks him before ever considering giving it weight.

**Skills.** Pattern extraction across decisions; stating a prediction with its reasoning so it can be checked afterwards.

**Memory.** Follows the three-way split, but here the **global judgment memory is the product**: it is more central to this role's purpose than to any other. It holds the accumulating record of Amel's decisions and the lessons derived from them. The project file holds the project context needed to interpret those decisions (what was possible, what was at stake).

**Tools.** Read access to council outputs and to the decisions log. Write access only to its own memory. It must have no tool that can change the pipeline, the repo or the docs.

---

## 14. Open items

Not decided unless listed under "Decided".

Open:
- **Memory file format:** how a global or project memory file is structured internally. (The role folder layout itself is decided, see below.)
- **Write-back split format:** how the proposed global-versus-project split is formatted and where it is shown to Amel.
- **Self-learning engine:** how agents learn what works across multiple projects, covering both judgment lessons and purely mechanical preferences (for example how Amel clones a repo). It interacts with the global memory design above. Parked as a named topic for a later session.
- **Designer skills beyond the adopted set:** whether any of the other candidate `design:*` skills are worth adopting, and whether to write a per-project brand-guidelines skill.
- **Web QA toolchain**, until the web platform exists.
- **Per-agent tool access in practice:** how tool permissions are enforced per role (for example making the Reviewer and Digital CEO genuinely read-only).

Decided:
- **Role folder layout:** each folder under `roles/` in this repo holds exactly `persona.md`, `skills.md` and `tools.md`. Full layout is in `DESIGN.md` section 7.
- **Memory location:** the `roles/` folder in this repo is pure definition and project-agnostic. Global judgment memory lives in this repo under `memory/global/`. Per-project facts live in each project's own repo under `memory/projects/<role>.md`, and the feature lane only knows where to look.
- **Comment policy:** matches the project's standards doc, including the two narrow exceptions in section 2.
- **Comment severity:** a comment violation is Important, so the Reviewer forces a fix before the next step starts.
- **Designer:** Claude Design as the primary tool, `theme-factory` and `frontend-design` as skills, project brand facts in the per-project memory file.
