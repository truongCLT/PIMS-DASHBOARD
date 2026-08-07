import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useDashboardData, type PerformanceRow } from "../lib/mgmtreportData";
import { useDashboardFilters } from "../lib/dashboardFilters";
import { DetailModal, DetailDataTable } from "./DetailModal";

export function PerformanceTable() {
  const { t } = useTranslation(["performanceTable", "common"]);
  const { derived, isError } = useDashboardData();
  const { unitIndex } = useDashboardFilters();
  const rows = derived?.performanceRows ?? [];
  const [detailOpen, setDetailOpen] = useState(false);

  return (
    <div style={{
      backgroundColor: "#fff",
      border: "1px solid #e2e9f3",
      borderRadius: "6px",
      padding: "10px 12px",
      overflow: "hidden",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
          <span style={{ fontSize: "13px", fontWeight: "600", color: "#16294a" }}>{t("performanceTable:managementPerformanceStatus")}</span>
          {derived && <span style={{ fontSize: "11px", color: "#7c8ba3" }}>{t("common:unit")}: {derived.unitLabel}</span>}
        </div>
        <button
          onClick={() => setDetailOpen(true)}
          style={{ fontSize: "12px", color: "#2f7cf6", background: "none", border: "none", cursor: "pointer" }}
        >
          {t("performanceTable:viewDetails")}
        </button>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: unitIndex === 1 ? "9.5px" : "11px" }}>
          <thead>
            <tr style={{ backgroundColor: "#e7f1fd" }}>
              <th style={{ padding: "4px 6px", textAlign: "left", color: "#555", fontWeight: "600", borderBottom: "1px solid #e2e9f3" }} rowSpan={2}>{t("performanceTable:category")}</th>
              <th style={{ padding: "4px 6px", textAlign: "center", color: "#555", fontWeight: "600", borderBottom: "1px solid #e2e9f3", borderLeft: "1px solid #e2e9f3" }} colSpan={3}>{t("performanceTable:currentMonthCumulative")}</th>
              <th style={{ padding: "4px 6px", textAlign: "center", color: "#555", fontWeight: "600", borderBottom: "1px solid #e2e9f3", borderLeft: "1px solid #e2e9f3" }} colSpan={3}>{t("common:annual")}</th>
            </tr>
            <tr style={{ backgroundColor: "#eef4fa" }}>
              {[t("common:plan"), t("common:actual"), t("common:achievementRate")].map((h, idx) => (
                <th key={`m-${idx}`} style={{ padding: "3px 6px", textAlign: "right", color: "#666", fontWeight: "500", borderBottom: "1px solid #e2e9f3", borderLeft: "1px solid #e2e9f3" }}>{h}</th>
              ))}
              {[t("common:plan"), t("common:forecast"), t("common:achievementRate")].map((h, idx) => (
                <th key={`y-${idx}`} style={{ padding: "3px 6px", textAlign: "right", color: "#666", fontWeight: "500", borderBottom: "1px solid #e2e9f3", borderLeft: "1px solid #e2e9f3" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} style={{ padding: "12px 6px", textAlign: "center", color: "#888" }}>
                  {isError ? t("performanceTable:loadFailed") : t("performanceTable:dataLoading")}
                </td>
              </tr>
            )}
            {rows.map((row, i) => (
              <React.Fragment key={row.label}>
                <tr style={{ borderBottom: row.sub ? "none" : "1px solid #e7f1fd", backgroundColor: i % 2 === 0 ? "#fff" : "#f8fbff" }}>
                  <td style={{ padding: "4px 6px", color: "#333", fontWeight: "500" }}>{row.label}</td>
                  <td style={{ padding: "4px 6px", textAlign: "right", color: "#333", borderLeft: "1px solid #e7f1fd" }}>{row.planM}</td>
                  <td style={{ padding: "4px 6px", textAlign: "right", color: "#333", borderLeft: "1px solid #e7f1fd" }}>{row.actualM}</td>
                  <td style={{ padding: "4px 6px", textAlign: "right", color: "#2f7cf6", fontWeight: "600", borderLeft: "1px solid #e7f1fd" }}>{row.achM}</td>
                  <td style={{ padding: "4px 6px", textAlign: "right", color: "#333", borderLeft: "1px solid #e7f1fd" }}>{row.planY}</td>
                  <td style={{ padding: "4px 6px", textAlign: "right", color: "#333", borderLeft: "1px solid #e7f1fd" }}>{row.forecastY}</td>
                  <td style={{ padding: "4px 6px", textAlign: "right", color: "#2f7cf6", fontWeight: "600", borderLeft: "1px solid #e7f1fd" }}>{row.achY}</td>
                </tr>
                {row.sub && (
                  <tr style={{ borderBottom: "1px solid #e7f1fd", backgroundColor: i % 2 === 0 ? "#fff" : "#f8fbff" }}>
                    <td style={{ padding: "2px 6px 4px 12px", color: "#888", fontSize: "10px" }}>%</td>
                    <td style={{ padding: "2px 6px 4px", textAlign: "right", color: "#888", fontSize: "10px", borderLeft: "1px solid #e7f1fd" }}>{row.sub}</td>
                    <td style={{ padding: "2px 6px 4px", textAlign: "right", color: "#888", fontSize: "10px", borderLeft: "1px solid #e7f1fd" }}>{row.subActual}</td>
                    <td style={{ padding: "2px 6px 4px", textAlign: "right", color: "#888", fontSize: "10px", borderLeft: "1px solid #e7f1fd" }}></td>
                    <td style={{ padding: "2px 6px 4px", textAlign: "right", color: "#888", fontSize: "10px", borderLeft: "1px solid #e7f1fd" }}>{row.subForecast}</td>
                    <td style={{ padding: "2px 6px 4px", textAlign: "right", color: "#888", fontSize: "10px", borderLeft: "1px solid #e7f1fd" }}>{row.subAch}</td>
                    <td style={{ padding: "2px 6px 4px", borderLeft: "1px solid #e7f1fd" }}></td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      <DetailModal
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        title={t("performanceTable:managementPerformanceStatus")}
      >
        <DetailDataTable
          rowKey={(row) => row.label}
          columns={[
            { key: "label", label: t("performanceTable:category"), align: "left" },
            { key: "planM", label: `${t("performanceTable:currentMonthCumulative")} ${t("common:plan")}` },
            { key: "actualM", label: `${t("performanceTable:currentMonthCumulative")} ${t("common:actual")}` },
            { key: "achM", label: `${t("performanceTable:currentMonthCumulative")} ${t("common:achievementRate")}` },
            { key: "planY", label: `${t("common:annual")} ${t("common:plan")}` },
            { key: "forecastY", label: `${t("common:annual")} ${t("common:forecast")}` },
            { key: "achY", label: `${t("common:annual")} ${t("common:achievementRate")}` },
          ]}
          rows={rows}
        />
      </DetailModal>
    </div>
  );
}
