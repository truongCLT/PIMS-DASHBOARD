---
name: Cashflow Excel streaming parse
description: 자금수지 workbook must be parsed with ExcelJS streaming reader; full load OOM-kills prod
---

- The 자금수지 (cashflow) collection workbook peaks ~4GB RSS under ExcelJS full load (`wb.xlsx.load`), so the deployed api-server was OS-killed (`signal: killed`) even with `--max-old-space-size=6144` — machine RAM, not node heap, was the limit. The streaming reader (`ExcelJS.stream.xlsx.WorkbookReader` with `styles/hyperlinks: 'ignore'`) peaks ~130MB and parses in <1s.
- **Why:** raising the heap flag cannot fix an OS OOM kill; the fix is to lower actual peak memory.
- **How to apply:** keep cashflow parsing streaming in both the api-server lib and the mirrored CLI importer (kept in sync). Streaming mode does NOT fill merged-cell values — carry forward last non-empty division (col1), project (col2), AND flow type (col3; 수입/지출 cells are vertically merged too), resetting nested values on each new block. Verify parser changes by diffing preview JSON and DB rows against a full-load baseline.
- `WorksheetReader` has a runtime `name` property omitted from typings; cast to read it.
- `item_name_in/out` picked up junk ("수입") from horizontally merged cells under full load; streaming leaves them empty. Field is unused by UI/API — harmless.
