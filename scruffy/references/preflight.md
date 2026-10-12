# Preflight

Runs before anything is spent. Fan out hard — every check is cheap, independent, and read-only. More agents is strictly faster.

A silent 35-minute build failure is the most expensive event possible in a run. This step exists to make that impossible.

## Split the work

Helpers run in parallel, cheapest model that answers reliably. They do not need each other's results.

| Helper | Checks |
|---|---|
| Repos | Every repo the run could touch exists, worktree clean, `git fetch` succeeds, file count recorded |
| Toolchain | Whatever the routed repos actually need — discovered from their build files and CI config, not assumed |
| Access | `gh auth status`, tracker reachable, network for web search |
| Skills | Every `SKILL.md` this run will read is present and readable at its absolute path, and `~/.claude/agents/evidence-capturer.md`, `scruffy/scripts/pair-diff.py`, `scruffy/scripts/ui-touch.sh` present and executable |
| Ledger backfill | For every ledger row with a PR link and a blank outcome: `gh pr view <url> --json state,reviewDecision,mergedAt,comments,reviews`. Bash, no model. **Fetches the review comments as well as the outcome** — see `references/learning.md`; this is the only trigger the correction loop has. Read the fetched `comments` and `reviews` bodies for attached images or screenshot requests to fill the pair-outcome column. |

## Check the toolchain the repo asks for, not a generic one

The failure this prevents is passing a check that was never the real constraint.

- **Read the repo's own test and launch scripts.** Extract the device name, OS version, and toolchain version they actually use, and assert *those* exist. "An iOS simulator boots" passed with 11 available while `scripts/test-ios-renderer` hardcoded `iPhone 11` on `18.5`, and CI pinned Xcode 16.4 against a machine that had only 26.6.
- **Assert the exact path a launch skill names.** `run-doordash-consumer` has shipped a dead `zulu-21.jdk` path that fails silently after ~35 minutes. Do not assert *a* JDK exists — assert the one the skill names. If the path has moved, the check follows the skill, not this file.
- **Report divergence up front.** Any green obtained on a different toolchain than CI's is reported as "green on Xcode X / iOS Y", never as "CI green".

## Repo size

Record the file count. In a repo over ~10k files, every checkout, rebase, worktree add and clone runs in the background or with an explicit long timeout — a foreground timeout mid-checkout leaves a half-finished rebase and hundreds of dirty files.

After any interrupted git operation, `git rebase --abort` is not enough. Verify with `git status --short | wc -l` and hard-reset if the tree is still dirty.

## Free disk

Multiple build output bases are enormous, and running out mid-build is a silent failure of exactly the kind this file exists to prevent. Check before, not after.

## Soft checks

Some tools only degrade a path rather than blocking it. Missing `axe` degrades the capture gate to build identity only, and the pair is marked `ungated` in the proof block. Report as a warning; do not route anything to `blocked` over a soft check alone.

Install with `brew install cameroncooke/axe/axe`.

If brew's post-install codesign step refuses (Command Line Tools older than Xcode):

```bash
curl -fL -o axe.tar.gz "https://github.com/cameroncooke/AXe/releases/download/v<version>/AXe-macOS-homebrew-v<version>.tar.gz"
tar -xzf axe.tar.gz
mkdir -p "$(brew --cellar)/axe/<version>/libexec"
cp -R axe Frameworks AXe_AXe.bundle "$(brew --cellar)/axe/<version>/libexec/"
codesign --force --sign - --timestamp=none "$(brew --cellar)/axe/<version>/libexec/Frameworks/"*.framework
codesign --force --sign - --timestamp=none "$(brew --cellar)/axe/<version>/libexec/axe"
brew link axe
```

## Skill reachability

Repo skills live in `<repo>/.claude/skills/`, so the `Skill` tool reaches them only when the session cwd is inside that repo. A cross-platform item touching two repos can never have both in cwd.

So: **`Read <repo>/.claude/skills/<name>/SKILL.md` and follow it.** Read-and-follow is the normal path, not the fallback. Preflight asserts each path is readable — a missing one blocks that item's evidence before any spend.

## Permissions

**Auto mode must be on.** A parallel run that halts on a permission prompt is a stalled run, and nobody is watching. Refuse to launch without it.

Not `--dangerously-skip-permissions`. These are repos Amel does not own; the difference between "a classifier judged this safe" and "nothing is checked" is the whole reason this is trustworthy.

Push and PR creation need no extra guard: nothing in a run can merge.

## Output

A pass/fail table, reported before continuing. Each failure names the check, what is missing, and what Amel must do — never a raw stack trace.

Any failure blocking an item's required evidence routes that item to `blocked` immediately. Items whose evidence is unaffected continue.
