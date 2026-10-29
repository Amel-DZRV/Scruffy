#!/usr/bin/env python3
"""Resolve the review lane's seats to the models that will actually run.

Reads seats.json and one or more orchestrator_capabilities snapshots (--caps), applies the
per-seat fallback, the distinct-reviewer rule and the high-effort cap, and prints JSON.
Exit 0 resolved · 2 bad input · 3 a seat has no usable candidate · 4 a model needs a search.
"""
import argparse, json, os, sys

EFFORTS = {"low", "medium", "high"}
OPTION_KEY = {"claudeAgent": "effort", "codex": "reasoningEffort"}
AGENT_MODEL = {"claude-opus-5-5": "opus", "claude-sonnet-5-5": "sonnet",
               "claude-fable-5-1": "fable", "claude-haiku-5-5": "haiku"}


def fail(code, msg):
    print(msg, file=sys.stderr)
    sys.exit(code)


def load_caps(paths):
    """Merge snapshots per provider; model lists are unioned."""
    merged = {}
    for path in paths:
        with open(path) as f:
            for p in json.load(f).get("providers", []):
                pid = p.get("providerInstanceId")
                cur = merged.setdefault(pid, {"canRunChildTask": True, "constraints": [],
                                              "models": set(), "omittedModels": 0})
                cur["canRunChildTask"] = cur["canRunChildTask"] and bool(p.get("canRunChildTask"))
                cur["constraints"] += p.get("constraints", [])
                cur["models"] |= {m["id"] for m in p.get("models", [])}
                cur["omittedModels"] = max(cur["omittedModels"], p.get("omittedModels", 0))
    return merged


def provider_ok(caps, pid):
    p = caps.get(pid)
    return bool(p) and p["canRunChildTask"] and not any("disabled" in c.lower() for c in p["constraints"])


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--seats", default=os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "seats.json"))
    ap.add_argument("--caps", action="append", default=[])
    ap.add_argument("--claude-only", action="store_true")
    ap.add_argument("--exclude", action="append", default=[])
    a = ap.parse_args()

    try:
        with open(a.seats) as f:
            seats = json.load(f)["seats"]
    except (OSError, ValueError, KeyError) as e:
        fail(2, f"bad seats file: {e}")
    for s in seats:
        if s.get("effort") not in EFFORTS:
            fail(2, f"seat {s.get('seat')}: effort {s.get('effort')!r} is not one of low, medium, high")
    if not a.claude_only and not a.caps:
        fail(2, "--caps is required unless --claude-only")

    if a.claude_only:
        def usable(c):
            return c["provider"] == "claudeAgent"
        needs_search = []
    else:
        try:
            caps = load_caps(a.caps)
        except (OSError, ValueError) as e:
            fail(2, f"bad caps file: {e}")

        def usable(c):
            p = caps.get(c["provider"])
            return provider_ok(caps, c["provider"]) and c["model"] in p["models"]

        # Before any seat falls back: a model hidden behind omittedModels may exist.
        needs_search = []
        for s in seats:
            for c in s["candidates"]:
                if not provider_ok(caps, c["provider"]):
                    continue
                p = caps[c["provider"]]
                if c["model"] not in p["models"] and p["omittedModels"] > 0:
                    needs_search.append(f"needs-search: {c['provider']}/{c['model']}")
                break
    if needs_search:
        print("\n".join(dict.fromkeys(needs_search)))
        sys.exit(4)

    excluded = set(a.exclude)
    taken = {}
    out = []
    for s in seats:
        group = s.get("distinct_group")
        chosen = None
        for i, c in enumerate(s["candidates"]):
            if f"{c['provider']}/{c['model']}" in excluded or not usable(c):
                continue
            if group and c["model"] in taken.get(group, set()):
                continue
            chosen = (i, c)
            break
        if chosen is None:
            fail(3, f"seat {s['seat']}: no usable candidate")
        i, c = chosen
        if group:
            taken.setdefault(group, set()).add(c["model"])
        seat = {"seat": s["seat"], "role": s["role"], "provider": c["provider"], "model": c["model"],
                "options": {OPTION_KEY.get(c["provider"], "effort"): s["effort"]}, "fallback_used": i > 0}
        if a.claude_only:
            seat["agent_model"] = AGENT_MODEL.get(c["model"], c["model"])
        out.append(seat)

    print(json.dumps({"transport": "agent" if a.claude_only else "t3",
                      "single_provider": len({s["provider"] for s in out}) == 1,
                      "seats": out}, indent=2))


if __name__ == "__main__":
    main()
