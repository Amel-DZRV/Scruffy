# Which app to build

Decided at step 3, recorded in `state.md` as `app:` and repeated in the PR's "How to reproduce the fix locally". A recipe under `../memory/<repo>/recipes/` for that app, when one exists, is followed and timed; the repo's own skill (`repo-routing.md`) is the source when there is none.

| Repo | Symptom in | Build | Repo skill |
|---|---|---|---|
| ios | one Mosaic feature, a component | **DevApp** with that feature — fastest | `devapp` |
| ios | navigation, deep link, app-level state, anything DevApp cannot host | **Consumer** | `run-doordash-consumer` (check the JDK path first — see `../memory/rules.md`) |
| rooblocks | a template's rendering | **sample app** | `sdui-accessibility-manual-test` |
| rooblocks | template-only, no native code touched | **Live Preview** | `live-preview-setup` |
| rooblocks | the Roo consumer app itself | **Roo Consumer** in `../doordash-ios` | that repo's launch skill |
| android | component | a sample / devapp target **if one exists** — the first run's recipe records which; until then **Consumer** | `using-android-cli` |
| pedregal | — | no simulator; stage the graph or sandbox | `running-graphs`, `sandbox-testing` |

When two rows fit, take the cheaper build. If the capture then fails `GATE FAILED` because the screen is not reachable in that app, retry once in the next row down, and write the lesson as a recipe trap.
