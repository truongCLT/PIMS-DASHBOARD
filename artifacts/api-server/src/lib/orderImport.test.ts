import { describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import { readFile } from "node:fs/promises";
import {
  buildOrderPreview,
  buildOrderTemplateWorkbook,
  buildOrderWorkbook,
  normalizeOrderSnapshot,
  OrderImportError,
  parseOrderWorkbook,
  requireRestorableOrderSnapshot,
} from "./orderImport";

async function workbook(options: { cachedFormula?: boolean; wrongTotal?: boolean } = {}) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Sheet1");
  ws.getCell("A2").value = "■ 수주계획";
  ws.getCell("D3").value = "(단위 : K USD)";
  ws.getCell("G3").value = "기준월";
  ws.getCell("H3").value = 8;
  ws.getCell("A5").value = "PJ명";
  ws.getCell("A6").value = "테스트 공사";
  ws.getCell("B6").value = options.cachedFormula === false
    ? { formula: "100*50%" }
    : { formula: "100*50%", result: 50 };
  ws.getCell("C6").value = new Date("2026-06-30T00:00:00");
  ws.getCell("D6").value = 30;
  ws.getCell("E6").value = new Date("2026-09-30T00:00:00");
  ws.getCell("A7").value = "합계";
  ws.getCell("B7").value = { formula: "SUM(B6:B6)", result: options.wrongTotal ? 51 : 50 };
  ws.getCell("D7").value = { formula: "SUM(D6:D6)", result: 30 };
  return Buffer.from(await wb.xlsx.writeBuffer());
}

describe("order workbook parsing", () => {
  it("validates the attached formula sample and its detail totals", async () => {
    const samplePath = new URL(
      "../../../../attached_assets/수주_계획_및_실적___202608_1788932110474.xlsx",
      import.meta.url,
    );
    const parsed = await parseOrderWorkbook(await readFile(samplePath), 2026);

    expect(buildOrderPreview(parsed)).toMatchObject({
      projectCount: 7,
      referenceMonth: 8,
    });
    expect(parsed.totals.plan).toBe(139957);
    expect(parsed.totals.actual).toBeCloseTo(210626.328, 6);
    expect(parsed.entries[0]).toMatchObject({
      projectName: "B1CC4 공사",
      planAmount: 61211,
      planDate: "2026-06-30",
    });
  });

  it("reads cached formula results and validates totals", async () => {
    const parsed = await parseOrderWorkbook(await workbook(), 2026);
    expect(parsed.referenceMonth).toBe(8);
    expect(parsed.entries[0].planAmount).toBe(50);
    expect(parsed.totals).toEqual({ plan: 50, actual: 30 });
  });

  it("rejects formulas without a cached result", async () => {
    await expect(parseOrderWorkbook(await workbook({ cachedFormula: false }), 2026))
      .rejects.toThrow(OrderImportError);
  });

  it("rejects detail and total mismatches", async () => {
    await expect(parseOrderWorkbook(await workbook({ wrongTotal: true }), 2026))
      .rejects.toThrow("일치하지 않습니다");
  });

  it("round-trips current rows through download and preview without drift", async () => {
    const currentRows = [
      {
        referenceMonth: 8,
        projectName: "A 공사",
        planAmount: 50.25,
        planDate: "2026-06-30",
        actualAmount: null,
        actualDate: null,
      },
      {
        referenceMonth: 8,
        projectName: "B 공사",
        planAmount: null,
        planDate: null,
        actualAmount: 30.125,
        actualDate: "2026-09-30",
      },
    ];

    const parsed = await parseOrderWorkbook(
      await buildOrderWorkbook(currentRows, 2026),
      2026,
    );

    expect(buildOrderPreview(parsed)).toMatchObject({
      projectCount: currentRows.length,
      referenceMonth: 8,
      totals: { plan: 50.25, actual: 30.125 },
    });
    expect(parsed.entries).toEqual(
      currentRows.map(({ referenceMonth: _referenceMonth, ...entry }) => entry),
    );
  });
});

describe("order rollback snapshots", () => {
  it("preserves the prior reference month and supports legacy snapshots", () => {
    const entries = [{ projectName: "A", planAmount: 1, planDate: "2026-01-01", actualAmount: null, actualDate: null }];
    expect(normalizeOrderSnapshot({ referenceMonth: 7, entries }, 9).referenceMonth).toBe(7);
    expect(normalizeOrderSnapshot(entries, 9)).toEqual({ referenceMonth: 9, entries });
  });

  it("continues to reject reverting the first import to an empty state", () => {
    expect(() => requireRestorableOrderSnapshot({ referenceMonth: 8, entries: [] }, 8))
      .toThrow("이전 수주 데이터가 없어 되돌릴 수 없습니다.");
  });
});
describe("order upload template", () => {
  it.each(["ko", "en", "vi"] as const)("is accepted by the parser once a project row is filled in (%s)", async (lang) => {
    const blank = await buildOrderTemplateWorkbook(9, lang);
    await expect(parseOrderWorkbook(blank, 2026)).rejects.toThrow("반영할 프로젝트가 없습니다.");

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(blank as unknown as ExcelJS.Buffer);
    const ws = wb.worksheets[0];
    const totalRow = [...Array(ws.rowCount)].map((_, i) => i + 1).find((r) => ["합계", "Total", "Tổng cộng"].includes(ws.getCell(r, 1).text))!;
    ws.getCell("A6").value = "K8CT1 모델하우스";
    ws.getCell("B6").value = 1000;
    ws.getCell("C6").value = new Date("2026-03-31T00:00:00Z");
    ws.getCell("D6").value = 1193.8;
    ws.getCell("E6").value = new Date("2026-04-30T00:00:00Z");
    // Excel이 저장 시 다시 계산해 주는 합계 결과를 흉내 낸다
    const formula = (f: ExcelJS.CellValue) => (f as ExcelJS.CellFormulaValue).formula;
    ws.getCell(totalRow, 2).value = { formula: formula(ws.getCell(totalRow, 2).value), result: 1000 } as ExcelJS.CellFormulaValue;
    ws.getCell(totalRow, 4).value = { formula: formula(ws.getCell(totalRow, 4).value), result: 1193.8 } as ExcelJS.CellFormulaValue;

    const parsed = await parseOrderWorkbook(Buffer.from(await wb.xlsx.writeBuffer()), 2026);
    expect(parsed.referenceMonth).toBe(9);
    expect(parsed.entries).toEqual([
      { projectName: "K8CT1 모델하우스", planAmount: 1000, planDate: "2026-03-31", actualAmount: 1193.8, actualDate: "2026-04-30" },
    ]);
  });
});
