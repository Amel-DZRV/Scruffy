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
