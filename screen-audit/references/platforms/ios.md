# iOS — screen-audit commands

Facts only. **Needs a Mac**: the iOS Simulator does not run on Windows. Untested as of 2026-10-04 — the first iOS run corrects this file. Shared commands (status bar override, build identity, `axe`) are in `../../../bug-eater/references/platforms/ios.md`.

## Pin to the mock

A simulator's point width cannot be changed, so pick a device that already is the mock's width. For a 375-wide mock: **iPhone SE (3rd generation)** or **iPhone 13 mini** (375 pt). A wider device (iPhone 17, 402 pt) makes `compare.mjs` stop on the width check — by design; comparing a 375 mock to a 402 screen measures the device, not the code.

```bash
xcrun simctl list devices available | grep -E "iPhone SE|13 mini"
xcrun simctl boot <UDID>
xcrun simctl ui <UDID> appearance light          # dark for theme=dark frames
xcrun simctl status_bar <UDID> override --time 9:41 --batteryState charged --batteryLevel 100 --cellularBars 4 --wifiBars 3
```

`--scale` is the screenshot's px per pt: 2 for SE (3rd gen), 3 for 13 mini — read it as `app.png` width ÷ 375.

Restore: `xcrun simctl status_bar <UDID> clear`, appearance back to what `state.md` recorded.

## Reach a screen

```bash
xcrun simctl openurl <UDID> "relentless://training/programs"
```

## Tree

mobile-mcp `mobile_list_elements_on_screen` (`format: json`) → `app.tree.json`. Its iOS coordinates are **points**: pass `--tree-units dp` to `compare.mjs`. Without mobile-mcp: `axe describe-ui --udid <UDID>` gives points too.

## Screenshot

```bash
xcrun simctl io <UDID> screenshot app.png
```

## Fast Refresh

Same Metro check as Android (`curl -s http://localhost:8081/status`). The simulator reaches the host's localhost directly; no `reverse`. Expensive path: `npx expo run:ios`.

## Both platforms in one run

`--platform both` runs each round on both devices — Android first, because it is cheaper here — then fixes once. On React Native the fix is shared, so a round is not done until both platforms' rows are re-measured on the same fingerprint. A difference that appears on one platform only is usually a platform default (font fallback, elevation vs shadow, ripple) and its fix belongs behind `Platform.select` with a one-line reason.
