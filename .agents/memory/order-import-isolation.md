---
name: Order import isolation
description: Why uploaded order plans must remain separate from management-report replacement data.
---

Store order plan/performance imports independently from management-report P&L imports. In dashboard summaries, the active order dataset replaces only the new-orders line; it must not be copied into unrelated P&L rows.

**Why:** Management-report imports replace their owned tables wholesale. Co-locating separately uploaded order data there would silently erase it on the next management-report apply or revert.

**How to apply:** Any future order detail, download, history, or dashboard calculation should read the dedicated active order dataset. Keep management-report replacement and restoration operations unaware of and unable to delete that dataset.