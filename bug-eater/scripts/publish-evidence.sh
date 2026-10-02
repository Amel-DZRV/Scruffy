#!/usr/bin/env bash
# Publish evidence images so a PR body can show them. Local PNGs cannot be referenced from
# markdown, and neither `gh pr create` nor the GitHub API can attach them, so this pushes them
# to an orphan branch `scruffy-evidence/<KEY>` on the PR's repo and prints image markdown.
#
#   publish-evidence.sh <repo path> <KEY> <label=file> [<label=file> ...]
#
# stdout, one line per image:  ![<label>](<url>)
# exit 0  published
# exit 3  PUSH REFUSED — no write access to the repo (the usual case on a repo Amel does not
#         own). Nothing was published. The caller falls back to the drag-in placeholder; this is
#         not a failure of the run.
# exit 2  usage or missing file
set -u
[ $# -ge 3 ] || { echo "usage: publish-evidence.sh <repo> <KEY> <label=file>..." >&2; exit 2; }
repo="$1"; key="$2"; shift 2
remote=$(git -C "$repo" remote get-url origin 2>/dev/null) || { echo "no origin remote in $repo" >&2; exit 2; }
case "$remote" in *github.com*) ;; *) echo "PUSH REFUSED: origin is not a github.com remote" >&2; exit 3;; esac
# owner/repo from an https or ssh remote
slug=$(printf '%s' "$remote" | sed -E 's#^(git@[^:]+:|https?://[^/]+/)##; s#\.git$##')
branch="scruffy-evidence/$key"

tmp=$(mktemp -d); trap 'rm -rf "$tmp"' EXIT
git -C "$tmp" init -q
git -C "$tmp" config user.email "scruffy@localhost"; git -C "$tmp" config user.name "Scruffy"
lines=()
for pair in "$@"; do
  label="${pair%%=*}"; file="${pair#*=}"
  [ -f "$file" ] || { echo "missing file: $file" >&2; exit 2; }
  name="$label.${file##*.}"
  cp "$file" "$tmp/$name"
  lines+=("![${label}](https://github.com/${slug}/blob/${branch}/${name}?raw=true)")
done
git -C "$tmp" add -A && git -C "$tmp" commit -q -m "Evidence images for $key"
if ! git -C "$tmp" push -q "$remote" "HEAD:refs/heads/$branch" -f >/dev/null 2>"$tmp/push.err"; then
  echo "PUSH REFUSED: $(tr '\n' ' ' < "$tmp/push.err" | cut -c1-200)" >&2
  exit 3
fi
printf '%s\n' "${lines[@]}"
