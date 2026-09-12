---
name: ERP-owned value lifecycle
description: Safety rules for preserving, overriding, and clearing values synchronized from sparse ERP datasets.
---

ERP ownership must survive saves that change unrelated fields. A user edit to the synchronized value itself transfers ownership to manual input. Missing ERP values may be cleared only inside a separately verified complete synchronization scope, never merely because a sparse result omitted a row.

**Why:** Sparse ERP results cannot distinguish a real deletion or zero correction from an incomplete query. Dropping source ownership during an unrelated plan save also prevents later stale-value cleanup.

**How to apply:** Track source ownership per synchronized value, compare before/after values during broad form saves, and obtain an independent project/period coverage signal before reconciling absent ERP keys.