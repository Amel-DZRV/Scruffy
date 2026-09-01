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
