export type ProjectStatus = "ongoing" | "closed";

export interface ReconciliationProject {
  name: string;
  isGroup?: boolean;
  status?: string | null;
  businessType?: string | null;
  revenuePlan: number[];
  revenueActual: number[];
  cogsPlan: number[];
  cogsActual: number[];
}

export interface ProjectProfitFilter {
  projectName?: string | null;
  division?: string | null;
  status?: ProjectStatus | null;
}

export interface MonthlyProfitTotals {
  revenue: number[];
  cogs: number[];
  grossProfit: number[];
}

export interface MonthlyProfitDifference {
  month: number;
  metric: keyof MonthlyProfitTotals;
  projectTotal: number;
  companyTotal: number;
  difference: number;
}

const MONTHS = 12;

export function companyMonthlyProfitFromPnl({
  revenue,
  grossProfit,
}: {
  revenue: number[];
  grossProfit: number[];
}): MonthlyProfitTotals {
  const normalizedRevenue = Array.from(
    { length: MONTHS },
    (_, index) => revenue[index] ?? 0,
  );
  const normalizedGrossProfit = Array.from(
    { length: MONTHS },
    (_, index) => grossProfit[index] ?? 0,
  );
  return {
    revenue: normalizedRevenue,
    cogs: normalizedRevenue.map(
      (value, index) => value - normalizedGrossProfit[index],
    ),
    grossProfit: normalizedGrossProfit,
  };
}

export function filterProfitProjects<T extends ReconciliationProject>(
  projects: T[],
  filter: ProjectProfitFilter = {},
  classifyDivision: (name: string) => string = () => "",
): T[] {
  return projects.filter((project) => {
    if (project.isGroup) return false;
    if (filter.projectName) return project.name === filter.projectName;
    if (
      filter.division &&
      (project.businessType ?? classifyDivision(project.name)) !== filter.division
    ) {
      return false;
    }
    return filter.status == null || (project.status ?? "ongoing") === filter.status;
  });
}

export function sumProjectMonths<T extends ReconciliationProject>(
  projects: T[],
  field: "revenuePlan" | "revenueActual" | "cogsPlan" | "cogsActual",
): number[] {
  return Array.from({ length: MONTHS }, (_, monthIndex) =>
    projects.reduce(
      (total, project) => total + (project[field][monthIndex] ?? 0),
      0,
    ),
  );
}

export function aggregateProjectMonthlyProfit<
  T extends ReconciliationProject,
>(
  projects: T[],
  filter: ProjectProfitFilter = {},
  classifyDivision?: (name: string) => string,
): MonthlyProfitTotals {
  const scoped = filterProfitProjects(projects, filter, classifyDivision);
  const revenue = sumProjectMonths(scoped, "revenueActual");
  const cogs = sumProjectMonths(scoped, "cogsActual");
  return {
    revenue,
    cogs,
    grossProfit: revenue.map((value, index) => value - cogs[index]),
  };
}

export function findMonthlyProfitDifferences({
  projects,
  company,
  filter,
  classifyDivision,
  tolerance = 0.01,
}: {
  projects: ReconciliationProject[];
  company: MonthlyProfitTotals;
  filter?: ProjectProfitFilter;
  classifyDivision?: (name: string) => string;
  tolerance?: number;
}): MonthlyProfitDifference[] {
  const projectTotals = aggregateProjectMonthlyProfit(
    projects,
    filter,
    classifyDivision,
  );
  const differences: MonthlyProfitDifference[] = [];

  for (let monthIndex = 0; monthIndex < MONTHS; monthIndex += 1) {
    for (const metric of ["revenue", "cogs", "grossProfit"] as const) {
      const projectTotal = projectTotals[metric][monthIndex] ?? 0;
      const companyTotal = company[metric][monthIndex] ?? 0;
      const difference = projectTotal - companyTotal;
      if (Math.abs(difference) > tolerance) {
        differences.push({
          month: monthIndex + 1,
          metric,
          projectTotal,
          companyTotal,
          difference,
        });
      }
    }
  }
  return differences;
}

export function assertMonthlyProfitConsistency(
  args: Parameters<typeof findMonthlyProfitDifferences>[0],
): void {
  const differences = findMonthlyProfitDifferences(args);
  if (differences.length === 0) return;

  const metricLabel: Record<keyof MonthlyProfitTotals, string> = {
    revenue: "매출",
    cogs: "원가",
    grossProfit: "매출이익",
  };
  const displayAmount = (value: number) =>
    Number(value.toFixed(6)).toLocaleString("en-US", {
      maximumFractionDigits: 6,
    });
  const detail = differences
    .map(
      ({ month, metric, projectTotal, companyTotal, difference }) =>
        `${month}월 ${metricLabel[metric]}: 프로젝트 ${displayAmount(projectTotal)}, 회사 ${displayAmount(companyTotal)}, 차이 ${displayAmount(difference)}`,
    )
    .join("\n");
  throw new Error(`월별 손익 정합성 검증 실패\n${detail}`);
}