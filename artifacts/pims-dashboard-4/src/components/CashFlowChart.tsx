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

export const CASHFLOW_DATA = [
  { month: "1월", inflow: 20, outflow: -20, loan: 10, net: -5 },
  { month: "2월", inflow: 40, outflow: -10, loan: 15, net: 8 },
  { month: "3월", inflow: 20, outflow: -20, loan: 10, net: -5 },
  { month: "4월", inflow: 50, outflow: -20, loan: 20, net: 15 },
  { month: "5월", inflow: 25, outflow: -20, loan: 12, net: 5 },
  { month: "6월", inflow: 30, outflow: -10, loan: 8, net: 10 },
];

const COLORS: Record<string, string> = {
  "1월": "var(--color-primary-blue)",
  "2월": "var(--color-blue-bright)",
  "3월": "var(--color-primary-blue)",
  "4월": "var(--color-primary-blue)",
  "5월": "var(--color-primary-blue)",
  "6월": "var(--color-primary-blue)",
};

const CustomInflowLabel = (props: any) => {
  const { x, y, width, value } = props;
  if (!value) return null;
  return (
    <text x={x + width / 2} y={y - 3} fill="var(--color-primary-blue)" textAnchor="middle" fontSize={8} fontWeight="600">
      +{value}
    </text>
  );
};

const CustomOutflowLabel = (props: any) => {
  const { x, y, width, height, value } = props;
  if (!value) return null;
  return (
    <text x={x + width / 2} y={y + height + 10} fill="var(--color-danger)" textAnchor="middle" fontSize={8} fontWeight="600">
      {value}
    </text>
  );
};

export function CashFlowChart() {
  return (
    <div style={{
      backgroundColor: "var(--color-card-bg)",
      border: "1px solid var(--color-card-border)",
      borderRadius: "14px",
      padding: "16px 20px",
      boxShadow: "var(--shadow-card)",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
        <span style={{ fontSize: "14px", fontWeight: "600", color: "var(--color-text-strong)" }}>자금수지</span>
        <button style={{ fontSize: "11px", color: "var(--color-primary-blue)", background: "none", border: "none", cursor: "pointer" }}>
          상세보기
        </button>
      </div>

      <div style={{ height: "160px" }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={CASHFLOW_DATA} margin={{ top: 20, right: 30, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-divider)" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 10, fill: "var(--color-text-muted)" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "var(--color-text-muted)" }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ fontSize: "11px" }} />
            <ReferenceLine y={0} stroke="var(--color-divider)" />
            <Bar dataKey="inflow" name="자금 유입" fill="var(--color-primary-blue)" barSize={18} radius={[2, 2, 0, 0]}>
              <LabelList dataKey="inflow" content={CustomInflowLabel} />
            </Bar>
            <Bar dataKey="outflow" name="자금 유출" fill="var(--color-danger)" barSize={18} radius={[0, 0, 2, 2]}>
              <LabelList dataKey="outflow" content={CustomOutflowLabel} />
            </Bar>
            <Line
              type="monotone"
              dataKey="loan"
              name="차액"
              stroke="var(--color-sky-light)"
              strokeWidth={1.5}
              dot={{ r: 3, fill: "var(--color-sky-light)" }}
            />
            <Line
              type="monotone"
              dataKey="net"
              name="자금 잔액"
              stroke="var(--color-navy-mid)"
              strokeWidth={1.5}
              dot={{ r: 3, fill: "var(--color-navy-mid)" }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "4px" }}>
        {[
          { color: "var(--color-primary-blue)", label: "자금 유입", type: "rect" },
          { color: "var(--color-danger)", label: "자금 유출", type: "rect" },
          { color: "var(--color-sky-light)", label: "차액", type: "line" },
          { color: "var(--color-navy-mid)", label: "자금 잔액", type: "line" },
        ].map((item) => (
          <div key={item.label} style={{ display: "flex", alignItems: "center", gap: "3px" }}>
            {item.type === "rect" ? (
              <div style={{ width: "12px", height: "8px", backgroundColor: item.color, borderRadius: "1px" }} />
            ) : (
              <div style={{ width: "16px", height: "2px", backgroundColor: item.color }} />
            )}
            <span style={{ fontSize: "9px", color: "var(--color-text-muted)" }}>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
