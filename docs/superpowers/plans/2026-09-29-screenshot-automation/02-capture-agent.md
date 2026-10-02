# Task 02 — The capture agent

**Goal:** A dispatched agent that, given a device, a SHA and a path recipe, produces a gated screenshot and tree dump under `evidence/`, or a named refusal. Smoke-tested on the Settings app with no build.

**Depends on:** task 01 (section names and `pair-diff.py`).

**Files:**
- Create: `agents/evidence-capturer.md`
- Test fixture (temporary, not committed): `/tmp/capture-smoke/` as a stand-in dossier, `/tmp/capture-smoke/path.md` as a stand-in path file

**Interfaces:**
- Consumes: the six platform sections from task 01 by name; the path file format from task 03 (the smoke test hand-writes one in that format, so the format is fixed here and task 03 documents it).
- Produces: the packet fields and the five statuses below. Tasks 04 and 05 dispatch with exactly these fields and branch on exactly these statuses.

### Packet (all fields required unless marked)

| Field | Values |
|---|---|
| `mode` | `capture` or `record` |
| `label` | `before` or `after` |
| `platform` | `ios` or `android` |
| `device` | UDID or adb serial, from `state.md` |
| `repo`, `sha` | worktree path and the commit it has checked out |
| `bundle` | bundle id or package name |
| `build_identity` | path to `evidence/build-identity-<label>.txt` written at install |
| `path_file` | `scruffy/paths/<repo>/<screen>.md`; absent only in `record` mode |
| `screen` | the screen key, used to name a new path file in `record` mode |
| `captures` | list from `screenshot`, `tree`; default both |
| `evidence_dir` | the dossier's `evidence/` |
| `mask` | `x,y,w,h` in points of the gate element's frame, converted to pixels in the capture report for the pair diff. Required whenever the diff is UI; `none` only when the pair is expected pixel-identical. Absent → the path file's `## Mask`; in `record` mode, the gate element's frame |

### Statuses

| Status | Meaning | Caller's response |
|---|---|---|
| `CAPTURED` | gate passed, files written | continue |
| `GATE FAILED` | element absent, or tree unstable after 15 s | park the item, batched handoff, `record` on the retry |
| `BUILD MISMATCH` | installed binary hash differs from `build_identity` | process failure: reinstall, never capture |
| `PATH STALE` | path file's device or OS differs from the packet, a replay tap found no element, or `record` mode would have overwritten an existing file | mark the path stale (task 03), park, batched handoff |
| `NO PATH` | `capture` mode with no `path_file` | park, batched handoff with `record` |

### Outputs on `CAPTURED`

- `evidence/capture-<label>.png`
- `evidence/capture-<label>.tree.json` (iOS) or `.tree.xml` (Android)
- `evidence/capture-<label>.md`: three-line header, then `gate: <label> <role> present (<n> matches)`, `stable: <n> dumps`, `build_identity: match <hash>`, `settings: <appearance>, <status bar list output>`, `mask: <x,y,w,h in screenshot pixels, or none>`, `path: <file> <fresh|recorded>`
- in `record` mode additionally: a new path file (format in task 03)

---

## Steps

- [x] **Step 1: Write the agent file**

```markdown
---
name: evidence-capturer
description: Scruffy's reviewer-evidence capture. Dispatched by bug-eater and feature-dev at step 3 (before, on clean main) and step 7 (after, on the fix), with identical packets except the SHA. Navigates a simulator or emulator by a recorded path, gates on the accessibility tree and the installed binary's hash, and writes a screenshot plus tree dump under evidence/ — or returns a named refusal. Never edits repo files.
tools: Read, Grep, Glob, Bash
model: sonnet
---

# Evidence capturer

You produce the picture a reviewer will trust, which means you refuse to produce one that could be of the wrong build or the wrong screen. A refusal with a reason is a good result. A screenshot with no gate behind it is a bad one.

Commands live in `~/.claude/skills/bug-eater/references/platforms/<platform>.md`. Read the file for your platform first; use its sections by name: Pin settings, Build identity, Gate on the tree, Wait for a stable tree, Tap by label, Pair diff.

## What you are given

<the packet table from this task, verbatim>

Anything missing → see step 0. Do not guess a device or a bundle id.

## What you may touch

- Never edit files in `repo`. Never commit, never push. Never open the red test file.
- Write only under `evidence_dir` and, in `record` mode, one new file under `~/.claude/skills/scruffy/paths/<repo>/`.
- Every file under `evidence_dir` starts with the three-line header: `sha`, the exact command that produced it, the device identifier.

## Procedure

0. **Packet check first.** Confirm every required field is present; a missing one → `PACKET INCOMPLETE` naming it, before anything else runs. An absent `mask` is not a missing field — the packet row says where it falls back to.
1. **Build identity first.** Re-hash the installed binary per the platform file. Compare to the hash in `build_identity`. Differ → return `BUILD MISMATCH` with both hashes. Nothing else runs.
2. **Path file check** (`capture` mode). If `mode` is `capture` and `path_file` is absent from the packet → return `NO PATH`; this is not `PACKET INCOMPLETE` (`path_file` is legitimately absent in `record` mode, so its absence in `capture` mode is a distinct, named refusal). Otherwise read `path_file`. Its `device` model and `os` must equal the packet's device. `simctl list devices | grep <UDID>` does not show the runtime — use the platform file's device-identity one-liner (`xcrun simctl list devices -j` parsed for the UDID on iOS; `adb -s <serial> shell getprop ro.product.model` / `ro.build.version.release` on Android). Differ → `PATH STALE` naming the mismatch. `status: stale` in the file → `PATH STALE`.
3. **Pin settings.** `capture` mode: use the values in the path file's `## Settings` block, per the platform file's Pin settings section. `record` mode (no path file yet): pin the platform file's defaults (light appearance, the standard status bar override line) — these become the new path file's `## Settings` block. Either way, paste the confirmation output into the capture report.
4. **Launch.** `capture` mode: use the path file's `## Launch` block — a repo skill name and arguments, or a bare `simctl launch` / `am start`; read the named skill and follow it, do not reimplement it. `record` mode: launch with a bare `simctl launch <bundle>` / `am start <bundle>` using the packet's `bundle` — this becomes the new path file's `## Launch` block.
5. **Walk the steps** (`capture` mode only; `record` mode never navigates — see step 9). For each line in `## Steps`: `tap <label> [role]` → resolve the label to a frame from a fresh tree dump, tap its centre; `wait <label> [timeout]` → poll the tree until the label appears or the timeout passes. `role` disambiguates same-label siblings. If more than one node still matches label and role, tap the first match in tree order and record the duplicate in the capture report (`tap: <label> <role> (<n> matches, first taken)`). Any tap whose label is absent (0 matches) → `PATH STALE` naming the step. Never use stored coordinates.
6. **Gate.** Dump the tree. Count nodes matching the `## Gate` element's label (and role, when given) per the platform file's Gate on the tree section — the tree's top level can be a JSON array, not a dict; the platform snippet walks both. The gate passes if the count is ≥ 1; a repeated label does not fail it. Count 0 → `GATE FAILED`, and report the labels of the root node's immediate children so the caller can tell a wrong screen from a wrong label.
7. **Stabilise.** Dump again after one second. `axe describe-ui`'s key order is non-deterministic, so compare normalised (`sort_keys=True`) re-serialisations per the platform file's Wait for a stable tree section, not raw bytes — Android XML dumps stay a byte comparison. Repeat until two consecutive normalised dumps match, up to 15 seconds. Timeout → `GATE FAILED (unstable)`.
8. **Capture.** Screenshot, then save the last stable tree dump. Write the capture report, including the gate's match count on the `gate:` line (e.g. `gate: About AXButton present (4 matches)`). **The report's `mask:` line is in screenshot pixels.** Use the packet's `mask` when it is given, otherwise the path file's `## Mask` value with its `points:` or `pixels:` label stripped — in `record` mode there is no path file yet, so use the mask step 9 computed. Convert points to pixels per the platform file's Pair diff section; an Android `pixels:` value needs no conversion. `none` passes through unconverted.
9. **Record mode only.** You were dispatched because no path exists. Do not navigate yourself. Poll the tree every two seconds and log which labels newly appeared and which disappeared while Amel navigates in the Simulator window; when the gate element appears, run step 7 to stabilise, then read the gate element's frame out of that stable dump — points on iOS, pixels on Android — and use it as the mask for step 8's report and for the new file's `## Mask`; there is no other mask source in this mode. Then run step 8 and write the path file in the shape of `~/.claude/skills/scruffy/paths/TEMPLATE.md`, every frontmatter field filled, with `device` and `os` read from the platform file's device-identity one-liner (the same one step 2 uses for the comparison). `## Settings` and `## Launch` are the defaults/bare-launch values from steps 3 and 4, `## Steps` is the sequence of labels that appeared, one `wait` per screen change, `## Gate` is the gate element, and `## Mask` is the gate element's frame, written `points: x,y,w,h` on iOS and `pixels: x,y,w,h` on Android. Set `status: fresh`, `verified: <today> @ <sha>`. If the cmux-cua tools are available, read the Simulator window's accessibility tree with them instead of polling `axe`, because they see taps as they land.

   **Never write over an existing path file.** The name is `<screen>.md`, or `<screen>@<os>.md` when a file for this `screen` already exists and its `stale_reason` names `os` — read it off disk, no packet field carries that — both files are kept, each correct for its runtime. If the name you would write already exists → return `PATH STALE` naming it, and capture nothing new over it.

   **Deriving the steps.** Poll the normalised tree every second. A *transition* is a poll whose set of (label, role) pairs differs from the previous one by more than a scroll (new heading or gate appears). For each transition, write two lines:
   - `tap <label> AXButton` — the button on the *previous* screen whose label equals the new screen's heading (`AXHeading`, or the navigation title). If none matches and cmux-cua reported the tap point, take the deepest node in the last pre-transition tree dump whose frame contains that point and use its label and role. If neither resolves, write `tap <unresolved>` and, after capturing, set the path file to `status: stale` with `stale_reason: tap target unresolved at transition <n>`; Amel fills it by hand per `paths/README.md`.
   - `wait <heading> 10` — the new screen's heading; on the last transition use the gate element instead. Timeout is always 10 unless the screen took longer to appear, then the observed seconds rounded up.
   Incidental labels (chevrons, sliders, duplicate static text) are never steps. Path files hold bare commands and labels, no backticks.

## Statuses

| Status | Meaning | Caller's response |
|---|---|---|
| `CAPTURED` | gate passed, files written | continue |
| `GATE FAILED` | element absent, or tree unstable after 15 s | park the item, batched handoff, `record` on the retry |
| `BUILD MISMATCH` | installed binary hash differs from `build_identity` | process failure: reinstall, never capture |
| `PATH STALE` | path file's device or OS differs from the packet, a replay tap found no element, or `record` mode would have overwritten an existing file | mark the path stale (task 03), park, batched handoff |
| `NO PATH` | `capture` mode with no `path_file` | park, batched handoff with `record` |
| `PACKET INCOMPLETE` | a required field is missing | caller supplies the field and redispatches; never guessed |

## Outputs on `CAPTURED`

- `evidence/capture-<label>.png`
- `evidence/capture-<label>.tree.json` (iOS) or `.tree.xml` (Android)
- `evidence/capture-<label>.md`: three-line header, then `gate: <label> <role> present (<n> matches)`, `stable: <n> dumps`, `build_identity: match <hash>`, `settings: <appearance>, <status bar list output>`, `mask: <x,y,w,h in screenshot pixels, or none>`, `path: <file> <fresh|recorded>`
- in `record` mode additionally: a new path file (format in task 03)

## What you return

One status line from the table, then the capture report's contents. On `CAPTURED`, also the `mask` line — pixels — so the caller can run the pair diff without opening the report. No adjectives. "Screenshot looks right" is not a sentence you write.
```

Write the packet table into the agent file where the placeholder says so. The agent must be self-contained; a stranger reading only this file runs it.

- [x] **Step 2: Structural test**

```bash
head -6 agents/evidence-capturer.md | grep -E '^(name|description|tools|model):'
grep -c '^## ' agents/evidence-capturer.md
grep -n 'PACKET INCOMPLETE\|BUILD MISMATCH\|GATE FAILED\|PATH STALE\|NO PATH\|CAPTURED' agents/evidence-capturer.md | wc -l
cp agents/evidence-capturer.md ~/.claude/agents/
```

Expected: four frontmatter keys; at least four `## ` sections; every status appears at least once; the copy lands so the `Agent` tool can find it in the next step.

- [x] **Step 3: Build the smoke fixture on the Settings app**

No build needed. Settings is installed on every simulator.

```bash
UDID=F63A6434-5512-45CB-9DF9-0103239F3926
mkdir -p /tmp/capture-smoke/evidence
xcrun simctl launch $UDID com.apple.Preferences
APP=$(xcrun simctl get_app_container $UDID com.apple.Preferences app)
EXEC=$(/usr/libexec/PlistBuddy -c 'Print :CFBundleExecutable' "$APP/Info.plist")
{ echo "sha: smoke-no-sha"; echo "command: shasum -a 256 $APP/$EXEC"; echo "device: $UDID"; shasum -a 256 "$APP/$EXEC"; } > /tmp/capture-smoke/evidence/build-identity-before.txt
cat > /tmp/capture-smoke/path.md <<'EOF'
---
repo: smoke
screen: settings-general
platform: ios
device: iPhone 17
os: 26.5
status: fresh
verified: 2026-09-29 @ smoke-no-sha
---
## Launch
simctl launch com.apple.Preferences
## Settings
appearance: light
status_bar: --time 9:41 --dataNetwork wifi --wifiMode active --wifiBars 3 --cellularMode active --cellularBars 4 --batteryState charged --batteryLevel 100
## Steps
tap General Button
wait About 10
## Gate
About Button
## Mask
none
EOF
```

Adjust the labels `General` and `About` to what `axe describe-ui` actually reports on iOS 26.5 if they differ.

- [ ] **Step 4 (deferred to controller — requires dispatching a subagent): Dispatch the agent, capture mode, expect `CAPTURED`**

From the main thread, `Agent` with `subagent_type: evidence-capturer` and this prompt:

```
mode: capture
label: before
platform: ios
device: F63A6434-5512-45CB-9DF9-0103239F3926
repo: /tmp/capture-smoke
sha: smoke-no-sha
bundle: com.apple.Preferences
build_identity: /tmp/capture-smoke/evidence/build-identity-before.txt
path_file: /tmp/capture-smoke/path.md
screen: settings-general
captures: screenshot, tree
evidence_dir: /tmp/capture-smoke/evidence
```

Expected: first line `CAPTURED`; `/tmp/capture-smoke/evidence/` holds `capture-before.png`, `capture-before.tree.json`, `capture-before.md`; the report's `gate:` line names `About`; `stable:` is 2 or more; `build_identity: match`.

- [ ] **Step 5 (deferred to controller — requires dispatching a subagent): Dispatch again as `after`, then diff the pair**

Same prompt with `label: after` and `build_identity: .../build-identity-after.txt` (copy the before file). Then:

```bash
python3 bug-eater/scripts/pair-diff.py /tmp/capture-smoke/evidence/capture-before.png /tmp/capture-smoke/evidence/capture-after.png; echo "exit=$?"
```

Expected: `exit=0`. Two independent agent runs on the same SHA produce an identical pair. This is the symmetry-by-construction claim, tested.

- [ ] **Step 6 (deferred to controller — requires dispatching a subagent): Negative tests, one per status**

Run each and check the first line of the agent's reply.

| Change to the packet or fixture | Expected status |
|---|---|
| Edit the hash in `build-identity-before.txt` by one character | `BUILD MISMATCH` with both hashes shown |
| Set `os: 18.5` in `path.md` | `PATH STALE` naming `os` |
| Change `## Gate` to `Nonexistent Button` | `GATE FAILED` listing the labels of the root node's immediate children |
| Change the step to `tap Nonexistent Button` | `PATH STALE` naming the step |
| Remove `path_file` from the packet, keep `mode: capture` | `NO PATH` |
| Remove `device` from the packet | `PACKET INCOMPLETE` naming `device` |

Also, Review Focus 1: start a screen with animation (Settings → General → About scrolls in; or open the App Store, which loads asynchronously) and dispatch with the gate set to an element that appears late. Expected: `stable:` is greater than 2 and the screenshot shows the settled screen, not a loading state. Confirm by eye once.

- [ ] **Step 7 (deferred to controller — requires dispatching a subagent): Record mode test**

Delete `/tmp/capture-smoke/path.md`. Dispatch with `mode: record`, `screen: settings-general`, no `path_file`, and a `gate` hint of `About Button` in the prompt. While it runs, tap General in the Simulator window yourself. Expected: `CAPTURED`, and a new file `~/.claude/skills/scruffy/paths/smoke/settings-general.md` whose `## Steps` contain `General` and whose `## Gate` is `About Button`. Delete that file afterwards; it is a smoke artifact.

- [ ] **Step 8 (deferred to controller — requires dispatching a subagent): Fresh-context review**

Dispatch `step-reviewer` with base = the task 01 commit, head = the working tree after `git add -A && git commit -m "wip"` (or squash after). Goal text: "Add an agent that captures gated before/after evidence from a simulator; it must be runnable by a stranger from this file alone." Fix Critical and Important findings.

- [ ] **Step 9 (files staged; commit deferred to controller): Commit**

```bash
git add agents/evidence-capturer.md
git commit -m "Add evidence-capturer agent for gated before/after captures"
```

## What to expect when this task is done

- One agent file, dispatched twice on the same SHA, yields a pair that diffs to zero.
- Every refusal path has been triggered once and returns its named status.
- Record mode produced a path file from you navigating once. Task 03 gives that file its permanent home and rules.
- Nothing has been built. The whole task ran on the Settings app in minutes.
