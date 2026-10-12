# Worktrees

Every feature gets a platform branch in its own worktree, and every parallel track gets a short-lived worktree of its own.

## Detect before creating

Check whether the session is already isolated before adding a second layer:

```bash
GIT_DIR=$(cd "$(git rev-parse --git-dir)" 2>/dev/null && pwd -P)
GIT_COMMON=$(cd "$(git rev-parse --git-common-dir)" 2>/dev/null && pwd -P)
```

`GIT_DIR != GIT_COMMON` means a linked worktree already, unless `git rev-parse --show-superproject-working-tree` returns a path (a submodule, not a worktree). Already isolated → skip creation. Not isolated → create one.

## Create

A native tool first, if the harness provides one (`EnterWorktree` or equivalent). It owns placement and cleanup.

No native tool → git directly:

```bash
git check-ignore -q .worktrees || { echo ".worktrees/" >> .gitignore; git add .gitignore; git commit -m "Ignore worktree directory"; }
git worktree add ".worktrees/<feature-key>-<platform>" -b "<feature-key>-<platform>"
```

`.worktrees/` unignored is not a soft failure: the next commit in that worktree walks the whole tree into the repo. Verify before the first `add`, not after.

Run the project's dependency install if the toolchain needs it, so the fresh checkout is usable.

## Clean up

| State | Worktree |
|---|---|
| PR opened | **Keep.** Amel iterates on review feedback here. |
| `blocked` | **Keep, always.** Never discard on your own initiative. |
| `decision needed` | **Keep.** The seam notes and questions live nowhere else. |

Removal, when it happens:

```bash
git worktree remove ".worktrees/<name>"
git worktree prune
```

If removal is refused (`contains modified or untracked files`), something was never committed. Never `--force` past it on your own initiative: show what is at stake and let Amel choose.

Only remove what this run created.

## Track worktrees

`.worktrees/<feature-key>-<platform>-track-<n>`, branched from the platform branch's test commit. Removed immediately after successful integration, kept only when the track ended `blocked`. They never outlive the platform branch's own state.
