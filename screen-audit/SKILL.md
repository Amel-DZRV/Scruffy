---
name: screen-audit
description: Checks a running app's screens against Claude Design mocks, component by component — how each component looks (measured from the mock's own HTML) and whether it works (tapped and observed) — and, in fix mode, edits the code and re-checks until every component passes or runs out of budget. Android first, iOS on a Mac. Use on "audit this screen against the design", "make the Training tab match the mocks", "check the dashboard looks like the design", or from feature-dev for a visual acceptance criterion.
argument-hint: "<repo> <design export .html> [section | frame numbers] [--audit-only] [--platform android|ios|both]"
hooks:
  Stop:
    - hooks:
        - type: command
          command: "node \"$HOME/.claude/skills/screen-audit/scripts/audit-check.mjs\""
---

# Scruffy / Screen-Audit

One set of mock frames, against one running app, until they match.

**This module owns design fidelity and on-screen behaviour.** Bug-eater owns a broken thing with a cause to find; feature-dev owns a thing that does not exist yet. This owns the gap between a screen that exists and the mock it was built from. Preflight, the dossier and the ledger belong to the shared spine.

## What makes this checkable at all

A Claude Design export is **HTML, not a picture.** Every phone frame in it is a DOM: the title is 22px Archivo 800 in `#1B1A19` because the computed style says so, not because a model squinted at a PNG. `scripts/mock-extract.mjs` renders the export in the system Chrome and reads those values out. The app side is read the same way it is everywhere in Scruffy — the accessibility tree for frames and text, the screenshot for pixels — and `scripts/compare.mjs` joins the two on visible text and measures every pair.

So the split is:

| Who | Checks | Can it be wrong? |
|---|---|---|
| `compare.mjs` | position, spacing, glyph height and width, text and fill colour, container edges and insets | Only on bad input. Same input, same numbers |
| `design-judge` agent | what numbers cannot say: icon identity, radius, border, shadow, font family, weight, clipping, truncation, and whether a failing number is a real defect or the app's data | Yes — so it runs in a fresh context, defaults to FAIL, and cannot overrule a measurement except by naming it as data |
| functional probes | tap, observe the tree, compare with what the spec says should happen | Only on a wrong expectation, which is why expectations are written down before the first tap |

**The model that edits the code never grades it.** The fixer reads the judge's verdict; it does not write it. And the Stop hook trusts neither: it re-reads the measurements and the verdict files itself.

## Two modes

| Mode | Ends with | Changes code |
|---|---|---|
| `--audit-only` | `report.md` — a row per component, with mock / app crops | never |
| fix (default) | every row PASS on the current code, or DATA, WAIVED, BLOCKED; then a branch and draft PR per the repo's conventions | yes, one commit per component fixed |

## Progress, in the chat

Same rule as bug-eater: every step announces itself before its first tool call and when it ends. During the fix loop, start each turn with the round and the count:

```
▶ audit-training-dashboard · Round 2 — 6 frames, 41 components: 33 pass, 5 fail, 3 data
◎ fixing f4.c24 tab bar (attempt 2/3): fill #ffffff → theme.colors.bg
```

## The one stop — the intake gate

Batched, once, after step 2. Everything the loop will need from a human:

- **Frames whose state cannot be reached** — the mock shows an active program, five recent sessions, a PR moment, and the app on this device has none of them. Per frame: a seed recipe, permission to create the data through the UI, or skip the frame.
- **Expectations nobody wrote down** — a control whose behaviour the spec, the mock and the routes do not settle.
- **Probes that change data** — "Start workout" starts one. Allowed on this device, or skipped?
- **Deviations that might be deliberate** — the app has a tab bar with icons, the mock has text only. Fix it, or waive it (it goes in `accepted.md`).

Each with a recommended answer beside it. After the gate, nothing asks anyone for anything: the loop runs to the hook's condition. A question discovered mid-loop becomes a BLOCKED row with the question as its reason — never a pause.

## Terminal states

| State | Artifact |
|---|---|
| `PR opened` | branch + draft PR, every row accounted for |
| `audit done` | `report.md` (audit-only mode) |
| `decision needed` | `memo.md` — the mock contradicts the design system, or two frames contradict each other, or no token holds the mock's value |
| `blocked` | `blocked.md` — device, build or Metro died |

---

## Step 1 — Preflight

- **Device.** `mobile_list_available_devices` for the mobile-mcp id, `adb devices` for the serial — they name the same emulator differently. Record both in `state.md`.
- **Scripts.** `npm install` once in this skill's folder (`playwright-core`, `pngjs`, `pixelmatch` — no browser download; it drives the system Chrome).
- **Pin the device to the mock** per `references/platforms/<platform>.md` → *Pin to the mock*: the dp width equal to the mock's phone width, light or dark per frame, demo status bar. `compare.mjs` refuses a width mismatch, so this is not optional. Restore it when the run ends, whatever the ending.
- **Cost class.** A dev build attached to Metro reloads a JS or style edit in seconds — **cheap**, one component per edit. A release build, or a native change, means a rebuild — **expensive**, batch every fix of a round into one build. Read it from the platform file's *Fast Refresh* check; never assume.
- **Conventions.** The repo's `CLAUDE.md`, its theme file, its lint and format hooks. In Relentless, `apps/mobile/shared/ui/theme.ts` is the one place a colour may be named, and the pre-push hook runs Prettier and `tsc`.

## Step 2 — Map frames to states

`mock-extract.mjs <export> --list` prints every frame: index, section, theme, size, label. Take the ones in scope — a section, not the whole export; 58 frames is a day, six is a round.

For each frame, a **state recipe** in `frames/<repo>/<export>.md` (shape: `frames/TEMPLATE.md`): the route (a deep link where the router has one — `relentless://training/programs` — else a recorded path from `scruffy/paths/`), any taps after it, the data the frame assumes, the theme. A recipe that replays is committed; the next run starts from it. A frame with no reachable state goes to the intake gate.

Also write the **expectations** for every interactive element the frame shows, per `references/probes.md` — from the spec document beside the export (Relentless: `docs/Design/Training_Screens_Prompt.md`), from sibling frames that show the result of the tap, from the frame's note. A behaviour derived from the app's own code is not an expectation — the code is the thing under test.

Then the intake gate.

## Step 3 — Round: capture, compare, judge, probe

A round covers every frame in scope, on every platform in scope. One directory each: `evidence/rounds/<n>/<platform>/f<frame>/`.

1. `fingerprint.txt` — the repo's fingerprint, written **before** the capture (`node scripts/audit-check.mjs --fingerprint <repo>` prints it). It is what lets the hook tell a fresh PASS from a stale one.
2. **Mock:** `mock-extract.mjs <export> --frame <n> --scale <device px per dp> --out <dir>` → `mock.png`, `mock.nodes.json`.
3. **App:** run the frame's recipe; wait for a stable tree; then `app.png` (screencap) and `app.tree.json` (mobile-mcp's element list, written verbatim — or a uiautomator XML where mobile-mcp is not holding the connection). Commands in the platform file.
4. **Compare:** `compare.mjs --mock <dir> --app-png <dir>/app.png --app-tree <dir>/app.tree.json --scale <s> --out <dir>` → `findings.json`, `findings.md`, `crops/`.
5. **Judge:** dispatch `design-judge` per frame with the packet its file lists. It writes `judge.json`. Not your notes, not the diff, not the previous round's verdict.
6. **Probe** each interactive component per `references/probes.md`; each writes `evidence/probes/<n>/<platform>/<key>.json` with the fingerprint it ran under. Data-changing probes run last, and only if the gate allowed them.
7. **Ledger:** update `evidence/ledger.json` — one row per component the comparison found, per platform. Status comes from `judge.json` and the probe files; you copy it, you do not decide it.

The ledger's shape, which the hook reads:

```json
{ "repo": "C:/dev/Relentless_V2", "export": "<path to the .html>", "platforms": ["android"], "budget": 3,
  "frames": [{ "platform": "android", "frame": 4, "round": 2 }],
  "rows": [{ "key": "android.f4.c24", "platform": "android", "frame": 4, "mockId": 24, "name": "Tab bar",
             "visual": { "status": "FAIL", "round": 2 },
             "functional": { "status": "PASS", "round": 2, "probe": "probes/2/android/android.f4.c24.json" },
             "attempts": 1, "reason": "" }] }
```

`visual`: `PASS | FAIL | DATA | WAIVED | BLOCKED`. `functional`: the same, or `NA` for a component with nothing to press. `DATA` means every difference is the app's content, not its code — the judge must name each such measurement.

In `--audit-only` mode, stop here: write `report.md` from the ledger, one section per frame, failing rows first, each with its crop. Restore the device.

## Step 4 — The goal

Write `evidence/audit.active` as the last act of the first round. From then until the hook lets the turn end, nothing stops on its own judgement that it is done. After every turn `scripts/audit-check.mjs` re-reads the ledger and the files behind it, and blocks the stop until every row is:

- **PASS or DATA** from a round whose fingerprint equals the code *now*, with `judge.json` agreeing and no failing measurement the judge did not attribute to data — or
- **WAIVED**, its key in `accepted.md`, which only Amel's answers at the gate write — or
- **BLOCKED**, with `attempts` at the budget and a reason.

Any edit to the repo changes the fingerprint and makes every earlier PASS stale. That is deliberate: the round after the last fix re-verifies everything, so a fix that moved a neighbour shows up as that neighbour failing.

**If the hook does not run** (hooks off, folder untrusted): print the condition as a `/goal` line and carry on; the judge and the ledger do not depend on it.

## Step 5 — Fix

Take the FAIL rows, smallest blast radius first — a colour before a layout, a leaf before a container.

- **Find the code from the screen, not from a guess.** Grep the visible string; in an i18n'd app it is a translation value, so grep its key next. The component that renders it is where the fix goes.
- **Fix to the token, never the literal.** The mock says `#4A3A86`; the theme has a name for it. No token holds the value → the row is `decision needed`, not a hardcoded hex. In Relentless that is a hard rule of the repo.
- **One component per commit.** The commit message names the row key.
- **Shared code is shared.** On React Native one edit changes both platforms. With `--platform both`, a fix is not done until both platforms' rows pass; a platform-only fix goes behind `Platform.select`, and says why.
- **Do not fix a measurement the judge called data.** Do not edit the mock. Do not loosen a tolerance mid-run — `tolerances` is fixed at round 1 and recorded in `state.md`.

Then the next round, all frames. A row that fails three rounds after an edit aimed at it → `BLOCKED` with what was tried. The others carry on.

**Process failures** — Metro gone, emulator dead, build broken — get no retry loop. Write `audit.blocked` and `blocked.md`; the hook lets the turn end.

## Step 6 — Verify and hand off

When the hook passes, the last round *is* the proof: every PASS was measured and judged on the final code. Then:

- Every `[DEBUG-*]` probe gone, verified by reading the diff.
- The repo's own checks green (Relentless: `npm --prefix apps/mobile run verify`).
- `report.md`: per frame, per component — mock | before | after crops, the row status, and for each fix the commit. WAIVED rows quote Amel's reason. BLOCKED rows say what was tried.
- Branch and draft PR per `../feature-dev/SKILL.md` step 9 conventions, the report as its body. On a repo Amel owns, a branch and the report are enough unless asked for the PR.
- **Restore the device**: density, night mode, demo mode.

## Called from feature-dev

A visual acceptance criterion no longer goes in the PR as unverified. Feature-dev step 7 calls this in fix mode on the frames the criterion names, after the acceptance tests are green. Its ledger rows become the criterion's evidence in the criterion table.

## What this does not do

- **Judge the design.** A mock that breaks its own design system is a `decision needed` naming both, not something to quietly correct.
- **Pixel-diff the mock against the app.** A browser and Android do not rasterise the same font identically, and the mock's data is not the app's. Measured properties are the gate; pixels are the evidence.
- **Invent state.** A frame whose data cannot be reached is skipped and named, never compared against whatever the app happens to show.
