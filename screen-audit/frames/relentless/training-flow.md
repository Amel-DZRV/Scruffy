---
repo: relentless (C:/dev/Relentless_V2)
export: docs/Design/training-flow/Relentless - Training tab flow.html
platform: android
device: sdk_gphone64_x86_64 (mobile-mcp Pixel_API36 / adb emulator-5554)
os: Android 16
scale: 2.88 (1080 px / 375 dp; density pinned 420 → 461, ≈374.9 dp)
verified: 2026-10-04 @ 88a6945 (the Relentless sha after the run-2 fixes)
---

## f4 · No active program
theme: light
route: relentless:/// (the tabs root). The app was already on the Training tab; if a pushed screen is on top, `relentless:///` is ignored (android.md), so tap the tab instead.
steps:
- wait "NO ACTIVE PROGRAM" 15s
- tap Training [tab]   (only if the heading above is absent)
state: no active program, no logged sessions, no data seeded — already there on this device. The mock additionally shows a name ("Marcus"), a quote, and "Recent sessions · 5" collapsed; the app shows its own greeting, its own day-one quote, and an empty-history card ("Nothing logged yet." + "See all"). Per Amel's pre-answer these are data, not defects.
status: fresh

### Expect
Verified 2026-10-04 @ 88a6945: See all opens heading "Sessions" with the empty-state title "Your sessions land here" (PASS). Nutrition, Stats and Settings tabs: selection flips and the screen changes (Nutrition shows the food log; Stats and Settings show "coming soon" placeholders; Settings shows toggles in the accent). The fourth tab is "Settings" (Amel's decision; the mock's "You" is superseded). The Recent sessions accordion is expected-DATA on a device with no sessions.

Sources: S = docs/Design/Training_Screens_Prompt.md; mock frames = docs/Design/training-flow (screens-*.jsx are the mock's own source, not the app's).

- Start a workout · navigation · opens a live session (mock frame 34/36 "Live session": exercise list with sets, a finish control); back/finish returns to the dashboard · source: S §13 "Start new workout … valid in every state, so the app is never a dead end" + frame 4's band note "Start is valid in every state" · mutates: yes (starts a session; SKIPPED this run per Amel)
- Browse programs · navigation · opens Programs & Workouts, a full-screen modal with heading "Programs & Workouts", close (X) top-left, Programs and Standalone Workouts sections; with no programs, the "First run" layout (frame 7); close returns to this frame · source: S §1 + §13 ("browse programs, or just log a workout"), frame 7 · mutates: no
- Programs & Workouts · navigation · opens the same Programs & Workouts modal as above · source: S §1 ("opened from the one dashboard button"), frame 6/7 · mutates: no
- Recent sessions (mock: collapsed accordion "RECENT SESSIONS · 5" with chevron) · disclosure · tap expands to the session rows (name, weekday, duration); tap again collapses · source: mock's RecentSessions/AccordionList, frames 0–3 · mutates: no. NOT PROBEABLE on this device: the app has no sessions, so the accordion has no counterpart (app shows "Nothing logged yet."). Recorded as expected-DATA, not a probe.
- See all (app only — not drawn in frame 4) · navigation · opens Session history, heading "Sessions", empty state when nothing is logged; back returns to the dashboard · source: S §11 ("See all from the dashboard's Recent sessions"), frame 57 "History — empty" (title "Sessions") · mutates: no. Mock does not draw this element in frame 4 → reported as an extra, not a failing probe.
- Training [tab] · navigation · already selected; tapping it leaves the dashboard unchanged · source: mock frame 4 (Training active) · mutates: no
- Nutrition [tab] · navigation · selects the Nutrition tab and shows the Nutrition screen · source: S line 320 names Nutrition as a tab (out of scope for this session, so its content is not specified) · mutates: no · NO EXPECTATION FOR THE DESTINATION'S CONTENT → asked at the intake gate
- Stats [tab] · navigation · selects the Stats tab and shows the Stats screen · source: same · mutates: no · same gap
- "You" in the mock / "Settings" in the app [tab] · navigation · selects the fourth tab and shows the user/settings screen · source: mock frame 4 labels it "You"; S line 320 calls it "Settings" → THE SPEC AND THE MOCK DISAGREE ON THE LABEL; asked at the intake gate · mutates: no
