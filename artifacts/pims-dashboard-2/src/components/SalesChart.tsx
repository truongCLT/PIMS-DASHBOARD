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
import { filterUpToLastMonth } from "../lib/monthRange";

export const SALES_DATA = [
  { month: "4월", net: 90, report: null, plan: 90, actual: 101 },
  { month: "5월", net: 98, report: null, plan: 98, actual: 98 },
  { month: "6월", net: 99, report: null, plan: 110, actual: 99 },
  { month: "7월", net: 100, report: null, plan: 100, actual: 100 },
  { month: "8월", net: 103, report: null, plan: 102, actual: 91 },
  { month: "9월", net: null, report: null, plan: 109, actual: 85 },
];

const VISIBLE_SALES_DATA = filterUpToLastMonth(SALES_DATA, (r) => r.month);

const BadgeLabel = (fill: string) => (props: any) => {
  const { x, y, value } = props;
  if (value == null || x == null || y == null) return null;
  const w = 34;
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
        {value}
      </text>
    </g>
  );
};

const PLAN_COLOR = "#2b5cad";
const ACTUAL_COLOR = "#2e8b3d";

export function SalesChart() {
  const [viewType, setViewType] = useState<"net" | "report">("net");

  return (
    <div style={{
      backgroundColor: "#fff",
      border: "1px solid #d0dce8",
      borderRadius: "6px",
      padding: "10px 12px",
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
      <div style={{ height: "160px" }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={VISIBLE_SALES_DATA} margin={{ top: 8, right: 18, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e8f0f8" vertical={false} />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 10, fill: "#666" }}
              axisLine={false}
              tickLine={false}
              padding={{ left: 18, right: 6 }}
            />
            <YAxis
              domain={[60, 130]}
              ticks={[60, 70, 80, 90, 100, 110, 120, 130]}
              tick={{ fontSize: 10, fill: "#666" }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip contentStyle={{ fontSize: "11px" }} />
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
            </Line>
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
            </Line>
          </ComposedChart>
        </ResponsiveContainer>
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
            <span style={{ fontSize: "9px", color: "#555" }}>매출(계획)</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <svg width="26" height="8">
              <line x1="0" y1="4" x2="26" y2="4" stroke={ACTUAL_COLOR} strokeWidth="1.5" />
              <circle cx="6" cy="4" r="2.5" fill={ACTUAL_COLOR} />
              <circle cx="20" cy="4" r="2.5" fill={ACTUAL_COLOR} />
            </svg>
            <span style={{ fontSize: "9px", color: "#555" }}>매출(실적 및 전망)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
