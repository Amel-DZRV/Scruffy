# Intake Fidelity and the Feedback Loop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Three tasks, `1` through `3`, in order.

**Goal:** Gather reads the Slack thread that is the actual bug report; step 1 exits on whether the red test's assertion can be written rather than on whether two sentences can be; and the PR-comment correction loop fires on a schedule instead of only when a new run happens to start.

**Architecture:** Three independent edits to existing files, no new lane and no new stop. Task 1 adds a Slack hop to both lanes' gather lists, one hop deep, with the same transcribe-don't-summarize contract the other gather bullets already carry, plus a preflight soft check because gather now depends on Slack reachability. Task 2 replaces bug-eater's two-sentence exit test with a three-part one whose third part is the red test's assertion, and routes the two ways it can fail to the two terminal states that already exist. Task 3 moves the ledger backfill's trigger out of preflight into a standalone script plus a weekly scheduled session that proposes candidate rules into a pending file; preflight and the spine then read that file instead of being the only thing that could ever fetch a comment.

**Tech Stack:** Markdown skill and reference files (Claude Code discovery), `core:using-slack` and its `slack` CLI, `gh` CLI (`api` for comments, `pr view --json` for outcome), `python3` for the backfill script, `CronCreate` for the weekly local trigger.

**Spec:** The conversation of 2026-09-30 in this repo, against the six-ticket MOSAIC batch (3981, 3814, 3592, 3537, 3289, 3288). Findings that drove each task: four of six tickets carry a Slack permalink as their entire description and gather's list never mentions Slack; MOSAIC-3814's two sentences are both writable while its assertion is not, so it enters a lane and stalls after a build; all seven `LEARNED.md` entries use the self-observed `**Context:**` shape with none using `**He said:**`, four ledger rows added after the 2026-09-18 backfill still have a blank PR-outcome column, and — measured during planning — the fetch command `references/learning.md` prescribes is blind to inline review comments, which is where five of the eleven comments on the ledger's PRs actually live.

**Out of scope — separate plan:** Parity mode for cross-platform bugs (two platforms, two repos, one paired evidence artifact). It touches `references/repo-routing.md`, bug-eater step 3's device pinning, and `agents/evidence-capturer.md`, which makes it a subsystem rather than an edit. MOSAIC-3814 and MOSAIC-3592 need it. Plan it after these three have run on a real batch.

**Precondition:** `scruffy/LEARNED.md` has 8 uncommitted lines (the two 2026-09-29 entries). Commit or stash them on their own before starting — they are unrelated to this plan and task 3 touches the same directory.

## Global Constraints

- Scruffy's file voice holds: reasoning in `SKILL.md`, facts only in `references/`, agents read-only.
- No task adds a stop. Bug-eater keeps two, the spine keeps three. A new dependency that fails is a parked item, a soft check, or a terminal state — never a new interrupt.
- No task changes the anti-asking bias. A question answerable from the ticket, the repo, the tracker, a Slack thread, or a web search is a lookup, and asking it is a defect (`bug-eater` step 1 Stop 1, `feature-dev` step 1 "Then filter before asking").
- Nothing self-appends to `LEARNED.md`. Entries drafted from Amel's comments are proposed for approval; only self-observed defects append without asking (`scruffy/references/learning.md`, "Propose, do not self-append").
- Path recipes remain the only exception to that rule. Task 3 does not touch them.
- The scheduled job in task 3 is read-only against every repo and every tracker. Its single write is `~/Projects/tickets/PENDING-LEARNING.md`.
- Slack reads are one hop, matching the existing linked-tickets rule. Read the thread; do not walk links out of it.
- Every claim gathered from Slack lands tagged **claim** or **verified** with its source, same as every other gather bullet.

## Machine facts at planning time

| Check | Result |
|---|---|
| `scruffy/LEARNED.md` entries | 7, all `**Context:**` (self-observed), 0 `**He said:**` |
| `~/Projects/tickets/LEDGER.md` | exists, 9169 bytes, PR-outcome column header reads "backfilled 2026-09-18" |
| Ledger rows with a PR link | 7 distinct PRs across `deliveroo/rooblocks` and `doordash/codeless` |
| Ledger rows with blank PR outcome | 4 (three dated 2026-09-26, one 2026-09-29) |
| Slack workspace for the MOSAIC batch | `deliveroo.slack.com` — not DoorDash; the CLI must be signed into that org |
| `scruffy/scripts/` | does not exist (task 3 creates it; `bug-eater/scripts/` is the existing precedent) |

### Comment sources, measured on the ledger's seven PRs

`gh pr view --json comments` returns **conversation** comments only. Inline review comments — the ones attached to a file and line — need `gh api repos/{owner}/{repo}/pulls/{n}/comments`, and review *bodies* are a third source again. Counts taken 2026-09-30:

| PR | inline | conversation | review bodies |
|---|---|---|---|
| `deliveroo/rooblocks#10853` | 0 | 2 | 0 |
| `deliveroo/rooblocks#10854` | 0 | 3 | 0 |
| `deliveroo/rooblocks#10855` | 0 | 2 | 0 |
| `doordash/codeless#405` | 0 | 0 | 0 |
| `doordash/codeless#423` | **3** | 2 | 1 |
| `doordash/codeless#534` | **2** | 0 | 1 |
| `doordash/codeless#97` | 0 | 2 | 2 |

**So the loop has two defects, not one.** The cadence is wrong (task 3's original premise) *and* the prescribed command cannot see 5 of the 11 comments. `references/learning.md` and `references/preflight.md` both carry that command today, so fixing only the schedule would have kept the blind spot.

**And the inline comments are bot findings.** Both on `#534` are from `flux-dd-4[bot]` (Flux Review Agent) — a `MEDIUM` / `suggestion` about an untested root on-disappear dispatch. Valuable and generalizable, but not Amel speaking. `learning.md`'s two entry shapes (`**He said:**` for him, `**Context:**` for self-observed) have no third shape, so the script must classify by author and the generalizing session must not file a bot finding as his words.

## Review Focus

Failure modes the spec implies that no task's acceptance check would exercise unless added. Each is pinned to a task below.

1. **A Slack permalink whose host is an org the CLI is not signed into.** `deliveroo.slack.com` while signed in as DoorDash returns an auth error, not an empty thread. Expect: gather reads the org from the permalink host and switches, and treats an auth failure as a named blocker rather than as "no thread found". Pinned to task 1, step 4.
2. **An unreadable Slack thread on a ticket whose description is only that link.** MOSAIC-3981 is exactly this shape. Expect: the item exits to `needs info` naming the unreachable thread, rather than proceeding into step 2 on a one-line stub. Pinned to task 1, step 6.
3. **The new exit test degrading into asking every time.** The old text says the second sentence is inferred about 80% of the time and that asking instead is a defect. An exit test that demands an assertion could be read as licence to ask what the assertion should be. Expect: the assertion is inferred on the same terms, and the exit fails only when the inference is a choice between defensible alternatives — not when it is merely unknown. Pinned to task 2, step 5.
4. **An assertion unwritable because two answers are both defensible, not because a fact is missing.** MOSAIC-3814 (which platform's alignment default is correct) is a consistency call, not a gap in the reporter's report. Expect: `decision needed` with a memo, not `needs info` with questions. Pinned to task 2, step 3.
5. **The scheduled job re-proposing comments a previous run already proposed.** Expect: a state file keyed by PR URL and comment id makes a second run over the same comments a no-op, so a cron firing while a Scruffy run is mid-flight cannot double-process. Pinned to task 3, step 5.
6. **A bot finding filed as Amel's words.** Five of the eleven comments on the ledger's PRs are Flux Review Agent findings. Expect: the script tags each comment's author class, and a bot finding never becomes a `**He said:**` entry — the verbatim-quote shape exists because his words do not drift, and a bot's do not belong in it. Pinned to task 3, step 6.
7. **A scheduled job that cannot see the ledger.** The job reads `~/Projects/tickets/LEDGER.md` and runs a script from `~/Projects/Amel/Scruffy` — both local paths. A cloud routine would report `NO NEW COMMENTS` forever, which is indistinguishable from a healthy quiet week and is precisely the failure this plan exists to remove. Expect: a local scheduler, verified by one manual fire before the schedule is trusted. Pinned to task 3, step 8.

---

## Task 1: Gather reads the linked Slack thread

**Why this is first:** four of the six tickets in the driving batch have a Slack permalink as their entire description. Today both lanes' gather lists enumerate the ticket, attachments, linked tickets, duplicate search, repo history and web search — and never Slack. The lane starts blind on most of the real intake.

**Files:**
- Modify: `bug-eater/SKILL.md` — step 1 Gather list, insert after the "Linked tickets, one hop" bullet (currently line 47)
- Modify: `feature-dev/SKILL.md` — step 1 Gather list, insert after the "Linked tickets, one hop" bullet (currently line 60)
- Modify: `scruffy/references/preflight.md` — add one row to the soft checks section
- Modify: `scruffy/references/dossier.md` — register the new evidence file in the `## Files` inventory and define its header
- Acceptance: run against MOSAIC-3981 and MOSAIC-3592, both of which carry real `deliveroo.slack.com` permalinks

**Interfaces:**
- Consumes: `core:using-slack` and its `slack` CLI; the Jira description and comment bodies already fetched by the first gather bullet.
- Produces: a `slack-thread-<n>.md` transcript per thread under the dossier's evidence directory, and claims in `state.md` tagged with the permalink as source. Task 2's exit test reads those claims like any other.

- [ ] **Step 1: Read the two gather lists before editing**

Read `bug-eater/SKILL.md` lines 40–66 and `feature-dev/SKILL.md` lines 53–63 whole. The bullets share a contract — cheap models locate and transcribe, they do not summarize — and the new bullet must match that voice rather than introduce a new one. Note that bug-eater's list is imperative and terse while feature-dev's leads with why each source matters; write each insertion in its own file's register.

- [ ] **Step 2: Insert the Slack bullet into `bug-eater/SKILL.md`**

After the "Linked tickets, one hop" bullet, insert:

```markdown
- **Linked Slack threads, one hop.** On this project the ticket is often a stub and the thread is the bug report — a bare permalink, or the "Issue created in Slack from a message" footer, or a `<custom data-type="smartlink">` wrapper around either. Read every thread linked from the description or any comment: `core:using-slack`, then the whole thread including replies, transcribed not summarized, into `evidence/slack-thread-<n>.md`. **The permalink host names the org** — `deliveroo.slack.com` is not the DoorDash workspace, and the CLI must be switched to it before the read. An auth error is a named blocker, never an empty result. Do not follow links out of the thread.
```

- [ ] **Step 3: Insert the Slack bullet into `feature-dev/SKILL.md`**

After the "Linked tickets, one hop" bullet, insert — same rule, this lane's register, and note what a thread is worth on a feature rather than a bug:

```markdown
- **Linked Slack threads, one hop.** Often the request itself, with the ticket as its summary. The thread carries what the ticket loses: who pushed back, what was already rejected, and the constraint someone mentioned in passing. Read every thread linked from the description or a comment via `core:using-slack`, whole and transcribed, into `evidence/slack-thread-<n>.md`. **The permalink host names the org** — switch the CLI to it first; `deliveroo.slack.com` is not the DoorDash workspace. An auth error is a named blocker, not an empty result. Do not follow links out of the thread.
```

- [ ] **Step 4: Add the preflight soft check**

Gather now has a dependency that can be down, and preflight exists so that nothing expensive starts before the cheap checks run. Add one row to the soft checks section of `scruffy/references/preflight.md`:

```markdown
| Slack reachability | Only when an item's description or comments contain a Slack permalink. Extract the host, switch the CLI to that org, read one thread. Failure is soft: the item proceeds with the thread recorded as unread in `state.md`, **unless the thread is the item's only description** — that item is `needs info` now, naming the unreachable thread. |
```

This is the Review Focus item 1 check: it forces the host-to-org step to happen once, cheaply, before a lane spends anything.

- [ ] **Step 5: Register the artifact in the dossier and define its header**

`evidence/slack-thread-<n>.md` is a new file type and the dossier's `## Files` section is the inventory. Two edits to `scruffy/references/dossier.md`:

Add to the `## Files` table:

```markdown
| `evidence/slack-thread-<n>.md` | One linked Slack thread, transcribed whole. Written at gather when the ticket links a thread; numbered in the order the links appear. |
```

Then carve the header exemption, because the standing rule is that every evidence file opens with SHA, exact command, and toolchain or device identifier — a Slack transcript has none of those:

```markdown
**Slack transcripts take a different three-line header**, since a thread has no SHA and no device: the permalink, the workspace org it was read from, and the fetch timestamp. The purpose of the header is unchanged — a reader must be able to go back to the source and get the same thing — and for a thread those three fields are what does that. Every other evidence file keeps the SHA form.
```

Skipping this leaves the plan asserting a constraint in its own header and then violating it in the two bullets above.

- [ ] **Step 6: Verify against a ticket whose thread is reachable**

Run gather's Slack bullet by hand against MOSAIC-3592 — its description ends with a `deliveroo.slack.com` permalink and a thread timestamp.

Expected: the CLI is switched to the Deliveroo org, the thread is fetched whole, and a transcript lands with the permalink recorded as its source. The transcript must contain content that is *not* in the Jira description — that is the whole point of the bullet, and if it does not, the read silently failed.

Record the observed output in the commit message. Do not claim this step passed without the transcript to point at.

- [ ] **Step 7: Verify the only-description case**

Run it against MOSAIC-3981, whose entire description is a smartlink-wrapped permalink plus two open questions.

Expected, whichever way the read goes:
- Thread reachable → the transcript is the description, and gather proceeds with the two open questions in it now visible as claims.
- Thread unreachable → the item exits `needs info` naming the unreachable thread, and does **not** proceed into step 2 on the one-line stub.

This is Review Focus item 2. The failure being guarded is the quiet one: a stub description that reads as "thin ticket" when the real report was one hop away.

- [ ] **Step 8: Commit**

```bash
cd ~/Projects/Amel/Scruffy
git add bug-eater/SKILL.md feature-dev/SKILL.md scruffy/references/preflight.md \
        scruffy/references/dossier.md
git commit -m "Gather reads linked Slack threads, one hop, with the org taken from the permalink host"
```

---

## Task 2: Step 1 exits on the assertion, not on two sentences

**Why:** the current exit test passes on MOSAIC-3814. "Android and iOS disagree on the default" and "they should agree" are both writable, so the item enters the lane — but the red test's assertion cannot be written until someone decides *which* default is correct, and that only surfaces at step 4e, after a build. The exit test is the cheapest place to catch it and today it does not.

**Files:**
- Modify: `bug-eater/SKILL.md` — the "Exit test" block in step 1, currently lines 57–64
- Modify: `bug-eater/SKILL.md` — the terminal-state table's `decision needed` row, currently line 33, which says "step 5 or 7"
- Acceptance: the block, read against MOSAIC-3814 (assertion is a choice), MOSAIC-3289 (assertion is writable), and MOSAIC-3981 (assertion unknown pending the thread)

**Interfaces:**
- Consumes: claims in `state.md` from task 1's gather, including Slack transcripts.
- Produces: no new artifact. It routes to `needs info` (`questions.md`) or `decision needed` (`memo.md`), both of which already exist in this lane's terminal-state table.

- [ ] **Step 1: Read the block being replaced, whole**

`bug-eater/SKILL.md` lines 57–64. Two things in it must survive the edit:
- The 80% inference claim and the instruction to **infer loudly rather than ask** — that bias is the lane's whole economy, and it is what the new text is most likely to break.
- The mechanism that makes the guess safe: the inferred behaviour becomes the red test's assertion verbatim at step 4e, so a wrong inference lands in the one line of test code a reviewer reads anyway.

The edit tightens what must be writable. It does not loosen who gets asked.

- [ ] **Step 2: Write the replacement block**

Replace lines 57–64 with:

```markdown
**Exit test — can you write these three?**

- What is happening
- What should happen instead
- **The assertion that tells those two apart** — the one line of test code, naming the value, the condition, and the expected result

The third is the real gate. The first two are prose and prose is always writable; a bug enters this lane on whether its symptom can be made falsifiable, and that is a question about the assertion. The second is inferred about 80% of the time — **infer it, and the assertion with it, loudly** rather than asking. It goes in `summary.md` as an assumption, into the PR body where a reviewer can challenge it, and becomes the red test's assertion verbatim at step 4e. Asking Amel what correct behaviour looks like on every ticket is a defect; he would have guessed it too.

All three writable → proceed.

The assertion unwritable splits two ways, and they are different exits:

| Why it cannot be written | State | Artifact |
|---|---|---|
| A fact is missing that only the reporter has — no repro conditions, no description a symptom can be parsed out of, a thread that could not be read | `needs info` | `questions.md`, ready to paste |
| Two answers are each defensible and someone must choose — which platform's default is correct, which of two behaviours the contract should promise | `decision needed` | `memo.md` — the two candidate assertions, the trade-off, who decides |

**The second row is the new exit, and it is the expensive one to get wrong.** An item whose assertion is a choice will pass the first two sentences, enter the lane, survive gather, survive the chain, and stall at step 4e with a build already spent. Catch it here. A cross-platform default mismatch is the canonical case: "they differ" is a fact, "they should match" is a fact, and "which one moves" is not.

**Do not confuse unknown with undecidable.** An assertion you have to guess at is inferred and stated, as above — that is the 80% case and it proceeds. Only an assertion that two reasonable engineers would write differently *on purpose* stops the item.
```

- [ ] **Step 3: Update the terminal-state table in the same file**

Step 2 makes `decision needed` reachable at step 1. The table at line 33 still reads "step 5 or 7", so the file would contradict itself two screens apart. The `needs info` row already reads "step 1 or 3" and needs nothing.

Change the `decision needed` row's "Reached at" cell to:

```markdown
| `decision needed` | step 1, 5 or 7 | `memo.md` — what changed, the trade-off, who decides. Also covers "already in flight" (step 5), and an assertion that is a choice rather than a gap (step 1). |
```

- [ ] **Step 4: Check the block against MOSAIC-3814**

Read the new block with MOSAIC-3814's gathered facts in front of you: Android defaults `Alignment.Top`, iOS defaults `.center`, same response JSON renders differently, and `row_alignment` needs clarification.

Expected: sentences one and two writable; assertion unwritable because either platform moving is defensible; exit `decision needed` with a memo naming both candidate assertions. **Not** `needs info` — nothing is missing from the report.

This is Review Focus item 4. If the block routes this to `needs info`, the table's two rows are not distinguishable as written and the wording needs another pass.

- [ ] **Step 5: Check the block against MOSAIC-3289**

Same read, with 3289's facts: conditional colour expressions evaluate on `image` elements but are ignored on `text` elements under `type: "container"`.

Expected: all three writable, item proceeds. The assertion is roughly *a text element under a container parent, given a true conditional colour expression, resolves to TOKEN_A* — inferable without asking anyone, which is exactly the 80% case.

If the new block stops this item, it is too tight and has broken the lane's economy. That is the regression this step exists to catch.

- [ ] **Step 6: Check the block against MOSAIC-3981**

3981's facts after task 1: a Slack thread, plus the ticket's own two questions — which behaviour was original, and would fixing it break existing consumers.

Expected: whether this exits depends on what the thread contained, and both outcomes must be reachable from the block as written. If the thread establishes which behaviour is intended → assertion writable, proceed. If it does not → the "would fixing it break consumers" question is a choice, not a gap → `decision needed`.

What must **not** happen: the block reading as licence to ask Amel which behaviour was original. He is not the reporter (`bug-eater` step 1, Stop 1). This is Review Focus item 3 — confirm the "infer loudly" instruction still governs and the new text did not quietly invert it.

- [ ] **Step 7: Commit**

```bash
cd ~/Projects/Amel/Scruffy
git add bug-eater/SKILL.md
git commit -m "Step 1 exits on whether the red test's assertion is writable; undecidable assertion is decision needed, not needs info"
```

---

## Task 3: The PR-comment backfill runs on a schedule

**Why:** `references/learning.md` calls the backfill "the only trigger the correction loop has" and hangs it off preflight — so the loop advances only when a new run starts, which is the one event uncorrelated with Amel leaving a comment. The evidence that this fails is in the files: all 7 `LEARNED.md` entries are self-observed, 0 came from him, and 4 ledger rows added after 2026-09-18 still have a blank outcome. `learning.md`'s own "Health of the loop" section names this exact signal.

**And the command it prescribes is blind.** Measured during planning (see the table above): `gh pr view --json comments,reviews` cannot see inline review comments, which is where 5 of the 11 comments on the ledger's PRs live. So this task fixes two defects — the trigger cadence and the fetch itself — and fixing only the first would have shipped a schedule that reliably fetched the wrong half.

**Files:**
- Create: `scruffy/scripts/backfill-ledger.py`
- Create: `~/Projects/tickets/PENDING-LEARNING.md` (first run creates it; not in this repo)
- Modify: `scruffy/references/learning.md` — the "The trigger problem, and the fix" section
- Modify: `scruffy/references/preflight.md` — the Ledger backfill row (line 17)
- Modify: `scruffy/SKILL.md` — step 1, the paragraph describing where candidate rules come from (lines 66–68)
- Modify: `scruffy/references/dossier.md` — the "A run never writes its own PR outcome" paragraph (line 76)

**Interfaces:**
- Consumes: `~/Projects/tickets/LEDGER.md` rows with a PR link. Three fetches per PR, because no single one returns everything: `gh api repos/{owner}/{repo}/pulls/{n}/comments` (inline, attached to file and line), `gh api repos/{owner}/{repo}/issues/{n}/comments` (conversation), and `gh pr view <url> --json state,reviewDecision,mergedAt,reviews` (outcome plus review bodies).
- Produces: `~/Projects/tickets/PENDING-LEARNING.md` (candidate rules awaiting approval) and `~/Projects/tickets/.backfill-state.json` (last-seen comment id per PR, plus the outcome fields preflight reads). The spine's step 1 reads the first; the script reads and writes the second. Nothing else reads either.
- Classifies each comment author as `amel`, `bot`, or `other`, and carries that class through to the pending file. `learning.md` has two entry shapes and neither fits a bot finding, so the class is what stops one being filed as his words.

- [ ] **Step 1: Write the script**

Create `scruffy/scripts/backfill-ledger.py`. Read-only against every PR; its only writes are the pending file and the state file.

```python
#!/usr/bin/env python3
"""Fetch new PR comments for ledger rows and report what has not been seen.

Three sources per PR, because no single one returns everything:
  inline review comments   gh api repos/{o}/{r}/pulls/{n}/comments
  conversation comments    gh api repos/{o}/{r}/issues/{n}/comments
  review bodies + outcome  gh pr view --json state,reviewDecision,mergedAt,reviews
Measured 2026-09-30: `pr view --json comments` misses every inline comment, which
was 5 of the 11 comments on the ledger's PRs.

Read-only against GitHub. Writes only PENDING-LEARNING.md and .backfill-state.json.
Never edits LEARNED.md — see scruffy/references/learning.md, "Propose, do not self-append".
"""
import json, re, subprocess, sys
from pathlib import Path

TICKETS = Path.home() / "Projects" / "tickets"
LEDGER = TICKETS / "LEDGER.md"
PENDING = TICKETS / "PENDING-LEARNING.md"
STATE = TICKETS / ".backfill-state.json"
PR_RE = re.compile(r"https://github\.com/([\w.-]+)/([\w.-]+)/pull/(\d+)")
AMEL = {"ameldizdarevic", "amel-dizdarevic"}


def pr_refs():
    """(url, owner, repo, number) for every distinct PR link in the ledger."""
    seen, out = set(), []
    for owner, repo, num in PR_RE.findall(LEDGER.read_text()):
        url = f"https://github.com/{owner}/{repo}/pull/{num}"
        if url not in seen:
            seen.add(url)
            out.append((url, owner, repo, num))
    return sorted(out)


def gh(args):
    proc = subprocess.run(["gh"] + args, capture_output=True, text=True)
    if proc.returncode != 0:
        return None, proc.stderr.strip().splitlines()[-1] if proc.stderr else "failed"
    return json.loads(proc.stdout or "null"), None


def author_class(login):
    low = login.lower()
    if low in AMEL:
        return "amel"
    if low.endswith("[bot]") or "bot" in low.split("-"):
        return "bot"
    return "other"


def comments(owner, repo, num):
    """Every comment body across all three sources, deduped by a stable id."""
    out, errors = [], []

    inline, err = gh(["api", f"repos/{owner}/{repo}/pulls/{num}/comments",
                      "--paginate"])
    if err:
        errors.append(f"inline: {err}")
    for c in inline or []:
        out.append({"id": f"inline:{c['id']}",
                    "author": c.get("user", {}).get("login", "?"),
                    "where": f"{c.get('path')}:{c.get('line')}",
                    "body": c.get("body", "")})

    conv, err = gh(["api", f"repos/{owner}/{repo}/issues/{num}/comments",
                    "--paginate"])
    if err:
        errors.append(f"conversation: {err}")
    for c in conv or []:
        out.append({"id": f"conv:{c['id']}",
                    "author": c.get("user", {}).get("login", "?"),
                    "where": "conversation",
                    "body": c.get("body", "")})

    pr, err = gh(["pr", "view", f"https://github.com/{owner}/{repo}/pull/{num}",
                  "--json", "state,reviewDecision,mergedAt,reviews"])
    if err:
        errors.append(f"reviews: {err}")
        pr = {}
    for r in (pr or {}).get("reviews") or []:
        if (r.get("body") or "").strip():
            out.append({"id": f"review:{r.get('id') or r.get('submittedAt')}",
                        "author": r.get("author", {}).get("login", "?"),
                        "where": f"review ({r.get('state')})",
                        "body": r.get("body", "")})

    for c in out:
        c["class"] = author_class(c["author"])
    return out, pr or {}, errors


def main():
    state = json.loads(STATE.read_text()) if STATE.exists() else {}
    report, errors, new_total = [], [], 0

    for url, owner, repo, num in pr_refs():
        found, pr, errs = comments(owner, repo, num)
        errors += [f"{url} {e}" for e in errs]
        seen = set(state.get(url, {}).get("seen", []))
        fresh = [c for c in found if c["id"] not in seen]
        state[url] = {
            "seen": sorted(seen | {c["id"] for c in found}),
            "state": pr.get("state"),
            "reviewDecision": pr.get("reviewDecision"),
            "mergedAt": pr.get("mergedAt"),
        }
        if not fresh:
            continue
        new_total += len(fresh)
        report.append(f"## {url}\n")
        report.append(f"Outcome: {pr.get('state')} / "
                      f"{pr.get('reviewDecision') or 'no decision'}\n")
        for c in fresh:
            report.append(f"### {c['author']} [{c['class']}] — {c['where']}\n")
            report.append(c["body"].strip() + "\n")
        report.append("")

    STATE.write_text(json.dumps(state, indent=2) + "\n")

    if errors:
        print("ERRORS", file=sys.stderr)
        for e in errors:
            print("  " + e, file=sys.stderr)

    if not new_total:
        print("NO NEW COMMENTS")
        return 0

    PENDING.write_text(
        "# Pending learning\n\n"
        "New PR comments since the last check. Generalize each into a candidate "
        "rule per `scruffy/references/learning.md`, show Amel, then clear this file.\n\n"
        "**Author class decides the entry shape.** `[amel]` may become a "
        "`**He said:**` entry with his words verbatim. `[bot]` and `[other]` may "
        "not — a bot finding is real material but it is not him speaking; draft it "
        "as `**Context:**`, or route it to the repo's `CLAUDE.md` per learning.md's "
        "table. **Nothing here appends to LEARNED.md without his approval.**\n\n"
        + "\n".join(report))
    print(f"NEW COMMENTS: {new_total} -> {PENDING}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
```

Two details that matter. `--paginate` is on both `api` calls because a PR with a long review can exceed one page and a silently truncated fetch is the same class of bug as the blind command this replaces. And `AMEL` is a set of logins rather than one string because the GitHub handle on the Deliveroo repos may differ from the DoorDash one — confirm both in step 2 and correct the set if either is wrong.

- [ ] **Step 2: Run it against the real ledger and verify the counts match**

```bash
cd ~/Projects/Amel/Scruffy && python3 scruffy/scripts/backfill-ledger.py
```

Expected on the first run: 7 PR URLs discovered (3 in `deliveroo/rooblocks`, 4 in `doordash/codeless`), and because the state file does not exist yet every existing comment counts as new — so `PENDING-LEARNING.md` is written with all of them. A `gh` auth or permission failure prints to the ERRORS block and does not abort the other repos.

**Check the total against the measured table in this plan's header: 11 comments plus 4 review bodies.** A total near 6 means the script is only seeing conversation comments and the three-source fetch did not work — which is the exact defect this task exists to fix, so it must not pass silently.

Then read `PENDING-LEARNING.md` and confirm two things: `doordash/codeless#534` shows the two inline findings at `AppearCascadeForwardingWrapperTests.swift`, and every entry carries an author class. While reading, note the login on any comment of Amel's and correct the `AMEL` set if it is not `ameldizdarevic`.

This is the first time the loop has looked at these comments.

- [ ] **Step 3: Verify the state file makes a second run idempotent**

```bash
python3 scruffy/scripts/backfill-ledger.py
```

Expected: `NO NEW COMMENTS`, and `PENDING-LEARNING.md` unchanged from step 2.

This is Review Focus item 5. A cron that re-proposes the same comments every week produces a pending file nobody trusts, which is the same failure mode `learning.md` warns about for a self-appending `LEARNED.md`.

- [ ] **Step 4: Rewrite the trigger section in `learning.md`**

Replace the "The trigger problem, and the fix" section's fix paragraph and code block. The problem statement above it is correct and stays. The new text:

```markdown
**So a scheduled job fetches them, not a run.** Hanging this off preflight made the trigger "a new run starts" — the one event uncorrelated with him commenting. Between 2026-09-18 and 2026-09-30 no run started, four ledger rows kept a blank outcome, and `LEARNED.md` stayed entirely self-observed.

`scruffy/scripts/backfill-ledger.py`, weekly, independent of any run. Every ledger row with a PR link, diffed against `~/Projects/tickets/.backfill-state.json` so the same comment is never proposed twice. New comments land in `~/Projects/tickets/PENDING-LEARNING.md`.

**Three fetches per PR, not one.** `gh pr view --json comments` returns conversation comments only — measured 2026-09-30, it was blind to 5 of the 11 comments on the ledger's PRs, because inline review comments live at `gh api repos/{owner}/{repo}/pulls/{n}/comments` and review bodies are a third source again. A code reviewer's corrections are mostly inline, which is to say the old recipe missed the most valuable half. Never fetch comments with one call.

**The script does not generalize and does not append.** It reports. The scheduled session that runs it generalizes each new comment into a candidate rule per this file's rules, and leaves them in the pending file for Amel. A run's step 1 reads that file and shows him what is waiting. His review happens whenever it happens; the loop picks it up within a week either way.
```

Then add a subsection under the two entry shapes in the `## Format` section, because a third author class now reaches this file:

```markdown
### Not every comment is his

The backfill tags each comment `amel`, `bot`, or `other`. Only `amel` can become a `**He said:**` entry — the shape exists because a verbatim quote does not drift, and a quote that is not his defeats the point.

A `bot` finding — Flux Review Agent and the like — is still real material: it caught something, and what it caught generalizes. Draft it as `**Context:**`, or route it per the table above, which usually sends a convention finding to the repo's own `CLAUDE.md`. An `other` comment from a reviewer on a team we do not own is the same: `**Context:**`, with who said it recorded in the body rather than in the shape.
```

- [ ] **Step 5: Update preflight's ledger row to read the pending file**

Preflight stops being the fetcher and becomes a reader. Replace the Ledger backfill row (line 17) with:

```markdown
| Pending learning | Read `~/Projects/tickets/PENDING-LEARNING.md` if it exists — candidate rules the weekly backfill left for approval. Bash, no model; the generalizing happened in the scheduled session. Surface them at step 1 before dispatching. |
| Ledger backfill | Fill the PR-outcome column from `~/Projects/tickets/.backfill-state.json`, which the weekly job maintains. **Only fetch directly when that file is missing or older than the oldest blank row** — `scruffy/scripts/backfill-ledger.py` then runs here once, and the weekly schedule is reported as broken. Read comment bodies for attached images or screenshot requests to fill the pair-outcome column. |
```

- [ ] **Step 6: Update the spine's step 1 and the dossier's ledger paragraph**

In `scruffy/SKILL.md` step 1, the paragraph beginning "Preflight's ledger backfill (step 4) also pulls **new PR comments since the last run.**" — the mechanism moved, so the sentence is now wrong. Replace with:

```markdown
The weekly backfill leaves candidate rules in `~/Projects/tickets/PENDING-LEARNING.md`; preflight reads it. Show them to Amel before dispatching: *"three comments since the last check — here is what I would write down."* He approves, edits, or discards.

The schedule is what makes this work, not the run — a run ends when the PR opens, before he has reviewed it, so nothing inside a run can ever pick his comments up. **An empty or missing pending file plus a `LEARNED.md` that is still entirely self-observed means the schedule is not firing.** Report that as a finding, not as "no feedback".
```

In `scruffy/references/dossier.md`, the paragraph at line 76 says preflight of the next run backfills the outcome. Correct it to name the weekly job as the writer and preflight as the reader, keeping the last sentence — "A column that never fills makes the whole ledger decorative" — which is now load-bearing.

- [ ] **Step 7: Verify the bot class does not become a `He said:` entry**

With `PENDING-LEARNING.md` from step 2 in front of you, take the `flux-dd-4[bot]` finding on `#534` — the `MEDIUM` suggestion that root on-disappear dispatch is untested — and draft its candidate rule per `learning.md` as step 4's new subsection now directs.

Expected: a `**Context:**` entry, or a routing decision sending it to the repo's `CLAUDE.md`. **Not** a `**He said:**` entry, and no verbatim quote attributed to Amel.

This is Review Focus item 6. It is a cheap check and the failure is the kind that would sit in `LEARNED.md` unnoticed for months — an entry that reads as his instruction when he never said it.

- [ ] **Step 8: Schedule it locally, and fire it once by hand**

Use `CronCreate` — **not** the `schedule` skill, whose routines run in the cloud. The job reads `~/Projects/tickets/LEDGER.md` and runs a script from `~/Projects/Amel/Scruffy`; a cloud routine cannot see either path and would report `NO NEW COMMENTS` forever, which is indistinguishable from a quiet week. That is Review Focus item 7, and it is the same silent-success failure this whole task exists to remove.

Monday 09:00 local, prompt:

```
Run scruffy/scripts/backfill-ledger.py from ~/Projects/Amel/Scruffy. If it reports
NO NEW COMMENTS, stop silently. Otherwise read ~/Projects/tickets/PENDING-LEARNING.md
and, for each new comment, draft the general rule it implies per
scruffy/references/learning.md — the format, the author-class rule for which entry
shape is allowed, the too-narrow/too-broad test, and the routing table for where each
correction belongs. Rewrite PENDING-LEARNING.md with the drafted candidates beside each
comment. Do not append to LEARNED.md, do not edit any target repo, do not open a PR.
Then notify Amel with the count and one line per candidate.
```

Weekly is the right cadence because PR review comments arrive on human timescales; daily would no-op most days and a no-op notification trains him to ignore it.

**Then trigger the job once manually and confirm it produced output**, before trusting the schedule. A cron that was created but never fires is the failure mode this task is correcting, so the plan does not end on an unfired schedule.

- [ ] **Step 9: Commit**

```bash
cd ~/Projects/Amel/Scruffy
git add scruffy/scripts/backfill-ledger.py scruffy/references/learning.md \
        scruffy/references/preflight.md scruffy/SKILL.md scruffy/references/dossier.md
git commit -m "Fetch PR comments from all three sources on a weekly schedule; preflight reads the pending file instead of being the loop's only trigger"
```

`PENDING-LEARNING.md` and `.backfill-state.json` live in `~/Projects/tickets/`, not in this repo, so they are not staged — same as `LEDGER.md` today.

---

## Self-review

**Spec coverage.** Task 1 covers the Slack finding (4 of 6 tickets). Task 2 covers the MOSAIC-3814 exit-test finding. Task 3 covers both feedback-loop defects — the trigger cadence (7 self-observed entries, 0 from him, 4 blank outcome rows) and the blind fetch (5 of 11 comments invisible to the prescribed command). Parity mode is named out of scope with its reason and its own follow-up. The `decision needed` routing idea was considered and rejected in conversation (Amel already does it by hand; the ledger shows MOSAIC-3869 assigned to Mitch Little) and is deliberately absent.

**Placeholders.** None. Every edit gives the literal replacement text; the script is complete and runnable; the cron prompt is written out.

**Consistency.** `PENDING-LEARNING.md` and `.backfill-state.json` are named identically in the script, in `learning.md`, in preflight's two rows, in the spine's step 1, and in the cron prompt. `evidence/slack-thread-<n>.md` is named identically in both lanes and registered in `dossier.md` by task 1 step 5. The three author classes (`amel`, `bot`, `other`) are the same three in the script's `author_class`, in the pending file's header text, in `learning.md`'s new subsection, and in task 3 step 7's check. Terminal states used are only the ones already in the tables: `needs info`, `decision needed` — and task 2 step 3 updates the one table row that would otherwise contradict its own file.

**Review Focus coverage.** Item 1 → task 1 step 4. Item 2 → task 1 step 7. Item 3 → task 2 step 6. Item 4 → task 2 step 4. Item 5 → task 3 step 3. Item 6 → task 3 step 7. Item 7 → task 3 step 8. All seven pinned.

**Two honest gaps.**

Tasks 1 and 2 are prompt edits, so their acceptance checks are readings against real tickets rather than automated tests. That is the strongest available check for a skill file, and it matches how this repo verified the capture agent (smoke-tested on the Settings app). It is weaker than a red test and the plan does not pretend otherwise. Task 3's checks are mechanical and its comment counts were measured, not assumed.

The `AMEL` login set is a guess pending step 2. If his handle on `deliveroo/rooblocks` differs from `ameldizdarevic`, every comment of his there classifies as `other` and is drafted in the wrong entry shape — a quiet, plausible-looking wrong answer. Step 2 says to check it against real output; do not skip that line.
