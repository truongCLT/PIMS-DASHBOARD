---
name: Async PDF downloads
description: Reliable browser downloads after long-running client-side PDF generation
---

After asynchronous DOM/canvas capture, download a generated PDF through an explicit Blob URL and temporary anchor rather than relying on `jsPDF.save()`.

**Why:** A report PDF rendered successfully and the UI returned from its loading state, but the browser emitted no download after `jsPDF.save()` ran following a long `html2canvas` operation. Exporting with `pdf.output("blob")`, creating an object URL, and clicking a temporary anchor produced a reliable download.

**How to apply:** Use this pattern for client-side exports that do substantial asynchronous work before download. Remove the anchor immediately and revoke the object URL after a short delay.