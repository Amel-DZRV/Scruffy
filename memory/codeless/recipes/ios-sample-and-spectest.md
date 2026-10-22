---
repo: codeless
name: ios-sample-and-spectest
status: fresh
derived_from: .claude/skills/sdui-accessibility-manual-test
runs: 1
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
