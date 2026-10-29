---
name: scruffy-review
description: Scruffy's review lane. Entered only via /scruffy review <pr>. Two blind reviewers on different models, a red-green test check on codeless and shared-code PRs, a judge that checks every finding against the code, follow-up questions, then draft comments in Amel's voice, posted only on his go.
disable-model-invocation: true
---

# Scruffy — review lane

**Input:** a PR URL, from the dispatcher. This lane is read from `/scruffy review <pr>`, never invoked, so it takes no arguments of its own.

Amel is the final authority. This lane never posts, approves or requests changes on its own. It reviews someone else's PR, tells him what the reviewers agree on and where they don't, answers his questions, and drafts comments he edits before anything is posted.

Every step announces itself in chat as plain text before and after its tool calls.

**Run dir:** `~/Projects/tickets/review-<repo>-<n>/`. It holds `capabilities*.json`, `seats.resolved.json`, `reviews/<seat>.md`, `red-green/` (when it runs), `report.md`, `followups.md` and `drafts.md`.

**Cap:** 11 agent invocations per run — 3 seats, 3 retries (one per seat), 1 `proof-auditor`, 4 follow-up judge rounds (`../scruffy-bug/references/models.md` §Caps).

## 1 — Read first

`../memory/rules.md` and `../memory/voice/rules.md`. Count the rows in `../memory/voice/pairs.md` with `edited: yes` dated after its `last_proposal:` line. Three or more → propose candidate voice rules now, per §Voice below, before the review starts.

## 2 — Resolve seats

| Seat | Model | Fallback |
|---|---|---|
| `reviewer-a` | `claude-opus-5-5` | none |
| `reviewer-b` | `gpt-6.1-sol` | `claude-fable-5-1` |
| `judge` | `claude-sonnet-5-5` | none |

The table is `seats.json`; the script decides what runs.

- **With the T3 tools present:** call `orchestrator_capabilities`, save the result to `<run_dir>/capabilities.json`, and run `python3 ~/.claude/skills/scruffy-review/scripts/resolve-seats.py --caps <run_dir>/capabilities.json`. On exit 4, call `orchestrator_capabilities` with `search: <model>` for each `needs-search:` line, save each result as `capabilities-<model>.json`, and rerun with every `--caps` file.
- **Without T3:** run it with `--claude-only`.
- Exit 3 ends the run `blocked`, naming the seat.

Save the output as `seats.resolved.json`. When `single_provider` is true, the report header says `single-provider run`.

## 3 — Worktree

`repo_path` is a local clone of the PR's own `<owner>/<repo>`, taken from the URL, not from the ticket routing table: `--project <path>`, else the repo the session's cwd is in, else `~/Projects/<repo>`. Whichever it is, `git -C <repo_path> remote get-url origin` must name the same `<owner>/<repo>`; a mirror's `origin` points elsewhere, and `pull/<n>/head` there would fetch a different PR. No match → the run ends `blocked` naming the repo.

```bash
gh pr view <url> --json headRefOid,baseRefOid,baseRefName,number,title,body
git -C <repo_path> fetch origin pull/<n>/head <baseRefName>
head=<headRefOid>
base=$(git -C <repo_path> merge-base <baseRefOid> <headRefOid>)
git -C <repo_path> worktree add --detach <run_dir>/head <head>
git -C <repo_path> for-each-ref > <run_dir>/refs-before.txt
```

`pull/<n>/head` works for forks and same-repo PRs alike. `base` is the merge-base, never `baseRefOid` itself: when the base branch has moved on since the PR branched, its tip would show newer commits on it as removals and give the red-green test check the wrong parent.

Never use the harness's own worktree option on a dispatch. It branches from the wrong repo (`../shared/orchestration.md` §The runner ladder).

## 4 — Decide the red-green test check

It runs when either holds:

- the PR is on `doordash/codeless` (from its URL)
- the change's radius is `Shared` per the radius table in `../verification/SKILL.md` §Red-green test check — grep the callers of what the diff changes, not the line count

Otherwise it is skipped. Record the decision and the reason for the report: `Red-green test check: skipped (contained, not codeless)`.

## 5 — Blind dispatch

Run `reviewer-a` and `reviewer-b` in parallel. When the red-green test check runs, start it in the same step.

**Reviewer packet:** `references/reviewer.md`, `references/contract.md`, the worktree path, `base` and `head`, and the PR title and body. No other reviewer's output and no diff text — reviewers read the worktree, so a large diff never fills the prompt.

- **Transport `t3`:** `delegate_task` with `target: {providerInstanceId, model, options}` from `seats.resolved.json`. Claude seats go through `delegate_task` too, because the inherited options are non-empty and native `Agent` can't apply `effort: high`.
- **Transport `agent`:** `Agent` with `subagent_type: pr-reviewer`, `model: <agent_model>` and `effort: high`.

**Red-green test check:** follow `../verification/SKILL.md` §Red-green test check with `depth: deep` and `parent: <base>`. Write into `<run_dir>/red-green/`. Its parent-commit worktree goes at `<run_dir>/red-green/parent` and its scratch branch is `scruffy-redgreen/<n>`. On `codeless`, follow the recipe in `../memory/codeless/recipes/ios-sample-and-spectest.md`. Its result is one of `PASSED`, `FAILED: <reason>` or `INCONCLUSIVE: <reason>`.

Write each review to `reviews/<seat>.md`.

## 6 — Integrity check, after each reviewer

Reviewers run in full-access mode; read-only is a prompt rule, so check it:

- `git -C <run_dir>/head rev-parse HEAD` equals `head`
- `git -C <run_dir>/head status --porcelain` is empty
- `git -C <repo_path> for-each-ref` matches `refs-before.txt`, ignoring refs under `refs/heads/scruffy-redgreen/`, which the red-green test check creates on purpose

On a failure, discard that review, record `seat failed: <seat> (wrote to the worktree)`, and reset with `git -C <run_dir>/head checkout --detach <head> && git -C <run_dir>/head clean -fd`.

## 7 — Seat failure

A dispatch that errors is retried once.

- **A seat with a fallback** (`reviewer-b`): rerun the resolver with `--exclude <provider>/<model>` for the failed model and dispatch on the new model.
- **A seat with no fallback** (`reviewer-a`, `judge`): dispatch again on the same model, without the resolver, since `--exclude` would exit 3.

A second failure records `seat failed: <seat>`. Both reviewers failed → `blocked`. The judge failed twice → `blocked`, with both reviews kept in the run dir.

## 8 — Judge

Dispatch `judge` with `references/judge.md`, `references/contract.md`, the worktree path, `base` and `head`, both `reviews/<seat>.md` labelled by seat and model, and the red-green test check result or the reason it was skipped.

Write `report.md`. Header:

```
Seats: reviewer-a=<model> reviewer-b=<model> judge=<model>
single-provider run                       (only when true)
seat failed: <seat>                       (one per failure)
Red-green test check: PASSED | FAILED: <reason> | INCONCLUSIVE: <reason> | skipped (<reason>)
Confirmed: n · Contested: n · Refuted: n
```

Then the sections, in order: **Both reviewers found**, **Only Opus found**, **Only <reviewer-b's model> found**, **Contested**, and the refuted list inside `<details><summary>Refuted — n</summary>`. Each finding is `file:line — claim`, the verdict, and the judge's evidence. An `outside-diff` finding is labelled as such.

## 9 — Report and follow-ups

Show Amel the header, then the sections. For each CONTESTED finding, show the raising reviewer's claim, the conflicting `checked_and_sound` line or the judge's reason, and the evidence.

He asks questions.

- Answer from the code in the main thread when you can.
- When his question disputes a verdict, dispatch a new judge round: the original packet, the current verdict for that finding, and his question verbatim. On T3 that is a new `delegate_task` call with its own `clientRequestId`, never a message to the earlier child thread. Log the question, the answer and the verdict change in `followups.md`, and update `report.md`.
- At most 4 follow-up rounds per run. After that, say so and answer in the main thread.

The findings are **settled** when he says which ones to keep. Until then, no drafts.

## 10 — Draft

Draft comments from the findings he kept, with the `pr-review-comments` skill, into `drafts.md`. Each draft gets an id (`d1`, `d2`, …) and its `file:line`.

- An `outside-diff` finding goes into the review body, never as an inline comment.
- A `FAILED` red-green test check goes into the review body, with the test offered from `<run_dir>/red-green/`.

## 11 — Post only on his go

He edits the drafts, in chat or in `drafts.md`. On his go, post his versions as one review, as `pr-review-comments` describes. Never post a draft he hasn't seen.

Then record the pairs (§Voice): every posted comment, edited or not, goes into `../memory/voice/pairs.md`.

## 12 — Log and clean up

Append one row to the `## Review lane` table in `~/Projects/tickets/REVIEW-LOG.md`. That file already holds the red-green test check's own log, with different columns; add the section with this header the first time, and never write these rows into the older table:

```
| date | pr | seats (seat=model) | single-provider | red-green | confirmed | contested | refuted | kept | posted |
```

`posted` stays `no` until he says go. This log is the calibration data: over time it shows how often the findings he keeps match what the reviewers agreed on.

Then:

```bash
git -C <repo_path> worktree remove <run_dir>/head
git -C <repo_path> worktree remove --force <run_dir>/red-green/parent   # when the red-green test check ran
git -C <repo_path> branch -D scruffy-redgreen/<n>                      # likewise
```

Keep the red-green test file in `<run_dir>/red-green/`; it may be offered to the author.

## Voice

The drafts start from `pr-review-comments` and `../memory/voice/rules.md`. The rules grow from his edits.

**Recording, at step 11.** After posting, fetch what was actually posted:

```bash
login=$(gh api user -q .login)
gh api repos/<owner>/<repo>/pulls/<n>/comments --paginate
gh api repos/<owner>/<repo>/pulls/<n>/reviews --paginate
```

Keep the comments and review body with `user.login == $login`. Match each comment to its draft by `path` and `line`, falling back to `original_line` when `line` is null (the comment went outdated after a push). Append one row per pair to `pairs.md`: `date | pr | draft id | file:line | draft | posted | edited: yes/no`. Unedited pairs count too; they show what he accepts as written. A later run on the same PR re-fetches, so an edit he made on GitHub after posting replaces the earlier `posted` text.

**Proposing, at step 1.** With three or more edited pairs since `last_proposal:`, generalize them into candidate rules, per the test in `../scruffy-bug/references/learning.md`: could a future draft be judged on whether it followed the rule? "Drop the second sentence when the first already names the fix" passes. "Sound more like Amel" does not. Show each candidate with the pairs behind it. He approves, edits or discards. Only approved rules go into `rules.md`, with the date and the pairs. Then set `last_proposal:` in `pairs.md` to today, so the next count starts there.
