import React from "react";

export const ORDER_STATUS = {
  planTotal: 2000,
  ordered: 1250,
  remaining: 750,
};

export function OrderStatus() {
  const { planTotal, ordered, remaining } = ORDER_STATUS;
  const pct = Math.round((ordered / planTotal) * 100);

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
        <span style={{ fontSize: "14px", fontWeight: "600", color: "var(--color-text-primary)" }}>수주 실적 현황</span>
      </div>

      {/* Progress bar with label */}
      <div style={{ marginBottom: "16px" }}>
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "6px",
        }}>
          <span style={{ fontSize: "12px", color: "var(--color-text-secondary)", fontWeight: "500" }}>계획 대비 {pct}%</span>
        </div>
        <div style={{
          height: "22px",
          backgroundColor: "var(--color-background)",
          borderRadius: "11px",
          overflow: "hidden",
          position: "relative",
        }}>
          <div style={{
            height: "100%",
            width: `${pct}%`,
            background: "linear-gradient(90deg, var(--color-primary-blue), #6b99e0)",
            borderRadius: "11px",
            display: "flex",
            alignItems: "center",
            paddingLeft: "10px",
          }}>
            <span style={{ fontSize: "11px", color: "#ffffff", fontWeight: "600" }}>계획 대비 {pct}%</span>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "14px" }}>
        <div style={{ flex: 1, textAlign: "center", padding: "8px 0", backgroundColor: "var(--color-background)", borderRadius: "8px" }}>
          <div style={{ fontSize: "11px", color: "var(--color-text-secondary)", marginBottom: "4px", fontWeight: "500" }}>계획</div>
          <div style={{ fontSize: "18px", fontWeight: "700", color: "var(--color-text-primary)" }}>
            {planTotal.toLocaleString()}
          </div>
        </div>
        <div style={{ flex: 1, textAlign: "center", padding: "8px 0", backgroundColor: "rgba(74, 127, 212, 0.08)", borderRadius: "8px" }}>
          <div style={{ fontSize: "11px", color: "var(--color-text-secondary)", marginBottom: "4px", fontWeight: "500" }}>수주</div>
          <div style={{ fontSize: "18px", fontWeight: "700", color: "var(--color-primary-blue)" }}>
            {ordered.toLocaleString()}
          </div>
        </div>
        <div style={{ flex: 1, textAlign: "center", padding: "8px 0", backgroundColor: "rgba(240, 135, 107, 0.08)", borderRadius: "8px" }}>
          <div style={{ fontSize: "11px", color: "var(--color-text-secondary)", marginBottom: "4px", fontWeight: "500" }}>잔여</div>
          <div style={{ fontSize: "18px", fontWeight: "700", color: "var(--color-accent-coral)" }}>
            {remaining.toLocaleString()}
          </div>
        </div>
      </div>

      <button style={{
        width: "100%",
        textAlign: "right",
        fontSize: "12px",
        color: "var(--color-primary-blue)",
        background: "none",
        border: "none",
        cursor: "pointer",
        padding: "0",
        fontWeight: "500",
      }}>
        상세보기
      </button>
    </div>
  );
}
