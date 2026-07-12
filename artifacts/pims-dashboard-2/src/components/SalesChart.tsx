import React, { useState } from "react";
import {
  ComposedChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export const SALES_DATA = [
  { month: "4월", net: 90, report: null, plan: 101, actual: 98 },
  { month: "5월", net: 98, report: null, plan: 98, actual: 99 },
  { month: "6월", net: 99, report: null, plan: 110, actual: 100 },
  { month: "7월", net: 100, report: null, plan: 102, actual: 91 },
  { month: "8월", net: 103, report: null, plan: 109, actual: 85 },
  { month: "9월", net: null, report: null, plan: 109, actual: null },
];

const PEAK_PLAN = SALES_DATA.reduce(
  (best, d) => (d.plan !== null && d.plan > (best.plan ?? -Infinity) ? d : best),
  SALES_DATA[0],
);
const LAST_ACTUAL = [...SALES_DATA].reverse().find((d) => d.actual !== null);

function CalloutBadge({
  value,
  label,
  style,
}: {
  value: string;
  label: string;
  style: React.CSSProperties;
}) {
  return (
    <div
      style={{
        position: "absolute",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "5px 14px",
        backgroundColor: "rgba(255,255,255,0.88)",
        border: "1.5px solid #a9bbdc",
        borderRadius: "12px",
        boxShadow: "0 2px 8px rgba(90,110,160,0.18)",
        pointerEvents: "none",
        zIndex: 2,
        ...style,
      }}
    >
      <span style={{ fontSize: "14px", fontWeight: 700, color: "#3f5788", lineHeight: 1.2 }}>
        {value}
      </span>
      <span style={{ fontSize: "8px", color: "#7d8cab", whiteSpace: "nowrap" }}>{label}</span>
    </div>
  );
}

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
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "9px", color: "#8b9ab5" }}>단위: 1K USD</span>
          <button style={{
            fontSize: "11px",
            color: "#1e6fdd",
            background: "none",
            border: "none",
            cursor: "pointer",
          }}>상세보기</button>
        </div>
      </div>

      {/* Chart */}
      <div style={{ height: "160px", position: "relative" }}>
        <CalloutBadge
          value={String(PEAK_PLAN.plan)}
          label={`${PEAK_PLAN.month} 매출(계획) 최고`}
          style={{ left: "26%", top: "6%" }}
        />
        {LAST_ACTUAL && (
          <CalloutBadge
            value={String(LAST_ACTUAL.actual)}
            label={`${LAST_ACTUAL.month} 매출(실적 및 전망)`}
            style={{ right: "3%", top: "2%" }}
          />
        )}
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={SALES_DATA} margin={{ top: 15, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="salesNetGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8ea9d8" stopOpacity={0.85} />
                <stop offset="70%" stopColor="#b9c8e6" stopOpacity={0.45} />
                <stop offset="100%" stopColor="#dfe6f4" stopOpacity={0.25} />
              </linearGradient>
              <linearGradient id="salesPlanGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#e2836b" stopOpacity={0.75} />
                <stop offset="100%" stopColor="#f0b3a2" stopOpacity={0.12} />
              </linearGradient>
              <linearGradient id="salesActualGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#5b7fc7" stopOpacity={0.5} />
                <stop offset="100%" stopColor="#8ea9d8" stopOpacity={0.06} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#e3e9f4" strokeWidth={1} />
            <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#8b9ab5" }} axisLine={false} tickLine={false} />
            <YAxis domain={[60, 140]} tick={{ fontSize: 10, fill: "#8b9ab5" }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ fontSize: "11px", borderRadius: "8px", border: "1px solid #c4d0e6" }} />
            <Area
              type="monotone"
              dataKey="plan"
              name="매출(계획)"
              stroke="#e2836b"
              strokeWidth={2}
              fill="url(#salesPlanGrad)"
              dot={false}
              activeDot={{ r: 4, fill: "#e2836b" }}
              connectNulls
            />
            <Area
              type="monotone"
              dataKey="net"
              name="넷"
              stroke="#7f9cd0"
              strokeWidth={2}
              fill="url(#salesNetGrad)"
              dot={false}
              activeDot={{ r: 4, fill: "#7f9cd0" }}
              connectNulls
            />
            <Area
              type="monotone"
              dataKey="actual"
              name="매출(실적 및 전망)"
              stroke="#5b7fc7"
              strokeWidth={2}
              strokeDasharray="5 3"
              fill="url(#salesActualGrad)"
              dot={false}
              activeDot={{ r: 4, fill: "#5b7fc7" }}
              connectNulls
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Legend + Toggle */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "4px" }}>
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
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginLeft: "8px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <div style={{ width: "20px", height: "8px", borderRadius: "2px", background: "linear-gradient(180deg, #8ea9d8, #dfe6f4)" }} />
            <span style={{ fontSize: "9px", color: "#555" }}>넷</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <div style={{ width: "20px", height: "2px", backgroundColor: "#e2836b" }} />
            <span style={{ fontSize: "9px", color: "#555" }}>매출(계획)</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <div style={{ width: "20px", borderTop: "2px dashed #5b7fc7" }} />
            <span style={{ fontSize: "9px", color: "#555" }}>매출(실적 및 전망)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
