# Council runner

One shared, generic mechanism, built once, used for both the **Product/Business** council and the **Design/Architecture** council. It is parameterized by persona set, never duplicated. It takes role folders as input and hardcodes no specific role.

Amel is the CEO and the final authority. Nothing here lets a council, a synthesis, or the Digital CEO decide for him.

## Input

| Field | Meaning |
|---|---|
| `kind` | `product-business` or `design-architecture`. Names the council in the Decisions Log; changes nothing else in the mechanism. |
| `members` | List of role folders under `roles/`. The persona set. |
| `brief` | What the council is deciding: the idea, the vision to design against, or the question. |
| `project` | Path to the project repo (`repo:` in `state.md`). `owned: yes` → its `memory/projects/` files and Notion hub page. `owned: no` → `../memory/<repo>/` and the repo's own docs. |
| `run_dir` | The feature's dossier, `~/Projects/tickets/<KEY>/`. Council artifacts go in `run_dir/council/<kind>/`. |

### Default persona sets

| `kind` | `members` |
|---|---|
| `product-business` | `product-manager`, `business-manager` |
| `design-architecture` | `designer`, plus the architect of every platform the feature touches. `chief-of-engineering` joins when two or more platforms are touched. |

The Digital CEO is never in `members`. It is handled in step 6.

## Build each member's prompt

For every member, compose, in this order:

1. `roles/<role>/persona.md`
2. `roles/<role>/skills.md`
3. `roles/<role>/tools.md`
4. `rules/engineering-discipline.md`, only for the engineering roles it applies to (Chief of Engineering, Platform Architects)
5. `memory/global/<role>.md`
6. `<project>/memory/projects/<role>.md` (`owned: yes`); `../memory/<repo>/recipes/council-<kind>.md` (`owned: no`)
7. The Notion pages the role's `tools.md` allows it to read for this brief (`owned: yes`), or the repo's own docs and `../memory/<repo>/` (`owned: no`). Project truth, never judgment
8. The brief

Members are separate agents with separate contexts.

## Steps

### 1. Positions, blind

Dispatch every member in parallel, with no view of the others. Each returns:

- **Position**: a recommendation, in one or two sentences.
- **Reasoning**: why, from this role's constraint.
- **Cost and what it forecloses.**
- **What would change its mind.**

Skeptics, not debaters. No consensus round: models converge on the most confidently argued answer rather than the correct one, and agreement between agents feels like strong evidence while being nearly none. Disagreement is the signal worth having.

### 2. Compare

Decide mechanically whether the positions disagree: do the recommendations lead to different builds or different scope, not merely differently worded. Group members into sides by recommendation.

- **No disagreement** → the shared position is the council's outcome. Record it, skip to step 5. It is shown to Amel inside the plan package (`SKILL.md`), not as a separate stop.
- **Disagreement** → step 3.

### 3. Synthesis

Dispatch a synthesis agent in a fresh context. It receives each side's position and reasoning, the brief and the project truth. It does **not** receive the Digital CEO's prediction, member memory, or anything else.

It returns one converged recommendation: a real recommendation that picks a direction, not an averaged blend of the sides. It names what it took from each side and what it dropped.

### 4. Amel decides

Present exactly three things, and nothing else:

1. One side's position and reasoning.
2. The other side's position and reasoning.
3. The synthesis agent's recommendation.

Amel's decision is the **fourth and final input**. He can take a side, take the synthesis, or answer differently. With more than two sides, present each side's position and reasoning, then the synthesis.

A council disagreement is a CEO touchpoint. Several disagreements in one run are batched into one stop.

Until the pairs graduate to autonomy (open item, `DESIGN.md` section 9), every disagreement stops here. No council resolves its own disagreement.

### 5. Lock and write-back

The decision is a lock point. In this order:

1. Write `run_dir/council/<kind>/decision.md`: brief, positions, synthesis, Amel's decision and his reason if he gave one.
2. **Write-back to member memory.** For every member that disagreed, record the decision as a lesson in that member's memory. The goal is to teach the agents how Amel thinks about the product and the company, and for Amel to learn from their reasoning in return.
   - The **decision** is the training signal. The agents' own reasoning is stored as context for it, not as a lesson in its own right.
   - **Propose a split** for each lesson: which part is a durable global-judgment lesson (`memory/global/<role>.md`) and which part is a project-specific fact (`<project>/memory/projects/<role>.md`, or `../memory/<repo>/recipes/council-<kind>.md` when `owned: no`). "Amel prefers a smaller first release over a complete one" is global. "The project gates the AI projection behind Pro" is project truth and goes to Notion through the Docs-Keeper (`owned: yes`; on `owned: no`, to `../memory/<repo>/docs/`), not into either memory file.
   - **Show the split inline**, in the same message that records the decision, for Amel to review and correct afterwards.
   - **It never blocks.** The split rides along with the decision. It is not a stop and never pauses the workflow. A wrong split is corrected after the fact: when Amel corrects it, move the entry between files.
3. **Dispatch the Docs-Keeper** with the decision (no CEO gate).
4. **Digital CEO** logging, step 6.

Memory files are written in the checkouts. This runner does not commit or push them; the run summary lists the changed memory files so they can be committed with the user's usual practice.

### 6. Digital CEO

Phase from `<project>/memory/projects/digital-ceo.md` (`owned: yes`; default phase 1 when `owned: no`) and `memory/global/digital-ceo.md`; default is phase 1.

- **Phase 1, silent observer.** After Amel decides, dispatch the Digital CEO with the council outputs and his decision. It appends the record to its own global memory: what the council proposed, what he chose, and why when he gave a reason. It produces no output the council or Amel sees.
- **Phase 2, visible fourth voice** (only once Amel has switched it on). Before step 4, dispatch the Digital CEO with the brief and the positions; it returns a predicted decision with its reasoning. Store the prediction in `decision.md` **before** Amel's decision is shown to it, show it to Amel as a labeled fourth voice, and after he decides record whether it matched. Its accuracy over time is the thing being measured.
- **Never a tiebreaker in either phase.** It is excluded from the synthesis packet (step 3), and nothing in the mechanism counts its vote.

## Provisional memory entry shape

The memory file format is an open item. Until it is decided, entries appended by this runner are:

```markdown
## <YYYY-MM-DD> — <council kind>: <decision title>
**Decision:** what Amel chose (and his reason, if given).
**Context:** this role's position and reasoning, one short paragraph.
**Lesson:** the durable takeaway, phrased as how Amel decides.
```

Replace this section when the format is decided.
