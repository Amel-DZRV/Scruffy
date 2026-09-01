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
