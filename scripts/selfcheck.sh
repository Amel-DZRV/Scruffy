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

# --- Task 3: dispatcher
check "dispatcher SKILL exists"          test -f scruffy/SKILL.md
check "dispatcher name"                  grep -q "^name: scruffy$" scruffy/SKILL.md
check "dispatcher is model-invocable"    bash -c '! grep -q "^disable-model-invocation: true$" scruffy/SKILL.md'
check "dispatcher routes to both lanes"  bash -c 'grep -q "scruffy-bug/SKILL.md" scruffy/SKILL.md && grep -q "scruffy-feature/SKILL.md" scruffy/SKILL.md'
check "owned flag defined"               grep -q "owned: no" scruffy/SKILL.md
check "intake.md exists"                 test -f scruffy/references/intake.md
check "interview.md exists"              test -f scruffy/references/interview.md
check "confidence rule present"          grep -qi "confidence" scruffy/references/interview.md
check "missing-button example present"   grep -qi "never built" scruffy/references/intake.md
check "bug lane has no intake gate"      bash -c '! grep -q "### Stop 1 — the intake gate" scruffy-bug/SKILL.md'
check "no Taimi in bug lane"             grep_empty 'taimi' scruffy-bug

# --- Task 4: orchestration shared, developer agent
check "orchestration.md in shared"       test -f shared/orchestration.md
check "orchestration gone from feature refs" test ! -e scruffy-feature/mechanisms/pipeline/references/orchestration.md
check "main thread is Team Lead"         grep -q "main thread" shared/orchestration.md
check "four plan fields"                 grep -q "what / files / criteria / depends on" shared/orchestration.md
check "fail memo per track"              grep -q "fail-memo-<track>-<n>.md" shared/orchestration.md
check "scope rule"                       grep -q "non-goals" shared/orchestration.md
check "developer agent exists"           test -f agents/developer.md
check "developer is sonnet"              grep -q "^model: sonnet$" agents/developer.md
check "team-lead tools no longer spawn"  grep_empty 'Spawning Developer agents' scruffy-feature/roles
check "RUNNER does not dispatch team lead" bash -c '! grep -q "Dispatch \`team-lead-<platform>\`" scruffy-feature/mechanisms/pipeline/RUNNER.md'
check "runner ladder: Agent first"       grep -qi "plain parallel \`Agent\`" shared/orchestration.md

# --- Task 5: reproduce first
check "apps.md exists"                   test -f scruffy-bug/references/apps.md
check "apps.md has DevApp row"           grep -q "DevApp" scruffy-bug/references/apps.md
check "step 3 gates step 4"              grep -q "No investigator runs until" scruffy-bug/SKILL.md
check "step 3 cites apps.md"             grep -q "references/apps.md" scruffy-bug/SKILL.md
check "non-UI artefact rule"             grep -q "cheapest falsifiable artefact" scruffy-bug/SKILL.md

# --- Task 6: Team Lead and fail memo in the bug lane
check "step 7 cites orchestration"       grep -q "shared/orchestration.md" scruffy-bug/SKILL.md
check "plan-only-when-earned removed"    bash -c '! grep -q "Plan only when it earns one" scruffy-bug/SKILL.md'
check "step 8 cites fail memo"           grep -q "fail-memo" scruffy-bug/SKILL.md
check "fix budget per track in bug lane" grep -q "per track" scruffy-bug/SKILL.md

# --- Task 7: shared PR mechanics
check "shared/pr.md exists"              test -f shared/pr.md
check "publish-evidence in shared/pr.md" grep -q "publish-evidence.sh" shared/pr.md
check "bug step 10 cites shared/pr.md"   grep -q "shared/pr.md" scruffy-bug/SKILL.md
check "feature RUNNER cites shared/pr.md" grep -q "shared/pr.md" scruffy-feature/mechanisms/pipeline/RUNNER.md
check "publish block not duplicated"     bash -c '[ "$(grep -l "PUSH REFUSED" scruffy-bug/SKILL.md shared/pr.md | wc -l | tr -d " ")" = 1 ]'

# --- Task 8: owned vs not-owned
for f in scruffy-feature/SKILL.md scruffy-feature/mechanisms/pipeline/RUNNER.md scruffy-feature/roles/docs-keeper/tools.md scruffy-feature/mechanisms/pipeline/references/pr-format.md scruffy-feature/mechanisms/council/RUNNER.md; do
  check "owned branch in $f" grep -q "owned: no" "$f"
done
check "draft when not owned"             grep -q "draft" scruffy-feature/mechanisms/pipeline/RUNNER.md
check "no unconditional init-project"    bash -c '! grep -q "Missing → \`scripts/init-project.sh" scruffy-feature/SKILL.md'

echo "selfcheck: $fails failure(s)"
exit $(( fails > 0 ))
