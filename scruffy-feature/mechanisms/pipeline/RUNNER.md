# Pipeline runner

The shared per-platform pipeline, built once. It takes a `platform` and resolves the role folders from it; it hardcodes no specific role. The mechanical backbone is red-first acceptance tests, vertical-slice plans, one commit per step, fresh-context review and proof tiers.

Two parts:

- **Part A, per platform** (steps 1 to 5): from locked criteria to a verified platform branch. Run once per platform the feature touches, in parallel across platforms.
- **Part B, per feature** (steps 6 to 9): from verified branch(es) to PR, auto-merge and the weekly release (both `owned: yes` only). Run once.

## Input

| Field | Meaning |
|---|---|
| `platform` | `mobile`, `web` or `backend`. Resolves `team-lead-<platform>`, `reviewer-<platform>`, `qa-<platform>`, `<platform>-architect`, plus the single `developer`. |
| `feature_key` | Short slug. Names branches. The dossier is `<KEY>`, from the dispatcher (see `run_dir`). |
| `run_dir` | `~/Projects/tickets/<KEY>/`: `spec.md`, `seam.md`, `plan-<platform>.md`, `state.md` (carries `owned: yes | no`), `evidence/`. |
| `project` | Project repo path (`repo_path:` in `state.md`; `repo:` is its name, for `../memory/<repo>/`). `owned: yes` → its `memory/projects/` files and Notion hub page. `owned: no` → `../memory/<repo>/` and the repo's own docs. |
| `spec` | What, why, acceptance criteria (locked), non-goals. |
| `plan` | The architect's plan for this platform. Every step has what / files / criteria / depends on. |

**Preconditions, checked first.** A missing one stops the platform with `blocked` naming it:

1. The plan package has an explicit "go" from Amel (the go gate in `SKILL.md`).
2. The acceptance criteria are locked and the Docs-Keeper has recorded the lock.
3. The Chief of Engineering has signed off the seams, for a cross-platform feature.
4. Every plan step has all four fields. A step whose files cannot be named yet is not yet a step; send it back to the architect.

## Building a role's prompt

For every agent this runner dispatches, compose in this order:

1. `roles/<role>/persona.md`, `skills.md`, `tools.md`
2. `rules/engineering-discipline.md`, for the engineering roles it applies to (Team Lead, Developer, Reviewer)
3. `memory/global/<role>.md`
4. `<project>/memory/projects/<role>.md` (`owned: yes`); `../memory/<repo>/recipes/` (`owned: no`)
5. The project's coding standards, read from Notion (`owned: yes`); from the repo's own docs (`owned: no`)
6. The task packet for that step

An agent receives only its packet. The tools it is given are exactly those in its `tools.md`: the Reviewer and the audit-mode QA get no write access to the code under review, and the Digital CEO is never dispatched by this runner.

---

# Part A: per platform

## 1. Platform branch and worktree

Create the platform branch `<feature-key>-<platform>` in its own worktree per `mechanisms/pipeline/references/worktrees.md`. Run the project's dependency install if the toolchain needs it.

Discover the economics (cheap or expensive loop) and run the baseline, per `mechanisms/pipeline/references/verification.md`. The Team Lead's project memory may already carry them. Record in `state.md`.

## 2. Acceptance tests, red first

Dispatch `qa-<platform>` in **Author mode** (`mechanisms/pipeline/references/verification.md`): one test per acceptance criterion for this platform, every one watched failing, hashed, and committed on their own before any implementation. History reads `parent → tests → implementation`.

- A test that will not go red means the behaviour already exists. Stop and send it back to the architect.
- A criterion with no testable seam is named as unverified. It is never dropped.

## 3. Implement, orchestrated

The main thread composes `team-lead-<platform>` and, as it, derives tracks and dispatches one `developer` per track, per `../shared/orchestration.md`: one commit per step, `reviewer-<platform>` between steps in a fresh context, the track's acceptance tests after every step, integration smallest-track-first.

Scope while building. Anything a Developer wants to add:

- In the acceptance criteria → build it.
- In the non-goals → do not, however small it looks.
- Neither → a follow-up ticket, linked. Not this PR.

Seam changes go to the Chief of Engineering, not settled locally. A seam change is a new lock point and the Docs-Keeper fires after it.

The mechanical layer (lint, format, pre-commit hooks) runs before every review. No suppressed errors to get green.

`[DEBUG-*]` probes are prefixed, investigation only, never in the final diff.

## 4. Clean up

The Team Lead, before handing over:

- Every `[DEBUG-*]` probe gone, verified by reading the diff.
- Dead ends removed: abandoned scaffolding from an early step that a later step made unnecessary.
- Carried-forward Minor Reviewer findings fixed or listed.
- The diff re-read against the engineering discipline rule, including comments.

Any edit beyond comments and prints sends the platform back through the Reviewer (step 3) and the audit (step 5).

## 5. Verify

Dispatch `qa-<platform>` in **Audit mode** with the packet from `mechanisms/pipeline/references/verification.md`: SHAs, test files and hashes, commands, baseline, criteria and non-goals. Not the plan, the seam notes, or the Developers' reports. It returns the proof block, the criterion table, the verdict tier and one line per failed or unrunnable claim.

The Team Lead decides what a failed claim is: a fix attempt (counted against the track's budget of three), a design attempt, or a process failure (no retry loop; the platform ends with proof marked incomplete and the failing check named). It writes the fail memo per `../shared/orchestration.md` §Fail memo first.

Output of Part A: the verified platform branch, its proof block, its verdict, `state.md` updated.

---

# Part B: per feature

Run after every touched platform has finished Part A.

## 6. Assemble and reconcile

- **One platform:** its branch is the feature branch.
- **Several platforms:** one feature, one PR. Merge the platform branches into `scruffy/<feature-key>` and re-run each platform's acceptance suite on the merged branch. One PR, not one per platform, because merging the halves separately would break the seam atomically; the cross-platform PR shape is still an open item in `DESIGN.md` section 9.
- **Cross-platform:** dispatch `chief-of-engineering` to reconcile the platform verdicts into the feature's verdict, per `mechanisms/pipeline/references/verification.md`. It never raises a tier above what a platform's own proof supports.
- Dispatch `docs-keeper`. `owned: yes` → it updates the Notion pages the feature changed and the Decisions Log, and returns the list of pages and rows for the PR body. `owned: no` → it writes the same content under `../memory/<repo>/docs/<feature-key>.md` and returns that path. It never touches Notion.

## 7. Open the PR and gate auto-merge

Push the branch and open the PR — **draft when `owned: no`**, ready when `owned: yes` — with no reviewers assigned. Publishing images and the tracker comment follow `../shared/pr.md`, as does writing `pr:`, `branch:` and `worktree:` (the feature branch's checkout) into `state.md`. The body follows `mechanisms/pipeline/references/pr-format.md` section by section. The verdict is the first line.

**Auto-merge is gated on the verdict, firmly.** The verdict must actually block the merge, not only label the PR.

| Verdict | Action |
|---|---|
| any, when `owned: no` | Draft PR; never enable auto-merge, regardless of verdict. Do not check for `auto-merge: wired`. |
| `MERGE-READY` | (`owned: yes`) Eligible. Enable auto-merge **only if** the project's memory records `auto-merge: wired` with the name of the required status check that carries the verdict, and that check is confirmed required on the base branch. Otherwise leave the PR open and say that auto-merge is not wired. |
| `REVIEW NEEDED` | Leave open for Amel. Never enable auto-merge. |
| `PROOF INCOMPLETE` | Leave open for Amel. Never enable auto-merge. |

Why the wiring condition: enabling GitHub auto-merge on a repo whose required checks do not include the verdict would merge on green CI alone, which is exactly what this gate exists to prevent. How the verdict becomes a required check is an open item (`DESIGN.md` section 9); until a project records it as wired, nothing merges unattended.

Append a row to the shared ledger (`~/Projects/tickets/LEDGER.md`; `lane: feature`): date, feature, PR link, verdict, and the one-command revert. The merge commit SHA is backfilled when the merge lands. The ledger plus small PRs is what keeps a bad merge cheaply revertible.

## 8. After the PR

- Move the work along: link the PR from the Decisions Log row (Docs-Keeper, `owned: yes`) or from the `../memory/<repo>/docs/<feature-key>.md` page (`owned: no`), and from any tracker item.
- Worktrees are kept (`mechanisms/pipeline/references/worktrees.md`).
- Do not poll. Subscribe to the PR's activity if the user asks.

## 9. Weekly release

Not per task, and `owned: yes` only. The weekly build respects the build budget (matching Amel's existing batching practice).

1. Collect the `## Changelog line` section from every PR merged since the last release tag. PRs left unmerged (`REVIEW NEEDED`, `PROOF INCOMPLETE`) are not included.
2. Write the changelog entry from those lines: one user-facing sentence each, no rewriting of meaning.
3. Tag the release and trigger the project's build (e.g. an EAS build). The build command and cost are project facts in the Team Lead's project memory.
4. Amel tests manually in that build, using each PR's "How to test by hand" section.

Scheduling the weekly run is left to the user (a routine or cron); this runner does not create schedules on its own.
