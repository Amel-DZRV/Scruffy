# Functional probes

Facts only. Reasoning lives in `SKILL.md`.

## Expectations come first

Before the first tap of a run, every interactive element in scope has a written expectation in the frame recipe's `## Expect` block. Sources, in order:

1. **The spec document** beside the export — Relentless: `docs/Design/Training_Screens_Prompt.md` ("Tapping one opens §10", "each row reverts in one tap").
2. **A sibling frame** that shows the result — the "Program actions" frame is what tapping `⋯` on "Dated · active program" produces.
3. **The frame's note** in the export.
4. **The route table** — an Expo Router `href` says where a link goes, which is a destination, not a behaviour. Good enough for "opens Programs"; not for "starts a session with six exercises".

Never the component's own `onPress`: reading what the code does and calling it the expectation makes every probe pass. No source → the intake gate.

## Which elements

Every element in `app.tree.json` that is a `Button`, is `clickable`, `checkable`, or a text field, and sits inside a component the comparison matched. Plus anything the mock draws as a control (a chevron, a `⋯`, a toggle) that the tree does **not** list as interactive — that absence is itself a finding (`not exposed as a control`), usually a missing `accessibilityRole`.

## Probe by role

| Role | Action | Pass when |
|---|---|---|
| navigation (button, row, link) | tap by label | within 3 s the tree shows the expected screen's heading or gate label; back returns to this frame's heading |
| disclosure (accordion, `⋯`, drawer handle) | tap | the expected children appear in the tree; tap again → they are gone |
| toggle, checkbox, segmented | tap | `checked` / `selected` flips; the label or value the spec names changes; tap again restores |
| text field | type a short value | the value is in the field's `text`; any live consequence the spec names (search results, validation) appears |
| stepper, number entry | increment once | the shown number changes by the spec's step |
| scroll container | swipe up one screen | new labels appear; nothing that should stay fixed (header, tab bar) moved |
| disabled control | tap | nothing changes, and the mock also shows it disabled |

Tap by the element's label, resolved from a fresh tree — mobile-mcp `mobile_click_on_screen_at_coordinates` at the element's centre, or `adb shell input tap`. Never a coordinate copied from an earlier tree.

After every probe: the crash check from the platform file. A crash, a red error screen, or an `ERROR` in the Metro log fails the probe whatever the screen shows.

**Return to the frame's state** before the next probe: back, or replay the recipe. A probe whose element is gone after returning means the state did not restore — re-run the recipe, and if that fails, the row is a process failure, not a FAIL.

## Probes that change data

Starting a workout, finishing a set, deleting, archiving, reverting a change. Marked `mutates` in `## Expect`. They run only if the intake gate allowed them on this device, after every non-mutating probe of the round, and never on a device holding data Amel cares about.

## The probe file

`evidence/probes/<round>/<platform>/<key>.json`:

```json
{ "key": "android.f4.c18", "element": "Programs & Workouts", "role": "navigation",
  "expect": "opens Programs & Workouts (heading 'Programs & Workouts', close button top-left)",
  "source": "Training_Screens_Prompt.md §1",
  "observed": "heading 'Programs & Workouts' within 0.8 s; back returned to 'NO ACTIVE PROGRAM'",
  "crash": "none", "result": "PASS",
  "fingerprint": "<audit-check.mjs --fingerprint at probe time>" }
```

`result` is `PASS` or `FAIL: <what was observed instead>`. The hook compares `fingerprint` to the code now.
