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
  const chartData = period.map(({ year, month }) => {
    const revenue = lookup(year, "revenue", month);
    const cogs = lookup(year, "cogs", month);
    cumulative += revenue;
    return {
      label: `'${String(year).slice(2)}.${String(month).padStart(2, "0")}`,
      revenue: Math.round(revenue * 10) / 10,
      cumulative: Math.round(cumulative * 10) / 10,
      ratio: revenue > 0 ? Math.round((cogs / revenue) * 1000) / 10 : null,
    };
  });

  const hasData = chartData.some((d) => d.revenue !== 0 || d.cumulative !== 0);
  if (isLoading) {
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
  if (!hasData) {
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
        <span style={sectionTitle}>Monthly Revenue (천 USD)</span>
        <div style={{ width: "100%", height: "260px", marginTop: "8px" }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 30, right: 40, left: 40, bottom: 0 }}>
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: chartTheme.axisText }}
                tickLine={false}
                axisLine={{ stroke: chartTheme.axisLine }}
              />
              <YAxis hide domain={[0, Math.max(maxRevenue * 1.25, 1)]} />
              <YAxis yAxisId="cum" hide domain={[0, Math.max(maxCum * 1.15, 1)]} />
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
                  formatter={(v: number) => v.toLocaleString()}
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
                  style={{ fontSize: "9px", fill: chartTheme.outflowRed }}
                  formatter={(v: number) => v.toLocaleString()}
                />
              </Line>
            </ComposedChart>
          </ResponsiveContainer>
        </div>
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
                  name="원가율"
                  type="monotone"
                  stroke={chartTheme.profitGreen}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  connectNulls
                  isAnimationActive={false}
                >
                  <LabelList
                    dataKey="ratio"
                    position="top"
                    style={{ fontSize: "9px", fill: chartTheme.profitGreen }}
                    formatter={(v: number) => `${v}%`}
                  />
                </Line>
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
