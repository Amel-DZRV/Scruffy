# Screenshot Automation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. One task per file, `01` through `07`, in order.

**Goal:** Before/after captures for UI fixes are produced by an agent, gated by checks that can fail, replayed from a per-screen path library that the run maintains itself, and required by the verdict whenever a diff touches UI.

**Architecture:** One capture agent (`evidence-capturer`) is dispatched twice per visual item with identical packets except the SHA. It refuses to capture unless the target element is in the accessibility tree and the installed binary matches the one built for that SHA. Navigation recipes live in `scruffy/paths/<repo>/<screen>.md`; a gated success writes one, a failed replay marks it stale. Verification gains a mandatory pair for UI diffs, detected mechanically from file patterns.

**Tech Stack:** Markdown skill and agent files (Claude Code discovery), `xcrun simctl`, `axe` (iOS accessibility CLI, `brew install cameroncooke/axe/axe`), `adb` + `uiautomator` (Android), Python 3 + Pillow (installed, 12.3.0) for the pair diff, bash for the UI-touch gate, cmux-cua MCP only during `record` mode.

**Spec:** The conversation of 2026-09-29 in this repo: the capture agent replaces the two role agents, learning targets navigation data not rules, mandatory-ness is a verdict gate. The seven steps below are the plan agreed there, with feature-dev's claim 4 folded into task 04 because it is the same edit.

## Global Constraints

- Every Scruffy file keeps its voice: reasoning in `SKILL.md`, facts only in `references/`, agents read-only with `tools: Read, Grep, Glob, Bash`.
- Agents are dispatched from the main thread only. A subagent cannot start subagents (`verification/SKILL.md`, "Who runs what").
- The capture agent never edits repo files, never touches the red test file, writes only under the dossier's `evidence/` and under `scruffy/paths/`.
- Every evidence file starts with the three-line header: SHA, exact command, toolchain or device identifier (`scruffy/references/dossier.md`).
- Path files live in Scruffy, not in target repos. Amel does not own `ios`, `android` or `rooblocks`.
- Device work passes through the build slot when the cost class is expensive (`scruffy/references/models.md`).
- Nothing in these plans changes bug-eater's two stops. A missing path is a parked item and a batched handoff, never a new stop.
- Android tasks are written but cannot be tested on this machine: `adb` and `emulator` are not installed. Each Android test step says so and is deferred to the first Android item.

## Machine facts at planning time

| Check | Result |
|---|---|
| Booted simulator | iPhone 17, iOS 26.5, UDID `F63A6434-5512-45CB-9DF9-0103239F3926` |
| `axe` | not installed (task 01 installs it) |
| ImageMagick | not installed (not needed, Pillow is used) |
| Pillow | 12.3.0 via `/opt/homebrew/bin/python3` |
| `adb`, `emulator` | not installed |
| `brew` | `/opt/homebrew/bin/brew` |

## Review Focus

Inputs the spec implies but no task's test would exercise unless added. Each is pinned to a task below.

1. **Gate element present but off-screen or mid-animation.** The tree lists it, the screenshot shows a spinner. Expect: capture waits until two consecutive tree dumps are identical, then captures. Pinned to task 02.
2. **Two simulators with the same name booted.** `xcrun simctl boot "iPhone 17"` is ambiguous. Expect: every command uses the UDID from `state.md`, never a name. Pinned to task 01.
3. **Path recorded on a different OS or device than the replay target.** Expect: `PATH STALE` before any tap, not a failed gate after ten taps. Pinned to task 03.
4. **Diff touches only a snapshot test's reference PNGs.** Looks like UI by file pattern, needs no capture. Expect: the gate excludes `__Snapshots__/` and `snapshots/` paths. Pinned to task 04.
5. **Status bar override not honoured** (some runtimes ignore it, an app with a custom status bar). Expect: the pair diff masks the status bar rows by default so the pair still compares. Pinned to task 01.

## Task index

| File | Task | Deliverable |
|---|---|---|
| `01-platform-facts.md` | Platform commands | Extended `bug-eater/references/platforms/{ios,android}.md`, `bug-eater/scripts/pair-diff.py` |
| `02-capture-agent.md` | The capture agent | `agents/evidence-capturer.md`, smoke-tested on the Settings app |
| `03-path-library.md` | Path library | `scruffy/paths/README.md`, format, first recorded path, stale handling |
| `04-lane-wiring.md` | Bug-eater and feature-dev wiring | Steps 3, 7, 9 dispatch the agent; `bug-eater/scripts/ui-touch.sh` |
| `05-verification-wiring.md` | Verification wiring | Who-runs-what row, claim 4, verdict gate, proof block row |
| `06-spine-updates.md` | Spine updates | routing, models, dossier ledger column, learning paragraph, README |
| `07-trial-run.md` | Trial on a real screen | Record once, replay, zero diff, then a real before/after |

## Testing philosophy for markdown deliverables

These tasks produce prose and two small scripts, not application code. Tests are of three kinds, and every task uses all that apply:

- **Structural.** Frontmatter parses, referenced paths exist, a grep finds the new line where later tasks expect it. Cheap, run every time.
- **Dry run on a stock app.** The booted iPhone 17 and `com.apple.Preferences` (Settings) need no build. Every capture mechanic is exercised there first, so a broken command costs seconds rather than a 35-minute build.
- **Read-through by a fresh reviewer.** `step-reviewer` over the task's commit range, with only the task's goal. It catches the sentence that reads well to the author and means nothing to a stranger.
