import React from "react";

export function OrderStatus() {
  const planTotal = 2000;
  const ordered = 1250;
  const remaining = 750;
  const pct = Math.round((ordered / planTotal) * 100);

  return (
    <div style={{
      backgroundColor: "#fff",
      border: "1px solid #dde3ee",
      borderRadius: "6px",
      padding: "10px 12px",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
        <span style={{ fontSize: "12px", fontWeight: "600", color: "#1e2a3b" }}>수주 실적 현황</span>
      </div>

      {/* Progress bar with label */}
      <div style={{ marginBottom: "12px" }}>
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "4px",
        }}>
          <span style={{ fontSize: "10px", color: "#555" }}>계획 대비 {pct}%</span>
        </div>
        <div style={{
          height: "22px",
          backgroundColor: "#eef2fa",
          borderRadius: "3px",
          overflow: "hidden",
          position: "relative",
        }}>
          <div style={{
            height: "100%",
            width: `${pct}%`,
            backgroundColor: "#4472ca",
            borderRadius: "3px",
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
        <div style={{ flex: 1, textAlign: "center", borderRight: "1px solid #e8f0f8" }}>
          <div style={{ fontSize: "10px", color: "#888", marginBottom: "2px" }}>계획</div>
          <div style={{ fontSize: "18px", fontWeight: "700", color: "#1a3a5c" }}>
            {planTotal.toLocaleString()}
          </div>
        </div>
        <div style={{ flex: 1, textAlign: "center", borderRight: "1px solid #e8f0f8" }}>
          <div style={{ fontSize: "10px", color: "#888", marginBottom: "2px" }}>수주</div>
          <div style={{ fontSize: "18px", fontWeight: "700", color: "#4472ca" }}>
            {ordered.toLocaleString()}
          </div>
        </div>
        <div style={{ flex: 1, textAlign: "center" }}>
          <div style={{ fontSize: "10px", color: "#888", marginBottom: "2px" }}>잔여</div>
          <div style={{ fontSize: "18px", fontWeight: "700", color: "#e67e22" }}>
            {remaining.toLocaleString()}
          </div>
        </div>
      </div>

      <button style={{
        width: "100%",
        textAlign: "right",
        fontSize: "11px",
        color: "#4472ca",
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
