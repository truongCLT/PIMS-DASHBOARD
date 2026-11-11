import ExcelJS from "exceljs";

// 경영관리보고회 Excel parser (shared by CLI importer and API server upload).
// Layout (1-indexed cols):
//  col1 project label (multi-line), col2 metric label (매출액/매출원가/매출원가율)
//  col4 = 전년 계 (actual), cols 5..16 = 사업계획 1..12월, col17 = plan 계
//  cols 18..29 = 실적/전망 1..12월, col30 = actual 계
//  cols 31..35 = 당년..+4년 연간 전망

export class MgmtreportParseError extends Error {}

function cellText(v: ExcelJS.CellValue): string {
  if (v == null) return "";
  if (typeof v === "object") {
    const o = v as unknown as Record<string, unknown>;
    if (o.richText) return (o.richText as { text: string }[]).map((t) => t.text).join("");
    if (typeof o.result === "string") return o.result;
    return "";
  }
  return String(v);
}
function cellNumber(v: ExcelJS.CellValue): number | null {
  if (v == null) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "object") {
    const o = v as unknown as Record<string, unknown>;
    if (typeof o.result === "number" && Number.isFinite(o.result)) return o.result;
    return null; // formula errors like #DIV/0!
  }
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
const norm = (s: string) => s.replace(/\s+/g, " ").trim();

// 취합 양식의 실적 월 표시색(노랑, ARGB FFFFFF00)
function isYellowFill(cell: ExcelJS.Cell): boolean {
  const fill = cell.fill as { type?: string; fgColor?: { argb?: string } } | undefined;
  return fill?.type === "pattern" && /^(FF)?FFFF00$/i.test(fill.fgColor?.argb ?? "");
}

/** 파일명 앞의 'YYYY.MM' (예: '2026.10 경영관리보고회…') → 해당 연도와 일치할 때만 월을 돌려준다 */
export function monthFromMgmtreportFilename(filename: string, year: number): number | null {
  const m = /^\s*(\d{4})\s*[.\-_년]\s*(\d{1,2})(?!\d)/.exec(filename);
  if (!m || Number(m[1]) !== year) return null;
  const month = Number(m[2]);
  return month >= 1 && month <= 12 ? month : null;
}

export type MgmtreportProjectRec = {
  name: string;
  siteCode: string | null;
  groupLabel: string | null;
  sortOrder: number;
};
export type MgmtreportMonthlyRec = {
  project: string;
  month: number;
  scenario: "plan" | "actual";
  metric: "revenue" | "cogs";
  amount: number;
};
export type MgmtreportAnnualRec = {
  project: string;
  year: number;
  scenario: "actual" | "forecast";
  metric: "revenue" | "cogs";
  amount: number;
};
export type MgmtreportPnlRec = {
  lineCode: string;
  lineLabel: string;
  scenario: "plan" | "actual";
  month: number | null;
  amount: number;
  sortOrder: number;
};

export interface ParsedMgmtreport {
  year: number;
  /**
   * 이 파일 기준으로 "실적"이 확정된 마지막 월(1~12). 취합 양식은 실적/전망 칸(18~29열) 중
   * 실적 월만 노란색으로 칠해 두므로(2026.06 → 1~6월, 2026.10 → 1~10월) 그 색으로 판단한다.
   * 색이 없는 파일(시스템이 내려준 복원본 등)은 null.
   */
  actualThroughMonth: number | null;
  projects: MgmtreportProjectRec[];
  monthly: MgmtreportMonthlyRec[];
  annual: MgmtreportAnnualRec[];
  pnl: MgmtreportPnlRec[];
}

export const PNL_LINES: Record<string, string> = {
  "수 주": "new_orders",
  수주이익: "order_profit",
  매출액: "revenue",
  매출원가: "cogs",
  매출총이익: "gross_profit",
  판매관리비: "sga",
  "영업이익①": "op_profit1",
  기타영업수익: "other_op_income",
  잡이익: "misc_income",
  기타영업비용: "other_op_expense",
  잡손실: "misc_loss",
  "영업이익②": "op_profit2",
  금융원가: "finance_cost",
  이자수익: "interest_income",
  이자비용: "interest_expense",
  기타수익: "other_income",
  외화환산이익: "fx_translation_gain",
  외환차익: "fx_gain",
  기타비용: "other_expense",
  외화환산손실: "fx_translation_loss",
  외환차손: "fx_loss",
  경상이익: "ordinary_profit",
};

function parseWorksheet(ws: ExcelJS.Worksheet, year: number): ParsedMgmtreport {
  const projects = new Map<string, MgmtreportProjectRec>();
  // 동일 siteCode가 서로 다른 레이블(예: "K8CT1 모델하우스 (SITE39)" vs "THT K8CT1 MODEL... (SITE39)")로
  // 등장해도 같은 사이트로 취급하기 위한 역방향 매핑 — 먼저 나온 name을 canonical로 사용한다.
  const nameBySiteCode = new Map<string, string>();
  const monthly: MgmtreportMonthlyRec[] = [];
  const annual: MgmtreportAnnualRec[] = [];
  const pnl: MgmtreportPnlRec[] = [];

  let sortOrder = 0;
  let currentProject: string | null = null;
  let inPnl = false; // after 소계 block, corporate P&L lines
  let pnlOrder = 0;
  // 손익 라인이 파일 안에 두 번 나오면 같은 키(year,lineCode,scenario,month)가 중복되어 DB 반영이 실패한다
  // → 처음 나온 행 번호를 기억해 두었다가 중복 시 어느 행끼리 겹치는지 알려준다.
  const pnlRowByCode = new Map<string, number>();

  // DB 컬럼 amount_usd = numeric(18,4) → 절대값 1e14 이상은 저장 불가 (numeric field overflow).
  // 반영 단계에서 막연한 500 오류가 나지 않도록 파싱 단계에서 셀 위치와 함께 알려준다.
  const num = (row: ExcelJS.Row, col: number): number | null => {
    const v = cellNumber(row.getCell(col).value);
    if (v != null && Math.abs(v) >= 1e14) {
      throw new MgmtreportParseError(
        `${row.number}행 ${col}열의 값(${v})이 너무 큽니다. 단위(천 USD)가 맞는지 확인해 주세요.`,
      );
    }
    return v;
  };

  const readSeries = (row: ExcelJS.Row, project: string, metric: "revenue" | "cogs") => {
    for (let m = 1; m <= 12; m++) {
      const plan = num(row, 4 + m); // cols 5..16
      if (plan != null && plan !== 0)
        monthly.push({ project, month: m, scenario: "plan", metric, amount: plan });
      const act = num(row, 17 + m); // cols 18..29
      if (act != null && act !== 0)
        monthly.push({ project, month: m, scenario: "actual", metric, amount: act });
    }
    const prev = num(row, 4); // 전년 계
    if (prev != null && prev !== 0)
      annual.push({ project, year: year - 1, scenario: "actual", metric, amount: prev });
    for (let i = 0; i <= 4; i++) {
      const v = num(row, 31 + i); // 당년..+4년 전망
      if (v != null && v !== 0)
        annual.push({ project, year: year + i, scenario: "forecast", metric, amount: v });
    }
  };

  const addPnl = (row: ExcelJS.Row, label: string, code: string) => {
    const firstRow = pnlRowByCode.get(code);
    if (firstRow != null) {
      throw new MgmtreportParseError(
        `손익 라인 '${label}'이(가) ${firstRow}행과 ${row.number}행에 중복되어 있습니다. 한 행만 남겨 주세요.`,
      );
    }
    pnlRowByCode.set(code, row.number);
    const order = pnlOrder++;
    for (let m = 1; m <= 12; m++) {
      const plan = num(row, 4 + m);
      if (plan != null && plan !== 0)
        pnl.push({ lineCode: code, lineLabel: label, scenario: "plan", month: m, amount: plan, sortOrder: order });
      const act = num(row, 17 + m);
      if (act != null && act !== 0)
        pnl.push({ lineCode: code, lineLabel: label, scenario: "actual", month: m, amount: act, sortOrder: order });
    }
    // yearly totals (month=null) — keep only when no monthly values present
    const planTotal = num(row, 17);
    const actTotal = num(row, 30);
    const hasPlanMonths = pnl.some((p) => p.lineCode === code && p.scenario === "plan" && p.month != null);
    const hasActMonths = pnl.some((p) => p.lineCode === code && p.scenario === "actual" && p.month != null);
    if (!hasPlanMonths && planTotal != null && planTotal !== 0)
      pnl.push({ lineCode: code, lineLabel: label, scenario: "plan", month: null, amount: planTotal, sortOrder: order });
    if (!hasActMonths && actTotal != null && actTotal !== 0)
      pnl.push({ lineCode: code, lineLabel: label, scenario: "actual", month: null, amount: actTotal, sortOrder: order });
  };

  let actualThroughMonth: number | null | undefined; // undefined = 아직 첫 매출액 행을 못 만남

  for (let r = 1; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const rawLabel = cellText(row.getCell(1).value);
    const metricLabel = norm(cellText(row.getCell(2).value));

    // 첫 번째 프로젝트 매출액 행(보통 'DECV법인 취합본 [법인전체]')의 실적/전망 칸 색으로 실적 확정 월을 읽는다
    if (actualThroughMonth === undefined && metricLabel === "매출액" && rawLabel) {
      let m = 0;
      while (m < 12 && isYellowFill(row.getCell(18 + m))) m++;
      actualThroughMonth = m > 0 ? m : null;
    }

    if (rawLabel) {
      const labelNorm = norm(rawLabel);
      if (labelNorm === "소 계" || labelNorm === "소계") {
        inPnl = true;
        currentProject = null;
      } else if (metricLabel === "매출액" || labelNorm.startsWith("DECV법인")) {
        // new project block
        const siteMatch = /\(SITE\s*(\d+)\)/i.exec(labelNorm);
        const siteCode = siteMatch ? `SITE${siteMatch[1].padStart(2, "0")}` : null;
        const isGroup = labelNorm.startsWith("DECV법인");
        let name = labelNorm.replace(/\(SITE\s*\d+\)/i, "").replace(/\s+/g, " ").trim();
        // 같은 siteCode가 이미 다른 레이블로 등록되어 있으면, 그 레이블을 canonical name으로 재사용
        // (레이블 표기가 달라도 같은 사이트를 두 개의 project row로 쪼개지 않기 위함)
        if (siteCode && nameBySiteCode.has(siteCode)) {
          name = nameBySiteCode.get(siteCode)!;
        } else if (siteCode) {
          nameBySiteCode.set(siteCode, name);
        }
        currentProject = name;
        const existing = projects.get(name);
        if (existing && siteCode) {
          if (existing.siteCode && existing.siteCode !== siteCode) {
            // 서로 다른 사이트가 SITE번호만 빼면 같은 이름 → 두 사이트 숫자가 하나로 섞이므로 막는다
            throw new MgmtreportParseError(
              `${r}행 '${labelNorm}': 프로젝트명 '${name}'이(가) 이미 ${existing.siteCode}로 등록되어 있는데 ${siteCode}로 다시 나옵니다. SITE번호 또는 프로젝트명을 확인해 주세요.`,
            );
          }
          if (!existing.siteCode) existing.siteCode = siteCode;
        }
        if (!existing) {
          projects.set(name, {
            name,
            siteCode,
            groupLabel: isGroup ? name : null,
            sortOrder: sortOrder++,
          });
        }
      }
    }

    if (inPnl) {
      const code = PNL_LINES[metricLabel];
      if (code) addPnl(row, metricLabel, code);
      continue;
    }

    // corporate 수주/수주이익 rows before first project (col1 empty)
    if (!currentProject && (metricLabel === "수 주" || metricLabel === "수주이익")) {
      addPnl(row, metricLabel, PNL_LINES[metricLabel]);
      continue;
    }

    if (!currentProject) continue;
    if (metricLabel === "매출액") readSeries(row, currentProject, "revenue");
    else if (metricLabel === "매출원가") readSeries(row, currentProject, "cogs");
    // 매출원가율 등은 파생값이므로 저장하지 않음
  }

  if (projects.size === 0) {
    throw new MgmtreportParseError(
      "프로젝트를 하나도 찾지 못했습니다. 경영관리보고회 취합 양식(1열 프로젝트명, 2열 매출액/매출원가)이 맞는지 확인해 주세요.",
    );
  }
  if (monthly.length === 0) {
    throw new MgmtreportParseError(
      "월별 매출/원가 숫자를 찾지 못했습니다. 사업계획(5~16열)과 실적/전망(18~29열) 값이 채워져 있는지 확인해 주세요.",
    );
  }
  if (pnl.length === 0) {
    throw new MgmtreportParseError(
      "법인 손익(수주~경상이익) 라인을 찾지 못했습니다. '소 계' 아래 손익 라인이 포함된 양식인지 확인해 주세요.",
    );
  }

  // 같은 프로젝트로 합쳐진 블록들(같은 SITE번호의 다른 레이블, 같은 레이블 반복)이 같은 월/시나리오/지표에
  // 값을 갖고 있으면 키가 중복되어 DB upsert가 실패하거나("cannot affect row a second time") 뒤 값이
  // 앞 값을 덮어쓴다. 미리보기 합계는 이미 두 값을 더해서 보여주므로, 저장도 합산으로 맞춘다.
  return {
    year,
    actualThroughMonth: actualThroughMonth ?? null,
    projects: [...projects.values()],
    monthly: sumByKey(monthly, (m) => `${m.project}|${m.month}|${m.scenario}|${m.metric}`),
    annual: sumByKey(annual, (a) => `${a.project}|${a.year}|${a.scenario}|${a.metric}`),
    pnl,
  };
}

function sumByKey<T extends { amount: number }>(rows: T[], key: (r: T) => string): T[] {
  const byKey = new Map<string, T>();
  for (const r of rows) {
    const k = key(r);
    const prev = byKey.get(k);
    if (prev) prev.amount += r.amount;
    else byKey.set(k, { ...r });
  }
  return [...byKey.values()];
}

export async function parseMgmtreportWorkbook(
  buffer: Buffer,
  year: number,
): Promise<ParsedMgmtreport> {
  const wb = new ExcelJS.Workbook();
  try {
    await wb.xlsx.load(buffer as unknown as ExcelJS.Buffer);
  } catch {
    throw new MgmtreportParseError(
      "Excel 파일을 열 수 없습니다. .xlsx 형식의 파일인지 확인해 주세요.",
    );
  }
  const ws = wb.getWorksheet("Sheet1") ?? wb.worksheets[0];
  if (!ws) {
    throw new MgmtreportParseError("워크시트를 찾을 수 없습니다. 빈 파일이 아닌지 확인해 주세요.");
  }
  return parseWorksheet(ws, year);
}

export async function parseMgmtreportFile(
  filePath: string,
  year: number,
): Promise<ParsedMgmtreport> {
  const wb = new ExcelJS.Workbook();
  try {
    await wb.xlsx.readFile(filePath);
  } catch {
    throw new MgmtreportParseError(
      "Excel 파일을 열 수 없습니다. .xlsx 형식의 파일인지 확인해 주세요.",
    );
  }
  const ws = wb.getWorksheet("Sheet1") ?? wb.worksheets[0];
  if (!ws) {
    throw new MgmtreportParseError("워크시트를 찾을 수 없습니다. 빈 파일이 아닌지 확인해 주세요.");
  }
  return parseWorksheet(ws, year);
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function buildMgmtreportPreview(parsed: ParsedMgmtreport) {
  const revenueActual = parsed.monthly
    .filter((m) => m.metric === "revenue" && m.scenario === "actual")
    .reduce((a, b) => a + b.amount, 0);
  const revenuePlan = parsed.monthly
    .filter((m) => m.metric === "revenue" && m.scenario === "plan")
    .reduce((a, b) => a + b.amount, 0);
  const cogsActual = parsed.monthly
    .filter((m) => m.metric === "cogs" && m.scenario === "actual")
    .reduce((a, b) => a + b.amount, 0);

  const monthsWithActual = [
    ...new Set(
      parsed.monthly.filter((m) => m.scenario === "actual").map((m) => m.month),
    ),
  ].sort((a, b) => a - b);

  const projects = parsed.projects.map((p) => {
    const rows = parsed.monthly.filter((m) => m.project === p.name);
    return {
      name: p.name,
      siteCode: p.siteCode,
      isGroup: p.groupLabel != null,
      revenueActualTotal: round2(
        rows
          .filter((m) => m.metric === "revenue" && m.scenario === "actual")
          .reduce((a, b) => a + b.amount, 0),
      ),
      cogsActualTotal: round2(
        rows
          .filter((m) => m.metric === "cogs" && m.scenario === "actual")
          .reduce((a, b) => a + b.amount, 0),
      ),
      monthlyCount: rows.length,
    };
  });

  return {
    year: parsed.year,
    actualThroughMonth: parsed.actualThroughMonth,
    unit: "천 USD",
    projectCount: parsed.projects.filter((p) => p.groupLabel == null).length,
    monthlyCount: parsed.monthly.length,
    annualCount: parsed.annual.length,
    pnlCount: parsed.pnl.length,
    monthsWithActual,
    totals: {
      revenuePlan: round2(revenuePlan),
      revenueActual: round2(revenueActual),
      cogsActual: round2(cogsActual),
    },
    projects,
  };
}
