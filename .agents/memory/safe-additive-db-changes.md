---
name: Safe additive database changes
description: Avoid unrelated destructive schema actions when applying additive development DB changes
---

When a schema push includes an unrelated prompt to truncate data or force a risky constraint change, stop the push and apply only the requested additive columns with explicit `ADD COLUMN IF NOT EXISTS` statements.

**Why:** An additive overview-field change caused the schema tool to surface a pre-existing unique-constraint drift and ask whether to truncate a populated table. Forcing the push would have put unrelated user data at risk.

**How to apply:** Keep the ORM schema updated as the source of truth, apply only allowlisted additive development columns directly, verify them through `information_schema`, and leave production schema reconciliation to the normal Publish flow.