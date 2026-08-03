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

      {/* 도넛 차트: 수주(파랑) vs 잔여(연한 파랑) */}
      <div style={{ display: "flex", justifyContent: "center", marginBottom: "12px" }}>
        {(() => {
          const SIZE = 120;
          const STROKE = 16;
          const r = (SIZE - STROKE) / 2;
          const c = 2 * Math.PI * r;
          const filled = (pct / 100) * c;
          return (
            <div style={{ position: "relative", width: `${SIZE}px`, height: `${SIZE}px` }}>
              <svg width={SIZE} height={SIZE} style={{ transform: "rotate(-90deg)" }}>
                <circle
                  cx={SIZE / 2} cy={SIZE / 2} r={r}
                  fill="none" stroke="var(--color-blue-tint)" strokeWidth={STROKE}
                />
                <circle
                  cx={SIZE / 2} cy={SIZE / 2} r={r}
                  fill="none" stroke="var(--color-primary-blue)" strokeWidth={STROKE}
                  strokeDasharray={`${filled} ${c - filled}`} strokeLinecap="round"
                />
              </svg>
              <div style={{
                position: "absolute", inset: 0,
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              }}>
                <span style={{ fontSize: "20px", fontWeight: "700", color: "var(--color-primary-blue)", lineHeight: 1.1 }}>{pct}%</span>
                <span style={{ fontSize: "10px", color: "var(--color-text-muted)" }}>계획 대비</span>
              </div>
            </div>
          );
        })()}
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
