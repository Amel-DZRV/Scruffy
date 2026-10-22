# Designer: skills

## Adopted

From Anthropic's official `anthropics/skills` set:

- `theme-factory`: defines and applies a consistent visual theme (colors and fonts) to generated artifacts, so the system is set once per project and reused.
- `frontend-design`: keeps generated UI from defaulting to generic AI house style; pushes distinctive, intentional visual choices.

Also:

- The project's design documentation (read from Notion), including any design mocks the project keeps.
- Accessibility and visual hierarchy fundamentals.

## Considered, not adopted

- `brand-guidelines`: in `anthropics/skills` it applies Anthropic's own brand colors and typography (Poppins headings, Lora body, Anthropic's palette). It does not define or apply a project's brand, so it would push Anthropic's look onto the project. Per-project brand identity comes from Claude Design's published design system instead. If a reusable per-project brand-guidelines skill is wanted, it would be written as a feature-lane skill following that skill's pattern, with the project's own values.

## Candidates, not selected

`design:design-critique`, `design:design-handoff`, `design:design-system`, `design:accessibility-review`, `design:ux-copy`.
