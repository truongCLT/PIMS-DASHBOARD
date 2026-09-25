import { describe, expect, it } from "vitest";
import type { ProjectDetailProgressPoint } from "@workspace/api-client-react";
import { calculateProgressPlanCumulative } from "./ProjectDataEntryTab";

describe("공정 누계 계획률", () => {
  it("월 계획률을 합산해도 소수점 첫째 자리를 넘는 오차를 표시하지 않는다", () => {
    const rows = [
      { year: 2026, month: 1, planPct: 0.1 },
      { year: 2026, month: 2, planPct: 0.2 },
      { year: 2026, month: 3, planPct: 10.4 },
    ] as ProjectDetailProgressPoint[];

    expect(
      calculateProgressPlanCumulative(rows).map((row) => row.planCumPct),
    ).toEqual([0.1, 0.3, 10.7]);
  });

  it("입력 순서와 관계없이 연월 순서로 누계를 계산한다", () => {
    const rows = [
      { year: 2026, month: 2, planPct: 0.2 },
      { year: 2026, month: 1, planPct: 0.1 },
    ] as ProjectDetailProgressPoint[];

    expect(
      calculateProgressPlanCumulative(rows).map((row) => row.planCumPct),
    ).toEqual([0.3, 0.1]);
  });
});

describe("공정 누계 실적률", () => {
  it("월 실적률도 계획과 동일하게 자동 누적된다", () => {
    const rows = [
      { year: 2026, month: 1, actualPct: 0.1 },
      { year: 2026, month: 2, actualPct: 0.2 },
      { year: 2026, month: 3, actualPct: 10.4 },
    ] as ProjectDetailProgressPoint[];

    expect(
      calculateProgressPlanCumulative(rows).map((row) => row.actualCumPct),
    ).toEqual([0.1, 0.3, 10.7]);
  });

  it("이관 프로젝트처럼 중간에 '이관 이전 누계'를 월간 실적란에 넣으면, 이후 달의 누계 실적에 이어서 반영된다", () => {
    const rows = [
      { year: 2025, month: 1, actualPct: 0 },
      { year: 2025, month: 4, actualPct: 64.7 }, // 이관 이전 누계를 월간 실적에 일회성으로 입력
      { year: 2025, month: 5, actualPct: 0.1438 },
      { year: 2025, month: 6, actualPct: 0.0932 },
    ] as ProjectDetailProgressPoint[];

    // 매 단계마다 소수점 첫째 자리로 반올림하므로 64.7+0.1438=64.8438 -> 64.8, 64.8+0.0932=64.8932 -> 64.9
    expect(
      calculateProgressPlanCumulative(rows).map((row) => row.actualCumPct),
    ).toEqual([0, 64.7, 64.8, 64.9]);
  });
});