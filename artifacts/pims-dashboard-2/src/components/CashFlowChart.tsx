import React from "react";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LabelList,
  ReferenceLine,
} from "recharts";
import { filterUpToLastMonth } from "../lib/monthRange";

export const CASHFLOW_DATA = [
  { month: "1월", inflow: 20, outflow: -20, loan: 10, net: -5 },
  { month: "2월", inflow: 40, outflow: -10, loan: 15, net: 8 },
  { month: "3월", inflow: 20, outflow: -20, loan: 10, net: -5 },
  { month: "4월", inflow: 50, outflow: -20, loan: 20, net: 15 },
  { month: "5월", inflow: 25, outflow: -20, loan: 12, net: 5 },
  { month: "6월", inflow: 30, outflow: -10, loan: 8, net: 10 },
];

const START_BALANCE = 30;

const COMBO_DATA = (() => {
  let cum = START_BALANCE;
  const rows = CASHFLOW_DATA.map((r) => {
    cum += r.net;
    return { month: r.month, inflow: r.inflow, outflow: r.outflow, balance: cum };
  });
  return filterUpToLastMonth(rows, (r) => r.month);
})();

const InflowLabel = (props: any) => {
  const { x, y, width, value } = props;
  if (!value) return null;
  return (
    <text x={x + width / 2} y={y - 3} fill="#1565c0" textAnchor="middle" fontSize={8} fontWeight="600">
      +{value}
    </text>
  );
};

const OutflowLabel = (props: any) => {
  const { x, y, width, height, value } = props;
  if (!value) return null;
  const bottom = Math.max(y, y + height);
  return (
    <text x={x + width / 2} y={bottom + 9} fill="#e53935" textAnchor="middle" fontSize={8} fontWeight="600">
      {value}
    </text>
  );
};

export function CashFlowChart() {
  return (
    <div style={{
      backgroundColor: "#fff",
      border: "1px solid #d0dce8",
      borderRadius: "6px",
      padding: "10px 12px",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
        <span style={{ fontSize: "12px", fontWeight: "600", color: "#1a3a5c" }}>자금수지</span>
        <button style={{ fontSize: "11px", color: "#1e6fdd", background: "none", border: "none", cursor: "pointer" }}>
          상세보기
        </button>
      </div>

      <div style={{ height: "160px" }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={COMBO_DATA} margin={{ top: 20, right: 10, left: -20, bottom: 12 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e8f0f8" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#666" }} axisLine={false} tickLine={false} />
            <YAxis
              tick={{ fontSize: 10, fill: "#666" }}
              axisLine={false}
              tickLine={false}
              domain={[(dataMin: number) => Math.floor(dataMin - 12), (dataMax: number) => Math.ceil(dataMax + 5)]}
            />
            <Tooltip contentStyle={{ fontSize: "11px" }} />
            <ReferenceLine y={0} stroke="#ccc" />
            <Bar isAnimationActive={false} dataKey="inflow" name="자금 유입" fill="#1565c0" barSize={16} radius={[2, 2, 0, 0]}>
              <LabelList dataKey="inflow" content={InflowLabel} />
            </Bar>
            <Bar isAnimationActive={false} dataKey="outflow" name="자금 유출" fill="#e53935" barSize={16} radius={[0, 0, 2, 2]}>
              <LabelList dataKey="outflow" content={OutflowLabel} />
            </Bar>
            <Line
              isAnimationActive={false}
              type="monotone"
              dataKey="balance"
              name="누적 현금 잔액"
              stroke="#1a3a5c"
              strokeWidth={2}
              dot={{ r: 3, fill: "#1a3a5c" }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "4px" }}>
        {[
          { color: "#1565c0", label: "자금 유입", type: "rect" },
          { color: "#e53935", label: "자금 유출", type: "rect" },
          { color: "#1a3a5c", label: "누적 현금 잔액", type: "line" },
        ].map((item) => (
          <div key={item.label} style={{ display: "flex", alignItems: "center", gap: "3px" }}>
            {item.type === "rect" ? (
              <div style={{ width: "12px", height: "8px", backgroundColor: item.color, borderRadius: "1px" }} />
            ) : (
              <div style={{ width: "16px", height: "2px", backgroundColor: item.color }} />
            )}
            <span style={{ fontSize: "9px", color: "#555" }}>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
