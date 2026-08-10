import React from "react";
import { useTranslation } from "react-i18next";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { useDashboardData } from "../lib/mgmtreportData";
import { useDashboardFilters } from "../lib/dashboardFilters";
import { tokens as aquaTokens } from "@workspace/aqua-glass";
const AG = aquaTokens.color.light;

export function OrderStatus() {
  const { t } = useTranslation(["orderStatus", "common"]);
  const { derived } = useDashboardData();
  const { unitIndex } = useDashboardFilters();
  const statFont = unitIndex === 1 ? "12px" : "20px";
  const unavailable = derived != null && derived.orderStatus == null;
  const planTotal = derived?.orderStatus?.planTotal ?? 0;
  const ordered = derived?.orderStatus?.ordered ?? 0;
  const remaining = derived?.orderStatus?.remaining ?? 0;
  const pct = planTotal ? Math.round((ordered / planTotal) * 100) : 0;

  if (unavailable) {
    return (
      <div style={{
        backgroundColor: "#fff",
        border: `1px solid ${AG.border}`,
        borderRadius: "6px",
        padding: "10px 12px",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
          <span style={{ fontSize: "13px", fontWeight: "600", color: AG.foreground }}>{t("orderStatus:title")}</span>
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
            ? t("orderStatus:noDataForPeriod")
            : t("orderStatus:noProjectOrderData")}
        </div>
      </div>
    );
  }

  const donutData = [
    { name: t("common:orderReceived"), value: ordered, color: AG.primary },
    { name: t("orderStatus:remaining"), value: remaining, color: AG.border },
  ];

  return (
    <div style={{
      backgroundColor: "#fff",
      border: `1px solid ${AG.border}`,
      borderRadius: "6px",
      padding: "10px 12px",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
        <span style={{ fontSize: "13px", fontWeight: "600", color: AG.foreground }}>{t("orderStatus:title")}</span>
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
          <div style={{ fontSize: "20px", fontWeight: 700, color: AG.primary }}>{pct}%</div>
          <div style={{ fontSize: "9px", color: "#888" }}>{t("orderStatus:vsPlan")}</div>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
        <div style={{ flex: 1, textAlign: "center", borderRight: `1px solid ${AG.sidebarAccent}` }}>
          <div style={{ fontSize: "11px", color: "#888", marginBottom: "2px" }}>{t("common:plan")}</div>
          <div style={{ fontSize: statFont, fontWeight: "700", color: AG.foreground }}>
            {planTotal.toLocaleString()}
          </div>
        </div>
        <div style={{ flex: 1, textAlign: "center", borderRight: `1px solid ${AG.sidebarAccent}` }}>
          <div style={{ fontSize: "11px", color: "#888", marginBottom: "2px" }}>{t("common:orderReceived")}</div>
          <div style={{ fontSize: statFont, fontWeight: "700", color: AG.primary }}>
            {ordered.toLocaleString()}
          </div>
        </div>
        <div style={{ flex: 1, textAlign: "center" }}>
          <div style={{ fontSize: "11px", color: "#888", marginBottom: "2px" }}>{t("orderStatus:remaining")}</div>
          <div style={{ fontSize: statFont, fontWeight: "700", color: "#ff7043" }}>
            {remaining.toLocaleString()}
          </div>
        </div>
      </div>

      <button style={{
        width: "100%",
        textAlign: "right",
        fontSize: "12px",
        color: AG.primary,
        background: "none",
        border: "none",
        cursor: "pointer",
        padding: "0",
      }}>
        {t("orderStatus:viewDetails")}
      </button>
    </div>
  );
}
