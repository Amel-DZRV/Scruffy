# Spec and plan

This is the work that happens before the pipeline runner builds anything: the spec, the prior-art check, the seam map, and the plan package Amel says "go" to.

**A feature has a specification to get right.** Its truth lives in the requester's head, and the cost of guessing wrong is a built thing nobody wanted. No reviewer catches that, because the code is fine. Scope is the primary failure mode, not correctness.

## Who does what

| Work | Role |
|---|---|
| Spec: what, why, acceptance criteria, non-goals, ambiguity hunt, prior art | Product Manager, inside the Product/Business council |
| Seam map and blast radius | Chief of Engineering (cross-platform) or the platform architect (single platform) |
| Design | Design/Architecture council |
| Vertical-slice plan per platform | Platform architect |
| Plan package and "go" | Amel |

## The spec

Four things. All four must be writable before anything is built.

| | |
|---|---|
| **What should exist** | one or two plain sentences |
| **Why** | the problem it solves; this is what lets you judge scope later |
| **Acceptance criteria** | each independently checkable, and each becoming a test written red-first by QA |
| **Non-goals** | what this deliberately does *not* do |

**Non-goals are not optional.** Write at least two, even when they feel obvious. They are the cheapest scope control that exists, and the only one that works while someone is mid-build with a good idea.

**Acceptance criteria must be falsifiable.** "The list is fast" is not a criterion. "The list renders 200 items without dropping a frame on a mid-tier device" is. Anything that cannot become a test is a hope; it goes in the plan package as an open question.

The request is a proposed solution to a problem someone has. Understanding the problem sometimes reveals a smaller or better solution. That is a legitimate finding and it goes in the council's brief, not silently substituted.

## Hunt the ambiguity

The adversarial energy goes into the spec, not into whether the feature deserves to exist. Whether it is worth having is the council's question, answered once. Whether the spec is complete enough to build against is entirely open, and it is the one thing that cannot be recovered later.

Do not merely notice gaps. Go looking, and keep generating questions until you cannot generate a new one that matters. Sweep these deliberately:

| Class | Ask |
|---|---|
| **Empty and zero states** | Nothing to show: message, spinner, blank, last-known-good? |
| **Failure** | The thing this depends on is down, slow, or returns garbage. Then what? |
| **Boundaries** | One item, 10,000 items, an item with a 200-character name, a null field |
| **Concurrency and timing** | Two of these at once. Mid-flight when the user navigates away. Backgrounded. |
| **Existing behaviour** | What does this change for someone already using the thing? Data already stored? A user mid-session? |
| **Permissions and state** | Logged out, no network, denied permission, first launch |
| **Contradictions** | Does any criterion conflict with another, or with something already shipped? |
| **Untestable criteria** | Which cannot become a test, and what would it take? |
| **Silence** | What does the request not mention at all that a built version must decide? |

The last row catches the most. A spec is a set of decisions, and the dangerous ones are the decisions nobody noticed they were making.

**Then filter before asking.** A question answerable from the repo, Notion, an attachment, or the analogous existing feature is a lookup, and asking it is a defect. What survives is genuine ambiguity: things only Amel knows, and things where two reasonable answers lead to different builds.

Surviving questions go to Amel in one batch, numbered, with a recommended answer beside each. Three ways out per question: he answers it, he defers it, or he takes the recommendation (recorded, and surfaced in the PR's Assumptions section). Empty the frontier in one pass: a second round of questions after he thought he was done is worse than either.

Acceptance criteria genuinely undeterminable → terminal state `needs info`, naming the specific criterion that is missing. Not the whole feature.

## Prior art

Cheap, early, and it can be terminal.

- **Does this already exist?** In this repo or a sibling. Exists in full → `already exists`, naming what does it and how to reach it.
- **Does most of it exist?** A component that does 80% of this is the thing to extend, not duplicate. Carry it forward as a constraint on the design.
- **Is someone already building it?** Search open PRs and branches for the feature keywords.
- **Has it been tried and reverted?** `git log` for a feature that landed and came out again. The revert commit usually says why, and that reason still applies.

## Map the seam

The question is where this goes and what it touches. Write it to `seam.md`, which is what makes review possible on a change with no symptom to point at.

- What will this read from?
- What will read from it?
- Does it change any existing behaviour, or only add?
- Does it cross a contract: an API, a shared component's props, a stored data shape?

**A feature that only adds is cheap and safe. A feature that changes existing behaviour is a migration wearing a feature's clothes**, and it needs the migration questions answered before design: what happens to existing data, existing callers, existing users mid-session. Missing this is the most expensive mistake available, because it is not discovered until integration.

When a design changes existing behaviour, say explicitly how it comes back out: a clean revert, or the flag or config the repo already uses. Do not import a rollout system a repo does not have. What is not acceptable is a behaviour change with no stated way back.

## Design

The Design/Architecture council decides the high-level design. What each architect brings to it, with the bias it optimizes for:

| Bias | Optimizes for |
|---|---|
| **Smallest thing that works** | shipping this week; least new surface area |
| **Fits the existing grain** | matches how this codebase already solves adjacent problems |
| **Holds up under growth** | the next three requests in this area, if the goal implies them |

Rank on: does it satisfy every acceptance criterion; is it reversible; does it match the grain of the surrounding code; how much new surface area does it add. **Prefer the smallest approach that satisfies the criteria and does not foreclose the obvious next step.** Every approach is traced criterion by criterion; one that cannot be is not yet a design.

Speculative generality is the failure mode: building the flexible version of something nobody has asked to flex yet.

## The plan

Each platform architect writes a plan for its platform, **sliced vertically**: each step leaves the repo working and is independently reviewable. A plan whose first four steps produce nothing runnable cannot be verified incrementally.

**Every step carries four fields: what, files it touches, criteria it delivers, depends on.** These are what make the dependency graph derivable; a plan without them cannot be orchestrated and runs serial. A step whose files cannot be named yet is not yet a step.

## The plan package

What Amel sees at the go gate. One package:

- the spec recap: criteria and non-goals
- the chosen design, and the rejected alternative with the trade-off in one sentence
- per platform, the step DAG
- the criterion → step mapping
- the blast radius and, for cross-platform work, the seam contracts and the Chief's sign-off
- council outcomes, including any disagreement and how he resolved it
- every open trade-off with a recommendation beside it

Then loop: he comments, the package is revised in full and re-presented. Repeat until an explicit "go". **Nothing is built until he says so.** Each round is complete and carries everything that changed since the last one.

A feature too small to earn a plan (single step, one seam) skips the loop and takes one batch: the approach question, a recommendation beside it, nothing built until he answers.

Escalate to `decision needed` instead when the feature as specified is the wrong shape: the requested solution does not serve the stated goal, or the scope is a project rather than a change.

**"Go" is the acceptance-criteria lock.** After it, criteria change only through a new plan round. The Docs-Keeper fires on the lock.

## When there is nothing to fit into

A young or empty project makes prior art and the seam map nearly vacant. The first features establish the architecture rather than fit into one.

- "Fits the existing grain" is meaningless. Replace it with **fits the stack's conventions**: how the framework's own docs and the nearest well-regarded open-source project in that stack solve this.
- **A design decision here is a precedent**, and the next five features will copy it. Choices that would be routine in a mature codebase (a state management approach, a data layer boundary, a testing style) are architectural here and are surfaced in the plan package.
- Write the decision down through the Docs-Keeper, in the project's Notion coding-standards page, so the next run discovers a convention instead of inventing a second one.
- Criteria, non-goals, red tests and scope discipline run unchanged. They matter more on a greenfield project, because nothing else is holding the shape.
