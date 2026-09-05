/**
 * 매출 차트 섹션 — 월별 매출(막대) · 계획(영역) · 누계(선) + 누계 원가율 라인 차트.
 * 커스텀 툴팁에서 누계 실적/계획 값을 함께 표시한다.
 */
import React from "react";
import { useTranslation } from "react-i18next";
import {
  ComposedChart,
  Bar,
  Line,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LabelList,
  Legend,
} from "recharts";
import { chartTheme } from "../../lib/chartTheme";
import { useMoney } from "../../lib/displayUnit";
import { cardStyle, sectionTitle, INK_NAVY } from "../../lib/uiTokens";
import type { RevenuePoint } from "./types";

// ---------------------------------------------------------------------------
// 커스텀 툴팁 — 누계 실적/계획 포함
// ---------------------------------------------------------------------------

function RevenueTooltip({
  active,
  payload,
  label,
  chartData,
  unitLabel,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
  chartData: RevenuePoint[];
  unitLabel: string;
}) {
  const { t } = useTranslation(["common"]);
  if (!active || !payload || payload.length === 0) return null;
  const idx = chartData.findIndex((d) => d.label === label);
  const cum     = idx >= 0 ? chartData[idx].cumulative : null;
  const planCum = idx >= 0 ? chartData[idx].planCum    : null;
  return (
    <div
      style={{
        backgroundColor: "#fff",
        border: "1px solid #e2e9f3",
        borderRadius: "6px",
        padding: "8px 12px",
        fontSize: "12px",
        lineHeight: "1.8",
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: "4px", color: INK_NAVY }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color }}>
          {p.name}: {Math.round(p.value).toLocaleString()} {unitLabel}
        </div>
      ))}
      {cum != null && (
        <div
          style={{
            color: chartTheme.outflowRed,
            borderTop: "1px solid #eef2f7",
            marginTop: "4px",
            paddingTop: "4px",
          }}
        >
          {t("common:cumulative")} ({t("common:actual")}): {cum.toLocaleString()} {unitLabel}
        </div>
      )}
      {planCum != null && planCum > 0 && (
        <div style={{ color: chartTheme.planGray }}>
          {t("common:cumulative")} ({t("common:plan")}): {planCum.toLocaleString()} {unitLabel}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 매출 차트
// ---------------------------------------------------------------------------

export function RevenueChartCard({
  chartData,
  pdSalesHasAny,
}: {
  chartData: RevenuePoint[];
  pdSalesHasAny: boolean;
}) {
  const { t } = useTranslation(["saleCostTab", "common"]);
  const { unitLabel } = useMoney();

  const maxRevenue = Math.max(...chartData.map((d) => Math.max(d.revenue, d.plan)), 0);
  const maxCum     = Math.max(...chartData.map((d) => Math.max(d.cumulative, d.planCum)), 0);

  return (
    <div style={cardStyle}>
      <span style={sectionTitle}>
        {t("saleCostTab:monthlyRevenueTitle", { unit: unitLabel })}
      </span>
      <div style={{ width: "100%", height: "260px", marginTop: "8px" }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 30, right: 40, left: 40, bottom: 0 }}>
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: chartTheme.axisText }}
              tickLine={false}
              axisLine={{ stroke: chartTheme.axisLine }}
            />
            <YAxis hide domain={[0, Math.max(maxRevenue * 2.4, 1)]} />
            <YAxis yAxisId="cum" hide domain={[0, Math.max(maxCum * 1.1, 1)]} />
            <Tooltip
              content={
                <RevenueTooltip
                  chartData={chartData}
                  unitLabel={unitLabel}
                />
              }
            />
            <Legend wrapperStyle={{ fontSize: "12px" }} />
            {pdSalesHasAny && (
              <Area
                dataKey="plan"
                name={t("saleCostTab:monthlyPlan")}
                type="monotone"
                stroke={chartTheme.planGray}
                strokeWidth={1.5}
                fill={chartTheme.planGray}
                fillOpacity={0.42}
                isAnimationActive={false}
              >
                <LabelList
                  dataKey="plan"
                  position="top"
                  style={{ fontSize: "11px", fill: chartTheme.axisText }}
                  formatter={(v: number) => (v !== 0 ? Math.round(v).toLocaleString() : "")}
                />
              </Area>
            )}
            <Bar
              dataKey="revenue"
              name={t("saleCostTab:monthlyRevenue")}
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
              dot={{ r: 3, fill: chartTheme.outflowRed }}
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
  );
}

// ---------------------------------------------------------------------------
// 누계 원가율 라인 차트
// ---------------------------------------------------------------------------

export function CostRatioLineCard({
  chartData,
  lastRatioIdx,
}: {
  chartData: RevenuePoint[];
  lastRatioIdx: number;
}) {
  const { t } = useTranslation(["saleCostTab"]);
  const ratios  = chartData.filter((d) => d.ratio != null).map((d) => d.ratio as number);
  const ratioMax = ratios.length > 0 ? Math.max(...ratios) : 100;

  return (
    <div style={cardStyle}>
      <span style={sectionTitle}>{t("saleCostTab:costRatioLineTitle")}</span>
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
              formatter={(v) =>
                `${Number(v).toLocaleString("en-US", {
                  minimumFractionDigits: 1,
                  maximumFractionDigits: 1,
                })}%`
              }
            />
            <Line
              dataKey="ratio"
              name={t("saleCostTab:cumulativeCostRatio")}
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
                  const { x, y, value, index } = props as {
                    x?: number;
                    y?: number;
                    value?: number | null;
                    index?: number;
                  };
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
                      {Number(value).toLocaleString("en-US", {
                        minimumFractionDigits: 1,
                        maximumFractionDigits: 1,
                      })}%
                    </text>
                  );
                }}
              />
            </Line>
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
