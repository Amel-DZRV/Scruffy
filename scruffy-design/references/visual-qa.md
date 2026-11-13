# Visual QA

The thing in this lane that can say **no**. One `design-qa` agent per screen per round, in a fresh context, with the two pictures and the design's own source. The developer who built a screen never grades it, and neither does the Team Lead.

## The packet

For one screen, one round:

- `screen`, `round`
- per state: `key`, `name`, the reference `design/<screen>--<state>.png` (or `none` for an undrawn state, with the drawn state it should follow), the capture path and its line from `index.md`, and the row's `flags`
- `design_source` — the handoff file or files that draw this screen, read-only
- `tokens` — `design/tokens.md`
- `device` — logical size and scale
- `impl_files` — the screen's own source files at the run branch head, read-only, for citing values. Never the developer's report
- `previous` — from round 2: the same agent's last report for this screen, so it can say what was fixed and what was not

**Not in the packet:** the developer's reasoning, the Team Lead's notes, other screens' reports, the product document's behaviour lines. Behaviour is the tests' job. A caller that includes them is ignored.

Anything required and missing → `PACKET INCOMPLETE`, naming it.

## What is compared

Side by side, at the same logical size. Not overlaid and never pixel-diffed: a browser and a device lay out and rasterise text differently, and a pixel diff of the two fails on every screen.

The rubric, in this order. A screen that fails on structure is not also listed for its colours.

| # | Category | Checks |
|---|---|---|
| 1 | **Structure** | every element in the design is present, once, in the same order and grouping; nothing extra |
| 2 | **Layout** | alignment, edges, what sits beside or under what, what is fixed and what scrolls, safe areas |
| 3 | **Spacing and size** | padding, gaps, heights, widths, radii, relative to the reference and to the tokens |
| 4 | **Typography** | family, size, weight, line count, truncation, case, alignment |
| 5 | **Colour** | fills, text, borders, icons, against the tokens for the state's theme |
| 6 | **Content** | every string exactly as the design has it; the right icon and image in each slot |
| 7 | **Component state** | selected, disabled, pressed, error: the one this state is supposed to show |

**Ignored:** the operating system's own chrome (clock, battery, home indicator), anti-aliasing, and sub-pixel differences in text rendering.

**Measured where it can be.** A spacing or colour call is backed by the value in the design source and the value in `impl_files` when both can be read: `design 16, build 12`. A call made from the pictures alone says so.

## Severity

| Severity | Means | Counts against `MATCH` |
|---|---|---|
| `blocker` | something missing, extra, wrong content, broken layout, wrong screen or state | yes |
| `major` | a difference a designer would flag at a glance: off-token colour, wrong weight or size, spacing off by more than about 2 pt, wrong radius | yes |
| `minor` | within about 2 pt, or only visible when measuring | no — reported, and listed in the PR |

## Verdict, per state

- `MATCH` — no `blocker`, no `major`.
- `GAPS` — at least one.
- `CANNOT JUDGE` — the capture is blank, the wrong size, `UNSTABLE`, `SAME AS` another state, or plainly not the named screen. A process failure of the capture, never a fix round for the developer.

**Default to `GAPS` when unsure.** A wrong `MATCH` reaches Amel as a screen he has to decline; a wrong `GAPS` costs one round.

An **undrawn** state has no reference. Judge it against the drawn state it follows and the tokens, for categories 2 to 5 and 7 only, and write `undrawn — judged for consistency` on its verdict line.

## The gap report

Written to `evidence/qa/<screen>-r<round>.md`, and handed to the next developer verbatim as its `memo`.

```
screen: <id>   round: <n>
state: <key>   verdict: MATCH | GAPS | CANNOT JUDGE
gaps:
  - [blocker|major|minor] <category> — <where on the screen> — design: <value or description> — build: <value or description> — fix: <one imperative line>
fixed since last round: <n of m>   still open: <the lines that are>
```

Rules for a line:

- **Where** is a place a person can find without the file open: "retry button, below the message", not a component name.
- **Design** and **build** are the same kind of thing: two values, or two descriptions. Never "looks off".
- **Fix** says what to change, not how to code it.
- One gap, one line. A missing illustration that also shifts the text up is two lines only if fixing the first would not fix the second.

No praise, no summary of what matches, no behaviour findings.

## Calibration

`design-qa` is a model judging pictures. It will pass things Amel declines. Each of those is recorded: when a review report declines a state whose last verdict was `MATCH`, the fix round generalises the reason into a **candidate rule** for this rubric (`../shared/learning.md` §Rule format), shown to Amel, written to `../memory/rules.md` only when he approves. The rules he approved are appended to every later packet as `rules`.

That count, states declined after a `MATCH`, is in every final report. It is the number that says how far the review page can be trusted to be boring.
