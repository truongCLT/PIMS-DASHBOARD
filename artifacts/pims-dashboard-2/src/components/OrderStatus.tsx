import React from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { useDashboardData } from "../lib/mgmtreportData";

export function OrderStatus() {
  const { derived } = useDashboardData();
  const unavailable = derived != null && derived.orderStatus == null;
  const planTotal = derived?.orderStatus?.planTotal ?? 0;
  const ordered = derived?.orderStatus?.ordered ?? 0;
  const remaining = derived?.orderStatus?.remaining ?? 0;
  const pct = planTotal ? Math.round((ordered / planTotal) * 100) : 0;

  if (unavailable) {
    return (
      <div style={{
        backgroundColor: "#fff",
        border: "1px solid #d0dce8",
        borderRadius: "6px",
        padding: "10px 12px",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
          <span style={{ fontSize: "13px", fontWeight: "600", color: "#1a3a5c" }}>수주 실적 현황</span>
        </div>
        <div style={{
          height: "150px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "12px",
          color: "#888",
          textAlign: "center",
          padding: "0 10px",
        }}>
          {derived?.emptyRange
            ? "선택한 기간에 데이터가 없습니다."
            : "프로젝트별 수주 데이터는 제공되지 않습니다."}
        </div>
      </div>
    );
  }

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
        <span style={{ fontSize: "13px", fontWeight: "600", color: "#1a3a5c" }}>수주 실적 현황</span>
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
              contentStyle={{ fontSize: "12px" }}
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
          <div style={{ fontSize: "20px", fontWeight: 700, color: "#1565c0" }}>{pct}%</div>
          <div style={{ fontSize: "9px", color: "#888" }}>계획 대비</div>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
        <div style={{ flex: 1, textAlign: "center", borderRight: "1px solid #e8f0f8" }}>
          <div style={{ fontSize: "11px", color: "#888", marginBottom: "2px" }}>계획</div>
          <div style={{ fontSize: "20px", fontWeight: "700", color: "#1a3a5c" }}>
            {planTotal.toLocaleString()}
          </div>
        </div>
        <div style={{ flex: 1, textAlign: "center", borderRight: "1px solid #e8f0f8" }}>
          <div style={{ fontSize: "11px", color: "#888", marginBottom: "2px" }}>수주</div>
          <div style={{ fontSize: "20px", fontWeight: "700", color: "#1565c0" }}>
            {ordered.toLocaleString()}
          </div>
        </div>
        <div style={{ flex: 1, textAlign: "center" }}>
          <div style={{ fontSize: "11px", color: "#888", marginBottom: "2px" }}>잔여</div>
          <div style={{ fontSize: "20px", fontWeight: "700", color: "#ff7043" }}>
            {remaining.toLocaleString()}
          </div>
        </div>
      </div>

      <button style={{
        width: "100%",
        textAlign: "right",
        fontSize: "12px",
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
