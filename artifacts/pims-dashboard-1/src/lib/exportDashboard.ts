import type ExcelJS from "exceljs";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas-pro";
import { getCashflowReportSummary, listMgmtreportComments } from "@workspace/api-client-react";
import { getDashboardExportData } from "./mgmtreportData";

interface SavedComment {
  body: string;
  createdAt: string;
}

async function fetchSavedComments(
  year: number,
  month: number,
): Promise<{ analysis: SavedComment[]; outlook: SavedComment[] }> {
  try {
    const res = await listMgmtreportComments({ year, month });
    const analysis: SavedComment[] = [];
    const outlook: SavedComment[] = [];
    // API returns newest first; report shows oldest first
    for (const c of [...res.comments].reverse()) {
      (c.section === "analysis" ? analysis : outlook).push({ body: c.body, createdAt: c.createdAt });
    }
    return { analysis, outlook };
  } catch {
    return { analysis: [], outlook: [] };
  }
}

interface CashflowExportRow {
  month: string;
  inflow: number;
  outflow: number;
  net: number;
  balance: number;
}

// 화면의 DECV 전체 자금수지(CashFlowChart)와 같은 소스 — PIMSVINA Cash Flow Report(Summary) Total.
async function fetchCashflowExportRows(year: number, throughMonth: number): Promise<CashflowExportRow[]> {
  try {
    const summary = await getCashflowReportSummary({
      fromYear: year,
      fromMonth: 1,
      months: Math.max(1, Math.min(12, throughMonth)),
    });
    return (summary.total ?? []).map((p) => ({
      month: p.month,
      inflow: p.income,
      outflow: p.outcome,
      net: p.income - p.outcome,
      balance: p.balance,
    }));
  } catch {
    return [];
  }
}

function todayStamp(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}${mm}${dd}`;
}

function num(s: string | undefined): number {
  if (!s) return 0;
  return Number(s.replace(/[,%]/g, "")) || 0;
}

function fmt(v: number): string {
  return v === 0 ? "-" : v.toLocaleString("ko-KR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

/* ---------- offscreen chart rendering (PNG for Excel embedding) ---------- */

interface BarSeries {
  name: string;
  color: string;
}

function drawGroupedBarChart(
  groups: { label: string; values: number[] }[],
  series: BarSeries[],
): string {
  const W = 480;
  const H = 320;
  const canvas = document.createElement("canvas");
  canvas.width = W * 2;
  canvas.height = H * 2;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(2, 2);

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = "#bfbfbf";
  ctx.strokeRect(0.5, 0.5, W - 1, H - 1);

  const top = 46;
  const bottom = H - 66;
  const left = 24;
  const right = W - 16;
  const maxVal = Math.max(...groups.flatMap((g) => g.values), 1) * 1.18;

  const groupW = (right - left) / groups.length;
  const barW = 26;
  const barGap = 6;
  const blockW = series.length * barW + (series.length - 1) * barGap;

  groups.forEach((g, gi) => {
    const gx = left + groupW * gi + (groupW - blockW) / 2;
    g.values.forEach((v, si) => {
      const bx = gx + si * (barW + barGap);
      const bh = (v / maxVal) * (bottom - top);
      ctx.fillStyle = series[si].color;
      ctx.fillRect(bx, bottom - bh, barW, bh);

      ctx.fillStyle = "#333333";
      ctx.font = "9px 'Malgun Gothic', sans-serif";
      ctx.textAlign = "center";
      const labelY = bottom - bh - 5 - (si % 2) * 11;
      ctx.fillText(fmt(v), bx + barW / 2, Math.max(labelY, 12));
    });
    ctx.fillStyle = "#333333";
    ctx.font = "bold 14px 'Malgun Gothic', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(g.label, left + groupW * gi + groupW / 2, bottom + 20);
  });

  ctx.strokeStyle = "#808080";
  ctx.beginPath();
  ctx.moveTo(left, bottom + 0.5);
  ctx.lineTo(right, bottom + 0.5);
  ctx.stroke();

  // legend (2 columns x 2 rows)
  ctx.font = "9px 'Malgun Gothic', sans-serif";
  ctx.textAlign = "left";
  const legendY = H - 34;
  series.forEach((s, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const lx = 90 + col * 170;
    const ly = legendY + row * 15;
    ctx.fillStyle = s.color;
    ctx.fillRect(lx, ly, 10, 8);
    ctx.fillStyle = "#333333";
    ctx.fillText(s.name, lx + 14, ly + 8);
  });

  return canvas.toDataURL("image/png");
}

function drawHBarChart(
  title: string,
  categories: { label: string; values: number[] }[],
  series: BarSeries[],
): string {
  const W = 480;
  const H = 320;
  const canvas = document.createElement("canvas");
  canvas.width = W * 2;
  canvas.height = H * 2;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(2, 2);

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = "#bfbfbf";
  ctx.strokeRect(0.5, 0.5, W - 1, H - 1);

  ctx.fillStyle = "#333333";
  ctx.font = "bold 13px 'Malgun Gothic', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(title, W / 2, 22);

  const left = 64;
  const right = W - 70;
  const top = 38;
  const bottom = H - 76;

  // round the axis up to a "nice" tick step (1/2/5 x 10^n)
  const tickCount = 7;
  const rawStep = (Math.max(...categories.flatMap((c) => c.values), 1) * 1.15) / tickCount;
  const mag = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const nice = [1, 2, 5, 10].find((n) => rawStep / mag <= n) ?? 10;
  const step = nice * mag;
  const maxVal = step * tickCount;
  ctx.font = "8px 'Malgun Gothic', sans-serif";
  for (let t = 0; t <= tickCount; t++) {
    const v = (maxVal / tickCount) * t;
    const x = left + ((right - left) * t) / tickCount;
    ctx.strokeStyle = "#e6e6e6";
    ctx.beginPath();
    ctx.moveTo(x + 0.5, top);
    ctx.lineTo(x + 0.5, bottom);
    ctx.stroke();
    ctx.fillStyle = "#666666";
    ctx.textAlign = "center";
    ctx.fillText(t === 0 ? "-" : fmt(v), x, bottom + 12);
  }

  const catH = (bottom - top) / categories.length;
  const barH = 9;
  const barGap = 3;
  const blockH = series.length * barH + (series.length - 1) * barGap;

  categories.forEach((c, ci) => {
    const cy = top + catH * ci + (catH - blockH) / 2;
    c.values.forEach((v, si) => {
      const by = cy + si * (barH + barGap);
      const bw = (v / maxVal) * (right - left);
      ctx.fillStyle = series[si].color;
      ctx.fillRect(left, by, bw, barH);
      ctx.fillStyle = "#333333";
      ctx.font = "8px 'Malgun Gothic', sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(fmt(v), left + bw + 4, by + barH - 1);
    });
    ctx.fillStyle = "#333333";
    ctx.font = "bold 10px 'Malgun Gothic', sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(c.label, left - 6, cy + blockH / 2 + 3);
  });

  ctx.strokeStyle = "#808080";
  ctx.beginPath();
  ctx.moveTo(left + 0.5, top);
  ctx.lineTo(left + 0.5, bottom);
  ctx.stroke();

  // legend (2 columns x 2 rows)
  ctx.font = "9px 'Malgun Gothic', sans-serif";
  ctx.textAlign = "left";
  const legendY = H - 44;
  series.forEach((s, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const lx = 70 + col * 200;
    const ly = legendY + row * 15;
    ctx.fillStyle = s.color;
    ctx.fillRect(lx, ly, 10, 8);
    ctx.fillStyle = "#333333";
    ctx.fillText(s.name, lx + 14, ly + 8);
  });

  return canvas.toDataURL("image/png");
}

/* -------------------------- Excel report export -------------------------- */

const THIN = { style: "thin" as const, color: { argb: "FF808080" } };
const BORDER_ALL = { top: THIN, left: THIN, bottom: THIN, right: THIN };
const HEADER_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFDDEBF7" },
};

function styleRange(
  ws: ExcelJS.Worksheet,
  r1: number,
  c1: number,
  r2: number,
  c2: number,
  opts: { fill?: ExcelJS.Fill; border?: boolean },
): void {
  for (let r = r1; r <= r2; r++) {
    for (let c = c1; c <= c2; c++) {
      const cell = ws.getCell(r, c);
      if (opts.border) cell.border = BORDER_ALL;
      if (opts.fill) cell.fill = opts.fill;
    }
  }
}

export async function exportDashboardExcel(): Promise<void> {
  const {
    kpi: KPI_DATA,
    salesData: SALES_DATA,
    profitData: PROFIT_DATA,
    performanceRows: PERFORMANCE_ROWS,
    orderStatus,
    year: reportYear,
    month: reportMonth,
  } = getDashboardExportData();
  const ORDER_STATUS = orderStatus ?? { planTotal: 0, ordered: 0, remaining: 0 };
  const [cashflowRows, savedComments] = await Promise.all([
    fetchCashflowExportRows(reportYear, reportMonth),
    fetchSavedComments(reportYear, reportMonth),
  ]);
  const { default: ExcelJS } = await import("exceljs");
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("경영실적보고", {
    views: [{ showGridLines: false }],
    pageSetup: {
      paperSize: 9, // A4
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 1,
      horizontalCentered: true,
      verticalCentered: true,
      margins: { left: 0.3, right: 0.3, top: 0.4, bottom: 0.4, header: 0.2, footer: 0.2 },
    },
  });

  // Column layout: A~E charts / F spacer / G~M table
  ws.columns = [
    { width: 12 }, { width: 12 }, { width: 12 }, { width: 12 }, { width: 12 },
    { width: 2 },
    { width: 10 }, { width: 11 }, { width: 11 }, { width: 11 }, { width: 9 },
    { width: 11 }, { width: 9 },
  ];

  const title = `${reportYear}년 ${reportMonth}월 DECV 경영실적보고`;

  ws.mergeCells(1, 1, 1, 13);
  const titleCell = ws.getCell(1, 1);
  titleCell.value = title;
  titleCell.font = { size: 18, bold: true, underline: true, name: "맑은 고딕" };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };
  ws.getRow(1).height = 32;

  ws.mergeCells(2, 11, 2, 13);
  const unitCell = ws.getCell(2, 11);
  unitCell.value = "(단위 : 백만원)";
  unitCell.font = { size: 9, name: "맑은 고딕" };
  unitCell.alignment = { horizontal: "right" };

  /* ---- main table (G~M, cols 7~13) ---- */
  const G = 7;
  ws.mergeCells(4, G, 6, G);
  ws.getCell(4, G).value = "구        분";
  ws.mergeCells(4, G + 1, 4, G + 2);
  ws.getCell(4, G + 1).value = "사업계획";
  ws.mergeCells(4, G + 3, 4, G + 6);
  ws.getCell(4, G + 3).value = "실적 및 전망";
  ws.mergeCells(5, G + 1, 6, G + 1);
  ws.getCell(5, G + 1).value = "금월 누적";
  ws.mergeCells(5, G + 2, 6, G + 2);
  ws.getCell(5, G + 2).value = "연간";
  ws.mergeCells(5, G + 3, 5, G + 4);
  ws.getCell(5, G + 3).value = "금월누적";
  ws.mergeCells(5, G + 5, 5, G + 6);
  ws.getCell(5, G + 5).value = "연간";
  ws.getCell(6, G + 3).value = "실적";
  ws.getCell(6, G + 4).value = "달성율";
  ws.getCell(6, G + 5).value = "전망";
  ws.getCell(6, G + 6).value = "달성율";

  styleRange(ws, 4, G, 6, G + 6, { fill: HEADER_FILL, border: true });
  for (let r = 4; r <= 6; r++) {
    for (let c = G; c <= G + 6; c++) {
      ws.getCell(r, c).alignment = { horizontal: "center", vertical: "middle" };
      ws.getCell(r, c).font = { size: 10, bold: true, name: "맑은 고딕" };
    }
  }

  let row = 7;
  for (const perf of PERFORMANCE_ROWS) {
    const hasSub = "sub" in perf && perf.sub;
    const endRow = hasSub ? row + 1 : row;

    ws.mergeCells(row, G, endRow, G);
    const labelCell = ws.getCell(row, G);
    labelCell.value = hasSub ? `${perf.label}\n(%)` : perf.label;
    labelCell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    labelCell.font = { size: 10, name: "맑은 고딕" };

    const mainVals = [perf.planM, perf.planY, perf.actualM, perf.achM, perf.forecastY, perf.achY];
    mainVals.forEach((v, i) => {
      const cell = ws.getCell(row, G + 1 + i);
      cell.value = v;
      cell.alignment = { horizontal: "right", vertical: "middle" };
      cell.font = { size: 10, name: "맑은 고딕" };
    });

    if (hasSub) {
      const subVals = [perf.sub, perf.subForecast, perf.subActual, "", perf.subAch, ""];
      subVals.forEach((v, i) => {
        const cell = ws.getCell(row + 1, G + 1 + i);
        cell.value = v ?? "";
        cell.alignment = { horizontal: "right", vertical: "middle" };
        cell.font = { size: 9, color: { argb: "FF666666" }, name: "맑은 고딕" };
      });
    }

    styleRange(ws, row, G, endRow, G + 6, { border: true });
    styleRange(ws, row, G, endRow, G, { fill: HEADER_FILL, border: true });
    row = endRow + 1;
  }
  const tableEndRow = row - 1;

  /* ---- analysis / outlook sections ---- */
  const perfOf = (label: string) => PERFORMANCE_ROWS.find((p) => p.label === label);
  const sales = perfOf("매출");
  const op = perfOf("영업이익");
  const ord2 = perfOf("경상이익");
  const sga = perfOf("판관비");
  const orders = perfOf("수주");

  // Fallback template used only when the user hasn't written any comments
  // for this month yet, so the section isn't left completely blank.
  const analysisAuto =
    `1. 수주 : 계획 대비 ${orders?.achM ?? "-"} 달성 (${orders?.actualM ?? "-"})\n` +
    `2. 매출 : 금월 누적 실적 ${sales?.actualM ?? "-"}, 달성율 ${sales?.achM ?? "-"}\n` +
    `3. 영업이익 : 금월 누적 ${op?.actualM ?? "-"} (달성율 ${op?.achM ?? "-"})\n` +
    `4. 판관비 : 계획 대비 ${sga?.achM ?? "-"} 집행으로 원가 절감 지속`;

  const outlookAuto =
    `1. 매출 : 연간 전망 ${sales?.forecastY ?? "-"}, 사업계획 대비 ${sales?.achY ?? "-"} 달성 전망\n` +
    `2. 영업이익 : 연간 전망 ${op?.forecastY ?? "-"} (달성율 ${op?.achY ?? "-"})\n` +
    `3. 경상이익 : 연간 전망 ${ord2?.forecastY ?? "-"} (달성율 ${ord2?.achY ?? "-"})\n` +
    `4. 판관비 : 적정 원가배분 모니터링 지속`;

  // Mirror the live CommentPanel: show each saved comment, numbered, with its date.
  const commentsText = (comments: SavedComment[]) =>
    comments
      .map((c, i) => `${i + 1}. ${c.body.replace(/\s*\n\s*/g, " ")} (${new Date(c.createdAt).toLocaleDateString("ko-KR")})`)
      .join("\n");

  const analysisText =
    savedComments.analysis.length > 0 ? commentsText(savedComments.analysis) : analysisAuto;
  const outlookText =
    savedComments.outlook.length > 0 ? commentsText(savedComments.outlook) : outlookAuto;

  const sections: { label: string; text: string; lines: number }[] = [
    { label: "실적\n분석", text: analysisText, lines: savedComments.analysis.length },
    { label: "전망", text: outlookText, lines: savedComments.outlook.length },
  ];

  row += 1;
  const sectionsStartRow = row;
  let sectionsEndRow = row;
  for (const section of sections) {
    const endRow = row + Math.max(4, section.lines);
    ws.mergeCells(row, G, endRow, G);
    const labelCell = ws.getCell(row, G);
    labelCell.value = section.label;
    labelCell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    labelCell.font = { size: 10, bold: true, name: "맑은 고딕" };

    ws.mergeCells(row, G + 1, endRow, G + 6);
    const textCell = ws.getCell(row, G + 1);
    textCell.value = section.text;
    textCell.alignment = { horizontal: "left", vertical: "middle", wrapText: true };
    textCell.font = { size: 10, name: "맑은 고딕" };

    styleRange(ws, row, G, endRow, G + 6, { border: true });
    styleRange(ws, row, G, endRow, G, { fill: HEADER_FILL, border: true });
    sectionsEndRow = endRow;
    row = endRow + 2;
  }

  /* ---- charts (left side) ---- */
  const groupedSeries: BarSeries[] = [
    { name: "사업계획 금월 누적", color: "#c6e0b4" },
    { name: "금월누적 실적/전망", color: "#548235" },
    { name: "사업계획 연간", color: "#b4c6e7" },
    { name: "연간 전망", color: "#4472c4" },
  ];
  const chart1 = drawGroupedBarChart(
    [
      {
        label: "수주",
        values: [num(orders?.planM), num(orders?.actualM), num(orders?.planY), num(orders?.forecastY)],
      },
      {
        label: "매출",
        values: [num(sales?.planM), num(sales?.actualM), num(sales?.planY), num(sales?.forecastY)],
      },
    ],
    groupedSeries,
  );

  const hSeries: BarSeries[] = [
    { name: "매출 계획", color: "#ffc000" },
    { name: "매출 실적/전망", color: "#2e5fa8" },
  ];
  const chart2 = drawHBarChart(
    "월별 매출현황",
    SALES_DATA.map((month) => ({
      label: month.month,
      values: [month.plan ?? 0, month.actual ?? 0],
    })),
    hSeries,
  );

  const img1 = wb.addImage({ base64: chart1, extension: "png" });
  const img2 = wb.addImage({ base64: chart2, extension: "png" });
  // Anchor charts to the same row ranges as the right-hand blocks so the
  // left charts line up with the table (chart 1) and the 실적 분석/전망
  // boxes (chart 2), matching the reference report layout.
  ws.addImage(img1, `A4:E${tableEndRow}`);
  ws.addImage(img2, `A${sectionsStartRow}:E${sectionsEndRow}`);

  // Constrain the print/fit-to-page area to just the real report content
  // (title + charts + table + comment sections) so "fit to 1 page" scales
  // it up to fill the A4 sheet instead of shrinking around empty columns.
  ws.pageSetup.printArea = `A1:M${sectionsEndRow}`;

  /* ---- raw data sheets (reference) ---- */
  const addDataSheet = (name: string, headers: string[], rows: (string | number)[][]) => {
    const sheet = wb.addWorksheet(name);
    const headerRow = sheet.addRow(headers);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, size: 10, name: "맑은 고딕" };
      cell.fill = HEADER_FILL;
      cell.border = BORDER_ALL;
      cell.alignment = { horizontal: "center" };
    });
    rows.forEach((r) => {
      const dataRow = sheet.addRow(r);
      dataRow.eachCell((cell) => {
        cell.font = { size: 10, name: "맑은 고딕" };
        cell.border = BORDER_ALL;
      });
    });
    sheet.columns.forEach((col) => {
      col.width = 16;
    });
  };

  addDataSheet(
    "KPI",
    ["구분", "계획", "실적", "달성률"],
    KPI_DATA.map((k) => [k.title, k.plan, k.actual, k.achievement]),
  );
  addDataSheet(
    "매출 실적 및 전망",
    ["월", "넷", "매출(계획)", "매출(실적 및 전망)"],
    SALES_DATA.map((r) => [r.month, r.net ?? "", r.plan ?? "", r.actual ?? ""]),
  );
  addDataSheet(
    "손익현황",
    ["월", "매출이익", "매출이익(%)", "영업이익", "영업이익(%)", "영업외수익", "판관비", "판관비(%)", "경상이익", "경상이익(%)", "건설", "용역"],
    PROFIT_DATA.map((r) => [r.m, r.total, r.totalPct, r.op, r.opPct, r.non, r.sga, r.sgaPct, r.ord, r.ordPct, r.con, r.svc]),
  );
  addDataSheet(
    "수주 실적 현황",
    ["계획", "수주", "잔여", "계획 대비"],
    [[
      ORDER_STATUS.planTotal,
      ORDER_STATUS.ordered,
      ORDER_STATUS.remaining,
      ORDER_STATUS.planTotal
        ? Math.round((ORDER_STATUS.ordered / ORDER_STATUS.planTotal) * 100) + "%"
        : "-",
    ]],
  );
  addDataSheet(
    "자금수지",
    ["월", "자금 유입", "자금 유출", "차액", "누적 현금 잔액"],
    cashflowRows.map((r) => [r.month, r.inflow, r.outflow, r.net, r.balance]),
  );
  const perfRows: (string | number)[][] = [];
  for (const r of PERFORMANCE_ROWS) {
    perfRows.push([r.label, r.planM, r.actualM, r.achM, r.planY, r.forecastY, r.achY]);
    if ("sub" in r && r.sub) {
      perfRows.push([`${r.label} (%)`, r.sub ?? "", r.subActual ?? "", "", r.subForecast ?? "", r.subAch ?? "", ""]);
    }
  }
  addDataSheet(
    "경영실적 현황",
    ["구분", "당월 누적 계획", "당월 누적 실적", "당월 누적 달성률", "연간 계획", "연간 전망", "연간 달성률"],
    perfRows,
  );

  /* ---- "card view" sheet: a visual snapshot of the dashboard's responsive
   * single/2-column card layout (same look as the on-screen ~750px-wide
   * view), scaled to fill one A4 portrait page when printed ---- */
  // Narrow enough that the responsive grid rows collapse the same way they
  // do on a real narrow browser window (clean 2-column KPI grid, single-
  // column charts/cashflow/comment rows) instead of an uneven 3+1 wrap.
  const CARD_VIEW_WIDTH = 480;
  const cardRowCanvases = await captureDashboardRows(CARD_VIEW_WIDTH);
  const cardTitleHeight = 110;
  const cardMaxWidth = Math.max(...cardRowCanvases.map((c) => c.width));
  const cardTotalHeight = cardTitleHeight + cardRowCanvases.reduce((sum, c) => sum + c.height, 0);

  const cardCanvas = document.createElement("canvas");
  cardCanvas.width = cardMaxWidth;
  cardCanvas.height = cardTotalHeight;
  const cardCtx = cardCanvas.getContext("2d");
  if (!cardCtx) {
    throw new Error("Excel 생성 중 캔버스를 만들 수 없습니다.");
  }
  cardCtx.fillStyle = "#e8edf3";
  cardCtx.fillRect(0, 0, cardMaxWidth, cardTitleHeight);
  cardCtx.fillStyle = "#1a2d4d";
  cardCtx.font = "700 40px 'Malgun Gothic', 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif";
  cardCtx.textAlign = "center";
  cardCtx.textBaseline = "middle";
  cardCtx.fillText(title, cardMaxWidth / 2, cardTitleHeight / 2 + 4);
  let cardY = cardTitleHeight;
  for (const rowCanvas of cardRowCanvases) {
    cardCtx.drawImage(rowCanvas, 0, cardY);
    cardY += rowCanvas.height;
  }

  // Fit the whole card-view snapshot onto one A4 portrait page.
  const PT_PER_PX96 = 96 / 72; // ExcelJS image ext is in 96dpi pixels
  const a4PortraitWidthPt = 595.28;
  const a4PortraitHeightPt = 841.89;
  const cardMarginPt = { x: 21.6, y: 28.8 }; // matches 0.3in / 0.4in page margins below
  const usableWidthPt = a4PortraitWidthPt - cardMarginPt.x * 2;
  const usableHeightPt = a4PortraitHeightPt - cardMarginPt.y * 2;
  const cardRenderScale = Math.min(usableWidthPt / cardCanvas.width, usableHeightPt / cardCanvas.height);
  const cardFinalWidthPt = cardCanvas.width * cardRenderScale;
  const cardFinalHeightPt = cardCanvas.height * cardRenderScale;
  const cardFinalWidthPx = cardFinalWidthPt * PT_PER_PX96;
  const cardFinalHeightPx = cardFinalHeightPt * PT_PER_PX96;

  const cardViewSheet = wb.addWorksheet("화면 보기", {
    views: [{ showGridLines: false }],
    pageSetup: {
      paperSize: 9, // A4
      orientation: "portrait",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 1,
      horizontalCentered: true,
      verticalCentered: true,
      margins: { left: 0.3, right: 0.3, top: 0.4, bottom: 0.4, header: 0.2, footer: 0.2 },
    },
  });
  const defaultRowHeightPt = 15;
  const cardRowCount = Math.max(2, Math.ceil(cardFinalHeightPt / defaultRowHeightPt) + 1);
  cardViewSheet.getColumn(1).width = Math.max(10, Math.ceil(cardFinalWidthPx / 7));
  for (let r = 1; r <= cardRowCount; r++) {
    cardViewSheet.getRow(r).height = defaultRowHeightPt;
  }
  cardViewSheet.pageSetup.printArea = `A1:A${cardRowCount}`;

  const cardImageId = wb.addImage({ base64: cardCanvas.toDataURL("image/png"), extension: "png" });
  cardViewSheet.addImage(cardImageId, {
    tl: { col: 0, row: 0 },
    ext: { width: cardFinalWidthPx, height: cardFinalHeightPx },
  });

  /* ---- download ---- */
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `PIMS_대시보드_${reportYear}_${String(reportMonth).padStart(2, "0")}_${todayStamp()}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ------------------------------ shared capture ----------------------------- */

/**
 * Captures the dashboard's KPI/charts/cashflow/comments rows (one canvas per
 * `[data-export-row]` block) at a fixed CSS width, so the layout is
 * deterministic regardless of the user's actual browser width. A narrower
 * `captureWidth` makes the responsive grid rows collapse to fewer columns
 * (matching the stacked single/2-column card view used for the Excel export);
 * the wide desktop width is used for the PDF export.
 */
/**
 * Waits for an element's chart (if any) to have actually painted shapes
 * before it's safe to screenshot. Recharts sizes/draws its <svg> after a
 * ResizeObserver callback fires post-resize, which can lag behind a plain
 * fixed delay — capturing too early yields a blank white card.
 */
async function waitForChartPaint(el: HTMLElement, timeoutMs = 1200): Promise<void> {
  const svgs = Array.from(el.querySelectorAll("svg"));
  if (svgs.length === 0) return;
  const isPainted = (svg: SVGElement) => {
    const rect = svg.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 && svg.childElementCount > 0;
  };
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (svgs.every(isPainted)) return;
    await new Promise((resolve) => setTimeout(resolve, 60));
  }
}

async function captureDashboardRows(captureWidth: number): Promise<HTMLCanvasElement[]> {
  const target = document.getElementById("dashboard-capture");
  if (!target) {
    throw new Error("대시보드 영역을 찾을 수 없습니다.");
  }

  const prevWidth = target.style.width;
  const prevMinWidth = target.style.minWidth;
  target.style.width = `${captureWidth}px`;
  target.style.minWidth = `${captureWidth}px`;

  // Hide interactive-only bits (month pickers, comment input boxes, edit/delete
  // buttons) that don't belong in a printed report, while keeping the saved
  // comment text itself visible.
  const hiddenEls = Array.from(target.querySelectorAll<HTMLElement>(".export-hide"));
  const prevDisplays = hiddenEls.map((el) => el.style.display);
  hiddenEls.forEach((el) => (el.style.display = "none"));

  const rowEls = Array.from(target.querySelectorAll<HTMLElement>("[data-export-row]"));

  // On screen the grid rows use a fixed column count; for export, switch them
  // to their responsive template (data-export-cols) so they wrap to fit
  // captureWidth.
  const responsiveEls = Array.from(target.querySelectorAll<HTMLElement>("[data-export-cols]"));
  const prevGridCols = responsiveEls.map((el) => el.style.gridTemplateColumns);
  responsiveEls.forEach((el) => (el.style.gridTemplateColumns = el.dataset.exportCols ?? ""));

  let rowCanvases: HTMLCanvasElement[];
  try {
    // Give responsive charts/grid time to re-render at the new width
    await new Promise((resolve) => setTimeout(resolve, 900));

    rowCanvases = [];
    for (const row of rowEls) {
      // Recharts draws its <svg> asynchronously (ResizeObserver) after the
      // width change, so a chart block captured too early comes out as a
      // blank white card. Poll briefly for the chart to actually have
      // painted shapes before snapshotting this block.
      await waitForChartPaint(row);

      // Record each card's position/size and the row's own height right
      // before capturing — reading them again afterwards risks a layout
      // shift (e.g. a chart's ResizeObserver doing one more correction
      // pass) landing between the snapshot and the read, which would crop
      // the captured pixels at the wrong boundaries.
      const blocks = Array.from(row.querySelectorAll<HTMLElement>(":scope > [data-export-block]"));
      // offsetTop is relative to the nearest positioned offsetParent, which
      // may not be `row` itself if row has no explicit `position` — using
      // getBoundingClientRect() instead gives coordinates reliably relative
      // to `row`'s own box regardless of the offsetParent chain.
      const rowRect = row.getBoundingClientRect();
      const blockRects = blocks.map((b) => {
        const r = b.getBoundingClientRect();
        return { top: r.top - rowRect.top, bottom: r.bottom - rowRect.top };
      });
      const rowScrollHeight = row.scrollHeight;

      const canvas = await html2canvas(row, {
        scale: 3,
        useCORS: true,
        backgroundColor: "#e8edf3",
        // Let html2canvas size the output canvas from the element's own
        // actual rendered dimensions — forcing a fixed output `width` here
        // stretched/distorted text when a block's real width (e.g. a
        // single grid column) didn't exactly match captureWidth.
        // `windowWidth` still pins the layout viewport to the narrow
        // responsive width.
        windowWidth: captureWidth + 200,
        windowHeight: row.scrollHeight,
      });

      // If the row's cards (data-export-block) wrapped into several visual
      // sub-rows (e.g. 2 cards side by side, with a 3rd wrapping to its own
      // line), slice the captured row image at those sub-row boundaries
      // instead of keeping it as one tall unit. Otherwise a short sub-row
      // like the lone wrapped card gets dragged along with the taller
      // combined row height, and the whole thing either gets pushed to a
      // fresh page wholesale (wasting the rest of the previous page) or
      // wastes space once placed — splitting lets each sub-row flow and
      // fill leftover page space independently.
      if (blockRects.length > 1) {
        const pxScale = canvas.height / rowScrollHeight;
        const subRowRanges: { top: number; bottom: number }[] = [];
        for (const { top: topPx, bottom: bottomPx } of blockRects) {
          const top = topPx * pxScale;
          const bottom = bottomPx * pxScale;
          const existing = subRowRanges.find((r) => top < r.bottom && bottom > r.top);
          if (existing) {
            existing.top = Math.min(existing.top, top);
            existing.bottom = Math.max(existing.bottom, bottom);
          } else {
            subRowRanges.push({ top, bottom });
          }
        }
        subRowRanges.sort((a, b) => a.top - b.top);
        for (const range of subRowRanges) {
          const sy = Math.max(0, Math.round(range.top));
          const sh = Math.min(canvas.height, Math.round(range.bottom)) - sy;
          if (sh <= 0) continue;
          const subCanvas = document.createElement("canvas");
          subCanvas.width = canvas.width;
          subCanvas.height = sh;
          const subCtx = subCanvas.getContext("2d");
          if (subCtx) {
            subCtx.drawImage(canvas, 0, sy, canvas.width, sh, 0, 0, canvas.width, sh);
            rowCanvases.push(subCanvas);
          }
        }
      } else {
        rowCanvases.push(canvas);
      }
    }
  } finally {
    target.style.width = prevWidth;
    target.style.minWidth = prevMinWidth;
    hiddenEls.forEach((el, i) => (el.style.display = prevDisplays[i]));
    responsiveEls.forEach((el, i) => (el.style.gridTemplateColumns = prevGridCols[i]));
  }

  return rowCanvases;
}

/* ------------------------------ PDF export ------------------------------- */

export async function exportDashboardPdf(): Promise<void> {
  // Capture at a fixed width so the PDF layout is deterministic regardless
  // of the user's current browser window size — wide enough that the
  // responsive grid rows lay their cards out side by side (matching the
  // ~1140px desktop-ish view), not stacked into a single column.
  const CAPTURE_WIDTH = 1140;
  const rowCanvases = await captureDashboardRows(CAPTURE_WIDTH);

  // Lay each dashboard row (KPI cards, charts, cashflow/performance, comments)
  // out on A4 pages as whole blocks — flowing to a new page whenever a row
  // wouldn't fit, rather than slicing one giant screenshot at arbitrary
  // pixel boundaries (which used to cut cards/charts in half).
  const title = "DAEWOOVINA 경영현황 보고서";
  const margin = 24;
  const rowGap = 10;
  const TITLE_BAR_HEIGHT = 44;
  // jsPDF's built-in fonts can't render Korean text (it comes out as mojibake),
  // so the title bar is rendered to a canvas with a Korean-capable font and
  // embedded as an image instead of using pdf.text().
  const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const availableWidth = pageWidth - margin * 2;
  const availableHeight = pageHeight - margin * 2;
  // Rows are captured at CSS width CAPTURE_WIDTH with devicePixelRatio scale 3,
  // so a plain width-fit (no extra zoom) already fills the full page width —
  // zooming further would push content past the right edge of the page.

  const titleImage = (() => {
    const dpr = 2;
    const c = document.createElement("canvas");
    c.width = pageWidth * dpr;
    c.height = TITLE_BAR_HEIGHT * dpr;
    const tctx = c.getContext("2d")!;
    tctx.scale(dpr, dpr);
    tctx.fillStyle = "#e8edf3";
    tctx.fillRect(0, 0, pageWidth, TITLE_BAR_HEIGHT);
    tctx.fillStyle = "#1a2d4d";
    tctx.font = "700 22px 'Malgun Gothic', 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif";
    tctx.textAlign = "center";
    tctx.textBaseline = "middle";
    tctx.fillText(title, pageWidth / 2, TITLE_BAR_HEIGHT / 2 + 2);
    return c.toDataURL("image/png");
  })();

  const drawTitle = () => {
    pdf.addImage(titleImage, "PNG", 0, 0, pageWidth, TITLE_BAR_HEIGHT);
  };

  // The title banner is only drawn on the first page — later pages use the
  // full page height for content instead of repeating it.
  drawTitle();
  let isFirstPage = true;
  let cursorY = margin + TITLE_BAR_HEIGHT;
  const pageTopFor = () => (isFirstPage ? margin + TITLE_BAR_HEIGHT : margin);
  const startNewPage = () => {
    pdf.addPage();
    isFirstPage = false;
    cursorY = pageTopFor();
  };

  const addImageBlock = (canvas: HTMLCanvasElement, scale: number) => {
    const w = canvas.width * scale;
    const h = canvas.height * scale;
    pdf.addImage(canvas.toDataURL("image/png"), "PNG", margin, cursorY, w, h);
    cursorY += h + rowGap;
  };

  for (const canvas of rowCanvases) {
    const fitScale = availableWidth / canvas.width;
    const rowHeight = canvas.height * fitScale;
    const availableOnFreshPage = availableHeight - (pageTopFor() - margin);

    if (rowHeight <= availableOnFreshPage) {
      // Row fits within a single page height — start a fresh page for it
      // if it won't fit in the space remaining on the current one.
      if (cursorY + rowHeight > margin + availableHeight && cursorY > pageTopFor()) {
        startNewPage();
      }
      addImageBlock(canvas, fitScale);
    } else {
      // Row itself is taller than one page — slice just this row across
      // consecutive pages instead of shrinking it to fit.
      if (cursorY > pageTopFor()) {
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

  pdf.save(`PIMS_대시보드_${todayStamp()}.pdf`);
}
