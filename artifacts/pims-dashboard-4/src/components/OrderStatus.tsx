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
      border: "1px solid var(--color-card-border)",
      borderRadius: "14px",
      padding: "16px 20px",
      boxShadow: "var(--shadow-card)",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
        <span style={{ fontSize: "14px", fontWeight: "600", color: "var(--color-text-strong)" }}>수주 실적 현황</span>
      </div>

      {/* Progress bar with label */}
      <div style={{ marginBottom: "12px" }}>
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "4px",
        }}>
          <span style={{ fontSize: "10px", color: "var(--color-text-muted)" }}>계획 대비 {pct}%</span>
        </div>
        <div style={{
          height: "22px",
          backgroundColor: "var(--color-blue-tint)",
          borderRadius: "999px",
          overflow: "hidden",
          position: "relative",
        }}>
          <div style={{
            height: "100%",
            width: `${pct}%`,
            background: "linear-gradient(90deg, var(--color-primary-blue), var(--color-blue-bright))",
            borderRadius: "999px",
            display: "flex",
            alignItems: "center",
            paddingLeft: "8px",
          }}>
            <span style={{ fontSize: "10px", color: "#fff", fontWeight: "600" }}>계획 대비 {pct}%</span>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
        <div style={{ flex: 1, textAlign: "center", borderRight: "1px solid var(--color-divider)" }}>
          <div style={{ fontSize: "10px", color: "var(--color-text-muted)", marginBottom: "2px" }}>계획</div>
          <div style={{ fontSize: "18px", fontWeight: "700", color: "var(--color-text-strong)" }}>
            {planTotal.toLocaleString()}
          </div>
        </div>
        <div style={{ flex: 1, textAlign: "center", borderRight: "1px solid var(--color-divider)" }}>
          <div style={{ fontSize: "10px", color: "var(--color-text-muted)", marginBottom: "2px" }}>수주</div>
          <div style={{ fontSize: "18px", fontWeight: "700", color: "var(--color-primary-blue)" }}>
            {ordered.toLocaleString()}
          </div>
        </div>
        <div style={{ flex: 1, textAlign: "center" }}>
          <div style={{ fontSize: "10px", color: "var(--color-text-muted)", marginBottom: "2px" }}>잔여</div>
          <div style={{ fontSize: "18px", fontWeight: "700", color: "var(--color-danger)" }}>
            {remaining.toLocaleString()}
          </div>
        </div>
      </div>

      <button style={{
        width: "100%",
        textAlign: "right",
        fontSize: "11px",
        color: "var(--color-primary-blue)",
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
