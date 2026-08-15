---
name: Sales+costs Excel import
description: Quirks of importing the DECV "Summary of Sales+costs" workbook
---

- The "Summary of Sales+costs" workbook OOMs ExcelJS with the default Node heap (huge defined-name tables in workbook.xml despite small file size). Full `wb.xlsx.load(buffer)` must not be used — use ExcelJS streaming reader instead.
- **Why:** default heap crashes with "Ineffective mark-compacts near heap limit" even on a small file; concurrent uploads compound the risk.
- **Sheet-order independence:** the Alloc sheet rows must be buffered during streaming and replayed after Summary parsing completes, so that sheet ordering in the workbook does not matter.
- **How to apply:** `lib/salescost-parse` already uses streaming; keep this approach for any new code reading this workbook family. The `--max-old-space-size` flag in `artifacts/api-server/.replit-artifact/artifact.toml` is a safety buffer — do not remove without load testing.
- Sheet layout: `Summary <year>` has sections in col D (Revenue / COGS / REPAIRING COST ALLOWANCE / ER); VND months cols E–P, 1000USD months cols S–AD. Repair section is VND-only. The `원가이체, 판관비 배부현황(1000USD)` sheet: site labels in col A (merged cells, carry-forward required), metric in col B, 1000USD months cols C–N.
- Site labels differ across sheets ("SITE05" vs "Site 5 (...)"); normalize to `SITE` + zero-padded number.
