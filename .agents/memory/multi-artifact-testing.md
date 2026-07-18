---
name: Multi-artifact testing trap
description: Testing/review subagents can silently land on the wrong artifact when two similar apps exist at different base paths.
---

Rule: when two near-identical apps exist (e.g. an original at `/` and a duplicate at `/pims-dashboard-2/`), Playwright testing subagents and the architect's browser repro can end up on the wrong one and report features as "broken" even though the URL they report looks correct.

**Why:** A download-dropdown feature tested fine via curl (correct module served through the proxy) but two e2e runs reported the dropdown "never appears" — screenshots revealed the agent was interacting with the older app at the root path, which lacks the feature.

**How to apply:** In every test plan for a non-root artifact, (1) state explicitly that a similar app exists at `/` and must NOT be tested, (2) add a GUARD verify step asserting content unique to the target app (e.g. exact sidebar group names like DECV/TCC/DE HEIM for pims-dashboard-2) before any feature steps, and (3) tell the tester the target app's own branding ("DAEWOO E&C VINA" / "DECV TOTAL" IS pims-dashboard-2 — do not treat it as wrong-app). Also instruct: if generic labels like "도급사업/서비스사업/프로젝트 1" appear, that's the root app — re-navigate. Distrust "wrong app" failure reports until a guard-verified run fails.
