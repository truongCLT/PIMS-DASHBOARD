import ExcelJS from "exceljs";
import { describe, it, expect } from "vitest";
import {
  parseCashflowWorkbook,
  CashflowParseError,
  buildCashflowPreview,
} from "./index.js";

const SHEET = "자금수지(FS)_작성시트";

/** Build a minimal in-memory xlsx Buffer for testing.
 *  rows is an array of { rowNum, cells } where cells is { [col]: value }.
 *  The sheet is always named SHEET so the parser finds it.
 */
async function buildFixture(
  rows: Array<{ rowNum: number; cells: Record<number, ExcelJS.CellValue> }>,
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(SHEET);
  for (const { rowNum, cells } of rows) {
    const row = ws.getRow(rowNum);
    for (const [col, val] of Object.entries(cells)) {
      row.getCell(Number(col)).value = val as ExcelJS.CellValue;
    }
    row.commit();
  }
  const ab = await wb.xlsx.writeBuffer();
  return Buffer.from(ab as ArrayBuffer);
}

/** Build a buffer with a different (wrong) sheet name to test error handling. */
async function buildWrongSheetFixture(): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.addWorksheet("다른시트");
  const ab = await wb.xlsx.writeBuffer();
  return Buffer.from(ab as ArrayBuffer);
}

// ─── col6 = pre2023, col7 = 2023-01 (first monthly col) ───────────────────
const PRE2023_COL = 6;
const JAN2023_COL = 7;

describe("parseCashflowWorkbook", () => {
  it("parses a single project with 수입 and 지출 rows", async () => {
    const buf = await buildFixture([
      // row 16: 구분='영업', 프로젝트='A현장', 수입지출='수입', 항목='분양수입'
      {
        rowNum: 16,
        cells: { 1: "영업", 2: "A현장", 3: "수입", 4: "분양수입", [PRE2023_COL]: 1000 },
      },
      // row 17: carry-forward (구분·프로젝트 비어있음), 수입지출='지출', 항목='공사비'
      {
        rowNum: 17,
        cells: { 3: "지출", 4: "공사비", [JAN2023_COL]: 500 },
      },
    ]);

    const parsed = await parseCashflowWorkbook(buf);
    expect(parsed.projects).toHaveLength(1);

    const proj = parsed.projects[0];
    expect(proj.name).toBe("A현장");
    expect(proj.division).toBe("영업");
    expect(proj.itemNameIn).toBe("분양수입");
    expect(proj.itemNameOut).toBe("공사비");
    expect(proj.amounts).toHaveLength(2);

    const inAmt = proj.amounts.find((a) => a.flowType === "수입");
    const outAmt = proj.amounts.find((a) => a.flowType === "지출");
    expect(inAmt?.amount).toBe(1000);
    expect(inAmt?.bucket).toBe("pre2023");
    expect(outAmt?.amount).toBe(500);
    expect(outAmt?.bucket).toBe("month");
    expect(outAmt?.month).toBe("2023-01-01");
  });

  it("carry-forward: 구분·프로젝트·수입지출 모두 이어받음", async () => {
    const buf = await buildFixture([
      // row 16: 구분+프로젝트+수입지출 설정
      { rowNum: 16, cells: { 1: "개발", 2: "B현장", 3: "수입", 4: "용역수입", [PRE2023_COL]: 200 } },
      // row 17: 구분·프로젝트 비어있음, 수입지출도 비어있음 → 이전 값 그대로
      { rowNum: 17, cells: { 4: "기타수입", [JAN2023_COL]: 300 } },
      // row 18: 새 수입지출 '지출'
      { rowNum: 18, cells: { 3: "지출", 4: "용역비", [JAN2023_COL]: 100 } },
    ]);

    const parsed = await parseCashflowWorkbook(buf);
    const proj = parsed.projects[0];
    expect(proj.name).toBe("B현장");
    // row 17도 '수입'으로 carry-forward되므로 '수입' 금액 2건 → aggregated
    const inAmounts = proj.amounts.filter((a) => a.flowType === "수입");
    // row 16: pre2023 200, row 17: month 2023-01 300
    expect(inAmounts.find((a) => a.bucket === "pre2023")?.amount).toBe(200);
    expect(inAmounts.find((a) => a.bucket === "month")?.amount).toBe(300);
    // row 18: 지출 100
    const outAmt = proj.amounts.find((a) => a.flowType === "지출");
    expect(outAmt?.amount).toBe(100);
  });

  it("carry-forward 초기화: 새 구분이 오면 프로젝트 리셋", async () => {
    const buf = await buildFixture([
      { rowNum: 16, cells: { 1: "영업", 2: "A현장", 3: "수입", 4: "수입", [PRE2023_COL]: 100 } },
      // 새 구분 → 프로젝트 clear → 이 행은 프로젝트 없으므로 건너뜀
      { rowNum: 17, cells: { 1: "본사판관비", 3: "수입", 4: "수입", [JAN2023_COL]: 50 } },
    ]);

    const parsed = await parseCashflowWorkbook(buf);
    // A현장(영업) 과 본사판관비(본사판관비 특수처리) 두 건
    const names = parsed.projects.map((p) => p.name);
    expect(names).toContain("A현장");
    expect(names).toContain("본사판관비");
  });

  it("SKIP_DIVISIONS에 속한 구분은 건너뜀", async () => {
    const buf = await buildFixture([
      // 이 구분은 SKIP_DIVISIONS에 포함됨
      {
        rowNum: 16,
        cells: { 1: "사업전체", 2: "합계", 3: "수입", 4: "합계", [PRE2023_COL]: 9999 },
      },
      // 유효 구분
      { rowNum: 17, cells: { 1: "영업", 2: "C현장", 3: "수입", 4: "수입", [PRE2023_COL]: 77 } },
    ]);

    const parsed = await parseCashflowWorkbook(buf);
    expect(parsed.projects).toHaveLength(1);
    expect(parsed.projects[0].name).toBe("C현장");
  });

  it("프로젝트명이 '합계'이면 건너뜀", async () => {
    const buf = await buildFixture([
      { rowNum: 16, cells: { 1: "영업", 2: "합계", 3: "수입", 4: "수입", [PRE2023_COL]: 999 } },
      { rowNum: 17, cells: { 1: "영업", 2: "D현장", 3: "수입", 4: "수입", [PRE2023_COL]: 10 } },
    ]);

    const parsed = await parseCashflowWorkbook(buf);
    expect(parsed.projects.map((p) => p.name)).not.toContain("합계");
    expect(parsed.projects[0].name).toBe("D현장");
  });

  it("중복 (flowType, bucket, month) 금액은 합산됨", async () => {
    const buf = await buildFixture([
      { rowNum: 16, cells: { 1: "영업", 2: "E현장", 3: "수입", 4: "a", [PRE2023_COL]: 100 } },
      // 같은 프로젝트·같은 구분에서 같은 bucket 두 번 (다른 항목명)
      { rowNum: 17, cells: { 3: "수입", 4: "b", [PRE2023_COL]: 200 } },
    ]);

    const parsed = await parseCashflowWorkbook(buf);
    const proj = parsed.projects[0];
    const inPre = proj.amounts.filter(
      (a) => a.flowType === "수입" && a.bucket === "pre2023",
    );
    // 두 행이 같은 key로 합산 → 하나의 AmountRec 300
    expect(inPre).toHaveLength(1);
    expect(inPre[0].amount).toBe(300);
  });

  it("col111이 post2030 bucket에 매핑됨", async () => {
    const buf = await buildFixture([
      { rowNum: 16, cells: { 1: "영업", 2: "F현장", 3: "수입", 4: "수입", 111: 888 } },
    ]);

    const parsed = await parseCashflowWorkbook(buf);
    const post = parsed.projects[0].amounts.find((a) => a.bucket === "post2030");
    expect(post).toBeDefined();
    expect(post?.amount).toBe(888);
    expect(post?.month).toBe("2031-01-01");
  });

  it("CashflowParseError: 지정 시트가 없으면 에러", async () => {
    const buf = await buildWrongSheetFixture();
    await expect(parseCashflowWorkbook(buf)).rejects.toBeInstanceOf(CashflowParseError);
  });

  it("CashflowParseError: 16행 이후에 데이터가 없으면 에러", async () => {
    const buf = await buildFixture([
      // row 15만 채움 → 16행부터 읽으므로 데이터 없음
      { rowNum: 15, cells: { 1: "영업", 2: "G현장", 3: "수입", 4: "수입", [PRE2023_COL]: 1 } },
    ]);
    await expect(parseCashflowWorkbook(buf)).rejects.toBeInstanceOf(CashflowParseError);
  });

  it("buildCashflowPreview: 합계·프로젝트 수·금액 건수를 올바르게 집계", async () => {
    const buf = await buildFixture([
      { rowNum: 16, cells: { 1: "영업", 2: "H현장", 3: "수입", 4: "수입", [PRE2023_COL]: 1000 } },
      { rowNum: 17, cells: { 3: "지출", 4: "지출", [PRE2023_COL]: 400 } },
    ]);

    const parsed = await parseCashflowWorkbook(buf);
    const preview = buildCashflowPreview(parsed);

    expect(preview.projectCount).toBe(1);
    expect(preview.totals.cashIn).toBe(1000);
    expect(preview.totals.cashOut).toBe(400);
    expect(preview.amountCount).toBe(2);
  });
});
