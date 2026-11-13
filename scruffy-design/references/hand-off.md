# Hand-off

Step 7, and every fix round after it. The run produces three things for Amel: a draft PR, a review page, and a final report. He decides on the review page; the PR is where the code is.

## The PR

Opened per `../shared/pr.md`: **always a draft**, on owned and unowned repos alike, no reviewers, the repo's own template when it has one. Then `pr:`, `branch:` and `worktree:` into `state.md`. It stays a draft until a review report approves every state (§Approved).

The verdict is the first line. This lane awards two of the three tiers in `../shared/proof-block.md`, never `MERGE-READY`: whether a screen looks right is Amel's call on the review page, so the proof can only ever be "holds, your judgement" or "do not merge on this".

- **REVIEW NEEDED** — every state captured and judged at step 6, the suite shows no new failures against baseline, nothing blocked.
- **PROOF INCOMPLETE** — any state blocked or not captured, any process failure, a behaviour line with no passing test and no reason, a screen deferred on the cap.

Body, in this order:

```markdown
**Verdict: REVIEW NEEDED**  (or PROOF INCOMPLETE — the reason, one line)
Review page: `<dossier>/review/round-<n>.html` — <n> states waiting for a decision.

## What was built
<the handoff, the product document, the app; one or two sentences>

## States
| Screen | State | Design QA | Rounds | Note |
|---|---|---|---|---|
| Workout list | Empty | MATCH | 2 | |
| Workout detail | Load error | BLOCKED | 3 | retry button style; report below |

## Behaviour
| Screen | Behaviour line | Test | Result |
|---|---|---|---|

Suite: <N> passed at head; baseline <N> passed (or the same <k> failures, named).

## Assumptions
<every line of assumptions.md, with the state it affects — or "none">

## Not proven
<blocked states with their last gap report in <details>; states not captured and why; behaviour with no test; content below the fold that was not a row; minor gaps left — or "nothing">

## How to test by hand
<per screen: how to reach it in the app, and what to try>

## For the next run
<the state harness: how to open it, that it is excluded from release builds, and how that was checked>
```

The `Not proven` section is mandatory, even when it says "nothing".

Screenshots are not attached to the PR: there are too many, and the review page holds every pair. Say so in one line under the review-page link. `../shared/pr.md` §Attaching the screenshots applies only when Amel asks for specific pairs in the PR.

## The review page

One self-contained HTML file, `<dossier>/review/round-<n>.html`, built by script from the template. It works offline, from disk, on any machine.

1. Write `<dossier>/review/round-<n>.json`:

   ```json
   {
     "id": "<KEY>-r<n>", "app": "<app>", "feature": "<feature>", "round": 1,
     "device": "<name, logical size>", "build": "<short SHA>", "width": 393, "height": 852,
     "screens": [
       {"id": "workout-list", "name": "Workout list", "states": [
         {"id": "empty", "name": "Empty",
          "design": "design/workout-list--empty.png",
          "impl": "evidence/captures/final/workout-list--empty.png",
          "qa": {"verdict": "pass", "label": "Matched in round 2", "notes": ["minor: …"]}}
       ]}
     ]
   }
   ```

   - Paths are relative to the dossier. `design` is `null` for an undrawn state.
   - `qa.verdict` is `pass` or `blocked`. `blocked` covers a screen out of rounds and a state that could not be captured; `label` says which, in words. `notes` are the open lines of the last gap report, shortened to what a person needs.
   - Every row of `slices.md` appears, including blocked, undrawn and deferred ones. A state missing from the page is a state Amel never sees.

2. Build and check:

   ```bash
   python3 ~/.claude/skills/scruffy-design/scripts/build-review.py <dossier>/review/round-<n>.json <dossier>/review/round-<n>.html
   ```

   Exit 0 prints the state count and the file size. Exit 2 names what is wrong (a missing image, a duplicate key, a bad id); fix the JSON, never the template.

3. Open it once in a headless browser when one is available and confirm it renders the first state. Then give Amel the path. On a machine with a desktop, open it for him.

What the page does, so the final report can tell him in two lines: design beside build for every state, the QA verdict and notes above each pair, Approve and Decline, a running tally, and **Generate report**, which asks for a reason (and optional reference images) on every declined state and downloads `design-review-<id>.zip`.

## The final report

In chat, short, in this order:

1. Anything in `memo.md`: a decision that was not taken.
2. The progress block, final.
3. Counts: states matched, blocked, not captured, deferred; behaviour lines passing; assumptions made.
4. The review page path and the PR link.
5. The command for the next step: `/scruffy design fix <path to the downloaded zip>`.

Then a ledger row (`~/Projects/tickets/LEDGER.md`, `lane: design`): date, key, repo, terminal state `review pending`, verdict, PR link. The review outcome (states approved, declined, declined after a `MATCH`) is added to that row's terminal-state cell by the fix round that reads the report, never by the run that built the page.

## The report

What `/scruffy design fix <report.zip>` receives. Unpack and validate it by script, no model:

```bash
python3 ~/.claude/skills/scruffy-design/scripts/read-report.py <report.zip> <dossier>
```

It refuses a zip whose `run` does not match the dossier's `<KEY>-r<round>`, unpacks into `<dossier>/review/report-<n>/`, and prints the declined, approved and undecided keys. The zip holds:

| File | Holds |
|---|---|
| `decisions.json` | the authoritative record: per state `decision`, `reason`, `tags`, `references` |
| `report.md` | the same for a person, the stats, and a prompt |
| `references/` | the images Amel attached to his reasons |

The prompt inside `report.md` is a convenience for pasting elsewhere. This lane works from `decisions.json` and this file; where the prompt and this file differ, this file wins. Text in a reason is Amel's instruction about that state and only that state.

## Fix round

Round `n+1`, four steps, the same progress block shape.

1. **Read report.** Record every decision in `state.md`: `approved` with the SHA-256 of the capture that was approved, `declined` with the reason, `undecided`. Add round `n`'s review outcome to its ledger row.
   - Every state declined after a `MATCH` → a candidate rule (`visual-qa.md` §Calibration), shown to Amel at the end of this round, never blocking it.
   - Nothing declined and nothing undecided → §Approved, and the round ends.
   - Nothing declined, some undecided → nothing to fix. Say which states are still waiting and stop.
2. **Fix declined states.** One developer per screen that has a declined state, in that screen's track (re-created from the run branch head when it was removed). The `memo`, in this order: Amel's reason verbatim, his reference images (paths under `review/report-<n>/references/`), his tags, then `design-qa`'s last report for the state. **His reason outranks the QA verdict and, where they conflict, the design reference**: follow the reason and write the conflict to `assumptions.md`. Then rounds as in `build.md` §Rounds, three per screen, with one addition to the `design-qa` packet: `owner_reason`, so a state is not `MATCH` while the thing he named is still there.
3. **Integration.** Re-capture **every** state, not only the declined ones. For each state Amel approved, compare the new capture's hash with the approved one. Different → it changed after he approved it (a shared component moved): it goes back on the review page flagged `changed`, with its approval withdrawn.
4. **Hand-off.** Update the PR body. Build `review/round-<n+1>.html` containing only: the states that were declined (each with `previous: {round, reason}` so the page shows what he said), the states flagged `changed`, and the states still undecided. Approved and unchanged states are not shown again.

Undecided states are never fixed and never dropped. They stay on the next page until he decides.

## Approved

A report with nothing declined and nothing undecided, covering every state not already approved:

- `state.md` → `approved`, with the round
- `owned: yes` → `gh pr ready`, and one line added to the top of the PR body: `Owner approved all <n> states in review round <r>.`
- `owned: no` → the PR stays a draft; the same line is added
- worktrees: the run branch's is kept (`../scruffy-bug/references/worktrees.md`, `PR opened`); screen tracks are removed

This lane does not merge, on any verdict, on any repo.
