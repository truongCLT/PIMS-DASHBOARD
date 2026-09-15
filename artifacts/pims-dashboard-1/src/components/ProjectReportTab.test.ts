import { describe, expect, it } from "vitest";
import { resolveLatestProjectReportMonth } from "./ProjectReportTab";
import { selectProgressReportRow } from "./project-report/ProgressSection";

describe("resolveLatestProjectReportMonth", () => {
  it("uses the data-entry reference month before future plan or forecast months", () => {
    expect(
      resolveLatestProjectReportMonth({
        asOfMonth: "2026-09",
        progress: [
          { year: 2026, month: 9, actualPct: 2, actualCumPct: 73 },
          { year: 2026, month: 12, actualPct: null, actualCumPct: null },
        ],
        revenueActuals: [10, 10, 10, 10, 10, 10, 10, 10, 10, 20, 30, 40],
      }),
    ).toBe(9);
  });

  it("falls back to the latest month containing progress actuals", () => {
    expect(
      resolveLatestProjectReportMonth({
        asOfMonth: null,
        progress: [
          { year: 2026, month: 8, actualPct: 3, actualCumPct: 68 },
          { year: 2026, month: 9, actualPct: 0, actualCumPct: 68 },
          { year: 2026, month: 12, actualPct: null, actualCumPct: null },
        ],
        revenueActuals: Array(12).fill(null),
      }),
    ).toBe(9);
  });

  it("uses revenue and then the latest plan row only when no progress actual exists", () => {
    expect(
      resolveLatestProjectReportMonth({
        asOfMonth: null,
        progress: [{ year: 2026, month: 12, actualPct: null, actualCumPct: null }],
        revenueActuals: [10, 20, null, null],
      }),
    ).toBe(2);
    expect(
      resolveLatestProjectReportMonth({
        asOfMonth: null,
        progress: [{ year: 2026, month: 12, actualPct: null, actualCumPct: null }],
        revenueActuals: Array(12).fill(null),
      }),
    ).toBe(12);
  });
});

describe("selectProgressReportRow", () => {
  it("never falls forward to a future plan row when the reference month has no exact row", () => {
    expect(
      selectProgressReportRow(
        [
          { year: 2026, month: 8, planPct: 1, actualPct: 0.8 },
          { year: 2026, month: 12, planPct: 0.2, actualPct: null },
        ],
        9,
      ),
    ).toMatchObject({ year: 2026, month: 8, actualPct: 0.8 });
  });
});