# Scruffy — one entry point for bugs and features

Date: 2026-10-12. Status: design, revised after a full read of Taimi, not yet built.

## 1. What changes

Scruffy becomes the single workflow Amel invokes for engineering work. `/scruffy <input>` takes a Jira ticket, GitHub issue, TickTick task, Slack thread or plain text, decides whether it is a bug or a feature, interviews him for what is missing, and hands off to the matching lane. Taimi, the feature workflow, moves into this repo whole; the name Taimi is freed for Amel's personal assistant OS, which will call Scruffy as its hands.

Four things are new on top of the current bug workflow:

1. **Reproduce before investigate.** A UI bug is screenshotted on clean main before any investigator runs. The screenshot is the gate into investigation, not a side artefact of it.
2. **Team Lead at implementation.** The main thread always takes the Team Lead role once a plan exists. Simple fix → it implements itself. Multi-track plan → parallel developer subagents in worktrees, Taimi's orchestration.
3. **Watch mode.** `/scruffy watch <pr>` monitors an opened PR: bot comments are fixed and committed locally, human comments get a drafted reply in Amel's voice, nothing is pushed or posted without his word.
4. **A learning layer.** Recipes (procedures), paths (navigation) and rules (judgment), read at the start of every run and written at its end, so the workflow gets faster with use.

The two lanes keep their own proof engines. The bug lane proves a symptom with one red test and four claims; the feature lane proves acceptance criteria with one red test each and twelve claims. They share the proof-block shape, the verdict tiers, and the three scripts — not the engine.

## 2. Repository layout

```
Scruffy/
├── README.md
├── scruffy/                      the dispatcher — the only skill Amel types
│   ├── SKILL.md                  intake → classify → interview → lane; `watch` mode
│   └── references/
│       ├── intake.md             sources, whole-field reads, bug-vs-feature test
│       ├── interview.md          bug checklist, confidence rule, feature hand-off
│       └── watch.md              PR monitoring: bots, humans, loop, exits
├── scruffy-bug/                  the bug lane (today's scruffy/, reorganised)
│   ├── SKILL.md                  steps 1–10
│   ├── references/               dossier, models, preflight, repo-routing, ticktick, worktrees, apps, platforms/
│   └── scripts/                  goal-check.sh, pair-diff.py, tree-diff.py, ui-touch.sh, publish-evidence.sh
├── scruffy-feature/              Taimi, copied whole, renamed per §9
│   ├── SKILL.md                  Taimi's driver
│   ├── DESIGN.md, ROLES.md       (was taimi_roles.md)
│   ├── roles/<role>/             19 roles, persona / skills / tools
│   ├── memory/global/<role>.md   judgment memory per role
│   ├── mechanisms/council/RUNNER.md
│   ├── mechanisms/pipeline/      RUNNER.md, references/{verification,worktrees,spec-and-plan,pr-format}.md
│   ├── rules/engineering-discipline.md
│   └── scripts/init-project.sh
├── shared/                       read by both lanes; not a skill
│   ├── orchestration.md          Team Lead mechanics: tracks, worktrees, developer packet, integration, fail memo
│   ├── pr.md                     evidence publishing, image verification, ticket comment
│   ├── proof-block.md            the block shape and the three tiers, one copy
│   └── learning.md               the learning layer's contract, §8
├── memory/                       what the workflow has learned — versioned here, §8
│   ├── rules.md                  judgment corrections (was scruffy/LEARNED.md)
│   └── <repo>/
│       ├── recipes/<name>.md     build Consumer for sim, install DevApp, screenshot, pin status bar …
│       └── paths/<screen>.md     recorded navigation (was scruffy/paths/<repo>/)
├── verification/                 the bug lane's proof engine, separately invocable
├── agents/                       proof-auditor, step-reviewer, evidence-capturer, developer
└── docs/superpowers/             specs and plans, history
```

Four skills are installed flat under `~/.claude/skills/`: `scruffy`, `scruffy-bug`, `scruffy-feature`, `verification`. Claude Code discovers skills one level deep, so the lanes cannot nest under the dispatcher. `shared/` and `memory/` are not skills; files reach them relative to their own skill directory (`../shared/…`), which resolves only under a symlink install (§11).

`scruffy-bug` and `scruffy-feature` carry `disable-model-invocation: true`; they are entered only through the dispatcher.

Scripts: `pair-diff.py`, `tree-diff.py`, `ui-touch.sh` are byte-identical in both repos today. One copy, in `scruffy-bug/scripts/`; the feature lane cites that path. `agents/proof-auditor.md` cites `scruffy/scripts/` today and is updated to the new path.

## 3. The dispatcher — `/scruffy`

Input: `$ARGUMENTS`, one or many items, mixed sources. Empty → take them from the conversation. First token `watch` → §7.

### 3.1 Intake

Per item, as today's Setup 2: Jira over the Atlassian MCP, GitHub via `gh`, TickTick per its reference, text as-is. Whole field blocks, never grep for an expected value. Every attachment opened and described into the dossier.

### 3.2 Classify

One question: **is something broken, or is something wanted?**

| Signal | Lane |
|---|---|
| A behaviour that used to work, a crash, a visual defect, a mismatch with a spec that already exists | bug |
| New behaviour, a new screen, a change to what a component promises, debt to remove | feature |
| Someone else's PR to review | neither — `verification` mode 3, invoked directly |

Ambiguous → one question in the interview, with the dispatcher's guess and why. A bug wrapped around a feature request ("the button is missing" when the button was never built) is a feature; say so in one line.

Several items classify independently. Bugs cluster as today (Setup 6); features do not cluster — one feature, one run.

### 3.3 Interview

**The confidence rule.** Ask when the lane cannot proceed without the answer *and* the answer cannot be inferred with confidence. Do not ask what a lookup answers. Do not assume what you are not confident of — a guessed symptom produces a red test for the wrong bug.

Confidence is the test: *would a reviewer reading the PR body's assumption line nod, or ask "where did you get that"?* Nod → infer, state it loudly, and make it the red test's assertion. Ask → interview.

**Bug items.** Checklist in `references/interview.md`: what exactly is wrong, what should happen instead, platform, device and OS, app version or branch, flags and experiment arms, repro steps, the screen or template, a screenshot of the broken state. One message, several turns if needed, closed once; Amel's own asks (record a path, repair a stale one) ride in it. **After it closes, no bug-lane step asks a human anything** except Stop 2. This is today's intake gate with the one-shot constraint relaxed to a conversation.

**Feature items.** The dispatcher asks nothing of its own. Taimi has its own touchpoints — the step-2 ambiguity batch, council disagreements, the go gate — and they are the feature lane's interview. The dispatcher confirms the classification, writes the dossier, and hands off.

Not answerable by Amel and not inferable → `needs info` with `questions.md` ready to paste for the reporter.

### 3.4 Hand off

Write the dossier, then enter the lane by reading its `SKILL.md` and following it. The lane reads the dossier; it does not re-ask what the dossier answers.

**Dossier location, both lanes:** `~/Projects/tickets/<key>/` as the bug lane uses today. The feature lane's `.taimi/<feature-key>/` run dir and `.taimi/ledger.md` are renamed to this; the ledger stays tracked in git at `~/Projects/tickets/LEDGER.md`, one file, with a `lane` column.

## 4. The bug lane — what moves

Today's steps 1–10 stand, with these changes.

### 4.1 Step order

```
1 gather (lookups only; the interview already happened)
2 already dead?
3 reproduce — choose the app, build, navigate, capture the before
4 investigate — 1 or 3 blind chains, ranked
5 red test, watched failing
6 propose (Stop 2, only when the choice is his)
7 plan → Team Lead → implement                        ← §5
8 verify — inline runs, then proof-auditor            ← §6 on failure
9 clean up
10 draft PR                                           ← shared/pr.md
   then: /scruffy watch, if he asks                   ← §7
```

### 4.2 Step 3 — reproduce first

For a UI bug the before-capture is the **gate into step 4**. No investigator runs until `evidence/capture-before.png` exists with a `CAPTURED` report, or the step has named why it cannot (`GATE FAILED`, `NO PATH`, `BUILD MISMATCH`, `PACKET INCOMPLETE`) and the item has gone `blocked`.

Investigators fed a description chase the described symptom; fed a screenshot of the actual screen, they chase the real one. The capture also settles "cannot reproduce" before a strong model is spent.

**Which app to build** — `references/apps.md`:

| Repo | Symptom in | Build |
|---|---|---|
| ios | one Mosaic feature, a component | DevApp with that feature — fastest |
| ios | navigation, deep link, app-level state, anything DevApp cannot host | Consumer |
| rooblocks | a template's rendering | sample app, `sdui-accessibility-manual-test` |
| rooblocks | template-only, no native code touched | Live Preview |
| rooblocks | the Roo consumer app itself | `../doordash-ios` sibling worktree |
| android | component | a sample/devapp target if one exists — a recipe (§8) records the answer after the first run; until then, Consumer |
| pedregal | — | no simulator; stage the graph or sandbox |

The choice goes in `state.md` and the PR's "How to reproduce" section. A recipe for that build, when one exists, is followed and timed.

Non-UI bugs substitute the cheapest falsifiable artefact: a crash log at the reporter's conditions, a failing run, a wrong value printed. Same rule: it exists before step 4 starts.

### 4.3 Steps 1, 2, 4, 5, 6, 9 — unchanged

Gather loses its question-asking and keeps its lookups and discovery. Investigate keeps the cost-class rule for 1 vs 3 chains, entry-point diversification, evidence ranking, no debate. Red test unchanged. Propose unchanged, including the open-PR stop. Clean up unchanged.

### 4.4 Step 7 — Team Lead

§5. "Plan only when it earns one" becomes "the Team Lead always exists; the plan is as long as it needs to be, including one step."

### 4.5 Step 10 — draft PR

The six-section body, the first comment, the proof block in `<details>` stay in the bug lane's SKILL.md. The mechanics — publishing images to the evidence branch, the `PUSH REFUSED` fallback, verifying the images resolve, the ticket comment, the TickTick card move — move to `shared/pr.md`.

## 5. The Team Lead — `shared/orchestration.md`

Taimi's `orchestration.md`, moved and generalised to both lanes. The mechanics are shared; **who wears the hat is per lane.**

### 5.1 Who is the Team Lead

**The main thread, at implementation time.** A subagent cannot start subagents in Claude Code, so a dispatched Team Lead can never fan out — Taimi's own `orchestration.md` concedes this for developers and then dispatches `team-lead-<platform>` anyway. Resolved: the main thread *composes* the Team Lead role — in the feature lane, `roles/team-lead-<platform>/` plus its `memory/global` and project memory, exactly as the runner composes any role's prompt — and acts as it. In the bug lane there is no role file; the main thread is the Team Lead with the dossier and `models.md`.

The model is whatever Amel runs the skill under. `models.md` stands — Opus on escalation, never on schedule.

### 5.2 Preconditions

Before any track runs:

- **Bug lane:** step 5 ended red (test file, hash, test-only SHA all in `state.md`); Stop 2 answered if it fired; `evidence/goal.active` armed.
- **Feature lane:** Taimi's four — Amel's explicit "go", the criteria lock recorded by the Docs-Keeper, the Chief of Engineering's seam sign-off for cross-platform work, every plan step carrying all four fields. A missing one stops the platform `blocked`, naming it.

### 5.3 Always a Team Lead, sometimes a bench

1. **Plan.** `superpowers:writing-plans` into `plan.md`. Every step carries **`what / files / criteria / depends on`** — `criteria` is the red test's name in the bug lane and the acceptance criteria the step delivers in the feature lane; it is what the reviewer checks the step against. A step whose files cannot be named yet is not a step. A one-line fix is a one-step plan.
2. **Derive tracks.** Union-find over `files` and `depends on`, as Taimi. Ambiguous file overlap → same track. One component → serial, in the item's worktree, by the Team Lead itself. Two or more → one developer per track.
3. **Developers.** `agents/developer.md`, Sonnet, dispatched in parallel from the main thread with `isolation: "worktree"`, each branched from the test-only commit (bug) or the platform branch's test commit (feature) so every track sees the red tests and none sees another's edits. Packet is Taimi's developer contract: its steps with all four fields, the spec or chain summary, conventions, test command, cost class. Nothing else from the run. Returns commits, one per step, and a per-step report. Prose without commits is nothing.
4. **Review between steps.** Fresh context, two SHAs and the plan step. Bug lane: `step-reviewer`. Feature lane: `reviewer-<platform>`, composed from its role files. A developer cannot launch either, so the Team Lead runs the reviewer over each returned track's commits in order before integrating. Critical / Important → a fresh developer for that track, counted against **that track's** fix budget of 3.
5. **Scope while building.** In the criteria → build it. In the non-goals → never, however small. Neither → a follow-up ticket, linked, not this PR. Bug lane: "criteria" is the chain's files and the guards along its links; anything else is a ticket.
6. **Integrate.** Smallest track first; red test(s) + full suite after each merge. A failure appearing only after a merge is a track interaction, charged to the merging track. Mechanical conflict → resolve and note; judgement-shaped → `blocked`. Either is a derivation defect, written to the learning layer.
7. **Seam changes** (feature lane) escalate to the Chief of Engineering; never settled locally.
8. **Hand to verification.** The Team Lead never grades.

The Workflow tool is an optional runner for step 3 when Amel opts in for a run. Default is plain parallel `Agent` calls. Taimi's runner ladder is updated to say so.

### 5.4 Builds still queue

Parallel editing, serial building. The build slot semaphore from `models.md` does not widen because work fanned out.

## 6. Verify, and the fail memo

Each lane keeps its own proof engine and auditor:

| | Bug lane | Feature lane |
|---|---|---|
| Engine | `verification/SKILL.md` — 1 red test, 4 claims, revert check | `scruffy-feature/mechanisms/pipeline/references/verification.md` — 1 red test per criterion, 12 claims, criterion table, cross-platform reconciliation |
| Author | main thread, inline | `qa-<platform>` Author mode |
| Auditor | `proof-auditor` agent | `qa-<platform>` Audit mode |
| Shared | `shared/proof-block.md` — block shape, three tiers, `Not proven` line; the three scripts | |

Taimi's `verification.md` is **kept**, not replaced. Its QA modes, scope-drift and criterion claims, and lowest-tier-wins reconciliation have no counterpart in `verification/` and the feature lane needs them. The two files cite `shared/proof-block.md` for the block and tiers so those never drift.

**The fail memo.** On any failed claim the auditor's output is written as `evidence/fail-memo-<track>-<n>.md`:

```
track: <id>          attempt: <n of 3>
claim failed: <number and name>
evidence: <the auditor's row, verbatim>
may not: edit a red test; weaken an assertion; re-run a flaky suite to green
```

The Team Lead reads it, decides which it is — fix attempt, chain / design attempt, process failure — and acts per the existing budgets, **per track**. A fix attempt re-enters §5.3 step 3 with the memo appended to that track's developer packet (evidence, not reasoning, so it is allowed through). Three memos on one track → that track `blocked`, the others finish and integrate, all memos kept. The auditor never sees memos; it re-runs from SHAs each time.

## 7. Watch mode — `/scruffy watch <pr-url | pr-number>`

Started by Amel after a PR opens. Runs as a `/loop` in his session; ends when he stops it, the PR merges or closes.

### 7.1 Each tick

`gh pr view --comments`, `gh pr checks`, review threads via the API. Diff against `watch-state.json` in the dossier. New items classified by author:

| Author | Action |
|---|---|
| Bot — devbot review, Flux, CI / lint, Danger, any `[bot]` login or a login listed in `watch.md` | **Fix.** Make the change in the PR's worktree, run the mechanical layer, run the lane's verification, commit on the local branch with the comment URL in the message. **Do not push.** Report: "2 bot findings fixed, 2 commits ready, say push." A wrong finding gets a drafted reply instead. |
| Human | **Draft.** A reply in his voice per `pr-review-comments` — agree briefly with the fixing SHA when a fix is also drafted, disagree with a reason and an alternative. Post nothing. |
| Check failure | A bot finding on the failing job's log. |
| Approval / merge / close | Report and stop. |

**Cost class governs batching.** Cheap loop: one verified commit per finding. Expensive loop: findings accumulate within a tick and across ticks until Amel says "fix now" or a human comment arrives; then one build, one verified commit, one report. A 35-minute build per lint nit is the failure this rule prevents.

Every tick ends with one line: `◎ watch #1234 — 1 new human comment (draft ready), 2 bot findings queued (expensive loop), checks green`. Quiet ticks are `noop`.

### 7.2 Red lines

- Never push, post, or resolve a thread without his word in that session.
- A bot fix touching a red test's file is refused and reported — the hash is the proof.
- A bot finding that widens the diff beyond the plan's files is a drafted reply, not a fix.

### 7.3 Learning hook

Every human comment is a candidate rule (§8). Every bot finding is a candidate for the clean-up step's checklist.

## 8. The learning layer — `shared/learning.md`, `memory/`

Three kinds of memory, one place, read first and written last.

| Kind | Where | Holds | Written | Approval |
|---|---|---|---|---|
| **Recipe** | `memory/<repo>/recipes/<name>.md` | a procedure that worked: command sequence, expected duration, the trap that bit and the workaround | by the run, at close-out | automatic — verifiable by running it |
| **Path** | `memory/<repo>/paths/<screen>.md` | navigation to a screen, today's format unchanged | by `evidence-capturer` record mode; repaired on stale | automatic |
| **Rule** | `memory/rules.md` | a judgment correction — a PR comment generalised, a decision he overruled | proposed at close-out and at watch ticks | **Amel approves**, as today |

Taimi's `memory/global/<role>.md` is a fourth kind — role judgment — and stays inside `scruffy-feature/` with its own write path (the council writes decisions back; all 19 files are empty stubs today). Taimi's `<project>/memory/projects/<role>.md` stays in the target project **when Amel owns it**; for a repo he does not own, `init-project.sh` is not run and the feature lane reads and writes project facts under `memory/<repo>/recipes/` instead. The council runner's write-back (RUNNER.md:88, :94) follows the same branch.

**Precedence.** A repo's own skill wins over a recipe. A recipe that contradicts the skill it was derived from is not followed; the contradiction is written to its `## Traps` and surfaced in the retro.

### 8.1 Recipe format

```markdown
---
name: build-consumer-sim
repo: ios
app: Consumer
derived_from: ios:.claude/skills/run-doordash-consumer
last_run: 2026-10-12
runs: 4
median_minutes: 31
---
## Steps
1. source ../../.isolation/state/<Stream>.env
2. <exact command>, from <skill>:<section>
## Traps
- zulu-21.jdk path dead → fails silently at ~35 min; check `java -version` under JAVA_HOME first (run 2)
## Check
build-identity file written; `xcrun simctl get_app_container` resolves
```

### 8.2 Read at start

Setup 1 loads `memory/rules.md`, then every recipe under the routed repo. A step with a matching recipe prints `▶ … following recipe build-consumer-sim (median 31 min)` and follows it, reading the skill it was derived from only on a trap.

### 8.3 Write at close-out — the retro

A cheap pass (Haiku, strict contract) over `state.md` and `evidence/`:

- Step succeeded with no recipe → draft one from what was actually run.
- Step followed a recipe and deviated — retry, different command, new trap → update `## Traps`, bump `runs`, recompute the median.
- Step took > 1.5× its median → note; three in a row flag the recipe stale.
- Every PR comment and every overruled decision → a candidate rule, shown to Amel.
- Every derivation defect from §5.3 step 6 → a candidate rule.

Recipes and paths are committed to the Scruffy repo at close-out, alongside the ticket comment. Rules wait for his approval.

### 8.4 Measuring it

Two ledger columns: `recipe_hits` and `minutes_saved` (sum of `median − actual` on recipe steps, negative when slower). Readable after ten rows.

## 9. The feature lane — Taimi, copied and renamed

`scruffy-feature/` is Taimi's repo copied whole. Then one mechanical rename pass and a short list of content edits. Nothing else changes; `DESIGN.md` §9's open items remain open.

### 9.1 Rename pass — mechanical, grep-verified

| Was | Becomes | Where |
|---|---|---|
| `name: taimi`, H1 `# Taimi`, "bugs belong to Scruffy" | `name: scruffy-feature`, `disable-model-invocation: true`, H1 `# Scruffy — feature lane`, "entered via /scruffy" | `SKILL.md:1-7` |
| `argument-hint: "<feature idea \| link> [--project <path>]"` | removed — input arrives from the dispatcher's dossier | `SKILL.md:4` |
| `taimi_roles.md` | `ROLES.md`; every reference to it | root, `SKILL.md:11`, `README.md`, `DESIGN.md` |
| `.taimi/<feature-key>/`, `.taimi/ledger.md`, `taimi/<feature-key>` branch | `~/Projects/tickets/<key>/`, `~/Projects/tickets/LEDGER.md`, `scruffy/<feature-key>` | `SKILL.md:26-31`, `pipeline/RUNNER.md:15-16,102,120`, `.gitignore` |
| `references/pr-format.md` (dead path) | `mechanisms/pipeline/references/pr-format.md` | `SKILL.md:51` |
| `mechanisms/pipeline/scripts/…` | `../scruffy-bug/scripts/…` | `README.md:25,39`, `verification.md:110-117`, `roles/qa-mobile/tools.md:4-6` |
| `mechanisms/pipeline/references/orchestration.md` | `../shared/orchestration.md` | `roles/team-lead-*/skills.md:3`, `pipeline/RUNNER.md:60` |
| "Scruffy's `feature-dev`", "`step-reviewer`", "`LEARNED.md`" | "the bug lane", "`step-reviewer` (bug lane)", "`memory/rules.md`" | ~12 role files incl. `roles/developer/persona.md:23`, `roles/{team-lead-*,*-architect,chief-of-engineering,reviewer-*,qa-mobile}/` |
| "Taimi's `memory/global/…`" | "`memory/global/…`" | `memory/global/*.md` ×19, `scripts/init-project.sh:29` |
| "forked from Scruffy… does not stay in sync" headers | removed | `pipeline/RUNNER.md:3`, `verification.md:3`, `worktrees.md:3`, `orchestration.md:3`, `DESIGN.md:16-19`, `README.md:5,20` |
| "Relentless", "for Relentless, Supabase" | "the project", "e.g. Supabase" | `ROLES.md:21,42`, `roles/backend-architect/tools.md:6` |
| "no role folder exists yet" | removed (stale) | `ROLES.md:5` |
| `ln -sfn "$PWD" ~/.claude/skills/taimi` | the §11 install | `README.md:38` |

Done when `grep -rniE 'taimi|feature-dev|LEARNED\.md|pipeline/scripts|references/orchestration|Relentless' scruffy-feature/` returns only `DESIGN.md`'s history section.

### 9.2 Content edits

1. **Owned vs not-owned repo branch.** The dispatcher records `owned: yes|no` in the dossier (yes for Amel's own projects; no for `ios`, `android`, `rooblocks`, `pedregal`). Where it is `no`:
   - `pipeline/RUNNER.md` step 7: open as **draft**, never enable auto-merge, skip the `auto-merge: wired` check.
   - `pipeline/RUNNER.md` step 6 and `roles/docs-keeper/{persona,tools}.md`: the Docs-Keeper writes to `memory/<repo>/` not Notion; `SKILL.md:24`'s "Notion hub wins" does not apply; `README.md:54` lists Notion as a dependency only for owned projects.
   - `pr-format.md`: sections 3 and 13 (Decisions Log, Docs updated) read "not applicable — repo not owned"; section 17 (Changelog line) is omitted; the body otherwise stands.
   - `SKILL.md` step 12 (weekly build) and `pipeline/RUNNER.md` step 9: skipped.
   - `scripts/init-project.sh`: not run; §8's redirect applies.
2. **Team Lead.** `roles/team-lead-*/tools.md:2` ("spawns Developers") and `pipeline/RUNNER.md:60` ("Dispatch `team-lead-<platform>`") → "the main thread composes this role and acts as it; it dispatches Developers" (§5.1). `orchestration.md:36-45` runner ladder → plain parallel `Agent` first, Workflow on opt-in.
3. **`verification.md` and `worktrees.md` are kept** in the lane. Both cite `shared/proof-block.md` for the block and tiers. `worktrees.md` keeps its platform-branch and track-worktree naming and its keep/remove rules.
4. **Fail memo** (§6) added to `pipeline/RUNNER.md` step 5 where it says "The Team Lead decides what a failed claim is."
5. **Feature-lane terminal states** gain nothing; Taimi's `already exists` is kept and listed in §10.

### 9.3 Noted, not fixed

`pr-format.md:3` is still "awaiting Amel's confirmation". `memory/global/*.md` are empty stubs. The external skill repos in `roles/*/skills.md` (`phuryn/pm-skills`, `deanpeters/Product-Manager-Skills`, `anthropics/skills`) are dependencies the harness check at "Before anything runs" step 4 must name when absent. Claude Design in `roles/designer/tools.md:3` likewise.

## 10. Terminal states, proof, agents

Bug lane unchanged: `PR opened`, `recommend close`, `needs info`, `decision needed`, `blocked`, `deferred`. Feature lane as Taimi: `PR opened`, `needs info`, `decision needed`, `already exists`, `blocked`. Both: three tiers from `shared/proof-block.md`.

Agents under `agents/`: `proof-auditor`, `step-reviewer`, `evidence-capturer` (bug lane); `developer` (both lanes — Sonnet; Read, Edit, Write, Bash, Grep, Glob; receives only its packet; returns commits). Feature-lane roles (`reviewer-<platform>`, `qa-<platform>`, the council, the Chief, the architects, the Docs-Keeper) stay as role folders composed by the runners, not installed agents.

`watch` adds `+ watching` as a post-terminal annotation in the ledger, not a new state.

## 11. Install

```bash
mkdir -p ~/.claude/skills ~/.claude/agents
for s in scruffy scruffy-bug scruffy-feature verification; do ln -sfn "$PWD/$s" ~/.claude/skills/$s; done
cp agents/*.md ~/.claude/agents/
chmod +x scruffy-bug/scripts/*.sh scruffy-bug/scripts/*.py scruffy-feature/scripts/*
```

Symlink only. `../shared/` and `../memory/` resolve through the links, and recipes and paths are written back through them. The README does not offer a copy install.

Remove: `~/.claude/skills/{bug-eater,feature-dev,screen-audit,taimi}`, and the old `scruffy` link's target. The Taimi repo is deleted once this is on GitHub; `scruffy-feature/DESIGN.md` is its record.

## 12. Out of scope

- Web repos.
- The Team Lead or watch loop as a cloud routine; both live in Amel's session.
- Learning from repos not routed in `repo-routing.md`.
- Shared verification between the two lanes, or with the future Taimi OS. Taimi OS calls `/scruffy`.

## 13. Build order

Each step leaves the repo installable.

0. Copy Taimi into `scruffy-feature/`; run the §9.1 rename pass; grep clean.
1. Layout move: `scruffy/` → `scruffy-bug/`; dispatcher skeleton; `shared/`, `memory/` with `rules.md` and paths relocated; `proof-auditor.md` path fix; README; install lines.
2. `shared/proof-block.md` extracted from `verification/SKILL.md`; both engines cite it.
3. Dispatcher: intake, classify, interview, hand-off, `owned` flag, dossier location.
4. `shared/orchestration.md` and `agents/developer.md`; §9.2 edits 2–4 applied to the feature lane.
5. Bug lane: step 3 reproduce-first and `apps.md`; step 7 Team Lead; step 8 fail memo; step 10 split to `shared/pr.md`.
6. §9.2 edit 1: the owned/not-owned branch across RUNNER, Docs-Keeper, pr-format.
7. Watch mode.
8. Learning layer: `learning.md`, recipe format, retro pass, precedence rule, ledger columns.
9. Trial run on one real bug ticket; `memory/` gets its first recipe.
