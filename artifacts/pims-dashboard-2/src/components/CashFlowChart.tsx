import React from "react";
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

function getScopeConfig(scope: DashboardScope): ScopeQueryConfig {
  if (scope === "시공-종료" || scope === "용역-종료") {
    return {
      label: scope.replace("-", " "),
      enabled: false,
      emptyMessage: "종료된 프로젝트가 없어 집계 데이터가 없습니다.",
    };
  }
  if (scope === "시공-진행중" || scope === "용역-진행중") {
    const divisionLabel = scope.startsWith("시공") ? "시공" : "용역";
    const refs = getOngoingRefs(divisionLabel);
    if (refs.length === 0) {
      return {
        label: scope.replace("-", " "),
        enabled: false,
        emptyMessage: "진행중 프로젝트의 자금수지 데이터가 없습니다.",
      };
    }
    return {
      label: scope.replace("-", " "),
      enabled: true,
      division: refs[0].division,
      names: refs.map((r) => r.name).join(","),
    };
  }
  return {
    label: scope === "전체" ? "DECV 전체" : scope,
    enabled: true,
    ...BASE_SCOPE_PARAMS[scope],
  };
}

const InflowLabel = (props: any) => {
  const { x, y, width, value } = props;
  if (!value) return null;
  return (
    <text x={x + width / 2} y={y - 3} fill={chartTheme.inflowBlue} textAnchor="middle" fontSize={8} fontWeight="600">
      +{Math.round(value).toLocaleString()}
    </text>
  );
};

const OutflowLabel = (props: any) => {
  const { x, y, width, height, value } = props;
  if (!value) return null;
  const bottom = Math.max(y, y + height);
  return (
    <text x={x + width / 2} y={bottom + 9} fill={chartTheme.outflowRed} textAnchor="middle" fontSize={8} fontWeight="600">
      {Math.round(value).toLocaleString()}
    </text>
  );
};

function monthLabel(ym: string): string {
  const m = Number(ym.slice(5, 7));
  return `${m}월`;
}

export function CashFlowChart({ scope = "전체" }: { scope?: DashboardScope }) {
  const config = getScopeConfig(scope);
  const filters = useDashboardFilters();
  const { from, to } = resolveMonthWindow(filters.startYm, filters.endYm);
  const emptyRange = from > to;
  const projectSelected = filters.project !== "All";
  const convert = makeConverter(filters.currency, filters.unitIndex, filters.fxRates);
  const unitLabel =
    filters.currency === "USD" && filters.unitIndex === 0
      ? "천 USD"
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
    month: monthLabel(p.month),
    inflow: convert(p.cashIn),
    outflow: -convert(p.cashOut),
    balance: convert(p.equivalent),
  }));
  const hasData = chartData.some((d) => d.inflow !== 0 || d.outflow !== 0 || d.balance !== 0);

  let body: React.ReactNode;
  if (projectSelected) {
    body = <CenterNote text="프로젝트별 자금수지 집계는 제공되지 않습니다." />;
  } else if (emptyRange) {
    body = <CenterNote text="선택한 기간에 데이터가 없습니다." />;
  } else if (!config.enabled) {
    body = <CenterNote text={config.emptyMessage ?? "집계 데이터가 없습니다."} />;
  } else if (query.isLoading) {
    body = <CenterNote text="자금수지 데이터를 불러오는 중..." />;
  } else if (query.isError) {
    const status = (query.error as { response?: { status?: number } })?.response?.status;
    body = (
      <CenterNote
        text={status === 404 ? "해당 범위의 자금수지 데이터가 없습니다." : "자금수지 데이터 조회 중 오류가 발생했습니다."}
      />
    );
  } else if (!hasData) {
    body = <CenterNote text="선택한 기간에 자금수지 데이터가 없습니다." />;
  } else {
    body = (
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 20, right: 10, left: 0, bottom: 12 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.gridLine} vertical={false} />
          <XAxis dataKey="month" tick={{ fontSize: 10, fill: chartTheme.axisText }} axisLine={false} tickLine={false} />
          <YAxis
            tick={{ fontSize: 10, fill: chartTheme.axisText }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => v.toLocaleString()}
          />
          <Tooltip
            contentStyle={{ fontSize: "11px" }}
            formatter={(value: number | string, name: string) => {
              const n = typeof value === "number" ? value : Number(value);
              const shown = name === "자금 유출" ? Math.abs(n) : n;
              return [`${Math.round(shown).toLocaleString()} ${unitLabel}`, name];
            }}
          />
          <ReferenceLine y={0} stroke={chartTheme.zeroLine} />
          <Bar isAnimationActive={false} dataKey="inflow" name="자금 유입" fill={chartTheme.inflowBlue} barSize={16} radius={[2, 2, 0, 0]}>
            <LabelList dataKey="inflow" content={InflowLabel} />
          </Bar>
          <Bar isAnimationActive={false} dataKey="outflow" name="자금 유출" fill={chartTheme.outflowRed} barSize={16} radius={[0, 0, 2, 2]}>
            <LabelList dataKey="outflow" content={OutflowLabel} />
          </Bar>
          <Line
            isAnimationActive={false}
            type="monotone"
            dataKey="balance"
            name="누적 현금 잔액"
            stroke={chartTheme.balanceNavy}
            strokeWidth={2}
            dot={{ r: 3, fill: chartTheme.balanceNavy }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    );
  }

  return (
    <div style={{
      backgroundColor: "#fff",
      border: "1px solid #d0dce8",
      borderRadius: "6px",
      padding: "10px 12px",
      height: "100%",
      boxSizing: "border-box",
      display: "flex",
      flexDirection: "column",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
          <span style={{ fontSize: "12px", fontWeight: "600", color: chartTheme.titleNavy }}>자금수지</span>
          <span style={{ fontSize: "10px", color: "#5a6a7e" }}>
            {config.label} · 단위: {unitLabel}
          </span>
        </div>
        <button style={{ fontSize: "11px", color: "#1e6fdd", background: "none", border: "none", cursor: "pointer" }}>
          상세보기
        </button>
      </div>

      <div style={{ flex: 1, minHeight: "160px" }}>{body}</div>

      {/* Legend */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "4px" }}>
        {[
          { color: chartTheme.inflowBlue, label: "자금 유입", type: "rect" },
          { color: chartTheme.outflowRed, label: "자금 유출", type: "rect" },
          { color: chartTheme.balanceNavy, label: "누적 현금 잔액", type: "line" },
        ].map((item) => (
          <div key={item.label} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            {item.type === "rect" ? (
              <div style={{ width: "14px", height: "10px", backgroundColor: item.color, borderRadius: "1px" }} />
            ) : (
              <div style={{ width: "18px", height: "2px", backgroundColor: item.color }} />
            )}
            <span style={{ fontSize: "11px", color: "#555" }}>{item.label}</span>
          </div>
        ))}
      </div>
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
      fontSize: "12px",
      color: "#5a6a7e",
      textAlign: "center",
    }}>
      {text}
    </div>
  );
}
