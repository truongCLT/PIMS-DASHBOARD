import ExcelJS from "exceljs";
import pg from "pg";
import path from "node:path";
import { existsSync } from "node:fs";

// NOTE: run with NODE_OPTIONS=--max-old-space-size=6144 (workbook has huge defined-name tables)
const DEFAULT_REL =
  "attached_assets/2.1_(26.06)_Summary_of_Sales+costs_1784354208238.xlsx";
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
const SUMMARY_SHEET = `Summary ${YEAR}`;
const ALLOC_SHEET = "원가이체, 판관비 배부현황(1000USD)";

function cellText(v: ExcelJS.CellValue): string {
  if (v == null) return "";
  if (typeof v === "object") {
    const o = v as unknown as Record<string, unknown>;
    if (o.richText) {
      return (o.richText as { text: string }[]).map((t) => t.text).join("");
    }
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

type SiteRec = {
  code: string;
  name: string;
  category: string | null;
  bizType: string | null;
  sortOrder: number;
};
type AmountRec = {
  code: string;
  metric: string;
  month: number; // 1..12
  amountVnd: number | null;
  amountUsd: number | null;
};

async function main() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(FILE);

  const sites = new Map<string, SiteRec>();
  const amounts: AmountRec[] = [];
  let sortOrder = 0;

  const ensureSite = (code: string, name: string, category: string | null, bizType: string | null) => {
    const existing = sites.get(code);
    if (!existing) {
      sites.set(code, { code, name, category, bizType, sortOrder: sortOrder++ });
    } else {
      // fill missing attributes from later sections
      if (!existing.category && category) existing.category = category;
      if (!existing.bizType && bizType) existing.bizType = bizType;
    }
  };

  // ---- Summary sheet: revenue / cogs / repair allowance ----
  const ws = wb.getWorksheet(SUMMARY_SHEET);
  if (!ws) throw new Error(`Sheet not found: ${SUMMARY_SHEET}`);

  let section: "revenue" | "cogs" | "repair_allowance" | null = null;
  for (let r = 1; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const label = norm(cellText(row.getCell(4).value));
    if (label === "Revenue") { section = "revenue"; continue; }
    if (label === "COGS") { section = "cogs"; continue; }
    if (label === "REPAIRING COST ALLOWANCE") { section = "repair_allowance"; continue; }
    if (label === "ER") { section = null; continue; }
    if (!section) continue;

    const code = norm(cellText(row.getCell(1).value));
    if (!/^SITE\d+$/i.test(code)) continue;
    const category = norm(cellText(row.getCell(2).value)) || null;
    const bizType = norm(cellText(row.getCell(3).value)) || null;
    const desc = norm(cellText(row.getCell(4).value));
    const name = desc.replace(/^SITE\d+\s*-\s*/i, "") || desc;
    ensureSite(code.toUpperCase(), name, category, bizType);

    for (let m = 1; m <= 12; m++) {
      const vnd = cellNumber(row.getCell(4 + m).value); // cols 5..16
      const usd = cellNumber(row.getCell(18 + m).value); // cols 19..30 (repair section: absent)
      if ((vnd == null || vnd === 0) && (usd == null || usd === 0)) continue;
      amounts.push({
        code: code.toUpperCase(),
        metric: section,
        month: m,
        amountVnd: vnd ?? null,
        amountUsd: usd ?? null,
      });
    }
  }

  // ---- Allocation sheet (1000 USD): site_cost / hq_transfer / sga / employees ----
  const wa = wb.getWorksheet(ALLOC_SHEET);
  if (!wa) throw new Error(`Sheet not found: ${ALLOC_SHEET}`);

  const METRIC_BY_LABEL: Record<string, string> = {
    현장원가: "site_cost",
    본사이체원가: "hq_transfer",
    판관비: "sga",
    인원수: "employees",
    "아국인 인원수": "employees",
  };

  let currentCode: string | null = null;
  for (let r = 1; r <= wa.rowCount; r++) {
    const row = wa.getRow(r);
    const siteLabel = cellText(row.getCell(1).value);
    const m = /Site\s*(\d+)/i.exec(siteLabel);
    if (m) currentCode = `SITE${m[1].padStart(2, "0")}`;
    if (!currentCode || !sites.has(currentCode)) continue;

    const rowLabel = norm(cellText(row.getCell(2).value)).split("(")[0].trim();
    const metric = METRIC_BY_LABEL[rowLabel];
    if (!metric) continue;

    for (let mo = 1; mo <= 12; mo++) {
      const usd = cellNumber(row.getCell(2 + mo).value); // cols 3..14
      if (usd == null || usd === 0) continue;
      amounts.push({ code: currentCode, metric, month: mo, amountVnd: null, amountUsd: usd });
    }
  }

  // ---- insert ----
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("TRUNCATE sc_monthly, sc_sites RESTART IDENTITY CASCADE");
    const idByCode = new Map<string, number>();
    for (const s of sites.values()) {
      const res = await client.query(
        `INSERT INTO sc_sites (code, name, category, biz_type, sort_order)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [s.code, s.name, s.category, s.bizType, s.sortOrder],
      );
      idByCode.set(s.code, res.rows[0].id as number);
    }
    let count = 0;
    for (const a of amounts) {
      const siteId = idByCode.get(a.code);
      if (!siteId) continue;
      await client.query(
        `INSERT INTO sc_monthly (site_id, year, month, metric, amount_vnd, amount_usd)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (site_id, year, month, metric)
         DO UPDATE SET amount_vnd = COALESCE(EXCLUDED.amount_vnd, sc_monthly.amount_vnd),
                       amount_usd = COALESCE(EXCLUDED.amount_usd, sc_monthly.amount_usd)`,
        [siteId, YEAR, a.month, a.metric, a.amountVnd, a.amountUsd],
      );
      count++;
    }
    await client.query("COMMIT");
    console.log(`Imported ${sites.size} sites, ${count} monthly rows for ${YEAR}.`);
    const summary = await client.query(
      `SELECT metric, count(*) AS rows, round(sum(amount_usd)::numeric, 2) AS total_usd
       FROM sc_monthly GROUP BY metric ORDER BY metric`,
    );
    console.table(summary.rows);
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
