# Learning

Correcting a run fixes one run. Writing it down fixes every run after it.

The contract — what is read, what is written, who approves — is `../shared/learning.md`. This file holds what is specific to the bug lane.

## The trigger problem, and the fix

A run ends when the PR opens. Amel has not reviewed it yet. By the time he comments, that run is long over and the next one is on a different ticket with no reason to look back — which is how a correction loop ends up running in only one direction, filling with self-observed defects and none of his.

**So the next run fetches them.** Preflight already backfills PR outcomes from the ledger; it pulls the comments in the same pass:

```bash
gh pr view <url> --json state,reviewDecision,mergedAt,comments,reviews
```

Every ledger row with a PR link gets checked. New comments since last time become candidate entries for this run to propose. His review happens whenever it happens; the loop picks it up.

## Write when

- **Amel comments on a PR** — surfaced by the backfill above.
- He corrects something mid-run, or answers a stop in a way that contradicts your recommendation.
- A run discovers its own defect — a check that passed but should not have, an edit that hit more than it meant to.

All three are defects in this skill, not just in that fix.

## Generalize from the specific case

Almost every comment is about one fix. **That is the raw material, not a reason to discard it.** The work is finding the general rule the specific case implies.

The canonical example: the comment was "you broke `unifiedOnAppearOnChild`." The rule is *never run an unscoped string replace over a file you did not write.* Same event, far larger lesson.

Two ways to get this wrong:

| | Example | Why it fails |
|---|---|---|
| **Too narrow** | "Don't break `unifiedOnAppearOnChild`" | True and useless — it will never come up again |
| **Too broad** | "Be more careful when editing" | Unfalsifiable, and no run can act on it |

**The test: could a future run be judged on whether it followed this rule?** "Assert the expected occurrence count before writing" passes. "Be careful" does not. If the draft rule fails the test, keep generalizing — or keep the specific case in the repo's `CLAUDE.md` instead, where narrow facts belong.

## Where it goes, and approval

See `../shared/learning.md`. Entries drafted from PR comments are shown to Amel before they are written. A narrow fact about one repo's code belongs in that repo's `CLAUDE.md`, a routing fact in `references/repo-routing.md`, a toolchain move in `references/preflight.md` — prefer them over `../memory/rules.md`.

## Format

One entry, appended, newest last. Two shapes depending on where the correction came from:

**From Amel:**

```
## 2026-08-25 — <one-line general rule>
**He said:** <verbatim, short>
**So:** <what to do differently, imperative>
```

Verbatim matters. A paraphrase drifts; his words do not. The headline is the *general* rule; the quote is the specific case that produced it.

**Self-observed:**

```
## 2026-08-25 — <one-line general rule>
**Context:** <what happened, what it cost>
**So:** <what to do differently, imperative>
```

The cost belongs in the entry. "Broke someone else's passing test and cost a full build cycle to discover" is what makes the rule stick.

## Health of the loop

A `../memory/rules.md` that is entirely self-observed means the backfill is not running, or PR comments are not being generalized. That is the loop working in one direction only, and it is worth noticing — entries sourced from Amel are the more valuable kind and the harder kind to get.

## The ledger

See `references/dossier.md`.
