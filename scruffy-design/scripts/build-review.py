#!/usr/bin/env python3
"""Build the design lane's review page.

usage: build-review.py <round.json> <out.html>

Reads the round description (see references/hand-off.md, "The review page"), embeds every
image as a data URI, and writes one self-contained HTML file from assets/review.html.
Image paths in the JSON are relative to the dossier, which is the parent of the JSON's
directory when the JSON sits in <dossier>/review/, otherwise the JSON's own directory.

Exit 0: page written; prints the state count and the size.
Exit 2: the input is wrong; prints every problem found, one per line, and writes nothing.
"""
import base64, json, os, re, sys

ID = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
MIME = {".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".gif": "image/gif"}


def main():
    if len(sys.argv) != 3:
        print("usage: build-review.py <round.json> <out.html>", file=sys.stderr)
        return 2
    src, out = os.path.abspath(sys.argv[1]), os.path.abspath(sys.argv[2])
    here = os.path.dirname(os.path.abspath(__file__))
    template_path = os.path.join(here, "..", "assets", "review.html")
    problems = []

    try:
        run = json.load(open(src, encoding="utf-8"))
    except (OSError, ValueError) as e:
        print(f"cannot read {src}: {e}", file=sys.stderr)
        return 2
    try:
        template = open(template_path, encoding="utf-8").read()
    except OSError as e:
        print(f"cannot read the template: {e}", file=sys.stderr)
        return 2
    if template.count("__RUN_DATA__") != 1:
        print("template has no single __RUN_DATA__ marker", file=sys.stderr)
        return 2

    base = os.path.dirname(src)
    if os.path.basename(base) == "review":
        base = os.path.dirname(base)

    for field in ("id", "app", "feature", "round", "device", "build", "screens"):
        if field not in run:
            problems.append(f"missing top-level field: {field}")
    screens = run.get("screens") or []
    if not isinstance(screens, list) or not screens:
        problems.append("screens is empty")
        screens = []

    def embed(path, where):
        if not isinstance(path, str) or not path:
            problems.append(f"{where}: no image path")
            return None
        full = path if os.path.isabs(path) else os.path.join(base, path)
        ext = os.path.splitext(full)[1].lower()
        if ext not in MIME:
            problems.append(f"{where}: not an image type this page shows: {path}")
            return None
        try:
            data = open(full, "rb").read()
        except OSError:
            problems.append(f"{where}: file not found: {path}")
            return None
        if not data:
            problems.append(f"{where}: empty file: {path}")
            return None
        return {"src": f"data:{MIME[ext]};base64," + base64.b64encode(data).decode("ascii")}

    seen, count = set(), 0
    for s in screens:
        sid = s.get("id", "")
        if not ID.match(str(sid)):
            problems.append(f"screen id is not kebab-case: {sid!r}")
        if not s.get("name"):
            problems.append(f"screen {sid!r}: no name")
        states = s.get("states") or []
        if not states:
            problems.append(f"screen {sid!r}: no states")
        for st in states:
            stid = st.get("id", "")
            key = f"{sid}--{stid}"
            count += 1
            if not ID.match(str(stid)):
                problems.append(f"{key}: state id is not kebab-case")
            if key in seen:
                problems.append(f"{key}: duplicate key")
            seen.add(key)
            if not st.get("name"):
                problems.append(f"{key}: no name")
            qa = st.get("qa")
            if not isinstance(qa, dict) or qa.get("verdict") not in ("pass", "blocked"):
                problems.append(f"{key}: qa.verdict must be pass or blocked")
            elif not isinstance(qa.get("notes", []), list):
                problems.append(f"{key}: qa.notes must be a list")
            st["impl"] = embed(st.get("impl"), f"{key} impl")
            st["design"] = embed(st["design"], f"{key} design") if st.get("design") else None
            prev = st.get("previous")
            if prev is not None and not (isinstance(prev, dict) and "round" in prev and "reason" in prev):
                problems.append(f"{key}: previous needs round and reason")

    if problems:
        for p in problems:
            print(p, file=sys.stderr)
        return 2

    run.pop("placeholder", None)
    # "</" would end the script block the data sits in.
    payload = json.dumps(run, ensure_ascii=False).replace("</", "<\\/")
    html = template.replace("__RUN_DATA__", payload)
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, "w", encoding="utf-8") as f:
        f.write(html)
    print(f"review page: {out} — {len(screens)} screens, {count} states, {os.path.getsize(out) / 1e6:.1f} MB")
    return 0


if __name__ == "__main__":
    sys.exit(main())
