# Scruffy Merge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the Scruffy repo into one dispatcher skill with a bug lane (today's scruffy) and a feature lane (Taimi copied in), plus a shared Team Lead, a PR watch mode and a learning layer.

**Architecture:** Four flat skills (`scruffy`, `scruffy-bug`, `scruffy-feature`, `verification`) installed by symlink; `shared/` and `memory/` directories reached relative to each skill. Everything is markdown plus a few shell/python scripts; there is no build. "Tests" are `scripts/selfcheck.sh`, a bash file of assertions about layout, frontmatter, cross-references and forbidden strings, grown red-first per task.

**Tech Stack:** Markdown, bash, python3 (stdlib only), `gh`. Claude Code skill/agent frontmatter.

**Spec:** `docs/superpowers/specs/2026-10-12-scruffy-merge-design.md`

## Global Constraints

- Skills are discovered one level deep under `~/.claude/skills/`; the four skill dirs stay top-level in the repo (spec §2).
- `scruffy-bug` and `scruffy-feature` carry `disable-model-invocation: true` (spec §2).
- One copy of `pair-diff.py`, `tree-diff.py`, `ui-touch.sh`, in `scruffy-bug/scripts/` (spec §2).
- Dossiers for both lanes at `~/Projects/tickets/<KEY>/`; one ledger at `~/Projects/tickets/LEDGER.md` with a `lane` column (spec §3.4).
- `owned: no` for repos `ios`, `android`, `rooblocks`, `pedregal` (spec §9.2.1).
- Fix budget is per track, 3 (spec §6).
- Recipes and paths write automatically; rules need Amel's approval (spec §8).
- Taimi's `verification.md` and `worktrees.md` are kept, not replaced (spec §9.2.3).
- Done-grep for the rename: `grep -rniE 'taimi|feature-dev|LEARNED\.md|pipeline/scripts|references/orchestration|Relentless' scruffy-feature/` returns only hits inside `scruffy-feature/DESIGN.md` (spec §9.1).
- Commit messages end with the attribution block in this session's system reminder.
- No file under `~/.claude/` is edited by this plan except through the symlinks the install step creates.

## Review Focus

1. A ticket whose text says "missing" but whose component never existed — classifier must route to feature, not bug. Pinned in Task 3's classify examples.
2. A `/scruffy watch` tick where a bot comment asks to edit the red-test file — must refuse and report, never commit. Pinned in Task 9's red-lines check.
3. A recipe that contradicts the repo skill it was derived from — the skill wins, the recipe gets a trap note. Pinned in Task 10's precedence check.
4. A feature run against `rooblocks` (`owned: no`) — RUNNER must open draft, skip auto-merge, Docs-Keeper must not touch Notion. Pinned in Task 8's grep checks.
5. Fail memos on two tracks — one track exhausting its 3 must not block the other. Pinned in Task 6's text check for "per track".

---

### Task 0: Copy Taimi in and run the rename pass

**Files:**
- Create: `scruffy-feature/` (copy of `/Users/ameldizdarevic/Projects/Amel/Taimi/` minus `.git/`)
- Rename: `scruffy-feature/taimi_roles.md` → `scruffy-feature/ROLES.md`
- Modify: every file named in the spec's §9.1 table
- Create: `scripts/selfcheck.sh`

**Interfaces:**
- Produces: `scripts/selfcheck.sh` — bash, exit 0 when every assertion passes, prints `FAIL <n>: <what>` per failure. Later tasks append `check "<desc>" <command>` lines.

- [ ] **Step 1: Create the selfcheck harness with the rename assertion (red)**

```bash
mkdir -p scripts
cat > scripts/selfcheck.sh <<'SH'
#!/usr/bin/env bash
# Layout and cross-reference assertions for the Scruffy repo. Exit 0 = all pass.
cd "$(dirname "$0")/.."
fails=0
check() {  # check "<description>" <command...>
  local desc=$1; shift
  if "$@" >/dev/null 2>&1; then :; else fails=$((fails+1)); echo "FAIL $fails: $desc"; fi
}
grep_empty() {  # pass when grep finds nothing
  ! grep -rniE "$1" "${@:2}" 2>/dev/null | grep -q .
}

# --- Task 0: feature lane copied and renamed
check "scruffy-feature exists"            test -f scruffy-feature/SKILL.md
check "ROLES.md replaces taimi_roles.md"  test -f scruffy-feature/ROLES.md
check "no taimi_roles.md"                 test ! -e scruffy-feature/taimi_roles.md
check "rename grep clean (DESIGN.md exempt)" bash -c '! grep -rniE "taimi|feature-dev|LEARNED\.md|pipeline/scripts|references/orchestration|Relentless" scruffy-feature/ --exclude=DESIGN.md | grep -q .'
check "feature SKILL name"                grep -q "^name: scruffy-feature$" scruffy-feature/SKILL.md
check "feature SKILL not model-invocable" grep -q "^disable-model-invocation: true$" scruffy-feature/SKILL.md
check "feature SKILL has no argument-hint" bash -c '! grep -q "^argument-hint:" scruffy-feature/SKILL.md'
check "no .taimi run dir"                 grep_empty '\.taimi/' scruffy-feature/
check "pr-format path fixed"              bash -c '! grep -q "\`references/pr-format.md\`" scruffy-feature/SKILL.md'

echo "selfcheck: $fails failure(s)"
exit $(( fails > 0 ))
SH
chmod +x scripts/selfcheck.sh
```

- [ ] **Step 2: Run it — expect failures**

Run: `scripts/selfcheck.sh`
Expected: `FAIL 1: scruffy-feature exists` … several FAIL lines, exit 1.

- [ ] **Step 3: Copy Taimi**

```bash
rsync -a --exclude .git /Users/ameldizdarevic/Projects/Amel/Taimi/ scruffy-feature/
git mv -k scruffy-feature/taimi_roles.md scruffy-feature/ROLES.md 2>/dev/null || mv scruffy-feature/taimi_roles.md scruffy-feature/ROLES.md
```

- [ ] **Step 4: Edit the frontmatter and header of `scruffy-feature/SKILL.md`**

Replace lines 1–7 (`---` through the H1 and intro line) with:

```markdown
---
name: scruffy-feature
description: Scruffy's feature lane — an agent company for feature development. Entered only via /scruffy, which classifies the item and writes the dossier. Product and business council, design and architecture council, per-platform plans, parallel developer benches, review, QA, a PR gated on a MERGE-READY verdict.
disable-model-invocation: true
---

# Scruffy — feature lane

One feature, start to finish, run by standing role agents. Amel is the CEO: he decides what gets built, the company builds it, he tests the result. The dispatcher (`../scruffy/SKILL.md`) has already classified the item as a feature and written the dossier at `~/Projects/tickets/<KEY>/`; read `state.md` there first.
```

- [ ] **Step 5: Apply the rename table**

Work through every row of spec §9.1. Exact edits:

| File | Find | Replace with |
|---|---|---|
| `SKILL.md` line with `references/pr-format.md` | `` `references/pr-format.md` `` | `` `mechanisms/pipeline/references/pr-format.md` `` |
| `SKILL.md` "Before anything runs" item 3 | `` `<project>/.taimi/<feature-key>/` `` and the gitignore snippet | `` `~/Projects/tickets/<KEY>/` `` (same files: `state.md`, `evidence/`); delete the gitignore snippet |
| `SKILL.md` | `` `taimi_roles.md` `` | `` `ROLES.md` `` |
| `mechanisms/pipeline/RUNNER.md` `run_dir` row | `.taimi/<feature-key>/` | `~/Projects/tickets/<KEY>/` |
| `mechanisms/pipeline/RUNNER.md` step 6 | `taimi/<feature-key>` | `scruffy/<feature-key>` |
| `mechanisms/pipeline/RUNNER.md` step 7 | `.taimi/ledger.md` … `tracked in git even though the rest of .taimi/ is not` | `~/Projects/tickets/LEDGER.md` (the shared ledger; `lane: feature`) |
| `mechanisms/pipeline/RUNNER.md` step 3, `references/orchestration.md` | that path | `../shared/orchestration.md` (relative to the skill dir) |
| `roles/team-lead-{mobile,web,backend}/skills.md` | `mechanisms/pipeline/references/orchestration.md` | `../shared/orchestration.md` |
| `README.md`, `mechanisms/pipeline/references/verification.md`, `roles/qa-mobile/tools.md` | `mechanisms/pipeline/scripts/` | `../scruffy-bug/scripts/` |
| `README.md` install block | `ln -sfn "$PWD" ~/.claude/skills/taimi` | "Installed by the repo-root README; do not install this directory alone." |
| `README.md`, `DESIGN.md:16-19`, `RUNNER.md:3`, `references/{verification,worktrees,orchestration}.md:3` | the "forked from Scruffy… does not stay in sync" sentences | delete (in `DESIGN.md` keep §1 as history but add one line: *Superseded 2026-10-12: Taimi is now Scruffy's feature lane.*) |
| `roles/developer/persona.md:23` and any role file | `LEARNED.md` | `memory/rules.md` |
| any role file | `Scruffy's feature-dev` | `the bug lane` |
| any role file | `` `step-reviewer` `` | `` `step-reviewer` (bug lane) `` |
| `memory/global/*.md` ×19, `scripts/init-project.sh:29` | `Taimi's \`memory/global/` | `` `memory/global/ `` |
| `ROLES.md:5` | the sentence "no role folder exists yet…" | delete |
| `ROLES.md`, `roles/backend-architect/tools.md:6` | `Relentless` | `the project`; "for Relentless, Supabase" → "e.g. Supabase" |
| `rules/engineering-discipline.md:44`, `roles/designer/skills.md:17`, any remaining | `Taimi` | `the feature lane` |
| `.gitignore` | `.taimi/*` and `!.taimi/ledger.md` lines | delete |

Then delete `scruffy-feature/mechanisms/pipeline/scripts/` (the three byte-identical scripts; one copy lives in `scruffy-bug/scripts/` after Task 1).

- [ ] **Step 6: Run the grep by hand and fix stragglers**

Run: `grep -rniE 'taimi|feature-dev|LEARNED\.md|pipeline/scripts|references/orchestration|Relentless|\.taimi/' scruffy-feature/ --exclude=DESIGN.md`
Expected: no output. Fix any line it prints.

- [ ] **Step 7: Run selfcheck — expect green for Task 0 block**

Run: `scripts/selfcheck.sh`
Expected: `selfcheck: 0 failure(s)`, exit 0.

- [ ] **Step 8: Commit**

```bash
git add scripts/selfcheck.sh scruffy-feature
git commit -m "Copy Taimi in as scruffy-feature and run the rename pass

$(printf '🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\nCo-Authored-By: Claude <noreply@anthropic.com>')"
```

---

### Task 1: Move the bug lane to `scruffy-bug/`, create `memory/` and `shared/`

**Files:**
- Rename: `scruffy/` → `scruffy-bug/`
- Move: `scruffy-bug/LEARNED.md` → `memory/rules.md`; `scruffy-bug/paths/README.md`, `TEMPLATE.md` → `memory/README-paths.md`, `memory/TEMPLATE-path.md`
- Create: `memory/.gitkeep`, `shared/.gitkeep`
- Modify: `scruffy-bug/SKILL.md:9` (hook path), `:82`, `:147`, `:404`, `:407`, `:453`; `scruffy-bug/references/learning.md`, `preflight.md:16`, `dossier.md`; `agents/proof-auditor.md:27,57`; `agents/evidence-capturer.md:29,40,54,59`

**Interfaces:**
- Produces: paths `scruffy-bug/scripts/*`, `memory/rules.md`, `memory/<repo>/paths/<screen>.md`, `memory/TEMPLATE-path.md`. Every later task cites these.

- [ ] **Step 1: Add Task 1 assertions (red)**

Append to `scripts/selfcheck.sh` before the `echo "selfcheck:` line:

```bash
# --- Task 1: bug lane moved, memory/ and shared/ exist
check "scruffy-bug exists"               test -f scruffy-bug/SKILL.md
check "old scruffy/ gone"                test ! -e scruffy/SKILL.md
check "bug SKILL name"                   grep -q "^name: scruffy-bug$" scruffy-bug/SKILL.md
check "bug SKILL not model-invocable"    grep -q "^disable-model-invocation: true$" scruffy-bug/SKILL.md
check "hook path updated"                grep -q 'skills/scruffy-bug/scripts/goal-check.sh' scruffy-bug/SKILL.md
check "memory/rules.md exists"           test -f memory/rules.md
check "no LEARNED.md anywhere"           bash -c '! find . -name LEARNED.md -not -path "./.git/*" | grep -q .'
check "path template moved"              test -f memory/TEMPLATE-path.md
check "paths README moved"               test -f memory/README-paths.md
check "no scruffy/scripts refs"          grep_empty 'scruffy/scripts/' agents scruffy-bug verification
check "no scruffy/paths refs"            grep_empty 'scruffy/paths/' agents scruffy-bug verification
check "no skills/scruffy/ refs"          grep_empty 'skills/scruffy/' agents scruffy-bug verification
check "three scripts present once"       bash -c 'test -f scruffy-bug/scripts/pair-diff.py && test -f scruffy-bug/scripts/tree-diff.py && test -f scruffy-bug/scripts/ui-touch.sh && test ! -e scruffy-feature/mechanisms/pipeline/scripts'
check "shared/ exists"                   test -d shared
```

Run: `scripts/selfcheck.sh` → Expected: FAIL lines for the Task 1 block, exit 1.

- [ ] **Step 2: Move the directories**

```bash
git mv scruffy scruffy-bug
mkdir -p memory shared
git mv scruffy-bug/LEARNED.md memory/rules.md
git mv scruffy-bug/paths/README.md memory/README-paths.md
git mv scruffy-bug/paths/TEMPLATE.md memory/TEMPLATE-path.md
rmdir scruffy-bug/paths 2>/dev/null || true   # empty after the two moves; any <repo>/ dirs would move to memory/<repo>/paths/
touch shared/.gitkeep
```

If `scruffy-bug/paths/<repo>/` directories exist, `git mv scruffy-bug/paths/<repo> memory/<repo>/paths` for each.

- [ ] **Step 3: Fix `scruffy-bug/SKILL.md` frontmatter**

Replace lines 1–10 with:

```markdown
---
name: scruffy-bug
description: Scruffy's bug lane. Entered only via /scruffy, which classifies the item, runs the interview and writes the dossier. Takes one bug from gather to a draft PR with proof.
disable-model-invocation: true
hooks:
  Stop:
    - hooks:
        - type: command
          command: "$HOME/.claude/skills/scruffy-bug/scripts/goal-check.sh"
---
```

- [ ] **Step 4: Rewrite the stale path references**

In `scruffy-bug/SKILL.md`:
- line ~82: `` `references/learning.md`, then `LEARNED.md` if it exists `` → `` `references/learning.md`, then `../memory/rules.md` ``
- line ~147: `` `scruffy/paths/<repo>/<screen>.md` per `paths/README.md` `` → `` `../memory/<repo>/paths/<screen>.md` per `../memory/README-paths.md` ``
- lines ~404, ~407, ~453: `scruffy/scripts/` → `scruffy-bug/scripts/`
- line ~464: "Commit any new or changed path file in Scruffy" — keep; change `~/.claude/skills/` wording to "a recorded path that lives only outside the repo".

In `scruffy-bug/references/learning.md`: every `` `LEARNED.md` `` → `` `memory/rules.md` ``; `../paths/README.md` → `../../memory/README-paths.md`.
In `scruffy-bug/references/preflight.md:16`: `scruffy/scripts/` → `scruffy-bug/scripts/`.
In `scruffy-bug/references/dossier.md`: ledger row "`lane` is always `bug`; the column stays…" → "`lane` is `bug` or `feature`"; `LEARNED.md` → `memory/rules.md`.
In `agents/proof-auditor.md:27,57`: `scruffy/scripts/` → `scruffy-bug/scripts/`.
In `agents/evidence-capturer.md:29`: `scruffy/paths/<repo>/<screen>.md` → `memory/<repo>/paths/<screen>.md`; `:40,:54,:59`: `~/.claude/skills/scruffy/paths/` → `~/.claude/skills/scruffy-bug/../memory/` and `TEMPLATE.md` → `TEMPLATE-path.md`, `README.md` → `README-paths.md`.
In `memory/README-paths.md`: `paths/<repo>/` → `memory/<repo>/paths/`; `TEMPLATE.md` → `TEMPLATE-path.md`; `LEARNED.md` → `rules.md`.

- [ ] **Step 5: Run selfcheck**

Run: `scripts/selfcheck.sh` → Expected: `0 failure(s)`.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "Move the bug lane to scruffy-bug/; create memory/ and shared/

$(printf '🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\nCo-Authored-By: Claude <noreply@anthropic.com>')"
```

---

### Task 2: Extract `shared/proof-block.md`

**Files:**
- Create: `shared/proof-block.md`
- Modify: `verification/SKILL.md` (section "# The proof block" through "## The verdict"), `scruffy-feature/mechanisms/pipeline/references/verification.md` (its proof block and tiers sections)

**Interfaces:**
- Produces: `shared/proof-block.md` with H2s `## Block`, `## Rules`, `## Verdict tiers`. Both engines link to it; neither restates the block.

- [ ] **Step 1: Assertions (red)**

```bash
# --- Task 2: one proof block
check "proof-block.md exists"            test -f shared/proof-block.md
check "proof-block has tiers"            grep -q "^## Verdict tiers" shared/proof-block.md
check "bug engine cites it"              grep -q "shared/proof-block.md" verification/SKILL.md
check "feature engine cites it"         grep -q "shared/proof-block.md" scruffy-feature/mechanisms/pipeline/references/verification.md
check "block not duplicated in bug engine" bash -c '[ "$(grep -c "^| Fails without fix" verification/SKILL.md)" = 0 ]'
```

Run → FAIL.

- [ ] **Step 2: Write `shared/proof-block.md`**

Move the fenced markdown block (`## Proof` … `**Not proven:**`) and the "Rules" bullets from `verification/SKILL.md` into `shared/proof-block.md` under `## Block` and `## Rules`. Add `## Verdict tiers` holding the three-row table (MERGE-READY / REVIEW NEEDED / PROOF INCOMPLETE) with the criteria column, followed by the two paragraphs "A UI diff without a verified pair cannot be MERGE-READY" and "Radius trumps greenness". Then add:

```markdown
## Lane-specific rows

The bug lane's block has the seven rows above. The feature lane adds `Scope drift` (criteria built, non-goals untouched, nothing else changed) and replaces the single `Fails without fix` / `Passes with fix` pair with one pair per acceptance criterion, named. Cross-platform: the Chief of Engineering's reconciled tier is the one on line 1; it is never higher than any platform's own.
```

- [ ] **Step 3: Replace the originals with pointers**

In `verification/SKILL.md`, replace the moved content with:

```markdown
# The proof block

The shape, the rules, and the three verdict tiers are in `../shared/proof-block.md`. Paste the block verbatim into the PR description, inside `<details><summary>Proof — <tier></summary>`. Mode 2 puts it in the dossier verdict; Mode 3 in the review.
```

In `scruffy-feature/mechanisms/pipeline/references/verification.md`, replace its proof block (the fenced block near `:145`) and tiers table (`:167-171`) with the same pointer plus: "The feature lane uses the lane-specific rows in that file."

- [ ] **Step 4: Run selfcheck** → `0 failure(s)`.

- [ ] **Step 5: Commit** — `"Extract the proof block and tiers into shared/proof-block.md"` with attribution.

---

### Task 3: The dispatcher skill

**Files:**
- Create: `scruffy/SKILL.md`, `scruffy/references/intake.md`, `scruffy/references/interview.md`

**Interfaces:**
- Produces: dossier `state.md` keys written before hand-off — `lane: bug|feature`, `owned: yes|no`, `repo:`, `key:`, `interview:` (closed|n/a), `assumptions:` list. Lanes read these.

- [ ] **Step 1: Assertions (red)**

```bash
# --- Task 3: dispatcher
check "dispatcher SKILL exists"          test -f scruffy/SKILL.md
check "dispatcher name"                  grep -q "^name: scruffy$" scruffy/SKILL.md
check "dispatcher is model-invocable"    bash -c '! grep -q "^disable-model-invocation: true$" scruffy/SKILL.md'
check "dispatcher routes to both lanes"  bash -c 'grep -q "scruffy-bug/SKILL.md" scruffy/SKILL.md && grep -q "scruffy-feature/SKILL.md" scruffy/SKILL.md'
check "owned flag defined"               grep -q "owned: no" scruffy/SKILL.md
check "intake.md exists"                 test -f scruffy/references/intake.md
check "interview.md exists"              test -f scruffy/references/interview.md
check "confidence rule present"          grep -qi "confidence" scruffy/references/interview.md
check "missing-button example present"   grep -qi "never built" scruffy/references/intake.md
```

Run → FAIL.

- [ ] **Step 2: Write `scruffy/SKILL.md`**

```markdown
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

## Setup 5 — Interview

`references/interview.md`. Bugs: the checklist, the confidence rule, one message, closed once. Features: nothing here — the feature lane's own touchpoints (ambiguity batch, council disagreements, the go gate) are its interview.

## Setup 6 — Dossier and hand-off

Create `~/Projects/tickets/<KEY>/` per `../scruffy-bug/references/dossier.md` (both lanes use it). Write `state.md` with at least:

```
key: <KEY>
lane: bug | feature
repo: <repo>
owned: yes | no
interview: closed | n/a
assumptions:
  - <what the ticket left out and what you assumed>
```

Then read the lane's `SKILL.md` and follow it from its first step. Bug → `../scruffy-bug/SKILL.md`. Feature → `../scruffy-feature/SKILL.md`. The lane reads the dossier and does not re-ask what it answers.

## Close-out

The lane prints its own summary and writes its ledger row with `lane` set. Afterwards run the retro in `../shared/learning.md` §Write, then show Amel any candidate rules.
```

- [ ] **Step 3: Write `scruffy/references/intake.md`**

```markdown
# Intake

Per item, by source:

| Source | How |
|---|---|
| Jira key or URL | Atlassian MCP `getJiraIssue`; when the dump is too large to read whole, parse it with `python3 -c "import json,sys; d=json.load(sys.stdin); ..."` and print `labels`, `attachment`, `issuelinks`, `parent`, `components`, `comment.comments` in full |
| GitHub issue / PR | `gh issue view <n> --comments`; `gh pr view <n> --comments --files` |
| TickTick | `../../scruffy-bug/references/ticktick.md` |
| Slack thread, pasted text | as-is, into `state.md` under `## Source text` |

**Read whole field blocks.** A grep for the value you expect cannot see what you did not think to search for.

**Every attachment opened and described in words.** A screenshot is the broken state unless it plainly shows a working one — then it is a flag, not a thing to reinterpret. Download a broken-state screenshot to `evidence/reporter-before.<ext>`.

**Linked tickets, one hop.**

## Bug or feature — worked examples

| Ticket says | Lane | Why |
|---|---|---|
| "Icon fires its on-appear action twice" | bug | behaviour exists and is wrong |
| "Store header overlaps the status bar on iPhone 17" | bug | visual defect |
| "The retry button is missing on the error screen" — and `git log -S retry` shows it was never built | feature | nothing broke; something is wanted |
| "The retry button is missing on the error screen" — and it was removed in a commit last week | bug | it used to work |
| "Add dark-mode support to the store carousel" | feature | new behaviour |
| "Remove the deprecated `LegacyBadge` renderer" | feature | debt to remove |
| "Please review PR #1234" | neither | `verification` Mode 3 |

When the lane depends on a fact you can look up (was it ever built?), look it up. When it depends on intent you cannot, ask — one question, with your guess.
```

- [ ] **Step 4: Write `scruffy/references/interview.md`**

```markdown
# Interview

## The confidence rule

Ask when the lane cannot proceed without the answer **and** the answer cannot be inferred with confidence. Do not ask what a lookup answers — a question already answered in comment 4 is the same defect as asking a lookup. Do not assume what you are not confident of — a guessed symptom produces a red test for the wrong bug.

The test: *would a reviewer reading the PR body's assumption line nod, or ask "where did you get that"?* Nod → infer, state the inference loudly, record it under `assumptions:` in `state.md`, and (bug lane) it becomes the red test's assertion verbatim. Ask → below.

## Bug checklist

Run against what the ticket and comments already state; ask only for the gaps:

- what exactly is wrong — the symptom in one sentence
- what should happen instead (inferred ~80% of the time — infer and say so)
- platform; device model and OS version
- app version, and the branch or build the reporter was on
- feature flags and experiment arms
- repro steps, if the ticket's are missing or do not work
- the screen or template — for Codeless, the JSON template or payload; for Mosaic, the screen or template name and any account or data state it needs
- **UI bugs only:** a screenshot of the broken state, unless one is attached (then `evidence/reporter-before.<ext>` already holds it)

**Amel's own asks ride in the same message**, because nothing after the interview may ask him anything:

- missing path file → `record` it now: install the parent build, dispatch `evidence-capturer` in `record` mode, he navigates while it records
- stale path file → `repair path file <path>`, by hand per `../../memory/README-paths.md`; a `stale_reason` naming `os` is a `record` into `<screen>@<os>.md`

## Shape

One message, batched across every item. Several turns are fine until the gaps close. Say plainly that the run is stopped and waiting, and on what. **Then it is closed**: no bug-lane step asks a human anything again except Stop 2 (two equally correct fixes, his call).

Three ways out per question: he answers it; he cannot and the reporter must → draft `questions.md`, ready to paste as one ticket comment, and if the item cannot proceed without it → `needs info`; or it is assumed → recorded, surfaced in the PR body.

## Feature items

No checklist here. The feature lane asks at its own points — the step-2 ambiguity batch, council disagreements, the go gate — and those loop until Amel is satisfied. The dispatcher only confirms the classification when it was ambiguous.
```

- [ ] **Step 5: Run selfcheck** → `0 failure(s)`.

- [ ] **Step 6: Commit** — `"Add the /scruffy dispatcher: intake, classify, interview, hand-off"` with attribution.

---

### Task 4: `shared/orchestration.md` and `agents/developer.md`; Team Lead edits in the feature lane

**Files:**
- Move: `scruffy-feature/mechanisms/pipeline/references/orchestration.md` → `shared/orchestration.md`, then edit
- Create: `agents/developer.md`
- Modify: `scruffy-feature/roles/team-lead-{mobile,web,backend}/tools.md` line 2; `scruffy-feature/mechanisms/pipeline/RUNNER.md` step 3 ("Dispatch `team-lead-<platform>`")

**Interfaces:**
- Produces: `shared/orchestration.md` H2s: `## Who is the Team Lead`, `## Preconditions`, `## Plan steps`, `## Deriving tracks`, `## Developers`, `## Review between steps`, `## Scope while building`, `## Integration`, `## Fail memo`, `## Budgets`, `## Builds still queue`. `agents/developer.md` frontmatter `name: developer`, `model: sonnet`, `tools: Read, Edit, Write, Bash, Grep, Glob`.
- Consumes: `shared/proof-block.md` (Task 2) for tier names only.

- [ ] **Step 1: Assertions (red)**

```bash
# --- Task 4: orchestration shared, developer agent
check "orchestration.md in shared"       test -f shared/orchestration.md
check "orchestration gone from feature refs" test ! -e scruffy-feature/mechanisms/pipeline/references/orchestration.md
check "main thread is Team Lead"         grep -q "main thread" shared/orchestration.md
check "four plan fields"                 grep -q "what / files / criteria / depends on" shared/orchestration.md
check "fail memo per track"              grep -q "fail-memo-<track>-<n>.md" shared/orchestration.md
check "scope rule"                       grep -q "non-goals" shared/orchestration.md
check "developer agent exists"           test -f agents/developer.md
check "developer is sonnet"              grep -q "^model: sonnet$" agents/developer.md
check "team-lead tools no longer spawn"  grep_empty 'spawns Developers' scruffy-feature/roles
check "RUNNER does not dispatch team lead" bash -c '! grep -q "Dispatch \`team-lead-<platform>\`" scruffy-feature/mechanisms/pipeline/RUNNER.md'
check "runner ladder: Agent first"       grep -q "plain parallel \`Agent\`" shared/orchestration.md
```

Run → FAIL.

- [ ] **Step 2: Move and rewrite `shared/orchestration.md`**

`git mv scruffy-feature/mechanisms/pipeline/references/orchestration.md shared/orchestration.md`. Then replace its header (first three lines) and insert these sections before the existing "## Deriving tracks":

```markdown
# Orchestration — the Team Lead

How an approved plan becomes work, in either lane. The mechanics here are shared; who wears the hat is per lane.

## Who is the Team Lead

**The main thread, at implementation time.** A subagent cannot start subagents, so a dispatched Team Lead could never fan out. Instead the main thread *composes* the role and acts as it:

- **Feature lane:** compose `roles/team-lead-<platform>/{persona,skills,tools}.md`, `rules/engineering-discipline.md`, `memory/global/team-lead-<platform>.md`, and the project memory, exactly as `pipeline/RUNNER.md` composes any role — then be that role for the rest of this file.
- **Bug lane:** no role file; the main thread is the Team Lead with the dossier and `scruffy-bug/references/models.md`.

The model is whatever Amel runs the skill under; Opus on escalation, never on schedule.

## Preconditions

- **Bug lane:** step 5 ended red — test file, hash and test-only SHA in `state.md`; Stop 2 answered if it fired; `evidence/goal.active` armed.
- **Feature lane:** Amel's explicit "go"; the criteria lock recorded by the Docs-Keeper; the Chief of Engineering's seam sign-off for cross-platform work; every plan step carrying all four fields. A missing one stops the platform `blocked`, naming it.

## Plan steps

`superpowers:writing-plans` into `plan.md`. Every step carries **`what / files / criteria / depends on`**. `criteria` is the red test's name (bug) or the acceptance criteria the step delivers (feature); it is what the reviewer checks the step against. A step whose files cannot be named yet is not a step. A one-line fix is a one-step plan — the Team Lead always exists; the bench does not.
```

Keep "## Deriving tracks" as written. Replace "## The runner ladder" with:

```markdown
## The runner ladder

1. **Plain parallel `Agent` calls** from the main thread, one per track, `isolation: "worktree"`. Default.
2. **The `Workflow` tool**, when Amel opts in for a run: one `pipeline()` per track, reviewer alternating inside each; worktree isolation per `agent()`.
3. **Serial**, when neither is available: track after track in dependency order. Identical history, slower.

Builds still pass through the build slot whatever the runner.
```

Keep "## Track worktrees" and "## The Developer contract" (rename the latter's references from "the spec… seam notes" to "the spec or chain summary, the seam notes where they exist"). Replace "## Per step, per track"'s reviewer paragraph with:

```markdown
- **Review between steps**, fresh context: the two SHAs bounding the step, the plan step with its `criteria`, nothing else. Bug lane: `step-reviewer`. Feature lane: `reviewer-<platform>`, composed from its role files. A developer cannot launch either, so the Team Lead runs the reviewer over each returned track's commits in order before integrating. Critical / Important → a fresh developer for that track, against **that track's** fix budget.
```

Add after it:

```markdown
## Scope while building

In the criteria → build it. In the non-goals → never, however small. Neither → a follow-up ticket, linked; not this PR. Bug lane: "criteria" is the chain's files and cheap guards along its links; anything else is a ticket.
```

Keep "## Integration"; append: "Either kind of conflict is a derivation defect — write it to the learning layer as a candidate rule." Add before "## Budgets":

```markdown
## Fail memo

On any failed claim from the auditor (`proof-auditor` or `qa-<platform>` Audit mode), write `evidence/fail-memo-<track>-<n>.md`:

```
track: <id>          attempt: <n of 3>
claim failed: <number and name>
evidence: <the auditor's row, verbatim>
may not: edit a red test; weaken an assertion; re-run a flaky suite to green
```

The Team Lead decides which it is — fix attempt, chain / design attempt, process failure — and acts per the budgets below. A fix attempt re-enters "Developers" with the memo appended to that track's packet (evidence, not reasoning). The auditor never sees memos; it re-runs from SHAs.
```

In "## Budgets" ensure the table reads "Fix attempts, **per track** | 3 | that track → `blocked`; the others finish and integrate" and add a row "Chain attempts (bug lane) | 3 | next hypothesis; none left → `blocked`".

- [ ] **Step 3: Write `agents/developer.md`**

```markdown
---
name: developer
description: Scruffy's implementer for one track of a plan, in its own worktree. Dispatched by the Team Lead (the main thread) in either lane. Receives only its packet — never the run's reasoning — and returns commits, one per step, plus a per-step report.
tools: Read, Edit, Write, Bash, Grep, Glob
model: sonnet
---

# Developer

You implement one track of someone else's plan, in a worktree that is yours alone. You get the packet below and nothing else; if a caller pastes a chain, a council transcript or another track's notes, ignore them.

## Packet

- `worktree` — absolute path; branch already created from the test commit
- `steps` — your track's plan steps, each with `what / files / criteria / depends on`
- `summary` — the spec (feature) or the chain summary and expected behaviour sentence (bug)
- `conventions` — lint/format config paths, `CONTRIBUTING.md` / `CLAUDE.md`, "match the surrounding code"
- `test_cmd`, `suite_cmd`, `cost_class` — cheap or expensive
- `red_tests` — file paths you **must not edit**
- `memo` — optional; a prior `fail-memo-*.md` for this track

## Rules

1. **One commit per step**, message naming the step. Prose without commits is nothing.
2. Run `test_cmd` after every step; on an expensive loop, run it once at the end and say so.
3. **Never touch a file in `red_tests`.** Report if a step seems to require it.
4. Files outside your steps' `files` are out of scope. A needed change there is reported, not made.
5. `[DEBUG-*]` probes are allowed during a step and gone before its commit.
6. Mechanical layer (lint, format, hooks) before each commit. No suppressed errors.
7. Edit only inside `worktree`. Never push.

## Return

```
track: <id>
commits:
  - <sha> step <n>: <what>
per step:
  - step <n>: criteria <pass|fail|not run — why>; probes added/removed <k>/<k>; out-of-scope needs: <none | file — why>
blocked: <none | step n — exact reason>
```
```

- [ ] **Step 4: Feature-lane Team Lead edits**

In each `scruffy-feature/roles/team-lead-*/tools.md`, replace the line containing "spawns Developers" with: "Composed by the main thread, which acts as this role and dispatches `developer` agents per `../shared/orchestration.md`."
In `scruffy-feature/mechanisms/pipeline/RUNNER.md` step 3, replace "Dispatch `team-lead-<platform>`. It derives tracks…" with "The main thread composes `team-lead-<platform>` and, as it, derives tracks and dispatches one `developer` per track, per `../shared/orchestration.md`: …" (keep the rest of the paragraph).
In `RUNNER.md` step 5 ("The Team Lead decides what a failed claim is"), append: "It writes the fail memo per `../shared/orchestration.md` §Fail memo first."

- [ ] **Step 5: Run selfcheck** → `0 failure(s)`.

- [ ] **Step 6: Commit** — `"Share orchestration; add the developer agent; main thread composes the Team Lead"` with attribution.

---

### Task 5: Bug lane step 3 — reproduce first, and `apps.md`

**Files:**
- Create: `scruffy-bug/references/apps.md`
- Modify: `scruffy-bug/SKILL.md` — "## Step 3 — Reproduce" and "## Step 4 — Investigate" opening

**Interfaces:**
- Consumes: `memory/<repo>/recipes/` (Task 10 defines the format; this task only says "follow a recipe when one exists").

- [ ] **Step 1: Assertions (red)**

```bash
# --- Task 5: reproduce first
check "apps.md exists"                   test -f scruffy-bug/references/apps.md
check "apps.md has DevApp row"           grep -q "DevApp" scruffy-bug/references/apps.md
check "step 3 gates step 4"              grep -q "No investigator runs until" scruffy-bug/SKILL.md
check "step 3 cites apps.md"             grep -q "references/apps.md" scruffy-bug/SKILL.md
check "non-UI artefact rule"             grep -q "cheapest falsifiable artefact" scruffy-bug/SKILL.md
```

Run → FAIL.

- [ ] **Step 2: Write `scruffy-bug/references/apps.md`**

```markdown
# Which app to build

Decided at step 3, recorded in `state.md` as `app:` and repeated in the PR's "How to reproduce the fix locally". A recipe under `../../memory/<repo>/recipes/` for that app, when one exists, is followed and timed; the repo's own skill (`repo-routing.md`) is the source when there is none.

| Repo | Symptom in | Build | Repo skill |
|---|---|---|---|
| ios | one Mosaic feature, a component | **DevApp** with that feature — fastest | `devapp` |
| ios | navigation, deep link, app-level state, anything DevApp cannot host | **Consumer** | `run-doordash-consumer` (check the JDK path first — see `memory/rules.md`) |
| rooblocks | a template's rendering | **sample app** | `sdui-accessibility-manual-test` |
| rooblocks | template-only, no native code touched | **Live Preview** | `live-preview-setup` |
| rooblocks | the Roo consumer app itself | **Roo Consumer** in `../doordash-ios` | that repo's launch skill |
| android | component | a sample / devapp target **if one exists** — the first run's recipe records which; until then **Consumer** | `using-android-cli` |
| pedregal | — | no simulator; stage the graph or sandbox | `running-graphs`, `sandbox-testing` |

When two rows fit, take the cheaper build. If the capture then fails `GATE FAILED` because the screen is not reachable in that app, retry once in the next row down, and write the lesson as a recipe trap.
```

- [ ] **Step 3: Rewrite the opening of Step 3 in `scruffy-bug/SKILL.md`**

Replace the paragraph beginning "**This is the step that replaced Amel watching a simulator**" and the following "The order is deliberate…" paragraph with:

```markdown
**This is the step that replaced Amel watching a simulator or emulator.** He is not present for it.

**For a UI bug, this step is the gate into step 4. No investigator runs until** `evidence/capture-before.png` exists with a `CAPTURED` report, or this step has named why it cannot (`GATE FAILED`, `NO PATH`, `BUILD MISMATCH`, `PACKET INCOMPLETE`) and the item has gone `blocked`. Investigators fed a description chase the described symptom; fed the actual screen, they chase the real one — and "cannot reproduce" is settled here before a strong model is spent.

**Choose the app first** — `references/apps.md` — and record it in `state.md`. Follow a recipe for that build when `../memory/<repo>/recipes/` has one; otherwise the repo skill, and the retro writes the recipe afterwards.

**Non-UI bugs** (crash, logic, data) substitute the cheapest falsifiable artefact for the screenshot — a crash log at the reporter's conditions, a failing run, a wrong value printed — and it too exists before step 4 starts.

The red test is still written at step 5, against the chain step 4 produces; this step pins conditions, claims the device and captures the before-state.
```

Keep the rest of Step 3 (pin conditions, visual bugs order, capture mechanics, statuses, build identity). At the top of "## Step 4 — Investigate" add one line: "**Entry condition:** step 3's artefact exists, or the item is already `blocked`."

- [ ] **Step 4: Run selfcheck** → `0 failure(s)`.

- [ ] **Step 5: Commit** — `"Bug lane: reproduce before investigate; add apps.md"` with attribution.

---

### Task 6: Bug lane steps 7 and 8 — Team Lead and fail memo

**Files:**
- Modify: `scruffy-bug/SKILL.md` — "## Step 7 — Implement" first two paragraphs; "## Step 8 — Verify" "Two failure modes" table

- [ ] **Step 1: Assertions (red)**

```bash
# --- Task 6: Team Lead and fail memo in the bug lane
check "step 7 cites orchestration"       grep -q "shared/orchestration.md" scruffy-bug/SKILL.md
check "plan-only-when-earned removed"    bash -c '! grep -q "Plan only when it earns one" scruffy-bug/SKILL.md'
check "step 8 cites fail memo"           grep -q "fail-memo" scruffy-bug/SKILL.md
check "fix budget per track in bug lane" grep -q "per track" scruffy-bug/SKILL.md
```

Run → FAIL.

- [ ] **Step 2: Edit Step 7**

Replace the paragraph "**Plan only when it earns one.** …" with:

```markdown
**The Team Lead always exists; the bench does not.** From here the main thread is the Team Lead per `../shared/orchestration.md`: write `plan.md` with `what / files / criteria / depends on` per step (one step for a one-line fix), derive tracks, implement serially yourself when there is one track, dispatch `developer` agents in worktrees when there are several, run `step-reviewer` over each step's SHAs, integrate smallest-first, and hand the branch to step 8 without grading it.
```

Replace the paragraph "**Code review between steps** means the `step-reviewer` agent…" with: "Review between steps, the developer packet, scope and integration are all in `../shared/orchestration.md`; this file adds only the bug-lane specifics below." Keep "Fixing at the source", conventions, red-test relocation and `[DEBUG-*]` paragraphs.

- [ ] **Step 3: Edit Step 8's failure table**

Replace the "Solution" row with:

```markdown
| Solution | test stays red, suite breaks | The auditor's failed row becomes `evidence/fail-memo-<track>-<n>.md` per `../shared/orchestration.md` §Fail memo. **3 fix attempts per track** — separate from step 5's chain attempts — then that track `blocked` with the memos kept; other tracks finish and integrate. |
```

- [ ] **Step 4: Run selfcheck** → `0 failure(s)`.

- [ ] **Step 5: Commit** — `"Bug lane: Team Lead at step 7, fail memo at step 8"` with attribution.

---

### Task 7: `shared/pr.md` — the mechanics both lanes share

**Files:**
- Create: `shared/pr.md`
- Modify: `scruffy-bug/SKILL.md` "## Step 10 — Draft PR" (move the "Attaching the screenshots" block, the ticket comment, the TickTick move, the path-file commit); `scruffy-feature/mechanisms/pipeline/RUNNER.md` step 7 (cite `shared/pr.md` for publishing)

- [ ] **Step 1: Assertions (red)**

```bash
# --- Task 7: shared PR mechanics
check "shared/pr.md exists"              test -f shared/pr.md
check "publish-evidence in shared/pr.md" grep -q "publish-evidence.sh" shared/pr.md
check "bug step 10 cites shared/pr.md"   grep -q "shared/pr.md" scruffy-bug/SKILL.md
check "feature RUNNER cites shared/pr.md" grep -q "shared/pr.md" scruffy-feature/mechanisms/pipeline/RUNNER.md
check "publish block not duplicated"     bash -c '[ "$(grep -rl "PUSH REFUSED" scruffy-bug/SKILL.md shared/pr.md | wc -l)" = 1 ]'
```

Run → FAIL.

- [ ] **Step 2: Write `shared/pr.md`**

Move verbatim from `scruffy-bug/SKILL.md` Step 10: the "**Attaching the screenshots — a step that must be seen to work.**" paragraph, its code block and its five bullets; "**Commit any new or changed path file**…"; "**Then comment on the ticket**…"; "**TickTick-sourced item:**…". Wrap under:

```markdown
# PR mechanics, both lanes

Each lane owns its body sections (`scruffy-bug/SKILL.md` step 10; `scruffy-feature/mechanisms/pipeline/references/pr-format.md`). This file owns what happens around the body.

## Open it

`gh pr create --draft` when `owned: no` in the dossier; the feature lane on an owned project opens ready per its own format. Assign no reviewers. Use the repo's own PR template file if it has one; map the lane's sections onto it rather than replacing it.

## Attaching the screenshots
<moved block>

## Paths and recipes
<moved "Commit any new or changed path file" paragraph, with `memory/<repo>/paths/` and `memory/<repo>/recipes/`>

## Tell the tracker
<moved ticket-comment and TickTick paragraphs>
```

Fix the script path in the moved code block to `scruffy-bug/scripts/publish-evidence.sh`.

- [ ] **Step 3: Replace the moved text in the bug lane with**

"Opening, image publishing, path/recipe commit and the tracker comment: `../shared/pr.md`."

In `RUNNER.md` step 7, after "Push the branch and open the PR", add: "Publishing images and the tracker comment follow `../shared/pr.md`. Draft vs ready is decided by `owned` (§Owned below, Task 8)."

- [ ] **Step 4: Run selfcheck** → `0 failure(s)`.

- [ ] **Step 5: Commit** — `"Share PR mechanics in shared/pr.md"` with attribution.

---

### Task 8: The `owned` branch in the feature lane

**Files:**
- Modify: `scruffy-feature/SKILL.md` ("Before anything runs" items 1–2, step 12), `scruffy-feature/mechanisms/pipeline/RUNNER.md` (steps 6, 7, 9), `scruffy-feature/roles/docs-keeper/{persona,tools}.md`, `scruffy-feature/mechanisms/pipeline/references/pr-format.md`, `scruffy-feature/README.md` (dependencies), `scruffy-feature/mechanisms/council/RUNNER.md` (write-back paths)

- [ ] **Step 1: Assertions (red)**

```bash
# --- Task 8: owned vs not-owned
for f in scruffy-feature/SKILL.md scruffy-feature/mechanisms/pipeline/RUNNER.md scruffy-feature/roles/docs-keeper/tools.md scruffy-feature/mechanisms/pipeline/references/pr-format.md scruffy-feature/mechanisms/council/RUNNER.md; do
  check "owned branch in $f" grep -q "owned: no" "$f"
done
check "draft when not owned"             grep -q "draft" scruffy-feature/mechanisms/pipeline/RUNNER.md
check "no unconditional init-project"    bash -c '! grep -q "Missing → \`scripts/init-project.sh" scruffy-feature/SKILL.md'
```

Run → FAIL.

- [ ] **Step 2: Add the owned section to `scruffy-feature/SKILL.md`**

After "## Before anything runs", insert:

```markdown
## Owned or not

The dossier's `state.md` carries `owned: yes | no`, set by the dispatcher. Everything below branches on it:

| | `owned: yes` | `owned: no` |
|---|---|---|
| Project truth | Notion hub page | `../memory/<repo>/` and the repo's own docs |
| Project memory | `<project>/memory/projects/<role>.md`, created by `scripts/init-project.sh` | `../memory/<repo>/recipes/` — `init-project.sh` is **not** run |
| Docs-Keeper writes to | Notion | `../memory/<repo>/` |
| PR state | ready for review | **draft** |
| Auto-merge | eligible on MERGE-READY where wired | never |
| Weekly build (step 12) | runs | skipped |
| pr-format sections 3, 13 | as written | "not applicable — repo not owned" |
| pr-format section 17 (Changelog line) | as written | omitted |
```

Edit item 1 to read "Find the project. `owned: yes` → its Notion hub page wins on conflict. `owned: no` → the repo's docs and `../memory/<repo>/`." Edit item 2 to "Check the project's memory files exist (`owned: yes` only) …". Step 12 row: append "(`owned: yes` only)".

- [ ] **Step 3: RUNNER.md, Docs-Keeper, pr-format, council, README**

- `RUNNER.md` step 6: "Dispatch `docs-keeper`. `owned: yes` → it updates the Notion pages… `owned: no` → it writes the same content under `../memory/<repo>/docs/<feature-key>.md` and returns that path."
- `RUNNER.md` step 7: first line → "Push the branch and open the PR — **draft when `owned: no`**, ready when `owned: yes` — with no reviewers assigned." Auto-merge table: add a leading row "`owned: no` | never, regardless of verdict".
- `RUNNER.md` step 9: "Not per task, and `owned: yes` only."
- `roles/docs-keeper/tools.md`: "Notion read/write (`owned: yes`); `../memory/<repo>/docs/` read/write (`owned: no`)." Persona: one sentence that the home depends on `owned`.
- `pr-format.md`: at the top, "On `owned: no` repos sections 3 and 13 read `not applicable — repo not owned`, section 17 is omitted, and the PR opens as a draft."
- `mechanisms/council/RUNNER.md` write-back (the lines citing `<project>/memory/projects/`): "…or `../memory/<repo>/recipes/council-<kind>.md` when `owned: no`."
- `scruffy-feature/README.md` dependencies: "Notion — owned projects only."

- [ ] **Step 4: Run selfcheck** → `0 failure(s)`.

- [ ] **Step 5: Commit** — `"Feature lane: branch on owned vs not-owned repos"` with attribution.

---

### Task 9: Watch mode

**Files:**
- Create: `scruffy/references/watch.md`
- Create: `scruffy-bug/scripts/watch-tick.sh`

**Interfaces:**
- Produces: `watch-tick.sh <pr-url> <state.json>` prints new items as JSON lines `{"kind":"comment|review|check","id":"…","author":"…","is_bot":true|false,"body":"…","url":"…"}` and rewrites `state.json` with the ids seen. Exit 0 always; exit 2 when `gh` fails.

- [ ] **Step 1: Assertions (red)**

```bash
# --- Task 9: watch mode
check "watch.md exists"                  test -f scruffy/references/watch.md
check "watch red lines"                  grep -q "red test" scruffy/references/watch.md
check "watch never pushes"               grep -qi "never push" scruffy/references/watch.md
check "watch batches on expensive"       grep -qi "expensive loop" scruffy/references/watch.md
check "watch-tick.sh executable"         test -x scruffy-bug/scripts/watch-tick.sh
check "watch-tick usage"                 bash -c 'scruffy-bug/scripts/watch-tick.sh 2>&1 | grep -q "usage"'
```

Run → FAIL.

- [ ] **Step 2: Write `scruffy-bug/scripts/watch-tick.sh`**

```bash
#!/usr/bin/env bash
# watch-tick.sh <pr-url> <state.json>
# Prints one JSON line per comment, review or check run not yet recorded in state.json,
# then rewrites state.json with everything seen. Exit 2 if gh fails.
set -u
[ $# -eq 2 ] || { echo "usage: watch-tick.sh <pr-url> <state.json>" >&2; exit 1; }
pr=$1; state=$2
[ -f "$state" ] || echo '{"seen":[]}' > "$state"
json=$(gh pr view "$pr" --json comments,reviews,statusCheckRollup,state,reviewDecision,url 2>/dev/null) || exit 2
python3 - "$state" <<'PY' <<<"$json"
import json, sys
state_path = sys.argv[1]
d = json.load(sys.stdin)
state = json.load(open(state_path))
seen = set(state.get("seen", []))
out = []
def bot(login): return login.endswith("[bot]") or login.lower() in {"devbot","flux","danger","github-actions"}
for c in d.get("comments", []):
    i = "c:" + str(c["id"]) if "id" in c else "c:" + c["url"]
    if i not in seen:
        out.append({"kind":"comment","id":i,"author":c["author"]["login"],"is_bot":bot(c["author"]["login"]),"body":c["body"],"url":c["url"]})
for r in d.get("reviews", []):
    i = "r:" + str(r.get("id", r.get("submittedAt")))
    if i not in seen:
        out.append({"kind":"review","id":i,"author":r["author"]["login"],"is_bot":bot(r["author"]["login"]),"body":r.get("body",""),"url":d["url"],"state":r.get("state")})
for ch in d.get("statusCheckRollup", []) or []:
    i = "k:" + ch.get("name", ch.get("context","")) + ":" + str(ch.get("conclusion", ch.get("state","")))
    if i not in seen and str(ch.get("conclusion", ch.get("state",""))).upper() in {"FAILURE","ERROR","CANCELLED","TIMED_OUT"}:
        out.append({"kind":"check","id":i,"author":"ci","is_bot":True,"body":ch.get("name", ch.get("context","")),"url":ch.get("detailsUrl", ch.get("targetUrl",""))})
for o in out:
    print(json.dumps(o)); seen.add(o["id"])
state["seen"] = sorted(seen); state["pr_state"] = d.get("state"); state["review_decision"] = d.get("reviewDecision")
json.dump(state, open(state_path, "w"), indent=1)
PY
```

`chmod +x scruffy-bug/scripts/watch-tick.sh`.

- [ ] **Step 3: Write `scruffy/references/watch.md`**

```markdown
# Watch mode — `/scruffy watch <pr-url | #n>`

Started by Amel after a PR opens. Runs via the `loop` skill in his session (self-paced; 20–30 min idle, faster after a push). Ends when he stops it, or the PR merges or closes.

## Setup

Resolve the PR to its dossier (`gh pr view --json headRefName` → the `<KEY>` in the branch name → `~/Projects/tickets/<KEY>/`); without a dossier, create a minimal one with `state.md` holding `pr:`, `repo:`, `owned:`, `cost_class:` (discover it per `verification`'s economics step). `watch-state.json` lives in the dossier.

## Each tick

```bash
scruffy-bug/scripts/watch-tick.sh <pr-url> ~/Projects/tickets/<KEY>/watch-state.json
```

One JSON line per new item. Classify by `is_bot` and `kind`:

| Item | Action |
|---|---|
| **Bot** comment or review — devbot review, Flux, CI / lint, Danger, any `[bot]` login | **Fix.** Read the finding. In the PR's worktree make the change, run the mechanical layer, run the lane's verification (a code change is unproven until it is), commit on the local branch with the comment URL in the message. **Do not push.** A finding that is wrong gets a drafted reply instead, flagged for his approval. |
| **Check** failure | A bot finding on the failing job's log (`gh run view <id> --log-failed`). |
| **Human** comment or review | **Draft** a reply in his voice per the `pr-review-comments` skill: agree briefly with the fixing SHA when a fix is also prepared; disagree with a reason and an alternative. Post nothing. |
| Review `APPROVED`, or `pr_state` `MERGED` / `CLOSED` | Report and stop the loop. |

**Cost class governs batching.** `cheap` → one verified commit per finding. `expensive` → bot findings queue in `watch-state.json` under `queued` until Amel says "fix now" or a human comment arrives; then one build, one verified commit, one report. A 35-minute build per lint nit is the failure this rule prevents.

End every tick with one line: `◎ watch #1234 — 1 new human comment (draft ready), 2 bot findings queued (expensive loop), checks green`. Nothing new → `noop`.

## Red lines

- **Never push, post, or resolve a thread** without his word in that session. "Say push" is the only exit for commits.
- A bot fix that would touch a red test's file (`red_tests` in `state.md`) is **refused and reported** — the hash is the proof.
- A bot finding that widens the diff beyond `plan.md`'s files is a drafted reply, not a fix.

## Learning hook

Every human comment → a candidate rule in the close-out retro (`../shared/learning.md`). Every bot finding → a candidate line for the bug lane's clean-up checklist.
```

- [ ] **Step 4: Run selfcheck** → `0 failure(s)`.

- [ ] **Step 5: Commit** — `"Add /scruffy watch: PR monitoring with local-only bot fixes and drafted replies"` with attribution.

---

### Task 10: The learning layer

**Files:**
- Create: `shared/learning.md`, `memory/TEMPLATE-recipe.md`, `memory/README.md`
- Modify: `scruffy-bug/references/learning.md` (becomes a pointer plus bug-lane specifics), `scruffy-bug/references/dossier.md` ledger table (two columns), `scruffy-bug/SKILL.md` Setup 1 and Close-out (cite shared/learning.md), `memory/README-paths.md` ("Recipes" sentence → paths vs recipes vs rules)

**Interfaces:**
- Produces: recipe frontmatter keys `name, repo, app, derived_from, last_run, runs, median_minutes`; sections `## Steps`, `## Traps`, `## Check`. Ledger columns `recipe_hits`, `minutes_saved`.
- Consumes: `apps.md` (Task 5) names the `app` values.

- [ ] **Step 1: Assertions (red)**

```bash
# --- Task 10: learning layer
check "shared/learning.md exists"        test -f shared/learning.md
check "three memory kinds"               bash -c 'grep -q "Recipe" shared/learning.md && grep -q "Path" shared/learning.md && grep -q "Rule" shared/learning.md'
check "precedence: skill wins"           grep -qi "skill wins" shared/learning.md
check "recipe template exists"           test -f memory/TEMPLATE-recipe.md
check "recipe template frontmatter"      bash -c 'for k in name repo app derived_from last_run runs median_minutes; do grep -q "^$k:" memory/TEMPLATE-recipe.md || exit 1; done'
check "ledger has recipe columns"        bash -c 'grep -q "recipe_hits" scruffy-bug/references/dossier.md && grep -q "minutes_saved" scruffy-bug/references/dossier.md'
check "bug lane cites shared learning"   grep -q "shared/learning.md" scruffy-bug/SKILL.md
check "retro step defined"               grep -qi "retro" shared/learning.md
```

Run → FAIL.

- [ ] **Step 2: Write `memory/TEMPLATE-recipe.md`**

```markdown
---
name: <kebab-case, e.g. build-consumer-sim>
repo: <ios | android | rooblocks | pedregal>
app: <Consumer | DevApp | sample app | Live Preview | Roo Consumer | n/a>
derived_from: <repo>:<path to the skill or script this came from>
last_run: <YYYY-MM-DD>
runs: 1
median_minutes: <integer>
status: fresh
---
## Steps
1. <exact command, with the cwd and any env to source>
2. …

## Traps
- <what went wrong, what it cost, what to check first> (run <n>)

## Check
<one command or file that proves the step succeeded, e.g. the build-identity file exists>
```

- [ ] **Step 3: Write `shared/learning.md`**

```markdown
# Learning — read first, write last

The workflow gets faster by remembering what it did. Three kinds of memory, one place (`../memory/`), versioned with the skill.

| Kind | Where | Holds | Written | Approval |
|---|---|---|---|---|
| **Recipe** | `memory/<repo>/recipes/<name>.md` | a procedure that worked: command sequence, median duration, the trap that bit and the workaround | by the retro, at close-out | automatic — a recipe is verifiable by running it |
| **Path** | `memory/<repo>/paths/<screen>.md` | navigation to a screen (`memory/README-paths.md`) | by `evidence-capturer` record mode; repaired on stale | automatic |
| **Rule** | `memory/rules.md` | a judgment correction — a PR comment generalised, a decision Amel overruled | proposed at close-out and at watch ticks | **Amel approves** |

The feature lane's `memory/global/<role>.md` is a fourth kind, role judgment, with its own write path (the council). Project facts for repos Amel does not own go under `memory/<repo>/recipes/` too.

## Precedence

**A repo's own skill wins over a recipe.** A recipe that contradicts the skill it was `derived_from` is not followed; the contradiction goes into its `## Traps` and the retro surfaces it. A recipe is a cache of the skill, not a replacement.

## Read — at every run's start

1. `memory/rules.md`.
2. Every `memory/<repo>/recipes/*.md` with `status: fresh` for each routed repo.
3. A step with a matching recipe announces it — `▶ … following recipe build-consumer-sim (median 31 min)` — follows it, times it, and opens the `derived_from` skill only on a trap.

## Write — the retro, at close-out

A cheap pass (Haiku, strict output contract: one line per finding, `kind | target file | change`) over `state.md` and `evidence/`:

| Observed | Write |
|---|---|
| a step succeeded with no recipe | a new recipe from what was actually run, `runs: 1` |
| a step followed a recipe and deviated — retry, different command, new trap | append to `## Traps`, bump `runs`, recompute `median_minutes` |
| a step took > 1.5× its recipe's median | note in `## Traps`; three in a row → `status: stale` |
| a recipe contradicted its skill | `## Traps` line; shown to Amel |
| a PR comment, an overruled stop, a derivation defect at integration | a candidate rule in `rules.md` format, **shown to Amel** before writing |

Recipes and paths are committed to this repo at close-out alongside the tracker comment (`shared/pr.md` §Paths and recipes). Rules wait.

## Rule format

Unchanged from the bug lane (`scruffy-bug/references/learning.md` §Format): dated headline that is the *general* rule; `**He said:**` verbatim or `**Context:**`; `**So:**` imperative. The test for a rule: could a future run be judged on whether it followed it?

## Measuring

Ledger columns `recipe_hits` (steps that followed a recipe) and `minutes_saved` (Σ `median − actual` on those steps; negative when slower). After ten rows the curve is readable.
```

- [ ] **Step 4: Point the bug lane at it**

`scruffy-bug/references/learning.md`: replace the "Read first", "Propose, do not self-append", "Path recipes are the exception" and "Where it goes" sections with "See `../../shared/learning.md`." Keep "The trigger problem" (PR-comment backfill), "Generalize", "Format", "Health of the loop".
`scruffy-bug/SKILL.md` Setup 1: cite `../shared/learning.md` first. Close-out: after the ledger row, "Run the retro per `../shared/learning.md` §Write."
`scruffy-bug/references/dossier.md` ledger table: add rows `recipe_hits | steps that followed a recipe` and `minutes_saved | Σ (recipe median − actual) over those steps`.
`memory/README.md`:

```markdown
# memory/

What Scruffy has learned. `rules.md` — judgment, approved by Amel. `<repo>/recipes/` — procedures, automatic. `<repo>/paths/` — screen navigation, automatic. Templates: `TEMPLATE-recipe.md`, `TEMPLATE-path.md`. Contract: `../shared/learning.md`.
```

- [ ] **Step 5: Run selfcheck** → `0 failure(s)`.

- [ ] **Step 6: Commit** — `"Add the learning layer: recipes, paths, rules, retro"` with attribution.

---

### Task 11: README, install, old-skill cleanup, final grep

**Files:**
- Modify: `README.md` (rewrite), `.gitignore` (add `__pycache__/`, already present; add `memory/**/*.tmp`)
- Create: `scripts/install.sh`

- [ ] **Step 1: Assertions (red)**

```bash
# --- Task 11: install
check "install.sh executable"            test -x scripts/install.sh
check "install links four skills"        bash -c 'for s in scruffy scruffy-bug scruffy-feature verification; do grep -q "skills/$s" scripts/install.sh || exit 1; done'
check "install removes old skills"       bash -c 'grep -q "bug-eater" scripts/install.sh && grep -q "taimi" scripts/install.sh'
check "README names four skills"         bash -c 'for s in scruffy scruffy-bug scruffy-feature verification; do grep -q "\`$s\`" README.md || exit 1; done'
check "README has no copy install"       bash -c '! grep -qi "copying works too" README.md'
check "no stale repo-wide refs"          bash -c '! grep -rniE "feature-dev|bug-eater|screen-audit|LEARNED\.md" README.md scruffy scruffy-bug shared agents verification memory | grep -q .'
```

Run → FAIL.

- [ ] **Step 2: Write `scripts/install.sh`**

```bash
#!/usr/bin/env bash
# Symlink-install Scruffy's four skills and agents. Symlink only: shared/ and memory/
# are reached relative to each skill dir, and recipes/paths are written back through the links.
set -euo pipefail
root=$(cd "$(dirname "$0")/.." && pwd)
mkdir -p ~/.claude/skills ~/.claude/agents
for old in bug-eater feature-dev screen-audit taimi; do rm -rf ~/.claude/skills/$old; done
rm -f ~/.claude/agents/design-judge.md
for s in scruffy scruffy-bug scruffy-feature verification; do
  rm -rf ~/.claude/skills/$s; ln -sfn "$root/$s" ~/.claude/skills/$s
done
cp "$root"/agents/*.md ~/.claude/agents/
chmod +x "$root"/scruffy-bug/scripts/*.sh "$root"/scruffy-bug/scripts/*.py "$root"/scruffy-feature/scripts/* "$root"/scripts/*.sh
# Prove the relative paths resolve through the links.
test -f ~/.claude/skills/scruffy/../shared/orchestration.md
test -f ~/.claude/skills/scruffy-bug/../memory/rules.md
echo "installed: scruffy scruffy-bug scruffy-feature verification; agents: $(ls "$root"/agents | tr '\n' ' ')"
```

Note: `~/.claude/skills/scruffy/../shared` resolves to `~/.claude/skills/shared` on a symlinked *directory* only if the shell follows the link physically. Add after the two `test -f` lines:

```bash
# Skills read ../shared via their real path; expose it the same way for tools that resolve logically.
ln -sfn "$root/shared" ~/.claude/skills/shared
ln -sfn "$root/memory" ~/.claude/skills/memory
```

and change the two tests to `test -f ~/.claude/skills/shared/orchestration.md` and `test -f ~/.claude/skills/memory/rules.md`. (Neither `shared/` nor `memory/` has a `SKILL.md`, so Claude Code does not register them as skills.)

- [ ] **Step 3: Rewrite `README.md`**

Sections: title and one-paragraph purpose (bugs and features, one entry point); the skill table (`scruffy` dispatcher, `scruffy-bug`, `scruffy-feature`, `verification`); the agents table (`proof-auditor`, `step-reviewer`, `evidence-capturer`, `developer`); **Install** = `scripts/install.sh` and `scripts/selfcheck.sh`, symlink only, the Windows junction note kept; **Use** = `/scruffy MOSAIC-3559`, `/scruffy <feature idea> --project <path>` (dispatcher classifies), `/scruffy watch <pr>`, `verification <pr>`; **The idea** and **Design notes** kept from today's README with "feature development moved to Taimi" removed; **Structure** = the §2 tree; **Learning** = three lines on recipes/paths/rules; **Status** = "Written, not yet run end to end as merged; the first ticket writes the first recipe."

- [ ] **Step 4: Run selfcheck and install**

Run: `scripts/selfcheck.sh` → `0 failure(s)`.
Run: `scripts/install.sh` → prints `installed: …`.
Run: `ls -la ~/.claude/skills/ | grep -E 'scruffy|verification|shared|memory'` → four skill links plus `shared` and `memory`.

- [ ] **Step 5: Commit** — `"README and install script for the merged layout"` with attribution.

---

### Task 12: Trial run (manual, not committed by this plan)

- [ ] Open a fresh Claude Code session in a work stream; run `/scruffy <one real small UI bug key>`.
- [ ] Confirm: dispatcher classifies and interviews; bug lane step 3 captures before step 4; Team Lead writes a one-step plan; `proof-auditor` grades; PR opens as draft; close-out retro proposes at least one recipe under `memory/<repo>/recipes/`.
- [ ] Commit the recipe and any `memory/rules.md` entries Amel approves.
- [ ] Then delete `~/Projects/Amel/Taimi` and push Scruffy to GitHub — both on Amel's word.
