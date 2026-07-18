import React from "react";

const NAVY = "#1a3a6b";

function NumBadge({ n }: { n: number }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: "18px",
        height: "18px",
        borderRadius: "50%",
        backgroundColor: NAVY,
        color: "#fff",
        fontSize: "11px",
        fontWeight: 700,
        flexShrink: 0,
      }}
    >
      {n}
    </span>
  );
}

export function DrilldownCard() {
  return (
    <div
      style={{
        backgroundColor: "#fff",
        border: "1px solid #d0dce8",
        borderRadius: "6px",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          backgroundColor: NAVY,
          color: "#fff",
          textAlign: "center",
          fontSize: "12px",
          fontWeight: 700,
          padding: "7px 8px",
        }}
      >
        상세 정보 (드릴다운)
      </div>

      <div style={{ padding: "10px 12px" }}>
        {/* 1. 수주 실적 */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
          <NumBadge n={1} />
          <span style={{ fontSize: "12px", fontWeight: 700, color: NAVY }}>수주 실적</span>
        </div>
        <div
          style={{
            backgroundColor: "#f4f7fb",
            borderRadius: "4px",
            padding: "8px 10px",
            fontSize: "12px",
            color: "#1a2d4d",
            fontWeight: 600,
          }}
        >
          XXX PJ&nbsp;&nbsp;&nbsp;USD 60mil
        </div>

        <div style={{ borderTop: "1px dotted #a9b8cc", margin: "10px 0" }} />

        {/* 2. 금월 주요 매출 */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
          <NumBadge n={2} />
          <span style={{ fontSize: "12px", fontWeight: 700, color: NAVY }}>금월 주요 매출</span>
        </div>
        <div
          style={{
            backgroundColor: "#f4f7fb",
            borderRadius: "4px",
            padding: "8px 10px",
            display: "flex",
            flexDirection: "column",
            gap: "6px",
          }}
        >
          {["K8HH1", "K8CT1", "K2CT1"].map((code) => (
            <div key={code} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#1a2d4d", fontWeight: 600 }}>
              <span style={{ width: "4px", height: "4px", borderRadius: "50%", backgroundColor: "#1a2d4d", flexShrink: 0 }} />
              {code}&nbsp;&nbsp;&nbsp;USD ...
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
