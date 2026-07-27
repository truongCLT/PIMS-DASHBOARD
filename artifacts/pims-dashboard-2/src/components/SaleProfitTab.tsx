import React from "react";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LabelList,
  Legend,
} from "recharts";
import {
  useListSalescostSites,
  getListSalescostSitesQueryKey,
} from "@workspace/api-client-react";
import { useMrProject } from "../data/mrProjectLinks";
import { REPORT_YEAR } from "../lib/mgmtreportData";
import { chartTheme } from "../lib/chartTheme";
import { useMoney } from "../lib/displayUnit";
import { useProjectDetail } from "../lib/projectDetailData";
import { ProjectCommentPanel } from "./ProjectCommentPanel";

const cardStyle: React.CSSProperties = {
  backgroundColor: "#fff",
  border: "1px solid #d0dce8",
  borderRadius: "6px",
  padding: "10px 12px",
};

const sectionTitle: React.CSSProperties = {
  fontSize: "11px",
  fontWeight: 600,
  color: "#4472c4",
};

function useSiteMonths(year: number, metric: "revenue" | "cogs", enabled: boolean) {
  const params = { year, metric };
  return useListSalescostSites(params, {
    query: { enabled, queryKey: getListSalescostSitesQueryKey(params) },
  });
}

function Notice({ children, error }: { children: React.ReactNode; error?: boolean }) {
  return (
    <div
      style={{
        padding: "60px 20px",
        textAlign: "center",
        fontSize: "13px",
        color: error ? "#c0392b" : "#5a6a7e",
      }}
    >
      {children}
    </div>
  );
}

export function SaleProfitTab({
  projectName,
  fromYear,
  fromMonth,
  months,
}: {
  projectName: string;
  fromYear: number;
  fromMonth: number;
  months: number;
}) {
  const { convert, unitLabel } = useMoney();
  const { detail: pdDetail, isLoading: pdLoading } = useProjectDetail(projectName);
  // Build the requested (year, month) list from the period filter
  const period: { year: number; month: number }[] = [];
  {
    let y = fromYear;
    let m = fromMonth;
    for (let i = 0; i < months; i++) {
      period.push({ year: y, month: m });
      m++;
      if (m > 12) {
        m = 1;
        y++;
      }
    }
  }
  // A 24-month capped range spans at most 3 calendar years — one fixed query slot per year
  const years = [...new Set(period.map((p) => p.year))];
  const yearA = years[0];
  const yearB = years[1] ?? null;
  const yearC = years[2] ?? null;

  // mr_projects.site_code 로 sc_sites 자동 연결 (기준 연도 목록에서 siteCode 조회)
  const mrMain = useMrProject(projectName, REPORT_YEAR);
  const siteCode = mrMain.project?.siteCode ?? null;
  const hasSite = siteCode != null;

  const revA = useSiteMonths(yearA, "revenue", hasSite);
  const cogsA = useSiteMonths(yearA, "cogs", hasSite);
  const revB = useSiteMonths(yearB ?? 0, "revenue", hasSite && yearB != null);
  const cogsB = useSiteMonths(yearB ?? 0, "cogs", hasSite && yearB != null);
  const revC = useSiteMonths(yearC ?? 0, "revenue", hasSite && yearC != null);
  const cogsC = useSiteMonths(yearC ?? 0, "cogs", hasSite && yearC != null);

  // sc 데이터가 없을 때 폴백: mr_monthly (경영관리보고회 프로젝트별 월별 매출/원가 실적)
  const mrA = useMrProject(projectName, yearA);
  const mrB = useMrProject(projectName, yearB ?? 0, yearB != null);
  const mrC = useMrProject(projectName, yearC ?? 0, yearC != null);

  const queries = [
    ...(hasSite
      ? [revA, cogsA, ...(yearB != null ? [revB, cogsB] : []), ...(yearC != null ? [revC, cogsC] : [])]
      : []),
    mrMain,
    mrA,
    ...(yearB != null ? [mrB] : []),
    ...(yearC != null ? [mrC] : []),
  ];
  const isLoading = queries.some((q) => q.isLoading);
  // 404 (해당 연도 데이터 없음) is treated as "no data", not a failure
  const hardError = queries.some((q) =>
    "isError" in q && typeof q.isError === "boolean"
      ? q.isError && ((q as { error?: { status?: number } | null }).error?.status ?? 0) !== 404
      : false,
  );

  const scLookup = (year: number, metric: "revenue" | "cogs", month: number): number => {
    const q =
      year === yearA
        ? metric === "revenue"
          ? revA
          : cogsA
        : year === yearB
          ? metric === "revenue"
            ? revB
            : cogsB
          : year === yearC
            ? metric === "revenue"
              ? revC
              : cogsC
            : null;
    const site = q?.data?.sites.find((s) => s.code === siteCode);
    return site?.months[month - 1] ?? 0;
  };

  const mrLookup = (year: number, metric: "revenue" | "cogs", month: number): number => {
    const q = year === yearA ? mrA : year === yearB ? mrB : year === yearC ? mrC : null;
    const arr = metric === "revenue" ? q?.project?.revenueActual : q?.project?.cogsActual;
    return arr?.[month - 1] ?? 0;
  };

  // sc 데이터가 기간 내에 하나라도 있으면 sc 우선, 없으면 mr 폴백
  const scHasAny =
    hasSite && period.some(({ year, month }) => scLookup(year, "revenue", month) !== 0);
  const lookup = scHasAny ? scLookup : mrLookup;

  let cumulative = 0;
  let cumCogs = 0;
  const chartData = period.map(({ year, month }) => {
    const revenue = lookup(year, "revenue", month);
    const cogs = lookup(year, "cogs", month);
    cumulative += revenue;
    cumCogs += cogs;
    return {
      label: `'${String(year).slice(2)}.${String(month).padStart(2, "0")}`,
      revenue: Math.round(convert(revenue)),
      cumulative: Math.round(convert(cumulative)),
      // 누계 원가율 — 기간 초부터 해당 월까지 누적된 원가/매출 비율 (매월 갱신)
      ratio: cumulative > 0 ? Math.round((cumCogs / cumulative) * 1000) / 10 : null,
    };
  });
  let lastRatioIdx = -1;
  chartData.forEach((d, i) => {
    if (d.ratio != null) lastRatioIdx = i;
  });

  // 데이터 입력 탭의 월별 매출원가 (회계 vs 집행 WIP) — Cost 차트
  const cogsMap = new Map<string, { acctCogs: number | null; wipCogs: number | null }>();
  for (const c of pdDetail?.cogsMonthly ?? []) {
    cogsMap.set(`${c.year}-${c.month}`, { acctCogs: c.acctCogs ?? null, wipCogs: c.wipCogs ?? null });
  }
  let cumAcct = 0;
  let cumWip = 0;
  const cogsChartData = period.map(({ year, month }) => {
    const row = cogsMap.get(`${year}-${month}`);
    cumAcct += row?.acctCogs ?? 0;
    cumWip += row?.wipCogs ?? 0;
    return {
      label: `'${String(year).slice(2)}.${String(month).padStart(2, "0")}`,
      acctCogs: row?.acctCogs != null ? Math.round(convert(row.acctCogs)) : 0,
      wipCogs: row?.wipCogs != null ? Math.round(convert(row.wipCogs)) : 0,
      acctCum: Math.round(convert(cumAcct)),
      wipCum: Math.round(convert(cumWip)),
    };
  });
  const hasCogs = cogsChartData.some((d) => d.acctCogs !== 0 || d.wipCogs !== 0);

  const hasData = chartData.some((d) => d.revenue !== 0 || d.cumulative !== 0);
  if (isLoading || pdLoading) {
    return (
      <div style={cardStyle}>
        <Notice>매출/원가 데이터를 불러오는 중입니다…</Notice>
      </div>
    );
  }
  if (hardError) {
    return (
      <div style={cardStyle}>
        <Notice error>매출/원가 데이터 조회에 실패했습니다. 잠시 후 다시 시도해 주세요.</Notice>
      </div>
    );
  }
  if (!hasData && !hasCogs) {
    return (
      <div style={cardStyle}>
        <Notice>선택한 기간에 매출 데이터가 없습니다.</Notice>
      </div>
    );
  }

  const maxRevenue = Math.max(...chartData.map((d) => d.revenue), 0);
  const maxCum = Math.max(...chartData.map((d) => d.cumulative), 0);
  const ratios = chartData.filter((d) => d.ratio != null).map((d) => d.ratio as number);
  const ratioMax = ratios.length > 0 ? Math.max(...ratios) : 100;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      {/* Monthly Revenue */}
      <div style={cardStyle}>
        <span style={sectionTitle}>Monthly Revenue ({unitLabel})</span>
        <div style={{ width: "100%", height: "260px", marginTop: "8px" }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 30, right: 40, left: 40, bottom: 0 }}>
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: chartTheme.axisText }}
                tickLine={false}
                axisLine={{ stroke: chartTheme.axisLine }}
              />
              {/* 막대는 아래쪽 절반, 누계 선은 위쪽에 배치해 숫자 겹침 방지 */}
              <YAxis hide domain={[0, Math.max(maxRevenue * 2.4, 1)]} />
              <YAxis yAxisId="cum" hide domain={[0, Math.max(maxCum * 1.1, 1)]} />
              <Tooltip contentStyle={{ fontSize: "11px" }} />
              <Legend wrapperStyle={{ fontSize: "10px" }} />
              <Bar
                dataKey="revenue"
                name="월 매출"
                fill={chartTheme.planBlue}
                barSize={22}
                isAnimationActive={false}
              >
                <LabelList
                  dataKey="revenue"
                  position="top"
                  style={{ fontSize: "9px", fill: chartTheme.axisText }}
                  formatter={(v: number) => Math.round(v).toLocaleString()}
                />
              </Bar>
              <Line
                yAxisId="cum"
                dataKey="cumulative"
                name="누계"
                type="monotone"
                stroke={chartTheme.outflowRed}
                strokeWidth={2}
                dot={{ r: 3 }}
                isAnimationActive={false}
              >
                <LabelList
                  dataKey="cumulative"
                  position="top"
                  offset={8}
                  style={{ fontSize: "9px", fill: chartTheme.outflowRed }}
                  formatter={(v: number) => Math.round(v).toLocaleString()}
                />
              </Line>
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Cost — 회계 vs 집행(WIP) 매출원가 */}
      <div style={cardStyle}>
        <span style={sectionTitle}>Cost ({unitLabel})</span>
        {!hasCogs ? (
          <Notice>
            선택한 기간에 매출원가 데이터가 없습니다. 관리자 모드로 로그인하면 "데이터 입력" 탭의 "월별 매출원가" 표에서 입력할 수 있습니다.
          </Notice>
        ) : (
          <div style={{ width: "100%", height: "260px", marginTop: "8px" }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={cogsChartData} margin={{ top: 30, right: 40, left: 40, bottom: 0 }}>
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: chartTheme.axisText }}
                  tickLine={false}
                  axisLine={{ stroke: chartTheme.axisLine }}
                />
                <YAxis
                  hide
                  domain={[0, Math.max(...cogsChartData.map((d) => Math.max(d.acctCogs, d.wipCogs)), 1) * 2.4]}
                />
                <YAxis
                  yAxisId="cum"
                  hide
                  domain={[0, Math.max(...cogsChartData.map((d) => Math.max(d.acctCum, d.wipCum)), 1) * 1.1]}
                />
                <Tooltip contentStyle={{ fontSize: "11px" }} />
                <Legend wrapperStyle={{ fontSize: "10px" }} />
                <Bar dataKey="acctCogs" name="회계 매출원가" fill={chartTheme.planBlue} barSize={14} isAnimationActive={false}>
                  <LabelList
                    dataKey="acctCogs"
                    position="top"
                    style={{ fontSize: "9px", fill: chartTheme.axisText }}
                    formatter={(v: number) => (v !== 0 ? Math.round(v).toLocaleString() : "")}
                  />
                </Bar>
                <Bar dataKey="wipCogs" name="집행 매출원가 (WIP)" fill={chartTheme.actualGreen} barSize={14} isAnimationActive={false}>
                  <LabelList
                    dataKey="wipCogs"
                    position="top"
                    style={{ fontSize: "9px", fill: chartTheme.axisText }}
                    formatter={(v: number) => (v !== 0 ? Math.round(v).toLocaleString() : "")}
                  />
                </Bar>
                <Line
                  yAxisId="cum"
                  dataKey="acctCum"
                  name="회계 매출원가 누계"
                  type="monotone"
                  stroke={chartTheme.outflowRed}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  isAnimationActive={false}
                />
                <Line
                  yAxisId="cum"
                  dataKey="wipCum"
                  name="집행 매출원가 (WIP) 누계"
                  type="monotone"
                  stroke={chartTheme.sgaOrange}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  isAnimationActive={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Cost ratio */}
      <div style={cardStyle}>
        <span style={sectionTitle}>Cost Ratio (원가율, %)</span>
        {ratios.length === 0 ? (
          <Notice>선택한 기간에 원가율을 계산할 매출 데이터가 없습니다.</Notice>
        ) : (
          <div style={{ width: "100%", height: "220px", marginTop: "8px" }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 30, right: 40, left: 40, bottom: 0 }}>
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: chartTheme.axisText }}
                  tickLine={false}
                  axisLine={{ stroke: chartTheme.axisLine }}
                />
                <YAxis hide domain={[0, Math.max(ratioMax * 1.3, 10)]} />
                <Tooltip contentStyle={{ fontSize: "11px" }} formatter={(v) => `${v}%`} />
                <Line
                  dataKey="ratio"
                  name="누계 원가율"
                  type="monotone"
                  stroke={chartTheme.profitGreen}
                  strokeWidth={2}
                  dot={(props: { cx?: number; cy?: number; index?: number; key?: string }) => {
                    const { cx, cy, index, key } = props;
                    if (cx == null || cy == null) return <g key={key} />;
                    const isLast = index === lastRatioIdx;
                    return (
                      <circle
                        key={key}
                        cx={cx}
                        cy={cy}
                        r={isLast ? 6 : 3}
                        fill={isLast ? chartTheme.sgaOrange : chartTheme.profitGreen}
                        stroke="#fff"
                        strokeWidth={isLast ? 2 : 0}
                      />
                    );
                  }}
                  connectNulls
                  isAnimationActive={false}
                >
                  <LabelList
                    dataKey="ratio"
                    content={(props) => {
                      const { x, y, value, index } = props as { x?: number; y?: number; value?: number | null; index?: number };
                      if (value == null || x == null || y == null) return null;
                      const isLast = index === lastRatioIdx;
                      return (
                        <text
                          x={x}
                          y={y - (isLast ? 14 : 10)}
                          textAnchor="middle"
                          fontSize={isLast ? 14 : 9}
                          fontWeight={isLast ? 700 : 400}
                          fill={isLast ? chartTheme.sgaOrange : chartTheme.profitGreen}
                        >
                          {value}%
                        </text>
                      );
                    }}
                  />
                </Line>
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Comment */}
      <div style={cardStyle}>
        <ProjectCommentPanel projectName={projectName} tab="saleprofit" />
      </div>
    </div>
  );
}
