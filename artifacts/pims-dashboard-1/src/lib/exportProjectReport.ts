import html2canvas from "html2canvas-pro";
import { jsPDF } from "jspdf";

const CAPTURE_WIDTH = 1120;
const PDF_MARGIN = 24;
const PDF_HEADER_HEIGHT = 42;
const PDF_SECTION_GAP = 12;

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

  const reportPages = Array.from(
    target.querySelectorAll<HTMLElement>("[data-project-report-page]"),
  );
  if (reportPages.length === 0) {
    throw new Error("출력할 보고서 내용이 없습니다.");
  }

  const previousWidth = target.style.width;
  const previousMinWidth = target.style.minWidth;
  const previousMaxWidth = target.style.maxWidth;
  target.style.width = `${CAPTURE_WIDTH}px`;
  target.style.minWidth = `${CAPTURE_WIDTH}px`;
  target.style.maxWidth = `${CAPTURE_WIDTH}px`;

  const canvases: HTMLCanvasElement[] = [];
  try {
    if (document.fonts?.ready) {
      await document.fonts.ready;
    }
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });
    // Responsive charts need a moment to settle after the fixed export width is applied.
    await new Promise((resolve) => setTimeout(resolve, 350));

    for (const page of reportPages) {
      canvases.push(
        await html2canvas(page, {
          scale: 2,
          useCORS: true,
          backgroundColor: "#ffffff",
          width: CAPTURE_WIDTH,
          height: page.scrollHeight,
          windowWidth: CAPTURE_WIDTH + 120,
          windowHeight: page.scrollHeight,
          logging: false,
        }),
      );
    }
  } finally {
    target.style.width = previousWidth;
    target.style.minWidth = previousMinWidth;
    target.style.maxWidth = previousMaxWidth;
  }

  const monthLabel =
    reportMonth == null
      ? `${reportYear}년 최신월`
      : `${reportYear}년 ${String(reportMonth).padStart(2, "0")}월`;
  const title = `${projectName} · ${monthLabel} 당월 보고서`;
  const headerImage = makeHeaderImage(title);
  const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const availableWidth = pageWidth - PDF_MARGIN * 2;
  const availableHeight =
    pageHeight - PDF_MARGIN * 2 - PDF_HEADER_HEIGHT - PDF_SECTION_GAP;

  canvases.forEach((canvas, index) => {
    if (index > 0) pdf.addPage();
    pdf.addImage(
      headerImage,
      "PNG",
      PDF_MARGIN,
      PDF_MARGIN,
      availableWidth,
      PDF_HEADER_HEIGHT,
    );
    const renderScale = Math.min(
      availableWidth / canvas.width,
      availableHeight / canvas.height,
    );
    const renderWidth = canvas.width * renderScale;
    const renderHeight = canvas.height * renderScale;
    const x = (pageWidth - renderWidth) / 2;
    pdf.addImage(
      canvas.toDataURL("image/jpeg", 0.96),
      "JPEG",
      x,
      PDF_MARGIN + PDF_HEADER_HEIGHT + PDF_SECTION_GAP,
      renderWidth,
      renderHeight,
      undefined,
      "FAST",
    );
  });

  const monthFilePart =
    reportMonth == null
      ? `${reportYear}_latest`
      : `${reportYear}_${String(reportMonth).padStart(2, "0")}`;
  downloadPdfBlob(
    pdf.output("blob"),
    `${safeFilePart(projectName)}_당월보고서_${safeFilePart(monthFilePart)}.pdf`,
  );
}