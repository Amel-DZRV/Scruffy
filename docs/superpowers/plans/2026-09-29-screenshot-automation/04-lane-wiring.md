# Task 04 — Lane wiring: bug-eater and feature-dev

**Goal:** The lanes dispatch the capture agent instead of describing captures in prose, and a UI-touching diff without a verified pair cannot reach step 9 as complete. Feature-dev's claim 4 is the same edit, so it lands here.

**Depends on:** tasks 02 and 03 (agent statuses, path lookup rule).

**Files:**
- Modify: `bug-eater/SKILL.md` — step 3 ("Visual bugs" and the four paragraphs after it), step 7 claim 4, step 9 (Proof bullet)
- Modify: `feature-dev/SKILL.md` — step 7 claim 4, step 9 "Screenshots" bullet
- Create: `bug-eater/scripts/ui-touch.sh`

**Interfaces:**
- Consumes: agent packet and statuses (task 02); `scruffy/paths/<repo>/<screen>.md` lookup and `status` (task 03); `pair-diff.py` (task 01).
- Produces: `ui-touch.sh <repo> <parent> <head>` prints `UI` or `NON-UI` and the matched files, exit 0 either way, exit 2 on a bad SHA. Task 05's verdict gate calls it.

---

## Steps

- [x] **Step 1: Write `ui-touch.sh`**

```bash
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
```

- [x] **Step 2: Test `ui-touch.sh` on this repo and on a real one**

On Scruffy itself (no UI files):

```bash
chmod +x bug-eater/scripts/ui-touch.sh
bug-eater/scripts/ui-touch.sh . HEAD~1 HEAD; echo "exit=$?"
```

Expected: `NON-UI`, `exit=0`.

On `~/Projects/ios`, pick a recent commit that touched a SwiftUI view and one that touched only a snapshot PNG:

```bash
cd ~/Projects/ios
git log --oneline -20 -- 'Packages/Mosaic/**/*View*.swift' | head -3
git log --oneline -20 -- '**/__Snapshots__/**' | head -3
```

Run the script with `<sha>~1 <sha>` for one of each. Expected: the view commit prints `UI` and the view file; the snapshot-only commit prints `NON-UI`. If the repo has no `__Snapshots__` directory, note the actual snapshot directory name and add it to the exclusion pattern.

- [x] **Step 3: Rewrite bug-eater step 3's capture paragraphs**

In `bug-eater/SKILL.md`, replace from the line beginning **The "before" screenshot is captured here** through the paragraph ending **Both matter; do not confuse them.** with:

```markdown
**The "before" pair is captured here, on clean main, by the `evidence-capturer` agent.** It is dispatched from the main thread with the packet its file lists — device from `state.md`, the parent SHA, bundle id, the build-identity file written at install, and the path file. Look the path up first: `scruffy/paths/<repo>/<screen>.md`, `<screen>` derived from the component or template name. Fresh → `capture` mode. Missing or stale → `record` mode, and the item is **parked**, not stalled.

Same device, same OS, same pinned settings as the "after" — the agent enforces that, and the pair diff at step 7 checks it. That consistency is the point: the before/after pair is the single thing that most reliably gets a PR approved, and a pair that differs by anything other than the diff does not do that job.

**Navigation is the unreliable part, not capture.** A `record` run needs Amel once, on main, and never again for that screen:

- **Notify, do not stall.** Park the item, keep working the other bugs, resume when he says the screen is up.
- **Batch the handoffs.** Across a run, hand him one list — three screens, the launch skill for each, any order. Not one ping per bug.
- **The agent records the path while he navigates**, so the "after" replays without him. That is what removes the two-presence problem this skill exists to remove.
- `PATH STALE` on the "after" falls back to one more handoff. Never ship a mismatched pair.

Agent statuses and what they mean here: `CAPTURED` → continue. `GATE FAILED` or `NO PATH` → park, add to the handoff list. `PATH STALE` → flip the path file to stale per `../scruffy/paths/README.md`, park. `BUILD MISMATCH` → process failure, reinstall, dispatch again; never a retry loop.

**Where the build identity comes from.** Whoever installs the app writes `evidence/build-identity-<label>.txt` per `references/platforms/<platform>.md`, "Build identity", right after install. The agent re-hashes at capture. Without that file the agent returns `PACKET INCOMPLETE`, which is correct: a screenshot of an unknown build is not evidence. Response: supply the missing field and dispatch again; it is never guessed.

Screenshots are **reviewer evidence, not verification.** They cannot fail. A pair proves nothing to a skeptic — the "before" could be any build, which is exactly why the build-identity check exists. The red test is what proves the fix; the screenshots are what get it approved. Both matter; do not confuse them.
```

Keep the "Visual bugs" order-of-preference list above it unchanged.

- [x] **Step 4: Rewrite bug-eater step 7 claim 4**

Replace the claim 4 line with:

```markdown
4. **Reviewer evidence** — the `evidence-capturer` dispatched again with the "before" packet and only `sha`, `label` and `build_identity` changed. Then `pair-diff.py before after --mask <the component's frame from the tree dump>`; exit 1 means the pair differs outside the fix and is not shipped — re-capture once, then `decision needed` with both images attached. `bug-eater/scripts/ui-touch.sh <repo> <parent> <head>` decides whether a pair is owed at all; `UI` with no `CAPTURED` pair is `PROOF INCOMPLETE`, named on the `Not proven` line.
```

- [x] **Step 5: Extend bug-eater step 9's Proof bullet**

Append to the **Proof** bullet: "For a `UI` diff the proof block's `Reviewer evidence` row names both capture files, the gate element, and the pair-diff result. The two images sit inline directly under the block."

- [x] **Step 6: Mirror in feature-dev**

In `feature-dev/SKILL.md` step 7, replace claim 4 with the same text as bug-eater's, substituting "the acceptance criterion's screen" for "the component". In step 9, replace the **Screenshots** bullet with: "**Screenshots** for anything visual, inside the description, from the `evidence-capturer` pair — never a hand-taken image. `NON-UI` diffs carry no images and say so in one line."

Feature-dev has no step 3 "before" moment; the "before" is captured at step 5 alongside the red acceptance tests, on the parent commit. Add one sentence there: "For a visual criterion, dispatch `evidence-capturer` with `label: before` at this point, on the parent commit — the same packet bug-eater's step 3 describes."

- [x] **Step 7: Structural test**

```bash
grep -n 'evidence-capturer' bug-eater/SKILL.md feature-dev/SKILL.md | wc -l
grep -n 'ui-touch.sh' bug-eater/SKILL.md feature-dev/SKILL.md
grep -n 'Amel takes his own screenshots\|ask him for a screenshot' bug-eater/SKILL.md feature-dev/SKILL.md
grep -n 'PATH STALE\|GATE FAILED\|BUILD MISMATCH' bug-eater/SKILL.md
```

Expected: at least five `evidence-capturer` hits across both files; `ui-touch.sh` cited in both; the third grep returns nothing; all three statuses appear in bug-eater.

- [ ] **Step 8: Read-through test** (deferred to controller)

Dispatch `step-reviewer` over this task's commit range with the goal: "Bug-eater and feature-dev must be followable by a stranger who has never seen the evidence-capturer agent: every dispatch names the packet source and every status has a response." Fix Critical and Important.

- [ ] **Step 9: Commit**

```bash
git add bug-eater/SKILL.md feature-dev/SKILL.md bug-eater/scripts/ui-touch.sh
git commit -m "Dispatch evidence-capturer from the lanes; add mechanical UI-touch gate"
```

## What to expect when this task is done

- The word "screenshot" in the lanes always refers to an agent-produced, gated file.
- `ui-touch.sh` says `UI` on a real view commit and `NON-UI` on a snapshot-only commit in the iOS repo.
- Nothing has been proven end to end yet. That is task 07. This task only makes the lanes ask for the right thing.
