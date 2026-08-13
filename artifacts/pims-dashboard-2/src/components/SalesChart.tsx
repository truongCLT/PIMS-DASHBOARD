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
} from "recharts";
import { useDashboardData, type SalesRow } from "../lib/mgmtreportData";
import { useDashboardFilters } from "../lib/dashboardFilters";
import { chartTheme } from "../lib/chartTheme";
import { useTheme } from "../lib/theme";
import { DetailModal, DetailDataTable } from "./DetailModal";
import { tokens as aquaTokens } from "@workspace/aqua-glass";
const AG = aquaTokens.color.light;

const PLAN_COLOR = chartTheme.planBlue;
const ACTUAL_COLOR = chartTheme.actualGreen;
const RATE_COLOR = chartTheme.rateOrange;

/* Badge label above dot */
// n: 표시 중인 데이터 포인트 수. 많을수록 간격이 좁아지므로 폰트를 줄임.
const BadgeLabel = (fill: string, compact = false, n = 12) => (props: any) => {
  const { x, y, value } = props;
  if (value == null || x == null || y == null) return null;
  const text = Number(value).toLocaleString("ko-KR");
  // 컬럼 피치 추정: 차트 너비 320px 기준
  const colPitch = Math.max(20, 320 / Math.max(1, n));
  // fontWeight 700 sans-serif 기준 글자당 너비 ≈ fontSize × 0.62
  const maxFs = compact ? 9 : 11.5;
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
    <div style={{ backgroundColor: "#fff", border: `1px solid ${AG.border}`, borderRadius: "4px", padding: "8px 10px", fontSize: "12px" }}>
      <div style={{ fontWeight: 700, marginBottom: "4px", color: AG.foreground }}>{label}</div>
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
  const [viewType, setViewType] = useState<"net" | "report">("net");
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

  /* month + 달성률 two-line tick, used by the bars variant (대우 예시1) */
  const MonthRateTick = (props: any) => {
    const { x, y, payload } = props;
    const row = visibleData.find((r) => r.month === payload.value);
    return (
      <g>
        <text x={x} y={y + 12} textAnchor="middle" fontSize={11} fill={chartTheme.axisText}>{payload.value}</text>
        {row?.rate != null && (
          <text x={x} y={y + 26} textAnchor="middle" fontSize={10} fontWeight={700} fill={rateColor}>{row.rate}%</text>
        )}
      </g>
    );
  };

  return (
    <div style={{
      backgroundColor: "#fff",
      border: `1px solid ${AG.border}`,
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
          {derived && <span style={{ fontSize: "11px", color: AG.mutedForeground }}>{t("common:unit")}: {derived.unitLabel}</span>}
        </div>
        <button
          onClick={() => setDetailOpen(true)}
          style={{
            fontSize: "12px",
            color: AG.primary,
            background: "none",
            border: "none",
            cursor: "pointer",
          }}>{t("salesChart:viewDetails")}</button>
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
            /* ── 대우 예시1: grouped bars (계획 연한색 · 실적 진한색) + 달성률 under months ── */
            <ComposedChart data={visibleData} margin={{ top: 24, right: 18, left: -10, bottom: 16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.gridLine} vertical={false} />
              <XAxis
                dataKey="month"
                tick={<MonthRateTick />}
                axisLine={false}
                tickLine={false}
                height={34}
              />
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
                radius={[4, 4, 0, 0]}
                isAnimationActive={false}
              />
              <Bar
                dataKey="actual"
                name={t("salesChart:salesActualForecast")}
                fill={actualColor}
                radius={[4, 4, 0, 0]}
                isAnimationActive={false}
              >
                <LabelList
                  dataKey="actual"
                  position="top"
                  formatter={(v: number) => (v == null ? "" : v.toLocaleString("ko-KR"))}
                  style={{ fontSize: compact ? 9 : 10.5, fontWeight: 700, fill: "#1a2d4d" }}
                />
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
                tick={{ fontSize: 11, fill: chartTheme.axisText }}
                axisLine={false}
                tickLine={false}
                padding={{ left: 18, right: 6 }}
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
                  formatter={(v: number) => (v == null ? "" : v.toLocaleString("ko-KR"))}
                  style={{ fontSize: compact ? 9 : 10.5, fontWeight: 700, fill: actualColor }}
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
              <LabelList dataKey="actual" content={BadgeLabel(ACTUAL_COLOR, compact, visibleData.length)} />
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
              <LabelList dataKey="plan" content={BadgeLabel(PLAN_COLOR, compact, visibleData.length)} />
              <LabelList dataKey="plan" content={PlanRateLabel} />
            </Line>
          </ComposedChart>
          )}
        </ResponsiveContainer>
        )}
      </div>

      {/* Legend + Toggle */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "4px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11px", color: "#555", cursor: "pointer" }}>
            <input
              type="radio"
              name="viewType"
              checked={viewType === "net"}
              onChange={() => setViewType("net")}
              style={{ accentColor: AG.primary }}
            />
            {t("salesChart:net")}
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11px", color: "#555", cursor: "pointer" }}>
            <input
              type="radio"
              name="viewType"
              checked={viewType === "report"}
              onChange={() => setViewType("report")}
              style={{ accentColor: AG.primary }}
            />
            {t("salesChart:report")}
          </label>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
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
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <span style={{ fontSize: "12px", fontWeight: 700, color: rateColor }}>%</span>
            <span style={{ fontSize: "12px", color: "#555" }}>{t("common:achievementRate")}</span>
          </div>
        </div>
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
