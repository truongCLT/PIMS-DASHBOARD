import { describe, expect, it } from "vitest";
import {
  assertMonthlyProfitConsistency,
  companyMonthlyProfitFromPnl,
  type ReconciliationProject,
} from "./mgmtreportReconciliation";
import fixture from "./fixtures/mgmtreport-reconciliation.json";
import {
  aggregatePnlRows,
  applyProjectMonthlyRows,
  serializePnlSummary,
} from "../../../api-server/src/lib/mgmtreportAggregation";

const projects = fixture.projects as ReconciliationProject[];

const classifyDivision = (name: string) =>
  name.includes("기본 상태") ? "construction" : "service";

function buildProjectResponseFromMonthlyRows() {
  const projectsById = new Map(
    fixture.projects.map((project) => [
      project.id,
      {
        name: project.name,
        isGroup: project.isGroup ?? false,
        status: project.status,
        businessType: project.businessType,
        revenuePlan: Array(12).fill(0) as number[],
        revenueActual: Array(12).fill(0) as number[],
        cogsPlan: Array(12).fill(0) as number[],
        cogsActual: Array(12).fill(0) as number[],
      },
    ]),
  );
  const monthlyRows = fixture.projects.flatMap((project) =>
    (["revenueActual", "cogsActual"] as const).flatMap((field) =>
      project[field].map((amountUsd, monthIndex) => ({
        projectId: project.id,
        month: monthIndex + 1,
        scenario: "actual",
        metric: field === "revenueActual" ? "revenue" : "cogs",
        amountUsd,
      })),
    ),
  );
  applyProjectMonthlyRows(projectsById, monthlyRows);
  return [...projectsById.values()];
}

function buildCompanyResponseFromPnlRows(
  source: { revenue: number[]; grossProfit: number[] },
) {
  const pnlRows = [
    ...source.revenue.map((amountUsd, monthIndex) => ({
      year: 2026,
      lineCode: "revenue",
      lineLabel: "매출",
      scenario: "actual",
      month: monthIndex + 1,
      amountUsd,
    })),
    ...source.grossProfit.map((amountUsd, monthIndex) => ({
      year: 2026,
      lineCode: "gross_profit",
      lineLabel: "매출이익",
      scenario: "actual",
      month: monthIndex + 1,
      amountUsd,
    })),
  ];
  const [summary] = serializePnlSummary(aggregatePnlRows(pnlRows));
  const revenue = summary.lines.find((line) => line.code === "revenue")!;
  const grossProfit = summary.lines.find(
    (line) => line.code === "gross_profit",
  )!;
  return companyMonthlyProfitFromPnl({
    revenue: revenue.actual,
    grossProfit: grossProfit.actual,
  });
}

describe("월별 프로젝트·회사 손익 정합성", () => {
  it("그룹 행을 제외한 1~12월 매출·원가·매출이익이 모두 일치한다", () => {
    const projectResponse = buildProjectResponseFromMonthlyRows();
    const company = buildCompanyResponseFromPnlRows(fixture.companyPnl.all);

    expect(() =>
      assertMonthlyProfitConsistency({ projects: projectResponse, company }),
    ).not.toThrow();
    expect(company.revenue).toHaveLength(12);
    expect(company.cogs).toHaveLength(12);
    expect(company.grossProfit).toHaveLength(12);
  });

  it("허용 반올림 범위 안의 차이는 통과한다", () => {
    const company = companyMonthlyProfitFromPnl({
      revenue: [...fixture.companyPnl.all.revenue],
      grossProfit: [...fixture.companyPnl.all.grossProfit],
    });
    company.revenue[0] += 0.009;

    expect(() =>
      assertMonthlyProfitConsistency({ projects, company, tolerance: 0.01 }),
    ).not.toThrow();
  });

  it("허용 범위를 넘으면 월·항목·양쪽 금액·차이를 알려준다", () => {
    const company = companyMonthlyProfitFromPnl({
      revenue: [...fixture.companyPnl.all.revenue],
      grossProfit: [...fixture.companyPnl.all.grossProfit],
    });
    company.cogs[6] += 0.02;

    expect(() =>
      assertMonthlyProfitConsistency({ projects, company, tolerance: 0.01 }),
    ).toThrow(
      "7월 원가: 프로젝트 63, 회사 63.02, 차이 -0.02",
    );
  });

  it("부문과 프로젝트 상태 필터를 같은 기준으로 적용한다", () => {
    const filter = { division: "construction", status: "ongoing" as const };
    const projectResponse = buildProjectResponseFromMonthlyRows();
    const company = buildCompanyResponseFromPnlRows(
      fixture.companyPnl.constructionOngoing,
    );

    expect(company.revenue[0]).toBe(12);
    expect(company.cogs[11]).toBe(84);
    expect(() =>
      assertMonthlyProfitConsistency({
        projects: projectResponse,
        company,
        filter,
        classifyDivision,
      }),
    ).not.toThrow();
  });
});