---
name: scruffy-bug
description: Scruffy's bug lane. Entered only via /scruffy, which classifies the item, runs the interview and writes the dossier. Takes one bug from gather to a draft PR with proof.
disable-model-invocation: true
---

# Scruffy

**Input:** $ARGUMENTS — one or many items, mixed sources. If empty, take them from the conversation above.

Amel is a cross-platform triage owner on SDUI renderers — Mosaic (DoorDash) and Codeless Components / RooBlocks (Deliveroo) — across repos he does not own. He approves and comments; he does not type code.

Scruffy solves bugs: something is broken and the fix belongs in code. One bug, start to finish. Features are not worked here: the feature lane is reached through `/scruffy`, which classifies each item before it gets here.

**This file owns diagnosis.** Proof belongs to `verification`, which it calls at step 5 and step 8; step 3 pins the conditions that handoff runs under. Preflight, worktrees, the dossier and the ledger are the setup steps below and the files under `references/`.

**Amel stops at most twice.** Everything else you prove.

## What replaced the gates

Old shape: ask him to look at a simulator and say whether the bug is real, then ask again whether it is fixed. That is two ~35-minute builds he has to be present for, and it is why previous runs never finished.

New shape: **a test that fails on exactly what the reporter complained about, then passes.** Plus pasted suite output, snapshot diffs, and before/after captures for anything visual, taken by an agent from a recorded path rather than by him. He reads the PR instead of watching the work.

Never claim a thing is verified without output you can point at.

## The two stops

Both batched across every item in a run. Never one interrupt per bug.

| Stop | When | You are asking |
|---|---|---|
| 1 | Before the lane starts — **the dispatcher's interview** (`../scruffy/references/interview.md`) | Everything the rest of the run needs from a human, in one go: the reporter message, plus anything only Amel can do (recording a screen path) |
| 2 | Before implementing — after the red test is confirmed | Which of two equally correct fixes — only when the choice is his |

A well-specified bug fires neither. If both fire routinely, this file is wrong, not him.

**Commander's intent.** The dispatcher's interview is the only point in the run that drafts a message for a reporter, and the only point that asks a human to do anything. Once it closes, no step — verification included — pauses to ask for anything. What cannot be obtained after the interview degrades to a named gap on the `Not proven` line (`PROOF INCOMPLETE` where the verdict table says so), never to a question. Stop 2 sits before the autonomous handoff, so it does not break this.

## Progress, in the chat

Amel follows a run by reading the conversation, and this workflow has not been proven end to end, so **every step announces itself in chat as plain text, before any tool call for that step and again when it ends.** Not only in `summary.md` — that file is the record, this is the live view.

```
▶ Setup 4/6 — Preflight: checking the toolchain each routed repo asks for
✔ Setup 4/6 done — 7 checks passed, 1 soft warning (axe missing)
▶ MOSAIC-3559 · Step 5/10 — Red test: writing the failing test against the confirmed cause
✔ MOSAIC-3559 · Step 5/10 done — test fails on "icon fires twice"; hash and test-only commit recorded
```

- The run-wide setup steps print the same pair without a key; the item steps carry the item key as a prefix.
- One line to start, one to finish; a step that found nothing or failed says so (`✘ … — could not reproduce, ending blocked`).
- **Say what is being waited on.** A build, a device, a dispatched agent: `… building the parent for the before-capture (expected ~35 min, holding the build slot)`, `… dispatching evidence-capturer (before, iPhone 17)`. A silent wait reads as a hang.
- **During the goal**, start each turn with its progress against the condition — `◎ MOSAIC-3559 · goal 2/3 met — waiting on: after-screenshot comparison` — so the Stop hook's pushback is visible as progress, not as a mystery restart.
- Several items: print the one-line status table whenever an item reaches a terminal state.

## Terminal states

Every item reaches exactly one. **A PR is not the only exit.**

| State | Reached at | Artifact |
|---|---|---|
| `PR opened` | step 10 | branch + draft PR |
| `recommend close` | step 2 | `verdict.md` — merged PR named, red test passing on clean main |
| `needs info` | step 1 exit test, or the dispatcher's interview | `questions.md`, ready to paste as a ticket comment |
| `decision needed` | step 6 or 7 | `memo.md` — what changed, the trade-off, who decides. Also covers "already in flight" (step 6). |
| `blocked` | any step | `blocked.md` with the exact failure |
| `deferred` | Running the items — budget | named in the final table, never started-and-abandoned |

Forcing a PR onto a policy question or an already-fixed ticket is worse than saying so.

---

## Setup 1 — Read what was learned

`../shared/learning.md` first, then `references/learning.md` and `../memory/rules.md`. Past corrections apply before you do anything else.

The ledger backfill and the candidate rules from new PR comments are the dispatcher's (`../scruffy/SKILL.md` Setup 1); they reached Amel in the interview message.

## Setup 2 — Intake

Done by the dispatcher: intake and the bug/feature classification are in `../scruffy/references/intake.md`. Read the dossier's `state.md`, including `## Source text` and `assumptions:`. Step 1's own lookups (duplicates, linked tickets, repo history) read whole field blocks too — never grep a dump for the value you expect.

Someone else's PR handed over to be reviewed, rather than as context for a bug, is `verification`'s review mode (mode 3) — the dispatcher routes it there.

## Setup 3 — Route to a repo

The dispatcher already routed the item (`../scruffy/SKILL.md` Setup 4; `references/repo-routing.md`) and wrote `repo`, `repo_path` and `owned` to `state.md`. Confirm all three are there.

Everything else about a repo — build system, test command, PR template, lint rules, cost class — gather (step 1) discovers. Do not maintain those here; they go stale and the repo is the source of truth.

## Setup 4 — Preflight

**Before anything is spent.** Fan out — every check is cheap, independent, read-only. `references/preflight.md`.

Never start a long build to discover the toolchain is broken. A silent 35-minute failure is the single most expensive thing that can happen in a run.

Any failure blocking an item's evidence routes that item to `blocked` now, with the failing check named. Report the pass/fail table before continuing.

## Setup 5 — Create dossiers

The dispatcher already created the dossier (`references/dossier.md`) and wrote `state.md`. Confirm it exists with `lane`, `repo`, `repo_path`, `owned`, `interview` and `assumptions:` before starting the item.

## Setup 6 — Cluster

**Only when more than one item is in play.** Group any that one fix would close — a shared root cause surfacing as two symptoms, or one crash signature reported twice. One work item, one chain, one PR.

Do this once, with every item's intake and repo in hand. Two bugs sharing a cause and split across separate batches produce two conflicting PRs, which is the whole reason clustering happens here and not inside an item's steps.

## Running the items

Each work item runs steps 1–10 below. Route every helper by model — `references/models.md`. Wrong model is the main way this gets expensive.

**Items run in the main thread, as this skill — never dispatched as subagents.** An item fans out its own helpers (investigators, skeptics, `step-reviewer`, `proof-auditor`) and holds both stops; a subagent can do neither. Parallelism across items comes from the helpers each item fans out, not from wrapping items in agents.

Across items, the run holds the budget, watches for cap exhaustion, and collects terminal states.

**Budget.** Declare it at launch. When what remains will not cover a full run for the next item, that item is `deferred` and named — not started and abandoned halfway. Verification reports what each item cost; use that, do not guess.

**Concurrency.** Everything before a build runs unbounded parallel. Builds and device work pass through the build slot — `references/models.md`.

---

## Step 1 — Gather

Fan out, cheap models, strict output contract. Cheap agents locate and transcribe; they do not summarize.

- The full ticket, every comment
- **Every attachment opened and described in words.** Images and video both. Treat a screenshot as the broken state — that is what it almost always is. Describe it into the dossier ("the icon sits flush against the left edge with no padding") so nothing downstream reopens the file. An attachment plainly showing a *working* state is a flag to surface, not a thing to silently reinterpret. **Download the broken-state screenshot into `evidence/reporter-before.<ext>`** — for a UI bug it is the reporter's own "before", and the fallback when the capture agent cannot produce one.
- **Linked tickets, one hop.** Read them in the same context. Do not walk the graph further.
- The tracker, searched for duplicate reports of the same symptom. Two reports narrow the conditions faster than one.
- Reporter context — engineer, PM, or support. It calibrates how literally to read the symptom.
- Repo fetched, history read around the suspect area
- **Discover how the repo works, rather than assuming.** Platform and language from what is on disk; build and test commands from the build files and the CI config; PR conventions from `.github/PULL_REQUEST_TEMPLATE.md`; lint rules from the tooling config. Record what you found in `state.md` so nothing downstream re-derives it.
- **Establish the cost class here.** Run `verification`'s economics discovery: time one suite run, on the commit the fix will branch from, so it doubles as the baseline (`evidence/baseline.txt`). Record cheap or expensive in `state.md`. Diagnosis depth in step 4 keys off this, so it must exist before step 4 starts.
- What is *not* discoverable — which repo a ticket belongs to, repo-specific launch skills — comes from repo routing (Setup 3) or from Amel.
- **For a UI bug, confirm `state.md` has `path:`** (fresh, stale or missing); the dispatcher already looked it up and the interview resolved it.
- Web search for framework-level symptoms: a crash inside Litho, a Yoga layout behaviour, an OS-version regression

Every claim lands tagged **claim** or **verified**, with its source. Provenance not tracked from here gets reconstructed later, badly, and the chain has to cite `file:line` to a stranger.

**Exit test — can you write these two sentences?**

- What is happening
- What should happen instead

Both writable → proceed. The second is inferred about 80% of the time; **infer it and state the inference loudly** rather than asking. It goes in `summary.md` as an assumption, into the PR body where a reviewer can challenge it, and — the part that makes the guess safe — it becomes the red test's assertion, verbatim, at step 5. A wrong inference then isn't buried in a body sentence; it is the one line of test code the reviewer reads anyway. Asking Amel what correct behaviour looks like on every ticket is a defect — he would have guessed it too.

Neither writable — no description, or a description nobody can parse into a symptom — → `needs info`, questions written ready to paste.

**Hard stop:** gather ends when you can state the symptom in the reporter's conditions, name a suspect area, and give a version or commit range. Past that you are investigating, and that is step 4.

### Stop 1 — the dispatcher's interview

The interview happened in the dispatcher (`../scruffy/references/interview.md`): the reporter checklist, Amel's own asks (recording or repairing a path file), and the confidence rule. **Precondition:** `state.md` holds `interview: closed`. If it does not, stop and say the item must go back through `/scruffy`. After this point no bug-lane step asks a human anything except Stop 2.

## Step 2 — Already dead?

Cheap, early, terminal. On a repo with heavy PR traffic this is a common exit and the cheapest one to reach.

Look for a merged PR whose title or diff plainly names this symptom. This gate is deliberately shallow — it catches the obvious cases and nothing else. The definitive check is the red test in step 5, which will catch what this misses at no extra cost.

**Search open PRs too, not just merged ones.** `gh pr list --search` over the symptom keywords and the suspect files, same call shape. An open PR is the likelier find — the ticket is still open — and the failure mode is worse: a merged fix you miss just costs an investigation, while an in-flight PR you miss costs a duplicate PR filed against a colleague's work on a repo you do not own.

A hit here is a **flag carried forward, not an exit.** Record it in `state.md` and keep going. The chain is cheap, read-only, and it is what makes the comparison useful — you cannot say whether their PR covers the reporter's conditions without knowing what actually causes the symptom. The decision lands at step 6.

**A close recommendation needs proof of the same shape as everything else.** The red test, written and run against clean main, passing without any fix. Naming a merged PR is an argument; a green test on untouched main is proof. Closing someone's ticket wrongly on a repo you do not own is expensive.

Cannot reproduce, and nothing found that would have fixed it → `blocked`, not `recommend close`. Absence of a repro is not absence of a bug — usually it means the reporter had conditions you did not recreate. `blocked.md` names the conditions tried (the ones the interview collected) and the gap. **No second reporter message is drafted here** — the interview already asked for everything; Amel decides whether to go back to the reporter.

## Step 3 — Reproduce

**This is the step that replaced Amel watching a simulator or emulator.** He is not present for it.

**For a UI bug, this step is the gate into step 4. No investigator runs until** `evidence/capture-before.png` exists with a `CAPTURED` report, or this step has named why it cannot (`GATE FAILED`, `NO PATH`, `BUILD MISMATCH`, `PACKET INCOMPLETE`) and the item has gone `blocked`. Investigators fed a description chase the described symptom; fed the actual screen, they chase the real one — and "cannot reproduce" is settled here before a strong model is spent.

**Choose the app first** — `references/apps.md` — and record it in `state.md`. Follow a recipe for that build when `../memory/<repo>/recipes/` has one; otherwise the repo skill, and the retro writes the recipe afterwards.

**Non-UI bugs** (crash, logic, data) substitute the cheapest falsifiable artefact for the screenshot — a crash log at the reporter's conditions, a failing run, a wrong value printed — and it too exists before step 4 starts.

The red test is still written at step 5, against the chain step 4 produces; this step pins conditions, claims the device and captures the before-state.

Pin the conditions before you build:

- **Latest main, always.** Never a release branch, never the reporter's version.
- **Claim a device.** Take one that is not running an app under test, record its identifier in `state.md`, pin the rest of the run to it. All busy → boot a fresh one rather than queue. Commands per platform in `references/platforms/`.
- **Missing device or config is assumed, and the assumption is stated** — in the PR body. "Reported without a device; reproduced on iPhone 17, iOS 26.5" narrows the bug for whoever reads it next. The interview already asked; this is for what the reporter could not say. It is never a new question.

The red test itself is written by `verification` — but **against the surviving chain, which does not exist until step 4.** This step pins the conditions, claims the device, and captures the before-state; the handoff happens at step 5, once step 4 has a top-ranked chain. What this skill owes `verification` then: the symptom in the reporter's words, the suspect area, the conditions pinned here, and the top chain.

**Visual bugs.** Order of preference, cheapest falsifiable assertion first:

- **An existing snapshot suite for that component, if the repo has one.** Check first on Android — Paparazzi is common and good, so an Android visual bug genuinely may have a snapshot path. On iOS this is rare enough that it is worth checking and not worth expecting.
- **The accessibility tree.** When the symptom is an element existing, its label, role, state, or position, the tree gives you a number to assert on — a falsifiable red test where otherwise there would be none. `axe describe-ui` on iOS, `uiautomator dump` on Android.
- **A logic assertion at the seam** — a padding value, an alignment enum, a frame.

Never invent a snapshot suite where none exists. That is separate work and it will get the PR rejected.

**The "before" pair is captured here, on clean main, by the `evidence-capturer` agent.** It is dispatched from the main thread with the packet its file lists — device from `state.md`, the parent SHA, bundle id, the build-identity file written at install, and the path file. The path file was looked up and, if missing or stale, resolved in the dispatcher's interview, so by here it is fresh and this is `capture` mode. A stale path is never re-recorded automatically, because recording over it would destroy the one thing that shows what changed; the interview listed it as `repair path file <path>` for Amel, and a `stale_reason` naming `os` is the one exception (`record` into `<screen>@<os>.md`, also done in the interview).

Same device, same OS, same pinned settings as the "after" — the agent enforces that, and the pair diff at step 8 checks it. That consistency is the point: the before/after pair is the single thing that most reliably gets a PR approved, and a pair that differs by anything other than the diff does not do that job.

**Navigation is the unreliable part, not capture.** A `record` run needs Amel once, on main, and never again for that screen. It happens inside the dispatcher's interview, never mid-run:

- **Batch the asks.** Across a run, one list in the interview — three screens, the launch skill for each, any order. Not one ping per bug.
- **The agent records the path while he navigates**, so the "after" replays without him. That is what removes the two-presence problem this skill exists to remove.
- **After the interview nothing parks and nothing asks.** A capture that fails later is a gap, not a handoff: the pair is not shipped, the row on the proof block reads `MISSING: <status>`, the `Not proven` line repeats it, and the verdict is `PROOF INCOMPLETE`. The reporter's `reporter-before` screenshot still goes in the PR as the "before", labelled as theirs.

Agent statuses and what they mean here: `CAPTURED` → continue. In the interview (record runs): `GATE FAILED` or `NO PATH` → Amel retries the navigation there. After it: `GATE FAILED`, `NO PATH` or `PATH STALE` → flip the path file to stale per `../memory/README-paths.md` (except when the reason is that the file already exists — then nothing is flipped, the file on disk is healthy), record the gap as above, and list `repair path file <path>` or `path exists: repair or rename <path>` in `summary.md` for next time. `BUILD MISMATCH` → process failure, reinstall, dispatch again once; never a retry loop, never a question.

**Where the build identity comes from.** Whoever installs the app writes `evidence/build-identity-<label>.txt` per `references/platforms/<platform>.md`, "Build identity", right after install. The agent re-hashes at capture. Without that file the agent returns `PACKET INCOMPLETE`, which is correct: a screenshot of an unknown build is not evidence. Response: supply the missing field and dispatch again; it is never guessed.

Screenshots are **reviewer evidence, not verification.** They cannot fail. A pair proves nothing to a skeptic — the "before" could be any build, which is exactly why the build-identity check exists. The red test is what proves the fix; the screenshots are what get it approved. Both matter; do not confuse them.

## Step 4 — Investigate

**Entry condition:** step 3's artefact exists, or the item is already `blocked`.

### 4a. Locate, mechanically

Cheap agent, no reasoning. Screen → template → component → renderer file, plus recent commits touching that area. One fact sheet, handed identically to every investigator below — one or three, 4b decides.

This is a lookup, not an insight. Do not spend a strong model on it, and do not make three agents each redo it.

### 4b. Investigators — as many as the loop costs

**The count is the cost class's call, read from `state.md` — never a read on how obvious the bug looks.** "This one is simple" is the rationalization that guts the whole pipeline; the recorded class is a fact, an impression of the bug is not.

- **Cheap loop: one investigator**, on the entry point the gathered evidence favors. A wrong chain costs seconds to disprove — the red test is the judge either way, and the chain-attempt budget (three, unchanged) already bounds the retries.
- **Expensive loop: three, blind**, because a wrong chain there costs a build.

When three run: strong model, **no shared context** — they anchor on each other otherwise and you lose the independence you paid for. Each gets the ticket, the attachment descriptions, the fact sheet, and one entry point:

| Entry point | Starts from |
|---|---|
| Backward from symptom | what rendered wrong; walk up the call path |
| Forward from change | what landed recently near the area; what did it break |
| Sideways from contract | what the spec, config, or template promises; where reality diverges |

**Forward-from-change doesn't have to guess which commit.** When the suspect area has enough history that "recently" spans dozens of commits, bisect instead of reading each by eye — `git bisect` driven by the red test once one exists (step 5), or a linear walk scripted the same way for a symptom that only shows up under the test suite, not a single run. Reasoning about which commit looks suspicious is a guess; a bisection that lands on a commit is a fact the chain can cite by SHA.

Diversify by **entry point, not personality.** A "pessimistic" persona changes tone, not reasoning. Different starting evidence is what actually produces independent chains.

Each returns:

- The chain: cause → link → link → **the symptom the reporter saw**, every link citing `file:line`
- Plain language. No renderer jargon. Its job is to teach the next person to debug this.
- Confidence, and — the field that matters — **what would prove this wrong**

### 4c. Rank by evidence, not by opinion

Order on falsifiable properties:

- Does every link cite code a grep confirms exists?
- Is there an unexplained gap between two links?
- Does it end at the reporter's **exact** symptom, or a nearby one?

Two entry points independently reaching the same cause is real signal — unlike three agents agreeing after a debate. Note it; do not let it override evidence.

**No debate round, and no judge model.** Models converge on the most confidently argued answer, not the correct one, and three agents agreeing feels like strong evidence while being nearly none. Debate rounds also multiply invocations faster than anything else in the run and buy the least.

### 4d. The skeptic pass — verification's, run once

The top chain gets refuted **once, by `verification`'s 1a, at the start of step 5** — two skeptics, each told to prove it wrong, defaulting to refuted when uncertain. Do not run a second pass here as well; the same chain refuted twice by four agents buys nothing the first two did not.

On a **cheap loop there are no skeptics at all** — verification skips 1a and the red test refutes at the same cost, more strictly. On an expensive loop the pass is what stands between a wrong chain and a wasted build.

Both refute → promote hypothesis 2, repeat once. All refuted → `blocked`, both skeptics' reasoning kept.

## Step 5 — Red test

**Nothing hands off to autonomous execution until this step ends.** Closing the interview is not a handoff, and neither is a ranked chain: the red test does not exist yet at either point. The order is fixed — intake → reproduce → investigate → **red test against the confirmed root cause, not the raw symptom** → confirm it is red → only then propose (step 6) and run autonomously (step 7 onward).

Everything in step 4 is a ranked guess — cited, argued, still a guess. The test is the only part that can come back and say no.

Hand off to `verification` here: it runs the skeptic pass when the loop is expensive (4d), then writes the test against the surviving chain, under step 3's pinned conditions and device, and watches it fail on the symptom. The assertion is the expected behaviour from step 1, verbatim. Fails → chain proven, proceed. Does not fail → the chain is wrong regardless of how well it read; drop to the next hypothesis. **Chain-attempt budget: three.** Separate from the fix-attempt budget in step 8 — they do not share, or one exhausts the other.

**Exit test — all of these, or the run does not leave this step:**

- the test file exists, and its hash is in `state.md`
- it was run and **failed on the reporter's symptom** — the failure output is in `evidence/`, and reading its assertion against the symptom confirms it fails for that reason, not a compile error or a missing fixture
- it is committed on its own, before any fix exists, and the test-only SHA is in `state.md`

`chain.md` keeps **all three hypotheses**, not just the winner. The rejected ones and why they lost are what teach the next person, and what you fall back to when the red test refuses to go red. Run `unslop-prose` over it in cleanup mode — a human reads this file later.

Chain attempts exhausted → `blocked`, both skeptics' reasoning (expensive loops) and every attempt's failure output kept.

## Step 6 — Propose

**First: if step 2 flagged an open PR, stop here.** → `decision needed`, and do not implement.

The memo names the PR, its author, its state, and the thing you can only answer now that the chain exists: **does it cover the reporter's conditions, all of them, some, or none?**

Do not build in parallel. Opening a competing PR against a colleague's in-flight work on a repo you do not own is the most expensive social mistake available here, and unlike a wrong fix it is not recoverable by closing the PR — they have already seen it. Stopping costs Amel one memo; the fix is still there to build tomorrow. He also has context this run does not: whether that PR is stalled, or whether its author asked him to take it over. Wait, comment on theirs, or proceed is his call, not yours.

Otherwise:

One paragraph: what changes, where, and the one trade-off that matters. For a cross-platform default mismatch, say which platform moves and why.

**Default: fix at the source.** The correct fix at the real cause, even outside the reported component, even in another team's file. Teams are generally happier to review a fix than to write one from scratch, and a PR can always be closed if they disagree. A symptom patch that leaves the cause in place is the more expensive mistake.

Adjacent breakage found along the way → **its own tracker ticket, linked from the PR.** Jira if this one came from Jira; a TickTick-sourced item still gets a Jira or GitHub issue filed for it — TickTick is where Amel's own task lives, not where a reviewer on another team can see follow-up work. Never bundled. Reviewers on a repo you do not own have no patience for scope creep from outside.

### Stop 2

Fires only when two fixes are each defensible and choosing is Amel's call — product behaviour, cross-platform consistency, or ownership. Batched, recommendation beside each. Nothing is approved until he says so.

Escalate to `decision needed` instead of proposing when the fix would be a project rather than a change.

**Provisional triggers, to be corrected by the ledger:**

- **Reversibility over size.** A ten-file change that reverts cleanly is safer than one line changing a shared default fifty components read. Size is a bad proxy; blast radius is the question.
- **Contract vs implementation.** Changing behaviour *inside* a component is a proposal. Changing what a component promises everyone using it is a decision. Nobody objects to an internal fix; everyone objects to a changed default.

When genuinely unsure, **propose it and say what you would have asked.** One extra sentence for him to read, no interrupt, and the ledger records whether the stop was wanted. Ambiguity gets logged, not resolved by a coin flip.

Then log two ledger columns for every proposal: whether stop 2 fired, and what the fix touched — same file / same component / another team's code / a shared contract. After twenty rows the real rule is readable: fired and he answered "obviously do it" → too tight; did not fire and he was surprised at the PR → too loose; fired and he deliberated → correct.

## The goal — autonomous execution from here to the proof

Step 5 produced a confirmed-red test, and Stop 2 (if it fired) is answered. From this point to the end of step 8 nothing asks anyone for anything, and the run does not stop on its own judgement that it is done — a completion condition decides, checked after every turn.

**Claude Code's `/goal` cannot be set by a skill.** It is a command Amel types, a wrapper around a session-scoped Stop hook whose evaluator reads only the transcript and runs nothing itself. Scruffy gets the same behaviour from a Stop hook declared in the dispatcher's frontmatter (`../scruffy/SKILL.md`, active for the whole `/scruffy` invocation, which is how this lane is entered), backed by `scripts/goal-check.sh`: after every turn the script reads what the inline runs wrote under `evidence/`, and either lets the turn end or sends the unmet checks back as the next instruction. (A prompt-type hook was rejected because it never sees the transcript; an agent-type hook because it is experimental and read-only.)

**Arm it** by writing `evidence/goal.active` as the last act of step 6, never earlier — a goal armed during Stop 2 would stop you waiting for him. Three `key=value` lines: `test_file=<path to the red test>`, `success_marker=<regex the platform prints on a pass, e.g. TEST SUCCEEDED>`, `ui=1` when `ui-touch.sh` says `UI`, else `ui=0`.

**The condition**, which you also write into `state.md` and print in chat verbatim:

> The red test `<name>` passes with its original failing assertion and an unchanged file hash; the full suite shows no new failures against baseline; for a UI bug, an after-screenshot has been captured and judged to show the right change against the before-screenshot; or stop after 3 fix attempts.

**What counts is output in this conversation.** Every run that satisfies the condition happens inline, in the main thread, so the real output lands in the transcript — never a subagent's "tests passed". The inline runs for step 8 use this shape, and the script reads the files it writes:

```bash
<test cmd> > evidence/goal-red.log 2>&1; echo $? > evidence/goal-red.exit
<suite cmd> > evidence/goal-suite.log 2>&1; echo $? > evidence/goal-suite.exit
```

then print the tail of each log and the exit file, and write `evidence/goal-suite.delta` (first line `NO NEW FAILURES` or the failure names, compared by name against `evidence/baseline.txt`). A green exit with no success marker in the log is a failure, not a pass.

**Disarm** when step 8 ends: the script removes the marker itself on success and writes `evidence/goal.met`. One track out of fix attempts is only that track `blocked`, memos kept; the goal stays armed and the other tracks continue. Write `evidence/goal.blocked` and `blocked.md`, which lets the turn end, only when every track is blocked or the item ends otherwise. The harness also overrides a Stop hook after eight consecutive blocks without progress. The budget is three fix attempts per track, so one track sits well inside that cap; N tracks can reach 3×N attempts in total, and past eight consecutive no-progress blocks the harness ends the turn, so any track not yet finished is then recorded `blocked` in `blocked.md` as it stands.

**If the hook does not run** (hooks disabled, folder untrusted — `/goal` itself is unavailable in the same cases — or this lane was reached without `/scruffy` being invoked, so the dispatcher's hook never registered): print the condition above as a ready-to-paste `/goal <condition>` line and carry on; the inline-run rule and the `proof-auditor` pass do not depend on the hook.

## Step 7 — Implement

Worktree per item, mandatory — concurrent items may touch the same repo. Create and clean up per `references/worktrees.md`; that file also owns which terminal states keep the worktree and which release it.

**The Team Lead always exists; the bench does not.** From here the main thread is the Team Lead per `../shared/orchestration.md`: write `plan.md` with `what / files / criteria / depends on` per step (one step for a one-line fix), derive tracks, implement serially yourself when there is one track, dispatch `developer` agents in worktrees when there are several, run `step-reviewer` over each step's SHAs, integrate smallest-first, and hand the branch to step 8 without grading it.

**Several tracks:** write `evidence/tracks.pending` before dispatching (and again on each fix-attempt re-dispatch), remove it once every track is integrated or blocked — the goal is armed by now, and the Stop hook stands down while it exists so waiting on developers is not a "GOAL NOT MET" turn.

Review between steps, the developer packet, scope and integration are all in `../shared/orchestration.md`; this file adds only the bug-lane specifics below.

**Fixing at the source doesn't stop at the origin.** The chain in step 4 already names every link between cause and symptom — each one is a place the same class of bug can recur through a different caller, a mock, or a future edit. Where a link is cheap to guard (a validation at a boundary the chain crossed, not a rewrite), add it alongside the fix. This is defense-in-depth, not scope creep: it stays inside the file(s) the chain already touched, and it does not chase problems the chain didn't find.

**Find the repo's conventions before writing a line.** Scruffy carries no language standards of its own — the repo's rules are what the reviewer enforces, and a PR that is stylistically correct by some other standard still gets a review comment. In precedence order:

1. **Enforced tooling** — SwiftLint / SwiftFormat config, ktlint, pre-commit hooks. Non-negotiable; it fails CI.
2. **Written conventions** — `CONTRIBUTING.md`, `CLAUDE.md`, a style doc in the repo.
3. **The surrounding code.** Usually the real answer, and it often differs from what the doc says. Match the file you are editing.

Do this again in step 9, against what actually got written rather than what was intended.

**Move the red test into the repo's suite — before the first fix commit.** It was written to prove a chain, and it may not live where the repo would naturally put it. Relocate it, match the repo's conventions, re-run it red, and let `verification` re-hash and commit it there — so the test-only commit already holds the test in its final home, reading as a regression test someone would have written. Relocating it *after* fix commits exist trips verification's hash check and forces the earned-exception path — re-observed red on the parent, a new test-only commit — which is pure rework for choosing the wrong moment.

**`[DEBUG-*]` probes.** Temporary prints inserted to see what a value actually is at runtime, when reading alone will not settle it:

```swift
print("[DEBUG-onAppear] fired for \(type(of: subview)), count=\(count)")
```

- Investigation and red-test authoring only. **Never in the proposed fix.**
- Always prefixed, so removal is mechanical.
- **Batch them.** A probe costs a full build cycle to read. Adding one means adding every probe you might want from that build.

## Step 8 — Verify

**Produce first, grade second.** The goal's inline runs (see *The goal*) come first, in this thread, so their output is in the conversation and the Stop hook can read their files. Only then hand off to `verification`, which dispatches the `proof-auditor` agent to re-run the claims independently. The goal proves the work was done; the auditor judges it — the writer still never grades itself.

Hand off to `verification`, which dispatches the `proof-auditor` agent with the packet it lists — SHAs, test file and hash, commands, cost class, baseline, the reporter's symptom. **Not `chain.md`, not the plan, not your reasoning.** The model that wrote the fix does not grade it. Four claims, each able to fail:

1. **The red test turns green** — same test, **file re-hashed against the hash recorded at the step 5 handoff.** A mismatch is reported, not absorbed. A red test adjusted during implementation until it passed proves nothing, and that is the easiest thing in this whole workflow to cheat.
2. **No new suite failures against baseline** — the repo's suite, not the changed file's tests, compared against the parent-commit baseline `verification` recorded. Commands and the delta pasted; pass counts, not full logs.
3. **Nothing else moved** — snapshot failures on components you touched are intentional, update the baseline. Failures on components you did not touch → `decision needed`, never auto-updated. A suite re-run to green is `blocked` and flagged flaky, not a pass.
4. **Reviewer evidence** — a UI diff only (`~/.claude/skills/scruffy-bug/scripts/ui-touch.sh <repo> <parent> <head>` decides; `NON-UI` reads `not applicable`). Take the after-capture **inline** by following `agents/evidence-capturer.md`'s procedure in this thread — the same packet as the "before", with only `sha`, `label` and `build_identity` changed, and the same refusals — so the report and image are in the conversation. The `before` was dispatched as an agent at step 3 because it ran before the goal. Then, in order:
   - **Stage one — the hard gate.** `pair-diff.py before after --mask <the after report's mask: line>` — the gate element's frame, in screenshot pixels. Exit 3 means nothing changed inside the mask: **identical, so nothing visibly changed — a failure and a fix attempt**, back to step 7. Exit 1 means the pair differs outside the fix and is not shipped — re-capture once, then `decision needed` with both images attached. Exit 2 is a process failure, never a pass: the row reads `MISSING: size mismatch <bw>x<bh> vs <aw>x<ah>`, `MISSING: mask invalid <value>`, or `MISSING: mask too large <value>`. `mask: none` is valid only for a pair expected to be pixel-identical; a UI fix passes the gate element's frame. A `UI` diff with no `CAPTURED` pair is `PROOF INCOMPLETE`, named on the `Not proven` line.
   - **Stage two — did the right thing change.** Only after stage one exits 0: Read both images (the tool shows them), with the expected-behaviour sentence from step 1 and the mask frame beside them. Judge, in the transcript, in two or three sentences: is the change inside the frame the one the symptom describes, in the direction the expected-behaviour sentence states, and has nothing else visibly moved, clipped or recoloured? Default to FAIL when unsure. A FAIL is a fix attempt. Then write `evidence/goal-ui.status`: `PASS` only when stage one exited 0 **and** stage two passes, else `FAIL: <reason>`. `proof-auditor` repeats stage two on the same images without seeing your reasoning.
   - **Accessibility tree — a secondary signal, never a gate.** `~/.claude/skills/scruffy-bug/scripts/tree-diff.py before.tree after.tree` (the `.tree.json` / `.tree.xml` the capture wrote). Report its `a11y:` line and findings. A tree can look right while the screen is visibly broken, so it neither replaces stage one or two nor changes the verdict; its value is catching what a picture cannot — a lost accessible name, a new unlabelled control, an element that moved.

**Revert check** — revert the diff, confirm the test goes red again — **only when the test is cheap to run.** A package target in seconds: mandatory. A 35-minute app build: skip it. The red failure output from step 5, kept in `evidence/`, already establishes the test failing on code without the fix, provided the file is unchanged. That is what claim 1's hash check and the test-only commit prove.

**Two failure modes, two responses:**

| Mode | Looks like | Response |
|---|---|---|
| Process | build broken, sim gone, suite cannot run | No retry loop — retrying does not fix a dead toolchain. PR opens, proof marked incomplete, failing check named. |
| Solution | test stays red, suite breaks | The auditor's failed row becomes `evidence/fail-memo-<track>-<n>.md` per `../shared/orchestration.md` §Fail memo. **3 fix attempts per track** — separate from step 5's chain attempts — then that track `blocked` with the memos kept; other tracks finish and integrate. |

`blocked.md` is written and left for him to read, per blocked track: what was tried (the fail memos), why each attempt failed, and the options in play. It does not halt the run and wait.

## Step 9 — Clean up

- Every `[DEBUG-*]` probe gone, **verified by reading the diff** — not by search-and-replace. An unscoped edit hitting code that was not yours is a real and recurring failure.
- `unslop` retroactively over the diff. Is this the elegant fix or the first one that passed?
- Read the `noise` category explicitly, not as part of a general pass — it catches doc-comments restating a name.
- Re-run the step 7 convention check — lint config, written conventions, surrounding code — against the diff as written.

**Any edit beyond comments and prints sends this back to step 8.** An unverified cleanup edit is exactly how a green run ships a broken diff. Comment-only cleanup does not — **except in the red test's file, which cleanup does not touch at all.** Even a comment there changes the hash and breaks what the test-only commit proves, forcing a re-observation nobody wanted over a formatting nit.

## Step 10 — Draft PR

Push the branch, open a **draft** PR, repo's own template, follow the repo's `attributing-ai-tools` skill. **Assign no reviewers.** Merging is his call, on his word.

**The diff is the explanation. The body is a pointer to it.** Under a minute to read, by an engineer, a designer or a manager.

**The body has these six sections, in this order, under these headings.**

1. **Problem** — the issue as the ticket states it, then the root cause found in investigation.
2. **Fix** — briefly, how it was fixed.
3. **Before / after** — the screenshots, for a visual bug only; omit the section otherwise.
4. **Tests** — only the names of the tests that cover this fix.
5. **How to reproduce the fix locally** — branch name, feature flags, and any other prerequisite a reviewer needs (device, OS, a Codeless JSON template).
6. **For those interested** (the bottom) — the accessibility check result (`a11y:` line from `tree-diff.py`, or "not run"), every stated assumption (what the ticket left out and what you assumed, device and OS reproduced on), any incomplete-proof note (what could not be verified and why, naming the check), and **the proof block, verbatim, in the description** (see below).

**Style, every section.** Three sentences at most. Plain words a non-engineer can follow; avoid jargon where it can be avoided. Name no classes, types or objects, **except** the actual unit-test names in *Tests* — those are the one place a reviewer needs an exact identifier. Say what changed in behaviour, not how the type system enforces it. "Icons inside a wrapper were firing their on-appear action twice because the wrapper passed it down as well. The wrapper no longer passes it down, so it fires once."

**The proof block lives in the description**, at the bottom of *For those interested*, pasted verbatim from `verification` — verdict tier, the claims table with SHAs and commands, the replay line, the mandatory `Not proven` line, and the accessibility row. Wrap it in `<details><summary>Proof — <verdict tier></summary> … </details>` so the body stays quick to read while the evidence is still part of the description; the verdict tier stays visible in the summary line. The three-sentence limit applies to prose, not to the block, whose cells are commands, SHAs and counts.

**The first PR comment** carries the alternative you considered and rejected, with the reason it lost — one or two lines, the answer to the "why not just do X" round-trip that is the most common one on a repo you do not own — and the blast radius (what else reads the thing you changed). Nothing else goes in the comment.

Run `unslop-prose rewrite --preset crisp` over the body. A PR body taking minutes to read is a defect in the body, not proof of thoroughness.

Opening, image publishing, path/recipe commit and the tracker comment: `../shared/pr.md`. That includes writing `pr:`, `branch:` and `worktree:` into `state.md` once the PR exists.

---

## Close-out — Report and ledger

Once, after every item has reached a terminal state.

**Print `summary.md` in full**, per item. It is the last thing Amel reads, so it goes before the table, not after it.

Then append one row per item to `~/Projects/tickets/LEDGER.md`. **Leave the PR-outcome column blank** — a workflow grading its own output is exactly the bias this design exists to remove. The next run's dispatcher backfills it (`../scruffy/SKILL.md` Setup 1).

Finish with one table: every input, one row, terminal state, **proof verdict** (`MERGE-READY` / `REVIEW NEEDED` / `PROOF INCOMPLETE`), evidence, PR link. The verdict column is the triage: MERGE-READY rows are the PRs Amel can approve on the proof block alone. Anything deferred or capped is named individually. Silent truncation reads as "covered everything" when it did not. An item redirected as a feature request has a row too, reading `not a bug — feature lane`.

The retro is the dispatcher's close-out (`../scruffy/SKILL.md`), once per batch. Every comment he leaves on a PR is a defect in this skill, not just in that fix: it becomes a candidate rule per `references/learning.md`, proposed to him and written only once he approves.
