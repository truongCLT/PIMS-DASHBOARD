---
name: Project profit drilldown source
description: Why project-level monthly profit drilldowns must share the management-report data source used by company totals.
---

Project-level monthly revenue, COGS, and gross-profit drilldowns must use the management-report project dataset that feeds the company summary. Do not use the separately imported salescost site snapshot as the drilldown source.

**Why:** The two imports can have different coverage dates. The salescost snapshot stopped at July while management-report project rows contained complete August–December values, making valid company months appear to have no project detail.

**How to apply:** For any monthly reconciliation or drilldown under the management-report dashboard, derive project rows and company totals from the same import family, and expose their difference so source drift is visible.