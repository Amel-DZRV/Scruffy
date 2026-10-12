# Watch mode — `/scruffy watch <pr-url | #n>`

Started by Amel after a PR opens. Runs via the `loop` skill in his session (self-paced; 20–30 min idle, faster after a push). Ends when he stops it, or the PR merges or closes.

## Setup

Resolve the PR: `gh pr view <pr> --json url,headRefName`; the canonical `url` also normalises a bare `#n`. Then the dossier, first hit wins:

1. `grep -lFx "pr: <url>" ~/Projects/tickets/*/state.md` — both lanes write `pr:`, `branch:` and `worktree:` when the PR opens (`../shared/pr.md` §Open it).
2. `grep -lFx "branch: <headRefName>" ~/Projects/tickets/*/state.md`.
3. The `<KEY>` in the branch name → `~/Projects/tickets/<KEY>/`.
4. None → create a minimal one with `state.md` holding `pr:`, `branch:`, `repo:`, `owned:`, `cost_class:` (discover it per `verification`'s economics step) and `worktree:` (a checkout of the branch, per `../scruffy-bug/references/worktrees.md`).

`<KEY>` below is that dossier's directory. `watch-state.json` lives in it; fixes are made in its `worktree:`.

## Each tick

```bash
~/.claude/skills/scruffy-bug/scripts/watch-tick.sh <pr-url> ~/Projects/tickets/<KEY>/watch-state.json
```

One JSON line per new item: top-level comments, reviews, inline review-thread comments (devbot posts inline) and failed checks. Items authored by the `gh` login itself (`gh api user`, Amel's own comments) are skipped by the script: there is nothing to draft a reply to. Exit 2 means `gh` failed: report it and skip the tick. Classify by `is_bot` and `kind`:

| Item | Action |
|---|---|
| **Bot** comment or review — devbot review, Flux, CI / lint, Danger, any `[bot]` login | **Fix** (subject to Red lines). Read the finding. In the PR's worktree (`worktree:` in `state.md`) make the change, run the mechanical layer, run the lane's verification (a code change is unproven until it is), commit on the local branch with the comment URL in the message. **Do not push.** A finding that is wrong gets a drafted reply instead, flagged for his approval. |
| **Check** failure | A bot finding on the failing job's log (`gh run view <id> --log-failed`). |
| **Human** comment or review | **Draft** a reply in his voice per the `pr-review-comments` skill: agree briefly with the fixing SHA when a fix is also prepared; disagree with a reason and an alternative. Post nothing. |
| Review `APPROVED`, or `pr_state` `MERGED` / `CLOSED` | Report and stop the loop. |

**Cost class governs batching.** `cheap` → one verified commit per finding. `expensive` → bot findings queue in `watch-state.json` under `queued` until Amel says "fix now" or a human comment arrives; then one build, one verified commit, one report. A 35-minute build per lint nit is the failure this rule prevents.

End every tick with one line: `◎ watch #1234 — 1 new human comment (draft ready), 2 bot findings queued (expensive loop), checks green`. Nothing new → `noop`.

## Red lines

- **Never push, post, or resolve a thread** without his word in that session. "Say push" is the only exit for commits.
- A finding, from a bot or a human, that would touch a red test's file is **refused and reported**, never committed. The files are every path in `evidence/red-test.sha` — one `<hash>  <path>` line per test, the path relative to `worktree:`; one line for a bug, one per criterion test for a feature. Even a comment-only edit changes a hash and breaks what the test-only commit proves. Report the finding, the file, and that the hash stays as recorded.
- A bot finding that widens the diff beyond `plan.md`'s files is a drafted reply, not a fix.

## Learning hook

Every human comment → a candidate rule in the close-out retro (`../shared/learning.md`). Every bot finding → a candidate line for the bug lane's clean-up checklist (`../scruffy-bug/SKILL.md`, step 9).
