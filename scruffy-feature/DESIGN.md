# Taimi — Design Document

A general-purpose, project-agnostic agent-company workflow for **feature development**. Amel acts as CEO: he decides what gets built, the company builds it, he tests the result.

Status: design only. Nothing here is built yet.

---

## 1. Origin and relationship to Scruffy

*Superseded 2026-10-12: Taimi is now Scruffy's feature lane.*

Amel is splitting his existing Scruffy skillset (github.com/Amel-DZRV/Scruffy) into two tools that evolve independently:

| Tool | Scope |
|---|---|
| **Scruffy** | Bugs only. Its current `bug-eater` lane becomes all of Scruffy. Keeps its own copy of verification logic. |
| **Taimi** | Features only. New repo. Starting material is forked from Scruffy's current `feature-dev` and `verification` skills. |

- **Project-agnostic.** Taimi is meant to be reused on any project, not tied to Relentless.

What Taimi inherits from Scruffy's `feature-dev` (kept as the mechanical backbone): spec with acceptance criteria and non-goals, red-first acceptance tests, vertical-slice plans with per-step `what / files / criteria / depends on`, one commit per step, fresh-context review, and the proof tiers `MERGE-READY` / `REVIEW NEEDED` / `PROOF INCOMPLETE`.

What is new in Taimi: the standing council agents in front of design, per-platform role mirroring, the digital-CEO observer, a docs-keeper that keeps documentation current, and the auto-merge plus weekly-release back end.

---

## 2. Overall flow

Sequential, with the CEO as the final authority at every decision point.

1. **Amel (CEO)** has a feature idea.
2. The idea goes to the **Product/Business Council**.
3. The resulting vision goes to the **Design/Architecture Council**.
4. **Chief of Engineering** checks that cross-platform seams and contracts agree.
5. **Platform Architects** write implementation-detail plans for their own platform.
6. Per-platform **Team Leads** run developer benches, parallelizing tracks whenever the dependency graph allows. Serial only when the work cannot be split without conflicts.
7. Per-platform **Reviewers** check code and convention-fit step by step as developers commit, backed by linters and formatters for everything mechanical.
8. Per-platform **QA** runs acceptance tests, screenshot-vs-design comparison and accessibility tree checks.
9. **Chief of Engineering** reconciles QA verdicts across platforms for cross-platform features.
10. A **PR opens**, using the PR format in section 8.
11. **Auto-merge**, gated strictly on a `MERGE-READY` verdict (not merely green tests).
12. **Weekly build** with an auto-generated changelog, instead of a build per task.

**Docs-keeper step:** after every lock point above (council decisions, Chief of Engineering's seam sign-off, acceptance criteria lock), the Docs-Keeper fires as an explicit step. See section 6.

CEO touchpoints:
- A council disagreement (section 4) lands on his desk.
- The approved plan needs his "go" before anything is built. This is carried over from Scruffy's feature-dev plan-review stop, where nothing is built until he says go.
- Manual testing happens in the app after QA is done and the weekly build exists.

---

## 3. Roles

Roles are **standing agents** with their own memory, skills, tools, tasks and pre-work routines. They are not stateless prompt personas. This is a deliberate step up from Scruffy, where every run starts from nothing.

### Business side

- **Product Manager**: user value, scope, fit with the product vision.
- **Business Manager**: monetization fit, tier placement, effort versus payoff.

### Engineering side

- **Chief of Engineering**: the cross-platform judgment layer.
  - Reconciles platform architects on cross-platform features.
  - Signs off that the platform plans agree at the seams (same contract, data shape, assumptions) before team leads start.
  - Reconciles QA verdicts across platforms at the end.
  - Receives escalations from team leads if a seam needs to change mid-build.
- **Designer**: proposes UI/UX. Paired with the architects. The pair is more complementary than adversarial in practice: the historical friction was expensive animation ideas versus engineering effort, not real architectural conflict.
- **Platform Architects**: one per platform.
  - **Mobile**: iOS and Android combined. One shared codebase; platform-specific code is the rare exception, not the rule.
  - **Web**.
  - **Backend**.
  - Each writes the implementation-detail plan for their platform once the high-level design is approved.
- **Team Leads**: one per platform. Takes the architect's plan, runs developer agents, parallelizes by default, coordinates that platform's Reviewer and QA.
- **Developers**: implementer agents spun up per track under each Team Lead.
- **Reviewers**: one per platform, distinct from QA.
  - Reviews step by step for convention and grain-fit: what a linter cannot catch (does it match the surrounding design, is it the pattern a human would choose, is there leftover scaffolding).
  - Lint, format and pre-commit hooks handle the mechanical layer first.
  - Kept separate from QA so one role is not pulled between "meets criteria" and "is good code". Whichever concern is considered first tends to crowd out the other.
- **QA**: one per platform, not shared, because toolchains differ (mobile: simulator, screenshots, accessibility tree; backend: API contracts, data integrity). Owns:
  - Acceptance tests, written red-first from locked acceptance criteria.
  - Screenshot-vs-mock comparison.
  - Accessibility tree inspection.
  - Scope-drift check: nothing outside the criteria changed.
  - Static analysis and dead-code check.
  - Process-death and backgrounding tests for stateful features.
  - No Chief of QA for now. Not justified until QA verdicts actually fork inconsistently. Chief of Engineering reconciles instead.

### Digital CEO / Chief of Staff

- **Phase 1: silent observer.** Logs every real CEO decision as training data: what the council proposed, what Amel actually chose, ideally why. No authority.
- **Phase 2: visible fourth council voice.** Once it has a track record, it appears in the council predicting what Amel would decide.
- **Never a tiebreaker.** The synthesis step does not weigh its vote. Amel always makes the final call.
- **Purpose:** let Amel watch its accuracy over time, before ever considering giving it weight.

### Docs-Keeper

- A dedicated agent that keeps documentation current. Adopted, not deferred.
- Fires as an explicit step after every lock point in the workflow (council decisions, Chief of Engineering's seam sign-off, acceptance criteria lock, and so on). It is not a background sweep.
- Proposes the doc edit and writes it straight through. No CEO sign-off gate: Amel gates what gets built, not paperwork that follows from decisions he already made.

---

## 4. Council mechanism

One shared, generic mechanism, built once and used for both **Product/Business** and **Design/Architecture**. It is parameterized by persona set, not duplicated.

- Takes N agents' positions plus a synthesis step.
- On disagreement Amel sees **three things**:
  1. One side's position and reasoning.
  2. The other side's position and reasoning.
  3. A synthesis agent's attempt at one converged recommendation (a real recommendation, not an averaged blend).
- Amel's decision is the **fourth and final input**.
- The decision is written back into the memory of the disagreeing agents as a lesson. The goal is to teach them how Amel thinks about the product and the company, and for Amel to learn from their reasoning in return.
- Intent: eventually graduate pairs, Design/Architect first, toward more autonomous resolution once enough disagreements have been absorbed.
- The same three-artifact pattern is used for Design/Architect even though disagreement there is expected to be rarer. The point is the training signal, not the disagreement rate.

---

## 5. Design principles

- **Per-platform mirroring.** Architect, Team Lead, Reviewer and QA are all split per platform, for the same reason each time: distinct toolchains and conventions, and overload risk if combined. Chief of Engineering is the one consistent reconciliation point.
- **Memory where judgment should compound.** Standing, memory-bearing agents are used where accumulated context makes judgment better: Product, Business, Digital CEO, and eventually Design/Architect. Roles whose job is the same every time (for example a reviewer) lean on written conventions rather than memory.
- **Auto-merge is a deliberate risk.** Amel is choosing it as a solo developer who wants a workflow he can rely on, and plans to loosen or tighten based on observed failures. Guardrails:
  - `MERGE-READY` gating is firm. Scruffy's tiers already distinguish it from `REVIEW NEEDED` and `PROOF INCOMPLETE`; in Taimi the verdict must actually block the merge, not only label the PR.
  - Small PRs plus a ledger of what merged and when keep a bad merge cheaply revertible (one-command undo, not a forensic hunt).
- **Weekly build, not per-task.** Weekly build plus auto-changelog respects the EAS free-tier budget, matching Amel's existing batching practice.
- **Proof, not assertion.** Inherited from Scruffy: nothing is called verified without output that can be pointed at.

---

## 6. Documentation and freshness

Stale documentation is a core failure mode: a doc says one thing, the code says another, and every downstream agent trusts the doc.

- **Dedicated owner.** The role that makes a decision is optimized for making it well, not for noticing every doc the decision touches, which is how drift happens even with good intentions. A separate Docs-Keeper owns propagation, mirroring why verification is separate from the implementer. The relevant architect can review accuracy afterwards but does not have to remember to do the update.
- **Explicit and synchronous.** The Docs-Keeper fires right after every lock point rather than as a periodic sweep. A background sweep risks catching a doc mid-edit or missing a decision that was reverted before the sweep ran. Synchronous means a doc is never more than one step stale.
- **Writes through directly.** No CEO sign-off gate.
- **Home: Notion, not markdown-in-repo.** Chosen because Notion is already connected as a tool agents can write to directly, so no new integration is needed. One workspace, each project as a page under "Projects"; each project's root page is the hub and wins on conflict. Known tradeoff: Notion is less naturally "one doc wins over another" than markdown with explicit precedence statements, so precedence is recreated through the page hierarchy.

---

## 7. Repository layout

### Taimi's own repo

```
taimi/
├── roles/
│   ├── product-manager/
│   ├── business-manager/
│   ├── chief-of-engineering/
│   ├── designer/
│   ├── mobile-architect/
│   ├── web-architect/
│   ├── backend-architect/
│   ├── team-lead-mobile/
│   ├── team-lead-web/
│   ├── team-lead-backend/
│   ├── developer/
│   ├── reviewer-mobile/
│   ├── reviewer-web/
│   ├── reviewer-backend/
│   ├── qa-mobile/
│   ├── qa-web/
│   ├── qa-backend/
│   ├── docs-keeper/
│   └── digital-ceo/
├── memory/
│   └── global/
│       └── <role>.md        one file per role folder above
└── mechanisms/
    ├── council/             shared council runner
    └── pipeline/            shared per-platform pipeline runner
```

- **`roles/`**: one folder per role. Each is pure definition, project-agnostic, and holds exactly three files:
  - `persona.md`: how the role thinks, its priorities and biases.
  - `skills.md`: the frameworks and skill references it draws on.
  - `tools.md`: what it is allowed to call.
- **`memory/global/`**: one file per role, holding that role's durable, cross-project judgment memory. This is the only memory that lives inside Taimi's repo, because it is about Amel's judgment, not any one project.
- **`mechanisms/`**: the shared council runner and the per-platform pipeline runner, built once. Each takes a role folder as input rather than hardcoding any specific role.

The platform-split roles (architect, team lead, reviewer, QA) each get a folder per platform, matching the per-platform mirroring in section 5. There is a single `developer` role: platform-specific conventions come from the project's own standards, not from separate developer definitions.

### Each project's own repo (Relentless, or a future project)

```
<project>/
└── memory/
    └── projects/
        └── <role>.md        one file per role
```

- Each file holds that project's specific facts for the role only. A new project starts these files empty.
- Taimi reads from here. These files never live inside Taimi's repo.

### Why this split

`roles/` stays pure and reusable across any project, because nothing project-specific ever accumulates there. Only `memory/global/` (Amel's judgment) and the per-project files in each project's own repo change over time. The role-level specification that these files are written from is in `ROLES.md`.

---

## 8. PR format

Status: **drafted, awaiting Amel's confirmation.** It is Scruffy's feature-dev PR body, adapted for Taimi's situation: no external reviewer, auto-merge on a verdict, and a weekly build that reads a changelog.

The PR body is read by Amel after the fact and by future-Amel, not by a stranger. It also has one machine-readable job: auto-merge gates on the verdict, so the verdict comes first.

### Rules

- **Ready for review, not draft.** Scruffy opens drafts, but GitHub auto-merge does not apply to draft PRs, so Taimi PRs open ready.
- **No reviewers assigned.** There is no external reviewer.
- **Auto-merge eligibility.** Only a `MERGE-READY` verdict is eligible. `REVIEW NEEDED` and `PROOF INCOMPLETE` PRs stay open for Amel.
- **One feature per PR, kept small**, so a bad merge is a one-command revert.

### Body, in order

1. **Verdict.** First line: `MERGE-READY`, `REVIEW NEEDED` or `PROOF INCOMPLETE`.
2. **What this adds.** One line, in the words of someone who wants it, not someone who built it.
3. **Why.** The problem it solves, with a link to the Decisions Log row (or council outcome) that approved it.
4. **Proof block.** Pasted verbatim from QA: verdict tier, claims table with commit hashes, the command to replay it, and the mandatory `Not proven` line. For a cross-platform feature this carries the Chief of Engineering's reconciled verdict.
5. **Acceptance criteria.** A table of each criterion and the passing test that proves it, by name. For a cross-platform feature, split by platform.
6. **Non-goals.** What this deliberately does not do. Pre-empts the "shouldn't it also…" question.
7. **Design.** Two or three sentences, and the rejected alternative with the trade-off when a council disagreement or a real alternative existed.
8. **Blast radius.** What reads this and what it changes. Say plainly when it only adds. For cross-platform work, name the contract at the seam and that the Chief of Engineering signed off.
9. **Evidence.** Screenshots against the design mock from QA's captured pair, and the accessibility tree result, for anything visual. A non-UI change says so in one line.
10. **Assumptions.** One line each wherever the spec was inferred rather than stated.
11. **Unverified criteria.** Named. A PR quiet about what it could not verify is worse than one that admits it.
12. **Review log.** The count of Reviewer findings resolved, plus any Minor findings carried forward.
13. **Docs updated.** The Notion pages and Decisions Log rows the Docs-Keeper changed for this feature.
14. **How to test by hand.** Replaces Scruffy's "how to review". Amel tests manually in the weekly build, so: the screen to open, the device, and what to try.
15. **How to revert.** The one-command undo: a revert of the merge commit, or the flag or config if the repo already uses one.
16. **Follow-ups.** Linked tickets for everything deliberately deferred.
17. **Changelog line.** One user-facing sentence. The weekly build collects these into the changelog.

---

## 9. Open items

Explicitly unresolved. Nothing below has been decided.

- **PR format confirmation**: section 8 is a draft awaiting Amel's confirmation, including whether the full structure is kept or trimmed.
- **Cross-platform PRs**: whether a feature spanning several platforms is one PR or one per platform.
- **Auto-merge wiring**: how the `MERGE-READY` verdict becomes a required check that actually blocks the merge (branch protection with a required status), and verifying that auto-merge works with the chosen PR state.
- **Self-learning engine**: how agents learn what works across multiple projects, covering both judgment lessons and purely mechanical preferences. Parked as a named topic for a later session.
- **Agent memory file format**: where memory lives is decided (section 7); the format of a memory file is not.
- **Graduation to autonomy**: whether and how Design/Architect (or other pairs) move to full autonomy, and the threshold for that.
- **Deferred: the broader "full company"** (marketing, content strategist, data analyst, release engineer, privacy/compliance). Discussed and explicitly deferred. Not justified without real users or data, and not part of Taimi's first build.
