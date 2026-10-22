---
repo: <repo key from references/repo-routing.md: rooblocks | ios | android | doordash-ios>
screen: <kebab-case screen key, e.g. care-home-carousel; the file may carry an @<os> suffix, the key does not>
platform: ios | android
device: <model as simctl lists it, e.g. iPhone 17 | adb model>
os: <runtime version, e.g. 26.5>
status: fresh | stale
verified: <YYYY-MM-DD> @ <sha the last successful capture ran on>
stale_reason: <only when stale — the step or gate that failed, verbatim from the agent>
---
## Launch
<repo skill name and arguments, one line, e.g. sdui-accessibility-manual-test --template care_home; or simctl launch <bundle> / am start -n <component> — no backticks>
## Settings
appearance: light | dark
status_bar: <the exact override flags from platforms/<platform>.md>
locale: <e.g. en_US, only when the symptom depends on it>
## Steps
<one per line, in order; labels only, never coordinates>
tap <label> [role]
wait <label> [timeout seconds]
## Gate
<label> <role>
## Mask
none | points: <x,y,w,h> (iOS) | pixels: <x,y,w,h> (Android) — the gate element's frame
## Notes
<optional, one or two lines: why the sample app rather than the real flow, a known flake>
