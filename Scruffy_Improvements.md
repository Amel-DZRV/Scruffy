# Scruffy improvements

## 2026-10-13 — MOSAIC-3521 (PR doordash/codeless#982): RTL and liquid glass shipped without a test

### What happened

The run produced a correct fix, a falsifiable red test, an independent audit and a REVIEW NEEDED verdict. A reviewer then pointed out two behaviours the diff introduced that no test covered:

1. **RTL.** The fix flips the inset in `resolvedTextPadding` (leading/trailing against the view's layout direction). A left/right mix-up is exactly what the earlier attempt (#423, and rooblocks#10854 before it) hit on its first pass. #982 had no RTL test.
2. **Liquid glass.** The fix zeroes the inset when `liquidGlassStyle` is set, because the glass wrapper already spends the padding. No test pinned it.

A third item, timers inheriting the shift, was already named in the proof as the reason for REVIEW NEEDED. That one worked as designed.

### Why Scruffy did not cover it (my reading of the run, not verified against every transcript)

1. **The red test follows the symptom, not the diff.** Verification claim 2 asks for a test that fails on the *reported* symptom ("padding-left ignored"). The ticket said nothing about RTL, so the test stayed LTR. RTL is a different axis of the same property, and the symptom-first rule cannot surface it.
2. **Nothing asks "which branches did my fix add?"** Claims 1–4 are: red test green, no new suite failures, nothing else moved, UI pair. All four check the reported behaviour or regressions. None checks that each *new behavioural branch* in the diff (the RTL flip, the glass guard, the expand-accessory exclusion) has a test that fails when the branch is wrong. A branch can be correct and unpinned, which is the state #982 was in.
3. **The auditor only judges what it is handed.** By design the `proof-auditor` gets SHAs, commands and hashes, not the reasoning. That removes bias, but it also means it never learns the fix has an RTL branch unless it reads the diff for one. Its packet has no "list the conditionals added by `parent..head` and the test that exercises each" step.
4. **The interview checklist has no locale or direction row.** The bug checklist covers platform, OS, flags, template and screenshot. For a layout or padding bug on a renderer that mirrors on native but not on web, "direction/locale" is a first-class condition. It was never asked or recorded under `assumptions:`.
5. **Prior art was cut off, and the failure modes went with it.** The run was told, correctly, not to look at open PRs on the ticket and to start from the beginning. That is a rule about not copying a solution. It also removed the one source that already knew the trap ("a left/right mix-up on first pass"). Nothing in Scruffy separates "do not reuse their fix" from "after your fix is done, read what went wrong in earlier attempts as a checklist".
6. **Blast radius counted nodes, not behaviours.** The 203 of 6,407 nodes figure measures how many templates are touched. It does not list the behavioural cases (RTL, glass, timer, accessible label, expand accessory) the shared `TextRenderer` path serves. The timer case was caught, and RTL and glass were not, because the list was built by what the code mentioned, not by a fixed set of axes.

### Proposed changes

- **Verification, new claim 1e: "every added branch is pinned."** The auditor lists each new `if`, `guard`, ternary and `switch` arm in `parent..head` under `Sources/`, and names the test that fails if it is inverted. An unpinned branch is a row on `Not proven` and caps the verdict at REVIEW NEEDED. A cheap check is mutation by hand: flip the condition, run the owning tests, expect red.
- **Axes checklist for UI fixes** (recorded in the dossier, one line each, `n/a` allowed with a reason): layout direction (LTR/RTL), liquid glass/wrapper views, dynamic type, accessibility variant of the view, dark mode, the other element kinds sharing the renderer (text, richtext, timer). Any axis the fix touches needs a test, and any axis the fix ignores needs a stated reason.
- **Interview checklist.** Add a row to the bug list for layout bugs: "locale or direction the reporter saw it in; does the property mirror on other platforms?" Infer LTR when the ticket is silent, and write that under `assumptions:`, which then shows up in the PR body.
- **Prior-art step, after the fix.** Keep the rule "do not look for open PRs on the ticket" until the fix and red test exist. Then run a read-only pass over earlier attempts on the same component (closed PRs, archived repos, the knowledge base), and extract only their failure modes into the axes checklist. Record what each one added, not their code.
- **Blast radius output.** Alongside the node count, list the behavioural cases the shared path serves and mark each `tested`, `inherits`, or `decision for reviewer`.
- **Learning loop.** This session's PR comment (the three-item ranking) is a candidate rule per `scruffy-bug/references/learning.md`: *"A fix that adds a direction-dependent or wrapper-dependent branch ships with a test for that branch."*

### What was done about it on #982

Added an RTL test and a liquid-glass test to `TextPaddingTests.swift`. The timer risk is stated in the PR as a reviewer decision.
