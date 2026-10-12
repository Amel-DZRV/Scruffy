# Android — platform commands

Facts only. Reasoning lives in `SKILL.md`.

## Claim a device

```bash
adb devices -l                              # what is already up
emulator -avd <name> -no-snapshot-load &    # if all busy
```

Record the serial in `state.md`. Every later command pins to it via `adb -s <serial>`.

## Screenshot

```bash
adb -s <serial> exec-out screencap -p > before.png
```

Deterministic, same as iOS. Capture "before" on clean main in the same session.

## Accessibility tree

```bash
adb -s <serial> shell uiautomator dump /sdcard/ui.xml
adb -s <serial> pull /sdcard/ui.xml
```

XML with bounds, content-desc, class, and state per node. Bounds give you a frame to assert on — the Android equivalent of `axe describe-ui`.

## Snapshots

**Check here first, before falling back to the AX tree.** Paparazzi is common on Android and genuinely good, so an existing snapshot covering the component is a realistic path to a red test — more so than on iOS.

Still never create a suite where none exists.

## Test run

Per repo — see the project profile. Full suite, not the changed module's tests.

## Notes

- Emulator startup is slow and flaky. A failed boot is a process failure, not a solution failure — no retry loop.
- Same build slot semaphore as iOS. Gradle daemons and emulators both eat RAM.

<!-- untested on 2026-09-29: no adb on this machine -->
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

`uiautomator dump` reports `bounds` in device pixels, the same units `adb exec-out screencap` writes, so the points-to-pixels conversion iOS needs does not apply here. A mask read off the tree goes straight to `--mask`.

Exit 1 means the pair differs outside the fix, and is not shipped. Exit 3 means nothing changed inside the mask — an identical pair — which fails the proof. Exit 2 is a process failure — `size_mismatch=<bw>x<bh>-vs-<aw>x<ah>`, `mask_invalid=<value>`, or `mask_too_large=<value>` on the contract line.

## Tree diff

```bash
python3 ~/.claude/skills/scruffy-bug/scripts/tree-diff.py before.tree.xml after.tree.xml
```

Prints `a11y: UNCHANGED | CHANGED | ATTENTION` and one line per finding. Exit 0 always (2 when a tree cannot be read, reported as `UNAVAILABLE`). A secondary signal: it never gates and never changes the verdict.
