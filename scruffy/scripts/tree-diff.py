#!/usr/bin/env python3
"""Compare the before/after accessibility trees. A secondary signal, never a gate.

A tree can look right while the screen is visibly broken (off-screen, clipped, overlapping,
wrong colour), so this never decides the verdict. It surfaces what a screenshot cannot:
elements that lost or changed their accessible name, interactive elements with no name,
elements that appeared or vanished, and elements that moved.

Reads axe `describe-ui` JSON (iOS) or `uiautomator dump` XML (Android), chosen by extension.
Prints one status line, then one line per finding:
  a11y: UNCHANGED | CHANGED | ATTENTION   (ATTENTION = something a reviewer should look at)
Exit 0 always, except 2 when a tree cannot be read — also not a verdict, reported as
`a11y: UNAVAILABLE <why>`.
"""
import json, sys, xml.etree.ElementTree as ET

INTERACTIVE_IOS = {"AXButton", "AXLink", "AXSwitch", "AXSlider", "AXTextField", "AXCheckBox", "AXTab"}
MOVE_TOLERANCE = 2.0


def ios_nodes(path):
    out = []
    def walk(n):
        if isinstance(n, dict):
            if "AXLabel" in n or "role" in n:
                f = n.get("frame") or {}
                out.append({
                    "role": n.get("role", ""),
                    "label": (n.get("AXLabel") or "").strip(),
                    "frame": (f.get("x", 0), f.get("y", 0), f.get("width", 0), f.get("height", 0)),
                    "interactive": n.get("role") in INTERACTIVE_IOS,
                })
            for v in n.values():
                walk(v)
        elif isinstance(n, list):
            for v in n:
                walk(v)
    walk(json.load(open(path)))
    return out


def android_nodes(path):
    out = []
    for n in ET.parse(path).iter("node"):
        b = n.get("bounds", "")
        try:
            x1, y1, x2, y2 = (int(v) for v in b.replace("][", ",").strip("[]").split(","))
        except ValueError:
            x1 = y1 = x2 = y2 = 0
        label = (n.get("content-desc") or n.get("text") or "").strip()
        out.append({
            "role": n.get("class", ""),
            "label": label,
            "frame": (x1, y1, x2 - x1, y2 - y1),
            "interactive": n.get("clickable") == "true",
        })
    return out


def load(path):
    return android_nodes(path) if path.endswith(".xml") else ios_nodes(path)


def keyed(nodes):
    d = {}
    for n in nodes:
        if n["label"]:
            d.setdefault((n["role"], n["label"]), []).append(n)
    return d


def moved(a, b):
    return any(abs(p - q) > MOVE_TOLERANCE for p, q in zip(a, b))


def main():
    if len(sys.argv) != 3:
        print("usage: tree-diff.py <before tree> <after tree>", file=sys.stderr)
        sys.exit(2)
    try:
        before, after = load(sys.argv[1]), load(sys.argv[2])
    except Exception as e:  # unreadable tree is reported, never a verdict
        print(f"a11y: UNAVAILABLE {type(e).__name__}: {e}")
        sys.exit(2)

    kb, ka = keyed(before), keyed(after)
    findings, attention = [], False

    for k in sorted(set(kb) - set(ka)):
        findings.append(f"removed: {k[0]} \"{k[1]}\"")
        # a labelled element that vanished may be a lost control, not only a fix
        attention = True
    for k in sorted(set(ka) - set(kb)):
        findings.append(f"added: {k[0]} \"{k[1]}\"")
    for k in sorted(set(kb) & set(ka)):
        if len(kb[k]) != len(ka[k]):
            findings.append(f"count changed: {k[0]} \"{k[1]}\" {len(kb[k])} -> {len(ka[k])}")
        elif moved(kb[k][0]["frame"], ka[k][0]["frame"]):
            findings.append(f"moved: {k[0]} \"{k[1]}\" {tuple(kb[k][0]['frame'])} -> {tuple(ka[k][0]['frame'])}")

    ub = sum(1 for n in before if n["interactive"] and not n["label"])
    ua = sum(1 for n in after if n["interactive"] and not n["label"])
    if ua > ub:
        findings.append(f"unlabelled interactive elements: {ub} -> {ua}")
        attention = True

    status = "ATTENTION" if attention else ("CHANGED" if findings else "UNCHANGED")
    print(f"a11y: {status}")
    for f in findings:
        print(f"  {f}")
    sys.exit(0)


if __name__ == "__main__":
    main()
