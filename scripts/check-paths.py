#!/usr/bin/env python3
"""Check backticked `../<topdir>/<path>` references in the skill markdown.

A relative path is anchored at the top-level directory that owns the file, so
`../shared/x.md` cited anywhere under scruffy-bug/ means `shared/x.md` from the repo root.
Prints each unresolved path as file:line and exits non-zero if any.
"""
import os, re, sys

root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
tops = ["scruffy", "scruffy-bug", "scruffy-feature", "verification", "shared", "memory"]
pat = re.compile(r"`\.\./(" + "|".join(map(re.escape, tops)) + r")/([^`\s]*)")
bad = 0
for d in tops + ["agents"]:
    for dp, _, fs in os.walk(os.path.join(root, d)):
        for f in fs:
            if not f.endswith(".md"):
                continue
            p = os.path.join(dp, f)
            for n, line in enumerate(open(p, encoding="utf-8"), 1):
                for m in pat.finditer(line):
                    rest = m.group(2)
                    if any(c in rest for c in "<*{$"):
                        continue
                    rest = re.split(r"[#§]", rest)[0].rstrip("/:")
                    target = os.path.join(root, m.group(1), rest) if rest else os.path.join(root, m.group(1))
                    if not os.path.exists(target):
                        print(f"{os.path.relpath(p, root)}:{n}: ../{m.group(1)}/{m.group(2)}")
                        bad += 1
sys.exit(1 if bad else 0)
