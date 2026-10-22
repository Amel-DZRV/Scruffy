# TickTick

A TickTick task is an intake source like a Jira key or a GitHub issue, with one extra property: this is Amel's own board, so Scruffy can write the status back instead of only commenting.

## Reading the task in

- Handed an id or URL → `get_task_by_id`.
- Handed a title or pasted description → `search_task`, then `get_task_by_id` on the match. More than one plausible match → `needs info`, do not guess which one he meant.
- Comments → `get_comment(project_id, task_id)`. Both ids come off the task object `get_task_by_id` returned.
- Read `content`, `desc`, and `items` (subtasks/checklist) whole — same rule as a Jira field block. A checklist item is a criterion or an attachment description exactly as much as a Jira field is.

**No repo-routing signal of its own.** A TickTick task is a personal or team list, not a project field naming an SDUI system or codebase. `references/repo-routing.md` still needs a signal — component name, template name, platform — somewhere in the task's text or a linked Jira/GitHub item. Neither present → `needs info`, not a guess.

**Not a linked-ticket destination.** "Linked tickets, one hop" in gather (step 1) still means Jira/GitHub. Adjacent breakage found mid-fix still gets its own Jira or GitHub issue filed — a TickTick checklist item is invisible to a reviewer on another team.

## Writing the status back

**Only on `PR opened`, and only for a TickTick-sourced item.** Every other terminal state leaves the task exactly where it is — a task that silently moved on `blocked` or `needs info` is a task Amel stops trusting the board for.

1. `list_columns(project_id)`. Find the column titled `In Review`, case-insensitive exact match.
2. Found it → `update_task(task_id, {columnId: <that column's id>})`. Moves the card; nothing else on the task changes.
3. Not found → **do not invent one and do not fuzzy-match a close name** (`Review`, `In review`, `Needs Review` are not the same column as far as this rule is concerned). Say so in `summary.md` — "no `In Review` column on this board; task left in place" — and move on. A wrong guess here is a card silently misplaced on a board nobody is re-checking.
4. Either way, `add_comment(project_id, task_id, <PR url>)`. The comment is what survives even when the column move can't happen, and it is the same "paste the link" step 10 already does for Jira and GitHub — TickTick is not a special case there.

## At the PR step

Step 10 ends with "comment on the ticket." For a TickTick-sourced item this step is: add the PR-link comment (always), then attempt the column move (step above). Neither substitutes for the other.
