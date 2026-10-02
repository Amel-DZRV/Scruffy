# Task 01 — Platform facts

**Goal:** Every command the capture agent will run exists, is written down in the platform reference files, and has been executed once on the booted simulator.

**Why first:** Tasks 02 to 07 cite these commands. A wrong flag here fails silently inside a 35-minute build later.

**Files:**
- Modify: `bug-eater/references/platforms/ios.md`
- Modify: `bug-eater/references/platforms/android.md`
- Create: `bug-eater/scripts/pair-diff.py`
- Modify: `scruffy/references/preflight.md` (one line under "Soft checks")

**Interfaces:**
- Produces: the section names `## Pin settings`, `## Build identity`, `## Gate on the tree`, `## Wait for a stable tree`, `## Tap by label`, `## Pair diff` in both platform files. Task 02's agent file cites them by name.
- Produces: `pair-diff.py <before.png> <after.png> [--mask x,y,w,h ...] [--threshold 0.005]`, exit 0 when the changed fraction outside the masks is under the threshold, exit 1 otherwise, always printing one line `changed=<fraction> masked=<n> threshold=<t>`. On a before/after size mismatch: exit 2, printing `changed=nan masked=0 threshold=<t> size_mismatch=<bw>x<bh>-vs-<aw>x<ah>`. On a malformed `--mask`: exit 2, `changed=nan masked=0 threshold=<t> mask_invalid=<value>`. On a supplied mask whose area exceeds 50% of the image: exit 2, `changed=nan masked=0 threshold=<t> mask_too_large=<value>`. All four are the same one-line shape, no separate error format.

---

## Steps

- [x] **Step 1: Install `axe`**

```bash
brew install cameroncooke/axe/axe
axe --version
```

Expected: a version line. If the tap name has changed, `brew search axe` and pick the formula whose description mentions iOS simulator accessibility. Record the exact install command in `scruffy/references/preflight.md` under "Soft checks", replacing the sentence that says missing `axe` degrades to snapshot plus screenshot with: missing `axe` degrades the capture gate to build identity only, and the pair is marked `ungated` in the proof block.

- [x] **Step 2: Exercise every iOS command once on the booted device**

Use the UDID from the overview, never the device name (Review Focus 2).

```bash
UDID=F63A6434-5512-45CB-9DF9-0103239F3926
xcrun simctl ui $UDID appearance light
xcrun simctl status_bar $UDID override --time 9:41 --dataNetwork wifi --wifiMode active --wifiBars 3 --cellularMode active --cellularBars 4 --batteryState charged --batteryLevel 100
xcrun simctl status_bar $UDID list
xcrun simctl launch $UDID com.apple.Preferences
xcrun simctl appinfo $UDID com.apple.Preferences
APP=$(xcrun simctl get_app_container $UDID com.apple.Preferences app); echo "$APP"
axe describe-ui --udid $UDID | head -40
xcrun simctl io $UDID screenshot /tmp/smoke.png && file /tmp/smoke.png
```

Expected: `status_bar list` echoes the overrides; `appinfo` prints a dictionary including `CFBundleVersion` and `Path`; `describe-ui` prints JSON with `AXLabel`, `role` and `frame` fields; `file` reports a PNG with the device's pixel size. Note the exact JSON key names `axe` uses for label, role and frame. Task 02 depends on them.

- [x] **Step 3: Write the iOS sections**

Append to `bug-eater/references/platforms/ios.md`, facts only, matching the file's existing style:

````markdown
## Pin settings

Same values on every capture in a pair. Set before launch, never between before and after.

```bash
xcrun simctl ui <UDID> appearance light          # or dark — record which in state.md
xcrun simctl status_bar <UDID> override --time 9:41 --dataNetwork wifi --wifiMode active --wifiBars 3 --cellularMode active --cellularBars 4 --batteryState charged --batteryLevel 100
xcrun simctl status_bar <UDID> list             # confirm; paste into the capture header
```

Some runtimes ignore the override. The pair diff masks the status bar rows regardless.

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
python3 -c 'import json,sys; t=json.load(open("tree.json")); ...'   # find label + role; exit 1 if absent
```

Absent → `GATE FAILED`. The screenshot is not taken.

## Wait for a stable tree

Animations and spinners produce a tree that is still changing. Dump twice, one second apart; capture only when the two dumps are byte-identical. Give up after 15 seconds → `GATE FAILED (unstable)`.

## Tap by label

```bash
axe describe-ui --udid <UDID>                    # read the frame of the element with the wanted label
axe tap -x <cx> -y <cy> --udid <UDID>            # centre of that frame
```

Taps are by label resolved to a frame at replay time, never by stored coordinates. Layout moves; labels rarely do.

## Pair diff

```bash
python3 <skill dir>/bug-eater/scripts/pair-diff.py before.png after.png --mask <x,y,w,h of the changed component> --threshold 0.005
```

Status bar rows are masked by default. Exit 1 means the pair differs outside the fix, and is not shipped.
````

Replace `...` in the gate snippet with the real key names learned in step 2.

- [x] **Step 4: Write `pair-diff.py`**

```python
#!/usr/bin/env python3
"""Compare a before/after screenshot pair. Exit 0 when they differ only inside the masks."""
import argparse, sys
from PIL import Image, ImageChops

MAX_MASK_FRACTION = 0.5

def parse_mask(s):
    """None for "none", (x, y, w, h) otherwise. Raises ValueError on anything else."""
    if s.strip().lower() == "none":
        return None
    parts = s.split(",")
    if len(parts) != 4:
        raise ValueError(s)
    x, y, w, h = (int(p) for p in parts)
    if w <= 0 or h <= 0:
        raise ValueError(s)
    return (x, y, w, h)

def main():
    p = argparse.ArgumentParser()
    p.add_argument("before"); p.add_argument("after")
    p.add_argument("--mask", action="append", default=[], help="x,y,w,h — repeatable")
    p.add_argument("--status-bar-height", type=int, default=160, help="pixels masked at the top by default")
    p.add_argument("--threshold", type=float, default=0.005)
    a = p.parse_args()

    # Validate every supplied mask before opening anything: a malformed value is a
    # process failure, not a diff result.
    supplied = []
    for value in a.mask:
        try:
            frame = parse_mask(value)
        except ValueError:
            print(f"changed=nan masked=0 threshold={a.threshold} mask_invalid={value}")
            sys.exit(2)
        if frame is not None:
            supplied.append((value, frame))

    b = Image.open(a.before).convert("RGB"); f = Image.open(a.after).convert("RGB")
    if b.size != f.size:
        bsize = f"{b.width}x{b.height}"; fsize = f"{f.width}x{f.height}"
        print(f"changed=nan masked=0 threshold={a.threshold} size_mismatch={bsize}-vs-{fsize}")
        sys.exit(2)

    # A mask covering half the screenshot proves nothing; checked against the supplied
    # frame's own area, never the script's status-bar box.
    for value, (_, _, w, h) in supplied:
        if w * h > MAX_MASK_FRACTION * b.width * b.height:
            print(f"changed=nan masked=0 threshold={a.threshold} mask_too_large={value}")
            sys.exit(2)

    diff = ImageChops.difference(b, f).convert("L").point(lambda v: 255 if v > 16 else 0)
    masks = [(0, 0, b.width, a.status_bar_height)] + [(x, y, x + w, y + h) for _, (x, y, w, h) in supplied]
    for box in masks:
        diff.paste(0, box)
    changed = diff.histogram()[255] / (b.width * b.height)
    print(f"changed={changed:.5f} masked={len(masks)} threshold={a.threshold}")
    sys.exit(0 if changed <= a.threshold else 1)

if __name__ == "__main__":
    main()
```

- [x] **Step 5: Test `pair-diff.py` three ways**

```bash
UDID=F63A6434-5512-45CB-9DF9-0103239F3926
xcrun simctl io $UDID screenshot /tmp/a.png; sleep 1; xcrun simctl io $UDID screenshot /tmp/b.png
python3 bug-eater/scripts/pair-diff.py /tmp/a.png /tmp/b.png; echo "exit=$?"
```

Expected: `changed=0.00000` or close, `exit=0`. The status bar clock is under the default mask, so a ticking clock does not fail it (Review Focus 5).

```bash
axe tap -x 200 -y 400 --udid $UDID; sleep 1; xcrun simctl io $UDID screenshot /tmp/c.png
python3 bug-eater/scripts/pair-diff.py /tmp/a.png /tmp/c.png; echo "exit=$?"
```

Expected: a large `changed=` fraction, `exit=1`. A different screen is caught.

```bash
python3 bug-eater/scripts/pair-diff.py /tmp/a.png /tmp/c.png --mask 0,0,1200,3000; echo "exit=$?"
```

Expected: `exit=0`. A mask covering the whole change passes, which is what a correct component mask does on a real fix.

- [x] **Step 6: Write the Android sections**

Append to `bug-eater/references/platforms/android.md`, same six section names:

````markdown
## Pin settings

```bash
adb -s <serial> shell cmd uimode night no                       # or yes — record in state.md
adb -s <serial> shell settings put global sysui_demo_allowed 1
adb -s <serial> shell am broadcast -a com.android.systemui.demo -e command enter
adb -s <serial> shell am broadcast -a com.android.systemui.demo -e command clock -e hhmm 0941
adb -s <serial> shell am broadcast -a com.android.systemui.demo -e command battery -e level 100 -e plugged false
adb -s <serial> shell am broadcast -a com.android.systemui.demo -e command network -e wifi show -e level 4
```

Demo mode fixes the status bar the way `simctl status_bar` does on iOS. `-e command exit` leaves it.

## Build identity

```bash
APK=$(adb -s <serial> shell pm path <package> | sed 's/package://' | head -1)
adb -s <serial> pull "$APK" /tmp/installed.apk && shasum -a 256 /tmp/installed.apk
```

Recorded beside the git SHA at install; re-hashed at capture. Mismatch → `BUILD MISMATCH`.

## Gate on the tree

```bash
adb -s <serial> shell uiautomator dump /sdcard/ui.xml && adb -s <serial> pull /sdcard/ui.xml tree.xml
python3 -c 'import xml.etree.ElementTree as E; ...'              # match content-desc or text, plus class; exit 1 if absent
```

## Wait for a stable tree

Two dumps one second apart, byte-identical → stable. 15-second cap → `GATE FAILED (unstable)`.

## Tap by label

```bash
# read bounds="[x1,y1][x2,y2]" of the matched node from tree.xml, tap its centre
adb -s <serial> shell input tap <cx> <cy>
```

## Pair diff

Same script as iOS. The default status bar mask height is in physical pixels; pass `--status-bar-height` matching the emulator's density if the default 160 is wrong.
````

Test: cannot run on this machine (`adb` not installed). Mark the section header with `<!-- untested on 2026-09-29: no adb on this machine -->` and remove the comment on the first Android item in task 07's follow-up.

- [x] **Step 7: Structural test**

```bash
for f in bug-eater/references/platforms/ios.md bug-eater/references/platforms/android.md; do
  for s in "Pin settings" "Build identity" "Gate on the tree" "Wait for a stable tree" "Tap by label" "Pair diff"; do
    grep -q "^## $s" "$f" || echo "MISSING $s in $f"; done; done
test -x bug-eater/scripts/pair-diff.py || chmod +x bug-eater/scripts/pair-diff.py
grep -n "axe" scruffy/references/preflight.md
```

Expected: no `MISSING` lines; preflight names the install command and the `ungated` degradation.

- [x] **Step 8: Commit**

```bash
git add bug-eater/references/platforms/ bug-eater/scripts/pair-diff.py scruffy/references/preflight.md
git commit -m "Add capture commands, build identity and pair diff to platform references"
```

## What to expect when this task is done

- `axe describe-ui` returns a tree for the booted iPhone 17 and you know its key names.
- A same-screen pair passes the diff, a different-screen pair fails it, a masked change passes.
- The Android file is complete but carries an "untested" marker. That marker is honest and is removed by a real Android run, not by reading.
