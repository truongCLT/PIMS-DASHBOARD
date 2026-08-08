import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ComposedChart,
  Line,
  Bar,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LabelList,
  Cell,
} from "recharts";
import { useDashboardData, type SalesRow } from "../lib/mgmtreportData";
import { useDashboardFilters } from "../lib/dashboardFilters";
import { chartTheme } from "../lib/chartTheme";
import { useTheme } from "../lib/theme";
import { DetailModal, DetailDataTable } from "./DetailModal";

const PLAN_COLOR = chartTheme.planBlue;
const ACTUAL_COLOR = chartTheme.actualGreen;
const RATE_COLOR = chartTheme.rateOrange;

/* Badge label above dot */
const BadgeLabel = (fill: string, compact = false) => (props: any) => {
  const { x, y, value } = props;
  if (value == null || x == null || y == null) return null;
  const text = Number(value).toLocaleString("ko-KR");
  const fontSize = compact ? 9 : 11.5;
  const charW = compact ? 5.6 : 7;
  const w = Math.max(compact ? 26 : 34, text.length * charW + (compact ? 8 : 10));
  const h = compact ? 16 : 21;
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
        fontWeight={700}
      >
        {text}
      </text>
    </g>
  );
};

/*
 * Rate labels — one attached to each line.
 * Only the label on the LOWER value line actually renders for that month.
 * Lower value = lower on chart = higher SVG y coordinate.
 *
 * plan <= actual  →  plan is lower (or equal)  →  PlanRateLabel renders
 * actual  < plan  →  actual is lower            →  ActualRateLabel renders
 */
const makePlanRateLabel = (chartData: SalesRow[]) => (props: any) => {
  const { x, y, index } = props;
  if (x == null || y == null || index == null) return null;
  const d = chartData[index];
  if (!d || d.rate == null || d.plan == null || d.actual == null) return null;
  if (d.plan > d.actual) return null; // actual is lower → its label will render
  return (
    <text x={x} y={y + 18} textAnchor="middle" fill={RATE_COLOR} fontSize={10} fontWeight={700}>
      {d.rate}%
    </text>
  );
};

const makeActualRateLabel = (chartData: SalesRow[]) => (props: any) => {
  const { x, y, index } = props;
  if (x == null || y == null || index == null) return null;
  const d = chartData[index];
  if (!d || d.rate == null || d.plan == null || d.actual == null) return null;
  if (d.actual >= d.plan) return null; // plan is lower or equal → its label will render
  return (
    <text x={x} y={y + 18} textAnchor="middle" fill={RATE_COLOR} fontSize={10} fontWeight={700}>
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
  return (
    <div style={{ backgroundColor: "#fff", border: "1px solid #e2e9f3", borderRadius: "4px", padding: "8px 10px", fontSize: "12px" }}>
      <div style={{ fontWeight: 700, marginBottom: "4px", color: "#16294a" }}>{label}</div>
      {plan && <div style={{ color: c.plan }}>{t("salesChart:salesPlan")}: {Number(plan.value).toLocaleString("ko-KR")}</div>}
      {actual && <div style={{ color: c.actual }}>{t("salesChart:salesActualForecast")}: {Number(actual.value).toLocaleString("ko-KR")}</div>}
      {rate != null && (
        <div style={{ color: c.rate, fontWeight: 700, marginTop: "4px" }}>{t("common:achievementRate")}: {rate}%</div>
      )}
    </div>
  );
};

export function SalesChart() {
  const { t } = useTranslation(["salesChart", "common"]);
  const [detailOpen, setDetailOpen] = useState(false);
  const { derived, isError } = useDashboardData();
  const { unitIndex } = useDashboardFilters();
  const { theme } = useTheme();
  const variant = theme.charts?.salesVariant;
  const planColor = theme.charts?.planColor ?? PLAN_COLOR;
  const actualColor = theme.charts?.actualColor ?? ACTUAL_COLOR;
  const rateColor = theme.charts?.rateColor ?? RATE_COLOR;
  const compact = unitIndex === 1;
  const visibleData = derived?.salesData ?? [];
  const PlanRateLabel = makePlanRateLabel(visibleData);
  const ActualRateLabel = makeActualRateLabel(visibleData);

  /* month + 달성률 pill chip tick, used by the bars variant (대우 예시1) */
  const MonthRateTick = (props: any) => {
    const { x, y, payload } = props;
    const row = visibleData.find((r) => r.month === payload.value);
    const ok = row?.rate != null && row.rate >= 100;
    const chipText = row?.rate != null ? `${row.rate}%` : null;
    const chipW = chipText ? Math.max(34, chipText.length * 6.2 + 12) : 0;
    return (
      <g>
        <text x={x} y={y + 12} textAnchor="middle" fontSize={11} fill={chartTheme.axisText}>{payload.value}</text>
        {chipText && (
          <g>
            <rect x={x - chipW / 2} y={y + 19} width={chipW} height={16} rx={8}
              fill={ok ? "#e7f5ec" : "#fdecec"} />
            <text x={x} y={y + 30.5} textAnchor="middle" fontSize={10} fontWeight={700}
              fill={ok ? "#2e9e5b" : "#cf4d4d"}>{chipText}</text>
          </g>
        )}
      </g>
    );
  };

  /* actual value label above the taller of the two overlapped bars (bars variant) */
  const BarValueLabel = (props: any) => {
    const { x, y, width, height, index } = props;
    if (x == null || index == null) return null;
    const d = visibleData[index];
    if (!d || d.actual == null || !Number.isFinite(Number(d.actual))) return null;
    let topY = y;
    if (
      d.plan != null && Number.isFinite(Number(d.plan)) && d.plan > 0 &&
      height > 0 && d.actual > 0
    ) {
      const actualY = y + height - d.actual * (height / d.plan);
      if (Number.isFinite(actualY)) topY = Math.min(y, actualY);
    }
    return (
      <text x={x + width / 2} y={topY - 7} textAnchor="middle"
        fontSize={compact ? 9.5 : 11} fontWeight={700} fill="#1a2d4d">
        {Number(d.actual).toLocaleString("ko-KR")}
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
    }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
          <span style={{ fontSize: "13px", fontWeight: "600", color: chartTheme.titleNavy }}>{t("salesChart:title")}</span>
          {derived && <span style={{ fontSize: "11px", color: "#7c8ba3" }}>{t("common:unit")}: {derived.unitLabel}</span>}
        </div>
        <button
          onClick={() => setDetailOpen(true)}
          style={{
            fontSize: "12px",
            color: "#2f7cf6",
            background: "none",
            border: "none",
            cursor: "pointer",
          }}>{t("salesChart:viewDetails")}</button>
      </div>

      {/* Legend (그래프 위) */}
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
          <span style={{ fontSize: "12px", color: "#555" }}>{t("salesChart:salesPlan")}</span>
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
          <span style={{ fontSize: "12px", color: "#555" }}>{t("salesChart:salesActualForecast")}</span>
        </div>
        {variant === "bars" ? (
          <span style={{ fontSize: "11px", color: "#7c8ba3" }}>{t("salesChart:bottomChipRate")}</span>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <span style={{ fontSize: "12px", fontWeight: 700, color: rateColor }}>%</span>
            <span style={{ fontSize: "12px", color: "#555" }}>{t("common:achievementRate")}</span>
          </div>
        )}
      </div>

      {/* Chart */}
      <div style={{ flex: 1, minHeight: "160px" }}>
        {visibleData.length === 0 ? (
          <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", color: "#888" }}>
            {isError
              ? t("salesChart:errorLoadFailed")
              : derived?.emptyRange
                ? t("salesChart:noDataForPeriod")
                : t("salesChart:loadingData")}
          </div>
        ) : (
        <ResponsiveContainer width="100%" height="100%">
          {variant === "bars" ? (
            /* ── 대우 예시1: 겹친 막대 (계획 넓고 연한색 · 실적 좁고 진한색) + 달성률 칩 ── */
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
                tick={{ fontSize: compact ? 9 : 11, fill: chartTheme.axisText }}
                width={compact ? 88 : 60}
                tickFormatter={(v: number) => v.toLocaleString("ko-KR")}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip colors={{ plan: planColor, actual: actualColor, rate: rateColor }} />} cursor={{ fill: "rgba(68,114,202,0.06)" }} />
              <Bar
                dataKey="plan"
                name={t("salesChart:salesPlan")}
                fill={planColor}
                barSize={compact ? 26 : 34}
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
            /* ── 대우 예시2: area(실적) + dashed line(계획) ── */
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
                tick={<MonthRateTick />}
                axisLine={false}
                tickLine={false}
                height={44}
                padding={{ left: 18, right: 10 }}
              />
              <YAxis
                domain={[0, "auto"]}
                tick={{ fontSize: compact ? 9 : 11, fill: chartTheme.axisText }}
                width={compact ? 88 : 60}
                tickFormatter={(v: number) => v.toLocaleString("ko-KR")}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip colors={{ plan: planColor, actual: actualColor, rate: rateColor }} />} />
              <Line
                type="natural"
                dataKey="plan"
                name={t("salesChart:salesPlan")}
                stroke={planColor}
                strokeWidth={1.8}
                strokeDasharray="6 5"
                dot={{ r: 3.5, fill: "#fff", stroke: planColor, strokeWidth: 1.6 }}
                connectNulls
                isAnimationActive={false}
              />
              <Area
                type="natural"
                dataKey="actual"
                name={t("salesChart:salesActualForecast")}
                stroke={actualColor}
                strokeWidth={2.6}
                fill="url(#salesAreaFill)"
                dot={{ r: 4, fill: actualColor, stroke: "#fff", strokeWidth: 1.5 }}
                connectNulls
                isAnimationActive={false}
              >
                <LabelList
                  dataKey="actual"
                  position="top"
                  offset={12}
                  formatter={(v: number) => (v == null ? "" : v.toLocaleString("ko-KR"))}
                  style={{ fontSize: compact ? 9 : 11, fontWeight: 700, fill: actualColor }}
                />
              </Area>
            </ComposedChart>
          ) : (
          <ComposedChart data={visibleData} margin={{ top: 36, right: 18, left: -10, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.gridLine} vertical={false} />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11, fill: chartTheme.axisText }}
              axisLine={false}
              tickLine={false}
              padding={{ left: 18, right: 6 }}
            />
            <YAxis
              domain={["auto", "auto"]}
              tick={{ fontSize: compact ? 9 : 11, fill: chartTheme.axisText }}
              width={compact ? 88 : 60}
              tickFormatter={(v: number) => v.toLocaleString("ko-KR")}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} />

            {/* 실적 및 전망 */}
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
              <LabelList dataKey="actual" content={BadgeLabel(ACTUAL_COLOR, compact)} />
              <LabelList dataKey="actual" content={ActualRateLabel} />
            </Line>

            {/* 계획 */}
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
              <LabelList dataKey="plan" content={BadgeLabel(PLAN_COLOR, compact)} />
              <LabelList dataKey="plan" content={PlanRateLabel} />
            </Line>
          </ComposedChart>
          )}
        </ResponsiveContainer>
        )}
      </div>

      <DetailModal open={detailOpen} onClose={() => setDetailOpen(false)} title={t("salesChart:title")}>
        <DetailDataTable
          rowKey={(row) => String(row.month)}
          columns={[
            { key: "month", label: t("salesChart:month"), align: "left" },
            { key: "plan", label: t("salesChart:salesPlan") },
            { key: "actual", label: t("salesChart:salesActualForecast") },
            { key: "rate", label: t("common:achievementRate"), format: (v) => (v == null ? "-" : `${v}%`) },
          ]}
          rows={visibleData}
        />
      </DetailModal>
    </div>
  );
}
