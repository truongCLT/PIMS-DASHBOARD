import html2canvas from "html2canvas-pro";
import { jsPDF } from "jspdf";

// Narrow enough that the responsive `reportGrid`/grid rows collapse to a
// single column (same "card view" layout as a narrow browser window),
// regardless of the user's actual window size when they click Export.
const CAPTURE_WIDTH = 480;
const PDF_MARGIN = 24;
const PDF_HEADER_HEIGHT = 42;
const PDF_SECTION_GAP = 12;
const PDF_ROW_GAP = 10;

/**
 * Waits for an element's chart (if any) to have actually painted shapes
 * before it's safe to screenshot. Recharts sizes/draws its <svg> after a
 * ResizeObserver callback fires post-resize, which can lag behind a plain
 * fixed delay — capturing too early yields a blank white card.
 */
async function waitForChartPaint(el: HTMLElement, timeoutMs = 1200): Promise<void> {
  const svg = el.querySelector("svg");
  if (!svg) return;
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const rect = svg.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0 && svg.childElementCount > 0) return;
    await new Promise((resolve) => setTimeout(resolve, 60));
  }
}

export const PROJECT_REPORT_EXPORT_ERROR =
  "보고서 PDF 저장 중 오류가 발생했습니다. 다시 시도해 주세요.";

export async function runProjectReportExport({
  exportAction,
  setExporting,
  setError,
}: {
  exportAction: () => Promise<void>;
  setExporting: (value: boolean) => void;
  setError: (value: string | null) => void;
}): Promise<void> {
  setExporting(true);
  setError(null);
  try {
    await exportAction();
  } catch (error) {
    console.error("Project report PDF export failed", error);
    setError(PROJECT_REPORT_EXPORT_ERROR);
  } finally {
    setExporting(false);
  }
}

function safeFilePart(value: string): string {
  return value
    .trim()
    .replace(/[\\/:*?"<>|]/g, "_")
    .replace(/\s+/g, "_");
}

function downloadPdfBlob(blob: Blob, fileName: string): void {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = fileName;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 10_000);
}

function makeHeaderImage(title: string): string {
  const scale = 2;
  const canvas = document.createElement("canvas");
  canvas.width = CAPTURE_WIDTH * scale;
  canvas.height = 64 * scale;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("보고서 제목을 생성할 수 없습니다.");
  }

  context.scale(scale, scale);
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, CAPTURE_WIDTH, 64);
  context.fillStyle = "#1a2d4d";
  context.font =
    "700 22px 'Malgun Gothic', 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(title, CAPTURE_WIDTH / 2, 32);
  return canvas.toDataURL("image/png");
}

export async function exportProjectReportPdf({
  elementId,
  projectName,
  reportYear,
  reportMonth,
}: {
  elementId: string;
  projectName: string;
  reportYear: number;
  reportMonth: number | null;
}): Promise<void> {
  const target = document.getElementById(elementId);
  if (!target) {
    throw new Error("보고서 영역을 찾을 수 없습니다.");
  }

  const reportPages = target.matches("[data-project-report-page]")
    ? [target]
    : Array.from(
        target.querySelectorAll<HTMLElement>("[data-project-report-page]"),
      );
  if (reportPages.length === 0) {
    throw new Error("출력할 보고서 내용이 없습니다.");
  }

  // Where a page's rows have been split into individual card blocks
  // (data-export-block), capture each block separately instead of the whole
  // page as one tall unit — at narrow capture widths the rows stack into a
  // single column, so treating the page as one indivisible piece either
  // wastes a lot of page space or cuts a card in half mid-page.
  const captureUnits = reportPages.flatMap((page) => {
    const blocks = Array.from(page.querySelectorAll<HTMLElement>("[data-export-block]"));
    return blocks.length > 0 ? blocks : [page];
  });

  const previousWidth = target.style.width;
  const previousMinWidth = target.style.minWidth;
  const previousMaxWidth = target.style.maxWidth;
  target.style.width = `${CAPTURE_WIDTH}px`;
  target.style.minWidth = `${CAPTURE_WIDTH}px`;
  target.style.maxWidth = `${CAPTURE_WIDTH}px`;

  // Hide interactive-only bits (month pickers, comment input boxes, edit/delete
  // buttons) that don't belong in a printed report, while keeping the saved
  // comment text itself visible.
  const hiddenEls = Array.from(target.querySelectorAll<HTMLElement>(".export-hide"));
  const previousDisplays = hiddenEls.map((el) => el.style.display);
  hiddenEls.forEach((el) => (el.style.display = "none"));

  const canvases: HTMLCanvasElement[] = [];
  try {
    if (document.fonts?.ready) {
      await document.fonts.ready;
    }
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });
    // Responsive charts/grid need a moment to settle after the fixed export width is applied.
    await new Promise((resolve) => setTimeout(resolve, 900));

    for (const unit of captureUnits) {
      // Recharts draws its <svg> asynchronously after the width change, so a
      // chart block captured too early comes out as a blank white card.
      await waitForChartPaint(unit);
      canvases.push(
        await html2canvas(unit, {
          scale: 2,
          useCORS: true,
          backgroundColor: "#ffffff",
          // Let html2canvas size the output canvas from the element's own
          // actual rendered dimensions — forcing a fixed output `width` here
          // stretched/distorted text when a block's real width (e.g. a
          // single grid column) didn't exactly match CAPTURE_WIDTH.
          // `windowWidth` still pins the layout viewport to the narrow
          // responsive width.
          windowWidth: CAPTURE_WIDTH + 120,
          windowHeight: unit.scrollHeight,
          logging: false,
        }),
      );
    }
  } finally {
    target.style.width = previousWidth;
    target.style.minWidth = previousMinWidth;
    target.style.maxWidth = previousMaxWidth;
    hiddenEls.forEach((el, i) => (el.style.display = previousDisplays[i]));
  }

  // Flow each captured block onto A4 portrait pages as whole units,
  // starting a new page whenever a block wouldn't fit the remaining space,
  // instead of shrinking the entire report onto a single page (which made
  // everything tiny) or cutting a card in half mid-page. The title banner
  // only appears on the first page.
  const title = `DAEWOOVINA · ${projectName} · 당월 보고서`;
  const headerImage = makeHeaderImage(title);
  const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const availableWidth = pageWidth - PDF_MARGIN * 2;
  const availableHeight = pageHeight - PDF_MARGIN * 2;
  const headerBlockHeight = PDF_HEADER_HEIGHT + PDF_SECTION_GAP;

  let isFirstPage = true;
  const pageTopOffset = () => (isFirstPage ? headerBlockHeight : 0);
  const drawHeaderIfFirstPage = () => {
    if (!isFirstPage) return;
    pdf.addImage(headerImage, "PNG", PDF_MARGIN, PDF_MARGIN, availableWidth, PDF_HEADER_HEIGHT);
  };
  const startNewPage = () => {
    pdf.addPage();
    isFirstPage = false;
    cursorY = PDF_MARGIN;
  };

  drawHeaderIfFirstPage();
  let cursorY = PDF_MARGIN + pageTopOffset();

  const addImageBlock = (canvas: HTMLCanvasElement, scale: number) => {
    const w = canvas.width * scale;
    const h = canvas.height * scale;
    const x = PDF_MARGIN + (availableWidth - w) / 2;
    pdf.addImage(canvas.toDataURL("image/jpeg", 0.96), "JPEG", x, cursorY, w, h, undefined, "FAST");
    cursorY += h + PDF_ROW_GAP;
  };

  for (const canvas of canvases) {
    const fitScale = availableWidth / canvas.width;
    const rowHeight = canvas.height * fitScale;
    const pageTop = PDF_MARGIN + pageTopOffset();
    const availableOnFreshPage = availableHeight - pageTopOffset();

    if (rowHeight <= availableOnFreshPage) {
      if (cursorY + rowHeight > PDF_MARGIN + availableHeight && cursorY > pageTop) {
        startNewPage();
      }
      addImageBlock(canvas, fitScale);
    } else {
      // Block itself is taller than one page — slice just this block across
      // consecutive pages instead of shrinking it to fit.
      if (cursorY > pageTop) {
        startNewPage();
      }
      const sliceHeightPx = Math.floor(availableOnFreshPage / fitScale);
      let sy = 0;
      while (sy < canvas.height) {
        const sh = Math.min(sliceHeightPx, canvas.height - sy);
        const sliceCanvas = document.createElement("canvas");
        sliceCanvas.width = canvas.width;
        sliceCanvas.height = sh;
        const sliceCtx = sliceCanvas.getContext("2d");
        if (sliceCtx) {
          sliceCtx.drawImage(canvas, 0, sy, canvas.width, sh, 0, 0, canvas.width, sh);
          addImageBlock(sliceCanvas, fitScale);
        }
        sy += sh;
        if (sy < canvas.height) {
          startNewPage();
        }
      }
    }
  }

  const monthFilePart =
    reportMonth == null
      ? `${reportYear}_latest`
      : `${reportYear}_${String(reportMonth).padStart(2, "0")}`;
  downloadPdfBlob(
    pdf.output("blob"),
    `${safeFilePart(projectName)}_당월보고서_${safeFilePart(monthFilePart)}.pdf`,
  );
}