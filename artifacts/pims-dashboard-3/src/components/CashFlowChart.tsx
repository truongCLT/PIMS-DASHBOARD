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

const PRIMARY_COLOR = "var(--color-primary-blue)";
const CORAL_COLOR = "var(--color-accent-coral)";
const NAVY_COLOR = "var(--color-primary-navy)";
const LIGHT_BLUE_COLOR = "var(--color-chart-light-blue)";

const CustomInflowLabel = (props: any) => {
  const { x, y, width, value } = props;
  if (!value) return null;
  return (
    <text x={x + width / 2} y={y - 6} fill="var(--color-text-primary)" textAnchor="middle" fontSize={11} fontWeight="700">
      +{value}
    </text>
  );
};

const CustomOutflowLabel = (props: any) => {
  const { x, y, width, height, value } = props;
  if (!value) return null;
  return (
    <text x={x + width / 2} y={y + height + 14} fill="var(--color-text-primary)" textAnchor="middle" fontSize={11} fontWeight="700">
      {value}
    </text>
  );
};

export function CashFlowChart() {
  return (
    <div style={{
      backgroundColor: "var(--color-card-bg)",
      borderRadius: "14px",
      boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
      padding: "20px 24px",
      display: "flex",
      flexDirection: "column",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <span style={{ fontSize: "14px", fontWeight: "600", color: "var(--color-text-primary)" }}>자금수지</span>
        <button style={{ fontSize: "12px", color: "var(--color-primary-blue)", background: "none", border: "none", cursor: "pointer", fontWeight: "500" }}>
          상세보기
        </button>
      </div>

      <div style={{ height: "200px", flex: 1 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={CASHFLOW_DATA} margin={{ top: 20, right: 30, left: -20, bottom: 10 }}>
            <CartesianGrid stroke="var(--color-chart-grid)" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--color-text-secondary)" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "var(--color-text-secondary)" }} axisLine={false} tickLine={false} />
            <Tooltip
              cursor={{ fill: "rgba(74, 127, 212, 0.08)" }}
              contentStyle={{ fontSize: "12px", borderRadius: "8px", border: "none", backgroundColor: "#fff", color: "var(--color-text-primary)", boxShadow: "0 4px 16px rgba(0,0,0,0.1)" }}
            />
            <ReferenceLine y={0} stroke="var(--color-chart-baseline)" strokeWidth={1} />
            <Bar dataKey="inflow" name="자금 유입" fill={PRIMARY_COLOR} barSize={24} radius={[5, 5, 0, 0]} isAnimationActive={false}>
              <LabelList dataKey="inflow" content={CustomInflowLabel} />
            </Bar>
            <Bar dataKey="outflow" name="자금 유출" fill={CORAL_COLOR} barSize={24} radius={[0, 0, 5, 5]} isAnimationActive={false}>
              <LabelList dataKey="outflow" content={CustomOutflowLabel} />
            </Bar>
            <Line
              type="monotone"
              dataKey="loan"
              name="차액"
              stroke={NAVY_COLOR}
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 5, fill: NAVY_COLOR, stroke: "#fff", strokeWidth: 2 }}
              isAnimationActive
              animationDuration={500}
              animationEasing="ease-out"
            />
            <Line
              type="monotone"
              dataKey="net"
              name="자금 잔액"
              stroke={LIGHT_BLUE_COLOR}
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 5, fill: LIGHT_BLUE_COLOR, stroke: "#fff", strokeWidth: 2 }}
              isAnimationActive
              animationDuration={500}
              animationEasing="ease-out"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", marginTop: "16px", justifyContent: "center" }}>
        {[
          { color: PRIMARY_COLOR, label: "자금 유입", type: "rect" },
          { color: CORAL_COLOR, label: "자금 유출", type: "rect" },
          { color: NAVY_COLOR, label: "차액", type: "line" },
          { color: LIGHT_BLUE_COLOR, label: "자금 잔액", type: "line" },
        ].map((item) => (
          <div key={item.label} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: item.color, flexShrink: 0 }} />
            <span style={{ fontSize: "12px", color: "var(--color-text-secondary)", fontWeight: "500" }}>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
