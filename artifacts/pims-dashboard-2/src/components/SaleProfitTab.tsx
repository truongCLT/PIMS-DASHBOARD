import React from "react";
import { useTranslation } from "react-i18next";
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
import { cardStyle, sectionTitle } from "../lib/uiTokens";
import { tokens as aquaTokens } from "@workspace/aqua-glass";
const AG = aquaTokens.color.light;

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
        fontSize: "15px",
        color: error ? AG.destructive : AG.mutedForeground,
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
  const { t } = useTranslation(["saleProfitTab", "common"]);
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

  // 데이터 입력 탭의 월별 매출 (계획/실적) — 입력된 데이터가 있으면 최우선 사용
  const salesMap = new Map<string, { plan: number | null; actual: number | null }>();
  for (const s of pdDetail?.salesMonthly ?? []) {
    salesMap.set(`${s.year}-${s.month}`, { plan: s.plan ?? null, actual: s.actual ?? null });
  }
  const pdSalesHasAny = period.some(({ year, month }) => {
    const row = salesMap.get(`${year}-${month}`);
    return row != null && (row.plan != null || row.actual != null);
  });

  // sc 데이터가 기간 내에 하나라도 있으면 sc 우선, 없으면 mr 폴백
  const scHasAny =
    hasSite && period.some(({ year, month }) => scLookup(year, "revenue", month) !== 0);
  const lookup = scHasAny ? scLookup : mrLookup;

  // 원가율의 원가 소스는 매출 소스와 일치시킨다:
  // pd 매출 사용 시 → pd 월별 매출원가(회계), 아니면 sc/mr 원가
  const pdCogsLookup = new Map<string, number>();
  for (const c of pdDetail?.cogsMonthly ?? []) {
    if (c.acctCogs != null) pdCogsLookup.set(`${c.year}-${c.month}`, c.acctCogs);
  }
  const pdCogsHasAny = period.some(({ year, month }) => pdCogsLookup.has(`${year}-${month}`));

  let cumulative = 0;
  let cumCogs = 0;
  let cumPlan = 0;
  const chartData = period.map(({ year, month }) => {
    const pdRow = pdSalesHasAny ? salesMap.get(`${year}-${month}`) : undefined;
    const revenue = pdSalesHasAny ? (pdRow?.actual ?? 0) : lookup(year, "revenue", month);
    const plan = pdSalesHasAny ? (pdRow?.plan ?? 0) : 0;
    const cogs = pdSalesHasAny
      ? (pdCogsHasAny ? (pdCogsLookup.get(`${year}-${month}`) ?? 0) : 0)
      : lookup(year, "cogs", month);
    cumulative += revenue;
    cumCogs += cogs;
    cumPlan += plan;
    return {
      label: `'${String(year).slice(2)}.${String(month).padStart(2, "0")}`,
      revenue: Math.round(convert(revenue)),
      plan: Math.round(convert(plan)),
      cumulative: Math.round(convert(cumulative)),
      planCum: Math.round(convert(cumPlan)),
      // 누계 원가율 — 기간 초부터 해당 월까지 누적된 원가/매출 비율 (매월 갱신)
      // pd 매출 사용 중인데 pd 원가가 없으면 소스 불일치 방지를 위해 원가율 미표시
      ratio:
        cumulative > 0 && !(pdSalesHasAny && !pdCogsHasAny)
          ? Math.round((cumCogs / cumulative) * 1000) / 10
          : null,
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

  const hasData = chartData.some((d) => d.revenue !== 0 || d.cumulative !== 0 || d.plan !== 0);
  if (isLoading || pdLoading) {
    return (
      <div style={cardStyle}>
        <Notice>{t("saleProfitTab:loadingNotice")}</Notice>
      </div>
    );
  }
  if (hardError) {
    return (
      <div style={cardStyle}>
        <Notice error>{t("saleProfitTab:errorNotice")}</Notice>
      </div>
    );
  }
  if (!hasData && !hasCogs) {
    return (
      <div style={cardStyle}>
        <Notice>{t("saleProfitTab:noRevenueDataNotice")}</Notice>
      </div>
    );
  }

  const maxRevenue = Math.max(...chartData.map((d) => Math.max(d.revenue, d.plan)), 0);
  const maxCum = Math.max(...chartData.map((d) => Math.max(d.cumulative, d.planCum)), 0);
  const ratios = chartData.filter((d) => d.ratio != null).map((d) => d.ratio as number);
  const ratioMax = ratios.length > 0 ? Math.max(...ratios) : 100;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      {/* Monthly Revenue */}
      <div style={cardStyle}>
        <span style={sectionTitle}>{t("saleProfitTab:monthlyRevenueTitle", { unit: unitLabel })}</span>
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
              <Tooltip
                contentStyle={{ fontSize: "13px" }}
                formatter={(v: number, name: string) => [`${Math.round(v).toLocaleString()} ${unitLabel}`, name]}
              />
              <Legend wrapperStyle={{ fontSize: "12px" }} />
              {pdSalesHasAny && (
                <Bar dataKey="plan" name={t("saleProfitTab:monthlyPlan")} fill="#c9d2dd" barSize={14} isAnimationActive={false}>
                  <LabelList
                    dataKey="plan"
                    position="top"
                    style={{ fontSize: "11px", fill: chartTheme.axisText }}
                    formatter={(v: number) => (v !== 0 ? Math.round(v).toLocaleString() : "")}
                  />
                </Bar>
              )}
              <Bar
                dataKey="revenue"
                name={t("saleProfitTab:monthlyRevenue")}
                fill={chartTheme.planBlue}
                barSize={pdSalesHasAny ? 14 : 22}
                isAnimationActive={false}
              >
                <LabelList
                  dataKey="revenue"
                  position="top"
                  style={{ fontSize: "11px", fill: chartTheme.axisText }}
                  formatter={(v: number) => (v !== 0 ? Math.round(v).toLocaleString() : "")}
                />
              </Bar>
              <Line
                yAxisId="cum"
                dataKey="cumulative"
                name={t("common:cumulative")}
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
                  style={{ fontSize: "11px", fill: chartTheme.outflowRed }}
                  formatter={(v: number) => Math.round(v).toLocaleString()}
                />
              </Line>
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Cost — 회계 vs 집행(WIP) 매출원가 */}
      <div style={cardStyle}>
        <span style={sectionTitle}>{t("saleProfitTab:costTitle", { unit: unitLabel })}</span>
        {!hasCogs ? (
          <Notice>
            {t("saleProfitTab:noCogsDataNotice")}
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
                <Tooltip
                  contentStyle={{ fontSize: "13px" }}
                  formatter={(v: number, name: string) => [`${Math.round(v).toLocaleString()} ${unitLabel}`, name]}
                />
                <Legend wrapperStyle={{ fontSize: "12px" }} />
                <Bar dataKey="acctCogs" name={t("saleProfitTab:acctCogs")} fill={chartTheme.planBlue} barSize={14} isAnimationActive={false}>
                  <LabelList
                    dataKey="acctCogs"
                    position="top"
                    style={{ fontSize: "11px", fill: chartTheme.axisText }}
                    formatter={(v: number) => (v !== 0 ? Math.round(v).toLocaleString() : "")}
                  />
                </Bar>
                <Bar dataKey="wipCogs" name={t("saleProfitTab:wipCogs")} fill={chartTheme.actualGreen} barSize={14} isAnimationActive={false}>
                  <LabelList
                    dataKey="wipCogs"
                    position="top"
                    style={{ fontSize: "11px", fill: chartTheme.axisText }}
                    formatter={(v: number) => (v !== 0 ? Math.round(v).toLocaleString() : "")}
                  />
                </Bar>
                <Line
                  yAxisId="cum"
                  dataKey="acctCum"
                  name={t("saleProfitTab:acctCogsCum")}
                  type="monotone"
                  stroke={chartTheme.outflowRed}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  isAnimationActive={false}
                />
                <Line
                  yAxisId="cum"
                  dataKey="wipCum"
                  name={t("saleProfitTab:wipCogsCum")}
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
        <span style={sectionTitle}>{t("saleProfitTab:costRatioTitle")}</span>
        {ratios.length === 0 ? (
          <Notice>{t("saleProfitTab:noCostRatioDataNotice")}</Notice>
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
                <Tooltip
                  contentStyle={{ fontSize: "13px" }}
                  formatter={(v) => `${Number(v).toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`}
                />
                <Line
                  dataKey="ratio"
                  name={t("saleProfitTab:cumulativeCostRatio")}
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
                          {Number(value).toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%
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
