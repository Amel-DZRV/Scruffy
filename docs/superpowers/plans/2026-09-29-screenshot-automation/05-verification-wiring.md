# Task 05 — Verification wiring

**Goal:** The proof engine treats a verified pair as a claim with a row in the proof block, assigns captures to the agent, and demotes a UI diff without a pair to `PROOF INCOMPLETE`. The `proof-auditor` checks the pair exists and matches; it does not take the caller's word.

**Depends on:** tasks 02 and 04 (statuses; `ui-touch.sh`).

**Files:**
- Modify: `verification/SKILL.md` — "Who runs what" table, 1c claim 4, the proof block template, the verdict table
- Modify: `agents/proof-auditor.md` — packet table gains two fields, procedure gains one step

**Interfaces:**
- Consumes: `evidence/capture-before.md`, `evidence/capture-after.md`, `capture-*.png`, `pair-diff.py`, `ui-touch.sh`.
- Produces: the proof block row `| Reviewer evidence | ... |` and the packet fields `captures` and `ui_touch`. Task 06 updates the models table to match.

---

## Steps

- [x] **Step 1: Who runs what**

In `verification/SKILL.md`, replace the row `| Reviewer evidence (captures) | caller | device work |` with:

```markdown
| Reviewer evidence (captures) | **`evidence-capturer` agent**, dispatched by the main thread twice — before at the lane's step 3, after at 1c | gated on the tree and the installed binary; identical packets except the SHA, so the pair differs only by the diff |
| Pair diff, UI-touch decision | `proof-auditor` | the auditor runs `pair-diff.py` and `ui-touch.sh` itself; a pass reported by the caller is not a pass |
```

Add to the "Dispatching the auditor" paragraph's packet list: "the two capture reports and images when a pair was taken, and the `ui-touch.sh` output for `parent..head`".

- [x] **Step 2: Claim 4 in 1c**

Replace the **4. Reviewer evidence, where the change is visual.** paragraph with:

```markdown
**4. Reviewer evidence, where the diff touches UI.**

`ui-touch.sh <repo> <parent> <head>` decides, mechanically, whether a pair is owed. `NON-UI` → this claim reads `not applicable — NON-UI` and nothing else. `UI` → all of the following, or the claim fails:

- `evidence/capture-before.md` and `capture-after.md` exist, each with the three-line header, `build_identity: match`, and the same gate element.
- The before header's SHA is `parent`; the after header's SHA is `head`.
- `pair-diff.py capture-before.png capture-after.png --mask <mask from the after report, or none>` exits 0 — the script treats `none` as no mask; the status bar is always masked by the script, so `masked=1` with `mask: none` is expected.

A pair cannot fail in the sense the red test can — it does not assert the symptom — and it is still not proof. It is what gets the PR approved, which is a different and equally real goal. But a *missing* pair on a UI diff is a gap the reviewer will hit first, so it is `Not proven` material and demotes the verdict.
```

- [x] **Step 3: Proof block row**

In the proof block template, add one row after `Revert check`:

```markdown
| Reviewer evidence | `capture-before.png` @ `<parent sha>`, `capture-after.png` @ `<head sha>`, gate `<label role>`, pair-diff `changed=<f>` exit 0 — or `not applicable — NON-UI` — or `MISSING: <status the agent returned>` |
```

Add to the rules list: "A `MISSING` cell in the Reviewer evidence row is repeated on the `Not proven` line."

- [x] **Step 4: Verdict table**

- MERGE-READY criteria: append "Reviewer evidence row is a pair or `not applicable`".
- PROOF INCOMPLETE: append "a `UI` diff with a `MISSING` Reviewer evidence row".
- Below the table add: "**A UI diff without a verified pair cannot be MERGE-READY.** This is a gate, not a reminder — an agent that forgot to capture cannot talk its way past a row that reads `MISSING`."

- [x] **Step 5: Auditor packet and procedure**

In `agents/proof-auditor.md`:

Packet table, two rows:

```markdown
| `ui_touch` | output of `bug-eater/scripts/ui-touch.sh <repo> <parent> <head>` — or run it yourself if absent |
| `captures` | paths of `capture-before.md`, `capture-after.md` and their PNGs; absent when the lane took none |
```

Procedure, new step 8 (renumber feature-mode to 9):

```markdown
8. **Reviewer evidence.** Run `ui-touch.sh` yourself; when the packet supplies `ui_touch`, compare — disagreement is a finding. When absent, your run is the value. On `UI`: open both capture reports, check `build_identity: match`, the SHAs against `parent` and `head`, the same gate element in both, then run `pair-diff.py` with the after report's mask — pass the after report's `mask:` value verbatim; `none` is accepted, and the status bar is always masked by the script, so `masked=1` with `mask: none` is expected. Fill the Reviewer evidence row from what you ran. Never from the caller's summary.
```

- [x] **Step 6: Structural test**

```bash
grep -n 'evidence-capturer' verification/SKILL.md | wc -l
grep -n '| Reviewer evidence |' verification/SKILL.md
grep -n 'cannot be MERGE-READY' verification/SKILL.md
grep -n 'ui_touch\|captures' agents/proof-auditor.md
grep -n '^[0-9]\. \*\*' agents/proof-auditor.md
```

Expected: at least one hit; the row exists in the template; the gate sentence exists; both new packet fields present; procedure numbers run 1 to 9 without a gap.

- [ ] **Step 7: Behavioural test with a fake dossier** (fixture built; dispatch deferred to controller)

Build a stand-in dossier against this repo (no real app; the point is the auditor's decision logic):

```bash
mkdir -p /tmp/audit-smoke/evidence
# UI diff: create a fake view file in a scratch branch of a throwaway repo
git init /tmp/audit-repo && cd /tmp/audit-repo
mkdir -p Sources && echo 'struct A {}' > Sources/AView.swift && git add -A && git commit -qm parent
echo 'struct A { let padding = 8 }' > Sources/AView.swift && git add -A && git commit -qm head
```

Copy the two Settings captures from task 02 into `/tmp/audit-smoke/evidence/` and edit their headers so before reads the parent SHA and after reads the head SHA. Dispatch `proof-auditor` with `mode: standalone`, this repo, `parent` and `head`, no test, `captures` set. Expected: `ui-touch` reports `UI` (the filename matches `View.*\.swift`); the Reviewer evidence row is filled with the pair and `exit 0`; verdict is not MERGE-READY for the *other* reason (no covering test), and the `Not proven` line does not mention captures.

Then delete `capture-after.md` and dispatch again. Expected: Reviewer evidence row reads `MISSING`, `Not proven` repeats it, verdict `PROOF INCOMPLETE`.

Then rename `AView.swift` to `AModel.swift` in both commits (recreate the repo) and dispatch. Expected: `not applicable — NON-UI`.

- [ ] **Step 8: Commit**

```bash
git add verification/SKILL.md agents/proof-auditor.md
git commit -m "Make the before/after pair a proof-block claim gated on UI-touch"
```

## What to expect when this task is done

- The auditor decides UI or not, checks the pair, and fills the row from its own commands.
- A UI diff with no pair is `PROOF INCOMPLETE` by table, not by judgement.
- A NON-UI diff costs nothing extra and says so in one cell.
