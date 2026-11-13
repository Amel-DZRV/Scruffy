# Capture

Two pictures per state: what the design says, and what the build shows. Both are taken by the Team Lead, by command, never by a developer and never by hand.

## The design reference

Rendered once, at intake, to `design/<screen>--<state>.png`, with the profile's `render_cmd`.

- **Size.** The viewport is the device's logical size from the profile (`393 x 852` for a phone that reports that). The capture is logical size times the device scale. The reference need not match the capture's pixel count, only its logical size and aspect: `design-qa` compares them side by side, it does not overlay them.
- **First viewport only.** A state whose content runs below the fold is flagged `scroll` at intake, and each scroll position worth judging becomes its own row (`<state>-scrolled`). What is not a row is not judged, and is listed under `Not proven`.
- **Themes.** A design drawn in light and dark is two rows per state. Render each with the renderer's colour-scheme option, never by editing the handoff.
- **The handoff is never modified.** Render from a copy when a state needs a query or a class toggled to show.
- **No renderer.** Use the handoff's exported image for the state, and say in the proof that the reference is the designer's export, not a fresh render.

## The build capture

Through the state harness (`build.md` §Foundation), for one state:

1. `open_state_cmd` with `{screen}` and `{state}`.
2. Wait until stable (§Stable).
3. `screenshot_cmd` to `evidence/captures/<round>/<screen>--<state>.png`.
4. Append one line to `evidence/captures/<round>/index.md`: key, the run branch SHA, the exact two commands, the device identifier, stable or `animated`, the PNG's size.

A capture with no line in `index.md` does not exist, as far as QA and the review page are concerned.

## Pinned settings

Set once when the slot is taken, never between two captures of the same round:

- appearance, per the state's theme
- the status bar override
- text size and language at the device defaults, unless the row says otherwise

Commands: `../scruffy-bug/references/platforms/ios.md` §Pin settings, `../scruffy-bug/references/platforms/android.md` §Pin settings. Record the values at the top of `index.md`.

## Stable

Two screenshots one second apart, byte-identical → stable. Repeat up to 15 seconds. Still changing → `UNSTABLE`: the state is not judged this round, and the cause is nearly always an animation, a clock or a network call the fixture should have removed, which is a harness defect and goes back as one.

A row flagged `animated` (a spinner, a running timer) skips the check: one capture after a fixed two-second wait, labelled `animated` in `index.md`. `design-qa` is told, and judges layout and content, not the frame.

## Right screen, right build

Before any capture of a round:

- the launched app is running the run branch's head. Record the SHA; for a stack with a dev server, the server must have been started from the run branch's worktree, and a native rebuild is done whenever a merge touched native code or dependencies.
- the harness answers: open the component sheet and check the screenshot is not the app's start screen (compare with the preflight screenshot; identical means the deep link did nothing).

A state whose capture is byte-identical to another state's capture of the same screen is flagged `SAME AS <state>` in `index.md`: usually the harness ignored the state name. It goes to QA flagged, never silently.

## The slot

One device, one slot. Whoever holds it has the device, the installed app and the dev server to itself, from pinning the settings until the last capture of the batch.

- Only the Team Lead takes it. Developers and `design-qa` never touch the device.
- Captures are batched per round for exactly this reason: one take, every pending state, one release.
- A second design run, or any other Scruffy run doing device work on the same machine, waits or boots its own device; it never shares this one (`../scruffy-bug/references/models.md` §Concurrency and the build slot).

## When it fails

Device gone, app crashed on launch, deep link refused, screenshot empty or the wrong size: a **process failure**. No retry loop. One attempt to restore (relaunch, re-pin), then the round ends, the failing command and its output are written to `evidence/`, and the states not captured are reported as not captured. They are never marked as gaps: a developer cannot fix a screenshot that was never taken.
