---
name: PIMS ZIP selective merge
description: Why uploaded PIMS snapshots must be audited by feature instead of replacing the current workspace wholesale.
---

Treat uploaded PIMS dashboard snapshots as a source of individual feature changes, not as an authoritative whole-project replacement.

**Why:** A newer-dated snapshot removed active design-system artifacts and current safeguards such as sync preview, historical/site exchange rates, photo persistence, and multi-dashboard compatibility while containing a few genuinely newer UI/API changes.

**How to apply:** Compare recent snapshot commits feature by feature against the current artifact and backend. Port only missing behavior, preserve current-superior implementations, and never copy snapshot metadata, environment files, caches, lockfiles, or deleted artifact routing wholesale.