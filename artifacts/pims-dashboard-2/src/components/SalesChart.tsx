import React, { useState } from "react";
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

const PLAN_COLOR = "#2b5cad";
const ACTUAL_COLOR = "#2e8b3d";
const RATE_COLOR = "#e67e22";

/* Badge label above dot */
const BadgeLabel = (fill: string) => (props: any) => {
  const { x, y, value } = props;
  if (value == null || x == null || y == null) return null;
  const text = Number(value).toLocaleString("ko-KR");
  const w = Math.max(34, text.length * 7 + 10);
  const h = 21;
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
        fontSize={10.5}
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
    <text x={x} y={y + 18} textAnchor="middle" fill={RATE_COLOR} fontSize={9} fontWeight={700}>
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
    <text x={x} y={y + 18} textAnchor="middle" fill={RATE_COLOR} fontSize={9} fontWeight={700}>
      {d.rate}%
    </text>
  );
};

/* Custom Tooltip */
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) return null;
  const plan = payload.find((p: any) => p.dataKey === "plan");
  const actual = payload.find((p: any) => p.dataKey === "actual");
  const rate = plan?.payload?.rate;
  return (
    <div style={{ backgroundColor: "#fff", border: "1px solid #d0dce8", borderRadius: "4px", padding: "8px 10px", fontSize: "11px" }}>
      <div style={{ fontWeight: 700, marginBottom: "4px", color: "#1a2d4d" }}>{label}</div>
      {plan && <div style={{ color: PLAN_COLOR }}>매출(계획): {Number(plan.value).toLocaleString("ko-KR")}</div>}
      {actual && <div style={{ color: ACTUAL_COLOR }}>매출(실적 및 전망): {Number(actual.value).toLocaleString("ko-KR")}</div>}
      {rate != null && (
        <div style={{ color: RATE_COLOR, fontWeight: 700, marginTop: "4px" }}>달성률: {rate}%</div>
      )}
    </div>
  );
};

export function SalesChart() {
  const [viewType, setViewType] = useState<"net" | "report">("net");
  const { derived, isError } = useDashboardData();
  const visibleData = derived ? derived.salesData.slice(0, derived.month) : [];
  const PlanRateLabel = makePlanRateLabel(visibleData);
  const ActualRateLabel = makeActualRateLabel(visibleData);

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
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
        <span style={{ fontSize: "12px", fontWeight: "600", color: "#1a3a5c" }}>매출 실적 및 전망</span>
        <button style={{
          fontSize: "11px",
          color: "#1e6fdd",
          background: "none",
          border: "none",
          cursor: "pointer",
        }}>상세보기</button>
      </div>

      {/* Chart */}
      <div style={{ flex: 1, minHeight: "160px" }}>
        {visibleData.length === 0 ? (
          <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", color: "#888" }}>
            {isError ? "데이터를 불러오지 못했습니다." : "데이터 로딩 중…"}
          </div>
        ) : (
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={visibleData} margin={{ top: 36, right: 18, left: -10, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e8f0f8" vertical={false} />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 10, fill: "#666" }}
              axisLine={false}
              tickLine={false}
              padding={{ left: 18, right: 6 }}
            />
            <YAxis
              domain={["auto", "auto"]}
              tick={{ fontSize: 10, fill: "#666" }}
              tickFormatter={(v: number) => v.toLocaleString("ko-KR")}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} />

            {/* 실적 및 전망 */}
            <Line
              type="linear"
              dataKey="actual"
              name="매출(실적 및 전망)"
              stroke={ACTUAL_COLOR}
              strokeWidth={1.5}
              dot={{ r: 2.5, fill: ACTUAL_COLOR, stroke: ACTUAL_COLOR }}
              connectNulls
              isAnimationActive={false}
            >
              <LabelList dataKey="actual" content={BadgeLabel(ACTUAL_COLOR)} />
              <LabelList dataKey="actual" content={ActualRateLabel} />
            </Line>

            {/* 계획 */}
            <Line
              type="linear"
              dataKey="plan"
              name="매출(계획)"
              stroke={PLAN_COLOR}
              strokeWidth={1.5}
              dot={{ r: 2.5, fill: PLAN_COLOR, stroke: PLAN_COLOR }}
              connectNulls
              isAnimationActive={false}
            >
              <LabelList dataKey="plan" content={BadgeLabel(PLAN_COLOR)} />
              <LabelList dataKey="plan" content={PlanRateLabel} />
            </Line>
          </ComposedChart>
        </ResponsiveContainer>
        )}
      </div>

      {/* Legend + Toggle */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "4px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "10px", color: "#555", cursor: "pointer" }}>
            <input
              type="radio"
              name="viewType"
              checked={viewType === "net"}
              onChange={() => setViewType("net")}
              style={{ accentColor: "#1565c0" }}
            />
            넷
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "10px", color: "#555", cursor: "pointer" }}>
            <input
              type="radio"
              name="viewType"
              checked={viewType === "report"}
              onChange={() => setViewType("report")}
              style={{ accentColor: "#1565c0" }}
            />
            리포트
          </label>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <svg width="26" height="8">
              <line x1="0" y1="4" x2="26" y2="4" stroke={PLAN_COLOR} strokeWidth="1.5" />
              <circle cx="6" cy="4" r="2.5" fill={PLAN_COLOR} />
              <circle cx="20" cy="4" r="2.5" fill={PLAN_COLOR} />
            </svg>
            <span style={{ fontSize: "11px", color: "#555" }}>매출(계획)</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <svg width="26" height="8">
              <line x1="0" y1="4" x2="26" y2="4" stroke={ACTUAL_COLOR} strokeWidth="1.5" />
              <circle cx="6" cy="4" r="2.5" fill={ACTUAL_COLOR} />
              <circle cx="20" cy="4" r="2.5" fill={ACTUAL_COLOR} />
            </svg>
            <span style={{ fontSize: "11px", color: "#555" }}>매출(실적 및 전망)</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <span style={{ fontSize: "11px", fontWeight: 700, color: RATE_COLOR }}>%</span>
            <span style={{ fontSize: "11px", color: "#555" }}>달성률</span>
          </div>
        </div>
      </div>
    </div>
  );
}
