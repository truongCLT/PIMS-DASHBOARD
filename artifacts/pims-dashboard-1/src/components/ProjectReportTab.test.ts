import { describe, expect, it } from "vitest";
import { resolveLatestProjectReportMonth } from "./ProjectReportTab";
import { selectProgressReportRow } from "./project-report/ProgressSection";
import { maxSelectableMonth } from "../lib/monthRange";

describe("resolveLatestProjectReportMonth", () => {
  it("prefers the latest month with real progress/revenue actuals over the manually-typed asOfMonth", () => {
    // asOfMonth 자체가 실제 실적이 있는 달과 일치하는 경우 — 어느 쪽이 우선이든 결과는 같다.
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

  it("실적 데이터가 asOfMonth보다 이전 달까지만 있으면 asOfMonth를 무시하고 실적 데이터의 달을 쓴다", () => {
    // 예: Data Entry에서 "Base Month of Record"를 습관적으로 당월(9월)로 적어뒀지만,
    // 실제 실적은 8월까지만 입력된 경우 — 9월(마감 전) 실적을 기준월로 써서 계획 데이터가 섞이면 안 된다.
    expect(
      resolveLatestProjectReportMonth({
        asOfMonth: "2026-09",
        progress: [
          { year: 2026, month: 8, actualPct: 3, actualCumPct: 68 },
          { year: 2026, month: 9, actualPct: null, actualCumPct: null },
          { year: 2026, month: 12, actualPct: null, actualCumPct: null },
        ],
        revenueActuals: Array(12).fill(null),
      }),
    ).toBe(8);
  });

  it("falls back to the latest month containing a nonzero progress actual (0 doesn't count)", () => {
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
    ).toBe(8);
  });

  it("실제 라이브 데이터 패턴: PIMSVINA sync가 아직 반영 안 된 뒤쪽 달들의 actualCumPct가 마지막 실제 달과 " +
    "동일하게 '얼어붙어' 반복돼도(actualPct=0), 그 얼어붙은 누계값에 속지 않고 진짜 마지막 실적 달을 찾는다", () => {
    expect(
      resolveLatestProjectReportMonth({
        asOfMonth: "2026-09",
        progress: [
          { year: 2026, month: 7, actualPct: 5.5384, actualCumPct: 53.5 },
          { year: 2026, month: 8, actualPct: 5.642, actualCumPct: 59.1 },
          { year: 2026, month: 9, actualPct: 0, actualCumPct: 59.1 },
          { year: 2026, month: 10, actualPct: null, actualCumPct: 59.1 },
          { year: 2026, month: 11, actualPct: 0, actualCumPct: 59.1 },
          { year: 2026, month: 12, actualPct: 0, actualCumPct: 59.1 },
        ],
        revenueActuals: Array(12).fill(null),
      }),
    ).toBe(8);
  });

  it("uses revenue and then the latest plan row only when no progress actual exists", () => {
    expect(
      resolveLatestProjectReportMonth({
        asOfMonth: null,
        progress: [{ year: 2026, month: 12, actualPct: null, actualCumPct: null }],
        revenueActuals: [10, 20, null, null],
      }),
    ).toBe(2);
    // 실적 데이터도, asOfMonth도 없으면 "달력 기준 직전월"(당월 제외)이 기본값이다 — 실적 없는
    // plan 전용 행(12월)의 달을 임의로 쓰지 않는다.
    expect(
      resolveLatestProjectReportMonth({
        asOfMonth: null,
        progress: [{ year: 2026, month: 12, actualPct: null, actualCumPct: null }],
        revenueActuals: Array(12).fill(null),
      }),
    ).toBe(maxSelectableMonth());
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