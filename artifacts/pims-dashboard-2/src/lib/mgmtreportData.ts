import { useEffect, useMemo } from "react";
import {
  useGetMgmtreportSummary,
  useListMgmtreportProjects,
  getListMgmtreportProjectsQueryKey,
} from "@workspace/api-client-react";
import { lastClosedMonth } from "./monthRange";
import { classifyMrProject } from "../data/projects";
import {
  useDashboardFilters,
  resolveMonthWindow,
  makeConverter,
  unitLabelOf,
  roundSmart,
  type PeriodMode,
} from "./dashboardFilters";

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
  plan: number | string;
  actual: number | string;
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
  orderMonthActual: number | null;
  kpi: KpiItem[];
  performanceRows: PerformanceRow[];
  salesData: SalesRow[];
  profitData: ProfitRow[];
  /** null = 프로젝트 필터 등으로 수주 데이터가 없는 경우 */
  orderStatus: OrderStatusData | null;
  /** 표시 단위 라벨 (예: "천 USD", "1M VND") */
  unitLabel: string;
  /** 손익 상세(판관비·영업이익)를 표시할 수 없을 때의 안내 문구 */
  profitNote: string | null;
  /** 선택된 기간에 포함된 월이 없는 경우 */
  emptyRange: boolean;
}

const ZERO: Line = {
  code: "",
  label: "",
  plan: Array(12).fill(0),
  actual: Array(12).fill(0),
  planTotal: 0,
  actualTotal: 0,
};

function rangeSum(arr: number[], from: number, to: number): number {
  let s = 0;
  for (let i = from - 1; i <= to - 1; i += 1) s += arr[i] ?? 0;
  return s;
}

function fmtN(v: number): string {
  return roundSmart(v).toLocaleString("ko-KR");
}

function pctStr(actual: number, plan: number): string {
  if (!plan) return "-";
  return `${Math.round((actual / plan) * 100).toLocaleString("ko-KR")}%`;
}

function ratioStr(part: number, whole: number): string {
  if (!whole) return "-";
  return `${((part / whole) * 100).toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}

interface Bucket {
  label: string;
  months: number[]; // 1-based months in window
}

function makeBuckets(from: number, to: number, mode: PeriodMode): Bucket[] {
  if (from > to) return [];
  const months = Array.from({ length: to - from + 1 }, (_, i) => from + i);
  if (mode === "Month") {
    return months.map((m) => ({ label: `${m}월`, months: [m] }));
  }
  if (mode === "Quarter") {
    const map = new Map<number, number[]>();
    for (const m of months) {
      const q = Math.ceil(m / 3);
      if (!map.has(q)) map.set(q, []);
      map.get(q)!.push(m);
    }
    return [...map.entries()].map(([q, ms]) => ({ label: `${q}분기`, months: ms }));
  }
  return [{ label: `${REPORT_YEAR}년`, months }];
}

export interface ProjectScope {
  name: string;
  /** "project" = 단일 프로젝트, "division" = 시공/용역 부문 합계 */
  kind?: "project" | "division";
  /** 집계 대상 프로젝트가 하나도 없음 (예: 종료 프로젝트 없음) → KPI를 "-"로 표시 */
  empty?: boolean;
  revenuePlan: number[];
  revenueActual: number[];
  cogsPlan: number[];
  cogsActual: number[];
}

export interface DeriveOptions {
  from: number; // 1..12
  to: number; // 1..12 (from > to → empty range)
  bucket: PeriodMode;
  convert: (v: number) => number;
  unitLabel: string;
  projectScope: ProjectScope | null;
  /** 매출 차트 데이터를 조회 기간과 무관하게 12개월 전체로 생성 (엑셀 보고서용) */
  salesFullYear?: boolean;
}

export function defaultDeriveOptions(month: number): DeriveOptions {
  return {
    from: 1,
    to: Math.min(Math.max(month, 1), 12),
    bucket: "Month",
    convert: (v) => v,
    unitLabel: "천 USD",
    projectScope: null,
    salesFullYear: true,
  };
}

export function deriveDashboardData(
  summary: { year: number; lines: Line[] },
  opts: DeriveOptions,
): DashboardData {
  const { from, to, bucket, convert, unitLabel, projectScope } = opts;
  const emptyRange = from > to;
  const M = Math.min(Math.max(to, 1), 12);
  const F = Math.min(Math.max(from, 1), 12);

  const byCode = new Map(summary.lines.map((l) => [l.code, l]));
  const getLine = (code: string): Line => byCode.get(code) ?? ZERO;

  const cv = (arr: number[]) => arr.map((v) => convert(v));
  const totalOf = (arr: number[]) => arr.reduce((a, b) => a + b, 0);

  let revenue: Line;
  let gross: Line;
  let sga: Line | null;
  let op1: Line | null;
  let op2: Line | null;
  let ordinary: Line | null;
  let orders: Line | null;

  if (projectScope) {
    const revPlan = cv(projectScope.revenuePlan);
    const revActual = cv(projectScope.revenueActual);
    const grossPlan = projectScope.revenuePlan.map((v, i) =>
      convert(v - (projectScope.cogsPlan[i] ?? 0)),
    );
    const grossActual = projectScope.revenueActual.map((v, i) =>
      convert(v - (projectScope.cogsActual[i] ?? 0)),
    );
    revenue = {
      code: "revenue",
      label: "매출",
      plan: revPlan,
      actual: revActual,
      planTotal: totalOf(revPlan),
      actualTotal: totalOf(revActual),
    };
    gross = {
      code: "gross_profit",
      label: "매출이익",
      plan: grossPlan,
      actual: grossActual,
      planTotal: totalOf(grossPlan),
      actualTotal: totalOf(grossActual),
    };
    sga = op1 = op2 = ordinary = orders = null;
  } else {
    const conv = (l: Line): Line => ({
      ...l,
      plan: cv(l.plan),
      actual: cv(l.actual),
      planTotal: convert(l.planTotal),
      actualTotal: convert(l.actualTotal),
    });
    revenue = conv(getLine("revenue"));
    gross = conv(getLine("gross_profit"));
    sga = conv(getLine("sga"));
    op1 = conv(getLine("op_profit1"));
    op2 = conv(getLine("op_profit2"));
    ordinary = conv(getLine("ordinary_profit"));
    orders = conv(getLine("new_orders"));
  }

  const kpiColor = (actual: number, plan: number) =>
    plan && actual / plan >= 1 ? "#35c7c0" : "#f2736a";

  const kpiOf = (title: string, line: Line | null, monthly: boolean): KpiItem => {
    if (emptyRange || !line || projectScope?.empty) {
      return {
        title,
        plan: "-",
        actual: "-",
        achievement: "-",
        achievementColor: "#9ab0c8",
      };
    }
    const plan = monthly ? line.plan[M - 1] : rangeSum(line.plan, F, M);
    const actual = monthly ? line.actual[M - 1] : rangeSum(line.actual, F, M);
    return {
      title,
      plan: roundSmart(plan),
      actual: roundSmart(actual),
      achievement: pctStr(actual, plan),
      achievementColor: kpiColor(actual, plan),
    };
  };

  const kpi: KpiItem[] = [
    kpiOf("당월 매출", revenue, true),
    kpiOf("당월 영업이익", op1, true),
    kpiOf("연간 누적 매출", revenue, false),
    kpiOf("연간 누적 영업이익", op1, false),
  ];

  const perfRow = (label: string, line: Line | null, withSub: boolean): PerformanceRow => {
    if (emptyRange || !line) {
      return {
        label,
        planM: "-",
        actualM: "-",
        achM: "-",
        planY: line && !emptyRange ? fmtN(line.planTotal) : "-",
        forecastY: line && !emptyRange ? fmtN(line.actualTotal) : "-",
        achY: line && !emptyRange ? pctStr(line.actualTotal, line.planTotal) : "-",
      };
    }
    const planM = rangeSum(line.plan, F, M);
    const actualM = rangeSum(line.actual, F, M);
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
      row.sub = ratioStr(planM, rangeSum(revenue.plan, F, M));
      row.subActual = ratioStr(actualM, rangeSum(revenue.actual, F, M));
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

  const buckets = makeBuckets(F, M, bucket);
  const salesBuckets = opts.salesFullYear && !emptyRange ? makeBuckets(1, 12, bucket) : buckets;

  const salesData: SalesRow[] = salesBuckets.map((b) => {
    const plan = roundSmart(b.months.reduce((a, m) => a + (revenue.plan[m - 1] ?? 0), 0));
    const actual = roundSmart(b.months.reduce((a, m) => a + (revenue.actual[m - 1] ?? 0), 0));
    return {
      month: b.label,
      net: null,
      report: null,
      plan,
      actual,
      rate: plan ? Math.round((actual / plan) * 100) : null,
    };
  });

  let profitData: ProfitRow[] = [];
  if (!projectScope && !emptyRange && sga && op1 && op2 && ordinary) {
    profitData = buckets.map((b) => {
      const sum = (line: Line, kind: "plan" | "actual") =>
        b.months.reduce((a, m) => a + (line[kind][m - 1] ?? 0), 0);
      const rev = sum(revenue, "actual");
      const opV = roundSmart(sum(op1!, "actual"));
      const nonV = roundSmart(sum(ordinary!, "actual") - sum(op2!, "actual"));
      const sgaV = roundSmart(sum(sga!, "actual"));
      const grossV = roundSmart(sum(gross, "actual"));
      const ordV = roundSmart(sum(ordinary!, "actual"));
      return {
        m: b.label,
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
  }

  let orderStatus: OrderStatusData | null = null;
  let orderMonthActual: number | null = null;
  if (orders && !emptyRange) {
    const orderedCum = roundSmart(rangeSum(orders.actual, F, M));
    orderStatus = {
      planTotal: roundSmart(orders.planTotal),
      ordered: orderedCum,
      remaining: Math.max(roundSmart(orders.planTotal) - orderedCum, 0),
    };
    orderMonthActual = roundSmart(orders.actual[M - 1]);
  }

  return {
    year: summary.year,
    month: M,
    orderMonthActual,
    kpi,
    performanceRows,
    salesData,
    profitData,
    orderStatus,
    unitLabel,
    profitNote: emptyRange
      ? "선택한 기간에 데이터가 없습니다."
      : projectScope
        ? projectScope.kind === "division"
          ? "부문별 손익 상세(판관비·영업이익) 데이터는 제공되지 않습니다."
          : "프로젝트별 손익 상세(판관비·영업이익) 데이터는 제공되지 않습니다."
        : null,
    emptyRange,
  };
}

/* Module-level snapshot for the Excel export (populated by useDashboardData).
 * 보고서 양식이 깨지지 않도록 필터와 무관한 기본(전사·USD) 데이터를 유지한다. */
let exportSnapshot: DashboardData | null = null;

export function getDashboardExportData(): DashboardData {
  if (!exportSnapshot) {
    throw new Error("대시보드 데이터가 아직 로딩되지 않았습니다. 잠시 후 다시 시도해주세요.");
  }
  return exportSnapshot;
}

export function useDashboardData() {
  const filters = useDashboardFilters();
  const query = useGetMgmtreportSummary({ year: REPORT_YEAR });

  const projectSelected = filters.project !== "All";
  const divisionSelected = !projectSelected && filters.division != null;
  const needProjects = projectSelected || divisionSelected;
  const projectsQuery = useListMgmtreportProjects(
    { year: REPORT_YEAR },
    {
      query: {
        queryKey: getListMgmtreportProjectsQueryKey({ year: REPORT_YEAR }),
        enabled: needProjects,
      },
    },
  );

  const derived = useMemo(() => {
    if (!query.data) return null;
    if (needProjects && !projectsQuery.data) return null;

    const { from, to } = resolveMonthWindow(filters.startYm, filters.endYm);
    const convert = makeConverter(filters.currency, filters.unitIndex, filters.fxRates);
    const unitLabel =
      filters.currency === "USD" && filters.unitIndex === 0
        ? "천 USD"
        : unitLabelOf(filters.currency, filters.unitIndex);

    let projectScope: ProjectScope | null = null;
    if (projectSelected) {
      const p = (projectsQuery.data?.projects ?? []).find((x) => x.name === filters.project);
      if (p) {
        projectScope = {
          name: p.name,
          kind: "project",
          revenuePlan: p.revenuePlan,
          revenueActual: p.revenueActual,
          cogsPlan: p.cogsPlan,
          cogsActual: p.cogsActual,
        };
      }
    } else if (divisionSelected && filters.division) {
      const members = (projectsQuery.data?.projects ?? []).filter(
        (p) =>
          !p.isGroup &&
          classifyMrProject(p.name) === filters.division &&
          (filters.statusFilter == null || (p.status ?? "ongoing") === filters.statusFilter),
      );
      const sum12 = (pick: (p: (typeof members)[number]) => number[]): number[] => {
        const out = Array(12).fill(0) as number[];
        for (const p of members) {
          const arr = pick(p);
          for (let i = 0; i < 12; i += 1) out[i] += arr[i] ?? 0;
        }
        return out;
      };
      projectScope = {
        name:
          filters.statusFilter == null
            ? `${filters.division} 부문`
            : `${filters.division} 부문 (${filters.statusFilter === "ongoing" ? "진행중" : "종료"})`,
        kind: "division",
        empty: members.length === 0,
        revenuePlan: sum12((p) => p.revenuePlan),
        revenueActual: sum12((p) => p.revenueActual),
        cogsPlan: sum12((p) => p.cogsPlan),
        cogsActual: sum12((p) => p.cogsActual),
      };
    }

    return deriveDashboardData(query.data, {
      from,
      to,
      bucket: filters.period,
      convert,
      unitLabel,
      projectScope,
    });
  }, [
    query.data,
    projectsQuery.data,
    projectSelected,
    divisionSelected,
    needProjects,
    filters.project,
    filters.division,
    filters.statusFilter,
    filters.startYm,
    filters.endYm,
    filters.period,
    filters.currency,
    filters.unitIndex,
  ]);

  /* 필터와 무관한 기본 스냅샷 (엑셀 보고서용) */
  const baseline = useMemo(
    () =>
      query.data
        ? deriveDashboardData(query.data, defaultDeriveOptions(Math.max(lastClosedMonth(), 1)))
        : null,
    [query.data],
  );

  useEffect(() => {
    if (baseline) exportSnapshot = baseline;
  }, [baseline]);

  const isLoading = query.isLoading || (needProjects && projectsQuery.isLoading);
  const isError = query.isError || (needProjects && projectsQuery.isError);

  return { ...query, isLoading, isError, derived };
}
