import React, { useState } from "react";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LabelList,
} from "recharts";

export const SALES_DATA = [
  { month: "4월", net: 90, report: null, plan: 101, actual: 98 },
  { month: "5월", net: 98, report: null, plan: 98, actual: 99 },
  { month: "6월", net: 99, report: null, plan: 110, actual: 100 },
  { month: "7월", net: 100, report: null, plan: 102, actual: 91 },
  { month: "8월", net: 103, report: null, plan: 109, actual: 85 },
  { month: "9월", net: null, report: null, plan: 109, actual: null },
];

const CustomBar = (props: any) => {
  const { x, y, width, height, value } = props;
  if (!value) return null;
  return (
    <rect x={x} y={y} width={width} height={height} fill="#1565c0" rx={2} />
  );
};

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
          <ComposedChart data={SALES_DATA} margin={{ top: 15, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e8f0f8" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#666" }} axisLine={false} tickLine={false} />
            <YAxis domain={[60, 140]} tick={{ fontSize: 10, fill: "#666" }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ fontSize: "11px" }} />
            <Bar dataKey="net" name="넷" fill="#1565c0" barSize={20} radius={[2, 2, 0, 0]}>
              <LabelList dataKey="net" position="top" style={{ fontSize: "9px", fill: "#333", fontWeight: "600" }} />
            </Bar>
            <Line
              type="monotone"
              dataKey="plan"
              name="매출(계획)"
              stroke="#1e90ff"
              strokeWidth={1.5}
              dot={{ r: 3, fill: "#1e90ff" }}
              connectNulls
            >
              <LabelList dataKey="plan" position="top" style={{ fontSize: "9px", fill: "#1e90ff" }} />
            </Line>
            <Line
              type="monotone"
              dataKey="actual"
              name="매출(실적 및 전망)"
              stroke="#4caf50"
              strokeWidth={1.5}
              dot={{ r: 3, fill: "#4caf50" }}
              strokeDasharray="4 2"
              connectNulls
            >
              <LabelList dataKey="actual" position="top" style={{ fontSize: "9px", fill: "#4caf50" }} />
            </Line>
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
            <div style={{ width: "20px", height: "2px", backgroundColor: "#1e90ff" }} />
            <span style={{ fontSize: "9px", color: "#555" }}>매출(계획)</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <div style={{ width: "20px", borderTop: "2px dashed #4caf50" }} />
            <span style={{ fontSize: "9px", color: "#555" }}>매출(실적 및 전망)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
