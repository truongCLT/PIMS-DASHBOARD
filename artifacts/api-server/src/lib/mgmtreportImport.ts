import ExcelJS from "exceljs";
import { eq } from "drizzle-orm";
import {
  db,
  mrProjectsTable,
  mrMonthlyTable,
  mrAnnualTable,
  mrPnlTable,
} from "@workspace/db";

// 경영관리보고회 Excel parser. Layout (1-indexed cols):
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

type ProjectRec = {
  name: string;
  siteCode: string | null;
  groupLabel: string | null;
  sortOrder: number;
};
type MonthlyRec = {
  project: string;
  month: number;
  scenario: "plan" | "actual";
  metric: "revenue" | "cogs";
  amount: number;
};
type AnnualRec = {
  project: string;
  year: number;
  scenario: "actual" | "forecast";
  metric: "revenue" | "cogs";
  amount: number;
};
type PnlRec = {
  lineCode: string;
  lineLabel: string;
  scenario: "plan" | "actual";
  month: number | null;
  amount: number;
  sortOrder: number;
};

export interface ParsedMgmtreport {
  year: number;
  projects: ProjectRec[];
  monthly: MonthlyRec[];
  annual: AnnualRec[];
  pnl: PnlRec[];
}

const PNL_LINES: Record<string, string> = {
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

  const projects = new Map<string, ProjectRec>();
  const monthly: MonthlyRec[] = [];
  const annual: AnnualRec[] = [];
  const pnl: PnlRec[] = [];

  let sortOrder = 0;
  let currentProject: string | null = null;
  let inPnl = false; // after 소계 block, corporate P&L lines
  let pnlOrder = 0;

  const readSeries = (row: ExcelJS.Row, project: string, metric: "revenue" | "cogs") => {
    for (let m = 1; m <= 12; m++) {
      const plan = cellNumber(row.getCell(4 + m).value); // cols 5..16
      if (plan != null && plan !== 0)
        monthly.push({ project, month: m, scenario: "plan", metric, amount: plan });
      const act = cellNumber(row.getCell(17 + m).value); // cols 18..29
      if (act != null && act !== 0)
        monthly.push({ project, month: m, scenario: "actual", metric, amount: act });
    }
    const prev = cellNumber(row.getCell(4).value); // 전년 계
    if (prev != null && prev !== 0)
      annual.push({ project, year: year - 1, scenario: "actual", metric, amount: prev });
    for (let i = 0; i <= 4; i++) {
      const v = cellNumber(row.getCell(31 + i).value); // 당년..+4년 전망
      if (v != null && v !== 0)
        annual.push({ project, year: year + i, scenario: "forecast", metric, amount: v });
    }
  };

  const addPnl = (row: ExcelJS.Row, label: string, code: string) => {
    const order = pnlOrder++;
    for (let m = 1; m <= 12; m++) {
      const plan = cellNumber(row.getCell(4 + m).value);
      if (plan != null && plan !== 0)
        pnl.push({ lineCode: code, lineLabel: label, scenario: "plan", month: m, amount: plan, sortOrder: order });
      const act = cellNumber(row.getCell(17 + m).value);
      if (act != null && act !== 0)
        pnl.push({ lineCode: code, lineLabel: label, scenario: "actual", month: m, amount: act, sortOrder: order });
    }
    // yearly totals (month=null) — keep only when no monthly values present
    const planTotal = cellNumber(row.getCell(17).value);
    const actTotal = cellNumber(row.getCell(30).value);
    const hasPlanMonths = pnl.some((p) => p.lineCode === code && p.scenario === "plan" && p.month != null);
    const hasActMonths = pnl.some((p) => p.lineCode === code && p.scenario === "actual" && p.month != null);
    if (!hasPlanMonths && planTotal != null && planTotal !== 0)
      pnl.push({ lineCode: code, lineLabel: label, scenario: "plan", month: null, amount: planTotal, sortOrder: order });
    if (!hasActMonths && actTotal != null && actTotal !== 0)
      pnl.push({ lineCode: code, lineLabel: label, scenario: "actual", month: null, amount: actTotal, sortOrder: order });
  };

  for (let r = 1; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const rawLabel = cellText(row.getCell(1).value);
    const metricLabel = norm(cellText(row.getCell(2).value));

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
        const name = labelNorm.replace(/\(SITE\s*\d+\)/i, "").replace(/\s+/g, " ").trim();
        currentProject = name;
        if (!projects.has(name)) {
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

  return { year, projects: [...projects.values()], monthly, annual, pnl };
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function buildPreview(parsed: ParsedMgmtreport) {
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

export async function applyMgmtreportImport(parsed: ParsedMgmtreport) {
  await db.transaction(async (tx) => {
    // Full replace: this workbook is the single source of truth for mgmtreport data
    await tx.delete(mrMonthlyTable);
    await tx.delete(mrAnnualTable);
    await tx.delete(mrProjectsTable);
    await tx.delete(mrPnlTable).where(eq(mrPnlTable.year, parsed.year));

    const idByName = new Map<string, number>();
    for (const p of parsed.projects) {
      const [row] = await tx
        .insert(mrProjectsTable)
        .values({
          name: p.name,
          siteCode: p.siteCode,
          groupLabel: p.groupLabel,
          sortOrder: p.sortOrder,
        })
        .returning({ id: mrProjectsTable.id });
      idByName.set(p.name, row.id);
    }

    const monthlyValues = parsed.monthly
      .map((m) => {
        const pid = idByName.get(m.project);
        if (!pid) return null;
        return {
          projectId: pid,
          year: parsed.year,
          month: m.month,
          scenario: m.scenario,
          metric: m.metric,
          amountUsd: String(m.amount),
        };
      })
      .filter((v) => v != null);
    for (let i = 0; i < monthlyValues.length; i += 500) {
      await tx.insert(mrMonthlyTable).values(monthlyValues.slice(i, i + 500));
    }

    const annualValues = parsed.annual
      .map((a) => {
        const pid = idByName.get(a.project);
        if (!pid) return null;
        return {
          projectId: pid,
          year: a.year,
          scenario: a.scenario,
          metric: a.metric,
          amountUsd: String(a.amount),
        };
      })
      .filter((v) => v != null);
    for (let i = 0; i < annualValues.length; i += 500) {
      await tx.insert(mrAnnualTable).values(annualValues.slice(i, i + 500));
    }

    const pnlValues = parsed.pnl.map((p) => ({
      year: parsed.year,
      lineCode: p.lineCode,
      lineLabel: p.lineLabel,
      scenario: p.scenario,
      month: p.month,
      amountUsd: String(p.amount),
      sortOrder: p.sortOrder,
    }));
    for (let i = 0; i < pnlValues.length; i += 500) {
      await tx.insert(mrPnlTable).values(pnlValues.slice(i, i + 500));
    }
  });
}
