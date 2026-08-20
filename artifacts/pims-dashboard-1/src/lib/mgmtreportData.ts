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

/**
 * 프로젝트명으로 시공/용역 부문을 조회한다. 서버가 회사/부문 구조(CATB_COMPANYSTRUCT 동기화)로
 * 명시적으로 매핑한 businessType을 우선 사용하고, 매핑되지 않은 프로젝트는 기존 키워드 추정
 * 방식(classifyMrProject)으로 폴백한다 — App.tsx의 시공/용역 대시보드 라우팅에 사용.
 */
export function useProjectBusinessType(projectName: string | null): "시공" | "용역" | null {
  const projectsQuery = useListMgmtreportProjects(
    { year: REPORT_YEAR },
    { query: { queryKey: getListMgmtreportProjectsQueryKey({ year: REPORT_YEAR }), enabled: projectName != null } },
  );
  if (!projectName) return null;
  const project = projectsQuery.data?.projects.find((p) => p.name === projectName);
  if (!project) return null;
  return project.businessType ?? classifyMrProject(projectName);
}

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
  convert: (v: number, year?: number, month?: number) => number;
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
    convert: (v) => v, // identity — 이미 변환된 값이거나 변환 불필요한 컨텍스트에서 사용
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

  const lines = summary?.lines ?? [];
  const byCode = new Map(lines.map((l) => [l.code, l]));
  const getLine = (code: string): Line => byCode.get(code) ?? ZERO;

  // 배열 인덱스 i는 summary.year의 (i+1)월 — 월별 환율을 적용해 변환한다.
  const cv = (arr: number[]) => arr.map((v, i) => convert(v, summary.year, i + 1));
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
      convert(v - (projectScope.cogsPlan[i] ?? 0), summary.year, i + 1),
    );
    const grossActual = projectScope.revenueActual.map((v, i) =>
      convert(v - (projectScope.cogsActual[i] ?? 0), summary.year, i + 1),
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
    // planTotal/actualTotal은 서버에서 이미 연간 합계로 집계된 단일 값이라 특정 월에 귀속되지 않으므로,
    // 이 화면의 기준월(M, 조회 종료월)의 환율을 앵커로 사용해 변환한다.
    const conv = (l: Line): Line => ({
      ...l,
      plan: cv(l.plan),
      actual: cv(l.actual),
      planTotal: convert(l.planTotal, summary.year, M),
      actualTotal: convert(l.actualTotal, summary.year, M),
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

  const kpiOf = (title: string, line: Line | null, mode: "monthly" | "ytd" | "fullYear"): KpiItem => {
    if (emptyRange || !line || projectScope?.empty) {
      return {
        title,
        plan: "-",
        actual: "-",
        achievement: "-",
        achievementColor: "#f2736a",
      };
    }
    let p = 0;
    let a = 0;
    if (mode === "monthly") {
      p = line.plan[M - 1] ?? 0;
      a = line.actual[M - 1] ?? 0;
    } else if (mode === "ytd") {
      p = rangeSum(line.plan, 1, M);
      a = rangeSum(line.actual, 1, M);
    } else {
      p = line.planTotal;
      a = line.actualTotal;
    }
    return {
      title,
      plan: fmtN(p),
      actual: fmtN(a),
      achievement: pctStr(a, p),
      achievementColor: kpiColor(a, p),
    };
  };

  const kpi: KpiItem[] = [
    kpiOf("YTD Revenue", revenue, "ytd"),
    kpiOf("YTD Operating Profit", op1 ?? gross, "ytd"),
    kpiOf("Full Year Revenue", revenue, "fullYear"),
    kpiOf("Full Year Operating Profit", op1 ?? gross, "fullYear"),
  ];

  const pRow = (label: string, line: Line | null, subLine?: Line | null): PerformanceRow => {
    if (emptyRange || !line || projectScope?.empty) {
      return {
        label,
        planM: "-",
        actualM: "-",
        achM: "-",
        planY: "-",
        forecastY: "-",
        achY: "-",
      };
    }
    const pM = rangeSum(line.plan, F, M);
    const aM = rangeSum(line.actual, F, M);
    const pY = line.planTotal;
    const aY = line.actualTotal;
    const row: PerformanceRow = {
      label,
      planM: fmtN(pM),
      actualM: fmtN(aM),
      achM: pctStr(aM, pM),
      planY: fmtN(pY),
      forecastY: fmtN(aY),
      achY: pctStr(aY, pY),
    };

    if (subLine) {
      const spM = rangeSum(subLine.plan, F, M);
      const saM = rangeSum(subLine.actual, F, M);
      const spY = subLine.planTotal;
      const saY = subLine.actualTotal;
      row.sub = `${label} 달성률 / 이익률`;
      row.subActual = ratioStr(saM, aM);
      row.subForecast = ratioStr(saY, aY);
      row.subAch = ratioStr(saY, pY ? (saM / spM) * pY : 0);
    }
    return row;
  };

  const performanceRows: PerformanceRow[] = [
    pRow("매출액", revenue),
    pRow("매출이익", gross, revenue),
    pRow("판관비", sga),
    pRow("영업이익", op1, revenue),
    pRow("영업외손익", op2),
    pRow("경상이익", ordinary, revenue),
  ];

  const buckets = makeBuckets(opts.salesFullYear ? 1 : F, opts.salesFullYear ? 12 : M, bucket);
  const salesData: SalesRow[] = buckets.map((b) => {
    const plan = rangeSum(revenue.plan, b.months[0], b.months[b.months.length - 1]);
    const actual = rangeSum(revenue.actual, b.months[0], b.months[b.months.length - 1]);
    const inside = b.months.every((m) => m >= F && m <= M);
    return {
      month: b.label,
      net: inside ? actual - plan : null,
      report: inside ? actual : null,
      plan: roundSmart(plan),
      actual: inside ? roundSmart(actual) : null,
      rate: plan ? Math.round((actual / plan) * 100) : null,
    };
  });

  const pBuckets = makeBuckets(F, M, bucket);
  const profitData: ProfitRow[] = pBuckets.map((b) => {
    const fromM = b.months[0];
    const toM = b.months[b.months.length - 1];

    const revA = rangeSum(revenue.actual, fromM, toM);
    const grossA = rangeSum(gross.actual, fromM, toM);
    const opA = op1 ? rangeSum(op1.actual, fromM, toM) : grossA;
    const sgaA = sga ? rangeSum(sga.actual, fromM, toM) : 0;
    const op2A = op2 ? rangeSum(op2.actual, fromM, toM) : 0;
    const ordA = ordinary ? rangeSum(ordinary.actual, fromM, toM) : opA + op2A;

    return {
      m: b.label,
      op: roundSmart(opA),
      opPct: ratioStr(opA, revA),
      non: roundSmart(op2A),
      total: roundSmart(grossA),
      totalPct: ratioStr(grossA, revA),
      sga: ratioStr(sgaA, revA),
      sgaValue: roundSmart(sgaA),
      sgaPct: ratioStr(sgaA, revA),
      ord: roundSmart(ordA),
      ordPct: ratioStr(ordA, revA),
      con: "-",
      svc: "-",
    };
  });

  let orderStatus: OrderStatusData | null = null;
  if (!projectScope && orders) {
    const pY = orders.planTotal;
    const aM = rangeSum(orders.actual, 1, M);
    orderStatus = {
      planTotal: roundSmart(pY),
      ordered: roundSmart(aM),
      remaining: roundSmart(Math.max(0, pY - aM)),
    };
  }

  const profitNote =
    projectScope != null
      ? projectScope.kind === "division"
        ? "※ 부문 합계 보기에서는 판관비·영업이익 손익 항목을 집계하지 않습니다 (매출·매출이익 항목만 제공)."
        : "※ 개별 프로젝트 보기에서는 판관비·영업이익 손익 항목을 집계하지 않습니다 (매출·매출이익 항목만 제공)."
      : null;

  return {
    year: summary.year,
    month: M,
    orderMonthActual: orders?.actual[M - 1] ?? null,
    kpi,
    performanceRows,
    salesData,
    profitData,
    orderStatus,
    unitLabel,
    profitNote,
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
  const query = useGetMgmtreportSummary();
  const summaryForYear = query.data?.find((s) => s.year === REPORT_YEAR) ?? null;

  const projectSelected = filters.project !== "All";
  const divisionSelected = filters.division != null;
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
    if (!summaryForYear) return null;
    if (needProjects && !projectsQuery.data) return null;

    const { from, to } = resolveMonthWindow(filters.startYm, filters.endYm);
    const convert = makeConverter(filters.currency, filters.unitIndex, filters.fxRateHistory);
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
          (p.businessType ?? classifyMrProject(p.name)) === filters.division &&
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

    return deriveDashboardData(summaryForYear, {
      from,
      to,
      bucket: filters.period,
      convert,
      unitLabel,
      projectScope,
    });
  }, [
    summaryForYear,
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
    filters.fxRateHistory,
  ]);

  /* 필터와 무관한 기본 스냅샷 (엑셀 보고서용) */
  const baseline = useMemo(
    () =>
      summaryForYear
        ? deriveDashboardData(summaryForYear, defaultDeriveOptions(Math.max(lastClosedMonth(), 1)))
        : null,
    [summaryForYear],
  );

  useEffect(() => {
    if (baseline) exportSnapshot = baseline;
  }, [baseline]);

  const isLoading = query.isLoading || (needProjects && projectsQuery.isLoading);
  const isError = query.isError || (needProjects && projectsQuery.isError);

  return { ...query, isLoading, isError, derived };
}
