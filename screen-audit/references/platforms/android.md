# Android — screen-audit commands

Facts only. Reasoning lives in `SKILL.md`. Shared commands (build identity, demo mode) are in `../../../bug-eater/references/platforms/android.md`; this file adds what an audit needs.

## Windows: Git Bash rewrites device paths

`/sdcard/ui.xml` becomes `C:/Program Files/Git/sdcard/ui.xml` before adb sees it. Prefix **the adb command only**, every time it names a device path:

```bash
MSYS_NO_PATHCONV=1 adb -s <serial> pull /sdcard/ui.xml app.tree.xml
```

Never `export` it: with it set for the whole shell, `git -C /c/dev/...` and other POSIX-style host paths stop converting and fail. Pass `git` and `node` calls `C:/…` paths.

## Two names for one device

mobile-mcp calls the emulator by AVD name (`Pixel_API36`); adb by serial (`emulator-5554`). Record both in `state.md`; mobile-mcp tools take the first, adb the second.

## Pin to the mock

The mock's phone content is 375 CSS px wide (`mock-extract --list` prints 377: that size includes the phone's 1 px border each side; `mock.png` and the node frames are the 375 inside). Make the device 375 dp wide so one dp is one mock px and `--scale` is the device's px-per-dp. **First record the values you are about to change in `state.md`**:

```bash
adb -s <serial> shell wm density                                  # Physical / Override density
adb -s <serial> shell cmd uimode night                            # Night mode: yes|no|auto
adb -s <serial> shell settings get global sysui_demo_allowed      # 1, 0 or null
```

```bash
W=$(adb -s <serial> shell wm size | grep -o '[0-9]*x' | head -1 | tr -d x)   # physical width in px, e.g. 1080
D=$(( (W * 160 + 187) / 375 ))                                               # density for 375 dp, e.g. 461
adb -s <serial> shell wm density $D
SCALE=$(node -e "console.log(($W/375).toFixed(4))")                          # e.g. 2.8800
```

Density is an integer, so the device is 374.8–374.9 dp wide (1080 px at 461 dpi = 374.8 dp), never exactly 375. `compare.mjs` compares the two images' widths in dp and accepts up to 0.5 dp (`width_dp`); keep `--scale` at `$W/375` for both the mock and the compare. Then per frame:

```bash
adb -s <serial> shell cmd uimode night no      # `yes` for a frame with theme=dark
```

Restore when the run ends, every ending, to the values `state.md` recorded before the pin:

```bash
adb -s <serial> shell wm density <recorded override>   # or `wm density reset` when there was no override
adb -s <serial> shell cmd uimode night <recorded>      # yes | no | auto
adb -s <serial> shell am broadcast -a com.android.systemui.demo -e command exit
adb -s <serial> shell settings put global sysui_demo_allowed <recorded>   # `settings delete global sysui_demo_allowed` when it was null
```

The shared bug-eater platform file sets `sysui_demo_allowed` to 1 for the demo status bar; an audit that did the same must put it back.

An app with its own theme setting ignores `uimode`; the frame recipe then says how to switch it.

## Reach a screen

Expo Router apps take a deep link per route, and it works on a running instance:

```bash
adb -s <serial> shell am start -a android.intent.action.VIEW -d "relentless://training/programs" <package>
```

`relentless:///` does **not** return to the tabs root from a pushed screen — it is delivered to the top instance and ignored. Tap the tab by label instead. A route that needs taps after the link lists them in the frame recipe, by label, never coordinates.

## Tree

mobile-mcp holds the device's UiAutomation connection while it is connected, and `uiautomator dump` is then killed on start (exit 137). So:

- **mobile-mcp connected:** `mobile_list_elements_on_screen` (default text format). mobile-mcp cannot save the list to a file, so Write the text it returned, **verbatim**, to `app.tree.txt` — one element per line, `@e24 TextView text="…" label="…" id="…" at=x,y size=WxH [selected]`, an optional header line. Do not convert it to JSON. `format: json` is still accepted (`app.tree.json`, same Write, verbatim). Coordinates are device pixels.
- **mobile-mcp not running:** `adb shell uiautomator dump /sdcard/ui.xml && MSYS_NO_PATHCONV=1 adb pull /sdcard/ui.xml app.tree.xml` (the dump and pull both name a device path). `compare.mjs` reads text, JSON or XML.

React Native `testID` does not appear as `resource-id` in any of them. Matching is on visible text and accessibility labels. The tree has no `clickable` flag in mobile-mcp's formats (tab items are plain `View`s, only the active one is `selected`), so which elements are interactive comes from the frame's `## Expect` block, not from the tree (see `probes.md`).

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
