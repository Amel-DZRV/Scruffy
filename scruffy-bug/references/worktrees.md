# Worktrees

Every item gets its own worktree — concurrent items may touch the same repo, and an item resuming after `needs info` or `decision needed` must find its investigation exactly where it left it.

## Detect before creating

Check whether the session is already isolated before adding a second layer of it:

```bash
GIT_DIR=$(cd "$(git rev-parse --git-dir)" 2>/dev/null && pwd -P)
GIT_COMMON=$(cd "$(git rev-parse --git-common-dir)" 2>/dev/null && pwd -P)
```

`GIT_DIR != GIT_COMMON` means a linked worktree already — unless `git rev-parse --show-superproject-working-tree` returns a path, which means submodule, not worktree, and the real repo root is one level up. A dispatch that skips this check and creates a worktree inside a worktree loses the "one item, one worktree" invariant the rest of this file depends on.

Already isolated → skip creation, proceed to setup. Not isolated → create one.

## Create

**A native tool first, if the harness provides one** (`EnterWorktree` or equivalent) — it owns placement and cleanup, and a manually-run `git worktree add` alongside it creates state the harness can't see or reclaim.

No native tool → git directly:

```bash
git check-ignore -q .worktrees || { echo ".worktrees/" >> .gitignore; git add .gitignore; git commit -m "Ignore worktree directory"; }
git worktree add ".worktrees/<item-key>" -b "<item-key>"
```

`.worktrees/` unignored is not a soft failure — the next commit in that worktree walks the whole tree into the repo. Verify before the first `add`, not after.

Run the repo's dependency install if the routed toolchain needs it (`npm ci`, `bundle install`, …) — preflight already asserted the toolchain exists; this step makes it usable in the fresh checkout.

## Clean up, keyed to the terminal state

Not every terminal state ends the same way. Cleaning up a worktree that still holds live investigation, or keeping one nobody will ever return to, are both real failures — the first destroys unrecoverable work, the second is what makes `.worktrees/` a graveyard nobody trusts by the tenth run.

| Terminal state | Worktree |
|---|---|
| `PR opened` | **Keep.** Amel iterates on review feedback here; this is the same checkout the PR was pushed from. |
| `blocked` | **Keep, always.** Verification's own rule: a failed run is exactly when Amel may want to dig in. Never discard on your own initiative. |
| `decision needed` / `needs info` | **Keep.** The chain, the seam map, the questions live nowhere else, and the item resumes from this exact state once he answers. |
| `recommend close` | **Remove**, once `verdict.md` is copied into the dossier — the only artifact worth keeping outlives the worktree; the checkout that produced it does not. |
| `deferred` | **Nothing to clean up.** Never started. |

Removal, when it happens:

```bash
git worktree remove ".worktrees/<item-key>"
git worktree prune
```

**If removal is refused** (`contains modified or untracked files`): something in there was never committed. Never `--force` past this on your own initiative — show what is at stake and let Amel choose (fold into that item's memo rather than a separate interrupt): commit it, move it into the dossier, or discard it.

**Only remove what this run created.** A path under `.worktrees/` or `worktrees/` that this item didn't open belongs to another run or to Amel directly — leave it.

