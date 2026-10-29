# Repo routing

Which repo owns the symptom, and which of that repo's own skills builds, launches and stages the screen. Names only — the commands live in those skills, and a copy here would go stale. Read the skill; do not reimplement it.

## Reaching these skills

They live in `<repo>/.claude/skills/`, so `Skill` reaches them only when the session cwd is inside that repo. Otherwise `Read <repo>/.claude/skills/<name>/SKILL.md` and follow it directly. Same move for any skill whose frontmatter carries `user-invocable: true` or `disable-model-invocation: true`. A cross-platform ticket touching both `ios` and `android` can never have both in cwd, so read-and-follow is the normal case, not the fallback.

## Picking the repo

| Signal in the ticket | Repo |
|---|---|
| `SDUI System: Codeless Components`, RooConsumer app, PUMA team, `care_*` templates, `RooBlocksAdapter` | `codeless` — a clone of `doordash/codeless`: the one the session's cwd is in (`~/Projects/bugs_codeless` or one of its worktrees), else `~/Projects/codeless`. Check `git remote get-url origin` names `doordash/codeless` |
| Consumer-app verification for a Codeless template fix | `doordash-ios` — the sibling `../doordash-ios` worktree in the same stream, never an absolute `~/Projects/ios` path |
| `SDUI System: Mosaic` + iOS | `~/Projects/ios` → `Packages/Mosaic/` |
| `SDUI System: Mosaic` + Android | `~/Projects/android` → `doordash/libraries/common/mosaic/` |
| `HorizontalContainer`, `LayoutContainerAlignment`, `Alignment+ContainerAlignment` | both `ios` and `android` — cross-platform default mismatch |
| tracking_id, telemetry, feed assembly, DSL/contract | `~/Projects/pedregal` |

`deliveroo/rooblocks` is retired and will be deleted. Never route to it, clone it, or open a PR on it. An older ticket, dossier or ledger row that names `rooblocks` means `doordash/codeless` now.

**Isolation.** Every stream root has `.isolation/state/<Stream>.env` two levels up (`../../.isolation/state/<Stream>.env` from `codeless/` or `doordash-ios/`). Source it before any build/install/launch command — it sets `SIM_UDID` and `DERIVED_DATA_PATH` so this run doesn't collide with the other two streams' simulators or the `codeless` sample-app build output. (`doordash-ios` needs no explicit output-base override — Bazel already derives a separate one per worktree path; the isolation that matters there is `SIM_UDID` on the `bazel run` command, per that repo's own `run-doordash-consumer` skill.)

A Jira project of `MOSAIC` does not mean the code is in `codeless`. Two SDUI systems, two codebases.

## Staging the screen

Simulator or emulator by default; a physical device only when Amel asks. Staged means installed, launched, and sitting on the screen under test — a Homepage ticket ends with Homepage on screen, not the app's launch screen. Captures are taken by the `evidence-capturer` agent from a recorded path in `../memory/<repo>/paths/<screen>.md`. Amel navigates once per screen, in `record` mode, batched into the run's handoff list; after that the path replays. Tell him which screens need recording, not which screenshots you need.

**codeless** — sample app, not live preview, unless the symptom is template-only.
- `sdui-accessibility-manual-test` — the model for this step: generates the samples, detects attached devices and simulators, builds, installs, launches on the target you pick, then asks you to look. Also the screen-reader path.
- `live-preview-setup` — live server and live preview, for template-only symptoms
- `editing-templates`, `fix-flexbox` — template and layout work

**ios**
- `devapp` — run one feature in DevAppFramework instead of the whole app. Try this first; much faster than a full Consumer build.
- `run-doordash-consumer` — Bazel build, install, launch Consumer on a booted sim. Verify the JDK path before trusting a long build: this skill has shipped a dead `zulu-21.jdk` path that fails silently after ~35 minutes.
- `install-ios-sim-build` — install a CI artifact or a local `.app` and stream its console
- `using-ios-simulator-mcp` — agent-driven taps and UI description, for navigating to the screen
- `bug-triage` — reproduce-first triage when ownership or staleness is the open question
- `cleaning-stale-snapshots`, `fix-flaky-tests` — when the loop is the flake

**android**
- `using-android-cli` — emulators, APK deploy, screen capture, UI dumps
- `checking-android-a11y` — static layout a11y review
- `prism-xml-layoutlib-screenshot-failures` — Paparazzi and layoutlib screenshot failures

**pedregal** — no simulator. Stage the graph or sandbox instead.
- `debug-rx-store-item-pedregal`, `debug-rx-store-item-triage` — cross-layer store-item symptoms
- `graph-debugging`, `running-graphs`, `sandbox-testing`

**web** — out of scope for now.

## Trackers

Jira over the Atlassian MCP, projects `MOSAIC` and `GSPG`; write access works. GitHub via `gh`. TickTick via its own MCP tools — intake and status write-back, `references/ticktick.md`.
