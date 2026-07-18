import React, { useState } from "react";
import { MessageSquare, Send } from "lucide-react";

const cardStyle: React.CSSProperties = {
  backgroundColor: "#fff",
  border: "1px solid #d0dce8",
  borderRadius: "6px",
  padding: "10px 12px",
};

function HBar({
  label,
  totalWidth,
  execRatio,
  execLabel,
  pctLabel,
  totalLabel,
  execColor,
  trackColor = "#d5d7e2",
  height = 46,
  sub = false,
}: {
  label: string;
  totalWidth: number; // % of container
  execRatio: number; // 0~1 of total bar
  execLabel?: string;
  pctLabel?: string;
  totalLabel?: string;
  execColor?: string;
  trackColor?: string;
  height?: number;
  sub?: boolean;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", marginBottom: sub ? "10px" : "0" }}>
      <div
        style={{
          width: sub ? "160px" : "130px",
          paddingLeft: sub ? "60px" : "0",
          fontSize: "11px",
          color: "#333",
          fontWeight: 600,
          flexShrink: 0,
          textDecoration: label === "Walfare" ? "underline" : "none",
        }}
      >
        {label}
      </div>
      <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "8px" }}>
        <div style={{ width: `${totalWidth}%`, height: `${height}px`, backgroundColor: trackColor, display: "flex" }}>
          {execRatio > 0 && execColor && (
            <div
              style={{
                width: `${execRatio * 100}%`,
                height: "100%",
                backgroundColor: execColor,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
              }}
            >
              {execLabel && (
                <span style={{ fontSize: "10px", color: "#fff", fontWeight: 700 }}>{execLabel}</span>
              )}
              {pctLabel && (
                <span
                  style={{
                    position: "absolute",
                    left: "100%",
                    marginLeft: "8px",
                    fontSize: "10px",
                    color: execColor === "#f0a875" ? "#e07b28" : "#2b5cad",
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                  }}
                >
                  {pctLabel}
                </span>
              )}
            </div>
          )}
        </div>
        {totalLabel && <span style={{ fontSize: "10px", color: "#333", whiteSpace: "nowrap" }}>{totalLabel}</span>}
      </div>
    </div>
  );
}

export function ServiceBudgetTab() {
  const [comment, setComment] = useState("");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      {/* Budget Execution Status */}
      <div style={{ ...cardStyle, padding: "14px 18px 24px" }}>
        <span style={{ fontSize: "11px", fontWeight: 600, color: "#4472c4" }}>
          Budget <u>Execution Status</u>
        </span>

        <div style={{ marginTop: "18px", display: "flex", flexDirection: "column", gap: "26px" }}>
          <HBar label="Direct Cost" totalWidth={50} execRatio={0.303} execLabel="99" pctLabel="30.3%" totalLabel="1,239" execColor="#2b5cad" />
          <div>
            <HBar label="Indirect Cost" totalWidth={33} execRatio={0.453} execLabel="99" pctLabel="45.3%" totalLabel="258" execColor="#2b5cad" />
            <div style={{ marginTop: "18px" }}>
              <HBar label="Salary" sub totalWidth={19} execRatio={0.808} pctLabel="80.8%" execColor="#f0a875" height={30} trackColor="#d9d9d9" />
              <HBar label="Walfare" sub totalWidth={11} execRatio={0.121} pctLabel="12.1%" execColor="#f0a875" height={30} trackColor="#d9d9d9" />
              <HBar label="Service" sub totalWidth={19} execRatio={0.503} pctLabel="50.3%" execColor="#f0a875" height={30} trackColor="#d9d9d9" />
              <HBar label="Others" sub totalWidth={6} execRatio={0} height={30} trackColor="#d9d9d9" />
            </div>
          </div>
          <HBar label="Contingency" totalWidth={19} execRatio={0} totalLabel="60" />
          <HBar label="Sum" totalWidth={82} execRatio={0.453} execLabel="977" pctLabel="45.3%" totalLabel="3,980" execColor="#2b5cad" />
        </div>
      </div>

      {/* Comment */}
      <div style={cardStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
          <MessageSquare size={13} color="#1a2d4d" />
          <span style={{ fontSize: "12px", fontWeight: 700, color: "#1a2d4d" }}>Comment</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "8px", flexWrap: "wrap" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: "#333" }}>
            Chart :
            <select style={{ fontSize: "11px", padding: "4px 6px", border: "1px solid #ccd4dd", borderRadius: "4px" }}>
              <option>Sale by division</option>
              <option>Budget Execution Status</option>
            </select>
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: "#333" }}>
            Month :
            <select defaultValue="June" style={{ fontSize: "11px", padding: "4px 6px", border: "1px solid #ccd4dd", borderRadius: "4px" }}>
              {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map((mo) => (
                <option key={mo}>{mo}</option>
              ))}
            </select>
          </label>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            gap: "8px",
            border: "1px solid #ccd4dd",
            borderRadius: "6px",
            padding: "8px 10px",
          }}
        >
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Write a comment"
            rows={2}
            style={{
              flex: 1,
              border: "none",
              outline: "none",
              resize: "none",
              fontSize: "11px",
              color: "#333",
              fontFamily: "inherit",
            }}
          />
          <Send size={14} color="#1e6fdd" style={{ cursor: "pointer", flexShrink: 0 }} />
        </div>
      </div>
    </div>
  );
}
