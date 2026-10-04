# Functional probes

Facts only. Reasoning lives in `SKILL.md`.

## Expectations come first

Before the first tap of a run, every interactive element in scope has a written expectation in the frame recipe's `## Expect` block. Sources, in order:

1. **The spec document** beside the export — Relentless: `docs/Design/Training_Screens_Prompt.md` ("Tapping one opens §10", "each row reverts in one tap").
2. **A sibling frame** that shows the result — the "Program actions" frame is what tapping `⋯` on "Dated · active program" produces.
3. **The frame's note** in the export.
4. **The route table** — an Expo Router `href` says where a link goes, which is a destination, not a behaviour. Good enough for "opens Programs"; not for "starts a session with six exercises".

Never the component's own `onPress`: reading what the code does and calling it the expectation makes every probe pass. No source → the intake gate.

**Elements with no counterpart because of device state.** An expectation can be written and still not be probeable: a Recent-sessions accordion on a device with no sessions. Write it in the `## Expect` block as `· expected-DATA: not probeable — <the state that removes it> · source: …`. The ledger row's functional status is `DATA` with that reason; it is not a PASS and the hook accepts it without a probe file.

**App-only controls** (the app has a "See all" the frame does not draw): the expectation's source is the sibling frame that shows that state (the populated frame says what "See all" opens), never the app's own code. The control gets an `extra` ledger row, key `<platform>.f<n>.x-<slug>`, slug in kebab-case (`android.f4.x-see-all`; see SKILL.md → ledger), and its probe file is named by that key. A control no frame shows in any state goes to the intake gate.

## Which elements

Every element with an entry in the frame's `## Expect` block, plus every `Button` (and field) in the tree inside a component the comparison matched. The tree cannot say what is interactive: mobile-mcp lists no `clickable` flag, and a tab item is a plain `View` with `selected` on the active one. So **"not exposed as a control" cannot be proved from the tree** and is not a finding; a mock-drawn chevron, `⋯` or toggle is probed by tapping it, and the result (nothing happened, or the expected thing) is the finding.

**Tabs and destinations the spec leaves unspecified.** The default expectation is: the tapped item's `selected` flips on and the previous one's off, and the screen's heading changes. Write that down as the expectation (`source: default — spec silent`) and record it; a tap that changes neither is a FAIL.

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

**mobile-mcp rules** (each one cost a run something):

- Always tap from a **fresh** `mobile_list_elements_on_screen`. Never tap by an old `@e` ref after any navigation: refs are positional, and the old one lands on whatever is now there (a program preview opened this way).
- Do not use `mobile_batch_commands` for probes. A batch cannot contain a screenshot step, and one that fails may already have executed the steps before the failing one.
- After BACK, wait for the screen to settle (re-list until the heading is back, or ~1 s) before the next tap: a tap during the back animation is silently ignored.

After every probe: the crash check from the platform file. A crash, a red error screen, or an `ERROR` in the Metro log fails the probe whatever the screen shows.

**Return to the frame's state** before the next probe: back, or replay the recipe. A probe whose element is gone after returning means the state did not restore — re-run the recipe, and if that fails, the row is a process failure, not a FAIL.

## Probes that change data

Starting a workout, finishing a set, deleting, archiving, reverting a change. Marked `mutates` in `## Expect`. They run only if the intake gate allowed them on this device, after every non-mutating probe of the round, and never on a device holding data Amel cares about. A probe the gate skipped is a ledger `functional: WAIVED`, satisfied in `accepted.md` by `- <key> :: functional` (or the whole-row key); no other property line satisfies it.

## When to probe

Probes are valid only on the code fingerprint they ran under. Run them in the round you expect to be the last: the first round in audit-only mode, the round after the last fix in fix mode. Earlier rounds record the functional status as `NA` with reason `"not re-probed; probed in the final round"`, never a carried-forward PASS; the hook requires a fresh probe file for any functional PASS.

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
