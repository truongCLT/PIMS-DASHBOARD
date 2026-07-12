import React from "react";

export const PERFORMANCE_ROWS = [
  {
    label: "수주",
    planM: "139,957", actualM: "139,957", achM: "100%",
    planY: "139,957", forecastY: "139,957", achY: "100%",
  },
  {
    label: "매출",
    planM: "9,132", actualM: "11,423", achM: "125%",
    planY: "100,037", forecastY: "101,636", achY: "102%",
  },
  {
    label: "매출이익",
    planM: "1,350", actualM: "3,456", achM: "256%",
    planY: "14,631", forecastY: "16,771", achY: "115%",
    sub: "14.9%", subActual: "30.3%", subForecast: "14.6%", subAch: "16.5%",
  },
  {
    label: "판관비",
    planM: "684", actualM: "445", achM: "65%",
    planY: "3,480", forecastY: "3,055", achY: "88%",
    sub: "7.5%", subActual: "3.9%", subForecast: "3.5%", subAch: "3.0%",
  },
  {
    label: "영업이익",
    planM: "666", actualM: "3,012", achM: "452%",
    planY: "11,151", forecastY: "13,717", achY: "123%",
    sub: "7.3%", subActual: "26.4%", subForecast: "11.1%", subAch: "13.5%",
  },
  {
    label: "경상이익",
    planM: "1,781", actualM: "3,840", achM: "216%",
    planY: "13,339", forecastY: "15,430", achY: "116%",
    sub: "19.5%", subActual: "33.6%", subForecast: "13.3%", subAch: "15.2%",
  },
];

export function PerformanceTable() {
  return (
    <div style={{
      backgroundColor: "#fff",
      border: "1px solid #d0dce8",
      borderRadius: "6px",
      padding: "10px 12px",
      overflow: "hidden",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
        <span style={{ fontSize: "12px", fontWeight: "600", color: "#1a3a5c" }}>경영실적 현황</span>
        <button style={{ fontSize: "11px", color: "#1e6fdd", background: "none", border: "none", cursor: "pointer" }}>
          상세보기
        </button>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "10px" }}>
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
            {PERFORMANCE_ROWS.map((row, i) => (
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
                    <td style={{ padding: "2px 6px 4px 12px", color: "#888", fontSize: "9px" }}>%</td>
                    <td style={{ padding: "2px 6px 4px", textAlign: "right", color: "#888", fontSize: "9px", borderLeft: "1px solid #e8f0f8" }}>{row.sub}</td>
                    <td style={{ padding: "2px 6px 4px", textAlign: "right", color: "#888", fontSize: "9px", borderLeft: "1px solid #e8f0f8" }}>{row.subActual}</td>
                    <td style={{ padding: "2px 6px 4px", textAlign: "right", color: "#888", fontSize: "9px", borderLeft: "1px solid #e8f0f8" }}></td>
                    <td style={{ padding: "2px 6px 4px", textAlign: "right", color: "#888", fontSize: "9px", borderLeft: "1px solid #e8f0f8" }}>{row.subForecast}</td>
                    <td style={{ padding: "2px 6px 4px", textAlign: "right", color: "#888", fontSize: "9px", borderLeft: "1px solid #e8f0f8" }}>{row.subAch}</td>
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
