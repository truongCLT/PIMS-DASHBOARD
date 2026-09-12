import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { AggregatedPnlLine } from "./mgmtreportAggregation";
import {
  applyOrderRowsToPnlSummary,
  classifyOrderActual,
} from "./orderSummaryOverlay";

const pnlLine = (
  code: string,
  planValue: number,
  actualValue: number,
): AggregatedPnlLine => ({
  code,
  label: code,
  plan: [planValue, ...Array(11).fill(0)],
  actual: [actualValue, ...Array(11).fill(0)],
  planTotalOverride: null,
  actualTotalOverride: null,
});

describe("order data isolation from management-report replacement", () => {
  it("classifies actuals using the earlier of selected and imported reference months", () => {
    const row = {
      year: 2026,
      referenceMonth: 8,
      actualAmount: 100,
      actualDate: "2026-09-30",
    };
    expect(classifyOrderActual(row, 10)).toBe("forecast");
    expect(
      classifyOrderActual({ ...row, actualDate: "2026-07-31" }, 6),
    ).toBe("forecast");
    expect(
      classifyOrderActual({ ...row, actualDate: "2026-07-31" }, 10),
    ).toBe("actual");
    expect(
      classifyOrderActual({ ...row, actualDate: "2027-01-31" }, 10),
    ).toBe("none");
  });

  it("keeps management-report apply and restore ownership away from order tables", () => {
    const source = readFileSync(
      "artifacts/api-server/src/lib/mgmtreportImport.ts",
      "utf8",
    );

    expect(source).not.toContain("orderEntriesTable");
    expect(source).not.toContain("orderImportHistoryTable");
    expect(source).not.toContain("order_entries");
    expect(source).not.toContain("order_import_history");
  });

  it("replaces only new_orders and isolates dedicated order rows by year", () => {
    const grossProfit2026 = pnlLine("gross_profit", 900, 800);
    const orderProfit2026 = pnlLine("order_profit", 90, 80);
    const oldMrOrders2026 = pnlLine("new_orders", 999, 888);
    const grossProfitBefore = structuredClone(grossProfit2026);
    const orderProfitBefore = structuredClone(orderProfit2026);
    const linesByYear = new Map([
      [
        2026,
        new Map([
          ["gross_profit", grossProfit2026],
          ["order_profit", orderProfit2026],
          ["new_orders", oldMrOrders2026],
        ]),
      ],
      [2027, new Map([["gross_profit", pnlLine("gross_profit", 700, 600)]])],
    ]);

    applyOrderRowsToPnlSummary(linesByYear, [
      {
        year: 2026,
        referenceMonth: 8,
        planAmount: 100,
        planDate: "2026-06-30",
        actualAmount: 40,
        actualDate: "2026-07-31",
      },
      {
        year: 2026,
        referenceMonth: 8,
        planAmount: 50,
        planDate: "2026-09-30",
        actualAmount: 30,
        actualDate: "2026-10-31",
      },
      {
        year: 2027,
        referenceMonth: 3,
        planAmount: 25,
        planDate: "2027-02-28",
        actualAmount: 10,
        actualDate: "2027-02-28",
      },
    ]);

    expect(linesByYear.get(2026)?.get("gross_profit")).toEqual(grossProfitBefore);
    expect(linesByYear.get(2026)?.get("order_profit")).toEqual(orderProfitBefore);
    expect(linesByYear.get(2026)?.get("new_orders")).toMatchObject({
      plan: [0, 0, 0, 0, 0, 100, 0, 0, 50, 0, 0, 0],
      actual: [0, 0, 0, 0, 0, 0, 40, 0, 0, 0, 0, 0],
      actualTotalOverride: 70,
    });
    expect(linesByYear.get(2027)?.get("new_orders")).toMatchObject({
      plan: [0, 25, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      actual: [0, 10, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      actualTotalOverride: 10,
    });
  });
});