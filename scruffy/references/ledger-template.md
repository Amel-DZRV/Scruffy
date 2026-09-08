# Ledger template

Preflight creates either file from here when it is missing. Never append to a file that has no header row — a ledger whose columns were invented by whichever run got there first cannot be sliced, and slicing is the only thing it is for.

Both live in `~/Projects/tickets/`. Column meanings are in `dossier.md`; this file is the shape only.

## `LEDGER.md`

One row per work item, appended at the end of the run. **The PR-outcome column is left blank** — the next run's preflight backfills it.

```markdown
# Ledger

One row per work item. PR outcome is backfilled by the *next* run's preflight, never by the run that opened the PR.

| date | key | lane | repo | cost class | terminal state | stops fired | what the fix touched | opus escalated | chain correct? | PR | PR outcome |
|---|---|---|---|---|---|---|---|---|---|---|---|
```

`stops fired` uses the run numbering from `scruffy` — 1 classification, 2 after gather, 3 before implementing — not each lane's local count. Empty is `none`.

`chain correct?` and `PR outcome` are both filled in after the fact. A run never grades its own output.

## `REVIEWS.md`

One row per PR reviewed in `verification` mode 3. Standalone verification runs write neither file.

```markdown
# Review log

One row per PR reviewed. Separate from the ledger: a review produces no stop, no lane and no PR of its own.

| date | PR | repo | radius | depth | independent test written? | confirmed the claim? | what it did not cover |
|---|---|---|---|---|---|---|---|
```

## Creating them

```bash
mkdir -p ~/Projects/tickets
[ -f ~/Projects/tickets/LEDGER.md ]  || <write the LEDGER.md block above>
[ -f ~/Projects/tickets/REVIEWS.md ] || <write the REVIEWS.md block above>
```

Bash, no model. Existing files are never overwritten, and a file whose header has drifted from this template is reported rather than rewritten — the rows in it are real data.
