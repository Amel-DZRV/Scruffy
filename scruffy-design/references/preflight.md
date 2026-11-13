# Preflight

Step 1. It answers one thing: can this run reach step 7 without a human supplying something halfway? Everything is checked before anything is asked, so Amel gets one message, not six.

## The inputs

| # | Input | Found by | When it is missing |
|---|---|---|---|
| 1 | **Design handoff** | the first argument: a folder, an archive, or a URL | ask for it. The run cannot start without it |
| 2 | **Product document** | `--spec <path>`, else the profile's `spec:`, else `docs/` and the repo root for a product or feature document | ask for the path. It is the behaviour spec; the design alone says how a screen looks, not what it does |
| 3 | **Target** | `--project <path>`, else the cwd repo | ask: existing repo path, or a new app (then: where to create it, and which stack) |
| 4 | **Project profile** | `<repo_path>/.scruffy/design-profile.md` (`owned: yes`), `../memory/<repo>/recipes/design-profile.md` (`owned: no`) | propose one (§Proposing a profile) and ask for a yes |
| 5 | **A device** | the profile's `device:`; a booted simulator or emulator, or a browser for a web target | boot the one the profile names. None available → `blocked` |
| 6 | **A renderer for the design** | a headless browser the profile's `render_cmd` can drive | name the gap. Without one the handoff's own exported screenshots are the reference, if it has them; if not → `blocked` |

Anything found is not asked about. Anything Amel already answered in `state.md` is not asked again.

## The one message

```
Design run for <app> / <feature>. Before I start I need:

1. <what is missing> — <what it is for>
2. Project profile: none found. I read the repo and propose the one below. OK, or edits?
   <the profile>
```

Then write `interview: closed` to `state.md`. Preflight does not ask twice.

## The project profile

One file per project, committed with the project when `owned: yes`. It is the only thing that differs from one app to the next; the lane itself names no stack.

```yaml
---
stack: <expo-react-native | swift-ios | kotlin-android | web | …>
spec: <path(s) to the product or feature document>
standards: <path to coding standards, or none>
device: <name>, <logical width> x <logical height> pt, @<scale>x
install_cmd: <dependencies>
check_cmd: <typecheck and lint; seconds, run after every merge>
test_cmd: <unit and component tests, or none>
build_cmd: <build and install on the device; run once per run, more only when native code changes>
launch_cmd: <start the dev server and the app>
reload_cmd: <pick up new code without a rebuild, or none>
open_state_cmd: <open one screen in one state; {screen} and {state} are substituted>
screenshot_cmd: <write a PNG to {out}>
render_cmd: <render a design file to a PNG at the device's size; {src} and {out} are substituted>
ui_globs: <files that are screens or components>
shared_globs: <theme, tokens, navigation, shared components: frozen for screen developers after step 3>
proven: <date, or no>
---
## Traps
- <what went wrong and what to check first>
```

`open_state_cmd` is the important one. It reaches the **state harness** the foundation wave builds (`build.md` §Foundation): a development-only entry that renders a named screen in a named state from fixtures. Until that exists, preflight proves `open_state_cmd` against the app's start screen only.

## Proposing a profile

Read, do not guess: `package.json` scripts, `app.json` / `app.config.*`, `eas.json`, the Xcode project or `Package.swift`, `build.gradle*`, the CI config (the most reliable source for the real test command), `CONTRIBUTING.md` and `CLAUDE.md`. A field that cannot be read from the repo is proposed from the starter below and marked `# assumed`.

Starters. Every line is a proposal that §Proving it accepts or rejects; none has been run by this lane yet.

**Expo / React Native on the iOS simulator**

```yaml
install_cmd: npm ci
check_cmd: npx tsc --noEmit && npx eslint .
test_cmd: npx jest
build_cmd: npx expo run:ios --device "<simulator name>"
launch_cmd: npx expo start --dev-client
reload_cmd: none            # Fast Refresh picks up merged code
open_state_cmd: xcrun simctl openurl <UDID> "<scheme>://design-harness/{screen}/{state}"
screenshot_cmd: xcrun simctl io <UDID> screenshot {out}
render_cmd: npx playwright screenshot --viewport-size "<w>,<h>" --wait-for-timeout 500 {src} {out}
```

**Expo / React Native on the Android emulator** — same, except:

```yaml
build_cmd: npx expo run:android --device "<avd name>"
open_state_cmd: adb -s <serial> shell am start -a android.intent.action.VIEW -d "<scheme>://design-harness/{screen}/{state}"
screenshot_cmd: adb -s <serial> exec-out screencap -p > {out}
```

Pinning the status bar and appearance follows `../scruffy-bug/references/platforms/ios.md` and `../scruffy-bug/references/platforms/android.md` §Pin settings. The Android section there is marked untested; treat the first Android run as the test.

**Windows hosts.** The scripts here are bash and `python3`. Run from Git Bash, with `python3` on the path. Preflight checks both and names whichever is missing.

## Proving it

In order, each with its output kept in `evidence/preflight/` under the three-line header (SHA, exact command, device identifier):

1. `install_cmd`
2. `check_cmd`, and `test_cmd` when there is one. Its result on the untouched branch is the **baseline**: pass count and the names of any failures, in `evidence/baseline.txt`. Every later suite claim reads "no new failures against baseline".
3. `build_cmd`, timed. That time is the cost of a rebuild, recorded in `state.md`.
4. `launch_cmd`, then `screenshot_cmd`. The PNG must exist, be non-empty, and match the profile's `device:` size times its scale.
5. `render_cmd` on one design file. Same size check.

All five pass → set `proven: <today>` in the profile. A profile already `proven` is re-proven in under a minute by steps 4 and 5 only, unless `build_cmd` or the device changed.

A failure is a process failure: no retry loop. The run ends `blocked`, naming the command, with its output. Add the cause to the profile's `## Traps` once known.

## A new app

No repo, or an empty one:

1. The stack comes from the product document if it names one, else from the preflight message. It is never chosen by this lane.
2. Scaffold here, in step 1, once the answers are in: the stack's own generator, default options, committed alone as the repo's first commit. Nothing from the design goes into this commit.
3. The profile is proposed after the scaffold exists, because there is nothing to read before it, and confirmed in a second short message. This is the one case where preflight asks twice. Steps 1 to 5 above then run against the scaffold.
4. There is no baseline beyond the scaffold's own tests. The proof says so in one line and does not imply more.
