import { describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import { normalizeOrderSnapshot, OrderImportError, parseOrderWorkbook } from "./orderImport";

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
});

describe("order rollback snapshots", () => {
  it("preserves the prior reference month and supports legacy snapshots", () => {
    const entries = [{ projectName: "A", planAmount: 1, planDate: "2026-01-01", actualAmount: null, actualDate: null }];
    expect(normalizeOrderSnapshot({ referenceMonth: 7, entries }, 9).referenceMonth).toBe(7);
    expect(normalizeOrderSnapshot(entries, 9)).toEqual({ referenceMonth: 9, entries });
  });
});