---
name: Orval multipart codegen quirks
description: What breaks in this repo's codegen when an OpenAPI endpoint uses multipart/form-data file upload
---

Adding a `multipart/form-data` requestBody (file: format binary) to `lib/api-spec/openapi.yaml` breaks codegen in two ways:

1. Generated types reference `Blob`/`File` — `lib/api-zod` is a Node-typed lib, so its tsconfig needs `"lib": ["ES2022", "DOM"]` (already added).
2. Orval emits a zod const named exactly like the generated body type (e.g. `PreviewMgmtreportImportBody`), causing TS2308 duplicate-export from the two `export *` lines in `lib/api-zod/src/index.ts`. Fix: add an explicit `export { X } from "./generated/api"` line for each colliding name (explicit re-export wins over star exports).

**Also:** codegen once appended duplicate `export *` lines to `lib/api-zod/src/index.ts` — check that file after running codegen.

**How to apply:** whenever a new upload endpoint is added to the spec, expect these collisions and extend the explicit re-export list.
