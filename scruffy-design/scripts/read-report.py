#!/usr/bin/env python3
"""Unpack and validate a design review report.

usage: read-report.py <report.zip> <dossier>

The zip is what the review page's "Download report" produces: decisions.json, report.md and
references/. It is unpacked into <dossier>/review/report-<round>/ and summarised on stdout.

Exit 0: unpacked; prints the run, the counts and the declined / approved / undecided keys.
Exit 2: refused; prints why and unpacks nothing. Reasons: not a zip, a path that leaves the
        target directory, no decisions.json, or a run id that is not this dossier's.
"""
import json, os, re, sys, zipfile

ALLOWED = re.compile(r"^(report\.md|decisions\.json|references/[A-Za-z0-9._-]+)$")


def refuse(msg):
    print(f"refused: {msg}", file=sys.stderr)
    return 2


def main():
    if len(sys.argv) != 3:
        print("usage: read-report.py <report.zip> <dossier>", file=sys.stderr)
        return 2
    zpath, dossier = os.path.abspath(sys.argv[1]), os.path.abspath(sys.argv[2])
    if not os.path.isdir(dossier):
        return refuse(f"no such dossier: {dossier}")
    try:
        z = zipfile.ZipFile(zpath)
    except (OSError, zipfile.BadZipFile) as e:
        return refuse(f"not a readable zip: {e}")

    names = [n for n in z.namelist() if not n.endswith("/")]
    for n in names:
        if not ALLOWED.match(n):
            return refuse(f"unexpected file in the report: {n!r}")
    if "decisions.json" not in names:
        return refuse("no decisions.json")
    try:
        dec = json.loads(z.read("decisions.json").decode("utf-8"))
    except ValueError as e:
        return refuse(f"decisions.json is not JSON: {e}")

    run, rnd = dec.get("run"), dec.get("round")
    key = os.path.basename(dossier.rstrip(os.sep))
    if not isinstance(rnd, int) or run != f"{key}-r{rnd}":
        return refuse(f"report is for run {run!r}, this dossier is {key!r}")
    states = dec.get("states")
    if not isinstance(states, list) or not states:
        return refuse("decisions.json lists no states")

    groups = {"declined": [], "approved": [], "undecided": []}
    for s in states:
        d = s.get("decision")
        if d not in groups:
            return refuse(f"{s.get('key')!r}: unknown decision {d!r}")
        if d == "declined" and not (s.get("reason") or "").strip():
            return refuse(f"{s.get('key')!r}: declined with no reason")
        for ref in s.get("references") or []:
            if ref not in names:
                return refuse(f"{s.get('key')!r}: reference image missing from the zip: {ref}")
        groups[d].append(s.get("key"))

    target = os.path.join(dossier, "review", f"report-{rnd}")
    os.makedirs(os.path.join(target, "references"), exist_ok=True)
    for n in names:
        with open(os.path.join(target, *n.split("/")), "wb") as f:
            f.write(z.read(n))

    print(f"run: {run}")
    print(f"unpacked: {target}")
    print(f"declined: {len(groups['declined'])}  approved: {len(groups['approved'])}  undecided: {len(groups['undecided'])}")
    for d in ("declined", "approved", "undecided"):
        for k in groups[d]:
            print(f"{d}: {k}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
