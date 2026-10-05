# iOS — screen-audit commands

Facts only. **Needs a Mac**: the iOS Simulator does not run on Windows. First run 2026-10-04 (iPhone 13 mini, Relentless frame 4). Shared commands (status bar override, build identity, `axe`, the stable-tree wait: two dumps, key-sorted, 1 s apart) are in `../../../bug-eater/references/platforms/ios.md`.

## Pin to the mock

A simulator's point width cannot be changed, so pick a device that is the mock's width **and at least as tall as the frame**. A taller frame than the device has its lower components reported `OFF SCREEN` (below the viewport; capture a scrolled screenshot), never measured. iPhone SE (3rd gen, 375x667) is too short for most Relentless frames (762–929 dp). Use the **iPhone 13 mini (375x812)**. A wider device (iPhone 17, 402 pt) makes `compare.mjs` stop on the width check (more than 0.5 dp apart) — by design; comparing a 375 mock to a 402 screen measures the device, not the code. The mock is 375 wide (`mock-extract --list` prints 377: the phone's border is counted).

```bash
xcrun simctl list devices available | grep "13 mini"
# absent: create it, install the dev client, open it on Metro
xcrun simctl create "iPhone 13 mini (scruffy)" com.apple.CoreSimulator.SimDeviceType.iPhone-13-mini <runtime>   # runtime: `xcrun simctl list runtimes`
xcrun simctl boot <UDID>
xcrun simctl install <UDID> <path to the .app in DerivedData>
xcrun simctl openurl <UDID> "<scheme>://expo-development-client/?url=http%3A%2F%2Flocalhost%3A8081"
xcrun simctl ui <UDID> appearance light          # dark for theme=dark frames
xcrun simctl status_bar <UDID> override --time 9:41 --dataNetwork wifi --wifiMode active --wifiBars 3 --cellularMode active --cellularBars 4 --batteryState charged --batteryLevel 100
```

`--scale` is the screenshot's px per pt, **always `app.png` width ÷ 375**: the 13 mini's screenshot is 1080x2340, so 2.88, not 3 (SE 3rd gen: 750 wide, 2).

Before the pin, record the current appearance (`xcrun simctl ui <UDID> appearance`, with no value it prints the current one) in `state.md`; `status_bar list` before the override prints an empty list, so there is nothing to record there. Restore: `xcrun simctl status_bar <UDID> clear`, appearance back to the recorded value. (Restore untested.)

The 13 mini is a notch device: a 50 pt top inset that the mock's own drawn status bar (about 12–26 dp, skipped by `--mock-chrome-top`, default 28) does not match, absorbed by the median vertical offset. A ~34 pt home-indicator strip sits under the tab bar that the mock does not draw. The tree's clock still reads the real time (09:10) though the override shows 09:41 in the PNG.

## Reach a screen

```bash
xcrun simctl openurl <UDID> "relentless://training/programs"
```

`simctl openurl` raises an "Open in “<app>”?" system sheet (the app's display name, e.g. "mobile"), which lands in the screenshot if left. Dismiss it **by coordinates** — `axe tap --label` fails while the sheet is up ("No translation object returned"); tap the Open button's position (`axe tap -x <x> -y <y> --udid <UDID>`) — or skip `openurl` when the screen is already up. Then check the tree holds no `Sheet` node before capturing.

## Tree

```bash
axe describe-ui --udid <UDID> > app.tree.axe.json
```

Pass it to `compare.mjs` as is, no conversion: the nested JSON is read natively, its frames are points (`--tree-units` is ignored for it), `StaticText` becomes text, every other node a label (a React Native Pressable is one `Button` whose label is its text), and axe's duplicate `StaticText` nodes are dropped. A tab's label reads "Training, tab, 1 of 4"; the suffix is stripped for matching. mobile-mcp's text or JSON (`--tree-units dp`: its iOS coordinates are points) is still accepted. Status-bar nodes and "Horizontal scroll bar" sliders appear in the tree and are harmless.

## Screenshot

```bash
xcrun simctl io <UDID> screenshot app.png
```

## Fast Refresh

Same Metro check as Android (`curl -s http://localhost:8081/status`). The simulator reaches the host's localhost directly; no `reverse`. Expensive path: `npx expo run:ios`.

## Both platforms in one run

`--platform both` runs each round on both devices — Android first, because it is cheaper here — then fixes once. On React Native the fix is shared, so a round is not done until both platforms' rows are re-measured on the same fingerprint. A difference that appears on one platform only is usually a platform default (font fallback, elevation vs shadow, ripple) and its fix belongs behind `Platform.select` with a one-line reason.
