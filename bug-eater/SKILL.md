---
name: bug-eater
description: The bug lane of Scruffy. Use when an item has been classified as a bug — something is broken and the fix belongs in code. Handles gather through draft PR. Invoked by scruffy's router, or directly on "bug-eater <key>".
argument-hint: "<jira key | url | ticktick task | pasted text>"
---

# Scruffy / Bug-Eater

One bug, start to finish. The router classified it; this file fixes it.

**This module owns diagnosis.** Proof belongs to `verification`, which it calls at step 4e and step 7; step 3 pins the conditions that handoff runs under. Preflight, worktrees, the dossier and the ledger belong to the shared spine.

**Amel stops at most twice in this lane.** Everything else you prove.

## The two stops

Both batched across every item in a run. Never one interrupt per bug.

| Stop | When | You are asking |
|---|---|---|
| 1 | After gather | Only what nobody can look up |
| 2 | Before implementing | Which of two equally correct fixes — only when the choice is his |

A well-specified bug fires neither. If both fire routinely, this file is wrong, not him.

## Terminal states

| State | Reached at | Artifact |
|---|---|---|
| `PR opened` | step 9 | branch + draft PR |
| `recommend close` | step 2 | `verdict.md` — merged PR named, red test passing on clean main |
| `needs info` | step 1 or 3 | `questions.md`, ready to paste as a ticket comment |
| `decision needed` | step 5 or 7 | `memo.md` — what changed, the trade-off, who decides. Also covers "already in flight" (step 5). |
| `blocked` | any step | `blocked.md` with the exact failure |

Forcing a PR onto an already-fixed ticket is worse than saying so.

---

## Step 1 — Gather

Fan out, cheap models, strict output contract. Cheap agents locate and transcribe; they do not summarize.

- The full ticket, every comment
- **Every attachment opened and described in words.** Images and video both. Treat a screenshot as the broken state — that is what it almost always is. Describe it into the dossier ("the icon sits flush against the left edge with no padding") so nothing downstream reopens the file. An attachment plainly showing a *working* state is a flag to surface, not a thing to silently reinterpret.
- **Linked tickets, one hop.** Read them in the same context. Do not walk the graph further.
- The tracker, searched for duplicate reports of the same symptom. Two reports narrow the conditions faster than one.
- Reporter context — engineer, PM, or support. It calibrates how literally to read the symptom.
- Repo fetched, history read around the suspect area
- **Discover how the repo works, rather than assuming.** Platform and language from what is on disk; build and test commands from the build files and the CI config; PR conventions from `.github/PULL_REQUEST_TEMPLATE.md`; lint rules from the tooling config. Record what you found in `state.md` so nothing downstream re-derives it.
- **Establish the cost class here.** Run `verification`'s economics discovery: time one suite run, on the commit the fix will branch from, so it doubles as the baseline (`evidence/baseline.txt`). Record cheap or expensive in `state.md`. Diagnosis depth in step 4 keys off this, so it must exist before step 4 starts.
- What is *not* discoverable — which repo a ticket belongs to, repo-specific launch skills — comes from the router or from Amel.
- Web search for framework-level symptoms: a crash inside Litho, a Yoga layout behaviour, an OS-version regression

Every claim lands tagged **claim** or **verified**, with its source. Provenance not tracked from here gets reconstructed later, badly, and the chain has to cite `file:line` to a stranger.

**Exit test — can you write these two sentences?**

- What is happening
- What should happen instead

Both writable → proceed. The second is inferred about 80% of the time; **infer it and state the inference loudly** rather than asking. It goes in `summary.md` as an assumption, into the PR body where a reviewer can challenge it, and — the part that makes the guess safe — it becomes the red test's assertion, verbatim, at step 4e. A wrong inference then isn't buried in a body sentence; it is the one line of test code the reviewer reads anyway. Asking Amel what correct behaviour looks like on every ticket is a defect — he would have guessed it too.

Neither writable — no description, or a description nobody can parse into a symptom — → `needs info`, questions written ready to paste.

**Hard stop:** gather ends when you can state the symptom in the reporter's conditions, name a suspect area, and give a version or commit range. Past that you are investigating, and that is step 4.

### Stop 1

Only what `gh`, Jira, TickTick, grep, or web search cannot answer. Read every comment before you ask — a question already answered in comment 4 is the same defect as asking a lookup.

He may not know either; he is not the reporter. Three ways out per question: answer it, ask the reporter (→ `needs info`), or assume it (→ recorded, and surfaced in the PR body).

## Step 2 — Already dead?

Cheap, early, terminal. On a repo with heavy PR traffic this is a common exit and the cheapest one to reach.

Look for a merged PR whose title or diff plainly names this symptom. This gate is deliberately shallow — it catches the obvious cases and nothing else. The definitive check is the red test in step 4e, which will catch what this misses at no extra cost.

**Search open PRs too, not just merged ones.** `gh pr list --search` over the symptom keywords and the suspect files, same call shape. An open PR is the likelier find — the ticket is still open — and the failure mode is worse: a merged fix you miss just costs an investigation, while an in-flight PR you miss costs a duplicate PR filed against a colleague's work on a repo you do not own.

A hit here is a **flag carried forward, not an exit.** Record it in `state.md` and keep going. The chain is cheap, read-only, and it is what makes the comparison useful — you cannot say whether their PR covers the reporter's conditions without knowing what actually causes the symptom. The decision lands at step 5.

**A close recommendation needs proof of the same shape as everything else.** The red test, written and run against clean main, passing without any fix. Naming a merged PR is an argument; a green test on untouched main is proof. Closing someone's ticket wrongly on a repo you do not own is expensive.

Cannot reproduce, and nothing found that would have fixed it → `needs info`, not `recommend close`. Absence of a repro is not absence of a bug — usually it means the reporter had conditions you did not recreate. Post the question as a ticket comment.

## Step 3 — Reproduce, as a test

**This is the step that replaced Amel watching a simulator or emulator.** He is not present for it.

The order is deliberate and inverted from how a human works it. A human reproduces by hand first, then writes tests after the fix. Do the opposite: a test written after the fix is the classic way to end up with one that would have passed before it. **Write the failing test first, watch it fail, then fix.** That failure *is* the reproduction.

Pin the conditions before you build:

- **Latest main, always.** Never a release branch, never the reporter's version.
- **Claim a device.** Take one that is not running an app under test, record its identifier in `state.md`, pin the rest of the run to it. All busy → boot a fresh one rather than queue. Commands per platform in `references/platforms/`.
- **Missing device or config is assumed, and the assumption is stated** — in the ticket comment and the PR body. "Reported without a device; reproduced on iPhone 17, iOS 26.5" narrows the bug for whoever reads it next.

The red test itself is written by `verification` — but **against the surviving chain, which does not exist until step 4.** This step pins the conditions, claims the device, and captures the before-state; the handoff happens at step 4e, once step 4 has a top-ranked chain. What this lane owes `verification` then: the symptom in the reporter's words, the suspect area, the conditions pinned here, and the top chain.

**Visual bugs.** Order of preference, cheapest falsifiable assertion first:

- **An existing snapshot suite for that component, if the repo has one.** Check first on Android — Paparazzi is common and good, so an Android visual bug genuinely may have a snapshot path. On iOS this is rare enough that it is worth checking and not worth expecting.
- **The accessibility tree.** When the symptom is an element existing, its label, role, state, or position, the tree gives you a number to assert on — a falsifiable red test where otherwise there would be none. `axe describe-ui` on iOS, `uiautomator dump` on Android.
- **A logic assertion at the seam** — a padding value, an alignment enum, a frame.

Never invent a snapshot suite where none exists. That is separate work and it will get the PR rejected.

**The "before" screenshot is captured here, on clean main, in the same session.** Capture command per platform in `references/platforms/`. Once the fix is applied it cannot be recovered without another build.

Same device, same OS, same window as the "after" — so the pair differs only by the diff. That consistency is the point: the before/after pair is the single thing that most reliably gets a PR approved, and screenshots taken by different people at different times do not do that job.

**Navigation is the unreliable part, not capture.** Use the repo's launch skills; for SDUI, rendering the component from a template or sample app usually beats navigating a real user flow. If the screen cannot be reached:

- **Notify, do not stall.** Park the item, keep working the other bugs, resume when Amel says the screen is ready.
- **Batch the handoffs.** Across a run, hand him one list — three screens, step-by-step for each, any order. Not one ping per bug.
- **Record the path.** Read the accessibility tree as he navigates and write down the taps, so the "after" shot replays automatically. Otherwise a visual bug interrupts him twice — once on main, once on the fix — which is the two-presence problem this skill exists to remove.
- Replay failing on the "after" falls back to asking again. Never ship a mismatched pair.

Screenshots are **reviewer evidence, not verification.** They cannot fail. A pair proves nothing to a skeptic — the "before" could be any build. The red test is what proves the fix; the screenshots are what get it approved. Both matter; do not confuse them.

## Step 4 — Chain

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

**Forward-from-change doesn't have to guess which commit.** When the suspect area has enough history that "recently" spans dozens of commits, bisect instead of reading each by eye — `git bisect` driven by the red test once one exists (step 4e), or a linear walk scripted the same way for a symptom that only shows up under the test suite, not a single run. Reasoning about which commit looks suspicious is a guess; a bisection that lands on a commit is a fact the chain can cite by SHA.

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

The top chain gets refuted **once, by `verification`'s 1a, at the handoff below** — two skeptics, each told to prove it wrong, defaulting to refuted when uncertain. Do not run a lane-side pass as well; the same chain refuted twice by four agents buys nothing the first two did not.

On a **cheap loop there are no skeptics at all** — verification skips 1a and the red test refutes at the same cost, more strictly. On an expensive loop the pass is what stands between a wrong chain and a wasted build.

Both refute → promote hypothesis 2, repeat once. All refuted → `blocked`, both skeptics' reasoning kept.

### 4e. The red test is the judge

Everything above is a ranked guess — cited, argued, still a guess. The test is the only part that can come back and say no.

Hand off to `verification` here: it runs the skeptic pass when the loop is expensive (4d), then writes the test against the surviving chain, under step 3's pinned conditions and device, and watches it fail on the symptom. Fails → chain proven, proceed. Does not fail → the chain is wrong regardless of how well it read; drop to the next hypothesis. **Chain-attempt budget: three.** Separate from the fix-attempt budget in step 7 — they do not share, or one exhausts the other.

`chain.md` keeps **all three hypotheses**, not just the winner. The rejected ones and why they lost are what teach the next person, and what you fall back to when the red test refuses to go red. Run `unslop-prose` over it in cleanup mode — a human reads this file later.

## Step 5 — Propose

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

## Step 6 — Implement

Worktree per item, mandatory — concurrent items may touch the same repo. Create and clean up per `../scruffy/references/worktrees.md`; that file also owns which terminal states keep the worktree and which release it.

**Plan only when it earns one.** Multi-file or multi-concern → `superpowers:writing-plans` into `plan.md`, then `subagent-driven-development`, one helper per independent step, one commit each. A three-line fix goes straight to the diff; a plan and a subagent chain for a one-liner is pure ceremony.

**Code review between steps** means a fresh subagent, not a second look from the model that wrote the step. Give it only the two SHAs bounding the step, the plan step it was supposed to satisfy, and nothing from this run's own context — a reviewer primed with the implementer's reasoning inherits its blind spots. It reports Critical / Important / Minor; Critical and Important get fixed before the next step starts, Minor gets noted and carried to step 8.

**Fixing at the source doesn't stop at the origin.** The chain in step 4 already names every link between cause and symptom — each one is a place the same class of bug can recur through a different caller, a mock, or a future edit. Where a link is cheap to guard (a validation at a boundary the chain crossed, not a rewrite), add it alongside the fix. This is defense-in-depth, not scope creep: it stays inside the file(s) the chain already touched, and it does not chase problems the chain didn't find.

**Find the repo's conventions before writing a line.** Bug-Eater carries no language standards of its own — the repo's rules are what the reviewer enforces, and a PR that is stylistically correct by some other standard still gets a review comment. In precedence order:

1. **Enforced tooling** — SwiftLint / SwiftFormat config, ktlint, pre-commit hooks. Non-negotiable; it fails CI.
2. **Written conventions** — `CONTRIBUTING.md`, `CLAUDE.md`, a style doc in the repo.
3. **The surrounding code.** Usually the real answer, and it often differs from what the doc says. Match the file you are editing.

Do this again in step 8, against what actually got written rather than what was intended.

**Move the red test into the repo's suite — before the first fix commit.** It was written to prove a chain, and it may not live where the repo would naturally put it. Relocate it, match the repo's conventions, re-run it red, and let `verification` re-hash and commit it there — so the test-only commit already holds the test in its final home, reading as a regression test someone would have written. Relocating it *after* fix commits exist trips verification's hash check and forces the earned-exception path — re-observed red on the parent, a new test-only commit — which is pure rework for choosing the wrong moment.

**`[DEBUG-*]` probes.** Temporary prints inserted to see what a value actually is at runtime, when reading alone will not settle it:

```swift
print("[DEBUG-onAppear] fired for \(type(of: subview)), count=\(count)")
```

- Investigation and red-test authoring only. **Never in the proposed fix.**
- Always prefixed, so removal is mechanical.
- **Batch them.** A probe costs a full build cycle to read. Adding one means adding every probe you might want from that build.

## Step 7 — Verify

Hand off to `verification`. Four claims, each able to fail:

1. **The red test turns green** — same test, **file re-hashed against the hash recorded at the step 4e handoff.** A mismatch is reported, not absorbed. A red test adjusted during implementation until it passed proves nothing, and that is the easiest thing in this whole workflow to cheat.
2. **No new suite failures against baseline** — the repo's suite, not the changed file's tests, compared against the parent-commit baseline `verification` recorded. Commands and the delta pasted; pass counts, not full logs.
3. **Nothing else moved** — snapshot failures on components you touched are intentional, update the baseline. Failures on components you did not touch → `decision needed`, never auto-updated. A suite re-run to green is `blocked` and flagged flaky, not a pass.
4. **Reviewer evidence** — "after" screenshot, same device and screen as the "before", replayed from the recorded path or batched back to him.

**Revert check** — revert the diff, confirm the test goes red again — **only when the test is cheap to run.** A package target in seconds: mandatory. A 35-minute app build: skip it. The red failure output from step 4e, kept in `evidence/`, already establishes the test failing on code without the fix, provided the file is unchanged. That is what claim 1's hash check and the test-only commit prove.

**Two failure modes, two responses:**

| Mode | Looks like | Response |
|---|---|---|
| Process | build broken, sim gone, suite cannot run | No retry loop — retrying does not fix a dead toolchain. PR opens, proof marked incomplete, failing check named. |
| Solution | test stays red, suite breaks | Back to the fix, **3 fix attempts** — a budget separate from step 4's chain attempts — then `blocked` with a summary: what was tried, why each attempt failed, the two options in play. |

The blocked summary is written and left for him to read. It does not halt the run and wait.

## Step 8 — Clean up

- Every `[DEBUG-*]` probe gone, **verified by reading the diff** — not by search-and-replace. An unscoped edit hitting code that was not yours is a real and recurring failure.
- `unslop` retroactively over the diff. Is this the elegant fix or the first one that passed?
- Read the `noise` category explicitly, not as part of a general pass — it catches doc-comments restating a name.
- Re-run the step 6 convention check — lint config, written conventions, surrounding code — against the diff as written.

**Any edit beyond comments and prints sends this back to step 7.** An unverified cleanup edit is exactly how a green run ships a broken diff. Comment-only cleanup does not — **except in the red test's file, which cleanup does not touch at all.** Even a comment there changes the hash and breaks what the test-only commit proves, forcing a re-observation nobody wanted over a formatting nit.

## Step 9 — Draft PR

Push the branch, open a **draft** PR, repo's own template, follow the repo's `attributing-ai-tools` skill. **Assign no reviewers.** Merging is his call, on his word.

**The diff is the explanation. The body is a pointer to it.** Under a minute to read.

Structure — problem, solution, logic, in the words a non-renderer engineer would use. No type names, no protocol names, no mechanism walkthrough in the headline.

- **Problem, one line.** "On-appear actions in child components were firing twice."
- **Solution and logic** — what was happening, then the fix, two short sentences each, plain words. A reader needs the mechanism before the fix means anything. "An icon renders inside a wrapper view. That wrapper was passing the on-appear action straight through to the icon inside it, so both fired the same action. Fix: skip the wrapper when firing on-appear actions. Only the icon fires it now, once." Say what changed in behaviour, not how the type system enforces it.
- **Screenshots inline, inside that section**, for anything visual.
- **Assumptions, when a guess was made.** One line. The ticket rarely states what correct behaviour should be, and that guess drove the whole fix — invisible to a reviewer, who will assume the ticket specified it. *"Ticket didn't state expected behaviour; assumed the icon should be inset by the standard container padding, matching sibling components. Reproduced on iPhone 17, iOS 26.5 — no device given."* No guesses, no line.
- **Blast radius.** What else reads the thing you changed. The first question anyone asks about a changed default, and the default here is fixing at source in shared code.
- **Considered and rejected, one line.** Stops the "why not just do X" round-trip, which is the most common one on a repo you do not own.
- **Proof** — paste the proof block from `verification` verbatim: verdict tier, the claims table with SHAs and commands, the replay line, and the mandatory `Not proven` line. **When a process failure meant something could not run, that line says so and names the check.** A PR quiet about what it could not verify is worse than one that admits it.
- **How to review** — actionable only. A device, a branch, an OS version, a named test. Never the diff's size or file count; that is not something to do.
- **Next steps** — real next steps and linked follow-up tickets only. Never a prose description of a deferred bug; the ticket is where that lives.

Everything else stays in `chain.md`. Link to it or drop it.

Run `unslop-prose rewrite --preset crisp` over the body. A PR body taking minutes to read is a defect in the body, not proof of thoroughness.

**Then comment on the ticket** — the PR link, and the repro confirmation from step 4e if it has not already been posted. It is what the reporter actually cares about and it costs nothing.

**TickTick-sourced item:** also move the card, per `../scruffy/references/ticktick.md` — comment with the PR link, then move it to the `In Review` column if that board has one. Every other terminal state leaves the card where it is.
