# Task 06 — Spine updates

**Goal:** Every shared reference that still assumes Amel takes the screenshots says otherwise, the models table has a row for the new agent, the ledger can record whether the pair was accepted, and the README installs the new agent and scripts.

**Depends on:** tasks 02 to 05 (names and behaviour to describe).

**Files:**
- Modify: `scruffy/references/repo-routing.md` — "Staging the screen" paragraph
- Modify: `scruffy/references/models.md` — Minimum viable model table
- Modify: `scruffy/references/dossier.md` — `state.md` list, Ledger table
- Modify: `scruffy/references/preflight.md` — Skills helper row
- Modify: `README.md` — agents table, Install block
- Modify: `scruffy/SKILL.md` — one sentence at line 19

**Interfaces:**
- Consumes: agent name `evidence-capturer`; statuses; `scruffy/paths/`; the proof block row from task 05.
- Produces: the ledger column `pair outcome` with values `accepted` / `replaced` / `requested` / `n/a`, backfilled from PR comments like `PR outcome` is.

---

## Steps

- [x] **Step 1: Routing**

In `scruffy/references/repo-routing.md`, "Staging the screen", replace the sentence "Amel takes his own screenshots and recordings; tell him when you need one." with:

```markdown
Captures are taken by the `evidence-capturer` agent from a recorded path in `../paths/<repo>/<screen>.md`. Amel navigates once per screen, in `record` mode, batched into the run's handoff list; after that the path replays. Tell him which screens need recording, not which screenshots you need.
```

- [x] **Step 2: Models table**

Add a row after `step-reviewer`:

```markdown
| `evidence-capturer` agent — before/after captures | sonnet, pinned in the agent file | Resolving labels to frames and judging a stable tree needs reading, not horsepower. Device work: passes through the build slot on expensive loops |
```

- [x] **Step 3: Dossier**

`state.md` list, add: "the path file used for captures and its status at dispatch, the mask, and the agent's last status per label".

Ledger table, add after `PR outcome`:

```markdown
| **pair outcome** | `accepted` / `replaced` (reviewer or Amel attached a different image) / `requested` (a reviewer asked for a screenshot the PR lacked) / `n/a` (NON-UI). Backfilled with `PR outcome` from the PR's comments and attachments. `requested` on a row whose proof block said `not applicable` is a defect in `ui-touch.sh`'s patterns; `replaced` is a framing lesson for `LEARNED.md` |
```

In "What the ledger is for", add one sentence: "The pair-outcome column is what tunes the capture gate: `requested` means the UI detector missed, `replaced` means the capture was of the wrong thing or framed wrong."

- [x] **Step 4: Preflight**

Skills helper row: append "and `~/.claude/agents/evidence-capturer.md`, `bug-eater/scripts/pair-diff.py`, `bug-eater/scripts/ui-touch.sh` present and executable". Ledger backfill row: end the prior clause with a period, then append "`,comments` already fetched — also read attachments for the pair-outcome column".

- [x] **Step 5: README**

Agents table, add:

```markdown
| `evidence-capturer` | Takes the before/after pair from a simulator or emulator by a recorded path, gated on the accessibility tree and the installed binary's hash. You navigate a new screen once; it replays forever after |
```

Install block: `cp agents/*.md` already covers it. Add a line: `chmod +x ~/.claude/skills/bug-eater/scripts/*.sh ~/.claude/skills/bug-eater/scripts/*.py` and a sentence: "`brew install cameroncooke/axe/axe` for iOS captures; without it the pair is `ungated` and the verdict caps at REVIEW NEEDED on UI diffs."

Under "The idea", change "before/after captures for anything visual" to "before/after captures for anything visual, taken by an agent from a recorded path rather than by you".

- [x] **Step 6: Scruffy SKILL.md**

Line 19: same substitution as the README's "The idea" sentence, but use "rather than by him" — this paragraph refers to Amel in third person, unlike the README, which addresses the reader directly and keeps "you".

- [x] **Step 7: Structural test**

```bash
grep -rn 'Amel takes his own screenshots' . --include='*.md' | grep -v docs/
grep -n 'evidence-capturer' scruffy/references/models.md scruffy/references/repo-routing.md scruffy/references/preflight.md README.md
grep -n 'pair outcome' scruffy/references/dossier.md
grep -n 'chmod +x' README.md
```

Expected: first grep empty; the agent named in all four files; the ledger column present; the chmod line present.

- [x] **Step 8: Install and verify discovery** (partial — see report; fresh-session discovery check deferred to controller)

```bash
cp -r scruffy bug-eater verification feature-dev ~/.claude/skills/ && cp agents/*.md ~/.claude/agents/
chmod +x ~/.claude/skills/bug-eater/scripts/*
ls ~/.claude/agents/ ~/.claude/skills/scruffy/paths/
```

Expected: three agent files; `paths/README.md` and `TEMPLATE.md` present. In a fresh Claude Code session, the `Agent` tool's available types list includes `evidence-capturer`.

- [x] **Step 9: Commit** (staged only — controller commits)

```bash
git add scruffy/ README.md
git commit -m "Point the spine at evidence-capturer; add pair-outcome ledger column"
```

## What to expect when this task is done

- No file in the skillset says Amel takes screenshots.
- The ledger can answer, after twenty rows, whether the UI detector and the capture framing are right.
- The installed copy under `~/.claude` matches the repo, and the agent is discoverable.
