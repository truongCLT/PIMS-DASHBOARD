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
} from "@workspace/api-client-react";
import type { DashboardScope } from "./Sidebar";
import { PROJECT_GROUPS } from "../data/projects";
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

type TFunc = ReturnType<typeof useTranslation>["t"];

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
      {Math.round(value).toLocaleString()}
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

export function CashFlowChart({ scope = "전체" }: { scope?: DashboardScope }) {
  const { t } = useTranslation(["cashFlowChart", "common"]);
  const [detailOpen, setDetailOpen] = useState(false);
  const [drillRow, setDrillRow] = useState<ChartRow | null>(null);

  const config = getScopeConfig(scope, t);
  const filters = useDashboardFilters();
  const { from, to } = resolveMonthWindow(filters.startYm, filters.endYm);
  const emptyRange = from > to;
  const projectSelected = filters.project !== "All";
  const compact = filters.unitIndex === 1;
  const convert = makeConverter(filters.currency, filters.unitIndex, filters.fxRates);
  const unitLabel =
    filters.currency === "USD" && filters.unitIndex === 0
      ? t("cashFlowChart:thousandUsd")
      : unitLabelOf(filters.currency, filters.unitIndex);

  const hasCustomRange = filters.startYm !== "" || filters.endYm !== "";
  const fromMonth = hasCustomRange && !emptyRange ? from : 1;
  const months = hasCustomRange && !emptyRange ? to - from + 1 : 6;

  const enabled = config.enabled && !projectSelected && !emptyRange;
  const params = {
    division: config.division,
    divisions: config.divisions,
    names: config.names,
    fromYear: REPORT_YEAR,
    fromMonth,
    months,
  };
  const query = useGetCashflowAggregate(params, {
    query: { queryKey: getGetCashflowAggregateQueryKey(params), enabled },
  });

  const points = query.data?.points ?? [];
  const chartData: ChartRow[] = points.map((p) => ({
    month: monthLabel(p.month, t),
    rawMonth: p.month,
    inflow: convert(p.cashIn),
    outflow: -convert(p.cashOut),
    balance: convert(p.equivalent),
  }));
  const hasData = chartData.some((d) => d.inflow !== 0 || d.outflow !== 0 || d.balance !== 0);

  /* ── 현장별 드릴다운: 진행중 스코프만 지원 ── */
  const drillRefs = useMemo(() => {
    if (scope === "시공-진행중") return getOngoingRefs("시공");
    if (scope === "용역-진행중") return getOngoingRefs("용역");
    return [];
  }, [scope]);
  const hasDrilldown = drillRefs.length > 0 && enabled;

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
    return drillRefs
      .map((ref, i) => {
        const qData = projectQueries[i]?.data;
        const pt = qData?.points.find((p) => p.month === ym);
        return {
          name: ref.name,
          inflow: Math.round(convert(pt?.cashIn ?? 0)),
          outflow: Math.round(convert(pt?.cashOut ?? 0)),
        };
      })
      .filter((r) => r.inflow !== 0 || r.outflow !== 0)
      .sort((a, b) => b.inflow - a.inflow);
  }, [drillRow, hasDrilldown, drillRefs, projectQueries, convert]);

  const drillIsLoading = projectQueries.some((q) => q.isLoading);
  const drillIsError = projectQueries.some((q) => q.isError);

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
            tickFormatter={(v: number) => v.toLocaleString()}
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
              return [`${Math.round(shown).toLocaleString()} ${unitLabel}`, name];
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
            { key: "inflow", label: inflowName },
            { key: "outflow", label: outflowName },
            { key: "balance", label: balanceName },
          ]}
          rows={chartData}
          onRowClick={(row) => {
            if (hasDrilldown && isValidYm(row.rawMonth)) setDrillRow(row);
          }}
          isRowClickable={(row) => hasDrilldown && isValidYm(row.rawMonth)}
        />
        {!hasDrilldown && (
          <div style={{ padding: "10px 4px 0", fontSize: "11px", color: INK_MUTED }}>
            {t("cashFlowChart:noProjectBreakdown")}
          </div>
        )}
      </DetailModal>

      {/* ── 2차 드릴다운 모달: 현장별 유입·유출 상세 ── */}
      <DetailModal
        open={drillRow != null}
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
                format: (v) => typeof v === "number" ? v.toLocaleString("ko-KR") : "-",
              },
              {
                key: "outflow",
                label: t("cashFlowChart:colOutflow"),
                align: "right",
                format: (v) => typeof v === "number" ? v.toLocaleString("ko-KR") : "-",
              },
            ]}
            rows={drillRows}
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
