import type {
  ProjectDetail,
  ProjectDetailProgressPoint,
  ProjectDetailMilestone,
  ProjectDetailCostEstimation,
  ProjectDetailCostBudget,
  ProjectDetailOutsourcing,
  ProjectDetailCashflowPoint,
} from "@workspace/api-client-react";

// 시트/헤더 정의 — 다운로드와 업로드가 같은 양식을 사용한다. (금액 단위: 천 USD 원본값 그대로)
const SHEETS = {
  overview: "개요",
  progress: "1.공정률",
  milestones: "2.마일스톤",
  costEstimation: "3.원가율",
  costBudget: "4.예산집행",
  outsourcing: "5.외주자재",
  cashflow: "6.월별자금",
} as const;

const HEADERS: Record<string, string[]> = {
  [SHEETS.progress]: ["연도", "월", "월간 계획(%)", "월간 실적(%)", "누계 계획(%)", "누계 실적(%)"],
  [SHEETS.milestones]: ["구분", "계획 시작(YYYY-MM)", "계획 종료(YYYY-MM)", "실제 시작(YYYY-MM)", "실제 종료(YYYY-MM)"],
  [SHEETS.costEstimation]: ["구분(bidding/execution/completion)", "기준연도", "기준월", "도급액(천USD)", "원가(천USD)"],
  [SHEETS.costBudget]: ["구분", "항목", "예산(천USD)", "계획(천USD)", "실적(천USD)"],
  [SHEETS.outsourcing]: [
    "대공종",
    "세부공종",
    "업체",
    "구분",
    "계약일",
    "차수",
    "예산(천USD)",
    "실행예산(천USD)",
    "기성확정(천USD)",
    "당월(천USD)",
    "누계(천USD)",
  ],
  [SHEETS.cashflow]: ["연도", "월", "수입(천USD)", "지출(천USD)", "보유현금(천USD)"],
};

type Cell = string | number | null;

/** 데이터 입력용 Excel 양식 다운로드 (현재 저장된 데이터 포함, 천 USD 원본 단위) */
export async function downloadProjectDetailTemplate(projectName: string, detail: ProjectDetail): Promise<void> {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  wb.created = new Date();

  const addSheet = (name: string, rows: Cell[][]) => {
    const ws = wb.addWorksheet(name);
    const header = HEADERS[name];
    if (header) {
      const hr = ws.addRow(header);
      hr.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2E3C50" } };
        cell.alignment = { horizontal: "center", vertical: "middle" };
      });
    }
    for (const r of rows) ws.addRow(r);
    ws.columns.forEach((col) => {
      col.width = 16;
    });
    return ws;
  };

  // 개요 (key/value)
  {
    const ov = detail.overview;
    const ws = wb.addWorksheet(SHEETS.overview);
    const rows: [string, Cell][] = [
      ["발주처", ov.client ?? null],
      ["착공일(YYYY-MM-DD)", ov.startDate ?? null],
      ["준공일(YYYY-MM-DD)", ov.endDate ?? null],
      ["도급액(천USD)", ov.contractAmount ?? null],
      ["공사규모", ov.scale ?? null],
    ];
    for (const [k, v] of rows) {
      const r = ws.addRow([k, v]);
      r.getCell(1).font = { bold: true, size: 10 };
    }
    ws.getColumn(1).width = 22;
    ws.getColumn(2).width = 30;
  }

  addSheet(
    SHEETS.progress,
    detail.progress.map((p) => [p.year, p.month, p.planPct ?? null, p.actualPct ?? null, p.planCumPct ?? null, p.actualCumPct ?? null]),
  );
  addSheet(
    SHEETS.milestones,
    detail.milestones.map((m) => [m.label, m.planStart ?? null, m.planEnd ?? null, m.actualStart ?? null, m.actualEnd ?? null]),
  );
  addSheet(
    SHEETS.costEstimation,
    detail.costEstimation.map((e) => [e.kind, e.year ?? null, e.month ?? null, e.contractAmount ?? null, e.costAmount ?? null]),
  );
  addSheet(
    SHEETS.costBudget,
    detail.costBudget.map((b) => [b.category ?? null, b.item, b.budget ?? null, b.plan ?? null, b.actual ?? null]),
  );
  addSheet(
    SHEETS.outsourcing,
    detail.outsourcing.map((o) => [
      o.tradeGroup ?? null,
      o.trade,
      o.vendor ?? null,
      o.category ?? null,
      o.contractDate ?? null,
      o.changeNo ?? null,
      o.budget ?? null,
      o.executedBudget ?? null,
      o.resolved ?? null,
      o.thisMonth ?? null,
      o.accum ?? null,
    ]),
  );
  addSheet(
    SHEETS.cashflow,
    detail.cashflow.map((c) => [c.year, c.month, c.cashIn ?? null, c.cashOut ?? null, c.equivalent ?? null]),
  );

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${projectName}_데이터입력_${new Date().toISOString().slice(0, 10)}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}

// ---------- 업로드(파싱) ----------

function cellStr(v: unknown): string | null {
  if (v == null) return null;
  if (v instanceof Date) {
    const y = v.getFullYear();
    const m = String(v.getMonth() + 1).padStart(2, "0");
    const d = String(v.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  if (typeof v === "object") {
    const o = v as { text?: unknown; result?: unknown; richText?: Array<{ text: string }> };
    if (Array.isArray(o.richText)) return o.richText.map((t) => t.text).join("").trim() || null;
    if (o.text != null) return String(o.text).trim() || null;
    if (o.result != null) return cellStr(o.result);
    return null;
  }
  const s = String(v).trim();
  return s.length > 0 ? s : null;
}

function cellNum(v: unknown): number | null {
  if (v == null) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "object") {
    const o = v as { result?: unknown };
    if (o.result != null) return cellNum(o.result);
  }
  const s = String(v).replace(/,/g, "").trim();
  if (s.length === 0) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function cellInt(v: unknown): number | null {
  const n = cellNum(v);
  return n == null ? null : Math.round(n);
}

/** 'YYYY-MM' 정규화 (Date/문자열 허용) */
function cellYm(v: unknown): string | null {
  const s = cellStr(v);
  if (!s) return null;
  const m = /^(\d{4})[-./](\d{1,2})/.exec(s);
  if (!m) return null;
  return `${m[1]}-${m[2].padStart(2, "0")}`;
}

export class ExcelParseError extends Error {}

/**
 * 업로드된 양식을 파싱해 ProjectDetail 본문을 만든다.
 * 시트가 없는 항목은 기존(existing) 값을 유지하고, 사진(photos)은 항상 기존 값을 유지한다.
 */
export async function parseProjectDetailWorkbook(file: File, existing: ProjectDetail): Promise<ProjectDetail> {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await file.arrayBuffer());

  const findSheet = (name: string) =>
    wb.worksheets.find((ws) => ws.name.trim() === name || ws.name.replace(/^\d+\./, "").trim() === name.replace(/^\d+\./, ""));

  const rowsOf = (name: string, skipHeader: boolean): unknown[][] | null => {
    const ws = findSheet(name);
    if (!ws) return null;
    const rows: unknown[][] = [];
    ws.eachRow({ includeEmpty: false }, (row, idx) => {
      if (skipHeader && idx === 1) return;
      const vals: unknown[] = [];
      for (let c = 1; c <= 11; c++) vals.push(row.getCell(c).value);
      if (vals.some((v) => cellStr(v) != null || cellNum(v) != null)) rows.push(vals);
    });
    return rows;
  };

  const result: ProjectDetail = { ...existing, photos: existing.photos };

  // 개요
  {
    const rows = rowsOf(SHEETS.overview, false);
    if (rows) {
      const map = new Map<string, unknown>();
      for (const r of rows) {
        const k = cellStr(r[0]);
        if (k) map.set(k.replace(/\(.*\)$/, "").trim(), r[1]);
      }
      result.overview = {
        ...existing.overview,
        client: cellStr(map.get("발주처")) ?? null,
        startDate: cellStr(map.get("착공일")) ?? null,
        endDate: cellStr(map.get("준공일")) ?? null,
        contractAmount: cellNum(map.get("도급액")) ?? null,
        scale: cellStr(map.get("공사규모")) ?? null,
      };
    }
  }

  // 공정률
  {
    const rows = rowsOf(SHEETS.progress, true);
    if (rows) {
      const out: ProjectDetailProgressPoint[] = [];
      rows.forEach((r, i) => {
        const year = cellInt(r[0]);
        const month = cellInt(r[1]);
        if (year == null || month == null) throw new ExcelParseError(`[${SHEETS.progress}] ${i + 2}행: 연도/월이 비어 있습니다.`);
        if (month < 1 || month > 12) throw new ExcelParseError(`[${SHEETS.progress}] ${i + 2}행: 월(${month})이 올바르지 않습니다.`);
        out.push({
          year,
          month,
          planPct: cellNum(r[2]),
          actualPct: cellNum(r[3]),
          planCumPct: cellNum(r[4]),
          actualCumPct: cellNum(r[5]),
        });
      });
      result.progress = out;
    }
  }

  // 마일스톤
  {
    const rows = rowsOf(SHEETS.milestones, true);
    if (rows) {
      const out: ProjectDetailMilestone[] = [];
      rows.forEach((r, i) => {
        const label = cellStr(r[0]);
        if (!label) throw new ExcelParseError(`[${SHEETS.milestones}] ${i + 2}행: 구분(이름)이 비어 있습니다.`);
        out.push({
          label,
          planStart: cellYm(r[1]),
          planEnd: cellYm(r[2]),
          actualStart: cellYm(r[3]),
          actualEnd: cellYm(r[4]),
        });
      });
      result.milestones = out;
    }
  }

  // 원가율
  {
    const rows = rowsOf(SHEETS.costEstimation, true);
    if (rows) {
      const out: ProjectDetailCostEstimation[] = [];
      rows.forEach((r, i) => {
        const kindRaw = (cellStr(r[0]) ?? "").toLowerCase();
        const kind = kindRaw.includes("bid") ? "bidding" : kindRaw.includes("exec") ? "execution" : kindRaw.includes("comp") ? "completion" : null;
        if (!kind) throw new ExcelParseError(`[${SHEETS.costEstimation}] ${i + 2}행: 구분은 bidding/execution/completion 중 하나여야 합니다.`);
        out.push({
          kind,
          year: cellInt(r[1]),
          month: cellInt(r[2]),
          contractAmount: cellNum(r[3]),
          costAmount: cellNum(r[4]),
        });
      });
      // 준공 전망(completion) 검증: 기준월 중복 / 기준월 없는 행 다중 입력 방지 (데이터 입력 화면과 동일 규칙)
      const completions = out.filter((e) => e.kind === "completion" && (e.contractAmount != null || e.costAmount != null));
      if (completions.filter((e) => e.year == null || e.month == null).length > 1) {
        throw new ExcelParseError(`[${SHEETS.costEstimation}] 준공 전망(completion)에서 기준연도/월이 없는 행은 1건만 입력할 수 있습니다.`);
      }
      const seen = new Set<string>();
      for (const c of completions) {
        if (c.year == null || c.month == null) continue;
        if (c.month < 1 || c.month > 12) {
          throw new ExcelParseError(`[${SHEETS.costEstimation}] 준공 전망의 기준월(${c.month})이 올바르지 않습니다.`);
        }
        const key = `${c.year}-${c.month}`;
        if (seen.has(key)) {
          throw new ExcelParseError(`[${SHEETS.costEstimation}] 준공 전망에 같은 기준월(${c.year}.${String(c.month).padStart(2, "0")})이 중복 입력되었습니다.`);
        }
        seen.add(key);
      }
      result.costEstimation = out;
    }
  }

  // 예산 집행
  {
    const rows = rowsOf(SHEETS.costBudget, true);
    if (rows) {
      const out: ProjectDetailCostBudget[] = [];
      rows.forEach((r, i) => {
        const item = cellStr(r[1]);
        if (!item) throw new ExcelParseError(`[${SHEETS.costBudget}] ${i + 2}행: 항목이 비어 있습니다.`);
        out.push({
          category: cellStr(r[0]),
          item,
          budget: cellNum(r[2]),
          plan: cellNum(r[3]),
          actual: cellNum(r[4]),
        });
      });
      result.costBudget = out;
    }
  }

  // 외주/자재
  {
    const rows = rowsOf(SHEETS.outsourcing, true);
    if (rows) {
      const out: ProjectDetailOutsourcing[] = [];
      rows.forEach((r, i) => {
        const trade = cellStr(r[1]);
        if (!trade) throw new ExcelParseError(`[${SHEETS.outsourcing}] ${i + 2}행: 세부공종이 비어 있습니다.`);
        out.push({
          tradeGroup: cellStr(r[0]),
          trade,
          vendor: cellStr(r[2]),
          category: cellStr(r[3]),
          contractDate: cellStr(r[4]),
          changeNo: cellStr(r[5]),
          budget: cellNum(r[6]),
          executedBudget: cellNum(r[7]),
          resolved: cellNum(r[8]),
          thisMonth: cellNum(r[9]),
          accum: cellNum(r[10]),
        });
      });
      result.outsourcing = out;
    }
  }

  // 월별 자금
  {
    const rows = rowsOf(SHEETS.cashflow, true);
    if (rows) {
      const out: ProjectDetailCashflowPoint[] = [];
      rows.forEach((r, i) => {
        const year = cellInt(r[0]);
        const month = cellInt(r[1]);
        if (year == null || month == null) throw new ExcelParseError(`[${SHEETS.cashflow}] ${i + 2}행: 연도/월이 비어 있습니다.`);
        if (month < 1 || month > 12) throw new ExcelParseError(`[${SHEETS.cashflow}] ${i + 2}행: 월(${month})이 올바르지 않습니다.`);
        out.push({ year, month, cashIn: cellNum(r[2]), cashOut: cellNum(r[3]), equivalent: cellNum(r[4]) });
      });
      result.cashflow = out;
    }
  }

  return result;
}
