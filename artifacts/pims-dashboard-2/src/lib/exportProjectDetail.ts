import type { ProjectDetail } from "./projectDetailData";
import { convertMoney, moneyUnitLabel } from "./displayUnit";

/**
 * 프로젝트 상세 데이터(공정/원가/외주/자금)를 Excel 로 내보내기.
 * 금액은 현재 선택된 통화/단위(Currency/Unit 필터)로 변환하여 출력.
 */
export async function exportProjectDetailExcel(
  projectName: string,
  detail: ProjectDetail,
  currency: string,
  unitOn: boolean,
): Promise<void> {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  wb.created = new Date();

  const unitLabel = moneyUnitLabel(currency, unitOn);
  const money = (v: number | null | undefined): number | null =>
    v == null || Number.isNaN(v) ? null : Math.round(convertMoney(v, currency, unitOn) * 10) / 10;

  const headerStyle = (ws: import("exceljs").Worksheet, rowIdx: number) => {
    const row = ws.getRow(rowIdx);
    row.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2E3C50" } };
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border = {
        top: { style: "thin" },
        bottom: { style: "thin" },
        left: { style: "thin" },
        right: { style: "thin" },
      };
    });
  };

  const addTitle = (ws: import("exceljs").Worksheet, title: string) => {
    ws.getCell("A1").value = `${title} — ${projectName} (단위: ${unitLabel})`;
    ws.getCell("A1").font = { bold: true, size: 12, color: { argb: "FF1A3A6B" } };
    ws.addRow([]);
  };

  // 1. 개요
  {
    const ws = wb.addWorksheet("개요");
    addTitle(ws, "프로젝트 개요");
    const ov = detail.overview;
    const rows: [string, string | number | null][] = [
      ["프로젝트", projectName],
      ["발주처", ov.client ?? "-"],
      ["착공일", ov.startDate ?? "-"],
      ["준공일", ov.endDate ?? "-"],
      [`도급액 (${unitLabel})`, money(ov.contractAmount)],
      ["공사규모", ov.scale ?? "-"],
    ];
    for (const [k, v] of rows) {
      const r = ws.addRow([k, v]);
      r.getCell(1).font = { bold: true, size: 10 };
      r.getCell(2).font = { size: 10 };
      if (typeof v === "number") r.getCell(2).numFmt = "#,##0.#";
    }
    ws.getColumn(1).width = 22;
    ws.getColumn(2).width = 40;
  }

  // 2. 공정
  if (detail.progress.length > 0) {
    const ws = wb.addWorksheet("공정");
    addTitle(ws, "월별 공정률 (%)");
    ws.addRow(["연도", "월", "월 계획(%)", "월 실적(%)", "누계 계획(%)", "누계 실적(%)"]);
    headerStyle(ws, 3);
    for (const p of detail.progress) {
      ws.addRow([p.year, p.month, p.planPct ?? null, p.actualPct ?? null, p.planCumPct ?? null, p.actualCumPct ?? null]);
    }
    ws.columns.forEach((c) => (c.width = 14));
  }

  // 3. 원가
  if (detail.costEstimation.length > 0 || detail.costBudget.length > 0) {
    const ws = wb.addWorksheet("원가");
    addTitle(ws, "원가율 / 실행예산");
    if (detail.costEstimation.length > 0) {
      ws.addRow(["구분", `도급액 (${unitLabel})`, `원가 (${unitLabel})`]);
      headerStyle(ws, ws.rowCount);
      const KIND_LABELS: Record<string, string> = { bidding: "Bidding", execution: "Execution Budgeting", completion: "Estimated Completion" };
      for (const e of detail.costEstimation) {
        ws.addRow([KIND_LABELS[e.kind] ?? e.kind, money(e.contractAmount), money(e.costAmount)]);
      }
      ws.addRow([]);
    }
    if (detail.costBudget.length > 0) {
      ws.addRow(["분류", "항목", `예산 (${unitLabel})`, `계획 (${unitLabel})`, `실적 (${unitLabel})`]);
      headerStyle(ws, ws.rowCount);
      for (const b of detail.costBudget) {
        ws.addRow([b.category ?? "", b.item, money(b.budget), money(b.plan), money(b.actual)]);
      }
    }
    ws.columns.forEach((c) => (c.width = 18));
  }

  // 4. 외주
  if (detail.outsourcing.length > 0) {
    const ws = wb.addWorksheet("외주");
    addTitle(ws, "외주 계약 현황");
    ws.addRow(["공종", "업체", "계약일", "변경차수", `예산 (${unitLabel})`, `기성확정 (${unitLabel})`, `당월 (${unitLabel})`, `누계 (${unitLabel})`]);
    headerStyle(ws, 3);
    for (const o of detail.outsourcing) {
      ws.addRow([o.trade, o.vendor ?? "", o.contractDate ?? "", o.changeNo ?? "", money(o.budget), money(o.resolved), money(o.thisMonth), money(o.accum)]);
    }
    ws.columns.forEach((c) => (c.width = 16));
  }

  // 5. 자금
  if (detail.cashflow.length > 0) {
    const ws = wb.addWorksheet("자금");
    addTitle(ws, "월별 자금");
    ws.addRow(["연도", "월", `수입 (${unitLabel})`, `지출 (${unitLabel})`, `보유현금 (${unitLabel})`]);
    headerStyle(ws, 3);
    for (const c of detail.cashflow) {
      ws.addRow([c.year, c.month, money(c.cashIn), money(c.cashOut), money(c.equivalent)]);
    }
    ws.columns.forEach((c) => (c.width = 16));
  }

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const today = new Date().toISOString().slice(0, 10);
  a.download = `${projectName}_대시보드_${today}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
