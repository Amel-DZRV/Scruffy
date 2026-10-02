#!/usr/bin/env python3
"""Compare a before/after screenshot pair. Exit 0 when they differ only inside the masks."""
import argparse, sys
from PIL import Image, ImageChops

MAX_MASK_FRACTION = 0.5

def parse_mask(s):
    """None for "none", (x, y, w, h) otherwise. Raises ValueError on anything else."""
    if s.strip().lower() == "none":
        return None
    parts = s.split(",")
    if len(parts) != 4:
        raise ValueError(s)
    x, y, w, h = (int(p) for p in parts)
    if w <= 0 or h <= 0:
        raise ValueError(s)
    return (x, y, w, h)

def main():
    p = argparse.ArgumentParser()
    p.add_argument("before"); p.add_argument("after")
    p.add_argument("--mask", action="append", default=[], help="x,y,w,h — repeatable")
    p.add_argument("--status-bar-height", type=int, default=160, help="pixels masked at the top by default")
    p.add_argument("--threshold", type=float, default=0.005)
    a = p.parse_args()

    # Validate every supplied mask before opening anything: a malformed value is a
    # process failure, not a diff result.
    supplied = []
    for value in a.mask:
        try:
            frame = parse_mask(value)
        except ValueError:
            print(f"changed=nan masked=0 threshold={a.threshold} mask_invalid={value}")
            sys.exit(2)
        if frame is not None:
            supplied.append((value, frame))

    b = Image.open(a.before).convert("RGB"); f = Image.open(a.after).convert("RGB")
    if b.size != f.size:
        bsize = f"{b.width}x{b.height}"; fsize = f"{f.width}x{f.height}"
        print(f"changed=nan masked=0 threshold={a.threshold} size_mismatch={bsize}-vs-{fsize}")
        sys.exit(2)

    # A mask covering half the screenshot proves nothing; checked against the supplied
    # frame's own area, never the script's status-bar box.
    for value, (_, _, w, h) in supplied:
        if w * h > MAX_MASK_FRACTION * b.width * b.height:
            print(f"changed=nan masked=0 threshold={a.threshold} mask_too_large={value}")
            sys.exit(2)

    diff = ImageChops.difference(b, f).convert("L").point(lambda v: 255 if v > 16 else 0)
    masks = [(0, 0, b.width, a.status_bar_height)] + [(x, y, x + w, y + h) for _, (x, y, w, h) in supplied]
    for box in masks:
        diff.paste(0, box)
    changed = diff.histogram()[255] / (b.width * b.height)
    print(f"changed={changed:.5f} masked={len(masks)} threshold={a.threshold}")
    sys.exit(0 if changed <= a.threshold else 1)

if __name__ == "__main__":
    main()
