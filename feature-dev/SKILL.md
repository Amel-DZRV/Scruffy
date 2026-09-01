---
name: feature-dev
description: The feature lane of Scruffy. Use when something is wanted rather than broken — new behaviour, a new component, an extension to an existing one. Also handles cleanup work: debt, duplication, dead code. Handles requirements through draft PR. Invoked by scruffy's router, or directly on "feature-dev <key>".
argument-hint: "<jira key | url | pasted description>"
---

# Scruffy / Feature-Dev

One feature, start to finish. The router classified it; this file builds it.

**This module owns the spec and the design.** Proof belongs to `verification`, which it calls at step 5 and step 7. Preflight, worktrees, the dossier and the ledger belong to the shared spine.

## How this differs from a bug

A bug has a cause to find. **A feature has a specification to get right**, and that inverts most of the workflow.

| | Bug | Feature |
|---|---|---|
| The unknown | why is it broken | what should exist, and where it goes |
| Truth lives in | the code | the requester's head |
| Cost of guessing wrong | a wrong fix, caught in review | a built thing nobody wanted |
| Ends when | the symptom stops | the acceptance criteria pass **and nothing else grew** |

Two consequences run through this whole file:

**Ask more readily than Bug-Eater does, about the spec.** Bug-Eater infers what "correct" means about 80% of the time and states the inference loudly, because a wrong inference produces a wrong patch that a reviewer catches. Here a wrong inference produces a week of work nobody wanted, and no reviewer catches that because the code is fine. **The adversarial energy goes into the specification, not into whether the feature deserves to exist** — that was decided before the ticket, and relitigating it is noise. Whether the spec is complete is entirely open, and it is the one thing that cannot be recovered later.

**Scope is the primary failure mode, not correctness.** Bugs come pre-scoped by a symptom. Features have no natural edge, and they grow while you build them. Most of what follows is scope discipline.

## The two stops

Both batched across every item in a run.

| Stop | When | You are asking |
|---|---|---|
| 1 | After requirements | What the spec genuinely does not determine |
| 2 | After design | Which approach — when two are each defensible and the trade-off is his |

Unlike Bug-Eater, **stop 2 firing is normal here.** A feature with two viable designs and a real trade-off should reach him. It is stop 2 *never* firing that means the trigger is mis-specified.

## Terminal states

| State | Reached at | Artifact |
|---|---|---|
| `PR opened` | step 9 | branch + draft PR |
| `needs info` | step 1 | `questions.md`, ready to paste |
| `decision needed` | step 2 or 4 | `memo.md` — the options, the trade-off, who decides |
| `already exists` | step 2 | `verdict.md` — what already does this, and how to reach it |
| `blocked` | any step | `blocked.md` with the exact failure |

---

## Step 1 — Requirements

The input to a feature is a **want**, and a want is not a spec. This step converts one into the other.

### Gather

- The full ticket or request, every comment, **every attachment opened and described.** On a feature, a design mock or a screenshot of a competitor is often the *entire* spec and the prose is decoration.
- Linked tickets, one hop. An epic parent is worth reading: it usually states the goal the ticket assumes.
- Who is asking, and what they are actually trying to achieve. **The request is a proposed solution to a problem they have.** Understanding the problem sometimes reveals a smaller or better solution — that is a legitimate finding, and it goes in the memo rather than being silently substituted.
- The repo. What exists already, what conventions hold, what the nearest analogous feature looks like.

### Write the spec

Four things. All four must be writable before anything is built.

| | |
|---|---|
| **What should exist** | one or two plain sentences |
| **Why** | the problem it solves — this is what lets you judge scope later |
| **Acceptance criteria** | each one independently checkable, and each one becoming a test in step 5 |
| **Non-goals** | what this deliberately does *not* do |

**Non-goals are not optional.** They are the cheapest scope control that exists, and the only one that works while you are mid-build with a good idea. Write at least two, even when they feel obvious. "Does not support offline mode" and "does not change the existing sort order" are worth more later than they cost now.

**Acceptance criteria must be falsifiable.** "The list is fast" is not a criterion. "The list renders 200 items without dropping a frame on a mid-tier device" is. Anything you cannot turn into a test in step 5 is not a criterion — it is a hope, and it goes in the memo as an open question.

### Hunt the ambiguity — do not wait to trip over it

**This is the adversarial part of the lane, and it is aimed at the spec rather than at the decision to build.** Whether this feature is worth having was settled before the ticket existed; relitigating it is noise. Whether the spec is complete enough to build against is entirely open, and it is the one thing that cannot be recovered later — a design flaw shows up in review, an ambiguous criterion shows up as a built thing that misses.

So do not merely notice gaps as you encounter them. **Go looking.** Invoke `mattpocock-skills:grilling` and run it to an empty frontier: keep generating questions about the spec until you cannot generate a new one that matters.

The frontier is rarely empty on the first pass. Sweep these deliberately:

| Class | Ask |
|---|---|
| **Empty and zero states** | Nothing to show — message, spinner, blank, last-known-good? |
| **Failure** | The thing this depends on is down, slow, or returns garbage. Then what? |
| **Boundaries** | One item, 10,000 items, an item with a 200-character name, a null field |
| **Concurrency and timing** | Two of these at once. Mid-flight when the user navigates away. Backgrounded. |
| **Existing behaviour** | What does this change for someone already using the thing? Data already stored? A user mid-session? |
| **Permissions and state** | Logged out, no network, denied permission, first launch |
| **Contradictions** | Does any criterion conflict with another, or with something already shipped? |
| **Untestable criteria** | Which of these cannot become a test in step 5, and what would it take? |
| **Silence** | What does the ticket not mention at all that a built version must decide? |

The last row catches the most. A spec is a set of decisions, and the dangerous ones are the decisions nobody noticed they were making.

**Then filter before asking.** A question answerable from the repo, the tracker, an attachment, or the analogous existing feature is not a question — it is a lookup, and asking it is a defect. What survives the filter is genuine ambiguity: things only the requester knows, and things where two reasonable answers lead to different builds.

### Exit

All four writable, frontier empty → proceed. Inferred parts stated loudly, in `summary.md` and later in the PR body.

**Acceptance criteria genuinely undeterminable → `needs info`.** Not the whole feature; name the specific criterion that is missing.

### Stop 1

One batch, sectioned, numbered, **your recommended answer beside each.** Everything the hunt turned up that survived the filter.

Three ways out per question: answer it, ask the requester (→ `needs info` for that item), or take the recommendation (→ recorded and surfaced in the PR body).

**Be more willing to fire this than Bug-Eater is**, and make it count when it fires. The asymmetry is the whole point: an unnecessary question costs him a moment; an unnecessary week costs him a week. But a *second* round of questions after he thought he was done is worse than either — which is why the frontier is emptied first, in one pass, rather than discovered a step at a time.

After this stop the criteria are complete. Everything downstream runs without him until stop 2.

## Step 2 — Prior art

Cheap, early, and it can be terminal.

- **Does this already exist?** In this repo, or a sibling one. Features get requested twice, and by different people who did not know.
- **Does most of it exist?** A component that does 80% of this is the thing to extend, not to duplicate. Duplication is the most common way a codebase rots, and it is invisible at review time because the new code looks fine on its own.
- **Is someone already building it?** `gh pr list --search` over the feature keywords, and open branches. Same reasoning as Bug-Eater: a duplicate PR against a colleague's in-flight work is expensive and not recoverable by closing it.
- **Has this been tried and reverted?** `git log` for a feature that landed and came out again. The revert commit usually says why, and that reason still applies.

Exists in full → `already exists`, naming what does it and how to reach it. Exists in part → carry it forward as a constraint on the design; it usually decides the approach. Someone else is on it → `decision needed`.

## Step 3 — Map the seam

The feature equivalent of the chain. No cause to find, so the question is **where this goes and what it touches.**

### Locate, mechanically

Cheap agent, no reasoning: the analogous existing feature, the file that would own this, the layer boundaries it crosses, the tests covering the area. One fact sheet, handed to every designer below.

### Map the blast radius before designing, not after

- What will this read from?
- What will read from it?
- Does it change any existing behaviour, or only add?
- Does it cross a contract — an API, a shared component's props, a stored data shape?

**A feature that only adds is cheap and safe. A feature that changes existing behaviour is a migration wearing a feature's clothes**, and it needs the migration questions answered before design: what happens to existing data, existing callers, existing users mid-session. Missing this at step 3 is the most expensive mistake available in this lane, because it is not discovered until integration.

Write it to `seam.md`. This file is what makes review possible on a change with no symptom to point at.

## Step 4 — Design

### Two or three approaches, blind

Strong model, no shared context. Each returns an approach with entry-point bias, the same principle as Bug-Eater's investigators — **diversify by constraint, not by personality:**

| Bias | Optimizes for |
|---|---|
| **Smallest thing that works** | shipping this week; least new surface area |
| **Fits the existing grain** | matches how this codebase already solves adjacent problems |
| **Holds up under growth** | the next three requests in this area, if the goal from step 1 implies them |

Each returns: what gets built, where, what it touches, what it costs, **what it forecloses**, and how it satisfies each acceptance criterion.

That last item is the check most design work skips. An approach that cannot be traced criterion by criterion is not yet a design.

### Rank

Order on: does it satisfy every acceptance criterion; is it reversible; does it match the grain of the surrounding code; how much new surface area does it add. **Prefer the smallest approach that satisfies the criteria and does not foreclose the obvious next step.**

**When the feature changes existing behaviour, say explicitly how it comes back out.** A clean revert, a config, or a flag — whichever the repo already uses. Do not import a rollout system a repo does not have; if it uses flags, the grain-fitting bias will surface that on its own, and if it does not, a revertable commit is the answer. What is not acceptable is a behaviour change with no stated way back.

Speculative generality is the failure mode here — building the flexible version of something nobody has asked to flex yet. The goal from step 1 is what distinguishes real extensibility from imagined.

### Refute

Two skeptics on the top approach, told to **prove it wrong**, defaulting to refuted when uncertain. On a feature they are asking a different question than on a bug: not *is this the cause* but **is this the right seam** — will this design survive contact with the next requirement, does it fight the codebase, does it quietly change something it should not.

### Stop 2

Fires when two approaches are each defensible and the trade-off is his: shipping speed versus longevity, a new dependency, a changed contract, a bigger refactor than the ticket implies.

Batched, recommendation beside each, the trade-off in one sentence each. **Nothing is built until he says so.**

Escalate to `decision needed` instead when the honest answer is that the feature as specified is the wrong shape — the requested solution does not serve the stated goal, or the scope is a project rather than a change.

### Then plan

`superpowers:writing-plans`, scoped to the approved approach. Features earn a plan far more often than bugs do — the work is multi-step by nature.

**Slice it vertically.** Each step should leave the repo working and be independently reviewable. A plan whose first four steps produce nothing runnable cannot be verified incrementally, and its failures all arrive at once at the end.

## Step 5 — Acceptance tests, red first

Hand off to `verification`. Same rule as a bug, applied to behaviour that does not exist yet: **write the test, watch it fail, then build.**

**One test per acceptance criterion.** Not one test for the feature. This is what makes "done" mechanical rather than a judgement call — done is when the last red test goes green and none of the others broke.

The failure mode here is different from a bug's and worth naming: on a bug, a test that will not go red means the diagnosis is wrong. On a feature, **a test that will not go red means the behaviour already exists** — which sends you back to step 2, because you are about to build something twice.

All criteria red, all recorded with their hashes, before a line of implementation.

Criteria that genuinely cannot be tested — a visual judgement, a performance target with no harness — are named in the PR body as unverified. **Do not quietly drop them, and do not build a harness that was not asked for.** An unverifiable criterion is a finding.

## Step 6 — Implement

Worktree per item, mandatory.

Follow the plan, one commit per step, code review between steps. **Run the acceptance tests after every step** — on a cheap loop this is nearly free, and it tells you which criterion each step actually delivered.

**Find the repo's conventions before writing a line.** No language standards travel with this skill; the repo's rules are what apply:

1. **Enforced tooling** — lint and format config, pre-commit hooks. Non-negotiable.
2. **Written conventions** — `CONTRIBUTING.md`, `CLAUDE.md`, a style doc.
3. **The surrounding code.** Usually the real answer. Match the file you are editing.

**A repo with no conventions yet is a real case here** — a greenfield project has nothing to discover. When that happens: follow the nearest analogous open-source project's conventions for that stack, apply them consistently, and **write down what you chose** in the repo's `CLAUDE.md`. The next run discovers it instead of inventing a second style. An inconsistent young codebase is much more expensive than an opinionated one.

### Scope, while building

The moment scope control actually matters. Anything you find yourself wanting to add:

- **Is it in the acceptance criteria?** Build it.
- **Is it in the non-goals?** Do not, no matter how small it looks from here.
- **Neither?** New ticket, linked. Not this PR.

"While I'm in here" is how a two-day feature becomes a two-week one and how a reviewable PR becomes an unreviewable one. The non-goals from step 1 exist precisely for this moment, when the idea seems good and the cost seems small.

**`[DEBUG-*]` probes** — prefixed, investigation only, never in the final diff, removal verified by reading the diff. Batch them when the loop is expensive.

## Step 7 — Verify

Hand off to `verification`:

1. **Every acceptance test green**, each file re-hashed against its step-5 hash. A mismatch is reported, not absorbed — a test loosened until it passed proves nothing, and on a feature it is easier to rationalize because there was no original behaviour to preserve.
2. **The full suite green.** Commands and output pasted; pass counts, not full logs.
3. **Nothing else moved.** Failures in untouched areas → `decision needed`, never auto-updated. A suite re-run to green is `blocked` and flagged flaky.
4. **Reviewer evidence** for anything visual — captures on the same device and screen, per platform.

Plus two checks that only apply to features:

5. **Every acceptance criterion maps to a passing test, by name.** Not "the suite is green" — a criterion-by-criterion table. This is the artifact that answers "is it done", and it belongs in the PR body.
6. **The non-goals still hold.** Read the diff against them. A feature that quietly grew past its stated boundary is the most common thing a reviewer objects to, and the author is always the last to notice.

**Two budgets, not shared:** design attempts — the test will not go red because the behaviour exists, or the approach will not fit — three, then back to step 4. Implementation attempts — the test will not go green — three, then `blocked` with a summary.

Process failures — toolchain, environment — get no retry loop. PR opens with proof marked incomplete and the failing check named.

## Step 8 — Clean up

- Every `[DEBUG-*]` probe gone, **verified by reading the diff.**
- `unslop` retroactively over the diff. Is this the design you chose, or the accretion of eight steps?
- Read the `noise` category explicitly.
- **Dead ends removed.** Features accumulate abandoned scaffolding — a half-built abstraction from step 2 of the plan that step 5 made unnecessary. Nobody deletes it because it looks intentional.
- Re-run the step 6 convention check against the diff as written.

Any edit beyond comments and prints sends this back to step 7.

## Step 9 — Draft PR

Push the branch, open a **draft** PR, repo's own template. **Assign no reviewers.** Merging is his call.

A feature PR has a harder job than a bug PR: there is no symptom to point at, so the body has to establish that the thing was worth building and that it does what it claims.

- **What this adds, one line.** In the words of someone who wants it, not someone who built it.
- **Why** — the problem from step 1. A reviewer who does not know the goal cannot judge the design.
- **Acceptance criteria, each with its passing test named.** The table from step 7. This is the core of the body and it is what makes "done" checkable rather than assertable.
- **Non-goals.** Pre-empts the "shouldn't this also…" comment, which is the most common round-trip on a feature.
- **The design, in two or three sentences**, and — when stop 2 fired — the approach that was rejected and why. Unlike a bug PR, that context is load-bearing here: the reviewer is being asked to accept a design, not just a fix.
- **Blast radius.** What reads this, what it changes. Say plainly when it only adds.
- **Screenshots** for anything visual, inside the description.
- **Assumptions, when a guess was made.** One line. A spec inferred rather than stated is the thing most worth surfacing, because the requester is the only person who can catch it.
- **Unverified criteria**, named. A PR quiet about what it could not verify is worse than one that admits it.
- **How to review** — actionable only. A branch, a device, a named test, a screen to open.
- **Linked follow-up tickets** for everything deliberately deferred.

Run `unslop-prose rewrite --preset crisp` over it.

**Then comment on the ticket** with the PR link.

---

## When there is nothing to fit into

A young or empty repo makes steps 2 and 3 nearly vacant — no prior art, no analogous feature, no grain to match. The first features in a project are **establishing** the architecture rather than fitting into one, and the lane should say so rather than pretend otherwise.

What changes:

- **The "fits the existing grain" design bias is meaningless.** Replace it with **fits the stack's conventions** — how the framework's own docs and the nearest well-regarded open-source project in that stack solve this. Borrowed grain beats invented grain.
- **A design decision here is a precedent**, and the next five features will copy it. That raises the bar on stop 2: choices that would be routine in a mature repo — a state management approach, a data layer boundary, a testing style — are architectural here and worth surfacing.
- **Write the decision down**, in the repo's `CLAUDE.md` or an ADR. Not for ceremony: so the next run discovers a convention instead of inventing a second one. An inconsistent young codebase costs far more than an opinionated one.
- Everything else — criteria, non-goals, red tests, scope discipline — runs unchanged. They matter *more* on a greenfield project, not less, because nothing else is holding the shape.

## Cleanup

Debt, duplication, dead code. A feature with no acceptance criteria, which changes three things and nothing else.

- **No red test.** There is no behaviour to add and no symptom to assert. **The existing suite is the entire safety net**, which makes step 7 the whole point rather than a formality: full suite green before, full suite green after, and the diff explaining every difference.
- **The criteria are replaced by a boundary.** Write what is in scope and what is out, in step 1, with the same seriousness as acceptance criteria. Cleanup has no natural edge at all — no symptom, no requester, no "done" — so the boundary is the only thing that ends it.
- **Scope discipline turns up, not down.** One concern per run. A cleanup that grows a second concern mid-run becomes a second item, always. The temptation is strongest here precisely because everything you touch has something else wrong nearby.
- **The blast-radius map from step 3 matters more than usual.** Deleting something requires proving nothing depends on it, and "nothing calls this" is a claim that needs a grep behind it, not an impression.
- The PR body leads with **why this was worth doing and what it does not change.** A cleanup PR with no behaviour change is asking a reviewer to trust a diff they have no way to test — earn that with a clear boundary and a green suite, not with volume.

## When the repo is yours

Relentless rather than DoorDash: no stranger reviews this, which changes two things and nothing else.

- **The PR body is for you in six months**, not for a reviewer today. Keep it — the acceptance-criteria table is the most useful artifact this lane produces, and it is worth more when nobody else is checking.
- **Self-review discipline replaces reviewer discipline.** Nothing external catches a design that quietly grew past its non-goals, so step 8's checks matter more here, not less. The absence of a reviewer is the argument for keeping them, not for dropping them.
