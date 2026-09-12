import { describe, expect, it } from "vitest";
import {
  defaultDeriveOptions,
  deriveDashboardData,
  getActualThroughMonth,
} from "./mgmtreportData";

const monthly = Array.from({ length: 12 }, (_, index) => index + 1);
const summary = {
  year: 2026,
  lines: [
    {
      code: "revenue",
      label: "매출",
      plan: monthly,
      actual: monthly,
      planTotal: 78,
      actualTotal: 78,
    },
    {
      code: "gross_profit",
      label: "매출이익",
      plan: monthly,
      actual: monthly,
      planTotal: 78,
      actualTotal: 78,
    },
  ],
};

describe("today-based actual and forecast cutoff", () => {
  it("uses the previous month for the current report year", () => {
    expect(getActualThroughMonth(2026, new Date(2026, 8, 12))).toBe(8);
  });

  it("treats a past year as all actual and a future year as all forecast", () => {
    const asOfDate = new Date(2026, 8, 12);
    expect(getActualThroughMonth(2025, asOfDate)).toBe(12);
    expect(getActualThroughMonth(2027, asOfDate)).toBe(0);
  });

  it("does not use the filter end month for sales and profit classification", () => {
    const data = deriveDashboardData(summary, {
      ...defaultDeriveOptions(3),
      from: 1,
      to: 3,
      asOfDate: new Date(2026, 8, 12),
    });

    expect(data.salesData.map((row) => row.isForecast)).toEqual([
      false, false, false, false, false, false, false, false,
      true, true, true, true,
    ]);
    expect(data.profitData.map((row) => row.isForecast)).toEqual([
      false, false, false, false, false, false, false, false,
      true, true, true, true,
    ]);
    expect(data.salesData[7]?.rate).not.toBeNull();
    expect(data.salesData[8]?.rate).toBeNull();
  });

  it("treats every month as forecast during January", () => {
    const data = deriveDashboardData(summary, {
      ...defaultDeriveOptions(12),
      asOfDate: new Date(2026, 0, 15),
    });

    expect(data.salesData.every((row) => row.isForecast)).toBe(true);
    expect(data.profitData.every((row) => row.isForecast)).toBe(true);
  });
});