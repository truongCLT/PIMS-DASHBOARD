import ExcelJS from "exceljs";
import pg from "pg";
import path from "node:path";
import { existsSync } from "node:fs";

// 경영관리보고회 importer. Layout (1-indexed cols):
//  col1 project label (multi-line), col2 metric label (매출액/매출원가/매출원가율)
//  col4 = 2025년 계 (actual), cols 5..16 = 2026 사업계획 1..12월, col17 = plan 계
//  cols 18..29 = 2026 실적/전망 1..12월, col30 = actual 계
//  cols 31..35 = 2026..2030 연간 전망
const DEFAULT_REL =
  "attached_assets/2026.06_경영관리보고회_취합완료_1784355378039.xlsx";
function resolveFile(arg: string | undefined): string {
  const candidates = arg
    ? [arg, path.resolve(process.cwd(), arg)]
    : [
        path.resolve(process.cwd(), DEFAULT_REL),
        path.resolve(process.cwd(), "..", DEFAULT_REL),
      ];
  for (const c of candidates) if (existsSync(c)) return c;
  throw new Error(`Excel file not found. Tried: ${candidates.join(", ")}`);
}
const FILE = resolveFile(process.argv[2]);
const YEAR = Number(process.argv[3] ?? 2026);

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
type MonthlyRec = { project: string; month: number; scenario: "plan" | "actual"; metric: "revenue" | "cogs"; amount: number };
type AnnualRec = { project: string; year: number; scenario: "actual" | "forecast"; metric: "revenue" | "cogs"; amount: number };
type PnlRec = { lineCode: string; lineLabel: string; scenario: "plan" | "actual"; month: number | null; amount: number; sortOrder: number };

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

async function main() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(FILE);
  const ws = wb.getWorksheet("Sheet1");
  if (!ws) throw new Error("Sheet1 not found");

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
    const prev = cellNumber(row.getCell(4).value); // 2025년 계
    if (prev != null && prev !== 0)
      annual.push({ project, year: YEAR - 1, scenario: "actual", metric, amount: prev });
    for (let i = 0; i <= 4; i++) {
      const v = cellNumber(row.getCell(31 + i).value); // 2026..2030 전망
      if (v != null && v !== 0)
        annual.push({ project, year: YEAR + i, scenario: "forecast", metric, amount: v });
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
    // yearly totals (month=null) — keep only when no monthly values present (e.g. 잡이익-like rows use col30 only)
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

  // ---- insert ----
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("TRUNCATE mr_monthly, mr_annual, mr_pnl, mr_projects RESTART IDENTITY CASCADE");
    const idByName = new Map<string, number>();
    for (const p of projects.values()) {
      const res = await client.query(
        `INSERT INTO mr_projects (name, site_code, group_label, sort_order)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [p.name, p.siteCode, p.groupLabel, p.sortOrder],
      );
      idByName.set(p.name, res.rows[0].id as number);
    }
    let mCount = 0;
    for (const m of monthly) {
      const pid = idByName.get(m.project);
      if (!pid) continue;
      await client.query(
        `INSERT INTO mr_monthly (project_id, year, month, scenario, metric, amount_usd)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (project_id, year, month, scenario, metric) DO UPDATE SET amount_usd = EXCLUDED.amount_usd`,
        [pid, YEAR, m.month, m.scenario, m.metric, m.amount],
      );
      mCount++;
    }
    let aCount = 0;
    for (const a of annual) {
      const pid = idByName.get(a.project);
      if (!pid) continue;
      await client.query(
        `INSERT INTO mr_annual (project_id, year, scenario, metric, amount_usd)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (project_id, year, scenario, metric) DO UPDATE SET amount_usd = EXCLUDED.amount_usd`,
        [pid, a.year, a.scenario, a.metric, a.amount],
      );
      aCount++;
    }
    let pCount = 0;
    for (const p of pnl) {
      await client.query(
        `INSERT INTO mr_pnl (year, line_code, line_label, scenario, month, amount_usd, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (year, line_code, scenario, month) DO UPDATE SET amount_usd = EXCLUDED.amount_usd`,
        [YEAR, p.lineCode, p.lineLabel, p.scenario, p.month, p.amount, p.sortOrder],
      );
      pCount++;
    }
    await client.query("COMMIT");
    console.log(
      `Imported ${projects.size} projects, ${mCount} monthly, ${aCount} annual, ${pCount} pnl rows for ${YEAR}.`,
    );
    const check = await client.query(
      `SELECT scenario, metric, round(sum(amount_usd)::numeric,2) AS total
       FROM mr_monthly GROUP BY scenario, metric ORDER BY scenario, metric`,
    );
    console.table(check.rows);
    const pnlCheck = await client.query(
      `SELECT line_code, scenario, round(sum(amount_usd)::numeric,2) AS total
       FROM mr_pnl WHERE line_code IN ('gross_profit','sga','op_profit1','ordinary_profit','new_orders')
       GROUP BY line_code, scenario ORDER BY line_code, scenario`,
    );
    console.table(pnlCheck.rows);
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
