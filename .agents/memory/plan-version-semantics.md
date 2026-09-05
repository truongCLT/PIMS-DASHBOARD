---
name: Plan version semantics
description: Defines when Data Entry plan versions advance and how existing plans are numbered.
---

Plan versions advance only when planning values change. Actual-only edits must retain the current version. Existing plan data without prior version history is treated as version 1, so its first planning change becomes version 2.

**Why:** Users need the number to represent revisions to the plan itself, not every save or monthly actual update.

**How to apply:** Include explicit planning fields such as progress plans, milestone plan dates, revenue plans, budgets, and payment plans in version comparison. Exclude actual/result fields.