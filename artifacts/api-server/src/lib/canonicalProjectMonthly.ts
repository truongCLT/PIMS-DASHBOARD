import { roundMgmtreportAmount } from "./mgmtreportAggregation";

export interface ProjectDetailSalesRow {
  year: number;
  month: number;
  plan: string | number | null;
  actual: string | number | null;
}

export interface ProjectDetailCogsRow {
  year: number;
  month: number;
  acctCogs: string | number | null;
  wipCogs: string | number | null;
}

export interface ManagementReportMonthlyRow {
  year: number;
  month: number;
  scenario: string;
  metric: string;
  amountUsd: string | number;
}

const numberOrNull = (value: string | number | null | undefined) => {
  if (value == null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

/**
 * Canonical read model for project monthly actuals.
 *
 * Management-report rows are authoritative where a row exists, including a
 * legitimate zero. Project-detail rows remain as a month-by-month fallback so
 * ERP sync/data-entry history outside the imported report period is preserved.
 * Writers remain separate: management-report Excel writes mr_monthly, while
 * ERP sync and project data entry write pd_sales_monthly/pd_cogs_monthly.
 */
export function buildCanonicalProjectMonthly({
  projectDetailSales,
  projectDetailCogs,
  managementReportMonthly,
}: {
  projectDetailSales: ProjectDetailSalesRow[];
  projectDetailCogs: ProjectDetailCogsRow[];
  managementReportMonthly: ManagementReportMonthlyRow[];
}) {
  const sales = new Map<
    string,
    { year: number; month: number; plan: number | null; actual: number | null }
  >();
  const cogs = new Map<
    string,
    {
      year: number;
      month: number;
      acctCogs: number | null;
      wipCogs: number | null;
    }
  >();

  for (const row of projectDetailSales) {
    sales.set(`${row.year}-${row.month}`, {
      year: row.year,
      month: row.month,
      plan: numberOrNull(row.plan),
      actual: numberOrNull(row.actual),
    });
  }
  for (const row of projectDetailCogs) {
    cogs.set(`${row.year}-${row.month}`, {
      year: row.year,
      month: row.month,
      acctCogs: numberOrNull(row.acctCogs),
      wipCogs: numberOrNull(row.wipCogs),
    });
  }

  for (const row of managementReportMonthly) {
    const key = `${row.year}-${row.month}`;
    const parsedAmount = numberOrNull(row.amountUsd);
    if (parsedAmount == null) continue;
    const amount = roundMgmtreportAmount(parsedAmount);
    if (row.metric === "revenue") {
      const current = sales.get(key) ?? {
        year: row.year,
        month: row.month,
        plan: null,
        actual: null,
      };
      if (row.scenario === "plan") current.plan = amount;
      if (row.scenario === "actual") current.actual = amount;
      sales.set(key, current);
    }
    if (row.metric === "cogs" && row.scenario === "actual") {
      const current = cogs.get(key) ?? {
        year: row.year,
        month: row.month,
        acctCogs: null,
        wipCogs: null,
      };
      current.acctCogs = amount;
      cogs.set(key, current);
    }
  }

  const byMonth = <T extends { year: number; month: number }>(a: T, b: T) =>
    a.year - b.year || a.month - b.month;
  return {
    salesMonthly: [...sales.values()].sort(byMonth),
    cogsMonthly: [...cogs.values()].sort(byMonth),
  };
}

/**
 * Keeps editable PD rows separate from derived display rows. The API route
 * returns both groups so a save initialized from salesMonthly/cogsMonthly can
 * never persist management-report overlays back into the PD tables.
 */
export function buildProjectMonthlyReadModel({
  projectDetailSales,
  projectDetailCogs,
  managementReportMonthly,
}: {
  projectDetailSales: ProjectDetailSalesRow[];
  projectDetailCogs: ProjectDetailCogsRow[];
  managementReportMonthly: ManagementReportMonthlyRow[];
}) {
  const salesMonthly = projectDetailSales.map((row) => ({
    year: row.year,
    month: row.month,
    plan: numberOrNull(row.plan),
    actual: numberOrNull(row.actual),
  }));
  const cogsMonthly = projectDetailCogs.map((row) => ({
    year: row.year,
    month: row.month,
    acctCogs: numberOrNull(row.acctCogs),
    wipCogs: numberOrNull(row.wipCogs),
  }));
  const canonical = buildCanonicalProjectMonthly({
    projectDetailSales: salesMonthly,
    projectDetailCogs: cogsMonthly,
    managementReportMonthly,
  });

  return {
    salesMonthly,
    cogsMonthly,
    canonicalSalesMonthly: canonical.salesMonthly,
    canonicalCogsMonthly: canonical.cogsMonthly,
  };
}