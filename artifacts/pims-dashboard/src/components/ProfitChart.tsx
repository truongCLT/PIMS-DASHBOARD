import React from "react";
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
  Cell,
} from "recharts";

const data = [
  { month: "1월", revenue: 500, profit: 320, loss: -10, management: 40, operating: 0 },
  { month: "2월", revenue: 540, profit: 350, loss: -20, management: 45, operating: 0 },
  { month: "3월", revenue: 580, profit: 370, loss: -10, management: 40, operating: 0 },
  { month: "4월", revenue: 620, profit: 390, loss: -20, management: 42, operating: 0 },
  { month: "5월", revenue: 660, profit: 420, loss: -20, management: 40, operating: 0 },
  { month: "6월", revenue: 700, profit: 450, loss: -10, management: 45, operating: 0 },
];

const LABEL_PERCENT: Record<string, string> = {
  "1월": "10%",
  "2월": "11%",
  "3월": "10%",
  "4월": "12%",
  "5월": "13%",
  "6월": "13%",
};

const CustomLabel = (props: any) => {
  const { x, y, width, value, index } = props;
  const months = data.map(d => d.month);
  const month = months[index];
  return (
    <text x={x + width / 2} y={y - 2} fill="#1565c0" textAnchor="middle" fontSize={8} fontWeight="600">
      {value}
      <tspan dy={8} x={x + width / 2} fill="#888" fontSize={8}>({LABEL_PERCENT[month]})</tspan>
    </text>
  );
};

export function ProfitChart() {
  return (
    <div style={{
      backgroundColor: "#fff",
      border: "1px solid #d0dce8",
      borderRadius: "6px",
      padding: "10px 12px",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
        <span style={{ fontSize: "12px", fontWeight: "600", color: "#1a3a5c" }}>손익현황</span>
        <button style={{ fontSize: "11px", color: "#1e6fdd", background: "none", border: "none", cursor: "pointer" }}>
          상세보기
        </button>
      </div>

      <div style={{ height: "160px" }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 25, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e8f0f8" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#666" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "#666" }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ fontSize: "11px" }} />
            <Bar dataKey="revenue" name="매출액" fill="#c5d8f0" barSize={16} stackId="a" />
            <Bar dataKey="profit" name="영업이익" fill="#1565c0" barSize={16} stackId="b" radius={[2, 2, 0, 0]}>
              <LabelList dataKey="profit" content={CustomLabel} />
            </Bar>
            <Bar dataKey="loss" name="영업이익수익" fill="#42a5f5" barSize={16} stackId="b" />
            <Line
              type="monotone"
              dataKey="management"
              name="판관비"
              stroke="#ff9800"
              strokeWidth={1.5}
              dot={{ r: 3, fill: "#ff9800" }}
            />
            <Line
              type="monotone"
              dataKey="operating"
              name="영업이익"
              stroke="#e53935"
              strokeWidth={1.5}
              dot={{ r: 3, fill: "#e53935" }}
              strokeDasharray="4 2"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "4px" }}>
        {[
          { color: "#c5d8f0", label: "매출액", type: "rect" },
          { color: "#1565c0", label: "영업이익", type: "rect" },
          { color: "#42a5f5", label: "영업이익수익", type: "rect" },
          { color: "#ff9800", label: "판관비", type: "line" },
          { color: "#e53935", label: "영업이익", type: "dash" },
        ].map((item) => (
          <div key={item.label + item.color} style={{ display: "flex", alignItems: "center", gap: "3px" }}>
            {item.type === "rect" ? (
              <div style={{ width: "12px", height: "8px", backgroundColor: item.color, borderRadius: "1px" }} />
            ) : item.type === "line" ? (
              <div style={{ width: "16px", height: "2px", backgroundColor: item.color }} />
            ) : (
              <div style={{ width: "16px", height: "0px", borderTop: `2px dashed ${item.color}` }} />
            )}
            <span style={{ fontSize: "9px", color: "#555" }}>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
