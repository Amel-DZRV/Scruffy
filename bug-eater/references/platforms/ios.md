# iOS — platform commands

Facts only. Reasoning lives in `SKILL.md`.

## Claim a device

```bash
xcrun simctl list devices booted            # what is already up
xcrun simctl boot "<device name>"           # if all busy
```

Record the UDID in `state.md`. Every later command in the run pins to it.

Prefer a booted sim not running an app under test over booting a fresh one — boot is slow. But never queue behind a busy sim; boot instead.

## Screenshot

```bash
xcrun simctl io <UDID> screenshot before.png
```

Deterministic. Same device, same OS, same window as the "after" — which is the whole point of capturing it here rather than asking a human.

## Accessibility tree

```bash
axe describe-ui --udid <UDID>
```

Text, not pixels. Gives frames, labels, roles and states as values you can assert on. This is the default route to a red test for a visual bug.

## Snapshots

Rare on these repos for the bug itself; component snapshots exist sometimes. Check, do not expect. Never create a suite.

## Test run

Per repo — see the project profile. Full suite, not the changed file's tests.

## Notes

- Builds are long. Batch `[DEBUG-*]` probes: one build, many answers.
- Concurrent builds contend on CPU, RAM and disk regardless of repo. Build slot semaphore, N set from the machine.
- Check for a remote build cache before assuming N=1:
  ```bash
  grep -rE "remote_cache|remote_executor|bes_backend|remote_download" .bazelrc* 2>/dev/null
  ```

## Pin settings

Same values on every capture in a pair. Set before launch, never between before and after.

```bash
xcrun simctl ui <UDID> appearance light          # or dark — record which in state.md
xcrun simctl status_bar <UDID> override --time 9:41 --dataNetwork wifi --wifiMode active --wifiBars 3 --cellularMode active --cellularBars 4 --batteryState charged --batteryLevel 100
xcrun simctl status_bar <UDID> list             # confirm; paste into the capture header
```

Some runtimes ignore the override. The pair diff masks the status bar rows regardless.

Device model and OS, to check a path file's `device`/`os` fields against the packet's UDID — `simctl list devices | grep <UDID>` does not show the runtime, so parse the JSON listing instead:

```bash
xcrun simctl list devices -j | python3 -c 'import json,sys; d=json.load(sys.stdin); udid="<UDID>"; [print(dev["name"], rt.split("iOS-")[-1].replace("-",".")) for rt,devs in d["devices"].items() for dev in devs if dev["udid"]==udid]'
```

Prints `<model> <os>` (e.g. `iPhone 17 26.5`). Android: `adb -s <serial> shell getprop ro.product.model` and `adb -s <serial> shell getprop ro.build.version.release`.

## Build identity

Proves the binary on screen is the one built for the SHA in the header. Recorded by whoever installs, checked by whoever captures.

```bash
APP=$(xcrun simctl get_app_container <UDID> <bundle id> app)
EXEC=$(/usr/libexec/PlistBuddy -c 'Print :CFBundleExecutable' "$APP/Info.plist")
shasum -a 256 "$APP/$EXEC"                       # → evidence/build-identity-<label>.txt with the git SHA beside it
```

A capture whose re-hash differs from the recorded one is `BUILD MISMATCH`, not a screenshot.

## Gate on the tree

The element the symptom is about must be in the accessibility tree before any pixel is captured.

```bash
axe describe-ui --udid <UDID> > tree.json
python3 -c 'import json, sys
label, role = "<label>", "<role or empty string>"
count = 0
def walk(n):
    global count
    if isinstance(n, dict):
        if n.get("AXLabel") == label and (not role or n.get("role") == role):
            count += 1
        for v in n.values():
            walk(v)
    elif isinstance(n, list):
        for v in n:
            walk(v)
walk(json.load(open("tree.json")))
print(count)
sys.exit(0 if count else 1)'
```

`AXLabel` and `role` (e.g. `AXButton`, `AXStaticText`, `AXHeading`) are the keys `axe describe-ui` actually emits. `axe describe-ui`'s top level is a JSON array, not a dict — this walks both, and any nesting depth. Prints the match count; the gate passes on count ≥ 1, so a repeated label (a list row's text duplicated as both a button's accessible name and a static-text child, for instance) does not fail the gate on its own.

Absent (count 0) → `GATE FAILED`. The screenshot is not taken. Report the labels of the root node's immediate children, not the tree's top-level label — the root is a single application node (label = app name), which never varies by screen and tells the caller nothing about which screen loaded.

## Wait for a stable tree

Animations and spinners produce a tree that is still changing. Dump twice, one second apart. `axe describe-ui`'s key order is non-deterministic, so two dumps of the same screen are never byte-identical — compare normalised (`sort_keys=True`) re-serialisations instead:

```bash
python3 -c 'import json,sys; print(json.dumps(json.load(open(sys.argv[1])), sort_keys=True))' tree1.json > n1.json
python3 -c 'import json,sys; print(json.dumps(json.load(open(sys.argv[1])), sort_keys=True))' tree2.json > n2.json
diff -q n1.json n2.json
```

Capture only when `diff` reports no difference. Give up after 15 seconds → `GATE FAILED (unstable)`. Android XML dumps serialise deterministically — byte comparison stays for Android.

## Tap by label

```bash
axe describe-ui --udid <UDID>                    # read the frame of the element with the wanted label
axe tap -x <cx> -y <cy> --udid <UDID>            # centre of that frame
```

Taps are by label resolved to a frame at replay time, never by stored coordinates. Layout moves; labels rarely do.

`role` disambiguates same-label siblings (a row's button and its static-text child can share a label but not a role). If more than one node still matches label and role, tap the first match in tree order and record that a duplicate was found — do not average or guess between frames.

There is no point-to-element command; resolve a point by searching the last tree dump for the deepest frame containing it.

## Pair diff

```bash
python3 <skill dir>/bug-eater/scripts/pair-diff.py before.png after.png --mask <x,y,w,h in screenshot pixels of the changed component> --threshold 0.005
```

Status bar rows are masked by default. Exit 1 means the pair differs outside the fix, and is not shipped. Exit 2 is a process failure — `size_mismatch=<bw>x<bh>-vs-<aw>x<ah>`, `mask_invalid=<value>`, or `mask_too_large=<value>` on the contract line.

**Masks are pixels; `axe` frames are points.** `xcrun simctl io screenshot` writes pixels, `axe describe-ui` reports points, and on every Retina simulator the two differ by the device scale. Both numbers are readable from the capture already taken:

```bash
python3 -c 'from PIL import Image; print(Image.open("before.png").width)'          # screenshot pixel width
python3 -c 'import json; t=json.load(open("before.tree.json")); n=t[0] if isinstance(t,list) else t; print(n["frame"]["width"])'   # root node frame width
```

`scale = screenshot pixel width / root node frame width` — 1206 / 402 = 3.0 on an iPhone 17 — then `mask pixels = frame × scale`, applied to all four values (`x`, `y`, `w`, `h`), not just the size. A mask converted on two of four values lands off-screen and masks nothing.
