import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas-pro";
import { KPI_DATA } from "../components/KPICards";
import { SALES_DATA } from "../components/SalesChart";
import { PROFIT_DATA } from "../components/ProfitChart";
import { ORDER_STATUS } from "../components/OrderStatus";
import { CASHFLOW_DATA } from "../components/CashFlowChart";
import { PERFORMANCE_ROWS } from "../components/PerformanceTable";

function todayStamp(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}${mm}${dd}`;
}

export function exportDashboardExcel(): void {
  const wb = XLSX.utils.book_new();

  const kpiSheet = XLSX.utils.json_to_sheet(
    KPI_DATA.map((k) => ({
      구분: k.title,
      계획: k.plan,
      실적: k.actual,
      달성률: k.achievement,
    })),
  );
  XLSX.utils.book_append_sheet(wb, kpiSheet, "KPI");

  const salesSheet = XLSX.utils.json_to_sheet(
    SALES_DATA.map((r) => ({
      월: r.month,
      넷: r.net ?? "",
      "매출(계획)": r.plan ?? "",
      "매출(실적 및 전망)": r.actual ?? "",
    })),
  );
  XLSX.utils.book_append_sheet(wb, salesSheet, "매출 실적 및 전망");

  const profitSheet = XLSX.utils.json_to_sheet(
    PROFIT_DATA.map((r) => ({
      월: r.m,
      매출이익: r.total,
      "매출이익(%)": r.totalPct,
      영업이익: r.op,
      "영업이익(%)": r.opPct,
      영업외수익: r.non,
      판관비: r.sga,
      "판관비(%)": r.sgaPct,
      경상이익: r.ord,
      "경상이익(%)": r.ordPct,
      건설: r.con,
      용역: r.svc,
    })),
  );
  XLSX.utils.book_append_sheet(wb, profitSheet, "손익현황");

  const orderSheet = XLSX.utils.json_to_sheet([
    {
      계획: ORDER_STATUS.planTotal,
      수주: ORDER_STATUS.ordered,
      잔여: ORDER_STATUS.remaining,
      "계획 대비":
        Math.round((ORDER_STATUS.ordered / ORDER_STATUS.planTotal) * 100) + "%",
    },
  ]);
  XLSX.utils.book_append_sheet(wb, orderSheet, "수주 실적 현황");

  const cashSheet = XLSX.utils.json_to_sheet(
    CASHFLOW_DATA.map((r) => ({
      월: r.month,
      "자금 유입": r.inflow,
      "자금 유출": r.outflow,
      차액: r.loan,
      "자금 잔액": r.net,
    })),
  );
  XLSX.utils.book_append_sheet(wb, cashSheet, "자금수지");

  const perfRows: Record<string, string>[] = [];
  for (const row of PERFORMANCE_ROWS) {
    perfRows.push({
      구분: row.label,
      "당월 누적 계획": row.planM,
      "당월 누적 실적": row.actualM,
      "당월 누적 달성률": row.achM,
      "연간 계획": row.planY,
      "연간 전망": row.forecastY,
      "연간 달성률": row.achY,
    });
    if ("sub" in row && row.sub) {
      perfRows.push({
        구분: `${row.label} (%)`,
        "당월 누적 계획": row.sub ?? "",
        "당월 누적 실적": row.subActual ?? "",
        "당월 누적 달성률": "",
        "연간 계획": row.subForecast ?? "",
        "연간 전망": row.subAch ?? "",
        "연간 달성률": "",
      });
    }
  }
  const perfSheet = XLSX.utils.json_to_sheet(perfRows);
  XLSX.utils.book_append_sheet(wb, perfSheet, "경영실적 현황");

  XLSX.writeFile(wb, `PIMS_대시보드_${todayStamp()}.xlsx`);
}

export async function exportDashboardPdf(): Promise<void> {
  const target = document.getElementById("dashboard-capture");
  if (!target) {
    throw new Error("대시보드 영역을 찾을 수 없습니다.");
  }

  // Always capture at a fixed desktop width so the PDF layout matches the
  // web layout regardless of the user's current window size.
  const CAPTURE_WIDTH = 1720;
  const prevWidth = target.style.width;
  const prevMinWidth = target.style.minWidth;
  target.style.width = `${CAPTURE_WIDTH}px`;
  target.style.minWidth = `${CAPTURE_WIDTH}px`;

  let canvas: HTMLCanvasElement;
  try {
    // Give responsive charts time to re-render at the new width
    await new Promise((resolve) => setTimeout(resolve, 600));
    const fullHeight = target.scrollHeight;

    canvas = await html2canvas(target, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#e8edf3",
      width: CAPTURE_WIDTH,
      height: fullHeight,
      windowWidth: CAPTURE_WIDTH + 200,
      windowHeight: fullHeight,
    });
  } finally {
    target.style.width = prevWidth;
    target.style.minWidth = prevMinWidth;
  }

  const imgWidth = canvas.width;
  const imgHeight = canvas.height;

  // Single page sized to the full dashboard so nothing gets cut off
  const margin = 16;
  const renderWidth = imgWidth / 2;
  const renderHeight = imgHeight / 2;
  const pageWidth = renderWidth + margin * 2;
  const pageHeight = renderHeight + margin * 2;
  const orientation = pageWidth >= pageHeight ? "landscape" : "portrait";

  const pdf = new jsPDF({
    orientation,
    unit: "pt",
    format: [pageWidth, pageHeight],
  });

  const imgData = canvas.toDataURL("image/png");
  pdf.addImage(imgData, "PNG", margin, margin, renderWidth, renderHeight);

  pdf.save(`PIMS_대시보드_${todayStamp()}.pdf`);
}
