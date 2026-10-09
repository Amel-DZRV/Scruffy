# Path library

One file per screen, `<repo>/<screen>.md`, in the shape of `TEMPLATE.md`. A path is how the capture agent reaches a screen without Amel.

## Lookup

Scruffy's step 1 (gather) derives `<screen>` from the ticket's component or template name, kebab-cased, and looks for a path file under `paths/<repo>/`. `<screen>@<os>.md` for the current runtime is preferred over `<screen>.md`; if neither exists, it is not found. Not found → `record` mode, done at the intake gate with Amel present — never mid-run. Found and `status: fresh` → `capture` mode. Found and `status: stale` → a `repair path file <path>` ask at the intake gate, never an automatic re-record — except a `stale_reason` naming `os`, which records `<screen>@<os>.md`.

## Who writes what

| Event | Written by | Approval |
|---|---|---|
| Gated success in `record` mode | the agent, new file, `status: fresh` | none — the gate verified it |
| Record run with an unresolved tap | the agent, new file, `status: stale`, `stale_reason` naming the transition | none — Amel fills the `tap` line by hand, then sets `fresh` |
| `PATH STALE` from the agent | the caller flips `status: stale`, fills `stale_reason` — except when the reason is that the file already exists, then nothing is flipped; the item parks with the handoff `path exists: repair or rename <path>` | none |
| Successful replay of a stale path after a fix to it | the caller sets `fresh`, updates `verified` | none |
| Editing steps by hand | Amel | he is the approval |

Recorded files are committed to Scruffy at the end of the run — step 10 does it alongside the ticket comment.

Recipes append without approval because a wrong recipe fails its own replay and is marked stale. That is the whole difference between this library and `LEARNED.md`: a rule cannot be replayed, a path can.

## Staleness

A stale path is not deleted. It is the best starting point for repairing it — most staleness is one renamed label, not a new flow. The agent refuses a stale path before the first tap so a bad recipe never costs a build's worth of navigation.

Device or OS mismatch is staleness too. A path recorded on iOS 26.5 is not tried on 27.0; it is `PATH STALE` naming `os`. That is the one staleness the retry may record through, and it records into `<screen>@<os>.md` rather than over the old file. Keep both; the old one is correct for its runtime.

Every other `stale_reason` — a renamed label, an unresolved tap, a changed flow — is repaired by hand, not re-recorded. Recording over a stale file destroys the diff that shows what moved, which is the whole reason a stale path is kept.

## Naming

`<screen>` names the screen, not the bug. `care-home-carousel`, not `MOSAIC-3559`. Two bugs on one screen share one path.

A `@<os>` suffix — `care-home-carousel@27.0.md` — marks a path recorded for one runtime after the runtime-less file went stale for `os`. The suffix is the runtime version exactly as the device-identity one-liner prints it. A bare `<screen>.md` is the path for every runtime that has not needed its own.

## What is not here

Commands. Those live in `scruffy/references/platforms/`. Repo launch skills. Those live in the repos and are named by `references/repo-routing.md`. A path names a skill; it does not copy it.
