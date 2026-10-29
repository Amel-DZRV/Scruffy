# Review Lane Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Seven tasks, `1` through `7`, in order.

**Goal:** Scruffy's third lane, `scruffy-review`, for other people's PRs. Two blind reviewers (Opus 5.5 and GPT-6.1 Sol) review the PR. On codeless PRs and PRs that touch shared code, a red-green test check runs as well. A Sonnet 5.5 judge checks every finding against the code and writes one report: what both reviewers found, what only one found, what is contested, and the red-green result. Amel asks follow-up questions until the findings are settled. Then he gets draft comments in his voice, edits them, and approves posting. The lane learns from his edits. It runs as `/scruffy review <pr>`.

**Architecture:** A new lane directory `scruffy-review/`, entered only through the dispatcher, like `scruffy-bug/` and `scruffy-feature/`. A deterministic resolver script turns the seat table plus a live `orchestrator_capabilities` snapshot into the models that will actually run, applying the per-seat fallback and the high-effort cap. The lane runs the reviewers in parallel against a detached read-only worktree at the PR head, runs the red-green test check through the existing `verification` skill when triggered, and hands everything to a fresh-context judge. Draft–posted comment pairs are recorded in `memory/voice/` and turned into candidate voice rules that Amel approves.

**Tech Stack:** Markdown skill files, `python3` (stdlib only) for the resolver and its `unittest` suite, `gh`, `git worktree`, the T3 `orchestrator_capabilities` / `delegate_task` tools, and the Claude Code `Agent` tool as the no-T3 transport.

**Spec:** The conversations of 2026-10-27 (per-seat fallback, the `high` effort cap) and 2026-10-29 (three lanes, two reviewers plus a Sonnet judge, Fable when there is no GPT, the red-green test check on codeless and shared-code PRs, the rename of Mode 3, follow-up questions before drafts, learning from Amel's edits). This plan replaces the six-seat PR council drafted on 2026-10-27.

## Global Constraints

- Seats and models, verbatim:

  | Seat | Role | Primary | Fallback |
  |---|---|---|---|
  | `reviewer-a` | reviewer | `claudeAgent` / `claude-opus-5-5` | none |
  | `reviewer-b` | reviewer | `codex` / `gpt-6.1-sol` | `claudeAgent` / `claude-fable-5-1` |
  | `judge` | judge | `claudeAgent` / `claude-sonnet-5-5` | none |

- Every seat runs at effort `high`. No seat runs above `high` (`xhigh`, `max`, `ultra`, `ultracode` and `ultrathink` are all rejected).
- `reviewer-a` and `reviewer-b` never resolve to the same model.
- Fallback is decided per seat, never by one global switch.
- A run where every seat is Claude is reported as `single-provider run` in the report header.
- Reviewers are blind: neither sees the other's output. Only the judge sees both.
- The judge never adds a finding of its own. `REFUTED` needs a `file:line` that shows why. When the judge can't confirm a finding but can't show it wrong either, the verdict is `CONTESTED`, never `REFUTED`. The judge is a weaker model than `reviewer-a`, so a deep finding it doesn't follow must reach Amel.
- **Red-green test check** is the new name for `verification` Mode 3. "Mode 3" disappears from the repo, and `proof-auditor`'s `mode: review` becomes `mode: red-green`.
- The red-green test check runs when the routed repo is `codeless`, or when the change's blast radius is `Shared` per the radius table in `verification/SKILL.md`. Otherwise it's skipped, and the report says `red-green test check: skipped (contained, not codeless)`.
- No drafts before Amel has settled the findings. Nothing is posted to GitHub without his explicit go. Drafting uses the `pr-review-comments` skill.
- Voice rules are written only after Amel approves them. Recording draft–posted pairs is automatic.
- Never push, commit, or check out on the PR's own branch. The worktree is detached and removed after the run.
- Per run, at most 11 agent invocations: 3 seats, 3 seat retries (one each), 1 `proof-auditor`, and 4 follow-up judge rounds.
- A seat with a fallback retries on its next candidate. A seat with no fallback (`reviewer-a`, `judge`) retries once on the same model.

## Machine facts at planning time

| Check | Result |
|---|---|
| `orchestrator_capabilities` on the work account | `claudeAgent` enabled: `claude-opus-5-5`, `claude-sonnet-5-5`, `claude-fable-5-1`, `claude-haiku-5-5`, `omittedModels: 9`. `codex` enabled: `gpt-6.1-sol`, `gpt-6.1-terra`, `gpt-6-astra`, `gpt-6-luna`, `omittedModels: 4`. Every other provider: `"Provider instance is disabled."` |
| Option key per provider | Claude: `effort`. Codex: `reasoningEffort`. |
| `inheritedOptions` under T3 | `effort: medium`, `fastMode: false` — non-empty, so Claude seats needing `effort: high` must go through `delegate_task`, not native `Agent` |
| Child runtime mode | `full-access` — read-only is a prompt rule only, hence the post-seat integrity check in Task 4 |
| Installed paths | `scripts/install.sh` links each lane flat under `~/.claude/skills/`, so `scruffy-review/` is installed by adding it to the install loop. `pr-review-comments` lives at `~/.claude/skills/pr-review-comments/` and is not in this repo. |
| `delegate_task isolation:"worktree"` | branches from the parent's local commit (the Scruffy repo) — not usable; the lane pre-creates its own worktree |
| Codeless red-green recipe | `memory/codeless/recipes/ios-sample-and-spectest.md` — spec tests run in about 1 minute incremental |

## Review Focus

1. **A model missing from the short list on a provider that has `omittedModels > 0`.** It may still exist. The resolver must ask for a `search` instead of falling back silently. Pinned in Task 1, `test_unlisted_model_requests_search`.
2. **A provider listed but disabled, or with `canRunChildTask: false`.** It must count as unavailable even though it has models. Pinned in Task 1, `test_personal_account_falls_back`.
3. **A seat that errors at runtime (rate limit, provider outage).** It retries once on its next candidate, excluding the model that failed. Pinned in Task 1, `test_exclude_moves_seat_to_next_candidate`.
4. **The judge refuting a real finding it didn't understand.** It must mark it `CONTESTED`. Pinned in Task 2's judge prompt and selfcheck.
5. **A PR from a fork, whose head isn't on `origin`.** Fetch `pull/<n>/head`. Pinned in Task 4's lane text and exercised in Task 7.
6. **A finding on a line outside the diff.** The judge marks it `outside-diff`. It can appear in the report, but never as an inline comment. Pinned in Task 2's judge prompt and Task 4's selfcheck.
7. **A missed "Mode 3" reference after the rename.** Pinned by a repo-wide grep in Task 3.

---

### Task 1: Seat table and resolver

**Files:**
- Create: `scruffy-review/seats.json`
- Create: `scruffy-review/scripts/resolve-seats.py`
- Create: `scripts/test_resolve_seats.py`
- Modify: `scripts/selfcheck.sh` (new section at the end, before the summary line)

**Interfaces:**
- Produces: `seats.json` schema:
  ```json
  {"seats": [{"seat": "reviewer-b", "role": "reviewer", "distinct_group": "reviewers",
              "effort": "high",
              "candidates": [{"provider": "codex", "model": "gpt-6.1-sol"},
                             {"provider": "claudeAgent", "model": "claude-fable-5-1"}]}]}
  ```
  `distinct_group` is set only on the two reviewer seats.
- Produces: CLI `python3 resolve-seats.py [--seats <path>] [--caps <file>]... [--claude-only] [--exclude <provider>/<model>]...`
  - `--seats` defaults to `../seats.json` relative to the script.
  - `--caps` is repeatable. Files are merged per provider, and model lists are unioned, so a `search` result can be added to the base snapshot.
  - Exit `0`: prints the resolved JSON to stdout: `{"transport": "t3"|"agent", "single_provider": bool, "seats": [{"seat", "role", "provider", "model", "options", "fallback_used", "agent_model"?}]}`.
  - Exit `2`: bad input, or a seat effort outside `low|medium|high`.
  - Exit `3`: a seat has no usable candidate. Names the seat on stderr.
  - Exit `4`: a model needs a search. Prints `needs-search: <provider>/<model>` lines to stdout.
- Availability rules, in order:
  1. **Provider gate.** The `providerInstanceId` matches, `canRunChildTask` is true, and no constraint contains `disabled`.
  2. **Model gate.** The model id is in `models[].id`. If it isn't, but the provider has `omittedModels > 0` and no `--caps` file has confirmed it, the result is `needs-search`. That causes exit 4 for the whole run, before any seat falls back.
  3. **Distinct group.** Skip a candidate whose model was already taken by an earlier seat in the same `distinct_group`.
  4. **Exclusions.** Skip candidates named by `--exclude`.
- `options` is `{"effort": "high"}` for `claudeAgent` and `{"reasoningEffort": "high"}` for `codex`.
- `--claude-only` drops every non-Claude candidate, needs no `--caps`, sets `transport: "agent"`, and adds `agent_model`. The mapping is `claude-opus-5-5→opus`, `claude-sonnet-5-5→sonnet`, `claude-fable-5-1→fable` and `claude-haiku-5-5→haiku`.
- `single_provider` is true when every resolved seat is on one provider.

- [ ] **Step 1: Write the failing tests** in `scripts/test_resolve_seats.py`. Use `unittest`. Run the script with `subprocess` and build fixture capability files in a `tempfile.TemporaryDirectory`. Base fixture `work_caps()` mirrors the Machine facts row. Tests:
  - `test_work_account_uses_primaries`: the real `seats.json` plus `work_caps()` gives exit 0, `reviewer-a` is `claude-opus-5-5`, `reviewer-b` is `gpt-6.1-sol`, `judge` is `claude-sonnet-5-5`, every `fallback_used` is false, `single_provider` is false, and `transport` is `"t3"`.
  - `test_personal_account_falls_back`: `codex` has `canRunChildTask: false` and the constraint `"Provider instance is disabled."`. Expect `reviewer-b` to be `claude-fable-5-1` with `fallback_used: true`, and `single_provider` to be true.
  - `test_unlisted_model_requests_search`: `gpt-6.1-sol` is removed and `omittedModels` is `4`. Expect exit 4 with stdout containing `needs-search: codex/gpt-6.1-sol`. Rerun with a second `--caps` file listing `gpt-6.1-sol` under `codex`. Expect exit 0 with `reviewer-b` set to `gpt-6.1-sol`.
  - `test_missing_model_without_omitted_falls_back`: `gpt-6.1-sol` is removed and codex `omittedModels` is `0`. Expect `reviewer-b` to be `claude-fable-5-1`.
  - `test_reviewers_never_share_model`: a custom seats file where `reviewer-b` has the candidates `[codex/gpt-6.1-sol, claudeAgent/claude-opus-5-5, claudeAgent/claude-fable-5-1]`, with codex disabled. Expect `reviewer-b` to be `claude-fable-5-1`.
  - `test_reviewer_collision_with_no_alternative_fails`: as above, but the candidates are `[codex/gpt-6.1-sol, claudeAgent/claude-opus-5-5]`. Expect exit 3 with stderr containing `reviewer-b`.
  - `test_exclude_moves_seat_to_next_candidate`: `work_caps()` plus `--exclude codex/gpt-6.1-sol`. Expect `reviewer-b` to be `claude-fable-5-1`.
  - `test_effort_above_high_rejected`: a custom seats file with one seat at `"xhigh"`. Expect exit 2.
  - `test_options_key_per_provider`: on the work account, `reviewer-b.options == {"reasoningEffort": "high"}` and `judge.options == {"effort": "high"}`.
  - `test_claude_only_flag`: `--claude-only` with no `--caps`. Expect `transport: "agent"`, `reviewer-a.agent_model == "opus"`, `reviewer-b.agent_model == "fable"`, `judge.agent_model == "sonnet"`, and `single_provider` true.
  - `test_real_seats_json_is_capped`: load the real `seats.json`. Every `effort` is in `{"low", "medium", "high"}`, there are exactly 3 seats, and the seat names match the Global Constraints table.

- [ ] **Step 2: Run the tests to verify they fail**
  Run: `python3 -m unittest scripts/test_resolve_seats.py -v`
  Expected: errors, because `scruffy-review/scripts/resolve-seats.py` and `seats.json` don't exist yet.

- [ ] **Step 3: Write `scruffy-review/seats.json`** from the Global Constraints table, and **implement `resolve-seats.py`** with stdlib only (`argparse`, `json`, `sys`). Resolve seats in file order so `reviewer-a` claims its model before `reviewer-b`. Run the needs-search pass over every seat's first available-provider candidate before resolving anything, so exit 4 lists every model to search in one go.

- [ ] **Step 4: Run the tests to verify they pass**
  Run: `python3 -m unittest scripts/test_resolve_seats.py -v`
  Expected: all 11 pass.

- [ ] **Step 5: Add selfcheck lines** under `# --- Review lane`:
  ```bash
  check "seats.json exists"              test -f scruffy-review/seats.json
  check "resolver tests pass"            python3 -m unittest scripts/test_resolve_seats.py
  check "no seat above high"             bash -c '! grep -qE "\"effort\": *\"(xhigh|max|ultra)" scruffy-review/seats.json'
  ```
  Run: `scripts/selfcheck.sh`. Expected: `selfcheck: 0 failure(s)`.

- [ ] **Step 6: Commit**
  ```bash
  git add scruffy-review/seats.json scruffy-review/scripts/resolve-seats.py scripts/test_resolve_seats.py scripts/selfcheck.sh
  git commit -m "Review lane: seat table and resolver with per-seat fallback"
  ```

### Task 2: Reviewer prompt, judge prompt, output contract, reviewer agent

**Files:**
- Create: `scruffy-review/references/reviewer.md`, `scruffy-review/references/judge.md`, `scruffy-review/references/contract.md`
- Create: `agents/pr-reviewer.md`
- Modify: `scripts/selfcheck.sh`

**Interfaces:**
- Consumes: the seat `role` values from Task 1.
- Produces: `contract.md`, the output each reviewer returns. It is one YAML block:
  ```yaml
  findings:
    - file: <repo-relative path>
      line: <int, RIGHT side of the diff>
      severity: Critical | Important | Minor
      claim: <one sentence>
      failure_scenario: <concrete input/state → wrong result>
      confidence: high | medium | low
  checked_and_sound:
    - <file or file:line range> — <what was checked>
  ```
  An empty `findings` list is allowed. `checked_and_sound` is required, because it is how the judge detects disagreement between the reviewers.
- Produces: the judge's output, also in `contract.md`. Every finding gets:
  - `verdict`: `CONFIRMED`, `REFUTED` or `CONTESTED`
  - `agreement`: `both`, `reviewer-a` or `reviewer-b`
  - `evidence`: `file:line` and one sentence
  - optional `outside-diff: true`
  - **CONTESTED** means the judge can't settle it from the code, or the other reviewer's `checked_and_sound` covers the finding's location and the code doesn't settle it, or two findings at one location ask for conflicting changes.
  - **Ranking:** severity first, then `agreement: both` before single-reviewer findings.
- Produces: `agents/pr-reviewer.md` with the frontmatter `name: pr-reviewer`, `tools: Read, Grep, Glob, Bash` and `model: sonnet`. The model is overridden per seat on the `Agent` transport. Its body is modelled on `agents/step-reviewer.md`: read-only, never edit, commit or push, then apply the prompt file it's given and return `contract.md`.

- [ ] **Step 1: Add the failing selfcheck lines**
  ```bash
  check "reviewer prompt exists"         test -f scruffy-review/references/reviewer.md
  check "contract has checked_and_sound" grep -q "checked_and_sound" scruffy-review/references/contract.md
  check "judge has three verdicts"       bash -c 'for v in CONFIRMED REFUTED CONTESTED; do grep -q "$v" scruffy-review/references/judge.md || exit 1; done'
  check "judge contests, not refutes, when unsure" grep -qi "cannot confirm.*CONTESTED\|can.t confirm.*CONTESTED" scruffy-review/references/judge.md
  check "judge marks outside-diff"       grep -q "outside-diff" scruffy-review/references/judge.md
  check "judge reads red-green result"   grep -qi "red-green test check" scruffy-review/references/judge.md
  check "pr-reviewer is read-only"       bash -c 'grep -q "^tools: Read, Grep, Glob, Bash$" agents/pr-reviewer.md && grep -qi "never edit" agents/pr-reviewer.md'
  ```
  Run: `scripts/selfcheck.sh`. Expected: these fail.

- [ ] **Step 2: Write `reviewer.md`.** Under 60 lines, in `agents/step-reviewer.md`'s voice. Both reviewers get the same prompt; they differ by model, not by angle. What to look for:
  - correctness: logic, edge cases on changed lines, error paths, callers of anything changed, and whether the diff does what the PR body claims
  - tests: whether each changed behaviour has a test that would fail without the change, missing cases, assertions that can't fail
  - security: secrets in code or logs, PII, trust boundaries
  - fit: duplication of an existing helper, the wrong altitude, idioms the surrounding code doesn't use
  - scope: drift beyond the PR body, and what the PR body leaves out

  A finding without a failure scenario is not a finding.

- [ ] **Step 3: Write `judge.md` and `contract.md`.** The judge rules:
  - Open the cited line in the worktree before giving a verdict.
  - `REFUTED` needs a `file:line` showing why.
  - When it can't confirm a finding and can't show it wrong, the verdict is `CONTESTED`.
  - Merge duplicates across the two reviewers into one finding with `agreement: both`.
  - Never add a new finding of its own.
  - When a red-green test check result is in the packet, report it as given. Never re-grade it. A `FAILED` red-green result is listed first in the report.
  - On a follow-up round, answer only the question asked, about the finding named, and return the updated verdict for that finding.

- [ ] **Step 4: Write `agents/pr-reviewer.md`.**

- [ ] **Step 5: Run selfcheck.** Run `scripts/selfcheck.sh`. Expected: `selfcheck: 0 failure(s)`.

- [ ] **Step 6: Commit**
  ```bash
  git add scruffy-review/references agents/pr-reviewer.md scripts/selfcheck.sh
  git commit -m "Review lane: reviewer and judge prompts, output contract, read-only reviewer agent"
  ```

### Task 3: Rename Mode 3 to the red-green test check

**Files:**
- Modify: `verification/SKILL.md` (heading at line 214, line 237, line 258)
- Modify: `agents/proof-auditor.md` (the `mode` row at line 20, and every `review` mode reference)
- Modify: `shared/proof-block.md` (lines 20, 39, 43, 57)
- Modify: `scruffy/SKILL.md` (Setup 3 table row, line 40)
- Modify: `scruffy/references/intake.md` (line 28)
- Modify: `scruffy-bug/SKILL.md` (line 84)
- Modify: `scruffy-bug/references/models.md` (the `Deep PR review` caps row)
- Modify: `scripts/selfcheck.sh`

- [ ] **Step 1: Add the failing selfcheck lines**
  ```bash
  check "no Mode 3 left"                 grep_empty 'mode 3|mode: review' verification shared agents scruffy scruffy-bug README.md
  check "verification names red-green"   grep -q "^# Red-green test check" verification/SKILL.md
  check "auditor has red-green mode"     grep -q "red-green" agents/proof-auditor.md
  check "red-green accepts forced depth" grep -q "depth: deep" verification/SKILL.md
  ```
  Run: `scripts/selfcheck.sh`. Expected: these fail.

- [ ] **Step 2: Rename.**
  - `verification/SKILL.md`: the heading becomes `# Red-green test check — someone else's PR`. Its opening line says it writes the test the author didn't write, runs it on the parent commit (red) and on their branch (green). Every other "Mode 3" becomes "the red-green test check".
  - `proof-auditor.md`: `mode` values become `fix`, `standalone` or `red-green`.
  - The red-green section's radius paragraph gains one sentence: a caller may pass `depth: deep`, and then it goes deep whatever the radius. The review lane does this on codeless PRs, which are often contained, so that "even for codeless" actually writes a red test.
  - The other files: "Mode 3" → "the red-green test check", "review mode (mode 3)" → "the red-green test check".
  - Leave Modes 1 and 2 as they are.

- [ ] **Step 3: Run selfcheck.** Expected: `selfcheck: 0 failure(s)`.

- [ ] **Step 4: Commit**
  ```bash
  git add verification/SKILL.md agents/proof-auditor.md shared/proof-block.md scruffy/SKILL.md scruffy/references/intake.md scruffy-bug/SKILL.md scruffy-bug/references/models.md scripts/selfcheck.sh
  git commit -m "Rename verification Mode 3 to the red-green test check"
  ```

### Task 4: The lane

**Files:**
- Create: `scruffy-review/SKILL.md`
- Create: `memory/voice/pairs.md`, `memory/voice/rules.md` (empty, with a one-line header each, so step 1's citations resolve; Task 5 fills them)
- Modify: `scripts/check-paths.py` (add `scruffy-review` to `tops`, so its `../` citations are checked, and citations of it from `scruffy/` resolve)
- Modify: `scripts/selfcheck.sh`

**Interfaces:**
- Consumes: the resolver CLI (Task 1), the prompts, `contract.md` and `pr-reviewer` (Task 2), and the red-green test check (Task 3).
- Frontmatter: `name: scruffy-review`, a description saying it's entered only via `/scruffy review <pr>`, and `disable-model-invocation: true`, matching `scruffy-bug/SKILL.md`.
- Input: a PR URL, from the dispatcher.
- Run dir: `~/Projects/tickets/review-<repo>-<n>/`. Artifacts: `capabilities*.json`, `seats.resolved.json`, `reviews/<seat>.md`, `red-green/` (when it runs), `report.md`, `followups.md`, `drafts.md`.
- `report.md` header lines: `Seats:` (one `seat=model` per seat), `single-provider run` (when true), `seat failed: <seat>` (per failure), `Red-green test check:` (`PASSED`, `FAILED: <reason>`, `INCONCLUSIVE: <reason>` or `skipped (contained, not codeless)`), then `Confirmed: n · Contested: n · Refuted: n`.
- `report.md` body sections, in order: **Both reviewers found**, **Only Opus found**, **Only <reviewer-b model> found**, **Contested**, then the refuted count with the list in a `<details>` block.

- [ ] **Step 1: Add the failing selfcheck lines**
  ```bash
  check "review lane exists"             test -f scruffy-review/SKILL.md
  check "review lane not model-invocable" grep -q "^disable-model-invocation: true$" scruffy-review/SKILL.md
  check "lane calls the resolver"        grep -q "resolve-seats.py" scruffy-review/SKILL.md
  check "lane handles needs-search"      grep -q "needs-search" scruffy-review/SKILL.md
  check "lane fetches fork heads"        grep -q "pull/<n>/head" scruffy-review/SKILL.md
  check "lane no harness isolation"      bash -c '! grep -q "isolation:" scruffy-review/SKILL.md'
  check "lane integrity check"           grep -q "status --porcelain" scruffy-review/SKILL.md
  check "lane red-green on codeless"     bash -c 'grep -qi "red-green test check" scruffy-review/SKILL.md && grep -q "codeless" scruffy-review/SKILL.md'
  check "lane drafts only when settled"  grep -qi "settled" scruffy-review/SKILL.md
  check "lane posts only on go"          grep -qi "only on his go\|only after his go" scruffy-review/SKILL.md
  check "lane single-provider flag"      grep -q "single-provider run" scruffy-review/SKILL.md
  check "lane outside-diff not inline"   grep -q "outside-diff" scruffy-review/SKILL.md
  check "lane uses merge-base"           grep -q "merge-base" scruffy-review/SKILL.md
  check "lane forces deep red-green"     grep -q "depth: deep" scruffy-review/SKILL.md
  check "lane ignores red-green refs"    grep -q "refs/heads/scruffy-redgreen/" scruffy-review/SKILL.md
  check "path checker covers review"     grep -q '"scruffy-review"' scripts/check-paths.py
  ```
  Run: `scripts/selfcheck.sh`. Expected: these fail.

- [ ] **Step 2: Write `SKILL.md`.** It opens with one line: Amel is the final authority; the lane never posts, approves or requests changes on its own. Then these steps, each a short paragraph.
  1. **Read first.** `../memory/rules.md` and `../memory/voice/rules.md`. When `../memory/voice/pairs.md` has 3 or more edited pairs since the last proposal, propose candidate voice rules now, per Task 5.
  2. **Resolve seats.**
     - With the T3 tools present: call `orchestrator_capabilities`, save the result to `capabilities.json`, and run `python3 ~/.claude/skills/scruffy-review/scripts/resolve-seats.py --caps <run_dir>/capabilities.json`. On exit 4, call `orchestrator_capabilities` with `search: <model>` for each `needs-search` line, save each result as `capabilities-<model>.json`, and rerun with every `--caps` file.
     - Without T3: run with `--claude-only`.
     - Exit 3 ends the run `blocked`, naming the seat.
     - Save the output as `seats.resolved.json`.
  3. **Worktree.** `repo_path` comes from `../scruffy-bug/references/repo-routing.md`. A repo the table doesn't route: `--project <path>`, else the repo the session's cwd is in, else the run ends `blocked` naming the repo. `gh pr view <url> --json headRefOid,baseRefOid,baseRefName,number,title,body`. Fetch both sides: `git -C <repo_path> fetch origin pull/<n>/head <baseRefName>`, which works for forks and same-repo PRs alike. Set `head` to `headRefOid` and `base` to `git -C <repo_path> merge-base <baseRefOid> <headRefOid>`, never `baseRefOid` itself: when the base branch has moved on since the PR branched, its tip would show main's newer commits as removals and give the red-green test check the wrong parent. Then `git -C <repo_path> worktree add --detach <run_dir>/head <head>`. Snapshot `git -C <repo_path> for-each-ref`. Never use `isolation:"worktree"`; it branches from the wrong repo (see `../shared/orchestration.md` §The runner ladder).
  4. **Decide the red-green test check.** It runs when the routed repo is `codeless`, or when the radius is `Shared` per `../verification/SKILL.md`'s radius table (grep the callers of what the diff changes). Record the decision and the reason in `report.md`.
  5. **Blind dispatch.** Run `reviewer-a` and `reviewer-b` in parallel. When the red-green test check runs, start it in the same step.
     - Reviewer packet: `references/reviewer.md`, `references/contract.md`, the worktree path, `base` and `head`, and the PR title and body. No other reviewer's output and no diff text. Reviewers read the worktree, so a large diff never fills the prompt.
     - Transport `t3`: `delegate_task` with `target: {providerInstanceId, model, options}` from `seats.resolved.json`.
     - Transport `agent`: `Agent` with `subagent_type: pr-reviewer`, `model: <agent_model>` and `effort: high`.
     - Red-green test check: follow `../verification/SKILL.md` §Red-green test check with `depth: deep` and `parent: <base>`, writing into `<run_dir>/red-green/`. Its parent-commit worktree goes under `<run_dir>/red-green/parent` and its scratch branch is named `scruffy-redgreen/<n>`. On `codeless`, use the recipe in `../memory/codeless/recipes/`.
     - Write each review to `reviews/<seat>.md`.
  6. **Integrity check after each reviewer.** Check that `git -C <worktree> rev-parse HEAD` equals `head`, that `git -C <worktree> status --porcelain` is empty, and that `for-each-ref` is unchanged from the snapshot, ignoring refs under `refs/heads/scruffy-redgreen/`, which the red-green test check creates on purpose. On a failure, discard that review, record `seat failed: <seat> (wrote to the worktree)`, and reset with `git -C <worktree> checkout --detach <head> && git -C <worktree> clean -fd`.
  7. **Seat failure.** If a dispatch errors, retry it once. A seat with a fallback: rerun the resolver with `--exclude <provider>/<model>` for the failed model and dispatch on its new model. A seat with no fallback: dispatch again on the same model, without the resolver, since `--exclude` would exit 3. If it fails again, record `seat failed: <seat>`. If both reviewers fail, the run ends `blocked`. If the judge fails twice, the run ends `blocked` with both reviews kept.
  8. **Judge.** Dispatch `judge` with `references/judge.md`, `references/contract.md`, the worktree path, `base` and `head`, both `reviews/<seat>.md` labelled by seat and model, and the red-green result when there is one. Write `report.md` with the header and sections from Interfaces.
  9. **Report and follow-ups.** Show Amel the header, then the sections. For each CONTESTED finding, show the raising reviewer's claim, the conflicting `checked_and_sound` line or the judge's reason, and the evidence. He asks questions. Answer from the code in the main thread when you can. When his question disputes a verdict, dispatch a new judge round with the original packet, the current verdict for that finding, and his question, and log it in `followups.md`. On T3 that is a new `delegate_task` call per round with its own `clientRequestId`, never `t3_thread_send` to the child thread. At most 4 follow-up rounds per run; after that, say so and answer in the main thread. The findings are **settled** when he says which ones to keep. Until then, no drafts.
  10. **Draft.** Draft comments from the findings he kept, with the `pr-review-comments` skill, into `drafts.md`. Give each draft an id (`d1`, `d2`, …) with its `file:line`. `outside-diff` findings go into the review body, never as inline comments. A `FAILED` red-green test check goes in the review body, with the test offered.
  11. **Post only on his go.** He edits the drafts in chat or in `drafts.md`. On go, post his versions as one review, as `pr-review-comments` describes. Then record the pairs, per Task 5.
  12. **Log and clean up.** Append one row to `~/Projects/tickets/REVIEW-LOG.md`: `date | pr | seats (seat=model) | single-provider | red-green | confirmed | contested | refuted | kept | posted`. The `posted` column stays `no` until he says go. This is the calibration data. Then `git -C <repo_path> worktree remove <run_dir>/head`, and when the red-green test check ran, `git -C <repo_path> worktree remove --force <run_dir>/red-green/parent` and `git -C <repo_path> branch -D scruffy-redgreen/<n>`. Keep the test file itself in `<run_dir>/red-green/`, since it's offered to the author.

- [ ] **Step 3: Run selfcheck and the path checker**
  Run: `scripts/selfcheck.sh`. Expected: `selfcheck: 0 failure(s)`, including `relative ../ paths resolve`.

- [ ] **Step 4: Commit**
  ```bash
  git add scruffy-review/SKILL.md memory/voice scripts/check-paths.py scripts/selfcheck.sh
  git commit -m "Review lane: resolve, blind review, red-green test check, judge, follow-ups, drafts"
  ```

### Task 5: Learning Amel's voice

**Files:**
- Modify: `memory/voice/pairs.md`, `memory/voice/rules.md` (created empty in Task 4)
- Modify: `shared/learning.md` (the kinds table)
- Modify: `scruffy-review/SKILL.md` (steps 1 and 11 point here)
- Modify: `~/.claude/skills/pr-review-comments/SKILL.md` (outside this repo, one line)
- Modify: `scripts/selfcheck.sh`

**Interfaces:**
- `pairs.md` holds one entry per posted comment: `date | pr | draft id | file:line | draft | posted | edited: yes/no`. Unedited pairs are recorded too; they show what he accepts as written.
- `rules.md` holds approved voice rules only, one per line, each with the date and the pairs it came from.

- [ ] **Step 1: Add the failing selfcheck lines**
  ```bash
  check "voice pairs file exists"        test -f memory/voice/pairs.md
  check "voice rules file exists"        test -f memory/voice/rules.md
  check "learning names voice"           grep -q "memory/voice" shared/learning.md
  check "lane records posted pairs"      grep -q "voice/pairs.md" scruffy-review/SKILL.md
  ```
  Run: `scripts/selfcheck.sh`. Expected: these fail.

- [ ] **Step 2: Recording.** In step 11 of the lane: after posting, fetch what was actually posted with `gh api repos/<owner>/<repo>/pulls/<n>/comments --paginate`, filtered to `user.login == $(gh api user -q .login)`, and the review body. Match each posted comment to its draft by `path` and `line`. Append one row per pair to `pairs.md`. This also catches comments he edited on GitHub after posting, if the next run on the same PR re-fetches.

- [ ] **Step 3: Proposing.** In step 1 of the lane: with 3 or more edited pairs since the last proposal, generalize them into candidate rules, per the test in `../scruffy-bug/references/learning.md`: could a future draft be judged on whether it followed the rule? "Drop the second sentence when the first already names the fix" passes. "Sound more like Amel" does not. Show the candidates with the pairs behind each. He approves, edits or discards. Only approved rules go into `rules.md`. Record the proposal date at the top of `pairs.md` so the next count starts there.

- [ ] **Step 4: Wire the drafting skill.** Add one line to the `## Voice` section of `~/.claude/skills/pr-review-comments/SKILL.md`: `Also follow every rule in ~/.claude/skills/memory/voice/rules.md. Where it contradicts this section, the rules file wins; it is newer and comes from his edits.` Add a row to `shared/learning.md`'s kinds table: `Voice | ../memory/voice/rules.md | how Amel writes review comments, from his edits | proposed at the review lane's start | Amel approves`.

- [ ] **Step 5: Run selfcheck.** Expected: `selfcheck: 0 failure(s)`.

- [ ] **Step 6: Commit** (the `pr-review-comments` edit is outside the repo and isn't committed)
  ```bash
  git add memory/voice shared/learning.md scruffy-review/SKILL.md scripts/selfcheck.sh
  git commit -m "Review lane: record draft and posted pairs, propose voice rules for approval"
  ```

### Task 6: Entry points and install

**Files:**
- Modify: `scruffy/SKILL.md` (Input line, `argument-hint`, Setup 3 row)
- Modify: `scruffy/references/intake.md` (the "Please review PR #1234" row)
- Modify: `scruffy-bug/SKILL.md` (line 84)
- Modify: `scruffy-bug/references/models.md` (Caps table)
- Modify: `scripts/install.sh`
- Modify: `README.md` (opening paragraph, skill table, Use, tree)
- Modify: `scripts/selfcheck.sh`

- [ ] **Step 1: Add the failing selfcheck lines**
  ```bash
  check "dispatcher routes review"       grep -q "../scruffy-review/SKILL.md" scruffy/SKILL.md
  check "argument-hint has review"       bash -c 'grep "^argument-hint:" scruffy/SKILL.md | grep -q "review <pr>"'
  check "intake routes PR review"        bash -c 'grep "review PR #1234" scruffy/references/intake.md | grep -q "review"'
  check "review lane in run cap"         grep -q "Review lane" scruffy-bug/references/models.md
  check "installer links review lane"    grep -q "scruffy-review" scripts/install.sh
  check "README names the review lane"   grep -q "scruffy-review" README.md
  ```
  Run: `scripts/selfcheck.sh`. Expected: these fail.

- [ ] **Step 2: Dispatcher.**
  - In the Input line of `scruffy/SKILL.md`, add: first token `review` → `../scruffy-review/SKILL.md` and nothing else in this file.
  - Add `| review <pr>` to `argument-hint`.
  - Setup 3: the row "Someone else's PR handed over to be reviewed" now routes to `review` — read `../scruffy-review/SKILL.md` and run it.
  - `intake.md`: "Please review PR #1234" → lane `review`.
  - `scruffy-bug/SKILL.md` line 84: someone else's PR goes to the review lane.

- [ ] **Step 3: Caps.** In `models.md` Caps, add the row `| Review lane, per run | **11** invocations (3 seats + 3 retries + 1 proof-auditor + 4 follow-up judge rounds) | seat failed: <seat>; both reviewers → blocked; follow-ups past 4 answered in the main thread |`.

- [ ] **Step 4: Install.** Add `scruffy-review` to the `for s in …` loop and the `installed:` echo in `scripts/install.sh`. Add `chmod +x "$root"/scruffy-review/scripts/*.py`.

- [ ] **Step 5: README.**
  - Opening paragraph: Scruffy has three lanes. Reviews get two blind reviewers, a judge, a red-green test check when it applies, and drafts in Amel's voice.
  - Skill table: a `scruffy-review` row. The `verification` row says it also runs the red-green test check.
  - Agents table: a `pr-reviewer` row.
  - Use: `/scruffy review <pr>`.
  - Tree: the `scruffy-review/` block and `memory/voice/`.
  - The Windows `mklink` list: a `scruffy-review` line.

- [ ] **Step 6: Run selfcheck.** Expected: `selfcheck: 0 failure(s)`.

- [ ] **Step 7: Commit**
  ```bash
  git add scruffy/SKILL.md scruffy/references/intake.md scruffy-bug/SKILL.md scruffy-bug/references/models.md scripts/install.sh README.md scripts/selfcheck.sh
  git commit -m "Review lane: /scruffy review entry point, install, caps, README"
  ```

### Task 7: Trial run

No code. This proves the wiring on real PRs before calibration.

- [ ] **Step 1: Install.** Run `scripts/install.sh`. Expected: the output lists `scruffy-review` and the agent `pr-reviewer.md`, and `test -f ~/.claude/skills/scruffy-review/scripts/resolve-seats.py` passes.
- [ ] **Step 2: Contained PR on the work account.** Run `/scruffy review <a merged ledger PR, not codeless, contained, with a known review comment>`. Expected:
  - `seats.resolved.json` has `reviewer-b=gpt-6.1-sol` and `judge=claude-sonnet-5-5`.
  - `report.md` has no `single-provider run` line and says `Red-green test check: skipped (contained, not codeless)`.
  - One follow-up question that disputes a verdict produces one new judge round, logged in `followups.md`.
  - No drafts appear before the findings are settled.
  - `REVIEW-LOG.md` has a row with `posted: no`. The worktree is removed. Nothing is posted.
- [ ] **Step 3: Codeless PR.** Run it on a merged codeless PR. Expected: the red-green test check runs, `red-green/` holds the evidence, and the report header carries its result.
- [ ] **Step 4: Personal-account simulation.** Run the Step 2 PR with the resolver forced to `--claude-only`. Expected: `reviewer-b=claude-fable-5-1`, and the header says `single-provider run`.
- [ ] **Step 5: Voice pairs.** Using the Step 2 drafts, give one edited and one unedited version and let the lane record them without posting (a `--dry-post` note in `pairs.md` is fine for the trial). Expected: two rows in `pairs.md`, `edited: yes` and `edited: no`.
- [ ] **Step 6: Report to Amel.** Report which known comments the lane caught and which it missed, what the judge contested, and what each run cost in invocations. Calibration across 10–20 PRs is a separate plan.

---

**Out of scope, separate plans:**
- Calibration across 10–20 ledger PRs, and model reassignment from its results.
- Running the review lane on the feature lane's assembled branch. The 2026-10-27 draft did this; it isn't part of the three-lane design.
- Watching the reviewed PR for the author's replies. `/scruffy watch` covers PRs Amel opened, not ones he reviewed.
