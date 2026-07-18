import React from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

export const ORDER_STATUS = {
  planTotal: 2000,
  ordered: 1250,
  remaining: 750,
};

export function OrderStatus() {
  const { planTotal, ordered, remaining } = ORDER_STATUS;
  const pct = Math.round((ordered / planTotal) * 100);

  const donutData = [
    { name: "수주", value: ordered, color: "#1565c0" },
    { name: "잔여", value: remaining, color: "#e0e8f0" },
  ];

  return (
    <div style={{
      backgroundColor: "#fff",
      border: "1px solid #d0dce8",
      borderRadius: "6px",
      padding: "10px 12px",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
        <span style={{ fontSize: "12px", fontWeight: "600", color: "#1a3a5c" }}>수주 실적 현황</span>
      </div>

      {/* Donut chart with center label */}
      <div style={{ height: "132px", position: "relative", marginBottom: "6px" }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={donutData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={42}
              outerRadius={58}
              startAngle={90}
              endAngle={-270}
              strokeWidth={0}
              isAnimationActive={false}
            >
              {donutData.map((row) => (
                <Cell key={row.name} fill={row.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ fontSize: "11px" }}
              formatter={(v: any) => Number(v).toLocaleString()}
            />
          </PieChart>
        </ResponsiveContainer>
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            textAlign: "center",
            pointerEvents: "none",
          }}
        >
          <div style={{ fontSize: "18px", fontWeight: 700, color: "#1565c0" }}>{pct}%</div>
          <div style={{ fontSize: "8px", color: "#888" }}>계획 대비</div>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
        <div style={{ flex: 1, textAlign: "center", borderRight: "1px solid #e8f0f8" }}>
          <div style={{ fontSize: "10px", color: "#888", marginBottom: "2px" }}>계획</div>
          <div style={{ fontSize: "18px", fontWeight: "700", color: "#1a3a5c" }}>
            {planTotal.toLocaleString()}
          </div>
        </div>
        <div style={{ flex: 1, textAlign: "center", borderRight: "1px solid #e8f0f8" }}>
          <div style={{ fontSize: "10px", color: "#888", marginBottom: "2px" }}>수주</div>
          <div style={{ fontSize: "18px", fontWeight: "700", color: "#1565c0" }}>
            {ordered.toLocaleString()}
          </div>
        </div>
        <div style={{ flex: 1, textAlign: "center" }}>
          <div style={{ fontSize: "10px", color: "#888", marginBottom: "2px" }}>잔여</div>
          <div style={{ fontSize: "18px", fontWeight: "700", color: "#ff7043" }}>
            {remaining.toLocaleString()}
          </div>
        </div>
      </div>

      <button style={{
        width: "100%",
        textAlign: "right",
        fontSize: "11px",
        color: "#1e6fdd",
        background: "none",
        border: "none",
        cursor: "pointer",
        padding: "0",
      }}>
        상세보기
      </button>
    </div>
  );
}
