---
name: YTD management month
description: Distinguish the YTD KPI cutoff from the dashboard's default last-closed-month query window
---

The YTD Revenue and YTD Operating Profit cards must calculate both plan and actual from January through the current management month. Do not reuse the dashboard's default query end month for this cutoff.

**Why:** The default dashboard window intentionally ends at the last closed month, which can lag the current management month by one month. Reusing it made September YTD display and calculate only through August.

**How to apply:** Keep query-window filtering independent. Pass a dedicated management-month value into YTD aggregation and use that same value for the two YTD period badges; full-year cards remain January through December.