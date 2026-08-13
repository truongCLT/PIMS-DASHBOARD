/**
 * KPI 카드 계산 로직 단위 테스트
 * mgmtreportData.ts 내 kpiOf 함수와 동일한 순수 로직을 검증한다.
 */
import { describe, it, expect } from "vitest";

/* ── 테스트 대상 순수 함수 (mgmtreportData.ts와 동일 로직) ── */

function rangeSum(arr: number[], from: number, to: number): number {
  let s = 0;
  for (let i = from - 1; i <= to - 1; i += 1) s += arr[i] ?? 0;
  return s;
}

interface Line {
  plan: number[];
  actual: number[];
  planTotal: number;
  actualTotal: number;
}

function kpiCalc(line: Line, mode: "monthly" | "ytd" | "fullYear", M: number) {
  const plan =
    mode === "monthly" ? line.plan[M - 1]
    : mode === "ytd"   ? rangeSum(line.plan, 1, M)
    :                    line.planTotal;
  const actual =
    mode === "monthly" ? line.actual[M - 1]
    : mode === "ytd"   ? rangeSum(line.actual, 1, M)
    :                    line.actualTotal;
  return { plan, actual };
}

/* ── 테스트 픽스처 ── */

// 1월 100, 2월 200 … 12월 1200
const PLAN_ARR   = Array.from({ length: 12 }, (_, i) => (i + 1) * 100);
// 1월 80,  2월 160 … 12월 960
const ACTUAL_ARR = Array.from({ length: 12 }, (_, i) => (i + 1) * 80);
const PLAN_TOTAL   = 7800; // 1~12월 합계 (실제 planTotal은 별도 계산값일 수 있음)
const ACTUAL_TOTAL = 6240; // 전망 포함 연간 합계

const LINE: Line = {
  plan:        PLAN_ARR,
  actual:      ACTUAL_ARR,
  planTotal:   PLAN_TOTAL,
  actualTotal: ACTUAL_TOTAL,
};

/* ── YTD 누적 모드 ── */
describe("kpiCalc · ytd 모드 (당월 누적)", () => {
  it("M=1: 1월 단독 값과 동일해야 한다", () => {
    const { plan, actual } = kpiCalc(LINE, "ytd", 1);
    expect(plan).toBe(100);
    expect(actual).toBe(80);
  });

  it("M=7: 1~7월 합계여야 한다 (plan 2800, actual 2240)", () => {
    const { plan, actual } = kpiCalc(LINE, "ytd", 7);
    expect(plan).toBe(100 + 200 + 300 + 400 + 500 + 600 + 700); // 2800
    expect(actual).toBe(80 + 160 + 240 + 320 + 400 + 480 + 560); // 2240
  });

  it("M=12: 1~12월 합계 (rangeSum = planTotal에 해당)", () => {
    const { plan, actual } = kpiCalc(LINE, "ytd", 12);
    expect(plan).toBe(rangeSum(PLAN_ARR, 1, 12));
    expect(actual).toBe(rangeSum(ACTUAL_ARR, 1, 12));
  });

  it("monthly 단독(7월)과 ytd(7월)은 달라야 한다", () => {
    const monthly = kpiCalc(LINE, "monthly", 7);
    const ytd     = kpiCalc(LINE, "ytd",     7);
    // monthly=7월 단독(plan 700), ytd=1~7월 합계(plan 2800)
    expect(monthly.plan).toBe(700);
    expect(ytd.plan).toBe(2800);
    expect(ytd.plan).toBeGreaterThan(monthly.plan);
  });
});

/* ── 전체연도 모드 ── */
describe("kpiCalc · fullYear 모드 (연간 합계)", () => {
  it("planTotal / actualTotal을 그대로 반환해야 한다", () => {
    const { plan, actual } = kpiCalc(LINE, "fullYear", 7); // M 값 무관
    expect(plan).toBe(PLAN_TOTAL);
    expect(actual).toBe(ACTUAL_TOTAL);
  });

  it("M값이 달라도 fullYear 결과는 항상 동일해야 한다", () => {
    const r1 = kpiCalc(LINE, "fullYear", 1);
    const r12 = kpiCalc(LINE, "fullYear", 12);
    expect(r1).toEqual(r12);
  });

  it("ytd(M=7)보다 fullYear가 크거나 같아야 한다 (전망 포함)", () => {
    const ytd      = kpiCalc(LINE, "ytd",      7);
    const fullYear = kpiCalc(LINE, "fullYear", 7);
    expect(fullYear.plan).toBeGreaterThan(ytd.plan);
    expect(fullYear.actual).toBeGreaterThan(ytd.actual);
  });
});

/* ── 기간 배지 라벨 로직 ── */
describe("기간 배지 라벨 생성", () => {
  /** KPICards.tsx 내 ytdPeriod 로직 재현 */
  function ytdPeriodLabel(month: number): string {
    return month > 1 ? `1~${month}월` : `${month}월`;
  }

  it("M=1이면 단월 표시", () => expect(ytdPeriodLabel(1)).toBe("1월"));
  it("M=7이면 범위 표시",  () => expect(ytdPeriodLabel(7)).toBe("1~7월"));
  it("M=12이면 전체 표시", () => expect(ytdPeriodLabel(12)).toBe("1~12월"));
});
