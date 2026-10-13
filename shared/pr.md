# PR mechanics, both lanes

Each lane owns its body sections (`../scruffy-bug/SKILL.md` step 10; `../scruffy-feature/mechanisms/pipeline/references/pr-format.md`). This file owns what happens around the body.

## Open it

`gh pr create --draft` when `owned: no` in the dossier; the feature lane on an owned project opens ready per its own format. Assign no reviewers. Use the repo's own PR template file if it has one; map the lane's sections onto it rather than replacing it.

Then write `pr:` (the PR URL), `branch:` (its head branch) and `worktree:` (the absolute path of the checkout it was pushed from) into `state.md`. `/scruffy watch` finds the dossier and the checkout by them.

## Attaching the screenshots

A step that must be seen to work. A local PNG cannot be referenced from markdown, and `gh pr create` or the API cannot attach one, so images are published first and the body links them:

```bash
~/.claude/skills/scruffy-bug/scripts/publish-evidence.sh <repo> <KEY> before=evidence/capture-before.png after=evidence/capture-after.png
```

- **Exit 0** → it printed one image-markdown line per file (pushed to an orphan `scruffy-evidence/<KEY>` branch on the PR's repo). Paste those lines into *Before / after*.
- **Exit 3, `PUSH REFUSED`** — no write access, the usual case on a repo you do not own → fall back: *Before / after* gets a placeholder line naming the two files and their absolute paths, `Screenshots to attach: drag capture-before.png and capture-after.png from <dossier>/evidence/ into this description`, and the run's final report lists the same paths so Amel can drag them in. This is a named gap, not a failure; Bug lane: the `For those interested` section says the images were not attached.
- **Reporter's screenshot only** (no capture pair): show it as `Before (from the reporter)`, and `After: not captured` — never leave the section looking complete.
- **Verify after opening.** Read the PR body back and fetch each image URL; one that does not resolve is the same fallback. A PR whose images do not render is the defect this step exists to prevent, so "I included the markdown" is not a result.
- The evidence branch outlives the PR; list it in `summary.md` so it can be deleted after merge.

## Paths and recipes

**Commit any new or changed path file in Scruffy** alongside the ticket comment — a recorded path that lives only outside the repo is lost on the next install. The install is symlink-only, so recorded files land in the repo directly. Path files live in `../memory/<repo>/paths/`, recipes in `../memory/<repo>/recipes/`.

## Tell the tracker

**Then comment on the ticket** — the PR link, and (bug lane) the repro confirmation from step 5 if it has not already been posted. It is what the reporter actually cares about and it costs nothing.

**TickTick-sourced item:** also move the card, per `../scruffy-bug/references/ticktick.md` — comment with the PR link, then move it to the `In Review` column if that board has one. Every other terminal state leaves the card where it is.
