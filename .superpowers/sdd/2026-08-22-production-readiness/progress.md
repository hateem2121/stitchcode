# SDD ledger — plan: docs/superpowers/plans/2026-08-22-production-readiness.md

## Pre-flight Plan Scan
| Task Pair / Task | Prods vs Cons / Self-consistency | Finding & Pre-flight Ruling |
|---|---|---|
| Task 1 | Self-consistent | Canonicalize repo URLs and metadata to RUN-APPAREL/stitchcode. |
| Task 2 -> Task 3 | Task 2 installs Vitest/setup, Task 3 consumes test runner | Clear sequential dependency. Setup verified before unit test authoring. |
| Task 3 -> Task 4 | Task 3 tests lib logic, Task 4 implements intelligent AutoFix in App.tsx | AutoFix consumes luminance, contrastRatio, createMatrix, logoToGrid. |
| Task 4 -> Task 5 | Task 4 finalizes App.tsx & tests, Task 5 integrates CI/Release workflows | release.yml will upload dmg+zip (mac), exe (win), AppImage+deb (linux). |
| Task 5 -> Task 6 | Task 5 sets CI tests, Task 6 optimizes Vite chunking & SW | Final verification with npm run typecheck && npm test:run && npm run build. |

## Progress Log
- Ruling: Harness subagent spawn limitation (`planner config is not declarative`). Executing plan via direct inline execution with full TDD and verification gates.

### Task 1: Repository Canonicalization & Identity Standardisation
- Status: IN_PROGRESS

