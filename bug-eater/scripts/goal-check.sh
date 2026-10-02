#!/usr/bin/env bash
# Stop hook for the autonomous execution phase ("the goal"). Registered by bug-eater's
# frontmatter; runs after every turn for the rest of the session, and does nothing unless a
# dossier holds evidence/goal.active. Exit 0 lets the turn end; exit 2 sends the unmet checks
# back to the model as its next instruction.
#
# Why a script and not a prompt hook: a prompt hook sees only the hook's JSON input, never the
# transcript, and /goal itself cannot be set by a skill. The inline step-8 runs write their
# exit codes and logs under evidence/, and this script reads those — the same "output you can
# point at" rule, checked mechanically.
set -u
cat >/dev/null 2>&1   # discard hook input; state lives in the dossier
root="${SCRUFFY_TICKETS:-$HOME/Projects/tickets}"
shopt -s nullglob
markers=("$root"/*/evidence/goal.active)
[ ${#markers[@]} -eq 0 ] && exit 0

sha() { if command -v shasum >/dev/null; then shasum -a 256 "$1" | cut -d' ' -f1; else sha256sum "$1" | cut -d' ' -f1; fi; }
unmet=()
for marker in "${markers[@]}"; do
  ev=$(dirname "$marker"); key=$(basename "$(dirname "$ev")")
  # marker is key=value lines: test_file, success_marker (regex), ui (0|1)
  get() { sed -n "s/^$1=//p" "$marker" | head -1; }
  test_file=$(get test_file); success=$(get success_marker); ui=$(get ui)

  # the item gave up on its own budget: let the turn end, the blocked artifact explains why
  if [ -f "$ev/goal.blocked" ]; then rm -f "$marker"; continue; fi

  miss=()
  # 1. the red test, same file, passing
  if [ ! -f "$ev/goal-red.exit" ]; then miss+=("run the red test inline; write its exit status to evidence/goal-red.exit and its output to evidence/goal-red.log")
  elif [ "$(cat "$ev/goal-red.exit")" != "0" ]; then miss+=("red test exit status is $(cat "$ev/goal-red.exit"), not 0")
  elif [ -n "$success" ] && ! grep -Eq "$success" "$ev/goal-red.log" 2>/dev/null; then miss+=("evidence/goal-red.log has no success marker /$success/ — a green exit without it is not a pass")
  fi
  if [ -n "$test_file" ] && [ -f "$ev/red-test.sha" ]; then
    now=$(sha "$test_file"); rec=$(grep -Eo '^[0-9a-f]{64}' "$ev/red-test.sha" | tail -1)
    [ "$now" = "$rec" ] || miss+=("test file hash $now differs from recorded $rec — the red test changed")
  fi
  # 2. the suite, nothing new broken against baseline
  if [ ! -f "$ev/goal-suite.delta" ]; then miss+=("run the full suite inline; write exit status to evidence/goal-suite.exit, output to goal-suite.log, and the comparison against baseline to evidence/goal-suite.delta (first line: NO NEW FAILURES, or the names)")
  elif [ "$(head -1 "$ev/goal-suite.delta")" != "NO NEW FAILURES" ]; then miss+=("suite delta: $(head -1 "$ev/goal-suite.delta")")
  fi
  # 3. UI bugs: after-capture taken, compared, and judged
  if [ "$ui" = "1" ]; then
    [ -f "$ev/capture-after.png" ] || miss+=("capture the after-screenshot inline (evidence/capture-after.png)")
    if [ ! -f "$ev/goal-ui.status" ]; then miss+=("compare before and after, then write evidence/goal-ui.status (PASS or FAIL: <reason>)")
    elif [ "$(head -1 "$ev/goal-ui.status")" != "PASS" ]; then miss+=("UI comparison: $(head -1 "$ev/goal-ui.status")")
    fi
  fi

  if [ ${#miss[@]} -eq 0 ]; then date -u +%FT%TZ > "$ev/goal.met"; rm -f "$marker"
  else unmet+=("[$key]"); for m in "${miss[@]}"; do unmet+=("  - $m"); done; fi
done

[ ${#unmet[@]} -eq 0 ] && exit 0
{ echo "GOAL NOT MET. Keep working; do not stop until each is shown with real command output in this conversation:"
  printf '%s\n' "${unmet[@]}"
  echo "Fix attempts are capped (see state.md). If the budget is spent, write evidence/goal.blocked and the blocked.md summary instead."; } >&2
exit 2
