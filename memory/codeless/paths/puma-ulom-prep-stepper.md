---
repo: codeless
screen: puma-ulom-prep-stepper
platform: ios
device: iPhone 17
os: 26.5
status: fresh
verified: 2026-10-19 @ e768b1fa956
---
## Launch
make generate-samples, build CodelessSample per sdui-accessibility-manual-test, then simctl launch uk.co.deliveroo.CodelessSample
## Settings
appearance: light
status_bar: --time 9:41 --dataNetwork wifi --wifiMode active --wifiBars 3 --cellularMode active --cellularBars 4 --batteryState charged --batteryLevel 100
## Steps
tap Search AXImage
type prep-stepper
wait Components v5.1.0 10
tap puma-ulom-prep-stepper AXStaticText
wait default 10
## Gate
20 min AXStaticText
## Mask
points: 162,168,77,29
## Notes
Bundled samples, no staging JSON. Decrement for the `default` sample is the first `5` AXStaticText; it is a container, not an AXButton. One tap: 20 min -> 15 min.
