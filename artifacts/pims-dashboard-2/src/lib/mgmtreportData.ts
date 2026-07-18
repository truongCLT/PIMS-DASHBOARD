import { useEffect, useMemo } from "react";
import { useGetMgmtreportSummary } from "@workspace/api-client-react";
import { lastClosedMonth } from "./monthRange";

export const REPORT_YEAR = new Date().getFullYear();

interface Line {
  code: string;
  label: string;
  plan: number[];
  actual: number[];
  planTotal: number;
  actualTotal: number;
}

export interface KpiItem {
  title: string;
  plan: number;
  actual: number;
  achievement: string;
  achievementColor: string;
}

export interface PerformanceRow {
  label: string;
  planM: string;
  actualM: string;
  achM: string;
  planY: string;
  forecastY: string;
  achY: string;
  sub?: string;
  subActual?: string;
  subForecast?: string;
  subAch?: string;
}

export interface SalesRow {
  month: string;
  net: number | null;
  report: number | null;
  plan: number | null;
  actual: number | null;
  rate: number | null;
}

export interface ProfitRow {
  m: string;
  op: number;
  opPct: string;
  non: number;
  total: number;
  totalPct: string;
  sga: string;
  sgaValue: number;
  sgaPct: string;
  ord: number;
  ordPct: string;
  con: string;
  svc: string;
}

export interface OrderStatusData {
  planTotal: number;
  ordered: number;
  remaining: number;
}

export interface DashboardData {
  year: number;
  month: number;
  orderMonthActual: number;
  kpi: KpiItem[];
  performanceRows: PerformanceRow[];
  salesData: SalesRow[];
  profitData: ProfitRow[];
  orderStatus: OrderStatusData;
}

const ZERO: Line = {
  code: "",
  label: "",
  plan: Array(12).fill(0),
  actual: Array(12).fill(0),
  planTotal: 0,
  actualTotal: 0,
};

function cum(arr: number[], month: number): number {
  return arr.slice(0, month).reduce((a, b) => a + b, 0);
}

function fmtN(v: number): string {
  return Math.round(v).toLocaleString("ko-KR");
}

function pctStr(actual: number, plan: number): string {
  if (!plan) return "-";
  return `${Math.round((actual / plan) * 100)}%`;
}

function ratioStr(part: number, whole: number): string {
  if (!whole) return "-";
  return `${((part / whole) * 100).toFixed(1)}%`;
}

export function deriveDashboardData(
  summary: { year: number; lines: Line[] },
  month: number,
): DashboardData {
  const byCode = new Map(summary.lines.map((l) => [l.code, l]));
  const get = (code: string): Line => byCode.get(code) ?? ZERO;

  const revenue = get("revenue");
  const gross = get("gross_profit");
  const sga = get("sga");
  const op1 = get("op_profit1");
  const op2 = get("op_profit2");
  const ordinary = get("ordinary_profit");
  const orders = get("new_orders");

  const M = Math.min(Math.max(month, 1), 12);

  const kpiColor = (actual: number, plan: number) =>
    plan && actual / plan >= 1 ? "#00bcd4" : "#ff5722";

  const kpi: KpiItem[] = [
    {
      title: "당월 매출",
      plan: Math.round(revenue.plan[M - 1]),
      actual: Math.round(revenue.actual[M - 1]),
      achievement: pctStr(revenue.actual[M - 1], revenue.plan[M - 1]),
      achievementColor: kpiColor(revenue.actual[M - 1], revenue.plan[M - 1]),
    },
    {
      title: "당월 영업이익",
      plan: Math.round(op1.plan[M - 1]),
      actual: Math.round(op1.actual[M - 1]),
      achievement: pctStr(op1.actual[M - 1], op1.plan[M - 1]),
      achievementColor: kpiColor(op1.actual[M - 1], op1.plan[M - 1]),
    },
    {
      title: "연간 누적 매출",
      plan: Math.round(cum(revenue.plan, M)),
      actual: Math.round(cum(revenue.actual, M)),
      achievement: pctStr(cum(revenue.actual, M), cum(revenue.plan, M)),
      achievementColor: kpiColor(cum(revenue.actual, M), cum(revenue.plan, M)),
    },
    {
      title: "연간 누적 영업이익",
      plan: Math.round(cum(op1.plan, M)),
      actual: Math.round(cum(op1.actual, M)),
      achievement: pctStr(cum(op1.actual, M), cum(op1.plan, M)),
      achievementColor: kpiColor(cum(op1.actual, M), cum(op1.plan, M)),
    },
  ];

  const perfRow = (label: string, line: Line, withSub: boolean): PerformanceRow => {
    const planM = cum(line.plan, M);
    const actualM = cum(line.actual, M);
    const row: PerformanceRow = {
      label,
      planM: fmtN(planM),
      actualM: fmtN(actualM),
      achM: pctStr(actualM, planM),
      planY: fmtN(line.planTotal),
      forecastY: fmtN(line.actualTotal),
      achY: pctStr(line.actualTotal, line.planTotal),
    };
    if (withSub) {
      row.sub = ratioStr(planM, cum(revenue.plan, M));
      row.subActual = ratioStr(actualM, cum(revenue.actual, M));
      row.subForecast = ratioStr(line.planTotal, revenue.planTotal);
      row.subAch = ratioStr(line.actualTotal, revenue.actualTotal);
    }
    return row;
  };

  const performanceRows: PerformanceRow[] = [
    perfRow("수주", orders, false),
    perfRow("매출", revenue, false),
    perfRow("매출이익", gross, true),
    perfRow("판관비", sga, true),
    perfRow("영업이익", op1, true),
    perfRow("경상이익", ordinary, true),
  ];

  const salesData: SalesRow[] = Array.from({ length: 12 }, (_, i) => {
    const plan = Math.round(revenue.plan[i]);
    const actual = Math.round(revenue.actual[i]);
    return {
      month: `${i + 1}월`,
      net: null,
      report: null,
      plan,
      actual,
      rate: plan ? Math.round((actual / plan) * 100) : null,
    };
  });

  const profitData: ProfitRow[] = Array.from({ length: M }, (_, i) => {
    const rev = revenue.actual[i];
    const opV = Math.round(op1.actual[i]);
    const nonV = Math.round(ordinary.actual[i] - op2.actual[i]);
    const sgaV = Math.round(sga.actual[i]);
    const grossV = Math.round(gross.actual[i]);
    const ordV = Math.round(ordinary.actual[i]);
    return {
      m: `${i + 1}월`,
      op: opV,
      opPct: ratioStr(opV, rev),
      non: nonV,
      total: grossV,
      totalPct: ratioStr(grossV, rev),
      sga: `-${fmtN(sgaV)}`,
      sgaValue: sgaV,
      sgaPct: ratioStr(sgaV, rev),
      ord: ordV,
      ordPct: ratioStr(ordV, rev),
      con: "-",
      svc: "-",
    };
  });

  const orderedCum = Math.round(cum(orders.actual, M));
  const orderStatus: OrderStatusData = {
    planTotal: Math.round(orders.planTotal),
    ordered: orderedCum,
    remaining: Math.max(Math.round(orders.planTotal) - orderedCum, 0),
  };

  return {
    year: summary.year,
    month: M,
    orderMonthActual: Math.round(orders.actual[M - 1]),
    kpi,
    performanceRows,
    salesData,
    profitData,
    orderStatus,
  };
}

/* Module-level snapshot for the Excel export (populated by useDashboardData). */
let exportSnapshot: DashboardData | null = null;

export function getDashboardExportData(): DashboardData {
  if (!exportSnapshot) {
    throw new Error("대시보드 데이터가 아직 로딩되지 않았습니다. 잠시 후 다시 시도해주세요.");
  }
  return exportSnapshot;
}

export function useDashboardData() {
  const query = useGetMgmtreportSummary({ year: REPORT_YEAR });
  const derived = useMemo(
    () => (query.data ? deriveDashboardData(query.data, Math.max(lastClosedMonth(), 1)) : null),
    [query.data],
  );

  useEffect(() => {
    if (derived) exportSnapshot = derived;
  }, [derived]);

  return { ...query, derived };
}
