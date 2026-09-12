export const roundMgmtreportAmount = (value: number) =>
  Math.round(value * 100) / 100;

export interface PnlSourceRow {
  year: number;
  lineCode: string;
  lineLabel: string;
  scenario: string;
  month: number | null;
  amountUsd: string | number;
}

export interface AggregatedPnlLine {
  code: string;
  label: string;
  plan: number[];
  actual: number[];
  planTotalOverride: number | null;
  actualTotalOverride: number | null;
}

export function aggregatePnlRows(rows: PnlSourceRow[]) {
  const linesByYear = new Map<number, Map<string, AggregatedPnlLine>>();
  for (const row of rows) {
    let lines = linesByYear.get(row.year);
    if (!lines) {
      lines = new Map();
      linesByYear.set(row.year, lines);
    }
    let line = lines.get(row.lineCode);
    if (!line) {
      line = {
        code: row.lineCode,
        label: row.lineLabel,
        plan: Array(12).fill(0),
        actual: Array(12).fill(0),
        planTotalOverride: null,
        actualTotalOverride: null,
      };
      lines.set(row.lineCode, line);
    }
    const value = Number(row.amountUsd);
    if (row.month == null) {
      if (row.scenario === "plan") line.planTotalOverride = value;
      else line.actualTotalOverride = value;
    } else if (row.scenario === "plan") {
      line.plan[row.month - 1] = roundMgmtreportAmount(value);
    } else {
      line.actual[row.month - 1] = roundMgmtreportAmount(value);
    }
  }
  return linesByYear;
}

export function serializePnlSummary(
  linesByYear: Map<number, Map<string, AggregatedPnlLine>>,
) {
  return [...linesByYear.entries()]
    .sort(([a], [b]) => a - b)
    .map(([year, lines]) => ({
      year,
      unit: "천 USD" as const,
      lines: [...lines.values()].map((line) => ({
        code: line.code,
        label: line.label,
        plan: line.plan,
        actual: line.actual,
        planTotal: roundMgmtreportAmount(
          line.planTotalOverride ??
            line.plan.reduce((total, value) => total + value, 0),
        ),
        actualTotal: roundMgmtreportAmount(
          line.actualTotalOverride ??
            line.actual.reduce((total, value) => total + value, 0),
        ),
      })),
    }));
}

export interface ProjectMonthlyTarget {
  revenuePlan: number[];
  revenueActual: number[];
  cogsPlan: number[];
  cogsActual: number[];
}

export interface ProjectMonthlySourceRow {
  projectId: number;
  month: number;
  scenario: string;
  metric: string;
  amountUsd: string | number;
}

export function applyProjectMonthlyRows<T extends ProjectMonthlyTarget>(
  projectsById: Map<number, T>,
  rows: ProjectMonthlySourceRow[],
): void {
  for (const row of rows) {
    const project = projectsById.get(row.projectId);
    if (!project) continue;
    const value = roundMgmtreportAmount(Number(row.amountUsd));
    const target =
      row.metric === "revenue"
        ? row.scenario === "plan"
          ? project.revenuePlan
          : project.revenueActual
        : row.scenario === "plan"
          ? project.cogsPlan
          : project.cogsActual;
    target[row.month - 1] = value;
  }
}