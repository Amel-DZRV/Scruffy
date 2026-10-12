#!/usr/bin/env bash
# Layout and cross-reference assertions for the Scruffy repo. Exit 0 = all pass.
cd "$(dirname "$0")/.."
fails=0
check() {  # check "<description>" <command...>
  local desc=$1; shift
  if "$@" >/dev/null 2>&1; then :; else fails=$((fails+1)); echo "FAIL $fails: $desc"; fi
}
grep_empty() {  # pass when grep finds nothing
  ! grep -rniE "$1" "${@:2}" 2>/dev/null | grep -q .
}

# --- Task 0: feature lane copied and renamed
check "scruffy-feature exists"            test -f scruffy-feature/SKILL.md
check "ROLES.md replaces taimi_roles.md"  test -f scruffy-feature/ROLES.md
check "no taimi_roles.md"                 test ! -e scruffy-feature/taimi_roles.md
check "rename grep clean (DESIGN.md exempt)" bash -c '! grep -rniE "taimi|feature-dev|LEARNED\.md|pipeline/scripts|references/orchestration|Relentless" scruffy-feature/ --exclude=DESIGN.md | grep -q .'
check "feature SKILL name"                grep -q "^name: scruffy-feature$" scruffy-feature/SKILL.md
check "feature SKILL not model-invocable" grep -q "^disable-model-invocation: true$" scruffy-feature/SKILL.md
check "feature SKILL has no argument-hint" bash -c '! grep -q "^argument-hint:" scruffy-feature/SKILL.md'
check "no .taimi run dir"                 grep_empty '\.taimi/' scruffy-feature/
check "pr-format path fixed"              bash -c '! grep -q "\`references/pr-format.md\`" scruffy-feature/SKILL.md'

# --- Task 1: bug lane moved, memory/ and shared/ exist
check "scruffy-bug exists"               test -f scruffy-bug/SKILL.md
check "old scruffy/ gone"                test ! -e scruffy/references/dossier.md
check "bug SKILL name"                   grep -q "^name: scruffy-bug$" scruffy-bug/SKILL.md
check "bug SKILL not model-invocable"    grep -q "^disable-model-invocation: true$" scruffy-bug/SKILL.md
check "hook path updated"                grep -q 'skills/scruffy-bug/scripts/goal-check.sh' scruffy-bug/SKILL.md
check "memory/rules.md exists"           test -f memory/rules.md
check "no LEARNED.md anywhere"           bash -c '! find . -name LEARNED.md -not -path "./.git/*" | grep -q .'
check "path template moved"              test -f memory/TEMPLATE-path.md
check "paths README moved"               test -f memory/README-paths.md
check "no scruffy/scripts refs"          grep_empty 'scruffy/scripts/' agents scruffy-bug verification
check "no scruffy/paths refs"            grep_empty 'scruffy/paths/' agents scruffy-bug verification
check "no skills/scruffy/ refs"          grep_empty 'skills/scruffy/' agents scruffy-bug verification
check "three scripts present once"       bash -c 'test -f scruffy-bug/scripts/pair-diff.py && test -f scruffy-bug/scripts/tree-diff.py && test -f scruffy-bug/scripts/ui-touch.sh && test ! -e scruffy-feature/mechanisms/pipeline/scripts'
check "shared/ exists"                   test -d shared

# --- Task 2: one proof block
check "proof-block.md exists"            test -f shared/proof-block.md
check "proof-block has tiers"            grep -q "^## Verdict tiers" shared/proof-block.md
check "bug engine cites it"              grep -q "shared/proof-block.md" verification/SKILL.md
check "feature engine cites it"         grep -q "shared/proof-block.md" scruffy-feature/mechanisms/pipeline/references/verification.md
check "block not duplicated in bug engine" bash -c '[ "$(grep -c "^| Fails without fix" verification/SKILL.md)" = 0 ]'

echo "selfcheck: $fails failure(s)"
exit $(( fails > 0 ))
