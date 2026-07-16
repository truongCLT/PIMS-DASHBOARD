import React from "react";

export const ORDER_STATUS = {
  planTotal: 2000,
  ordered: 1250,
  remaining: 750,
};

export function OrderStatus() {
  const { planTotal, ordered } = ORDER_STATUS;
  const pct = Math.round((ordered / planTotal) * 100);

  return (
    <div style={{
      backgroundColor: "#33415f",
      borderRadius: "8px",
      padding: "12px 16px",
      flex: 1,
      minWidth: 0,
      boxShadow: "0 1px 4px rgba(20,35,70,0.15)",
    }}>
      <div style={{
        fontSize: "clamp(12px, 0.95vw, 16px)",
        fontWeight: "600",
        color: "#ffffff",
        marginBottom: "10px",
      }}>
        수주 실적 현황
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <div style={{ fontSize: "clamp(10px, 0.8vw, 13px)", color: "#9fb0cc", marginBottom: "4px" }}>계획</div>
          <div style={{ fontSize: "clamp(18px, 1.7vw, 30px)", fontWeight: "700", color: "#ffffff" }}>
            {planTotal.toLocaleString()}
          </div>
        </div>
        <div>
          <div style={{ fontSize: "clamp(10px, 0.8vw, 13px)", color: "#9fb0cc", marginBottom: "4px" }}>수주</div>
          <div style={{ fontSize: "clamp(18px, 1.7vw, 30px)", fontWeight: "700", color: "#ffffff" }}>
            {ordered.toLocaleString()}
          </div>
        </div>
        <div>
          <div style={{ fontSize: "clamp(10px, 0.8vw, 13px)", color: "#9fb0cc", marginBottom: "4px" }}>달성률</div>
          <div style={{ fontSize: "clamp(18px, 1.7vw, 30px)", fontWeight: "700", color: "#00bcd4" }}>
            {pct}%
          </div>
        </div>
      </div>
    </div>
  );
}
