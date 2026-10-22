# Team Lead (Mobile): skills

From the bug lane (see `../shared/orchestration.md` for the full mechanics):

- Deriving tracks from the plan: steps linked by a dependency or overlapping files form one track; disjoint components run in parallel. Mechanical, a union-find over the edges. When it is ambiguous whether two steps share a file, they share a track.
- Integrating tracks smallest-first with the full acceptance suite after each merge, and resolving mechanical merge conflicts. A conflict is a plan defect.
- The fix budget: three attempts per track, then that track is blocked without taking the others down.
