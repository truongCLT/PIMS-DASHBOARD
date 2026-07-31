---
name: OpenAPI spec drift vs generated clients
description: Generated client/zod files contained fields not in openapi.yaml; any codegen run silently deletes them.
---

The generated files in `lib/api-zod/src/generated` and `lib/api-client-react/src/generated` once carried hand-added fields (e.g. a monthly cost-budget array) that were never added to `lib/api-spec/openapi.yaml`. Running codegen wiped them and broke typecheck across server + dashboards.

**Why:** codegen regenerates from the yaml only; anything hand-patched into generated output is lost on the next run.

**How to apply:** before running codegen, diff generated files against git after the run and check for *removed* fields — a removal you didn't intend means the yaml is missing a schema. Fix the yaml (add the schema + optional property) rather than re-patching generated files.
