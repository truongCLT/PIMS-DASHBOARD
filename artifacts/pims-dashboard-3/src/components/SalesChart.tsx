import React, { useState } from "react";
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LabelList,
} from "recharts";

export const SALES_DATA = [
  { month: "4월", net: 90, report: null, plan: 90, actual: 101 },
  { month: "5월", net: 98, report: null, plan: 98, actual: 98 },
  { month: "6월", net: 99, report: null, plan: 110, actual: 99 },
  { month: "7월", net: 100, report: null, plan: 100, actual: 100 },
  { month: "8월", net: 103, report: null, plan: 102, actual: 91 },
  { month: "9월", net: null, report: null, plan: 109, actual: 85 },
];

const BadgeLabel = (fill: string) => (props: any) => {
  const { x, y, value } = props;
  if (value == null || x == null || y == null) return null;
  const w = 34;
  const h = 21;
  const bx = x - w / 2;
  const by = y - h - 9;
  return (
    <g>
      <rect x={bx} y={by} width={w} height={h} rx={10.5} fill={fill} />
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

const PLAN_COLOR = "var(--color-primary-blue)";
const ACTUAL_COLOR = "var(--color-accent-coral)";

export function SalesChart() {
  const [viewType, setViewType] = useState<"net" | "report">("net");

  return (
    <div style={{
      backgroundColor: "var(--color-card-bg)",
      borderRadius: "14px",
      boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
      padding: "20px 24px",
      display: "flex",
      flexDirection: "column",
    }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <span style={{ fontSize: "14px", fontWeight: "600", color: "var(--color-text-primary)" }}>매출 실적 및 전망</span>
        <button style={{
          fontSize: "12px",
          color: "var(--color-primary-blue)",
          background: "none",
          border: "none",
          cursor: "pointer",
          fontWeight: "500",
        }}>상세보기</button>
      </div>

      {/* Chart */}
      <div style={{ height: "200px", flex: 1 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={SALES_DATA} margin={{ top: 12, right: 18, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={ACTUAL_COLOR} stopOpacity={0.2}/>
                <stop offset="95%" stopColor={ACTUAL_COLOR} stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorPlan" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={PLAN_COLOR} stopOpacity={0.2}/>
                <stop offset="95%" stopColor={PLAN_COLOR} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11, fill: "var(--color-text-secondary)" }}
              axisLine={false}
              tickLine={false}
              padding={{ left: 18, right: 6 }}
            />
            <YAxis
              domain={[60, 130]}
              ticks={[60, 70, 80, 90, 100, 110, 120, 130]}
              tick={{ fontSize: 11, fill: "var(--color-text-secondary)" }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip contentStyle={{ fontSize: "12px", borderRadius: "8px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }} />
            <Area type="monotone" dataKey="actual" stroke="none" fillOpacity={1} fill="url(#colorActual)" />
            <Area type="monotone" dataKey="plan" stroke="none" fillOpacity={1} fill="url(#colorPlan)" />
            <Line
              type="monotone"
              dataKey="actual"
              name="매출(실적 및 전망)"
              stroke={ACTUAL_COLOR}
              strokeWidth={2}
              dot={{ r: 3, fill: "#fff", stroke: ACTUAL_COLOR, strokeWidth: 2 }}
              activeDot={{ r: 5 }}
              connectNulls
              isAnimationActive={false}
            >
              <LabelList dataKey="actual" content={BadgeLabel(ACTUAL_COLOR)} />
            </Line>
            <Line
              type="monotone"
              dataKey="plan"
              name="매출(계획)"
              stroke={PLAN_COLOR}
              strokeWidth={2}
              dot={{ r: 3, fill: "#fff", stroke: PLAN_COLOR, strokeWidth: 2 }}
              activeDot={{ r: 5 }}
              connectNulls
              isAnimationActive={false}
            >
              <LabelList dataKey="plan" content={BadgeLabel(PLAN_COLOR)} />
            </Line>
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Legend + Toggle */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: "var(--color-text-secondary)", cursor: "pointer" }}>
            <input
              type="radio"
              name="viewType"
              checked={viewType === "net"}
              onChange={() => setViewType("net")}
              style={{ accentColor: "var(--color-primary-blue)" }}
            />
            넷
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: "var(--color-text-secondary)", cursor: "pointer", whiteSpace: "nowrap" }}>
            <input
              type="radio"
              name="viewType"
              checked={viewType === "report"}
              onChange={() => setViewType("report")}
              style={{ accentColor: "var(--color-primary-blue)" }}
            />
            리포트
          </label>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <svg width="26" height="8">
              <line x1="0" y1="4" x2="26" y2="4" stroke={PLAN_COLOR} strokeWidth="2" />
              <circle cx="13" cy="4" r="3" fill="#fff" stroke={PLAN_COLOR} strokeWidth="1.5" />
            </svg>
            <span style={{ fontSize: "11px", color: "var(--color-text-secondary)", whiteSpace: "nowrap" }}>매출(계획)</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <svg width="26" height="8">
              <line x1="0" y1="4" x2="26" y2="4" stroke={ACTUAL_COLOR} strokeWidth="2" />
              <circle cx="13" cy="4" r="3" fill="#fff" stroke={ACTUAL_COLOR} strokeWidth="1.5" />
            </svg>
            <span style={{ fontSize: "11px", color: "var(--color-text-secondary)", whiteSpace: "nowrap" }}>매출(실적 및 전망)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
