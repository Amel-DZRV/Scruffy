---
repo: codeless
name: ios-sample-and-spectest
status: fresh
derived_from: .claude/skills/sdui-accessibility-manual-test
runs: 2
median_minutes: 12
---
## Steps
1. git worktree add --detach .worktrees/<KEY> origin/main (background)
2. make generate-samples (bundles templates' meta.samples into integration/samples)
3. xcodebuild -project renderers/ios/CodelessRenderEngine/SampleApp/CodelessSample.xcodeproj -scheme CodelessSample -configuration Debug -destination 'platform=iOS Simulator,id=<UDID>' -derivedDataPath <scratch>/dd build (background)
4. simctl install + launch uk.co.deliveroo.CodelessSample; Search AXImage in bottom toolbar, type the template name
5. Spectest: same derived data, xcodebuild test ... -only-testing CodelessRenderEngineTests/SpecTestSuite (~1 min incremental)
## Traps
- iOS spec decoder throws keyNotFound 'style' for a container template without "style"; add "style": {}.
- Rewriting a spectest file with json.dump reflows existing lines; splice new cases as text.
- MOSAIC-4516 patch not needed on main e768b1f / Xcode 27.0.
- shared/pr.md says gh cannot attach images; gh 2.101 --attach works and URLs resolve.
- 2026-10-27 (MOSAIC-4349): worktree add from origin/main takes ~10 min (LFS filtering) and holds index.lock until done; edit files only after it exits.
- xcode-select is Xcode 26.6 (iOS 26.5 sim) although Xcode.app is 27.1; the recipe's earlier runs were 27.0.
- Unit tests: build-for-testing once, then test-without-building -xctestrun <dd>/Build/Products/CodelessSample_CodelessSample_*.xctestrun; a bare *.xctestrun glob also matches CodelessScrollMotion/CodelessUITests and fails exit 65.
- Full CodelessRenderEngineTests ~12 min wall; ~70 snapshot tests fail on iOS 26.5 (no references) and write untracked *26-5*.png files — never commit them.
- VisibilityInWindowTests crashes the xctest process once ("Observation tracking feedback loop") then passes on restart, on main too.
