#!/usr/bin/env bash
# watch-tick.sh <pr-url> <state.json>
# Prints one JSON line per comment, review, inline review comment or failed check run not yet
# recorded in state.json, then rewrites state.json with everything seen.
# Exit 0 normally, 1 on wrong arguments, 2 if gh fails.
set -u
[ $# -eq 2 ] || { echo "usage: watch-tick.sh <pr-url> <state.json>" >&2; exit 1; }
pr=$1; state=$2
[ -f "$state" ] || echo '{"seen":[]}' > "$state"

json=$(gh pr view "$pr" --json comments,reviews,statusCheckRollup,state,reviewDecision,url,number 2>/dev/null) || exit 2
url=$(printf '%s' "$json" | python3 -c 'import json,sys; print(json.load(sys.stdin)["url"])') || exit 2
num=$(printf '%s' "$json" | python3 -c 'import json,sys; print(json.load(sys.stdin)["number"])') || exit 2
slug=$(printf '%s' "$url" | sed -E 's#^https?://[^/]+/([^/]+/[^/]+)/pull/.*#\1#')
[ -n "$slug" ] && [ "$slug" != "$url" ] || exit 2
inline=$(gh api "repos/$slug/pulls/$num/comments" --paginate 2>/dev/null) || exit 2

read -r -d '' prog <<'PY'
import json, sys
state_path, inline_path = sys.argv[1], sys.argv[2]
d = json.load(sys.stdin)
raw = open(inline_path).read().strip()
# --paginate may emit several concatenated JSON arrays
inline, dec, pos = [], json.JSONDecoder(), 0
while pos < len(raw):
    v, end = dec.raw_decode(raw, pos)
    inline += v if isinstance(v, list) else [v]
    pos = end
    while pos < len(raw) and raw[pos].isspace(): pos += 1
state = json.load(open(state_path))
seen = set(state.get("seen", []))
out = []
def bot(login): return login.endswith("[bot]") or login.lower() in {"devbot", "flux", "danger", "github-actions"}
def login(a): return (a or {}).get("login", "")
for c in d.get("comments") or []:
    i = "c:" + str(c.get("id") or c.get("url"))
    if i not in seen:
        a = login(c.get("author"))
        out.append({"kind": "comment", "id": i, "author": a, "is_bot": bot(a), "body": c.get("body", ""), "url": c.get("url", d["url"])})
for r in d.get("reviews") or []:
    i = "r:" + str(r.get("id") or r.get("submittedAt"))
    if i not in seen:
        a = login(r.get("author"))
        out.append({"kind": "review", "id": i, "author": a, "is_bot": bot(a), "body": r.get("body", ""), "url": d["url"], "state": r.get("state")})
for c in inline:
    i = "rc:" + str(c["id"])
    if i not in seen:
        u = c.get("user") or {}
        a = u.get("login", "")
        out.append({"kind": "comment", "id": i, "author": a, "is_bot": u.get("type") == "Bot" or bot(a), "body": c.get("body", ""), "url": c.get("html_url", d["url"])})
for ch in d.get("statusCheckRollup") or []:
    name = ch.get("name") or ch.get("context", "")
    concl = str(ch.get("conclusion") or ch.get("state") or "")
    i = "k:" + name + ":" + concl
    if i not in seen and concl.upper() in {"FAILURE", "ERROR", "CANCELLED", "TIMED_OUT"}:
        out.append({"kind": "check", "id": i, "author": "ci", "is_bot": True, "body": name, "url": ch.get("detailsUrl") or ch.get("targetUrl", "")})
for o in out:
    print(json.dumps(o)); seen.add(o["id"])
state["seen"] = sorted(seen); state["pr_state"] = d.get("state"); state["review_decision"] = d.get("reviewDecision")
json.dump(state, open(state_path, "w"), indent=1)
PY
tmp=$(mktemp); printf '%s' "${inline:-[]}" > "$tmp"
printf '%s' "$json" | python3 -c "$prog" "$state" "$tmp"; rc=$?
rm -f "$tmp"
[ $rc -eq 0 ] || exit 2
exit 0
