---
name: Order import isolation
description: Why uploaded order plans must remain separate from management-report replacement data.
---

Store order plan/performance imports independently from management-report P&L imports. In dashboard summaries, the active order dataset replaces only the new-orders line; it must not be copied into unrelated P&L rows.

**Why:** Management-report imports replace their owned tables wholesale. Co-locating separately uploaded order data there would silently erase it on the next management-report apply or revert.

**How to apply:** Any future order detail, download, history, or dashboard calculation should read the dedicated active order dataset. Keep management-report replacement and restoration operations unaware of and unable to delete that dataset.

Order details must classify an amount as actual only through the earlier of the dashboard's selected month and the import snapshot's reference month. Annual detail amounts and summary amounts must use the same dashboard reference-month exchange-rate anchor.

**Why:** A dashboard can be viewed after an older order snapshot's reference month. Treating later forecast rows as actual, or converting each detail row at its own date while the summary uses one reference month, makes the detail contradict the card.

**How to apply:** Cap actual classification by both month boundaries, exclude dates outside the report year, and reconcile detail totals against the annual plan/forecast summary after applying the same currency/unit conversion policy.