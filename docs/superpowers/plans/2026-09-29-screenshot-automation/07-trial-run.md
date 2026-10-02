# Task 07 — Trial on a real screen

**Goal:** The whole mechanism, end to end, on a rooblocks sample-app screen: record once with Amel navigating, replay on the same SHA to a zero diff, then a real before/after on the next UI bug. Whatever breaks becomes the first learned entry.

**Depends on:** tasks 01 to 06 installed under `~/.claude`.

**Files:**
- Create: `scruffy/paths/rooblocks/<screen>.md` (by the agent, in record mode)
- Create: `~/Projects/tickets/<KEY>/evidence/capture-*.{png,md,tree.json}` (dossier, not this repo)
- Possibly modify: `scruffy/LEARNED.md`, `bug-eater/references/platforms/ios.md`, `bug-eater/scripts/ui-touch.sh`

**Interfaces:**
- Consumes: everything. This is the integration test.
- Produces: one committed path file for a real screen, and the first PR whose proof block has a filled Reviewer evidence row.

---

## Part A — Record and replay, no bug yet

- [ ] **Step 1: Pick the screen and stage it**

Amel names a rooblocks template he expects the next bugs to land on (the `care_*` templates are the likely candidates per `repo-routing.md`). From inside the rooblocks clone, source the stream's isolation env and follow `sdui-accessibility-manual-test` up to the point where the sample app is installed on `$SIM_UDID`:

```bash
source ../../.isolation/state/<Stream>.env
echo "$SIM_UDID"
# follow <repo>/.claude/skills/sdui-accessibility-manual-test/SKILL.md through build + install
```

Expected: the sample app installed on the isolation sim, not on the shared iPhone 17 used for the smoke tests. Record `SIM_UDID` and the bundle id in a scratch `state.md`.

- [ ] **Step 2: Write the build identity**

```bash
SHA=$(git rev-parse HEAD)
APP=$(xcrun simctl get_app_container $SIM_UDID <bundle> app)
EXEC=$(/usr/libexec/PlistBuddy -c 'Print :CFBundleExecutable' "$APP/Info.plist")
mkdir -p /tmp/trial/evidence
{ echo "sha: $SHA"; echo "command: shasum -a 256 $APP/$EXEC"; echo "device: $SIM_UDID"; shasum -a 256 "$APP/$EXEC"; } > /tmp/trial/evidence/build-identity-before.txt
```

- [ ] **Step 3: Record**

Dispatch `evidence-capturer` with `mode: record`, `label: before`, `repo: <rooblocks path>`, `sha: $SHA`, `bundle`, `build_identity`, `screen: <kebab name>`, `evidence_dir: /tmp/trial/evidence`, and the gate element Amel names (the component the template renders, as `axe describe-ui` labels it). Amel navigates in the Simulator window.

Expected: `CAPTURED`; `~/.claude/skills/scruffy/paths/rooblocks/<screen>.md` written; `## Steps` reads like the taps he made.

Time it. Write the wall-clock in `state.md`. This is the number the batched handoff costs him per new screen.

- [ ] **Step 4: Replay on the same SHA**

Kill the app (`xcrun simctl terminate $SIM_UDID <bundle>`), copy `build-identity-before.txt` to `build-identity-after.txt`, dispatch with `mode: capture`, `label: after`, the new path file. Then:

```bash
python3 ~/.claude/skills/bug-eater/scripts/pair-diff.py /tmp/trial/evidence/capture-before.png /tmp/trial/evidence/capture-after.png --mask <none first>; echo "exit=$?"
```

Expected: `CAPTURED` with no human input, and `exit=0` with no mask. If `changed=` is small but non-zero, look at where: a clock, a carousel auto-advance, a shimmer. Each of those is a fact for `## Mask` or `## Notes` in the path file, and possibly a new default mask in `pair-diff.py`. Fix the cause, do not raise the threshold.

- [ ] **Step 5: Commit the path**

```bash
cp ~/.claude/skills/scruffy/paths/rooblocks/<screen>.md scruffy/paths/rooblocks/
git add scruffy/paths/rooblocks/
git commit -m "Record first rooblocks capture path: <screen>"
```

## Part B — The first real UI bug

- [ ] **Step 6: Run bug-eater on the next UI ticket for that screen**

`/scruffy fix this bug: <KEY>` as normal. Watch for, and write down:

| Point | Expect |
|---|---|
| Step 1 gather | `ui-touch.sh` is not yet involved; nothing new |
| Step 3 | one dispatch, `CAPTURED`, no handoff to Amel because the path exists |
| Step 4e | red test, unchanged by this work |
| Step 7 claim 4 | second dispatch on the fix build, `CAPTURED`, pair-diff exit 0 with the component mask |
| Proof block | Reviewer evidence row filled by the auditor; verdict unaffected by captures |
| Step 9 | both images inline under the proof block |

- [ ] **Step 7: Negative expectations, checked once**

Before opening the PR, deliberately break one thing and confirm the run responds as the tables say:

- Delete `capture-after.md` and re-dispatch the auditor → `PROOF INCOMPLETE`, `Not proven` names it.
- Restore it. Edit the path file's gate to a wrong label and re-dispatch the capturer → `GATE FAILED` listing top-level labels.

Restore everything and let the run finish.

- [ ] **Step 8: Learn**

For every point in step 6 that did not match, write a `LEARNED.md` entry in the self-observed shape from `references/learning.md`, with the cost. Typical candidates, to be confirmed or struck by the run rather than assumed:

- the sample app's label for the component differs from the template's field name, so `<screen>` derivation needs a lookup table in `paths/README.md`
- the install step in `sdui-accessibility-manual-test` does not leave a single obvious bundle id
- `axe describe-ui` on iOS 26.5 uses different key names than the platform file assumed

Fix the reference or script the entry points at, in the same commit.

- [ ] **Step 9: Commit and reinstall**

```bash
git add -A
git commit -m "Trial run: <KEY> — first proof block with reviewer evidence; learned entries"
cp -r scruffy bug-eater verification feature-dev ~/.claude/skills/ && cp agents/*.md ~/.claude/agents/
```

## What to expect when this task is done

- One screen has a committed path, recorded from Amel navigating once.
- One PR carries a proof block whose Reviewer evidence row was filled by the auditor from its own commands, with two agent-taken images under it.
- The pair outcome for that PR is blank until the next run's preflight backfills it. That first `accepted` or `replaced` is the first real signal on whether the framing is right.
- Android remains marked untested. It is tested the same way, Part A then Part B, on the first Android UI ticket. The Android `adb` and `emulator` install is a preflight finding on that run, not a task here.

## If Part A fails at step 4

A non-zero diff on the same SHA with no mask means the capture is not deterministic, and nothing downstream is worth running until it is. Sources in likely order: status bar override ignored by the sample app, an auto-advancing carousel, a shimmer or skeleton state the stability check let through because the tree does not change while pixels do. The last one is the interesting case: it means the gate needs a pixel-stability check as well as a tree-stability check (two screenshots one second apart, `pair-diff.py` exit 0) before capture. Add it to the agent's step 7 and to the platform file, then rerun step 4.
