import ExcelJS from "exceljs";
import { db, scSitesTable, scMonthlyTable } from "@workspace/db";

// 매출/원가 Excel parser — mirrors scripts/src/import-salescost.ts (keep both in sync).
// NOTE: this workbook family has huge defined-name tables and needs a large Node heap
// (server start script runs with --max-old-space-size; see api-server package.json).
// Sheets: `Summary <year>` (Revenue/COGS/REPAIRING COST ALLOWANCE sections, VND cols 5..16,
// 1000USD cols 19..30) and `원가이체, 판관비 배부현황(1000USD)` (현장원가/본사이체원가/판관비/인원수).

export class SalescostParseError extends Error {}

const ALLOC_SHEET = "원가이체, 판관비 배부현황(1000USD)";

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
const round2 = (n: number) => Math.round(n * 100) / 100;

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
  month: number;
  amountVnd: number | null;
  amountUsd: number | null;
};

export interface ParsedSalescost {
  year: number;
  sites: SiteRec[];
  amounts: AmountRec[];
}

export async function parseSalescostWorkbook(
  buffer: Buffer,
  year: number,
): Promise<ParsedSalescost> {
  const wb = new ExcelJS.Workbook();
  try {
    await wb.xlsx.load(buffer as unknown as ExcelJS.Buffer);
  } catch {
    throw new SalescostParseError(
      "Excel 파일을 열 수 없습니다. .xlsx 형식의 파일인지 확인해 주세요.",
    );
  }

  const summarySheet = `Summary ${year}`;
  const ws = wb.getWorksheet(summarySheet);
  if (!ws) {
    throw new SalescostParseError(
      `'${summarySheet}' 시트를 찾을 수 없습니다. 대상 연도가 맞는지, 매출/원가 취합 양식이 맞는지 확인해 주세요.`,
    );
  }

  const sites = new Map<string, SiteRec>();
  const amounts: AmountRec[] = [];
  let sortOrder = 0;

  const ensureSite = (
    code: string,
    name: string,
    category: string | null,
    bizType: string | null,
  ) => {
    const existing = sites.get(code);
    if (!existing) {
      sites.set(code, { code, name, category, bizType, sortOrder: sortOrder++ });
    } else {
      if (!existing.category && category) existing.category = category;
      if (!existing.bizType && bizType) existing.bizType = bizType;
    }
  };

  // ---- Summary sheet: revenue / cogs / repair allowance ----
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
      const usd = cellNumber(row.getCell(18 + m).value); // cols 19..30
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

  // ---- Allocation sheet (1000 USD) ----
  const wa = wb.getWorksheet(ALLOC_SHEET);
  if (!wa) {
    throw new SalescostParseError(
      `'${ALLOC_SHEET}' 시트를 찾을 수 없습니다. 매출/원가 취합 양식이 맞는지 확인해 주세요.`,
    );
  }

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

  if (sites.size === 0) {
    throw new SalescostParseError(
      "현장(SITE)을 하나도 찾지 못했습니다. Summary 시트 1열에 SITE 코드가 있는지 확인해 주세요.",
    );
  }
  if (amounts.length === 0) {
    throw new SalescostParseError(
      "월별 매출/원가 숫자를 찾지 못했습니다. Summary 시트의 값이 채워져 있는지 확인해 주세요.",
    );
  }

  return { year, sites: [...sites.values()], amounts };
}

export function buildSalescostPreview(parsed: ParsedSalescost) {
  const usdSum = (metric: string) =>
    round2(
      parsed.amounts
        .filter((a) => a.metric === metric && a.amountUsd != null)
        .reduce((s, a) => s + (a.amountUsd ?? 0), 0),
    );
  const sites = parsed.sites.map((s) => {
    const rows = parsed.amounts.filter((a) => a.code === s.code);
    return {
      code: s.code,
      name: s.name,
      revenueUsdTotal: round2(
        rows
          .filter((a) => a.metric === "revenue" && a.amountUsd != null)
          .reduce((x, a) => x + (a.amountUsd ?? 0), 0),
      ),
      cogsUsdTotal: round2(
        rows
          .filter((a) => a.metric === "cogs" && a.amountUsd != null)
          .reduce((x, a) => x + (a.amountUsd ?? 0), 0),
      ),
      amountCount: rows.length,
    };
  });
  return {
    year: parsed.year,
    unit: "천 USD",
    siteCount: parsed.sites.length,
    amountCount: parsed.amounts.length,
    totals: { revenueUsd: usdSum("revenue"), cogsUsd: usdSum("cogs") },
    sites,
  };
}

export async function applySalescostImport(parsed: ParsedSalescost) {
  await db.transaction(async (tx) => {
    // Full replace: the workbook is the single source of truth for sales/cost data
    await tx.delete(scMonthlyTable);
    await tx.delete(scSitesTable);

    const idByCode = new Map<string, number>();
    for (const s of parsed.sites) {
      const [row] = await tx
        .insert(scSitesTable)
        .values({
          code: s.code,
          name: s.name,
          category: s.category,
          bizType: s.bizType,
          sortOrder: s.sortOrder,
        })
        .returning({ id: scSitesTable.id });
      idByCode.set(s.code, row.id);
    }

    // merge duplicate (site, month, metric) rows: COALESCE semantics like the CLI upsert
    const merged = new Map<string, { siteId: number; month: number; metric: string; amountVnd: number | null; amountUsd: number | null }>();
    for (const a of parsed.amounts) {
      const siteId = idByCode.get(a.code);
      if (!siteId) continue;
      const k = `${siteId}|${a.month}|${a.metric}`;
      const prev = merged.get(k);
      if (prev) {
        if (a.amountVnd != null) prev.amountVnd = a.amountVnd;
        if (a.amountUsd != null) prev.amountUsd = a.amountUsd;
      } else {
        merged.set(k, {
          siteId,
          month: a.month,
          metric: a.metric,
          amountVnd: a.amountVnd,
          amountUsd: a.amountUsd,
        });
      }
    }
    const values = [...merged.values()].map((a) => ({
      siteId: a.siteId,
      year: parsed.year,
      month: a.month,
      metric: a.metric,
      amountVnd: a.amountVnd != null ? String(a.amountVnd) : null,
      amountUsd: a.amountUsd != null ? String(a.amountUsd) : null,
    }));
    for (let i = 0; i < values.length; i += 500) {
      await tx.insert(scMonthlyTable).values(values.slice(i, i + 500));
    }
  });
}
