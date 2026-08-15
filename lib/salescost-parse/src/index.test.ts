import ExcelJS from "exceljs";
import { describe, it, expect } from "vitest";
import {
  parseSalescostWorkbook,
  SalescostParseError,
  buildSalescostPreview,
} from "./index.js";

const YEAR = 2024;
const SUMMARY_SHEET = `Summary ${YEAR}`;
const ALLOC_SHEET = "원가이체, 판관비 배부현황(1000USD)";

// Column layout for Summary sheet:
//   col1=SITE코드, col2=카테고리, col3=사업유형, col4=현장명/섹션헤더
//   VND: col5..16 (month 1..12), USD: col19..30

type SummaryRow = {
  rowNum: number;
  code?: string;
  category?: string;
  bizType?: string;
  name?: string;
  /** section header in col4 (e.g. "Revenue") when code is absent */
  header?: string;
  vnd?: number[]; // length 12
  usd?: number[]; // length 12
};

type AllocRow = {
  rowNum: number;
  siteLabel?: string; // col1, e.g. "Site 01"
  metric?: string; // col2
  usd?: number[]; // length 12 → cols 3..14
};

async function buildFixture(
  summaryRows: SummaryRow[],
  allocRows: AllocRow[],
  year = YEAR,
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();

  // ── Summary sheet ──────────────────────────────────────────────────────────
  const ws = wb.addWorksheet(`Summary ${year}`);
  for (const r of summaryRows) {
    const row = ws.getRow(r.rowNum);
    if (r.header) {
      row.getCell(4).value = r.header;
    }
    if (r.code) {
      row.getCell(1).value = r.code;
      row.getCell(2).value = r.category ?? null;
      row.getCell(3).value = r.bizType ?? null;
      row.getCell(4).value = r.name ?? r.code;
    }
    if (r.vnd) {
      r.vnd.forEach((v, i) => {
        row.getCell(5 + i).value = v; // cols 5..16
      });
    }
    if (r.usd) {
      r.usd.forEach((v, i) => {
        row.getCell(19 + i).value = v; // cols 19..30
      });
    }
    row.commit();
  }

  // ── Allocation sheet ───────────────────────────────────────────────────────
  const wa = wb.addWorksheet(ALLOC_SHEET);
  for (const r of allocRows) {
    const row = wa.getRow(r.rowNum);
    if (r.siteLabel) row.getCell(1).value = r.siteLabel;
    if (r.metric) row.getCell(2).value = r.metric;
    if (r.usd) {
      r.usd.forEach((v, i) => {
        row.getCell(3 + i).value = v; // cols 3..14
      });
    }
    row.commit();
  }

  const ab = await wb.xlsx.writeBuffer();
  return Buffer.from(ab as ArrayBuffer);
}

/** Build a buffer that has neither Summary nor Alloc sheet (wrong format). */
async function buildWrongSheetFixture(): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.addWorksheet("Sheet1");
  const ab = await wb.xlsx.writeBuffer();
  return Buffer.from(ab as ArrayBuffer);
}

const MONTHS_12 = (base: number) => Array.from({ length: 12 }, (_, i) => base + i);

describe("parseSalescostWorkbook", () => {
  it("SITE 코드를 올바르게 파싱하고 대문자로 정규화함", async () => {
    const buf = await buildFixture(
      [
        { rowNum: 1, header: "Revenue" },
        {
          rowNum: 2,
          code: "site01",          // lowercase → should become SITE01
          category: "시공",
          bizType: "도급",
          name: "SITE01 - 하노이 현장",
          vnd: MONTHS_12(10),
          usd: MONTHS_12(1),
        },
      ],
      [],
    );

    const parsed = await parseSalescostWorkbook(buf, YEAR);
    expect(parsed.year).toBe(YEAR);
    expect(parsed.sites).toHaveLength(1);

    const site = parsed.sites[0];
    expect(site.code).toBe("SITE01");       // normalised to upper
    expect(site.name).toBe("하노이 현장"); // prefix stripped
    expect(site.category).toBe("시공");
    expect(site.bizType).toBe("도급");
  });

  it("섹션 전환: Revenue→COGS→REPAIRING COST ALLOWANCE를 올바르게 분리", async () => {
    const buf = await buildFixture(
      [
        { rowNum: 1, header: "Revenue" },
        { rowNum: 2, code: "SITE01", name: "SITE01 - A현장", vnd: MONTHS_12(100), usd: MONTHS_12(10) },
        { rowNum: 3, header: "COGS" },
        { rowNum: 4, code: "SITE01", name: "SITE01 - A현장", vnd: MONTHS_12(50), usd: MONTHS_12(5) },
        { rowNum: 5, header: "REPAIRING COST ALLOWANCE" },
        { rowNum: 6, code: "SITE01", name: "SITE01 - A현장", vnd: MONTHS_12(20) },
      ],
      [],
    );

    const parsed = await parseSalescostWorkbook(buf, YEAR);
    // Only one site
    expect(parsed.sites).toHaveLength(1);

    const revenueAmts = parsed.amounts.filter(
      (a) => a.code === "SITE01" && a.metric === "revenue",
    );
    const cogsAmts = parsed.amounts.filter(
      (a) => a.code === "SITE01" && a.metric === "cogs",
    );
    const repairAmts = parsed.amounts.filter(
      (a) => a.code === "SITE01" && a.metric === "repair_allowance",
    );

    expect(revenueAmts).toHaveLength(12);
    expect(cogsAmts).toHaveLength(12);
    expect(repairAmts).toHaveLength(12); // VND only → 12 rows (usd absent)

    // Revenue month 1: VND=100, USD=10
    const rev1 = revenueAmts.find((a) => a.month === 1);
    expect(rev1?.amountVnd).toBe(100);
    expect(rev1?.amountUsd).toBe(10);

    // Repair month 1: VND=20, USD=null (cols 19..30 not set)
    const rep1 = repairAmts.find((a) => a.month === 1);
    expect(rep1?.amountVnd).toBe(20);
    expect(rep1?.amountUsd).toBeNull();
  });

  it("섹션 외부 행(ER 이후)은 무시됨", async () => {
    const buf = await buildFixture(
      [
        { rowNum: 1, header: "Revenue" },
        { rowNum: 2, code: "SITE02", name: "SITE02 - B현장", vnd: MONTHS_12(1), usd: MONTHS_12(1) },
        { rowNum: 3, header: "ER" },
        // This row is after ER → section=null → skipped
        { rowNum: 4, code: "SITE03", name: "SITE03 - C현장", vnd: MONTHS_12(999), usd: MONTHS_12(999) },
      ],
      [],
    );

    const parsed = await parseSalescostWorkbook(buf, YEAR);
    expect(parsed.sites.map((s) => s.code)).not.toContain("SITE03");
    expect(parsed.amounts.filter((a) => a.code === "SITE03")).toHaveLength(0);
  });

  it("SITE 코드가 없는 행(헤더·합계)은 건너뜀", async () => {
    const buf = await buildFixture(
      [
        { rowNum: 1, header: "Revenue" },
        // 합계 행: col1이 SITE 패턴이 아님
        {
          rowNum: 2,
          code: "합계",
          name: "합계",
          vnd: MONTHS_12(9999),
          usd: MONTHS_12(9999),
        } as SummaryRow,
        // 유효 현장
        { rowNum: 3, code: "SITE01", name: "SITE01 - D현장", vnd: MONTHS_12(10), usd: MONTHS_12(1) },
      ],
      [],
    );

    const parsed = await parseSalescostWorkbook(buf, YEAR);
    expect(parsed.sites.map((s) => s.code)).not.toContain("합계".toUpperCase());
    expect(parsed.sites).toHaveLength(1);
    expect(parsed.sites[0].code).toBe("SITE01");
  });

  it("alloc 시트: 현장원가·본사이체원가·판관비·인원수 metric 파싱", async () => {
    const usd12 = (v: number) => Array.from({ length: 12 }, () => v);
    const buf = await buildFixture(
      [
        { rowNum: 1, header: "Revenue" },
        { rowNum: 2, code: "SITE01", name: "SITE01 - E현장", vnd: MONTHS_12(1), usd: MONTHS_12(1) },
      ],
      [
        { rowNum: 1, siteLabel: "Site 01", metric: "현장원가", usd: usd12(100) },
        { rowNum: 2, metric: "본사이체원가", usd: usd12(20) },
        { rowNum: 3, metric: "판관비", usd: usd12(5) },
        { rowNum: 4, metric: "인원수", usd: usd12(3) },
      ],
    );

    const parsed = await parseSalescostWorkbook(buf, YEAR);
    const allocAmts = (metric: string) =>
      parsed.amounts.filter((a) => a.code === "SITE01" && a.metric === metric);

    expect(allocAmts("site_cost")).toHaveLength(12);
    expect(allocAmts("site_cost")[0].amountUsd).toBe(100);

    expect(allocAmts("hq_transfer")).toHaveLength(12);
    expect(allocAmts("hq_transfer")[0].amountUsd).toBe(20);

    expect(allocAmts("sga")).toHaveLength(12);
    expect(allocAmts("sga")[0].amountUsd).toBe(5);

    expect(allocAmts("employees")).toHaveLength(12);
    expect(allocAmts("employees")[0].amountUsd).toBe(3);
  });

  it("alloc 시트: site가 Summary에 없으면 무시됨", async () => {
    const buf = await buildFixture(
      [
        { rowNum: 1, header: "Revenue" },
        { rowNum: 2, code: "SITE01", name: "SITE01 - F현장", vnd: MONTHS_12(1), usd: MONTHS_12(1) },
      ],
      [
        // SITE99는 Summary에 없음
        { rowNum: 1, siteLabel: "Site 99", metric: "현장원가", usd: Array(12).fill(500) },
      ],
    );

    const parsed = await parseSalescostWorkbook(buf, YEAR);
    expect(parsed.amounts.filter((a) => a.code === "SITE99")).toHaveLength(0);
  });

  it("여러 현장의 sortOrder는 등장 순서대로 부여됨", async () => {
    const buf = await buildFixture(
      [
        { rowNum: 1, header: "Revenue" },
        { rowNum: 2, code: "SITE02", name: "SITE02 - G현장", vnd: MONTHS_12(1), usd: MONTHS_12(1) },
        { rowNum: 3, code: "SITE01", name: "SITE01 - H현장", vnd: MONTHS_12(1), usd: MONTHS_12(1) },
      ],
      [],
    );

    const parsed = await parseSalescostWorkbook(buf, YEAR);
    const [first, second] = parsed.sites;
    expect(first.code).toBe("SITE02");
    expect(first.sortOrder).toBeLessThan(second.sortOrder);
  });

  it("SalescostParseError: Summary 시트가 없으면 에러", async () => {
    const buf = await buildWrongSheetFixture();
    await expect(parseSalescostWorkbook(buf, YEAR)).rejects.toBeInstanceOf(SalescostParseError);
  });

  it("SalescostParseError: ALLOC 시트가 없으면 에러", async () => {
    const wb = new ExcelJS.Workbook();
    wb.addWorksheet(SUMMARY_SHEET);
    // Populate a site so we pass the site-count check and reach the alloc-sheet check
    const ws = wb.getWorksheet(SUMMARY_SHEET)!;
    const row1 = ws.getRow(1);
    row1.getCell(4).value = "Revenue";
    row1.commit();
    const row2 = ws.getRow(2);
    row2.getCell(1).value = "SITE01";
    row2.getCell(4).value = "SITE01 - I현장";
    row2.getCell(5).value = 1;
    row2.getCell(19).value = 1;
    row2.commit();
    // No alloc sheet
    const ab = await wb.xlsx.writeBuffer();
    const buf = Buffer.from(ab as ArrayBuffer);
    await expect(parseSalescostWorkbook(buf, YEAR)).rejects.toBeInstanceOf(SalescostParseError);
  });

  it("시트 순서가 뒤바뀌어도(Alloc → Summary) 배부 데이터가 올바르게 파싱됨", async () => {
    // Build a workbook where the Alloc sheet appears BEFORE Summary
    const wb = new ExcelJS.Workbook();

    // Add Alloc sheet FIRST
    const wa = wb.addWorksheet(ALLOC_SHEET);
    const ar1 = wa.getRow(1);
    ar1.getCell(1).value = "Site 01";
    ar1.getCell(2).value = "현장원가";
    for (let i = 0; i < 12; i++) ar1.getCell(3 + i).value = 50;
    ar1.commit();

    // Add Summary sheet SECOND
    const ws = wb.addWorksheet(SUMMARY_SHEET);
    const sh1 = ws.getRow(1); sh1.getCell(4).value = "Revenue"; sh1.commit();
    const sh2 = ws.getRow(2);
    sh2.getCell(1).value = "SITE01";
    sh2.getCell(4).value = "SITE01 - 역순 테스트";
    sh2.getCell(5).value = 1; // VND month 1
    sh2.getCell(19).value = 1; // USD month 1
    sh2.commit();

    const ab = await wb.xlsx.writeBuffer();
    const buf = Buffer.from(ab as ArrayBuffer);

    const parsed = await parseSalescostWorkbook(buf, YEAR);
    expect(parsed.sites).toHaveLength(1);
    expect(parsed.sites[0].code).toBe("SITE01");

    const allocAmts = parsed.amounts.filter(
      (a) => a.code === "SITE01" && a.metric === "site_cost",
    );
    // All 12 months of 현장원가 should be present despite reversed sheet order
    expect(allocAmts).toHaveLength(12);
    expect(allocAmts[0].amountUsd).toBe(50);
  });

  it("buildSalescostPreview: year·site 수·합계를 올바르게 반환", async () => {
    const usd = (v: number) => Array.from({ length: 12 }, () => v);
    const buf = await buildFixture(
      [
        { rowNum: 1, header: "Revenue" },
        { rowNum: 2, code: "SITE01", name: "SITE01 - J현장", vnd: usd(0), usd: usd(10) },
        { rowNum: 3, header: "COGS" },
        { rowNum: 4, code: "SITE01", name: "SITE01 - J현장", vnd: usd(0), usd: usd(6) },
      ],
      [],
    );

    const parsed = await parseSalescostWorkbook(buf, YEAR);
    const preview = buildSalescostPreview(parsed);

    expect(preview.year).toBe(YEAR);
    expect(preview.siteCount).toBe(1);
    expect(preview.totals.revenueUsd).toBeCloseTo(10 * 12);
    expect(preview.totals.cogsUsd).toBeCloseTo(6 * 12);
  });
});
