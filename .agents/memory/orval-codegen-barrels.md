---
name: Orval codegen duplicates barrel exports
description: Every orval codegen run appends duplicate export lines to lib barrels; dedupe after each run.
---

Every run of `orval --config ./orval.config.ts` (also via `pnpm --filter @workspace/api-spec run codegen`) appends duplicate `export * from './generated/...'` lines to `lib/api-zod/src/index.ts` and `lib/api-client-react/src/index.ts`.

**Why:** the barrels contain hand-written extra exports (custom-fetch helpers, explicit collision re-exports), so orval re-adds its own export lines instead of recognizing the existing ones.

**How to apply:** after any codegen run, remove the appended duplicate lines from both barrels, and add any new multipart `*Body` names to the explicit re-export list in `lib/api-zod/src/index.ts` (otherwise `typecheck:libs` fails with TS2308 ambiguity errors).
