import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ComposedChart,
  Line,
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
const CustomTooltip = ({ active, payload, label }: any) => {
  const { t } = useTranslation(["salesChart", "common"]);
  if (!active || !payload || !payload.length) return null;
  const plan = payload.find((p: any) => p.dataKey === "plan");
  const actual = payload.find((p: any) => p.dataKey === "actual");
  const rate = plan?.payload?.rate;
  return (
    <div style={{ backgroundColor: "#fff", border: "1px solid #e2e9f3", borderRadius: "4px", padding: "8px 10px", fontSize: "12px" }}>
      <div style={{ fontWeight: 700, marginBottom: "4px", color: "#16294a" }}>{label}</div>
      {plan && <div style={{ color: PLAN_COLOR }}>{t("salesChart:salesPlan")}: {Number(plan.value).toLocaleString("ko-KR")}</div>}
      {actual && <div style={{ color: ACTUAL_COLOR }}>{t("salesChart:salesActualForecast")}: {Number(actual.value).toLocaleString("ko-KR")}</div>}
      {rate != null && (
        <div style={{ color: RATE_COLOR, fontWeight: 700, marginTop: "4px" }}>{t("common:achievementRate")}: {rate}%</div>
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
  const compact = unitIndex === 1;
  const visibleData = derived?.salesData ?? [];
  const PlanRateLabel = makePlanRateLabel(visibleData);
  const ActualRateLabel = makeActualRateLabel(visibleData);

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
              style={{ accentColor: "#2f7cf6" }}
            />
            {t("salesChart:net")}
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11px", color: "#555", cursor: "pointer" }}>
            <input
              type="radio"
              name="viewType"
              checked={viewType === "report"}
              onChange={() => setViewType("report")}
              style={{ accentColor: "#2f7cf6" }}
            />
            {t("salesChart:report")}
          </label>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <svg width="26" height="8">
              <line x1="0" y1="4" x2="26" y2="4" stroke={PLAN_COLOR} strokeWidth="1.5" />
              <circle cx="6" cy="4" r="2.5" fill={PLAN_COLOR} />
              <circle cx="20" cy="4" r="2.5" fill={PLAN_COLOR} />
            </svg>
            <span style={{ fontSize: "12px", color: "#555" }}>{t("salesChart:salesPlan")}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <svg width="26" height="8">
              <line x1="0" y1="4" x2="26" y2="4" stroke={ACTUAL_COLOR} strokeWidth="1.5" />
              <circle cx="6" cy="4" r="2.5" fill={ACTUAL_COLOR} />
              <circle cx="20" cy="4" r="2.5" fill={ACTUAL_COLOR} />
            </svg>
            <span style={{ fontSize: "12px", color: "#555" }}>{t("salesChart:salesActualForecast")}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <span style={{ fontSize: "12px", fontWeight: 700, color: RATE_COLOR }}>%</span>
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
