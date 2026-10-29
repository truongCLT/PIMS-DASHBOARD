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

// ExcelJS는 날짜 셀을 UTC 자정 기준 Date 객체로 돌려준다. getFullYear()/getMonth()/getDate() 같은
// "로컬 시간" getter를 쓰면 서버 프로세스의 타임존에 따라 하루가 밀리는 버그가 생긴다 (예: UTC보다
// 서쪽 타임존에서는 UTC 자정이 전날 오후로 해석되어, 12/31 ~ 1/1 경계의 날짜가 엉뚱한 연도로 바뀌고
// 아래 "대상 연도와 다릅니다" 검증에서 업로드가 실패한다). 반드시 UTC getter로 읽어야 한다.
const dateValue = (value: ExcelJS.CellValue): string | null => {
  if (value == null || value === "") return null;
  const d = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
};

export async function parseOrderWorkbook(buffer: Buffer, year: number): Promise<ParsedOrderWorkbook> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer as unknown as ExcelJS.Buffer);
  if (wb.worksheets.length !== 1) throw new OrderImportError("수주 계획 Excel은 시트가 1개여야 합니다.");
  const ws = wb.worksheets[0];
  const titleText = String(ws.getCell("A2").text);
  if (!ALL_LABELS.some((l) => titleText.includes(l.title.replace("■ ", "")))) throw new OrderImportError("A2에서 '수주계획' 제목을 찾을 수 없습니다.");
  if (!ALL_LABELS.some((l) => String(ws.getCell("A5").text).trim() === l.project)) throw new OrderImportError("수주 계획 Excel의 헤더 형식이 올바르지 않습니다.");
  if (!String(ws.getCell("D3").text).includes("K USD")) throw new OrderImportError("금액 단위는 K USD여야 합니다.");
  const referenceMonth = numberValue(ws.getCell("H3").value);
  if (!referenceMonth || !Number.isInteger(referenceMonth) || referenceMonth < 1 || referenceMonth > 12) {
    throw new OrderImportError("기준월은 1~12 사이의 정수여야 합니다.");
  }
  const entries: OrderEntry[] = [];
  const names = new Set<string>();
  for (let row = 6; row <= ws.rowCount; row++) {
    const projectName = String(ws.getCell(row, 1).text ?? "").trim();
    if (!projectName || isTotalLabel(projectName)) continue;
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
    if (planAmount != null && planDate == null) {
      throw new OrderImportError(`${row}행 계획 금액의 시기가 없습니다 (셀 값: "${String(ws.getCell(row, 3).value ?? "")}" — 날짜로 인식되지 않았습니다. Excel 날짜 형식(yyyy-mm-dd)으로 입력해 주세요).`);
    }
    if (actualAmount != null && actualDate == null) {
      throw new OrderImportError(`${row}행 실적/전망 금액의 시기가 없습니다 (셀 값: "${String(ws.getCell(row, 5).value ?? "")}" — 날짜로 인식되지 않았습니다. Excel 날짜 형식(yyyy-mm-dd)으로 입력해 주세요).`);
    }
    if (planDate && !planDate.startsWith(`${year}-`)) throw new OrderImportError(`${row}행 계획 시기(${planDate})가 대상 연도(${year})와 다릅니다.`);
    if (actualDate && !actualDate.startsWith(`${year}-`)) throw new OrderImportError(`${row}행 실적/전망 시기(${actualDate})가 대상 연도(${year})와 다릅니다.`);
    entries.push({ projectName, planAmount, planDate, actualAmount, actualDate });
  }
  if (entries.length === 0) throw new OrderImportError("반영할 프로젝트가 없습니다.");
  const totals = {
    plan: entries.reduce((s, e) => s + (e.planAmount ?? 0), 0),
    actual: entries.reduce((s, e) => s + (e.actualAmount ?? 0), 0),
  };
  const totalRow = [...Array(ws.rowCount)].map((_, i) => i + 1)
    .find((row) => isTotalLabel(String(ws.getCell(row, 1).text).trim()));
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

export function requireRestorableOrderSnapshot(
  raw: unknown,
  fallbackReferenceMonth: number,
): Snapshot {
  const snapshot = normalizeOrderSnapshot(raw, fallbackReferenceMonth);
  if (snapshot.entries.length === 0) {
    throw new OrderImportError("이전 수주 데이터가 없어 되돌릴 수 없습니다.");
  }
  return snapshot;
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
    const snapshot = requireRestorableOrderSnapshot(row.snapshot, row.referenceMonth);
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

interface OrderWorkbookRow extends OrderEntry {
  referenceMonth: number;
}

export type OrderWorkbookLang = "ko" | "en" | "vi";

// 다운로드 양식의 라벨. parseOrderWorkbook은 세 언어 라벨을 모두 받아들인다
// (제목은 A2, 단위 D3는 "K USD" 포함, A5 헤더, 합계 행 라벨).
const ORDER_LABELS: Record<OrderWorkbookLang, {
  title: string; unit: string; refMonth: string; category: string; plan: string; actual: string;
  project: string; amount: string; date: string; total: string;
}> = {
  ko: {
    title: "■ 수주계획", unit: "(단위 : K USD)", refMonth: "기준월", category: "구분", plan: "계획",
    actual: "실적 및 전망", project: "PJ명", amount: "금액", date: "시기", total: "합계",
  },
  en: {
    title: "■ Order Plan", unit: "(Unit: K USD)", refMonth: "Ref. month", category: "Category", plan: "Plan",
    actual: "Actual & Forecast", project: "Project", amount: "Amount", date: "Date", total: "Total",
  },
  vi: {
    title: "■ Kế hoạch đơn hàng", unit: "(Đơn vị: K USD)", refMonth: "Tháng cơ sở", category: "Hạng mục", plan: "Kế hoạch",
    actual: "Thực tế & Dự báo", project: "Dự án", amount: "Số tiền", date: "Thời điểm", total: "Tổng cộng",
  },
};
const ALL_LABELS = Object.values(ORDER_LABELS);
const isTotalLabel = (text: string) => ALL_LABELS.some((l) => l.total === text);

export const parseOrderWorkbookLang = (value: unknown): OrderWorkbookLang =>
  value === "en" || value === "vi" ? value : "ko";

export async function buildOrderWorkbook(
  rows: OrderWorkbookRow[],
  year: number,
  lang: OrderWorkbookLang = "ko",
): Promise<Buffer> {
  if (rows.length === 0) throw new OrderImportError("다운로드할 수주 데이터가 없습니다.");
  return writeOrderWorkbook(rows, rows[0].referenceMonth, 0, lang);
}

/** 업로드용 빈 양식: parseOrderWorkbook이 읽는 셀 위치(A2/D3/H3/A5)는 같고, 프로젝트 행은 비워 둔다. */
export async function buildOrderTemplateWorkbook(referenceMonth: number, lang: OrderWorkbookLang = "ko"): Promise<Buffer> {
  return writeOrderWorkbook([], referenceMonth, 20, lang);
}

async function writeOrderWorkbook(
  rows: OrderEntry[],
  referenceMonth: number,
  blankRows: number,
  lang: OrderWorkbookLang,
): Promise<Buffer> {
  const L = ORDER_LABELS[lang];
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Sheet1");
  ws.getCell("A2").value = L.title;
  ws.getCell("D3").value = L.unit;
  ws.getCell("G3").value = L.refMonth;
  ws.getCell("H3").value = referenceMonth;
  ws.getCell("A4").value = L.category; ws.getCell("B4").value = L.plan; ws.getCell("D4").value = L.actual;
  [L.project, L.amount, L.date, L.amount, L.date].forEach((v, i) => { ws.getCell(5, i + 1).value = v; });
  rows.forEach((r, i) => {
    const n = i + 6;
    ws.getCell(n, 1).value = r.projectName;
    ws.getCell(n, 2).value = r.planAmount == null ? null : Number(r.planAmount);
    // "Z" 필수 — 없으면 로컬 타임존 자정으로 해석되어, 서버 타임존이 UTC가 아닐 때 dateValue()가
    // 다시 읽어들이는 UTC 날짜와 하루 어긋날 수 있다(위 dateValue() 주석 참고).
    ws.getCell(n, 3).value = r.planDate ? new Date(`${r.planDate}T00:00:00Z`) : null;
    ws.getCell(n, 4).value = r.actualAmount == null ? null : Number(r.actualAmount);
    ws.getCell(n, 5).value = r.actualDate ? new Date(`${r.actualDate}T00:00:00Z`) : null;
  });
  // 빈 행은 parseOrderWorkbook에서 건너뛰므로 양식에 입력 칸으로 남겨 둬도 된다
  const totalRow = rows.length + blankRows + 6;
  ws.getCell(totalRow, 1).value = L.total;
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

  // 서식: 표(A4~E합계) 전체 테두리, 헤더/합계 행 강조, 계획·실적 그룹 헤더 병합
  const thin = { style: "thin" as const, color: { argb: "FF8EA2BF" } };
  const border = { top: thin, left: thin, bottom: thin, right: thin };
  const headerFill = { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: "FFDCE6F2" } };
  const totalFill = { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: "FFF2F5F9" } };
  ws.mergeCells("B4:C4");
  ws.mergeCells("D4:E4");
  for (let r = 4; r <= totalRow; r++) {
    for (let c = 1; c <= 5; c++) {
      const cell = ws.getCell(r, c);
      cell.border = border;
      if (r <= 5) {
        cell.fill = headerFill;
        cell.font = { bold: true };
        cell.alignment = { horizontal: "center", vertical: "middle" };
      } else if (r === totalRow) {
        cell.fill = totalFill;
        cell.font = { bold: true };
      }
      if (r > 5 && (c === 2 || c === 4)) cell.numFmt = "#,##0.###";
    }
  }
  ws.getCell(totalRow, 1).alignment = { horizontal: "center" };
  ws.getCell("A2").font = { bold: true, size: 13 };
  for (const addr of ["G3", "H3"]) {
    const cell = ws.getCell(addr);
    cell.border = border;
    cell.font = { bold: true };
    cell.alignment = { horizontal: "center" };
  }
  ws.getCell("G3").fill = headerFill;
  ws.getColumn(7).width = 14;
  return Buffer.from(await wb.xlsx.writeBuffer());
}

export async function buildCurrentOrderWorkbook(year: number, lang: OrderWorkbookLang = "ko"): Promise<Buffer> {
  const rows = await db.select().from(orderEntriesTable).where(eq(orderEntriesTable.year, year));
  return buildOrderWorkbook(
    rows.map((row) => ({
      referenceMonth: row.referenceMonth,
      projectName: row.projectName,
      planAmount: row.planAmount == null ? null : Number(row.planAmount),
      planDate: row.planDate,
      actualAmount: row.actualAmount == null ? null : Number(row.actualAmount),
      actualDate: row.actualDate,
    })),
    year,
    lang,
  );
}