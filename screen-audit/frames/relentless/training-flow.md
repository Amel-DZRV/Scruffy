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

## f7 · First run
platform: ios
device: iPhone 13 mini (scruffy), UDID ABE60BA1-3D35-4615-868D-21FE529149D5, iOS 18.5, scale 2.88
theme: light
route: relentless://training/programs
steps:
- (if the "Open in “mobile”?" system sheet appears, tap its Open button by coordinates, about (255, 445) pt; it does NOT always appear, so screenshot first)
- wait "Programs & Workouts" 5s
- wait "Start this program"
state: S1 fresh — pre-built "Full Body 3×" only, no standalone workouts, no sessions. Already there on this device. Data differs from the mock and is not a defect: the app card reads "Undated · 8 sections", "PLACEHOLDER CONTENT — not yet authored…" description, a single "Full Body A · 1 exercise" row (mock: "Undated · 8–12 weeks", three rows of 5 exercises). The programs modal slides over the dashboard; the axe tree still lists the dashboard's nodes behind it (see skill-test-notes).
status: fresh
verified: 2026-10-05 @ ad4e683. Screenshot: scratchpad/recipes/f7.png. Restore: tap Back (the X), lands on the Training dashboard.

### Expect
Sources: S = docs/Design/Training_Screens_Prompt.md; T = docs/tabs/Training.md.
- Back (X, top-left) · navigation · closes the modal; the dashboard heading "NO ACTIVE PROGRAM" is back · source: S §1 "full-screen modal", f4 route · mutates: no
- Archived · navigation · opens the archived-programs view (S names only a quiet "Archived" affordance; destination content unspecified); back returns here · source: S §1 · default — destination unspecified; asked at the gate · mutates: no
- Full Body 3× (program card) · navigation · opens that program's detail (heading "Full Body 3×", the program's sections) · source: S §2 "opened from a row", frame 11/12 · mutates: no · note: card tap is not drawn in f7, destination inferred from S §2
- Start this program · navigation · copies the program into the library, starts it undated with auto_overload on; "What's next" then points at its first workout · source: T §2.3 First run · mutates: yes (ends S1; SKIPPED unless the gate says otherwise)
- Create a program · navigation · opens the program builder at "Step 1 of 5" (frame 15, name + tag, dated/undated); nothing is saved until step 3 · source: S §3, frame 15 · mutates: no (opening only)
- Create a workout · navigation · opens the workout builder, empty (frame 22/27 family) · source: S §4 "used standalone from the library" · mutates: no (opening only, do not save)
- ⋯ on the program card (app only — not drawn in f7) · disclosure · opens program actions (Pause/Resume, Edit, Duplicate, Archive, Delete, auto_overload) as frame 13 shows for a program · source: frame 13 "Program actions" · extra: yes (key ios.f7.x-program-menu) · mutates: no to open, yes for any action. Nothing drawn for pre-built-specific actions; asked at the gate.

## f57 · History — empty
platform: ios
device: iPhone 13 mini (scruffy), UDID ABE60BA1-3D35-4615-868D-21FE529149D5, iOS 18.5, scale 2.88
theme: light
route: relentless://training/history
steps:
- (dismiss the "Open in “mobile”?" sheet if shown, Open at about (255, 445) pt)
- wait "Your sessions land here" 5s
state: no sessions logged — already there (S1). Nothing else assumed.
status: fresh
verified: 2026-10-05 @ ad4e683. Screenshot: scratchpad/recipes/f57.png. Restore: tap Back, lands on the Training dashboard (this recipe was entered from the dashboard).

### Expect
- Back (chevron, top-left; app only — the mock's TopBar draws no back control) · navigation · returns to the screen below, here the Training dashboard (heading "NO ACTIVE PROGRAM") · source: S §11 "See all from the dashboard's Recent sessions", f4 recipe's See all probe · extra: yes (key ios.f57.x-back) · mutates: no
- Session rows (frame 56 draws them; f57 has none) · navigation · tap opens the session summary · source: S §11 "Tapping one opens §10" · expected-DATA: not probeable — no sessions on this device
- Empty card "Your sessions land here" · no interactive element in the mock (non-tappable text) · nothing to probe.

## f30 · No results
platform: ios
device: iPhone 13 mini (scruffy), UDID ABE60BA1-3D35-4615-868D-21FE529149D5, iOS 18.5, scale 2.88
theme: light
route: relentless://training/exercise-picker
steps:
- (dismiss the "Open in “mobile”?" sheet if shown; screenshot first. A blind tap at (255, 445) when no sheet is up opens an exercise row)
- wait "Add exercise" 5s
- tap Search exercises [text field]
- type "chest supported row"
- wait "No exercise called “chest supported row”" 3s
state: no data needed beyond the seeded exercise library; no workout or program context, so the picker is opened with no caller (the mock shows it over a workout builder). The mock's dimmed strip and sheet corners are the caller context; the app opens it full-screen with a grab handle.
status: fresh
verified: 2026-10-05 @ ad4e683. Screenshot: scratchpad/recipes/f30.png. Restore: tap Cancel (top-right), lands on the dashboard. Typing a query writes nothing.

### Expect
- Search exercises · text field · typed value appears in the field; results list empties and the title "No exercise called “<query>”" with "It may not exist yet in your library. Create it and it's added to this workout straight away." appears; muscle/equipment/measurement chips and sort row are hidden, as in the frame · source: S §5, frame 30 · mutates: no
- Cancel · navigation · closes the picker, returns to the caller (the dashboard here) · source: frame 30 top bar, S §5 · mutates: no
- Create new exercise (pinned at bottom, visible with no results) · navigation · opens "New exercise" with Name, Primary muscle, Measurement type, "Create and add" (frame 31); back/Cancel returns without creating · source: S §5, frame 31, frame 30's note "pinned create action is still there" · mutates: no for opening; "Create and add" is yes (not probed)
- Muscle ▾ / Equipment ▾ / Measurement ▾ chips, Most used / Recent / A–Z · not shown in f30 (hidden when there are no results); shown in f29 only · nothing to probe here.

## f16 · Step 3 · empty pattern
platform: ios
device: iPhone 13 mini (scruffy), UDID ABE60BA1-3D35-4615-868D-21FE529149D5, iOS 18.5, scale 2.88
theme: light
route: relentless://training/program-builder, then in step 1 type a program name (the mock's is "Hypertrophy Block"), then advance to step 3 (step 2 left at its defaults, or the "Step 3" / "Pattern" stepper item)
steps:
- wait "Step 1 of 5" 5s
- type a name in the name field
- tap Pattern [step 3 of the stepper]  (this persists a program, see state)
- wait "Step 3 of 5" 5s
state: BLOCKED FOR THIS RUN, NOT REPLAYED. Advancing to step 3 calls createProgramWithSections (reading ProgramBuilderScreen.tsx: goToStep(target>=3) with no programId → ensureProgramCreated; "Save draft" does the same). Steps 1–2 alone are in-memory only, so frame 15 is reachable without writing. Reaching f16 writes a draft program row plus its week sections, which breaks S1 (adds a program to the library, and the Programs frames change). Needs the gate: allow it and delete the draft after, or reset the DB afterwards.
status: stale: not replayed, route not exercised past step 1 (mutating)

### Expect
- Back (chevron) · navigation · leaves the builder · source: default — spec silent; S §3 "steps a user can move back through" · mutates: no
- Save draft (top-right) · navigation/action · saves the program as a draft and stays; "Save as draft and Start are separate, deliberate acts" · source: S §3 point 6, frame 15/16 top bars · mutates: yes
- Stepper (Name · Dates · Pattern · Repeat · Weeks) · navigation · tapping a step goes to that step; the current one is filled, earlier ones show a check · source: S §3 "steps a user can move back through, not a wizard that traps them", frame 16 · mutates: yes for steps 3 and up while no program exists yet (creates it); no for 1–2
- Add from my library · navigation · opens the exercise/workout library to pick a workout, which is copied in ("say so, once, plainly"); returns to step 3 with the workout in the pattern · source: S §3 point 3, frame 16 · mutates: no to open; yes on pick (not probed)
- Create a workout here · navigation · opens the workout builder as a sheet over this screen (frame 27 "Inline from the program builder") · source: S §3 point 3, frame 27 · mutates: no to open; yes on save (not probed)
- Empty card "Add the first workout of the week" · no interactive element · nothing to probe.
