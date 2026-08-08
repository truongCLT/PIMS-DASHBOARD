import React from "react";
import { useTranslation } from "react-i18next";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { useDashboardData } from "../lib/mgmtreportData";
import { useDashboardFilters } from "../lib/dashboardFilters";

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
        border: "1px solid #e2e9f3",
        borderRadius: "6px",
        padding: "10px 12px",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
          <span style={{ fontSize: "13px", fontWeight: "600", color: "#16294a" }}>{t("orderStatus:title")}</span>
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
    { name: t("orderStatus:orderActual"), value: ordered, color: "#3d6fdc" },
    { name: t("orderStatus:remainingUnordered"), value: remaining, color: "#eef1f6" },
  ];
  const pctColor = pct >= 100 ? "#2e9e5b" : "#c0392b";
  const unit = derived?.unitLabel;

  const rows = [
    { dot: "#3d6fdc", label: t("orderStatus:orderActual"), value: ordered },
    { dot: "#e3e7ee", label: t("orderStatus:remainingUnordered"), value: remaining },
    { dot: "#1a2233", label: t("orderStatus:annualOrderPlan"), value: planTotal },
  ];

  return (
    <div style={{
      backgroundColor: "#fff",
      border: "1px solid #e2e9f3",
      borderRadius: "6px",
      padding: "10px 12px",
      display: "flex",
      flexDirection: "column",
    }}>
      {/* Header: title · unit · 상세보기 */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "baseline",
        paddingBottom: "8px", borderBottom: "1px solid #eef1f6", marginBottom: "6px",
      }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
          <span style={{ fontSize: "13px", fontWeight: "600", color: "#16294a" }}>{t("orderStatus:title")}</span>
          {unit && <span style={{ fontSize: "11px", color: "#7c8ba3" }}>{unit}</span>}
        </div>
        <button style={{
          fontSize: "12px", color: "#2f7cf6", background: "none",
          border: "none", cursor: "pointer", padding: 0,
        }}>
          {t("orderStatus:viewDetails")}
        </button>
      </div>

      {/* Donut chart with center label */}
      <div style={{ height: "148px", position: "relative", marginBottom: "6px" }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={donutData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={52}
              outerRadius={68}
              startAngle={90}
              endAngle={-270}
              cornerRadius={8}
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
          <div style={{ fontSize: "24px", fontWeight: 800, color: pctColor }}>{pct}%</div>
          <div style={{ fontSize: "10px", color: "#8a99b5" }}>{t("orderStatus:vsAnnualPlan")}</div>
        </div>
      </div>

      {/* Stats list */}
      <div style={{ borderTop: "1px solid #eef1f6" }}>
        {rows.map((r, i) => (
          <div key={r.label} style={{
            display: "flex", alignItems: "center", gap: "8px",
            padding: "8px 2px",
            borderBottom: i < rows.length - 1 ? "1px solid #f2f4f8" : "none",
          }}>
            <span style={{ width: "9px", height: "9px", borderRadius: "3px", backgroundColor: r.dot, flexShrink: 0 }} />
            <span style={{ fontSize: "12px", color: "#333", flex: 1, minWidth: 0 }}>{r.label}</span>
            <span style={{ fontSize: statFont === "12px" ? "12px" : "15px", fontWeight: 700, color: "#1a2d4d" }}>
              {r.value.toLocaleString()}
            </span>
            {unit && <span style={{ fontSize: "10px", color: "#8a99b5" }}>{unit}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
