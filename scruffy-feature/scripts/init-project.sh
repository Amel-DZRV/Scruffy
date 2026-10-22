#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 1 ]; then
  echo "usage: init-project.sh <project-repo-path>" >&2
  exit 2
fi

lane_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
project="$1"

if [ ! -d "$project" ]; then
  echo "not a directory: $project" >&2
  exit 2
fi

target="$project/memory/projects"
mkdir -p "$target"

created=0
kept=0
for role_dir in "$lane_root"/roles/*/; do
  role="$(basename "$role_dir")"
  file="$target/$role.md"
  if [ -e "$file" ]; then
    kept=$((kept + 1))
    continue
  fi
  printf '# %s: project facts memory\n\nThis project'"'"'s specific context for the %s role only. Judgment about how Amel decides belongs in `memory/global/%s.md`; product truth belongs in Notion.\n\nNo facts recorded yet.\n' "$role" "$role" "$role" > "$file"
  created=$((created + 1))
done

echo "created=$created kept=$kept dir=$target"
