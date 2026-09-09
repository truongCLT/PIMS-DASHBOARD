import ExcelJS from "exceljs";
import { and, desc, eq, gte, notInArray } from "drizzle-orm";
import { db, orderEntriesTable, orderImportHistoryTable } from "@workspace/db";

export interface OrderEntry {
  projectName: string;
  planAmount: number | null;
  planDate: string | null;
  actualAmount: number | null;
  actualDate: string | null;
}

export interface ParsedOrderWorkbook {
  year: number;
  referenceMonth: number;
  unit: "천 USD";
  entries: OrderEntry[];
  totals: { plan: number; actual: number };
}

export class OrderImportError extends Error {}

const numberValue = (value: ExcelJS.CellValue): number | null => {
  if (value == null || value === "") return null;
  if (typeof value === "number") return value;
  if (typeof value === "object" && "result" in value) {
    const result = value.result;
    return typeof result === "number" ? result : null;
  }
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const dateValue = (value: ExcelJS.CellValue): string | null => {
  if (value == null || value === "") return null;
  const d = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export async function parseOrderWorkbook(buffer: Buffer, year: number): Promise<ParsedOrderWorkbook> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer as unknown as ExcelJS.Buffer);
  if (wb.worksheets.length !== 1) throw new OrderImportError("수주 계획 Excel은 시트가 1개여야 합니다.");
  const ws = wb.worksheets[0];
  if (!String(ws.getCell("A2").text).includes("수주계획")) throw new OrderImportError("A2에서 '수주계획' 제목을 찾을 수 없습니다.");
  if (String(ws.getCell("A5").text).trim() !== "PJ명") throw new OrderImportError("수주 계획 Excel의 헤더 형식이 올바르지 않습니다.");
  if (!String(ws.getCell("D3").text).includes("K USD")) throw new OrderImportError("금액 단위는 K USD여야 합니다.");
  const referenceMonth = numberValue(ws.getCell("H3").value);
  if (!referenceMonth || !Number.isInteger(referenceMonth) || referenceMonth < 1 || referenceMonth > 12) {
    throw new OrderImportError("기준월은 1~12 사이의 정수여야 합니다.");
  }
  const entries: OrderEntry[] = [];
  const names = new Set<string>();
  for (let row = 6; row <= ws.rowCount; row++) {
    const projectName = String(ws.getCell(row, 1).text ?? "").trim();
    if (!projectName || projectName === "합계") continue;
    if (names.has(projectName)) throw new OrderImportError(`중복 프로젝트가 있습니다: ${projectName}`);
    names.add(projectName);
    const planCell = ws.getCell(row, 2);
    const actualCell = ws.getCell(row, 4);
    const planAmount = numberValue(planCell.value);
    const actualAmount = numberValue(actualCell.value);
    if (typeof planCell.value === "object" && planCell.value && "formula" in planCell.value && planAmount == null) {
      throw new OrderImportError(`${row}행 계획 수식에 저장된 계산 결과가 없습니다.`);
    }
    if (typeof actualCell.value === "object" && actualCell.value && "formula" in actualCell.value && actualAmount == null) {
      throw new OrderImportError(`${row}행 실적/전망 수식에 저장된 계산 결과가 없습니다.`);
    }
    const planDate = dateValue(ws.getCell(row, 3).value);
    const actualDate = dateValue(ws.getCell(row, 5).value);
    if (planAmount != null && planDate == null) throw new OrderImportError(`${row}행 계획 금액의 시기가 없습니다.`);
    if (actualAmount != null && actualDate == null) throw new OrderImportError(`${row}행 실적/전망 금액의 시기가 없습니다.`);
    if (planDate && !planDate.startsWith(`${year}-`)) throw new OrderImportError(`${row}행 계획 시기가 대상 연도와 다릅니다.`);
    if (actualDate && !actualDate.startsWith(`${year}-`)) throw new OrderImportError(`${row}행 실적/전망 시기가 대상 연도와 다릅니다.`);
    entries.push({ projectName, planAmount, planDate, actualAmount, actualDate });
  }
  if (entries.length === 0) throw new OrderImportError("반영할 프로젝트가 없습니다.");
  const totals = {
    plan: entries.reduce((s, e) => s + (e.planAmount ?? 0), 0),
    actual: entries.reduce((s, e) => s + (e.actualAmount ?? 0), 0),
  };
  const totalRow = [...Array(ws.rowCount)].map((_, i) => i + 1)
    .find((row) => String(ws.getCell(row, 1).text).trim() === "합계");
  if (totalRow) {
    const sheetPlan = numberValue(ws.getCell(totalRow, 2).value);
    const sheetActual = numberValue(ws.getCell(totalRow, 4).value);
    if (sheetPlan == null || sheetActual == null) throw new OrderImportError("합계 수식의 저장된 계산 결과가 없습니다.");
    if (Math.abs(sheetPlan - totals.plan) > 0.01 || Math.abs(sheetActual - totals.actual) > 0.01) {
      throw new OrderImportError("프로젝트 상세 합계와 Excel 합계 행이 일치하지 않습니다.");
    }
  } else {
    throw new OrderImportError("합계 행을 찾을 수 없습니다.");
  }
  return { year, referenceMonth, unit: "천 USD", entries, totals };
}

export const buildOrderPreview = (p: ParsedOrderWorkbook) => ({
  ...p,
  projectCount: p.entries.length,
});

interface Snapshot {
  referenceMonth: number;
  entries: OrderEntry[];
}
type LegacySnapshot = OrderEntry[];

export function normalizeOrderSnapshot(raw: unknown, fallbackReferenceMonth: number): Snapshot {
  if (Array.isArray(raw)) return { referenceMonth: fallbackReferenceMonth, entries: raw as LegacySnapshot };
  const value = raw as Partial<Snapshot> | null;
  return {
    referenceMonth: Number.isInteger(value?.referenceMonth) ? value!.referenceMonth! : fallbackReferenceMonth,
    entries: Array.isArray(value?.entries) ? value.entries : [],
  };
}
const HISTORY_KEEP = 5;

export async function applyOrderImport(parsed: ParsedOrderWorkbook, filename: string) {
  await db.transaction(async (tx) => {
    const current = await tx.select().from(orderEntriesTable).where(eq(orderEntriesTable.year, parsed.year));
    const snapshot: Snapshot = {
      referenceMonth: current[0]?.referenceMonth ?? parsed.referenceMonth,
      entries: current.map((r) => ({
        projectName: r.projectName, planAmount: r.planAmount == null ? null : Number(r.planAmount),
        planDate: r.planDate, actualAmount: r.actualAmount == null ? null : Number(r.actualAmount), actualDate: r.actualDate,
      })),
    };
    await tx.insert(orderImportHistoryTable).values({
      filename, year: parsed.year, referenceMonth: parsed.referenceMonth, snapshot,
    });
    const keep = await tx.select({ id: orderImportHistoryTable.id }).from(orderImportHistoryTable)
      .where(eq(orderImportHistoryTable.year, parsed.year))
      .orderBy(desc(orderImportHistoryTable.createdAt), desc(orderImportHistoryTable.id)).limit(HISTORY_KEEP);
    await tx.delete(orderImportHistoryTable).where(and(
      eq(orderImportHistoryTable.year, parsed.year),
      notInArray(orderImportHistoryTable.id, keep.map((x) => x.id)),
    ));
    await tx.delete(orderEntriesTable).where(eq(orderEntriesTable.year, parsed.year));
    await tx.insert(orderEntriesTable).values(parsed.entries.map((e) => ({
      year: parsed.year, referenceMonth: parsed.referenceMonth, projectName: e.projectName,
      planAmount: e.planAmount == null ? null : String(e.planAmount), planDate: e.planDate,
      actualAmount: e.actualAmount == null ? null : String(e.actualAmount), actualDate: e.actualDate,
    })));
  });
}

export async function listOrderImportHistory() {
  const rows = await db.select().from(orderImportHistoryTable)
    .orderBy(desc(orderImportHistoryTable.createdAt), desc(orderImportHistoryTable.id));
  return rows.map((r) => ({
    id: r.id, createdAt: r.createdAt.toISOString(), filename: r.filename, year: r.year,
    referenceMonth: r.referenceMonth,
    snapshotEmpty: normalizeOrderSnapshot(r.snapshot, r.referenceMonth).entries.length === 0,
  }));
}

export async function revertOrderImport(historyId: number) {
  return db.transaction(async (tx) => {
    const [row] = await tx.select().from(orderImportHistoryTable).where(eq(orderImportHistoryTable.id, historyId));
    if (!row) throw new OrderImportError("해당 수주 반영 이력을 찾을 수 없습니다.");
    const snapshot = normalizeOrderSnapshot(row.snapshot, row.referenceMonth);
    if (snapshot.entries.length === 0) throw new OrderImportError("이전 수주 데이터가 없어 되돌릴 수 없습니다.");
    await tx.delete(orderEntriesTable).where(eq(orderEntriesTable.year, row.year));
    await tx.insert(orderEntriesTable).values(snapshot.entries.map((e) => ({
      year: row.year, referenceMonth: snapshot.referenceMonth, projectName: e.projectName,
      planAmount: e.planAmount == null ? null : String(e.planAmount), planDate: e.planDate,
      actualAmount: e.actualAmount == null ? null : String(e.actualAmount), actualDate: e.actualDate,
    })));
    await tx.delete(orderImportHistoryTable).where(and(
      eq(orderImportHistoryTable.year, row.year),
      gte(orderImportHistoryTable.id, row.id),
    ));
    return { filename: row.filename, year: row.year, restoredProjects: snapshot.entries.length };
  });
}

export async function buildCurrentOrderWorkbook(year: number): Promise<Buffer> {
  const rows = await db.select().from(orderEntriesTable).where(eq(orderEntriesTable.year, year));
  if (rows.length === 0) throw new OrderImportError("다운로드할 수주 데이터가 없습니다.");
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Sheet1");
  ws.getCell("A2").value = "■ 수주계획";
  ws.getCell("D3").value = "(단위 : K USD)";
  ws.getCell("G3").value = "기준월";
  ws.getCell("H3").value = rows[0].referenceMonth;
  ws.getCell("A4").value = "구분"; ws.getCell("B4").value = "계획"; ws.getCell("D4").value = "실적 및 전망";
  ["PJ명", "금액", "시기", "금액", "시기"].forEach((v, i) => { ws.getCell(5, i + 1).value = v; });
  rows.forEach((r, i) => {
    const n = i + 6;
    ws.getCell(n, 1).value = r.projectName;
    ws.getCell(n, 2).value = r.planAmount == null ? null : Number(r.planAmount);
    ws.getCell(n, 3).value = r.planDate ? new Date(`${r.planDate}T00:00:00`) : null;
    ws.getCell(n, 4).value = r.actualAmount == null ? null : Number(r.actualAmount);
    ws.getCell(n, 5).value = r.actualDate ? new Date(`${r.actualDate}T00:00:00`) : null;
  });
  const totalRow = rows.length + 6;
  ws.getCell(totalRow, 1).value = "합계";
  ws.getCell(totalRow, 2).value = {
    formula: `SUM(B6:B${totalRow - 1})`,
    result: rows.reduce((sum, r) => sum + (r.planAmount == null ? 0 : Number(r.planAmount)), 0),
  };
  ws.getCell(totalRow, 4).value = {
    formula: `SUM(D6:D${totalRow - 1})`,
    result: rows.reduce((sum, r) => sum + (r.actualAmount == null ? 0 : Number(r.actualAmount)), 0),
  };
  ws.columns = [{ width: 28 }, { width: 14 }, { width: 14 }, { width: 14 }, { width: 14 }, { width: 3 }, { width: 10 }, { width: 8 }];
  ws.getColumn(3).numFmt = "yyyy-mm-dd"; ws.getColumn(5).numFmt = "yyyy-mm-dd";
  return Buffer.from(await wb.xlsx.writeBuffer());
}