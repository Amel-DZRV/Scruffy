---
repo: <repo key or path, e.g. relentless>
export: <path to the export's .html, relative to the repo>
platform: android | ios
device: <model, e.g. sdk_gphone64_x86_64 | iPhone SE (3rd generation)>
os: <runtime version>
scale: <device px per dp after pinning, e.g. 2.88>
verified: <YYYY-MM-DD> @ <repo sha the recipes last replayed on>
---
<!-- One section per frame in scope. File name: frames/<repo>/<export-slug>.md. Committed like a path file:
     a recipe that replays is kept; one that stops replaying is marked, not deleted. -->

## f<index> · <frame label, verbatim from mock-extract --list>
theme: light | dark
route: <deep link, e.g. relentless://training/programs — or a path file name from scruffy/paths/>
steps:
<tap <label> [role] | wait <label> [timeout] — one per line, labels only>
state: <what data the frame assumes, and how this device gets it: already there | seed <recipe> | create through the UI (mutates) | unreachable → skip>
status: fresh | stale: <the step or label that failed>

### Expect
- <element label> · <role from probes.md> · <expected outcome, observable in the tree> · source: <spec section | frame n | frame note | route table | default — spec silent> · mutates: yes | no
- <element label> · <role> · expected-DATA: not probeable — <the device state that removes it> · source: <…>      (functional status DATA)
- <app-only control> · <role> · <outcome> · source: <the sibling frame showing that state> · extra: yes      (ledger key <platform>.f<n>.x<slug>)
