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