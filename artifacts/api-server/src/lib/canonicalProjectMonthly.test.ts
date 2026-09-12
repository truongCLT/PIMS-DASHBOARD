import { describe, expect, it } from "vitest";
import {
  buildCanonicalProjectMonthly,
  buildProjectMonthlyReadModel,
} from "./canonicalProjectMonthly";

describe("project monthly canonical source", () => {
  it("keeps earlier project-detail months and later management-report months without loss", () => {
    const result = buildCanonicalProjectMonthly({
      projectDetailSales: Array.from({ length: 7 }, (_, index) => ({
        year: 2026,
        month: index + 1,
        plan: (index + 1) * 10,
        actual: (index + 1) * 9,
      })),
      projectDetailCogs: Array.from({ length: 7 }, (_, index) => ({
        year: 2026,
        month: index + 1,
        acctCogs: (index + 1) * 6,
        wipCogs: null,
      })),
      managementReportMonthly: Array.from({ length: 5 }, (_, index) => {
        const month = index + 8;
        return [
          { year: 2026, month, scenario: "actual", metric: "revenue", amountUsd: month * 9 },
          { year: 2026, month, scenario: "actual", metric: "cogs", amountUsd: month * 6 },
        ];
      }).flat(),
    });

    expect(result.salesMonthly.map((row) => row.month)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12,
    ]);
    expect(result.cogsMonthly.map((row) => row.month)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12,
    ]);
  });

  it("uses an existing management-report row as authoritative, including zero", () => {
    const result = buildCanonicalProjectMonthly({
      projectDetailSales: [
        { year: 2026, month: 7, plan: 120, actual: 100 },
      ],
      projectDetailCogs: [
        { year: 2026, month: 7, acctCogs: 70, wipCogs: 75 },
      ],
      managementReportMonthly: [
        { year: 2026, month: 7, scenario: "plan", metric: "revenue", amountUsd: 0 },
        { year: 2026, month: 7, scenario: "actual", metric: "revenue", amountUsd: 12.3456 },
        { year: 2026, month: 7, scenario: "actual", metric: "cogs", amountUsd: 0 },
      ],
    });

    expect(result.salesMonthly[0]).toMatchObject({ plan: 0, actual: 12.35 });
    expect(result.cogsMonthly[0]).toMatchObject({
      acctCogs: 0,
      wipCogs: 75,
    });
  });

  it("keeps editable project-detail rows raw when display rows are overlaid", () => {
    const result = buildProjectMonthlyReadModel({
      projectDetailSales: [
        { year: 2026, month: 6, plan: "200", actual: "100" },
      ],
      projectDetailCogs: [
        { year: 2026, month: 6, acctCogs: "80", wipCogs: "75" },
      ],
      managementReportMonthly: [
        { year: 2026, month: 6, scenario: "actual", metric: "revenue", amountUsd: 300 },
        { year: 2026, month: 6, scenario: "actual", metric: "cogs", amountUsd: 240 },
      ],
    });

    expect(result.salesMonthly[0]).toMatchObject({ plan: 200, actual: 100 });
    expect(result.cogsMonthly[0]).toMatchObject({ acctCogs: 80, wipCogs: 75 });
    expect(result.canonicalSalesMonthly[0]).toMatchObject({ plan: 200, actual: 300 });
    expect(result.canonicalCogsMonthly[0]).toMatchObject({ acctCogs: 240, wipCogs: 75 });
  });
});