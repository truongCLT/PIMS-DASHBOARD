import React, { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  ComposedChart,
  Line,
  Bar,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  LabelList,
  Cell,
} from "recharts";
import {
  useListMgmtreportProjects,
  getListMgmtreportProjectsQueryKey,
} from "@workspace/api-client-react";
import { useDashboardData, type SalesRow, REPORT_YEAR } from "../lib/mgmtreportData";
import { useDashboardFilters, makeConverter } from "../lib/dashboardFilters";
import { resolveProjectBusinessType } from "../data/projects";
import { chartTheme, chartTypography } from "../lib/chartTheme";
import { useTheme } from "../lib/theme";
import {
  ChartTooltip,
  ChartTooltipPanel,
} from "@workspace/aqua-glass/components/ui/chart";
import {
  Empty,
  EmptyDescription,
} from "@workspace/aqua-glass/components/ui/empty";
import { DetailModal, DetailDataTable } from "./DetailModal";
import { emptyNote, ACHIEVE_RED, INK_MUTED, INK_NAVY, INK_SECONDARY, CARD_BORDER, DIVIDER } from "../lib/uiTokens";

const PLAN_COLOR = chartTheme.planBlue;
const ACTUAL_COLOR = chartTheme.actualGreen;
const RATE_COLOR = chartTheme.rateOrange;

/* Badge label above dot */
const BadgeLabel = (fill: string, compact = false, n = 12) => (props: any) => {
  const { x, y, value } = props;
  if (value == null || x == null || y == null) return null;
  const text = Number(value).toLocaleString("ko-KR", { minimumFractionDigits: 0, maximumFractionDigits: 1 });
  const colPitch = Math.max(20, 320 / Math.max(1, n));
  const maxFs = chartTypography.value;
  const fontSize = Math.max(7.5, Math.min(maxFs, colPitch / (text.length * 0.62)));
  const charW = fontSize * 0.62;
  const h = fontSize + 7;
  const w = Math.max(20, text.length * charW + 8);
  const bx = x - w / 2;
  const by = y - h - 9;
  return (
    <g>
      <rect x={bx} y={by} width={w} height={h} rx={5} fill={fill} />
      <path d={`M ${x - 4} ${by + h - 0.5} L ${x + 4} ${by + h - 0.5} L ${x} ${by + h + 4.5} Z`} fill={fill} />
      <text
        x={x}
        y={by + h / 2 + 0.5}
        textAnchor="middle"
        dominantBaseline="central"
        fill="#fff"
        fontSize={fontSize}
        fontFamily={chartTypography.fontFamily}
        fontWeight={700}
      >
        {text}
      </text>
    </g>
  );
};

const makePlanRateLabel = (chartData: SalesRow[]) => (props: any) => {
  const { x, y, index } = props;
  if (x == null || y == null || index == null) return null;
  const d = chartData[index];
  if (!d || d.rate == null || d.plan == null || d.actual == null) return null;
  if (d.plan > d.actual) return null;
  return (
    <text x={x} y={y + 18} textAnchor="middle" fill={RATE_COLOR} fontSize={chartTypography.rate} fontFamily={chartTypography.fontFamily} fontWeight={700}>
      {d.rate}%
    </text>
  );
};

const makeActualRateLabel = (chartData: SalesRow[]) => (props: any) => {
  const { x, y, index } = props;
  if (x == null || y == null || index == null) return null;
  const d = chartData[index];
  if (!d || d.rate == null || d.plan == null || d.actual == null) return null;
  if (d.actual >= d.plan) return null;
  return (
    <text x={x} y={y + 18} textAnchor="middle" fill={RATE_COLOR} fontSize={chartTypography.rate} fontFamily={chartTypography.fontFamily} fontWeight={700}>
      {d.rate}%
    </text>
  );
};

/* Custom Tooltip */
const CustomTooltip = ({ active, payload, label, colors }: any) => {
  const { t } = useTranslation(["salesChart", "common"]);
  if (!active || !payload || !payload.length) return null;
  const c = colors ?? { plan: PLAN_COLOR, actual: ACTUAL_COLOR, rate: RATE_COLOR };
  const plan = payload.find((p: any) => p.dataKey === "plan");
  const actual = payload.find((p: any) => p.dataKey === "actual");
  const rate = plan?.payload?.rate ?? actual?.payload?.rate;
  const actualLabel = actual?.payload?.isForecast
    ? t("salesChart:salesForecast")
    : t("salesChart:salesActual");
  const lines = [
    ...(plan
      ? [{
          label: t("salesChart:salesPlan"),
          value: Number(plan.value).toLocaleString("ko-KR", { minimumFractionDigits: 0, maximumFractionDigits: 1 }),
          color: c.plan,
        }]
      : []),
    ...(actual
      ? [{
          label: actualLabel,
          value: Number(actual.value).toLocaleString("ko-KR", { minimumFractionDigits: 0, maximumFractionDigits: 1 }),
          color: c.actual,
        }]
      : []),
    ...(rate != null
      ? [{
          label: t("common:achievementRate"),
          value: `${rate}%`,
          color: c.rate,
        }]
      : []),
  ];
  return (
    <ChartTooltipPanel title={label} lines={lines} style={{ maxWidth: "100%" }} />
  );
};

/** "N월" 형식 → 0-based 월 인덱스 (0–11). 월 형식이 아니면 null. */
function extractMonthIdx(label: string): number | null {
  const m = /^(\d+)월$/.exec(label);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  return n >= 1 && n <= 12 ? n - 1 : null;
}

export function SalesChart() {
  const { t } = useTranslation(["salesChart", "common"]);
  const [detailOpen, setDetailOpen] = useState(false);
  const [drillRow, setDrillRow] = useState<SalesRow | null>(null);

  const { derived, isError } = useDashboardData();
  const filters = useDashboardFilters();
  const { unitIndex, currency, fxRates, project, division, statusFilter } = filters;
  const convert = makeConverter(currency, unitIndex, fxRates);

  const { theme } = useTheme();
  const variant = theme.charts?.salesVariant;
  const planColor = theme.charts?.planColor ?? PLAN_COLOR;
  const actualColor = theme.charts?.actualColor ?? ACTUAL_COLOR;
  const rateColor = theme.charts?.rateColor ?? RATE_COLOR;
  const compact = unitIndex === 1;
  const visibleData = derived?.salesData ?? [];
  const PlanRateLabel = makePlanRateLabel(visibleData);
  const ActualRateLabel = makeActualRateLabel(visibleData);

  /* ── 프로젝트/부문 스코프 결정 ── */
  const projectSelected = project !== "All";
  const divisionSelected = !projectSelected && division != null;

  const projectsQuery = useListMgmtreportProjects(
    { year: REPORT_YEAR },
    {
      query: {
        queryKey: getListMgmtreportProjectsQueryKey({ year: REPORT_YEAR }),
      },
    },
  );

  /**
   * 회사 총매출과 동일한 경영관리보고 프로젝트 월 데이터를 사용한다.
   * 별도 salescost 현장 집계는 최신 경영보고보다 입력 기간이 짧을 수 있어
   * 총매출은 있는데 현장 상세가 비는 불일치를 만들 수 있다.
   */
  const scopedProjects = useMemo(() => {
    const projects = projectsQuery.data?.projects ?? [];
    if (projectSelected) {
      return projects.filter((p) => p.name === project);
    }
    return projects.filter(
      (p) =>
        !p.isGroup &&
        (!divisionSelected || !division || resolveProjectBusinessType(p.name, p.businessType) === division) &&
        (statusFilter == null || (p.status ?? "ongoing") === statusFilter),
    );
  }, [projectSelected, divisionSelected, project, division, statusFilter, projectsQuery.data]);

  /* ── 클릭된 월의 현장별 rows 계산 ── */
  const drillMonthIdx = drillRow ? extractMonthIdx(drillRow.month) : null;

  const drillSiteRows = useMemo(() => {
    if (drillMonthIdx == null) return [];
    const mapped = scopedProjects
      .map((p) => {
        const plan = Math.round(convert(p.revenuePlan[drillMonthIdx] ?? 0));
        const actual = Math.round(convert(p.revenueActual[drillMonthIdx] ?? 0));
        // 연 누계(YTD) = 1월부터 클릭된 월까지 누적 — convert()를 매달 적용한 뒤 합산해야
        // 통화/단위 변환이 월별 환율 차이까지 정확히 반영된다 (합산 후 한 번에 convert하면 안 됨).
        let ytdPlan = 0;
        let ytdActual = 0;
        for (let i = 0; i <= drillMonthIdx; i++) {
          ytdPlan += convert(p.revenuePlan[i] ?? 0);
          ytdActual += convert(p.revenueActual[i] ?? 0);
        }
        ytdPlan = Math.round(ytdPlan);
        ytdActual = Math.round(ytdActual);
        return {
          name: p.name,
          bizType: resolveProjectBusinessType(p.name, p.businessType),
          plan,
          actual,
          achievementRate: plan !== 0 ? `${Number(((actual / plan) * 100).toFixed(1))}%` : "-",
          ytdPlan,
          ytdActual,
          ytdAchievementRate: ytdPlan !== 0 ? `${Number(((ytdActual / ytdPlan) * 100).toFixed(1))}%` : "-",
        };
      })
      // 계획 또는 실적이 있는 현장만 표시하며, 마이너스 조정값은 유지
      .filter((r) => r.plan !== 0 || r.actual !== 0)
      .sort((a, b) => b.actual - a.actual);

    return mapped;
  }, [drillMonthIdx, scopedProjects, convert]);

  /* ── 드릴다운 로딩 상태 ──
   * 부문/프로젝트 스코프가 있는데 projects 목록이 아직 오는 중이면 "loading" 표시 */
  const drillIsLoading = projectsQuery.isLoading;

  /* month + 달성률 pill chip tick */
  const MonthRateTick = (props: any) => {
    const { x, y, payload } = props;
    const row = visibleData.find((r) => r.month === payload.value);
    const ok = row?.rate != null && row.rate >= 100;
    const chipText = row?.rate != null ? `${row.rate}%` : null;
    const chipW = chipText ? Math.max(34, chipText.length * 6.2 + 12) : 0;
    return (
      <g>
        <text x={x} y={y + 12} textAnchor="middle" fontSize={chartTypography.month} fontFamily={chartTypography.fontFamily} fontWeight={600} fill={chartTheme.axisText}>{payload.value}</text>
        {chipText && (
          <g>
            <rect x={x - chipW / 2} y={y + 19} width={chipW} height={16} rx={8}
              fill={ok ? "#e7f5ec" : "#fdecec"} />
            <text x={x} y={y + 30.5} textAnchor="middle" fontSize={chartTypography.rate} fontFamily={chartTypography.fontFamily} fontWeight={700}
              fill={ok ? "#2e9e5b" : "#cf4d4d"}>{chipText}</text>
          </g>
        )}
      </g>
    );
  };

  const BarValueLabel = (props: any) => {
    const { x, y, width, height, index } = props;
    if (x == null || index == null) return null;
    const d = visibleData[index];
    if (!d || d.actual == null || !Number.isFinite(Number(d.actual))) return null;
    const text = Number(d.actual).toLocaleString("ko-KR", { minimumFractionDigits: 0, maximumFractionDigits: 1 });
    const fontSize = chartTypography.value;
    let topY = y;
    if (
      d.plan != null && Number.isFinite(Number(d.plan)) && d.plan > 0 &&
      height > 0 && d.actual > 0
    ) {
      const actualY = y + height - d.actual * (height / d.plan);
      if (Number.isFinite(actualY)) topY = actualY;
    }
    return (
      <text x={x + width / 2} y={topY - 4} textAnchor="middle"
        fontSize={fontSize} fontFamily={chartTypography.fontFamily} fontWeight={700} fill="#1a2d4d">
        {text}
      </text>
    );
  };

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
      fontFamily: chartTypography.fontFamily,
    }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
          <span style={{ fontSize: `${chartTypography.title}px`, fontWeight: "600", color: chartTheme.titleNavy }}>{t("salesChart:title")}</span>
          {derived && <span style={{ fontSize: `${chartTypography.unit}px`, color: INK_MUTED }}>{t("common:unit")}: {derived.unitLabel}</span>}
        </div>
        <button
          onClick={() => setDetailOpen(true)}
          style={{
            fontSize: `${chartTypography.action}px`,
            color: "#2f7cf6",
            background: "none",
            border: "none",
            cursor: "pointer",
          }}>{t("salesChart:viewDetails")}</button>
      </div>

      {/* Legend */}
      <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "6px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          {variant === "bars" ? (
            <svg width="14" height="10"><rect x="1" y="1" width="12" height="8" rx="2" fill={planColor} /></svg>
          ) : (
            <svg width="26" height="8">
              <line x1="0" y1="4" x2="26" y2="4" stroke={planColor} strokeWidth="1.5" strokeDasharray={variant === "area" ? "4 3" : undefined} />
              <circle cx="6" cy="4" r="2.5" fill={planColor} />
              <circle cx="20" cy="4" r="2.5" fill={planColor} />
            </svg>
          )}
          <span style={{ fontSize: `${chartTypography.legend}px`, color: "#555", fontWeight: 600 }}>{t("salesChart:salesPlan")}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          {variant === "bars" ? (
            <svg width="14" height="10"><rect x="1" y="1" width="12" height="8" rx="2" fill={actualColor} /></svg>
          ) : (
            <svg width="26" height="8">
              <line x1="0" y1="4" x2="26" y2="4" stroke={actualColor} strokeWidth="1.5" />
              <circle cx="6" cy="4" r="2.5" fill={actualColor} />
              <circle cx="20" cy="4" r="2.5" fill={actualColor} />
            </svg>
          )}
          <span style={{ fontSize: `${chartTypography.legend}px`, color: "#555", fontWeight: 600 }}>
            {variant === "bars" ? t("salesChart:salesActual") : t("salesChart:salesActualForecast")}
          </span>
        </div>
        {variant === "bars" && (
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <svg width="14" height="10">
              <rect x="1" y="1" width="12" height="8" rx="2" fill="#fff" stroke={actualColor} strokeWidth="1.4" strokeDasharray="3 2" />
            </svg>
            <span style={{ fontSize: `${chartTypography.legend}px`, color: "#555", fontWeight: 600 }}>{t("salesChart:salesForecast")}</span>
          </div>
        )}
        {variant === "bars" ? (
          <span style={{ fontSize: `${chartTypography.legend}px`, color: INK_MUTED, fontWeight: 600 }}>{t("salesChart:bottomChipRate")}</span>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <span style={{ fontSize: `${chartTypography.legend}px`, fontWeight: 700, color: rateColor }}>%</span>
            <span style={{ fontSize: `${chartTypography.legend}px`, color: "#555", fontWeight: 600 }}>{t("common:achievementRate")}</span>
          </div>
        )}
      </div>

      {/* Chart */}
      <div style={{ flex: 1, minHeight: "160px" }}>
        {visibleData.length === 0 ? (
          <Empty className="min-h-40 rounded-none p-5">
            <EmptyDescription className="text-xs">
              {isError
                ? t("salesChart:errorLoadFailed")
                : derived?.emptyRange
                  ? t("salesChart:noDataForPeriod")
                  : t("salesChart:loadingData")}
            </EmptyDescription>
          </Empty>
        ) : (
        <ResponsiveContainer width="100%" height="100%">
          {variant === "bars" ? (
            <ComposedChart data={visibleData} margin={{ top: 24, right: 18, left: -10, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.gridLine} vertical={false} />
              <XAxis
                dataKey="month"
                tick={<MonthRateTick />}
                axisLine={false}
                tickLine={false}
                height={44}
              />
              <XAxis dataKey="month" xAxisId="overlay" hide />
              <YAxis
                domain={[0, "auto"]}
                tick={{ fontSize: chartTypography.month, fontFamily: chartTypography.fontFamily, fill: chartTheme.axisText }}
                width={compact ? 88 : 60}
                tickFormatter={(v: number) => v.toLocaleString("ko-KR", { minimumFractionDigits: 0, maximumFractionDigits: 1 })}
                axisLine={false}
                tickLine={false}
              />
              <ChartTooltip
                content={<CustomTooltip colors={{ plan: planColor, actual: actualColor, rate: rateColor }} />}
                cursor={{ fill: "rgba(68,114,202,0.06)" }}
                wrapperStyle={{ maxWidth: "calc(100% - 16px)" }}
              />
              <Bar
                dataKey="plan"
                name={t("salesChart:salesPlan")}
                fill={planColor}
                barSize={28}
                maxBarSize={28}
                radius={[7, 7, 0, 0]}
                isAnimationActive={false}
              >
                <LabelList dataKey="plan" content={BarValueLabel} />
              </Bar>
              <Bar
                dataKey="actual"
                xAxisId="overlay"
                name={t("salesChart:salesActualForecast")}
                fill={actualColor}
                barSize={compact ? 12 : 16}
                radius={[6, 6, 0, 0]}
                isAnimationActive={false}
              >
                {visibleData.map((d, i) => (
                  <Cell
                    key={`actual-${i}`}
                    fill={d.isForecast ? "#ffffff" : actualColor}
                    fillOpacity={d.isForecast ? 0.55 : 1}
                    stroke={d.isForecast ? actualColor : undefined}
                    strokeWidth={d.isForecast ? 1.6 : 0}
                    strokeDasharray={d.isForecast ? "5 3" : undefined}
                  />
                ))}
              </Bar>
            </ComposedChart>
          ) : variant === "area" ? (
            <ComposedChart data={visibleData} margin={{ top: 30, right: 18, left: -10, bottom: 4 }}>
              <defs>
                <linearGradient id="salesAreaFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={actualColor} stopOpacity={0.22} />
                  <stop offset="100%" stopColor={actualColor} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.gridLine} vertical={false} />
              <XAxis
                dataKey="month"
                tick={{ fontSize: chartTypography.axis, fontFamily: chartTypography.fontFamily, fill: chartTheme.axisText }}
                axisLine={false}
                tickLine={false}
                padding={{ left: 18, right: 6 }}
              />
              <YAxis
                domain={[0, "auto"]}
                tick={{ fontSize: chartTypography.axis, fontFamily: chartTypography.fontFamily, fill: chartTheme.axisText }}
                width={compact ? 88 : 60}
                tickFormatter={(v: number) => v.toLocaleString("ko-KR", { minimumFractionDigits: 0, maximumFractionDigits: 1 })}
                axisLine={false}
                tickLine={false}
              />
              <ChartTooltip
                content={<CustomTooltip colors={{ plan: planColor, actual: actualColor, rate: rateColor }} />}
                wrapperStyle={{ maxWidth: "calc(100% - 16px)" }}
              />
              <Line
                type="monotone"
                dataKey="plan"
                name={t("salesChart:salesPlan")}
                stroke={planColor}
                strokeWidth={1.5}
                strokeDasharray="5 4"
                dot={{ r: 2.5, fill: "#fff", stroke: planColor }}
                connectNulls
                isAnimationActive={false}
              />
              <Area
                type="monotone"
                dataKey="actual"
                name={t("salesChart:salesActualForecast")}
                stroke={actualColor}
                strokeWidth={2}
                fill="url(#salesAreaFill)"
                dot={{ r: 3, fill: actualColor, stroke: actualColor }}
                connectNulls
                isAnimationActive={false}
              >
                <LabelList
                  dataKey="actual"
                  position="top"
                  offset={10}
                  formatter={(v: number) => (v == null ? "" : v.toLocaleString("ko-KR", { minimumFractionDigits: 0, maximumFractionDigits: 1 }))}
                  style={{ fontSize: chartTypography.value, fontFamily: chartTypography.fontFamily, fontWeight: 700, fill: actualColor }}
                />
              </Area>
            </ComposedChart>
          ) : (
          <ComposedChart data={visibleData} margin={{ top: 36, right: 18, left: -10, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.gridLine} vertical={false} />
            <XAxis
              dataKey="month"
              tick={{ fontSize: chartTypography.month, fontFamily: chartTypography.fontFamily, fill: chartTheme.axisText }}
              axisLine={false}
              tickLine={false}
              padding={{ left: 18, right: 6 }}
            />
            <YAxis
              domain={["auto", "auto"]}
              tick={{ fontSize: chartTypography.axis, fontFamily: chartTypography.fontFamily, fill: chartTheme.axisText }}
              width={compact ? 88 : 60}
              tickFormatter={(v: number) => v.toLocaleString("ko-KR", { minimumFractionDigits: 0, maximumFractionDigits: 1 })}
              axisLine={false}
              tickLine={false}
            />
            <ChartTooltip content={<CustomTooltip />} wrapperStyle={{ maxWidth: "calc(100% - 16px)" }} />
            <Line
              type="linear"
              dataKey="actual"
              name={t("salesChart:salesActualForecast")}
              stroke={ACTUAL_COLOR}
              strokeWidth={1.5}
              dot={{ r: 2.5, fill: ACTUAL_COLOR, stroke: ACTUAL_COLOR }}
              connectNulls
              isAnimationActive={false}
            >
              <LabelList dataKey="actual" content={BadgeLabel(ACTUAL_COLOR, compact, visibleData.length)} />
              <LabelList dataKey="actual" content={ActualRateLabel} />
            </Line>
            <Line
              type="linear"
              dataKey="plan"
              name={t("salesChart:salesPlan")}
              stroke={PLAN_COLOR}
              strokeWidth={1.5}
              dot={{ r: 2.5, fill: PLAN_COLOR, stroke: PLAN_COLOR }}
              connectNulls
              isAnimationActive={false}
            >
              <LabelList dataKey="plan" content={BadgeLabel(PLAN_COLOR, compact, visibleData.length)} />
              <LabelList dataKey="plan" content={PlanRateLabel} />
            </Line>
          </ComposedChart>
          )}
        </ResponsiveContainer>
        )}
      </div>

      {/* ── 1차 상세 모달: 월별 매출 요약 ── */}
      <DetailModal
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        title={t("salesChart:title")}
        subtitle={derived?.unitLabel}
      >
        <DetailDataTable
          rowKey={(row) => String(row.month)}
          columns={[
            { key: "month", label: t("salesChart:month"), align: "left" },
            { key: "plan", label: t("salesChart:salesPlan") },
            { key: "actual", label: t("salesChart:salesActualForecast") },
            { key: "rate", label: t("common:achievementRate"), format: (v) => (v == null ? "-" : `${v}%`) },
          ]}
          rows={visibleData}
          totalRow={(() => {
            const plan = visibleData.reduce(
              (sum, row) => sum + (typeof row.plan === "number" ? row.plan : 0),
              0,
            );
            const actual = visibleData.reduce(
              (sum, row) => sum + (typeof row.actual === "number" ? row.actual : 0),
              0,
            );
            return {
              month: "합계",
              plan,
              actual,
              rate: plan > 0 ? Math.round((actual / plan) * 100) : null,
            };
          })()}
          onRowClick={(row) => {
            if (extractMonthIdx(row.month) != null) setDrillRow(row);
          }}
          isRowClickable={(row) => extractMonthIdx(row.month) != null}
        />
      </DetailModal>

      {/* ── 2차 드릴다운 모달: 현장별 매출 상세 ── */}
      <DetailModal
        open={drillRow != null}
        onClose={() => setDrillRow(null)}
        title={drillRow ? t("salesChart:siteDetailTitle", { month: drillRow.month }) : ""}
        subtitle={derived?.unitLabel}
      >
        {drillIsLoading ? (
          <div style={{ ...emptyNote, padding: "28px 16px" }}>
            {t("salesChart:loadingSiteData")}
          </div>
        ) : projectsQuery.isError ? (
          <div style={{ ...emptyNote, padding: "28px 16px", color: ACHIEVE_RED }}>
            {t("salesChart:errorLoadFailed")}
          </div>
        ) : drillSiteRows.length === 0 ? (
          <div style={{ ...emptyNote, padding: "28px 16px" }}>
            {t("salesChart:noSiteData")}
          </div>
        ) : (
          (() => {
            const fmtAmt = (v: number) =>
              v.toLocaleString("ko-KR", { minimumFractionDigits: 0, maximumFractionDigits: 1 });
            const totalPlan = drillSiteRows.reduce((sum, row) => sum + row.plan, 0);
            const totalActual = drillSiteRows.reduce((sum, row) => sum + row.actual, 0);
            const totalYtdPlan = drillSiteRows.reduce((sum, row) => sum + row.ytdPlan, 0);
            const totalYtdActual = drillSiteRows.reduce((sum, row) => sum + row.ytdActual, 0);
            const totalRate = totalPlan !== 0 ? `${Number(((totalActual / totalPlan) * 100).toFixed(1))}%` : "-";
            const totalYtdRate =
              totalYtdPlan !== 0 ? `${Number(((totalYtdActual / totalYtdPlan) * 100).toFixed(1))}%` : "-";
            const currentLabel = drillRow?.isForecast
              ? t("salesChart:colForecast")
              : t("salesChart:colActual");
            const thBase: React.CSSProperties = {
              padding: "6px 10px",
              color: INK_SECONDARY,
              fontWeight: 600,
              borderBottom: `1px solid ${CARD_BORDER}`,
              whiteSpace: "nowrap",
            };
            const tdBase: React.CSSProperties = {
              padding: "5px 10px",
              textAlign: "right",
              color: "#333",
              borderBottom: `1px solid ${DIVIDER}`,
              whiteSpace: "nowrap",
            };
            return (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                  <thead>
                    <tr style={{ backgroundColor: "#e7f1fd" }}>
                      <th style={{ ...thBase, textAlign: "left" }} rowSpan={2}>{t("salesChart:colSiteName")}</th>
                      <th style={{ ...thBase, textAlign: "left" }} rowSpan={2}>{t("salesChart:colBizType")}</th>
                      <th style={{ ...thBase, textAlign: "center" }} colSpan={3}>{t("salesChart:groupCurrentMonth")}</th>
                      <th style={{ ...thBase, textAlign: "center" }} colSpan={3}>
                        {t("salesChart:groupYtd", { from: "1월", to: drillRow?.month ?? "" })}
                      </th>
                    </tr>
                    <tr style={{ backgroundColor: "#e7f1fd" }}>
                      <th style={thBase}>{t("salesChart:colTargetPlan")}</th>
                      <th style={thBase}>{currentLabel}</th>
                      <th style={thBase}>{t("salesChart:colAchievementRate")}</th>
                      <th style={thBase}>{t("salesChart:colTargetPlan")}</th>
                      <th style={thBase}>{t("salesChart:colActual")}</th>
                      <th style={thBase}>{t("salesChart:colAchievementRate")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {drillSiteRows.map((row, i) => (
                      <tr key={row.name} style={{ backgroundColor: i % 2 === 0 ? "#fff" : "#f8fbff" }}>
                        <td style={{ ...tdBase, textAlign: "left" }}>{row.name}</td>
                        <td style={{ ...tdBase, textAlign: "left" }}>{row.bizType}</td>
                        <td style={tdBase}>{fmtAmt(row.plan)}</td>
                        <td style={tdBase}>{fmtAmt(row.actual)}</td>
                        <td style={tdBase}>{row.achievementRate}</td>
                        <td style={tdBase}>{fmtAmt(row.ytdPlan)}</td>
                        <td style={tdBase}>{fmtAmt(row.ytdActual)}</td>
                        <td style={tdBase}>{row.ytdAchievementRate}</td>
                      </tr>
                    ))}
                    <tr style={{ backgroundColor: "#e7f1fd", borderTop: `2px solid ${CARD_BORDER}` }}>
                      <td style={{ ...tdBase, textAlign: "left", color: INK_NAVY, fontWeight: 700 }}>합계</td>
                      <td style={tdBase} />
                      <td style={{ ...tdBase, color: INK_NAVY, fontWeight: 700 }}>{fmtAmt(totalPlan)}</td>
                      <td style={{ ...tdBase, color: INK_NAVY, fontWeight: 700 }}>{fmtAmt(totalActual)}</td>
                      <td style={{ ...tdBase, color: INK_NAVY, fontWeight: 700 }}>{totalRate}</td>
                      <td style={{ ...tdBase, color: INK_NAVY, fontWeight: 700 }}>{fmtAmt(totalYtdPlan)}</td>
                      <td style={{ ...tdBase, color: INK_NAVY, fontWeight: 700 }}>{fmtAmt(totalYtdActual)}</td>
                      <td style={{ ...tdBase, color: INK_NAVY, fontWeight: 700 }}>{totalYtdRate}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            );
          })()
        )}
      </DetailModal>
    </div>
  );
}
