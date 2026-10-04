# Android — screen-audit commands

Facts only. Reasoning lives in `SKILL.md`. Shared commands (build identity, demo mode) are in `../../../bug-eater/references/platforms/android.md`; this file adds what an audit needs.

## Windows: Git Bash rewrites device paths

`/sdcard/ui.xml` becomes `C:/Program Files/Git/sdcard/ui.xml` before adb sees it. Prefix every adb call that names a device path:

```bash
export MSYS_NO_PATHCONV=1
```

## Two names for one device

mobile-mcp calls the emulator by AVD name (`Pixel_API36`); adb by serial (`emulator-5554`). Record both in `state.md`; mobile-mcp tools take the first, adb the second.

## Pin to the mock

The mock's phone frame is 375 CSS px wide. Make the device 375 dp wide so one dp is one mock px and `--scale` is the device's px-per-dp:

```bash
W=$(adb -s <serial> shell wm size | grep -o '[0-9]*x' | head -1 | tr -d x)   # physical width in px, e.g. 1080
D=$(( (W * 160 + 187) / 375 ))                                               # density for 375 dp, e.g. 461
adb -s <serial> shell wm density $D
SCALE=$(node -e "console.log(($W/375).toFixed(4))")                          # e.g. 2.8800
```

Density is an integer, so the width lands within 0.5 dp of 375 — inside tolerance. Then per frame:

```bash
adb -s <serial> shell cmd uimode night no      # `yes` for a frame with theme=dark
```

Restore when the run ends, every ending:

```bash
adb -s <serial> shell wm density reset
adb -s <serial> shell cmd uimode night no      # or whatever state.md recorded before the pin
adb -s <serial> shell am broadcast -a com.android.systemui.demo -e command exit
```

An app with its own theme setting ignores `uimode`; the frame recipe then says how to switch it.

## Reach a screen

Expo Router apps take a deep link per route, and it works on a running instance:

```bash
adb -s <serial> shell am start -a android.intent.action.VIEW -d "relentless://training/programs" <package>
```

`relentless:///` does **not** return to the tabs root from a pushed screen — it is delivered to the top instance and ignored. Tap the tab by label instead. A route that needs taps after the link lists them in the frame recipe, by label, never coordinates.

## Tree

mobile-mcp holds the device's UiAutomation connection while it is connected, and `uiautomator dump` is then killed on start (exit 137). So:

- **mobile-mcp connected:** `mobile_list_elements_on_screen` with `format: json`; write the array verbatim to `app.tree.json`. Coordinates are device pixels.
- **mobile-mcp not running:** `adb shell uiautomator dump /sdcard/ui.xml && adb pull /sdcard/ui.xml app.tree.xml`. `compare.mjs` reads either.

React Native `testID` does not appear as `resource-id` in either. Matching is on visible text and accessibility labels.

**Stable:** two element lists a second apart with the same texts and frames. Up to 15 s, then the frame's row is a process failure for this round.

## Screenshot

```bash
adb -s <serial> exec-out screencap -p > app.png
```

Device pixels; the status bar and gesture bar are in it. `compare.mjs` ignores system UI by its `com.android.systemui` ids and the mock's own drawn status bar by `--mock-chrome-top` (28 dp default).

## Fast Refresh — the cost class

```bash
curl -s http://localhost:8081/status          # "packager-status:running" → Metro is up
adb -s <serial> reverse --list | grep 8081    # the device reaches it
```

Both → **cheap**: a saved JS/TS edit reloads in a second or two; wait for the tree to change, then capture. Either missing, or the edit touches native code or `app.json` → **expensive**: `npx expo run:android` (in Relentless, from `apps/mobile`), batched once per round.

A red error screen after an edit is a build failure of that edit, not a design failure — read it from the tree, revert or fix, and do not count it as a round.

## Crashes

```bash
adb -s <serial> logcat -d -t 200 | grep -E "FATAL EXCEPTION|ReactNativeJS.*Error"
```

Run after every probe. A crash fails the probe regardless of what the screen shows afterwards.

## Machine facts at writing (2026-10-04)

| Check | Result |
|---|---|
| Emulator | `Pixel_API36` / `emulator-5554`, Android 16, 1080×2400 @ 420 dpi (411 dp wide) |
| App | `com.relentless.fitnessapp`, scheme `relentless` |
| Python | not installed — screen-audit's scripts are Node only; bug-eater's `.py` scripts do not run on this machine |
| Browser for the mock | Chrome at `C:/Program Files/Google/Chrome/Application/chrome.exe` (override with `SCREEN_AUDIT_BROWSER`) |
