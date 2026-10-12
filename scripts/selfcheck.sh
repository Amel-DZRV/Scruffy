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

echo "selfcheck: $fails failure(s)"
exit $(( fails > 0 ))
