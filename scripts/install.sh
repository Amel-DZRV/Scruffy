#!/usr/bin/env bash
# Symlink-install Scruffy's four skills and agents. Symlink only: shared/ and memory/
# are reached relative to each skill dir, and recipes/paths are written back through the links.
set -euo pipefail
root=$(cd "$(dirname "$0")/.." && pwd)
mkdir -p ~/.claude/skills ~/.claude/agents
for old in bug-eater feature-dev screen-audit taimi; do rm -rf ~/.claude/skills/$old; done
rm -f ~/.claude/agents/design-judge.md
for s in scruffy scruffy-bug scruffy-feature verification; do
  rm -rf ~/.claude/skills/$s; ln -sfn "$root/$s" ~/.claude/skills/$s
done
cp "$root"/agents/*.md ~/.claude/agents/
chmod +x "$root"/scruffy-bug/scripts/*.sh "$root"/scruffy-bug/scripts/*.py "$root"/scruffy-feature/scripts/* "$root"/scripts/*.sh "$root"/scripts/*.py
# Skills read ../shared via their real path; expose it the same way for tools that resolve logically.
ln -sfn "$root/shared" ~/.claude/skills/shared
ln -sfn "$root/memory" ~/.claude/skills/memory
# Prove the relative paths resolve through the links.
test -f ~/.claude/skills/shared/orchestration.md
test -f ~/.claude/skills/memory/rules.md
echo "installed: scruffy scruffy-bug scruffy-feature verification; agents: $(ls "$root"/agents | tr '\n' ' ')"
