import React from "react";
import { useDashboardData } from "../lib/mgmtreportData";
import { useDashboardFilters } from "../lib/dashboardFilters";

export function PerformanceTable() {
  const { derived, isError } = useDashboardData();
  const { unitIndex } = useDashboardFilters();
  const rows = derived?.performanceRows ?? [];

  return (
    <div style={{
      backgroundColor: "#fff",
      border: "1px solid #d0dce8",
      borderRadius: "6px",
      padding: "10px 12px",
      overflow: "hidden",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
          <span style={{ fontSize: "13px", fontWeight: "600", color: "#1a3a5c" }}>경영실적 현황</span>
          {derived && <span style={{ fontSize: "11px", color: "#5a6a7e" }}>단위: {derived.unitLabel}</span>}
        </div>
        <button style={{ fontSize: "12px", color: "#1e6fdd", background: "none", border: "none", cursor: "pointer" }}>
          상세보기
        </button>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: unitIndex === 1 ? "9.5px" : "11px" }}>
          <thead>
            <tr style={{ backgroundColor: "#e8f0f8" }}>
              <th style={{ padding: "4px 6px", textAlign: "left", color: "#555", fontWeight: "600", borderBottom: "1px solid #d0dce8" }} rowSpan={2}>구분</th>
              <th style={{ padding: "4px 6px", textAlign: "center", color: "#555", fontWeight: "600", borderBottom: "1px solid #d0dce8", borderLeft: "1px solid #d0dce8" }} colSpan={3}>당월 누적</th>
              <th style={{ padding: "4px 6px", textAlign: "center", color: "#555", fontWeight: "600", borderBottom: "1px solid #d0dce8", borderLeft: "1px solid #d0dce8" }} colSpan={3}>연간</th>
            </tr>
            <tr style={{ backgroundColor: "#eef4fa" }}>
              {["계획", "실적", "달성률"].map((h) => (
                <th key={h} style={{ padding: "3px 6px", textAlign: "right", color: "#666", fontWeight: "500", borderBottom: "1px solid #d0dce8", borderLeft: "1px solid #d0dce8" }}>{h}</th>
              ))}
              {["계획", "전망", "달성률"].map((h) => (
                <th key={h} style={{ padding: "3px 6px", textAlign: "right", color: "#666", fontWeight: "500", borderBottom: "1px solid #d0dce8", borderLeft: "1px solid #d0dce8" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} style={{ padding: "12px 6px", textAlign: "center", color: "#888" }}>
                  {isError ? "데이터를 불러오지 못했습니다." : "데이터 로딩 중…"}
                </td>
              </tr>
            )}
            {rows.map((row, i) => (
              <React.Fragment key={row.label}>
                <tr style={{ borderBottom: row.sub ? "none" : "1px solid #e8f0f8", backgroundColor: i % 2 === 0 ? "#fff" : "#f8fbff" }}>
                  <td style={{ padding: "4px 6px", color: "#333", fontWeight: "500" }}>{row.label}</td>
                  <td style={{ padding: "4px 6px", textAlign: "right", color: "#333", borderLeft: "1px solid #e8f0f8" }}>{row.planM}</td>
                  <td style={{ padding: "4px 6px", textAlign: "right", color: "#333", borderLeft: "1px solid #e8f0f8" }}>{row.actualM}</td>
                  <td style={{ padding: "4px 6px", textAlign: "right", color: "#1565c0", fontWeight: "600", borderLeft: "1px solid #e8f0f8" }}>{row.achM}</td>
                  <td style={{ padding: "4px 6px", textAlign: "right", color: "#333", borderLeft: "1px solid #e8f0f8" }}>{row.planY}</td>
                  <td style={{ padding: "4px 6px", textAlign: "right", color: "#333", borderLeft: "1px solid #e8f0f8" }}>{row.forecastY}</td>
                  <td style={{ padding: "4px 6px", textAlign: "right", color: "#1565c0", fontWeight: "600", borderLeft: "1px solid #e8f0f8" }}>{row.achY}</td>
                </tr>
                {row.sub && (
                  <tr style={{ borderBottom: "1px solid #e8f0f8", backgroundColor: i % 2 === 0 ? "#fff" : "#f8fbff" }}>
                    <td style={{ padding: "2px 6px 4px 12px", color: "#888", fontSize: "10px" }}>%</td>
                    <td style={{ padding: "2px 6px 4px", textAlign: "right", color: "#888", fontSize: "10px", borderLeft: "1px solid #e8f0f8" }}>{row.sub}</td>
                    <td style={{ padding: "2px 6px 4px", textAlign: "right", color: "#888", fontSize: "10px", borderLeft: "1px solid #e8f0f8" }}>{row.subActual}</td>
                    <td style={{ padding: "2px 6px 4px", textAlign: "right", color: "#888", fontSize: "10px", borderLeft: "1px solid #e8f0f8" }}></td>
                    <td style={{ padding: "2px 6px 4px", textAlign: "right", color: "#888", fontSize: "10px", borderLeft: "1px solid #e8f0f8" }}>{row.subForecast}</td>
                    <td style={{ padding: "2px 6px 4px", textAlign: "right", color: "#888", fontSize: "10px", borderLeft: "1px solid #e8f0f8" }}>{row.subAch}</td>
                    <td style={{ padding: "2px 6px 4px", borderLeft: "1px solid #e8f0f8" }}></td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
