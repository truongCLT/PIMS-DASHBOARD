---
name: Full-year actual and forecast charts
description: The required 12-month and actual-versus-forecast presentation for management dashboard charts.
---

Sales and profit charts must always show January through December. For the current report year, months through the calendar month before today are actuals with filled marks; the current month and later months are forecasts with white, dashed-outline marks. This cutoff is independent of the dashboard month filter. Past report years are all actual and future report years are all forecast. Detail tables must expose the same actual/forecast distinction.

**Why:** Users compare the completed period with the remaining annual outlook in one view. Hiding future months or rendering forecasts like actuals removes that comparison and can misrepresent projected values as booked results.

**How to apply:** Keep the full-year monthly series even when the dashboard date filter ends earlier. Derive one today-based cutoff for sales and profit charts, tooltips, rates, and detail tables; preserve forecast amounts rather than replacing future months with zero.