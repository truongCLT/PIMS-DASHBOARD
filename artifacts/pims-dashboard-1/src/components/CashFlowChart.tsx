import React, { useState } from "react";
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
import { DetailModal, DetailDataTable } from "./DetailModal";
import {
  useGetCashflowAggregate,
  getGetCashflowAggregateQueryKey,
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

/** 화면에 표시할 scope 라벨 (scope 값 자체는 비교/조회용 식별자이므로 변경하지 않음) */
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
  return t("cashFlowChart:monthLabel", { month: m });
}

export function CashFlowChart({ scope = "전체" }: { scope?: DashboardScope }) {
  const { t } = useTranslation(["cashFlowChart", "common"]);
  const [detailOpen, setDetailOpen] = useState(false);
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

  // 기간 필터 미설정 시 기존 기본값(1월부터 6개월) 유지
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
  const chartData = points.map((p) => ({
    month: monthLabel(p.month, t),
    inflow: convert(p.cashIn),
    outflow: -convert(p.cashOut),
    balance: convert(p.equivalent),
  }));
  const hasData = chartData.some((d) => d.inflow !== 0 || d.outflow !== 0 || d.balance !== 0);

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
            tick={{ fontSize: compact ? 9 : 11, fill: chartTheme.balanceNavy }}
            width={compact ? 88 : 60}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => v.toLocaleString()}
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
          <span style={{ fontSize: "11px", color: "#7c8ba3" }}>
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
            <span style={{ fontSize: "12px", color: "#555" }}>{item.label}</span>
          </div>
        ))}
      </div>

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
        />
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
      color: "#7c8ba3",
      textAlign: "center",
    }}>
      {text}
    </div>
  );
}
