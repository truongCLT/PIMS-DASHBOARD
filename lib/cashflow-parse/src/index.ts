import ExcelJS from "exceljs";
import { Readable } from "node:stream";

// 자금수지 Excel parser (shared by CLI importer and API server upload).
// Sheet "자금수지(FS)_작성시트": rows from 16.
//   col1 = 구분(division), col2 = 프로젝트, col3 = 수입/지출, col4 = 항목명
//   col6 = 22년말 소계 (pre2023), cols 7..110 = 2023-01..2030-12
//   (연 소계 열은 건너뜀), col111 = 30년이후 (post2030).
//
// NOTE: 이 워크북은 전체 로드(wb.xlsx.load) 시 ExcelJS가 ~4GB RSS를 사용해
// 운영 서버에서 OOM-killed 된다. 스트리밍 리더(피크 ~130MB)로 행 단위 파싱.
// 스트리밍 모드는 병합 셀 값을 채워주지 않으므로 구분/프로젝트/수입지출은
// 마지막 비어있지 않은 값을 carry-forward한다.

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

export type AmountRec = { flowType: string; bucket: string; month: string; amount: number };
export type ProjectRec = {
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

async function parseStream(
  source: string | Readable,
): Promise<ParsedCashflow> {
  const colSpecs = buildColSpecs();
  const projects = new Map<string, ProjectRec>();
  let sortOrder = 0;
  let sheetFound = false;

  let lastDivision = "";
  let lastProject = "";
  let lastFlow = "";

  const reader = new ExcelJS.stream.xlsx.WorkbookReader(source as string, {
    entries: "emit",
    sharedStrings: "cache",
    styles: "ignore",
    hyperlinks: "ignore",
    worksheets: "emit",
  });

  for await (const ws of reader) {
    // WorksheetReader has a runtime `name` that the typings omit
    if ((ws as unknown as { name?: string }).name !== SHEET) continue;
    sheetFound = true;
    for await (const row of ws) {
      if (row.number < 16) continue;
      handleRow(row);
    }
  }

  if (!sheetFound) {
    throw new CashflowParseError(
      `'${SHEET}' 시트를 찾을 수 없습니다. 자금수지 취합 양식이 맞는지 확인해 주세요.`,
    );
  }

  function handleRow(row: ExcelJS.Row) {
    const divisionRaw = norm(cellText(row.getCell(1).value));
    const projectRaw = norm(cellText(row.getCell(2).value));
    const flowRaw = norm(cellText(row.getCell(3).value));
    const itemName = norm(cellText(row.getCell(4).value));

    // 병합 셀 carry-forward: 새 구분/프로젝트가 시작되면 하위 값 초기화
    if (divisionRaw) {
      lastDivision = divisionRaw;
      lastProject = "";
      lastFlow = "";
    }
    if (projectRaw) {
      lastProject = projectRaw;
      lastFlow = "";
    }
    if (flowRaw) lastFlow = flowRaw;

    const division = lastDivision;
    let projectName = lastProject;
    const flowType = lastFlow;

    if (!division || SKIP_DIVISIONS.has(division)) return;
    if (flowType !== "수입" && flowType !== "지출") return;
    if (/^합\s*계$/.test(projectName)) return;
    if (!projectName) {
      if (division === "본사판관비") projectName = "본사판관비";
      else return;
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
    // aggregate duplicate (flowType, bucket, month) rows
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

export async function parseCashflowWorkbook(buffer: Buffer): Promise<ParsedCashflow> {
  try {
    return await parseStream(Readable.from(buffer));
  } catch (err) {
    if (err instanceof CashflowParseError) throw err;
    throw new CashflowParseError(
      "Excel 파일을 열 수 없습니다. .xlsx 형식의 파일인지 확인해 주세요.",
    );
  }
}

export async function parseCashflowFile(filePath: string): Promise<ParsedCashflow> {
  try {
    return await parseStream(filePath);
  } catch (err) {
    if (err instanceof CashflowParseError) throw err;
    throw new CashflowParseError(
      "Excel 파일을 열 수 없습니다. .xlsx 형식의 파일인지 확인해 주세요.",
    );
  }
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
