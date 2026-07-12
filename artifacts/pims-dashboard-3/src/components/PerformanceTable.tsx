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
      backgroundColor: "var(--color-card-bg)",
      borderRadius: "14px",
      boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
      padding: "20px 24px",
      overflow: "hidden",
      display: "flex",
      flexDirection: "column",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <span style={{ fontSize: "14px", fontWeight: "600", color: "var(--color-text-primary)" }}>경영실적 현황</span>
        <button style={{ fontSize: "12px", color: "var(--color-primary-blue)", background: "none", border: "none", cursor: "pointer", fontWeight: "500" }}>
          상세보기
        </button>
      </div>

      <div style={{ overflowX: "auto", flex: 1 }}>
        <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, fontSize: "11px" }}>
          <thead>
            <tr>
              <th style={{ backgroundColor: "rgba(74, 127, 212, 0.05)", padding: "8px 12px", textAlign: "left", color: "var(--color-text-primary)", fontWeight: "600", borderBottom: "1px solid var(--color-border)", borderRadius: "8px 0 0 0" }} rowSpan={2}>구분</th>
              <th style={{ backgroundColor: "rgba(74, 127, 212, 0.05)", padding: "8px 12px", textAlign: "center", color: "var(--color-text-primary)", fontWeight: "600", borderBottom: "1px solid var(--color-border)", borderLeft: "1px solid #fff" }} colSpan={3}>당월 누적</th>
              <th style={{ backgroundColor: "rgba(74, 127, 212, 0.05)", padding: "8px 12px", textAlign: "center", color: "var(--color-text-primary)", fontWeight: "600", borderBottom: "1px solid var(--color-border)", borderLeft: "1px solid #fff", borderRadius: "0 8px 0 0" }} colSpan={3}>연간</th>
            </tr>
            <tr>
              {["계획", "실적", "달성률"].map((h) => (
                <th key={h} style={{ backgroundColor: "rgba(74, 127, 212, 0.03)", padding: "6px 12px", textAlign: "right", color: "var(--color-text-secondary)", fontWeight: "500", borderBottom: "1px solid var(--color-border)", borderLeft: "1px solid #fff" }}>{h}</th>
              ))}
              {["계획", "전망", "달성률"].map((h) => (
                <th key={h} style={{ backgroundColor: "rgba(74, 127, 212, 0.03)", padding: "6px 12px", textAlign: "right", color: "var(--color-text-secondary)", fontWeight: "500", borderBottom: "1px solid var(--color-border)", borderLeft: "1px solid #fff" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PERFORMANCE_ROWS.map((row, i) => {
              const isLast = i === PERFORMANCE_ROWS.length - 1;
              const hasSub = !!row.sub;
              return (
                <React.Fragment key={row.label}>
                  <tr style={{ backgroundColor: i % 2 === 0 ? "transparent" : "var(--color-background)" }}>
                    <td style={{ padding: "8px 12px", color: "var(--color-text-primary)", fontWeight: "600", borderBottom: hasSub ? "none" : (isLast ? "none" : "1px solid var(--color-border)") }}>{row.label}</td>
                    <td style={{ padding: "8px 12px", textAlign: "right", color: "var(--color-text-primary)", borderLeft: "1px solid var(--color-border)", borderBottom: hasSub ? "none" : (isLast ? "none" : "1px solid var(--color-border)") }}>{row.planM}</td>
                    <td style={{ padding: "8px 12px", textAlign: "right", color: "var(--color-text-primary)", borderLeft: "1px solid var(--color-border)", borderBottom: hasSub ? "none" : (isLast ? "none" : "1px solid var(--color-border)") }}>{row.actualM}</td>
                    <td style={{ padding: "8px 12px", textAlign: "right", color: "var(--color-primary-blue)", fontWeight: "700", borderLeft: "1px solid var(--color-border)", borderBottom: hasSub ? "none" : (isLast ? "none" : "1px solid var(--color-border)") }}>{row.achM}</td>
                    <td style={{ padding: "8px 12px", textAlign: "right", color: "var(--color-text-primary)", borderLeft: "1px solid var(--color-border)", borderBottom: hasSub ? "none" : (isLast ? "none" : "1px solid var(--color-border)") }}>{row.planY}</td>
                    <td style={{ padding: "8px 12px", textAlign: "right", color: "var(--color-text-primary)", borderLeft: "1px solid var(--color-border)", borderBottom: hasSub ? "none" : (isLast ? "none" : "1px solid var(--color-border)") }}>{row.forecastY}</td>
                    <td style={{ padding: "8px 12px", textAlign: "right", color: "var(--color-primary-blue)", fontWeight: "700", borderLeft: "1px solid var(--color-border)", borderBottom: hasSub ? "none" : (isLast ? "none" : "1px solid var(--color-border)") }}>{row.achY}</td>
                  </tr>
                  {hasSub && (
                    <tr style={{ backgroundColor: i % 2 === 0 ? "transparent" : "var(--color-background)" }}>
                      <td style={{ padding: "0 12px 8px 16px", color: "var(--color-text-secondary)", fontSize: "10px", borderBottom: isLast ? "none" : "1px solid var(--color-border)" }}>%</td>
                      <td style={{ padding: "0 12px 8px", textAlign: "right", color: "var(--color-text-secondary)", fontSize: "10px", borderLeft: "1px solid var(--color-border)", borderBottom: isLast ? "none" : "1px solid var(--color-border)" }}>{row.sub}</td>
                      <td style={{ padding: "0 12px 8px", textAlign: "right", color: "var(--color-text-secondary)", fontSize: "10px", borderLeft: "1px solid var(--color-border)", borderBottom: isLast ? "none" : "1px solid var(--color-border)" }}>{row.subActual}</td>
                      <td style={{ padding: "0 12px 8px", textAlign: "right", color: "var(--color-text-secondary)", fontSize: "10px", borderLeft: "1px solid var(--color-border)", borderBottom: isLast ? "none" : "1px solid var(--color-border)" }}></td>
                      <td style={{ padding: "0 12px 8px", textAlign: "right", color: "var(--color-text-secondary)", fontSize: "10px", borderLeft: "1px solid var(--color-border)", borderBottom: isLast ? "none" : "1px solid var(--color-border)" }}>{row.subForecast}</td>
                      <td style={{ padding: "0 12px 8px", textAlign: "right", color: "var(--color-text-secondary)", fontSize: "10px", borderLeft: "1px solid var(--color-border)", borderBottom: isLast ? "none" : "1px solid var(--color-border)" }}>{row.subAch}</td>
                      <td style={{ padding: "0 12px 8px", borderLeft: "1px solid var(--color-border)", borderBottom: isLast ? "none" : "1px solid var(--color-border)" }}></td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
