# Task 03 — The path library

**Goal:** Navigation recipes have a fixed format, a permanent home in Scruffy, a lifecycle (recorded, fresh, stale), and rules for who writes them. This is the self-learning half of the design: data that replay verifies, not prose that needs approval.

**Depends on:** task 02 (the agent reads and writes these files; the smoke test fixed the format).

**Files:**
- Create: `scruffy/paths/README.md`
- Create: `scruffy/paths/TEMPLATE.md`
- Modify: `scruffy/references/learning.md` (one new section, "Path recipes")
- Modify: `agents/evidence-capturer.md` (the record-mode step cites `TEMPLATE.md` instead of describing the format inline)

**Interfaces:**
- Consumes: the `PATH STALE` and `record` behaviour from task 02.
- Produces: the lookup rule `scruffy/paths/<repo>/<screen>.md`, the `screen` key convention, and the `status` values `fresh` and `stale`. Task 04's step 3 wiring looks a path up by this rule.

---

## Steps

- [x] **Step 1: Write the template**

`scruffy/paths/TEMPLATE.md`:

```markdown
---
repo: <repo key from references/repo-routing.md: rooblocks | ios | android | doordash-ios>
screen: <kebab-case screen key, e.g. care-home-carousel>
platform: ios | android
device: <model as simctl lists it, e.g. iPhone 17 | adb model>
os: <runtime version, e.g. 26.5>
status: fresh | stale
verified: <YYYY-MM-DD> @ <sha the last successful capture ran on>
stale_reason: <only when stale — the step or gate that failed, verbatim from the agent>
---
## Launch
<repo skill name and arguments, one line, e.g. `sdui-accessibility-manual-test --template care_home`; or `simctl launch <bundle>` / `am start -n <component>`>
## Settings
appearance: light | dark
status_bar: <the exact override flags from platforms/<platform>.md>
locale: <e.g. en_US, only when the symptom depends on it>
## Steps
<one per line, in order; labels only, never coordinates>
tap <label> [role]
wait <label> [timeout seconds]
## Gate
<label> <role>
## Mask
none | <x,y,w,h in screenshot pixels of the component under test>
## Notes
<optional, one or two lines: why the sample app rather than the real flow, a known flake>
```

- [x] **Step 2: Write the README**

`scruffy/paths/README.md`:

```markdown
# Path library

One file per screen, `<repo>/<screen>.md`, in the shape of `TEMPLATE.md`. A path is how the capture agent reaches a screen without Amel.

## Lookup

Bug-eater step 3 and feature-dev step 5 derive `<screen>` from the ticket's component or template name, kebab-cased, and look for `paths/<repo>/<screen>.md`. Not found → `record` mode, batched into the run's handoff list. Found and `status: fresh` → `capture` mode.

## Who writes what

| Event | Written by | Approval |
|---|---|---|
| Gated success in `record` mode | the agent, new file, `status: fresh` | none — the gate verified it |
| Record run with an unresolved tap | the agent, new file, `status: stale`, `stale_reason` naming the transition | none — Amel fills the `tap` line by hand, then sets `fresh` |
| `PATH STALE` from the agent | the caller flips `status: stale`, fills `stale_reason` | none |
| Successful replay of a stale path after a fix to it | the caller sets `fresh`, updates `verified` | none |
| Editing steps by hand | Amel | he is the approval |

Recipes append without approval because a wrong recipe fails its own replay and is marked stale. That is the whole difference between this library and `LEARNED.md`: a rule cannot be replayed, a path can.

## Staleness

A stale path is not deleted. It is the best starting point for re-recording — most staleness is one renamed label, not a new flow. The agent refuses a stale path before the first tap so a bad recipe never costs a build's worth of navigation.

Device or OS mismatch is staleness too. A path recorded on iOS 26.5 is not tried on 27.0; it is `PATH STALE` naming `os`, and the retry records a new file with the new `os`. Keep both; the old one is correct for its runtime.

## Naming

`<screen>` names the screen, not the bug. `care-home-carousel`, not `MOSAIC-3559`. Two bugs on one screen share one path.

## What is not here

Commands. Those live in `bug-eater/references/platforms/`. Repo launch skills. Those live in the repos and are named by `references/repo-routing.md`. A path names a skill; it does not copy it.
```

- [x] **Step 3: Add the learning-reference section**

Insert into `scruffy/references/learning.md`, after "Propose, do not self-append":

```markdown
## Path recipes are the exception

`paths/<repo>/<screen>.md` files append without approval. A recipe is verified by its own replay — a wrong one fails the gate and is marked stale — so the noise argument above does not apply. Lessons *about* captures ("crop to the component", "the sample app hides the real padding") are rules, not recipes: they come in through the PR-comment backfill and go through the propose step like everything else. See `../paths/README.md`.
```

- [x] **Step 4: Point the agent at the template**

In `agents/evidence-capturer.md`, record-mode step: replace the inline format description with "write the path file in the shape of `~/.claude/skills/scruffy/paths/TEMPLATE.md`, every field filled." Keep the sentence about which values go where.

- [x] **Step 5: Structural test**

```bash
test -f scruffy/paths/TEMPLATE.md && test -f scruffy/paths/README.md && echo ok
grep -n '^## Path recipes' scruffy/references/learning.md
grep -n 'TEMPLATE.md' agents/evidence-capturer.md
for s in Launch Settings Steps Gate Mask; do grep -q "^## $s" scruffy/paths/TEMPLATE.md || echo "MISSING $s"; done
```

Expected: `ok`, both greps hit, no `MISSING`.

- [ ] **Step 6: Lifecycle test on the smoke fixture** (deferred to controller)

Re-create the Settings smoke setup from task 02 step 3, then:

1. Dispatch in `record` mode with `screen: settings-general`. Expected: `~/.claude/skills/scruffy/paths/smoke/settings-general.md` exists, matches the template section for section, `status: fresh`.
2. Dispatch in `capture` mode with that file. Expected: `CAPTURED`.
3. Edit the file: change `tap General Button` to `tap Generel Button`. Dispatch. Expected: `PATH STALE` naming the step. Flip the file to `status: stale` with `stale_reason` copied from the reply, dispatch again. Expected: `PATH STALE` before any launch output appears in the report (Review Focus 3: refusal precedes navigation).
4. Fix the typo, set `status: fresh`, dispatch. Expected: `CAPTURED`.

Delete `~/.claude/skills/scruffy/paths/smoke/` afterwards.

- [ ] **Step 7: Commit**

```bash
git add scruffy/paths/ scruffy/references/learning.md agents/evidence-capturer.md
git commit -m "Add path library: template, lifecycle rules, learning exception"
```

## What to expect when this task is done

- A stranger can write a path file from the template and know where it goes.
- The agent records, refuses stale, and resumes after a hand fix, all proven on Settings.
- The learning reference explains in one paragraph why recipes skip approval and lessons do not. If that paragraph does not convince you on reading, the design is wrong and this is the moment to say so.
