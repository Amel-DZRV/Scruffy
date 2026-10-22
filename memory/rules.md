# Learned

## 2026-08-25 — Read whole Jira field blocks; never grep for the value you expect
**Context:** MOSAIC-3559, first Scruffy run. The `*all` field dump was too large to read, so I grepped it. My grep for the platform searched for `Codeless|Mosaic` and returned labels `codeless` and `sdui` — it missed the third label, `ios`, sitting in the same array. I was one step from asking Amel "which platform?" — a question the ticket already answered.
**So:** when a Jira dump is too big to read whole, parse it with `python3 -c "import json; d=json.load(...)"` and print the fields you need in full — `labels`, `attachment`, `issuelinks`, `parent`, `components`, `comment.comments`. Never grep an array for the value you are hoping to find; you cannot see what you did not think to search for. Asking him something the ticket answers is the defect this skill exists to prevent.

## 2026-08-25 — Preflight must check the simulator the repo's own scripts ask for
**Context:** MOSAIC-3559. Preflight passed on "an iOS simulator boots" — 11 were available. But `scripts/test-ios-renderer` and `scripts/ios-ui-tests.sh` both hardcode `name=iPhone 11` with `OS_VERSION:-18.5`, and CI pins Xcode 16.4. This machine has only Xcode 26.6 and the iOS 26.5 runtime, so neither script can run unmodified.
**So:** read the repo's test and launch scripts in preflight, extract the device name, OS version and Xcode version they actually use, and assert those exist. Report the divergence up front. Any green obtained on a different toolchain than CI's is reported as "green on Xcode X / iOS Y", never as "CI green".

## 2026-08-25 — Long git operations need a background run, not a foreground timeout
**Context:** MOSAIC-3559. `git rebase origin/main` in `rooblocks` was killed by the 2-minute foreground tool timeout mid-checkout of 69,044 files, leaving the worktree with 409 dirty files and a half-finished rebase.
**So:** in a repo over ~10k files, run every checkout, rebase, worktree add and clone in the background or with an explicit long timeout. Check the file count in preflight and say which category the repo is in. After any interrupted git operation, `git rebase --abort` is not enough — verify with `git status --short | wc -l` and hard-reset if the tree is still dirty.

## 2026-08-25 — Two failed attempts at a red test is a finding, not a licence to weaken it
**Context:** MOSAIC-3559. Wrote a test counting how many times a child's on-appear action reaches the host. It recorded 0, not 1 and not 2 — for a text child as well as an icon one — while a separate assertion confirmed the component did fire. The host-handler seam is not observable from `makeSut`, which builds a `ComponentModel` with no store.
**So:** when the count comes back neither the expected value nor the buggy value, suspect the seam before the diagnosis, and assert something already known to work in the same test to tell those apart. On hitting the two-attempt cap, write the gap up plainly and push nothing. Never edit the assertion until it passes — a test that cannot fail on the reporter's symptom is the exact defect this workflow was built to catch in other people's work.

## 2026-08-25 — Never run an unscoped string replace over a file you did not write
**Context:** MOSAIC-3559. Editing my own two new tests, I replaced `advanceRunLoop { !sut.viewModel.shouldFireOnAppearAction }` with `advanceRunLoop { recorder.count > 0 }` across the whole file. It also hit the pre-existing `unifiedOnAppearOnChild` test, which had no `recorder`, breaking someone else's passing test and costing a full build cycle to discover.
**So:** scope every edit to a line range or a match anchored inside the function being changed, and assert the expected occurrence count before writing (`assert s.count(old) == 1`). After any edit to a shared file, run `git diff origin/<base> -- <file>` and read it — the diff must touch only what you meant to touch. This matters most in a repo Amel does not own: a silent edit to an unrelated test is the kind of thing that gets a PR rejected on sight.

## 2026-09-29 — A regression test must not reference symbols the fix introduces
**Context:** MOSAIC-3559, second run. My first version of the appear-cascade test detected the wrapper with `subview is AppearActionForwarding` — the marker protocol the fix adds. It passed green, but when I reverted the source to prove red, the test file would not compile: `cannot find type 'AppearActionForwarding' in scope`. A test that cannot build against the unfixed code can never be shown to fail, so it proves nothing.
**So:** before claiming red→green, check that every symbol the test file references exists on the base commit. Assert the condition through pre-existing types (here the concrete `SizingView`), not through anything the diff introduces. The red run is not optional decoration — design the test so reverting only the source files still compiles.

## 2026-09-29 — Never read a build's exit code off the end of a pipeline
**Context:** MOSAIC-3559. I ran `xcodebuild ... > log 2>&1; echo "EXIT=$?"; tail -25 log` in the background. The harness reported "exit code 0" and I recorded the build as passing; the log actually ended in `** TEST BUILD FAILED **`. The 0 was the exit status of `tail`, not of `xcodebuild`.
**So:** capture the status of the command under test into a variable or file on the line that runs it (`cmd > log 2>&1; echo $? > cmd.exit`) and read that, and additionally grep the log for the tool's own success marker (`** BUILD SUCCEEDED **` / `** TEST SUCCEEDED **`). Treat a green exit code with no success marker in the log as a failure, not a pass. A masked build failure is the cheapest way to report a fix that never compiled.

## 2026-10-02 — A ticket's fix-site diagnosis can be half right in a way only a property override reveals
**Context:** MOSAIC-3537. The ticket said the fix belonged in `SegmentedContainerController`'s selection handler, but the only `navigationItem.searchController` assignment in the code was on the *child* (`SamplesListViewController`), which is `addChild`-ed, not pushed — so by the usual UIKit model the container's nav bar shouldn't see it at all. Reading one more line resolved it: the child overrides `var navigationItem: UINavigationItem { parent!.navigationItem }`, so its assignment was landing on the container the whole time.
**So:** when a reporter's prescribed fix site looks structurally impossible given the view hierarchy, grep the suspect child for an overridden `navigationItem` (or similar proxied property) before concluding the diagnosis is wrong or filing a "fix site doesn't match the code" blocker. An overridden computed property is an easy thing to miss reading top-to-bottom, and it is exactly the kind of indirection that makes "which object owns this state" unanswerable from the two files the ticket names.

## 2026-10-02 — Worktree creation does not carry over a working-tree-only patch from the main checkout
**Context:** MOSAIC-3537, this run. A prior run's MOSAIC-4516 patch (two-line type annotation, deliberately left uncommitted) existed in the main checkout. Creating `.worktrees/MOSAIC-3537` from `main` via `git worktree add` produced a fresh checkout at the last commit — the uncommitted patch was not there, and the build failed until it was re-applied inside the worktree.
**So:** when a dossier or ledger entry names a working-tree-only patch as a precondition, re-apply it inside each new worktree explicitly — it will not follow you from the main checkout or from a prior worktree. Check for it with the same build-failure signature before assuming the toolchain regressed.

## 2026-10-13 — Every branch a fix adds gets a test that fails when the branch is flipped
**Context:** MOSAIC-3521. The fix added an RTL flip and a liquid-glass guard. The red test covered only the reported symptom (LTR), so a reviewer found both branches unpinned. Amel approved this rule.
**So:** list each new `if`/`guard`/ternary in `parent..head` and name the test that fails if it is inverted. Check by mutation: flip the condition, run the owning tests, expect red, restore. An unpinned branch goes on the `Not proven` line and caps the verdict at REVIEW NEEDED.

## 2026-10-13 — A new test is not proven until it fails with its guard disabled, and it asserts its own precondition
**Context:** MOSAIC-3521. My first RTL test passed with the RTL flip disabled: it never rendered right-to-left (setting `semanticContentAttribute` after construction does nothing; the direction is passed to `FlexLayoutAdapter.makeLayout` and needs a `traitOverrides.layoutDirection`), and English text sat left-aligned in a wide box, so it never touched the padded edge.
**So:** after writing a test for a guard, disable the guard and watch the test go red. Assert the precondition inside the test (e.g. `effectiveUserInterfaceLayoutDirection == .rightToLeft`) and pin anything that makes the assertion vacuous (text alignment).

## 2026-10-13 — Layout bugs: ask for direction/locale, infer LTR when the ticket is silent
**Context:** MOSAIC-3521. `padding-left` mirrors on iOS and Android and not on web. The interview checklist had no direction row, so RTL was never recorded as a condition. Amel approved this rule tentatively ("i guess").
**So:** for any padding, margin, alignment or ordering bug, add the layout direction/locale to the interview. When the ticket is silent, assume LTR and write that under `assumptions:` so it reaches the PR body.

## 2026-10-13 — Read earlier attempts on the same component for failure modes, after your own fix exists
**Context:** MOSAIC-3521 was run from scratch on instruction, which correctly kept #423 and its dossier out of the diagnosis. That also hid the one known trap (left/right mix-up on a first pass).
**So:** keep "do not look for PRs on this ticket" until the fix and red test exist. Then read closed or archived attempts on the same component, read-only, and extract only their failure modes into the axes checklist (direction, wrapper views, other element kinds). Do not reuse their code.

## 2026-10-13 — macOS has no `timeout`, and a mutate-run-restore step must restore on a trap
**Context:** MOSAIC-3521. `timeout` is missing on macOS (exit 127, read before reading any test delta). `xcodebuild test-without-building` can hang after printing its result. A restore with a relative path inside a trap failed once because the script had changed directory.
**So:** use `perl -e 'alarm N; exec @ARGV' cmd` for time limits. Put the restore in a `trap ... EXIT` that uses absolute paths, and check `git status` afterwards. Gate test runs on the `TEST BUILD SUCCEEDED` marker.
