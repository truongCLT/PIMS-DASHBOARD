import React, { useState, useMemo } from "react";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LabelList,
  ReferenceLine,
} from "recharts";
import { useTranslation } from "react-i18next";
import { useQueries } from "@tanstack/react-query";
import { DetailModal, DetailDataTable } from "./DetailModal";
import {
  useGetCashflowAggregate,
  getGetCashflowAggregateQueryKey,
  getCashflowAggregate,
  useGetCashflowReportSummary,
  getGetCashflowReportSummaryQueryKey,
  useListMgmtreportProjects,
  getListMgmtreportProjectsQueryKey,
} from "@workspace/api-client-react";
import { useGetMgmtreportSettings } from "@workspace/api-client-react/generated/api";
import type { DashboardScope } from "./Sidebar";
import { PROJECT_GROUPS, resolveProjectBusinessType } from "../data/projects";
import { getCashflowProjectRef } from "../data/cashflowProjectMap";
import {
  useDashboardFilters,
  resolveMonthWindow,
  makeConverter,
  unitLabelOf,
  REPORT_YEAR,
} from "../lib/dashboardFilters";
import { chartTheme } from "../lib/chartTheme";
import { emptyNote, ACHIEVE_RED, INK_MUTED } from "../lib/uiTokens";
import { maxSelectableMonth } from "../lib/monthRange";

type TFunc = ReturnType<typeof useTranslation>["t"];

/** "YYYY-MM" → [year, month]. convert()에 각 포인트의 실제 월을 넘기기 위함 — 생략하면 1월 환율이
 * 모든 달에 적용되는 버그가 생긴다(실사용자 보고로 발견된 매출 차트의 동일 버그와 같은 종류). */
function parseYm(ym: string): [number, number] {
  const [y, m] = ym.split("-").map(Number);
  return [y, m];
}

// DECV 전체 = 시공(도급 사업) + 용역(용역 사업) 합산
const BASE_SCOPE_PARAMS: Record<string, { division?: string; divisions?: string }> = {
  전체: { divisions: "도급 사업,용역 사업" },
  시공: { division: "도급 사업" },
  용역: { division: "용역 사업" },
};

// 진행중 = 해당 사업부 하위에 나열된 프로젝트들의 자금수지 합산
function getOngoingRefs(divisionLabel: "시공" | "용역") {
  const decv = PROJECT_GROUPS.find((g) => g.label === "DECV");
  const division = decv?.divisions.find((d) => d.label === divisionLabel);
  const refs = (division?.projects ?? [])
    .map((p) => getCashflowProjectRef(p.name))
    .filter((r): r is NonNullable<typeof r> => r != null);
  return refs;
}

interface ScopeQueryConfig {
  label: string;
  enabled: boolean;
  division?: string;
  divisions?: string;
  names?: string;
  emptyMessage?: string;
}

/** 화면에 표시할 scope 라벨 */
function getScopeLabel(scope: DashboardScope, t: TFunc): string {
  switch (scope) {
    case "전체":
      return t("cashFlowChart:scopeAllDecv");
    case "시공":
      return t("common:construction");
    case "용역":
      return t("common:service");
    case "시공-진행중":
      return `${t("common:construction")} ${t("common:inProgress")}`;
    case "시공-종료":
      return `${t("common:construction")} ${t("common:closed")}`;
    case "용역-진행중":
      return `${t("common:service")} ${t("common:inProgress")}`;
    case "용역-종료":
      return `${t("common:service")} ${t("common:closed")}`;
    default:
      return scope;
  }
}

function getScopeConfig(scope: DashboardScope, t: TFunc): ScopeQueryConfig {
  if (scope === "시공-종료" || scope === "용역-종료") {
    return {
      label: getScopeLabel(scope, t),
      enabled: false,
      emptyMessage: t("cashFlowChart:noClosedProjectData"),
    };
  }
  if (scope === "시공-진행중" || scope === "용역-진행중") {
    const divisionLabel = scope.startsWith("시공") ? "시공" : "용역";
    const refs = getOngoingRefs(divisionLabel);
    if (refs.length === 0) {
      return {
        label: getScopeLabel(scope, t),
        enabled: false,
        emptyMessage: t("cashFlowChart:noOngoingCashflowData"),
      };
    }
    return {
      label: getScopeLabel(scope, t),
      enabled: true,
      division: refs[0].division,
      names: refs.map((r) => r.name).join(","),
    };
  }
  return {
    label: getScopeLabel(scope, t),
    enabled: true,
    ...BASE_SCOPE_PARAMS[scope],
  };
}

const makeBalanceLabel = (compact: boolean) => (props: any) => {
  const { x, y, value } = props;
  if (value === undefined || value === null) return null;
  return (
    <text x={x} y={y - 7} fill={chartTheme.balanceNavy} textAnchor="middle" fontSize={compact ? 9 : 11} fontWeight="600">
      {Number(value).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
    </text>
  );
};

function monthLabel(ym: string, t: TFunc): string {
  const m = Number(ym.slice(5, 7));
  const year = ym.slice(0, 4);
  return t("cashFlowChart:monthLabel", { month: m, year });
}

/** YYYY-MM 행만 드릴다운 가능 */
function isValidYm(rawMonth: string): boolean {
  return /^\d{4}-\d{2}$/.test(rawMonth);
}

type ChartRow = {
  month: string;      // 표시용 라벨
  rawMonth: string;   // "YYYY-MM" (드릴다운 조회 기준)
  inflow: number;
  outflow: number;
  balance: number;
};

/** PIMSVINA Cash Flow Report 드릴다운 표 행 (그룹/현장·항목) */
type ReportDrillRow = {
  key: string;
  name: string;
  inflow: number;
  outflow: number;
  surplus: number;
};

const fmtInt = (v: unknown) =>
  typeof v === "number"
    ? v.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })
    : "-";

// chartData.outflow는 막대를 0 아래로 그리려고 음수로 들고 있다 — 표에서는 드릴다운 표·툴팁과 같이 양수로 보여준다.
const fmtAbsInt = (v: unknown) => (typeof v === "number" ? fmtInt(Math.abs(v)) : "-");

function sumRows(rows: ReportDrillRow[]): Partial<ReportDrillRow> {
  return {
    inflow: rows.reduce((a, r) => a + r.inflow, 0),
    outflow: rows.reduce((a, r) => a + r.outflow, 0),
    surplus: rows.reduce((a, r) => a + r.surplus, 0),
  };
}

export function CashFlowChart({ scope = "전체" }: { scope?: DashboardScope }) {
  const { t, i18n } = useTranslation(["cashFlowChart", "common"]);
  const lang = (i18n.language ?? "ko").slice(0, 2);
  const [detailOpen, setDetailOpen] = useState(false);
  const [drillRow, setDrillRow] = useState<ChartRow | null>(null);
  const [drillGroup, setDrillGroup] = useState<ReportDrillRow | null>(null);

  const config = getScopeConfig(scope, t);
  const filters = useDashboardFilters();
  const settingsQuery = useGetMgmtreportSettings();
  const referenceMonth = settingsQuery.data?.month ?? maxSelectableMonth();
  const { from, to } = resolveMonthWindow(filters.startYm, filters.endYm, referenceMonth);
  const emptyRange = from > to;
  const projectSelected = filters.project !== "All";
  const compact = filters.unitIndex === 1;
  // 자금수지는 "월별 자금 환율"(purpose="cashflow")이 입력된 달이면 그 환율로 표시 통화 환산을 한다 — 서버도
  // 그 달 VND 실적을 같은 환율로 USD 환산하므로 VND로 보면 원래 VND 금액이 그대로 나온다. 없으면 기존 환율.
  const baseConvert = makeConverter(filters.currency, filters.unitIndex, filters.fxRateHistory);
  const cashflowConvert = makeConverter(filters.currency, filters.unitIndex, filters.fxRateHistory, "cashflow");
  const convert = (v: number, y?: number, m?: number) =>
    y != null &&
    m != null &&
    filters.fxRateHistory.some(
      (e) => e.purpose === "cashflow" && e.currency === filters.currency && e.year === y && e.month === m,
    )
      ? cashflowConvert(v, y, m)
      : baseConvert(v, y, m);
  const unitLabel =
    filters.currency === "USD" && filters.unitIndex === 0
      ? t("cashFlowChart:thousandUsd")
      : unitLabelOf(filters.currency, filters.unitIndex, lang === "en" ? "en" : lang === "vi" ? "vi" : "ko");

  const hasCustomRange = filters.startYm !== "" || filters.endYm !== "";
  const fromMonth = hasCustomRange && !emptyRange ? from : 1;
  const months = hasCustomRange && !emptyRange ? to - from + 1 : referenceMonth;

  const enabled = config.enabled && !projectSelected && !emptyRange;
  // DECV 전체는 PIMSVINA "Cash Flow Report"(Level=Summary)의 Total 행을 그대로 쓴다 — 유입/유출은
  // Business Activities + Financing and Investment + HQ Admin + Development 합계, 누적 잔액은 PIMSVINA
  // Cash Balance(기초 잔액 포함). 예전엔 자금수지 Excel(cf_*)의 프로젝트 행(= Business Activities)만
  // 합산해서 Total/Cash Balance와 달랐다(실사용자 보고). 시공/용역 등 부문 범위는 기존 집계를 유지한다.
  const useReport = scope === "전체";
  const params = {
    division: config.division,
    divisions: config.divisions,
    names: config.names,
    fromYear: REPORT_YEAR,
    fromMonth,
    months,
  };
  const aggregateQuery = useGetCashflowAggregate(params, {
    query: { queryKey: getGetCashflowAggregateQueryKey(params), enabled: enabled && !useReport },
  });
  const reportParams = { fromYear: REPORT_YEAR, fromMonth, months };
  const reportQuery = useGetCashflowReportSummary(reportParams, {
    query: {
      queryKey: getGetCashflowReportSummaryQueryKey(reportParams),
      enabled: enabled && useReport,
      staleTime: 5 * 60_000,
    },
  });
  const query = useReport ? reportQuery : aggregateQuery;

  const points = useReport
    ? (reportQuery.data?.total ?? []).map((p) => ({
        month: p.month,
        cashIn: p.income,
        cashOut: p.outcome,
        equivalent: p.balance,
      }))
    : (aggregateQuery.data?.points ?? []);
  const chartData: ChartRow[] = points.map((p) => {
    const [y, m] = parseYm(p.month);
    return {
      month: monthLabel(p.month, t),
      rawMonth: p.month,
      inflow: convert(p.cashIn, y, m),
      outflow: -convert(p.cashOut, y, m),
      balance: convert(p.equivalent, y, m),
    };
  });
  const hasData = chartData.some((d) => d.inflow !== 0 || d.outflow !== 0 || d.balance !== 0);

  /* ── 현장별 드릴다운 ──
   * 진행중 스코프는 상단 합계와 동일한 고정 현장 목록(getOngoingRefs)을 그대로 쓰고,
   * 전체/시공/용역은 Revenue 위젯(SalesChart)과 동일하게 경영보고 프로젝트 목록 전체를
   * 부문으로 필터링한 뒤, 자금수지 매핑(CASHFLOW_PROJECT_MAP)이 있는 현장만 뽑아 쓴다. */
  const projectsQuery = useListMgmtreportProjects(
    { year: REPORT_YEAR },
    { query: { queryKey: getListMgmtreportProjectsQueryKey({ year: REPORT_YEAR }) } },
  );
  const drillRefs = useMemo(() => {
    if (useReport) return []; // 리포트 응답에 그룹/현장 상세가 함께 들어 있어 현장별 개별 조회가 필요 없다
    if (scope === "시공-진행중") return getOngoingRefs("시공");
    if (scope === "용역-진행중") return getOngoingRefs("용역");
    if (scope === "시공-종료" || scope === "용역-종료") return [];
    const divisionLabel = scope === "시공" ? "시공" : scope === "용역" ? "용역" : null;
    const projects = projectsQuery.data?.projects ?? [];
    return projects
      .filter(
        (p) =>
          !p.isGroup &&
          (!divisionLabel || resolveProjectBusinessType(p.name, p.businessType) === divisionLabel),
      )
      .map((p) => getCashflowProjectRef(p.name))
      .filter((r): r is NonNullable<typeof r> => r != null);
  }, [useReport, scope, projectsQuery.data]);
  const hasDrilldown = enabled && (useReport ? reportQuery.data != null : drillRefs.length > 0);

  /** 드릴다운 쿼리: 현장별 개별 쿼리 (조건부 활성) */
  const drillEnabled = hasDrilldown; // 항상 프리패치 (클릭 즉시 표시)
  const projectQueries = useQueries({
    queries: drillRefs.map((ref) => {
      const qp = {
        names: ref.name,
        division: ref.division,
        fromYear: REPORT_YEAR,
        fromMonth,
        months,
      };
      return {
        queryKey: getGetCashflowAggregateQueryKey(qp),
        queryFn: () => getCashflowAggregate(qp),
        enabled: drillEnabled,
      };
    }),
  });

  /** 클릭된 월의 현장별 유입·유출 rows */
  const drillRows = useMemo(() => {
    if (!drillRow || !hasDrilldown) return [];
    const ym = drillRow.rawMonth;
    const [y, m] = parseYm(ym);
    return drillRefs
      .map((ref, i) => {
        const qData = projectQueries[i]?.data;
        const pt = qData?.points.find((p) => p.month === ym);
        return {
          name: ref.name,
          inflow: Math.round(convert(pt?.cashIn ?? 0, y, m) * 10) / 10,
          outflow: Math.round(convert(pt?.cashOut ?? 0, y, m) * 10) / 10,
        };
      })
      .filter((r) => r.inflow !== 0 || r.outflow !== 0)
      .sort((a, b) => b.inflow - a.inflow);
  }, [drillRow, hasDrilldown, drillRefs, projectQueries, convert]);

  const drillIsLoading = projectQueries.some((q) => q.isLoading);
  const drillIsError = projectQueries.some((q) => q.isError);

  /** PIMSVINA 리포트 2차: 클릭된 월의 Group Business Line별 유입·유출·수지 */
  const reportGroupRows = useMemo<ReportDrillRow[]>(() => {
    if (!useReport || !drillRow) return [];
    const ym = drillRow.rawMonth;
    const [y, m] = parseYm(ym);
    return (reportQuery.data?.groups ?? []).map((g) => {
      const pt = g.months.find((p) => p.month === ym);
      const inflow = convert(pt?.income ?? 0, y, m);
      const outflow = convert(pt?.outcome ?? 0, y, m);
      return { key: g.code, name: g.name, inflow, outflow, surplus: inflow - outflow };
    });
  }, [useReport, drillRow, reportQuery.data, convert]);

  /** PIMSVINA 리포트 3차: 선택한 그룹의 현장(사업) / Cash Flow Type(재무·관리비)별 상세 */
  const reportDetailRows = useMemo<ReportDrillRow[]>(() => {
    if (!useReport || !drillRow || !drillGroup) return [];
    const ym = drillRow.rawMonth;
    const [y, m] = parseYm(ym);
    const group = reportQuery.data?.groups.find((g) => g.code === drillGroup.key);
    return (group?.details ?? [])
      .map((d) => {
        const pt = d.months.find((p) => p.month === ym);
        const inflow = convert(pt?.income ?? 0, y, m);
        const outflow = convert(pt?.outcome ?? 0, y, m);
        return { key: d.key, name: d.label, inflow, outflow, surplus: inflow - outflow };
      })
      .filter((r) => r.inflow !== 0 || r.outflow !== 0)
      .sort((a, b) => b.inflow - a.inflow || b.outflow - a.outflow);
  }, [useReport, drillRow, drillGroup, reportQuery.data, convert]);

  /** 1차 표 합계(연 누계): 유입·유출은 합계, 누적 잔액은 마지막 달의 월말 잔액 */
  const summaryTotalRow: Partial<ChartRow> | undefined =
    chartData.length > 0
      ? {
          inflow: chartData.reduce((a, r) => a + r.inflow, 0),
          outflow: chartData.reduce((a, r) => a + r.outflow, 0),
          balance: chartData[chartData.length - 1].balance,
        }
      : undefined;

  const inflowName = t("cashFlowChart:cashInflow");
  const outflowName = t("cashFlowChart:cashOutflow");
  const balanceName = t("cashFlowChart:cumulativeCashBalance");

  let body: React.ReactNode;
  if (projectSelected) {
    body = <CenterNote text={t("cashFlowChart:noProjectCashflowAggregate")} />;
  } else if (emptyRange) {
    body = <CenterNote text={t("cashFlowChart:noDataForPeriod")} />;
  } else if (!config.enabled) {
    body = <CenterNote text={config.emptyMessage ?? t("cashFlowChart:noAggregateData")} />;
  } else if (query.isLoading) {
    body = <CenterNote text={t("cashFlowChart:loadingCashflow")} />;
  } else if (query.isError) {
    const status = (query.error as { response?: { status?: number } })?.response?.status;
    body = (
      <CenterNote
        text={status === 404 ? t("cashFlowChart:noCashflowDataForRange") : t("cashFlowChart:cashflowFetchError")}
      />
    );
  } else if (!hasData) {
    body = <CenterNote text={t("cashFlowChart:noCashflowDataForPeriod")} />;
  } else {
    body = (
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 20, right: 0, left: 0, bottom: 12 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.gridLine} vertical={false} />
          <XAxis dataKey="month" tick={{ fontSize: 11, fill: chartTheme.axisText }} axisLine={false} tickLine={false} />
          <YAxis
            yAxisId="flow"
            tick={{ fontSize: compact ? 9 : 11, fill: chartTheme.axisText }}
            width={compact ? 88 : 60}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => v.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          />
          <YAxis
            yAxisId="balance"
            orientation="right"
            tick={false}
            width={0}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{ fontSize: "12px" }}
            formatter={(value: number | string, name: string) => {
              const n = typeof value === "number" ? value : Number(value);
              const shown = name === outflowName ? Math.abs(n) : n;
              return [`${shown.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} ${unitLabel}`, name];
            }}
          />
          <ReferenceLine y={0} yAxisId="flow" stroke={chartTheme.zeroLine} />
          <Bar isAnimationActive={false} yAxisId="flow" dataKey="inflow" name={inflowName} fill={chartTheme.inflowBlue} barSize={16} radius={[2, 2, 0, 0]} />
          <Bar isAnimationActive={false} yAxisId="flow" dataKey="outflow" name={outflowName} fill={chartTheme.outflowRed} barSize={16} radius={[0, 0, 2, 2]} />
          <Line
            isAnimationActive={false}
            yAxisId="balance"
            type="monotone"
            dataKey="balance"
            name={balanceName}
            stroke={chartTheme.balanceNavy}
            strokeWidth={2}
            dot={{ r: 3, fill: chartTheme.balanceNavy }}
          >
            <LabelList dataKey="balance" content={makeBalanceLabel(compact)} />
          </Line>
        </ComposedChart>
      </ResponsiveContainer>
    );
  }

  return (
    <div style={{
      backgroundColor: "#fff",
      border: "1px solid #e2e9f3",
      borderRadius: "6px",
      padding: "10px 12px",
      height: "100%",
      boxSizing: "border-box",
      display: "flex",
      flexDirection: "column",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
          <span style={{ fontSize: "13px", fontWeight: "600", color: chartTheme.titleNavy }}>{t("common:cashFlow")}</span>
          <span style={{ fontSize: "11px", color: INK_MUTED }}>
            {config.label} · {t("common:unit")}: {unitLabel}
          </span>
        </div>
        <button
          onClick={() => setDetailOpen(true)}
          style={{ fontSize: "12px", color: "#2f7cf6", background: "none", border: "none", cursor: "pointer" }}
        >
          {t("cashFlowChart:viewDetails")}
        </button>
      </div>

      <div style={{ flex: 1, minHeight: "160px" }}>{body}</div>

      {/* Legend */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "4px" }}>
        {[
          { color: chartTheme.inflowBlue, label: inflowName, type: "rect" },
          { color: chartTheme.outflowRed, label: outflowName, type: "rect" },
          { color: chartTheme.balanceNavy, label: t("cashFlowChart:cumulativeCashBalanceRightAxis"), type: "line" },
        ].map((item) => (
          <div key={item.label} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            {item.type === "rect" ? (
              <div style={{ width: "14px", height: "10px", backgroundColor: item.color, borderRadius: "1px" }} />
            ) : (
              <div style={{ width: "18px", height: "2px", backgroundColor: item.color }} />
            )}
            <span style={{ fontSize: "12px", color: INK_MUTED }}>{item.label}</span>
          </div>
        ))}
      </div>

      {/* ── 1차 상세 모달: 월별 자금수지 요약 ── */}
      <DetailModal
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        title={t("common:cashFlow")}
        subtitle={`${config.label} · ${t("common:unit")}: ${unitLabel}`}
      >
        <DetailDataTable
          rowKey={(row) => String(row.month)}
          columns={[
            { key: "month", label: t("common:period"), align: "left" },
            { key: "inflow", label: inflowName, format: fmtInt },
            { key: "outflow", label: outflowName, format: fmtAbsInt },
            { key: "balance", label: balanceName, format: fmtInt },
          ]}
          rows={chartData}
          onRowClick={(row) => {
            if (hasDrilldown && isValidYm(row.rawMonth)) setDrillRow(row);
          }}
          isRowClickable={(row) => hasDrilldown && isValidYm(row.rawMonth)}
          totalRow={summaryTotalRow}
          totalLabel={t("cashFlowChart:annualTotal")}
        />
        {useReport && (
          <div style={{ padding: "10px 4px 0", fontSize: "11px", color: INK_MUTED }}>
            {t("cashFlowChart:reportSourceNote")}
          </div>
        )}
        {!hasDrilldown && (
          <div style={{ padding: "10px 4px 0", fontSize: "11px", color: INK_MUTED }}>
            {t("cashFlowChart:noProjectBreakdown")}
          </div>
        )}
      </DetailModal>

      {/* ── 2차/3차 드릴다운 (DECV 전체 = PIMSVINA Cash Flow Report): 그룹별 → 현장/항목별 ── */}
      <DetailModal
        open={useReport && drillRow != null}
        onClose={() => {
          setDrillRow(null);
          setDrillGroup(null);
        }}
        title={drillRow ? t("cashFlowChart:groupDetailTitle", { month: drillRow.month }) : ""}
        subtitle={`${config.label} · ${t("common:unit")}: ${unitLabel}`}
      >
        <DetailDataTable
          rowKey={(row) => row.key}
          columns={[
            { key: "name", label: t("cashFlowChart:colGroup"), align: "left" },
            { key: "inflow", label: t("cashFlowChart:colInflow"), format: fmtInt },
            { key: "outflow", label: t("cashFlowChart:colOutflow"), format: fmtInt },
            { key: "surplus", label: t("cashFlowChart:colSurplus"), format: fmtInt },
          ]}
          rows={reportGroupRows}
          onRowClick={(row) => setDrillGroup(row)}
          isRowClickable={(row) => row.inflow !== 0 || row.outflow !== 0}
          totalRow={sumRows(reportGroupRows)}
        />
      </DetailModal>
      <DetailModal
        open={useReport && drillRow != null && drillGroup != null}
        onClose={() => setDrillGroup(null)}
        title={
          drillRow && drillGroup
            ? t("cashFlowChart:groupItemDetailTitle", { group: drillGroup.name, month: drillRow.month })
            : ""
        }
        subtitle={`${config.label} · ${t("common:unit")}: ${unitLabel}`}
      >
        {reportDetailRows.length === 0 ? (
          <div style={{ ...emptyNote, padding: "28px 16px" }}>{t("cashFlowChart:noSiteData")}</div>
        ) : (
          <DetailDataTable
            rowKey={(row) => row.key}
            columns={[
              { key: "name", label: t("cashFlowChart:colSiteOrItem"), align: "left" },
              { key: "inflow", label: t("cashFlowChart:colInflow"), format: fmtInt },
              { key: "outflow", label: t("cashFlowChart:colOutflow"), format: fmtInt },
              { key: "surplus", label: t("cashFlowChart:colSurplus"), format: fmtInt },
            ]}
            rows={reportDetailRows}
            totalRow={sumRows(reportDetailRows)}
          />
        )}
      </DetailModal>

      {/* ── 2차 드릴다운 모달(부문 범위): 현장별 유입·유출 상세 ── */}
      <DetailModal
        open={!useReport && drillRow != null}
        onClose={() => setDrillRow(null)}
        title={drillRow ? t("cashFlowChart:siteDetailTitle", { month: drillRow.month }) : ""}
        subtitle={`${config.label} · ${t("common:unit")}: ${unitLabel}`}
      >
        {drillIsLoading ? (
          <div style={{ ...emptyNote, padding: "28px 16px" }}>
            {t("cashFlowChart:loadingSiteData")}
          </div>
        ) : drillIsError ? (
          <div style={{ ...emptyNote, padding: "28px 16px", color: ACHIEVE_RED }}>
            {t("cashFlowChart:cashflowFetchError")}
          </div>
        ) : drillRows.length === 0 ? (
          <div style={{ ...emptyNote, padding: "28px 16px" }}>
            {t("cashFlowChart:noSiteData")}
          </div>
        ) : (
          <DetailDataTable
            rowKey={(row) => row.name}
            columns={[
              { key: "name", label: t("cashFlowChart:colProject"), align: "left" },
              {
                key: "inflow",
                label: t("cashFlowChart:colInflow"),
                align: "right",
                format: (v) => typeof v === "number" ? v.toLocaleString("ko-KR", { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : "-",
              },
              {
                key: "outflow",
                label: t("cashFlowChart:colOutflow"),
                align: "right",
                format: (v) => typeof v === "number" ? v.toLocaleString("ko-KR", { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : "-",
              },
            ]}
            rows={drillRows}
            totalRow={{
              inflow: drillRows.reduce((a, r) => a + r.inflow, 0),
              outflow: drillRows.reduce((a, r) => a + r.outflow, 0),
            }}
          />
        )}
      </DetailModal>
    </div>
  );
}

function CenterNote({ text }: { text: string }) {
  return (
    <div style={{
      height: "100%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: "13px",
      color: INK_MUTED,
      textAlign: "center",
    }}>
      {text}
    </div>
  );
}
