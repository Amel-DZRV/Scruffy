"""Tests for scruffy-review/scripts/resolve-seats.py. Run: python3 -m unittest scripts/test_resolve_seats.py -v"""
import json, os, subprocess, sys, tempfile, unittest

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SCRIPT = os.path.join(ROOT, "scruffy-review", "scripts", "resolve-seats.py")
SEATS = os.path.join(ROOT, "scruffy-review", "seats.json")


def provider(pid, models, omitted=0, can_run=True, constraints=()):
    return {"providerInstanceId": pid, "canRunChildTask": can_run, "constraints": list(constraints),
            "models": [{"id": m} for m in models], "omittedModels": omitted}


def work_caps():
    return {"providers": [
        provider("claudeAgent", ["claude-opus-5-5", "claude-sonnet-5-5", "claude-fable-5-1", "claude-haiku-5-5"], 9),
        provider("codex", ["gpt-6.1-sol", "gpt-6.1-terra", "gpt-6-astra", "gpt-6-luna"], 4),
    ]}


def codex_disabled(caps):
    for p in caps["providers"]:
        if p["providerInstanceId"] == "codex":
            p["canRunChildTask"] = False
            p["constraints"] = ["Provider instance is disabled."]
    return caps


def drop_model(caps, pid, model, omitted=None):
    for p in caps["providers"]:
        if p["providerInstanceId"] == pid:
            p["models"] = [m for m in p["models"] if m["id"] != model]
            if omitted is not None:
                p["omittedModels"] = omitted
    return caps


def reviewer_seats(b_candidates):
    return {"seats": [
        {"seat": "reviewer-a", "role": "reviewer", "distinct_group": "reviewers", "effort": "high",
         "candidates": [{"provider": "claudeAgent", "model": "claude-opus-5-5"}]},
        {"seat": "reviewer-b", "role": "reviewer", "distinct_group": "reviewers", "effort": "high",
         "candidates": [{"provider": p, "model": m} for p, m in b_candidates]},
    ]}


class ResolveSeats(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)

    def write(self, name, obj):
        path = os.path.join(self.tmp.name, name)
        with open(path, "w") as f:
            json.dump(obj, f)
        return path

    def run_resolver(self, *args):
        return subprocess.run([sys.executable, SCRIPT, *args], capture_output=True, text=True)

    def resolved(self, *args):
        r = self.run_resolver(*args)
        self.assertEqual(r.returncode, 0, r.stderr)
        out = json.loads(r.stdout)
        return out, {s["seat"]: s for s in out["seats"]}

    def test_work_account_uses_primaries(self):
        out, seats = self.resolved("--caps", self.write("caps.json", work_caps()))
        self.assertEqual(seats["reviewer-a"]["model"], "claude-opus-5-5")
        self.assertEqual(seats["reviewer-b"]["model"], "gpt-6.1-sol")
        self.assertEqual(seats["judge"]["model"], "claude-sonnet-5-5")
        self.assertTrue(all(not s["fallback_used"] for s in seats.values()))
        self.assertFalse(out["single_provider"])
        self.assertEqual(out["transport"], "t3")

    def test_personal_account_falls_back(self):
        out, seats = self.resolved("--caps", self.write("caps.json", codex_disabled(work_caps())))
        self.assertEqual(seats["reviewer-b"]["model"], "claude-fable-5-1")
        self.assertTrue(seats["reviewer-b"]["fallback_used"])
        self.assertTrue(out["single_provider"])

    def test_unlisted_model_requests_search(self):
        base = self.write("caps.json", drop_model(work_caps(), "codex", "gpt-6.1-sol", omitted=4))
        r = self.run_resolver("--caps", base)
        self.assertEqual(r.returncode, 4, r.stderr)
        self.assertIn("needs-search: codex/gpt-6.1-sol", r.stdout)
        found = self.write("caps-sol.json", {"providers": [provider("codex", ["gpt-6.1-sol"], 4)]})
        _, seats = self.resolved("--caps", base, "--caps", found)
        self.assertEqual(seats["reviewer-b"]["model"], "gpt-6.1-sol")

    def test_missing_model_without_omitted_falls_back(self):
        caps = self.write("caps.json", drop_model(work_caps(), "codex", "gpt-6.1-sol", omitted=0))
        _, seats = self.resolved("--caps", caps)
        self.assertEqual(seats["reviewer-b"]["model"], "claude-fable-5-1")

    def test_reviewers_never_share_model(self):
        seats_file = self.write("seats.json", reviewer_seats(
            [("codex", "gpt-6.1-sol"), ("claudeAgent", "claude-opus-5-5"), ("claudeAgent", "claude-fable-5-1")]))
        caps = self.write("caps.json", codex_disabled(work_caps()))
        _, seats = self.resolved("--seats", seats_file, "--caps", caps)
        self.assertEqual(seats["reviewer-b"]["model"], "claude-fable-5-1")

    def test_reviewer_collision_with_no_alternative_fails(self):
        seats_file = self.write("seats.json", reviewer_seats(
            [("codex", "gpt-6.1-sol"), ("claudeAgent", "claude-opus-5-5")]))
        caps = self.write("caps.json", codex_disabled(work_caps()))
        r = self.run_resolver("--seats", seats_file, "--caps", caps)
        self.assertEqual(r.returncode, 3)
        self.assertIn("reviewer-b", r.stderr)

    def test_exclude_moves_seat_to_next_candidate(self):
        caps = self.write("caps.json", work_caps())
        _, seats = self.resolved("--caps", caps, "--exclude", "codex/gpt-6.1-sol")
        self.assertEqual(seats["reviewer-b"]["model"], "claude-fable-5-1")

    def test_effort_above_high_rejected(self):
        bad = reviewer_seats([("claudeAgent", "claude-fable-5-1")])
        bad["seats"][0]["effort"] = "xhigh"
        r = self.run_resolver("--seats", self.write("seats.json", bad), "--caps", self.write("caps.json", work_caps()))
        self.assertEqual(r.returncode, 2)

    def test_options_key_per_provider(self):
        _, seats = self.resolved("--caps", self.write("caps.json", work_caps()))
        self.assertEqual(seats["reviewer-b"]["options"], {"reasoningEffort": "high"})
        self.assertEqual(seats["judge"]["options"], {"effort": "high"})

    def test_claude_only_flag(self):
        out, seats = self.resolved("--claude-only")
        self.assertEqual(out["transport"], "agent")
        self.assertEqual(seats["reviewer-a"]["agent_model"], "opus")
        self.assertEqual(seats["reviewer-b"]["agent_model"], "fable")
        self.assertEqual(seats["judge"]["agent_model"], "sonnet")
        self.assertTrue(out["single_provider"])

    def test_real_seats_json_is_capped(self):
        with open(SEATS) as f:
            seats = json.load(f)["seats"]
        self.assertEqual(len(seats), 3)
        self.assertEqual([s["seat"] for s in seats], ["reviewer-a", "reviewer-b", "judge"])
        self.assertTrue(all(s["effort"] in {"low", "medium", "high"} for s in seats))


if __name__ == "__main__":
    unittest.main()
