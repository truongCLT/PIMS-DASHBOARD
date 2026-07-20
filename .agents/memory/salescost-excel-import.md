---
name: Sales+costs Excel import
description: Quirks of importing the DECV "Summary of Sales+costs" workbook
---

- The "Summary of Sales+costs" workbook OOMs ExcelJS with the default Node heap (huge defined-name tables in workbook.xml despite ~450KB file size). Run importers with `NODE_OPTIONS=--max-old-space-size=6144`.
- **Why:** default heap crashed with "Ineffective mark-compacts near heap limit" even on a small file.
- **How to apply:** the `import-salescost` npm script already sets it; keep the flag for any new script reading this family of workbooks. The api-server needs it in BOTH the dev `start` script AND the production run args in `artifacts/api-server/.replit-artifact/artifact.toml` (`[services.production.run]`) — prod omitted it once and every Excel upload crashed the deployed server with heap OOM (HTTP 500 + healthcheck failures). After changing artifact.toml, the user must republish.
- Sheet layout: `Summary <year>` has sections marked in col D (Revenue / COGS / REPAIRING COST ALLOWANCE / ER); VND months in cols E–P, 1000USD months in cols S–AD. Repair section is VND-only. The `원가이체, 판관비 배부현황(1000USD)` sheet holds 현장원가/본사이체원가/판관비/인원수 per site (cols C–N); `#DIV/0!` cells must be skipped.
- Site labels differ across sheets ("SITE05" vs "Site 5 (...)"); normalize to `SITE` + zero-padded number.
