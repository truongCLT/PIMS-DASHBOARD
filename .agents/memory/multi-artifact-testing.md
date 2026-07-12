---
name: Multi-artifact testing trap
description: Testing/review subagents can silently land on the wrong artifact when two similar apps exist at different base paths.
---

Rule: when two near-identical apps exist (e.g. an original at `/` and a duplicate at `/pims-dashboard-2/`), Playwright testing subagents and the architect's browser repro can end up on the wrong one and report features as "broken" even though the URL they report looks correct.

**Why:** A download-dropdown feature tested fine via curl (correct module served through the proxy) but two e2e runs reported the dropdown "never appears" — screenshots revealed the agent was interacting with the older app at the root path, which lacks the feature.

**How to apply:** In every test plan for a non-root artifact, (1) state explicitly that a similar app exists at `/` and must NOT be tested, and (2) add a GUARD verify step asserting content unique to the target app (e.g. a sidebar project name) before any feature steps. Distrust "wrong app" failure reports until a guard-verified run fails.
