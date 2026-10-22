# Intake

Per item, by source:

| Source | How |
|---|---|
| Jira key or URL | Atlassian MCP `getJiraIssue`; when the dump is too large to read whole, parse it with `python3 -c "import json,sys; d=json.load(sys.stdin); ..."` and print `labels`, `attachment`, `issuelinks`, `parent`, `components`, `comment.comments` in full |
| GitHub issue / PR | `gh issue view <n> --comments`; `gh pr view <n> --comments --files` |
| TickTick | `../scruffy-bug/references/ticktick.md` |
| Slack thread, pasted text | as-is, into `state.md` under `## Source text` |

**Read whole field blocks.** A grep for the value you expect cannot see what you did not think to search for.

**Every attachment opened and described in words.** A screenshot is the broken state unless it plainly shows a working one — then it is a flag, not a thing to reinterpret. Stage a broken-state screenshot in a temp file and move it to `evidence/reporter-before.<ext>` when the dossier is created (Setup 5).

**Linked tickets, one hop.**

## Bug or feature — worked examples

| Ticket says | Lane | Why |
|---|---|---|
| "Icon fires its on-appear action twice" | bug | behaviour exists and is wrong |
| "Store header overlaps the status bar on iPhone 17" | bug | visual defect |
| "The retry button is missing on the error screen" — and `git log -S retry` shows it was never built | feature | nothing broke; something is wanted |
| "The retry button is missing on the error screen" — and it was removed in a commit last week | bug | it used to work |
| "Add dark-mode support to the store carousel" | feature | new behaviour |
| "Remove the deprecated `LegacyBadge` renderer" | feature | debt to remove |
| "Please review PR #1234" | neither | `verification` Mode 3 |

When the lane depends on a fact you can look up (was it ever built?), look it up. When it depends on intent you cannot, ask — one question, with your guess.
