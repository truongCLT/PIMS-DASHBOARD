import type ExcelJS from "exceljs";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas-pro";
import { getCashflowAggregate, listMgmtreportComments } from "@workspace/api-client-react";
import { getDashboardExportData } from "./mgmtreportData";

async function fetchSavedComments(
  year: number,
  month: number,
): Promise<{ analysis: string[]; outlook: string[] }> {
  try {
    const res = await listMgmtreportComments({ year, month });
    const analysis: string[] = [];
    const outlook: string[] = [];
    // API returns newest first; report shows oldest first
    for (const c of [...res.comments].reverse()) {
      (c.section === "analysis" ? analysis : outlook).push(c.body);
    }
    return { analysis, outlook };
  } catch {
    return { analysis: [], outlook: [] };
  }
}

// Same params as the on-screen 자금수지 chart (DECV 전체 scope)
const CASHFLOW_EXPORT_PARAMS = {
  divisions: "도급 사업,용역 사업",
  fromYear: 2026,
  fromMonth: 1,
  months: 6,
};

interface CashflowExportRow {
  month: string;
  inflow: number;
  outflow: number;
  net: number;
  balance: number;
}

async function fetchCashflowExportRows(): Promise<CashflowExportRow[]> {
  try {
    const series = await getCashflowAggregate(CASHFLOW_EXPORT_PARAMS);
    return (series.points ?? []).map((p) => ({
      month: `${Number(p.month.slice(5, 7))}월`,
      inflow: p.cashIn,
      outflow: p.cashOut,
      net: p.cashIn - p.cashOut,
      balance: p.equivalent,
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
  return v === 0 ? "-" : Math.round(v).toLocaleString("ko-KR");
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
    fetchCashflowExportRows(),
    fetchSavedComments(reportYear, reportMonth),
  ]);
  const { default: ExcelJS } = await import("exceljs");
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("경영실적보고", {
    views: [{ showGridLines: false }],
  });

  // Column layout: A~E charts / F spacer / G~M table
  ws.columns = [
    { width: 12 }, { width: 12 }, { width: 12 }, { width: 12 }, { width: 12 },
    { width: 2 },
    { width: 10 }, { width: 11 }, { width: 11 }, { width: 11 }, { width: 9 },
    { width: 11 }, { width: 9 },
  ];

  const now = new Date();
  const title = `${now.getFullYear()}년 ${now.getMonth() + 1}월 DECV 경영실적보고`;

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

  const numberComments = (bodies: string[], startAt: number) =>
    bodies.map((b, i) => `${startAt + i}. ${b.replace(/\s*\n\s*/g, " ")}`).join("\n");

  const analysisAuto =
    `1. 수주 : 계획 대비 ${orders?.achM ?? "-"} 달성 (${orders?.actualM ?? "-"})\n` +
    `2. 매출 : 금월 누적 실적 ${sales?.actualM ?? "-"}, 달성율 ${sales?.achM ?? "-"}\n` +
    `3. 영업이익 : 금월 누적 ${op?.actualM ?? "-"} (달성율 ${op?.achM ?? "-"})\n` +
    `4. 판관비 : 계획 대비 ${sga?.achM ?? "-"} 집행으로 원가 절감 지속`;
  const analysisText =
    savedComments.analysis.length > 0
      ? `${analysisAuto}\n${numberComments(savedComments.analysis, 5)}`
      : analysisAuto;

  const outlookAuto =
    `1. 매출 : 연간 전망 ${sales?.forecastY ?? "-"}, 사업계획 대비 ${sales?.achY ?? "-"} 달성 전망\n` +
    `2. 영업이익 : 연간 전망 ${op?.forecastY ?? "-"} (달성율 ${op?.achY ?? "-"})\n` +
    `3. 경상이익 : 연간 전망 ${ord2?.forecastY ?? "-"} (달성율 ${ord2?.achY ?? "-"})\n` +
    `4. 판관비 : 적정 원가배분 모니터링 지속`;
  const outlookText =
    savedComments.outlook.length > 0
      ? `${outlookAuto}\n${numberComments(savedComments.outlook, 5)}`
      : outlookAuto;

  const sections: { label: string; text: string; lines: number }[] = [
    { label: "실적\n분석", text: analysisText, lines: 4 + savedComments.analysis.length },
    { label: "전망", text: outlookText, lines: 4 + savedComments.outlook.length },
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
    { name: "연간 사업계획", color: "#ffc000" },
    { name: "연간 실적/전망", color: "#2e5fa8" },
    { name: "금월 누적 사업계획", color: "#c0504d" },
    { name: "금월 누적 실적/전망", color: "#a6a6a6" },
  ];
  const ratios: { label: string; r: number }[] = [
    { label: "시공", r: 0.81 },
    { label: "용역", r: 0.16 },
    { label: "자산관리", r: 0.03 },
  ];
  const chart2 = drawHBarChart(
    "공종별 매출현황",
    ratios.map((c) => ({
      label: c.label,
      values: [
        num(sales?.planY) * c.r,
        num(sales?.forecastY) * c.r,
        num(sales?.planM) * c.r,
        num(sales?.actualM) * c.r,
      ],
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

  /* ---- download ---- */
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `PIMS_대시보드_${todayStamp()}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ------------------------------ PDF export ------------------------------- */

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

  // Exclude the comment cards (매출 실적 / 매출 전망) from the PDF
  const commentRow = document.getElementById("comment-cards-row");
  const prevCommentDisplay = commentRow?.style.display ?? "";
  if (commentRow) commentRow.style.display = "none";

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
    if (commentRow) commentRow.style.display = prevCommentDisplay;
  }

  // Compose a titled canvas: report title on top, dashboard capture below.
  const d = new Date();
  const dateLabel = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
  const title = `DAEWOO E&C 경영현황 보고서 - ${dateLabel}`;

  const TITLE_HEIGHT = 110;
  const titled = document.createElement("canvas");
  titled.width = canvas.width;
  titled.height = canvas.height + TITLE_HEIGHT;
  const ctx = titled.getContext("2d");
  if (!ctx) {
    throw new Error("PDF 생성 중 캔버스를 만들 수 없습니다.");
  }
  ctx.fillStyle = "#e8edf3";
  ctx.fillRect(0, 0, titled.width, TITLE_HEIGHT);
  ctx.fillStyle = "#1a2d4d";
  ctx.font = "700 44px 'Malgun Gothic', 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(title, titled.width / 2, TITLE_HEIGHT / 2 + 6);
  ctx.drawImage(canvas, 0, TITLE_HEIGHT);

  const imgWidth = titled.width;
  const imgHeight = titled.height;

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

  const imgData = titled.toDataURL("image/png");
  pdf.addImage(imgData, "PNG", margin, margin, renderWidth, renderHeight);

  pdf.save(`PIMS_대시보드_${todayStamp()}.pdf`);
}
