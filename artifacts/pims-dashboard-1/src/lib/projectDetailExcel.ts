import type {
  ProjectDetail,
  ProjectDetailProgressPoint,
  ProjectDetailMilestone,
  ProjectDetailCostEstimation,
  ProjectDetailCostBudget,
  ProjectDetailOutsourcing,
  ProjectDetailCashflowPoint,
  ProjectDetailCogsPoint,
  ProjectDetailSalesPoint,
} from "@workspace/api-client-react";

// 시트/헤더 정의 — 다운로드와 업로드가 같은 양식을 사용한다. (금액 단위: Bil. VND = tỷ VND)
const SHEETS = {
  overview: "개요",
  progress: "1.공정률",
  milestones: "2.마일스톤",
  costEstimation: "3.원가율",
  costBudget: "4.예산집행",
  outsourcing: "5.외주자재",
  cashflow: "6.월별자금",
  cogsMonthly: "7.월별매출원가",
  salesMonthly: "8.월별매출",
} as const;

const HEADERS: Record<string, string[]> = {
  [SHEETS.progress]: ["연도", "월", "월간 계획(%)", "월간 실적(%)", "누계 계획(%)", "누계 실적(%)"],
  [SHEETS.milestones]: ["구분", "계획 시작(YYYY-MM-DD)", "계획 종료(YYYY-MM-DD)", "실제 시작(YYYY-MM-DD)", "실제 종료(YYYY-MM-DD)"],
  [SHEETS.costEstimation]: ["구분(bidding/execution/completion)", "기준연도", "기준월", "도급액(Bil.VND)", "원가(Bil.VND)"],
  [SHEETS.costBudget]: ["구분", "항목", "예산(Bil.VND)", "계획(Bil.VND)", "실적(Bil.VND)"],
  [SHEETS.outsourcing]: [
    "대공종",
    "세부공종",
    "업체",
    "구분",
    "계약일",
    "차수",
    "예산(Bil.VND)",
    "실행예산(Bil.VND)",
    "기성확정(Bil.VND)",
    "당월(Bil.VND)",
    "누계(Bil.VND)",
  ],
  [SHEETS.cashflow]: ["연도", "월", "수입(Bil.VND)", "지출(Bil.VND)", "보유현금(Bil.VND)"],
  [SHEETS.cogsMonthly]: ["연도", "월", "회계 매출원가(Bil.VND)", "집행 매출원가 WIP(Bil.VND)"],
  [SHEETS.salesMonthly]: ["연도", "월", "매출 계획(Bil.VND)", "매출 실적(Bil.VND)"],
};

type Cell = string | number | null;

/** 천USD → Bil.VND 변환 (Excel 출력용) */
function toVnd(v: number | null | undefined, fxRateVnd: number): number | null {
  if (v == null) return null;
  return v * fxRateVnd / 1_000_000;
}

/** 데이터 입력용 Excel 양식 다운로드 (Bil.VND 단위, 현재 환율 적용) */
export async function downloadProjectDetailTemplate(projectName: string, detail: ProjectDetail, fxRateVnd: number): Promise<void> {
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

  const tv = (v: number | null | undefined) => toVnd(v, fxRateVnd);

  // 개요 (key/value)
  {
    const ov = detail.overview;
    const ws = wb.addWorksheet(SHEETS.overview);
    const rows: [string, Cell][] = [
      ["발주처", ov.client ?? null],
      ["착공일(YYYY-MM-DD)", ov.startDate ?? null],
      ["준공일(YYYY-MM-DD)", ov.endDate ?? null],
      ["도급액(Bil.VND)", tv(ov.contractAmount)],
      ["공사규모", ov.scale ?? null],
      ["작성 기준월(YYYY-MM)", ov.asOfMonth ?? null],
      ["수행내용", ov.scope ?? null],
      ["연간 매출 목표(Bil.VND)", tv(ov.revenueAnnualTarget)],
      ["누계 매출 실적(Bil.VND)", tv(ov.revenueTotal)],
      ["Cash Confirmed(Bil.VND)", tv(ov.cashConfirmed)],
      ["Cash Collection(Bil.VND)", tv(ov.cashCollection)],
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
    detail.costEstimation.map((e) => [e.kind, e.year ?? null, e.month ?? null, tv(e.contractAmount), tv(e.costAmount)]),
  );
  addSheet(
    SHEETS.costBudget,
    detail.costBudget.map((b) => [b.category ?? null, b.item, tv(b.budget), tv(b.plan), tv(b.actual)]),
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
      tv(o.budget),
      tv(o.executedBudget),
      tv(o.resolved),
      tv(o.thisMonth),
      tv(o.accum),
    ]),
  );
  addSheet(
    SHEETS.cashflow,
    detail.cashflow.map((c) => [c.year, c.month, tv(c.cashIn), tv(c.cashOut), tv(c.equivalent)]),
  );
  addSheet(
    SHEETS.cogsMonthly,
    (detail.cogsMonthly ?? []).map((c) => [c.year, c.month, tv(c.acctCogs), tv(c.wipCogs)]),
  );
  addSheet(
    SHEETS.salesMonthly,
    (detail.salesMonthly ?? []).map((s) => [s.year, s.month, tv(s.plan), tv(s.actual)]),
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
  // 전체 문자열이 YYYY-MM 또는 YYYY-MM-DD 형태여야 하고, 월은 1~12만 허용
  const m = /^(\d{4})[-./](\d{1,2})(?:[-./]\d{1,2})?$/.exec(s);
  if (!m) return null;
  const month = Number(m[2]);
  if (month < 1 || month > 12) return null;
  return `${m[1]}-${m[2].padStart(2, "0")}`;
}

/** 'YYYY-MM-DD' 정규화 (Date/문자열/YYYY-MM 허용; YYYY-MM 입력 시 01일로 보완) */
function cellYmd(v: unknown): string | null {
  if (v instanceof Date || (typeof v === "object" && v != null)) {
    // ExcelJS Date 객체: cellStr이 YYYY-MM-DD로 변환
  }
  const s = cellStr(v);
  if (!s) return null;
  // YYYY-MM-DD
  const full = /^(\d{4})[-./](\d{1,2})[-./](\d{1,2})$/.exec(s);
  if (full) {
    const mo = Number(full[2]), dd = Number(full[3]);
    if (mo < 1 || mo > 12 || dd < 1 || dd > 31) return null;
    return `${full[1]}-${full[2].padStart(2, "0")}-${full[3].padStart(2, "0")}`;
  }
  // YYYY-MM → 1일로 보완
  const ym = /^(\d{4})[-./](\d{1,2})$/.exec(s);
  if (ym) {
    const mo = Number(ym[2]);
    if (mo < 1 || mo > 12) return null;
    return `${ym[1]}-${ym[2].padStart(2, "0")}-01`;
  }
  return null;
}

export class ExcelParseError extends Error {}

/** Bil.VND → 천USD 역변환 (Excel 업로드용) */
function fromVnd(v: number | null, fxRateVnd: number): number | null {
  if (v == null) return null;
  return v * 1_000_000 / fxRateVnd;
}

/**
 * 업로드된 양식을 파싱해 ProjectDetail 본문을 만든다.
 * 시트가 없는 항목은 기존(existing) 값을 유지하고, 사진(photos)은 항상 기존 값을 유지한다.
 */
export async function parseProjectDetailWorkbook(file: File, existing: ProjectDetail, fxRateVnd: number): Promise<ProjectDetail> {
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

  const fv = (v: unknown) => fromVnd(cellNum(v), fxRateVnd);

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
        contractAmount: fv(map.get("도급액")) ?? null,
        scale: cellStr(map.get("공사규모")) ?? null,
      };
      // 신규 항목: 해당 행이 양식에 존재할 때만 반영(구버전 양식은 기존 값 유지)
      if (map.has("작성 기준월")) {
        const ym = cellYm(map.get("작성 기준월"));
        if (map.get("작성 기준월") != null && cellStr(map.get("작성 기준월")) != null && ym == null) {
          throw new ExcelParseError(`[${SHEETS.overview}] 작성 기준월은 YYYY-MM 형식으로 입력해 주세요.`);
        }
        result.overview.asOfMonth = ym;
      }
      if (map.has("수행내용")) result.overview.scope = cellStr(map.get("수행내용"));
      if (map.has("연간 매출 목표")) result.overview.revenueAnnualTarget = fv(map.get("연간 매출 목표"));
      if (map.has("누계 매출 실적")) result.overview.revenueTotal = fv(map.get("누계 매출 실적"));
      if (map.has("Cash Confirmed")) result.overview.cashConfirmed = fv(map.get("Cash Confirmed"));
      if (map.has("Cash Collection")) result.overview.cashCollection = fv(map.get("Cash Collection"));
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
          planStart: cellYmd(r[1]),
          planEnd: cellYmd(r[2]),
          actualStart: cellYmd(r[3]),
          actualEnd: cellYmd(r[4]),
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
          contractAmount: fv(r[3]),
          costAmount: fv(r[4]),
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
          budget: fv(r[2]),
          plan: fv(r[3]),
          actual: fv(r[4]),
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
          budget: fv(r[6]),
          executedBudget: fv(r[7]),
          resolved: fv(r[8]),
          thisMonth: fv(r[9]),
          accum: fv(r[10]),
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
        out.push({ year, month, cashIn: fv(r[2]), cashOut: fv(r[3]), equivalent: fv(r[4]) });
      });
      result.cashflow = out;
    }
  }

  // 월별 매출원가
  {
    const rows = rowsOf(SHEETS.cogsMonthly, true);
    if (rows) {
      const out: ProjectDetailCogsPoint[] = [];
      const seen = new Set<string>();
      rows.forEach((r, i) => {
        const year = cellInt(r[0]);
        const month = cellInt(r[1]);
        if (year == null || month == null) throw new ExcelParseError(`[${SHEETS.cogsMonthly}] ${i + 2}행: 연도/월이 비어 있습니다.`);
        if (month < 1 || month > 12) throw new ExcelParseError(`[${SHEETS.cogsMonthly}] ${i + 2}행: 월(${month})이 올바르지 않습니다.`);
        const key = `${year}-${month}`;
        if (seen.has(key)) {
          throw new ExcelParseError(`[${SHEETS.cogsMonthly}] 같은 월(${year}.${String(month).padStart(2, "0")})이 중복 입력되었습니다.`);
        }
        seen.add(key);
        out.push({ year, month, acctCogs: fv(r[2]), wipCogs: fv(r[3]) });
      });
      result.cogsMonthly = out;
    }
  }

  // 월별 매출 (계획/실적)
  {
    const rows = rowsOf(SHEETS.salesMonthly, true);
    if (rows) {
      const out: ProjectDetailSalesPoint[] = [];
      const seen = new Set<string>();
      rows.forEach((r, i) => {
        const yearRaw = cellNum(r[0]);
        const monthRaw = cellNum(r[1]);
        if (yearRaw == null || monthRaw == null) throw new ExcelParseError(`[${SHEETS.salesMonthly}] ${i + 2}행: 연도/월이 비어 있습니다.`);
        if (!Number.isInteger(yearRaw) || !Number.isInteger(monthRaw)) {
          throw new ExcelParseError(`[${SHEETS.salesMonthly}] ${i + 2}행: 연도/월은 정수여야 합니다. (${yearRaw}/${monthRaw})`);
        }
        const year = yearRaw;
        const month = monthRaw;
        if (month < 1 || month > 12) throw new ExcelParseError(`[${SHEETS.salesMonthly}] ${i + 2}행: 월(${month})이 올바르지 않습니다.`);
        const key = `${year}-${month}`;
        if (seen.has(key)) {
          throw new ExcelParseError(`[${SHEETS.salesMonthly}] 같은 월(${year}.${String(month).padStart(2, "0")})이 중복 입력되었습니다.`);
        }
        seen.add(key);
        out.push({ year, month, plan: fv(r[2]), actual: fv(r[3]) });
      });
      result.salesMonthly = out;
    }
  }

  return result;
}
