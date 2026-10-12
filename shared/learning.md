# Learning — read first, write last

The workflow gets faster by remembering what it did. Three kinds of memory, one place (`../memory/`), versioned with the skill.

| Kind | Where | Holds | Written | Approval |
|---|---|---|---|---|
| **Recipe** | `memory/<repo>/recipes/<name>.md` | a procedure that worked: command sequence, median duration, the trap that bit and the workaround | by the retro, at close-out | automatic — a recipe is verifiable by running it |
| **Path** | `memory/<repo>/paths/<screen>.md` | navigation to a screen (`../memory/README-paths.md`) | by `evidence-capturer` record mode; repaired on stale | automatic |
| **Rule** | `memory/rules.md` | a judgment correction — a PR comment generalised, a decision Amel overruled | proposed at close-out and at watch ticks | **Amel approves** |

The feature lane's `memory/global/<role>.md` is a fourth kind, role judgment, with its own write path (the council). Project facts for repos Amel does not own go under `memory/<repo>/recipes/` too.

## Precedence

**A repo's own skill wins over a recipe.** A recipe that contradicts the skill it was `derived_from` is not followed: the step runs as the skill says, the contradiction goes into the recipe's `## Traps`, and the retro surfaces it. A recipe is a cache of the skill, not a replacement.

## Read — at every run's start

1. `../memory/rules.md`.
2. Every `memory/<repo>/recipes/*.md` with `status: fresh` for each routed repo.
3. A step with a matching recipe announces it — `▶ … following recipe build-consumer-sim (median 31 min)` — follows it, times it, and opens the `derived_from` skill only on a trap. Opening the skill means checking the recipe against it: where they disagree, the skill wins.

## Write — the retro, at close-out

A cheap pass (Haiku, strict output contract: one line per finding, `kind | target file | change`) over `state.md` and `evidence/`:

| Observed | Write |
|---|---|
| a step succeeded with no recipe | a new recipe from what was actually run, `runs: 1` |
| a step followed a recipe and deviated — retry, different command, new trap | append to `## Traps`, bump `runs`, recompute `median_minutes` |
| a step took > 1.5× its recipe's median | note in `## Traps`; three in a row → `status: stale` |
| a recipe contradicted its skill | `## Traps` line naming the skill and the disagreement; shown to Amel |
| a PR comment, an overruled stop, a derivation defect at integration | a candidate rule in `rules.md` format, **shown to Amel** before writing |

Recipes and paths are committed to this repo at close-out alongside the tracker comment (`pr.md` §Paths and recipes). Rules wait.

## Rule format

Unchanged from the bug lane (`../scruffy-bug/references/learning.md` §Format): dated headline that is the *general* rule; `**He said:**` verbatim or `**Context:**`; `**So:**` imperative. The test for a rule: could a future run be judged on whether it followed it? Lessons about captures ("crop to the component") are rules, not paths.

## Measuring

Ledger columns `recipe_hits` (steps that followed a recipe) and `minutes_saved` (Σ `median − actual` on those steps; negative when slower). After ten rows the curve is readable.
