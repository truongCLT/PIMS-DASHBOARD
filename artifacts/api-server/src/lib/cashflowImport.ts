import ExcelJS from "exceljs";
import { db, cfProjectsTable, cfMonthlyAmountsTable } from "@workspace/db";

// 자금수지 Excel parser — mirrors scripts/src/import-cashflow.ts (keep both in sync).
// Sheet "자금수지(FS)_작성시트": rows from 16, col1 구분(division), col2 프로젝트,
// col3 수입/지출, col4 항목명; col6 = 22년말 소계, cols 7.. = 2023-01..2030-12
// (연 소계 열은 건너뜀), col111 = 30년이후.

export class CashflowParseError extends Error {}

const SHEET = "자금수지(FS)_작성시트";

type ColSpec = { col: number; bucket: string; month: string };

function buildColSpecs(): ColSpec[] {
  const specs: ColSpec[] = [{ col: 6, bucket: "pre2023", month: "2022-12-01" }];
  let col = 7;
  for (let year = 2023; year <= 2030; year++) {
    for (let m = 1; m <= 12; m++) {
      specs.push({
        col,
        bucket: "month",
        month: `${year}-${String(m).padStart(2, "0")}-01`,
      });
      col++;
    }
    col++; // skip yearly subtotal column
  }
  specs.push({ col: 111, bucket: "post2030", month: "2031-01-01" });
  return specs;
}

const SKIP_DIVISIONS = new Set([
  "사업전체",
  "법인합계",
  "영업 (도급/용역사업)",
  "영업(출자  / 배당 제외)",
  "영업(출자 / 배당 제외)",
  "재무/투자 (대여,차입,출자,배당 등)",
]);

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
    return null;
  }
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
const norm = (s: string) => s.replace(/\s+/g, " ").trim();
const round2 = (n: number) => Math.round(n * 100) / 100;

type AmountRec = { flowType: string; bucket: string; month: string; amount: number };
type ProjectRec = {
  name: string;
  division: string;
  itemNameIn: string | null;
  itemNameOut: string | null;
  sortOrder: number;
  amounts: AmountRec[];
};

export interface ParsedCashflow {
  projects: ProjectRec[];
}

export async function parseCashflowWorkbook(buffer: Buffer): Promise<ParsedCashflow> {
  const wb = new ExcelJS.Workbook();
  try {
    await wb.xlsx.load(buffer as unknown as ExcelJS.Buffer);
  } catch {
    throw new CashflowParseError(
      "Excel 파일을 열 수 없습니다. .xlsx 형식의 파일인지 확인해 주세요.",
    );
  }
  const ws = wb.getWorksheet(SHEET);
  if (!ws) {
    throw new CashflowParseError(
      `'${SHEET}' 시트를 찾을 수 없습니다. 자금수지 취합 양식이 맞는지 확인해 주세요.`,
    );
  }

  const colSpecs = buildColSpecs();
  const projects = new Map<string, ProjectRec>();
  let sortOrder = 0;

  for (let r = 16; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const division = norm(cellText(row.getCell(1).value));
    let projectName = norm(cellText(row.getCell(2).value));
    const flowType = norm(cellText(row.getCell(3).value));
    const itemName = norm(cellText(row.getCell(4).value));

    if (!division || SKIP_DIVISIONS.has(division)) continue;
    if (flowType !== "수입" && flowType !== "지출") continue;
    if (/^합\s*계$/.test(projectName)) continue;
    if (!projectName) {
      if (division === "본사판관비") projectName = "본사판관비";
      else continue;
    }

    const key = `${division}|${projectName}`;
    let rec = projects.get(key);
    if (!rec) {
      rec = {
        name: projectName,
        division,
        itemNameIn: null,
        itemNameOut: null,
        sortOrder: sortOrder++,
        amounts: [],
      };
      projects.set(key, rec);
    }
    if (flowType === "수입" && itemName) rec.itemNameIn ??= itemName;
    if (flowType === "지출" && itemName) rec.itemNameOut ??= itemName;

    for (const spec of colSpecs) {
      const n = cellNumber(row.getCell(spec.col).value);
      if (n == null || n === 0) continue;
      rec.amounts.push({
        flowType,
        bucket: spec.bucket,
        month: spec.month,
        amount: round2(n),
      });
    }
  }

  for (const [key, rec] of projects) {
    if (rec.amounts.length === 0) {
      projects.delete(key);
      continue;
    }
    // aggregate duplicate (flowType, bucket, month) rows so preview counts match DB rows
    const agg = new Map<string, AmountRec>();
    for (const a of rec.amounts) {
      const k = `${a.flowType}|${a.bucket}|${a.month}`;
      const prev = agg.get(k);
      if (prev) prev.amount = round2(prev.amount + a.amount);
      else agg.set(k, { ...a });
    }
    rec.amounts = [...agg.values()];
  }

  if (projects.size === 0) {
    throw new CashflowParseError(
      "자금수지 데이터를 찾지 못했습니다. 16행 이후에 구분·프로젝트·수입/지출 데이터가 있는지 확인해 주세요.",
    );
  }

  return { projects: [...projects.values()] };
}

export function buildCashflowPreview(parsed: ParsedCashflow) {
  let totalIn = 0;
  let totalOut = 0;
  let amountCount = 0;
  const projects = parsed.projects.map((p) => {
    const cashIn = p.amounts
      .filter((a) => a.flowType === "수입")
      .reduce((s, a) => s + a.amount, 0);
    const cashOut = p.amounts
      .filter((a) => a.flowType === "지출")
      .reduce((s, a) => s + a.amount, 0);
    totalIn += cashIn;
    totalOut += cashOut;
    amountCount += p.amounts.length;
    return {
      name: p.name,
      division: p.division,
      cashInTotal: round2(cashIn),
      cashOutTotal: round2(cashOut),
      amountCount: p.amounts.length,
    };
  });
  return {
    unit: "천 USD",
    projectCount: parsed.projects.length,
    amountCount,
    totals: { cashIn: round2(totalIn), cashOut: round2(totalOut) },
    projects,
  };
}

export async function applyCashflowImport(parsed: ParsedCashflow) {
  await db.transaction(async (tx) => {
    // Full replace: the workbook is the single source of truth for cashflow data
    await tx.delete(cfMonthlyAmountsTable);
    await tx.delete(cfProjectsTable);

    for (const p of parsed.projects) {
      const [row] = await tx
        .insert(cfProjectsTable)
        .values({
          name: p.name,
          division: p.division,
          itemNameIn: p.itemNameIn,
          itemNameOut: p.itemNameOut,
          sortOrder: p.sortOrder,
        })
        .returning({ id: cfProjectsTable.id });

      // amounts are already aggregated by (flowType, bucket, month) at parse time
      const values = p.amounts.map((a) => ({
        projectId: row.id,
        flowType: a.flowType,
        bucket: a.bucket,
        month: a.month,
        amount: String(a.amount),
      }));
      for (let i = 0; i < values.length; i += 500) {
        await tx.insert(cfMonthlyAmountsTable).values(values.slice(i, i + 500));
      }
    }
  });
}
