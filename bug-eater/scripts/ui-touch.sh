#!/usr/bin/env bash
# Decide mechanically whether a diff touches UI. Prints UI or NON-UI plus the matched files.
set -euo pipefail
repo="$1"; parent="$2"; head="$3"
files=$(git -C "$repo" diff --name-only "$parent" "$head") || exit 2

# Excluded first: snapshot reference images look like UI and need no capture (Review Focus 4).
# Only the snapshot directories are excluded — an image elsewhere may be the change itself.
candidates=$(printf '%s\n' "$files" | grep -Ev '(__Snapshots__|/snapshots/)' || true)

# File-name patterns.
by_name=$(printf '%s\n' "$candidates" | grep -Ei '(View|Screen|Component|Layout|Cell|Renderer)[^/]*\.(swift|kt|m|mm)$|\.(xib|storyboard)$|/res/layout/.*\.xml$|/templates?/.*\.(json|yaml|yml)$|Assets\.xcassets/|/res/drawable' || true)

# Content patterns for files the name test missed.
by_content=""
while IFS= read -r f; do
  [ -z "$f" ] && continue
  if git -C "$repo" diff "$parent" "$head" -- "$f" | grep -Eq '^\+.*(@Composable|: View\b|UIView|UIViewController|NSLayoutConstraint|\.padding\(|\.frame\(|Modifier\.)'; then
    by_content="$by_content$f"$'\n'
  fi
done <<< "$candidates"

matched=$(printf '%s\n%s' "$by_name" "$by_content" | sed '/^$/d' | sort -u)
if [ -n "$matched" ]; then echo "UI"; printf '%s\n' "$matched"; else echo "NON-UI"; fi
