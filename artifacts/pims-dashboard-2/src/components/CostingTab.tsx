import React from "react";
import { Send, MessageSquare } from "lucide-react";

const cardStyle: React.CSSProperties = {
  backgroundColor: "#fff",
  border: "1px solid #d0dce8",
  borderRadius: "6px",
  padding: "10px 12px",
};

const sectionTitle: React.CSSProperties = {
  fontSize: "11px",
  fontWeight: 600,
  color: "#4472c4",
};

function Donut({
  percent,
  size = 150,
  stroke = 16,
  color = "#2b5cad",
  track = "#dfe5ec",
  centerLabel,
}: {
  percent: number;
  size?: number;
  stroke?: number;
  color?: string;
  track?: string;
  centerLabel?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const arc = (Math.min(Math.max(percent, 0), 100) / 100) * c;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeDasharray={`${arc} ${c}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      {centerLabel && (
        <text
          x={size / 2}
          y={size / 2}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={11}
          fontWeight={600}
          fill="#1a2d4d"
        >
          {centerLabel}
        </text>
      )}
    </svg>
  );
}

/* ---------- Budget Execution rows ---------- */
type BudgetRow = {
  label: string;
  underline?: boolean;
  indent?: boolean;
  group?: string; // group heading rendered above the label
  budget: number; // gray track value
  plan?: number; // red bar value (displayed inside the bar)
  actual?: number; // blue bar value (displayed inside the bar)
  planBarW?: number; // optional visual width override (same scale as budget)
  actualBarW?: number;
  planPct?: string;
  actualPct?: string;
};

const MAX_BUDGET = 3980;

const BUDGET_ROWS: BudgetRow[] = [
  { label: "Direct Cost", budget: 2580, plan: 990, actual: 977 },
  { label: "Outsourcing", underline: true, budget: 2477, plan: 990, actual: 977, actualPct: "35.2%" },
  { label: "Common", budget: 55, plan: 32, actual: 35, planBarW: 620, actualBarW: 600, planPct: "35.2%", actualPct: "62.5%" },
  { label: "Expense 1", budget: 34, plan: 15, actual: 19, planBarW: 200, actualBarW: 280, actualPct: "45.3%" },
  { label: "Expense 2", group: "Indirect Cost", budget: 258, plan: 90, actual: 99, planBarW: 360, actualBarW: 320, planPct: "35.2%", actualPct: "45.3%" },
  { label: "Contingency", budget: 60 },
  { label: "Sum", budget: 3980, plan: 990, actual: 977, planBarW: 1180, actualBarW: 1220 },
];

function BudgetExecutionStatus() {
  return (
    <div style={cardStyle}>
      <span style={sectionTitle}>
        Budget <u>Execution Status</u>
      </span>
      <div style={{ display: "flex", flexDirection: "column", gap: "18px", marginTop: "14px" }}>
        {BUDGET_ROWS.map((row) => {
          const trackW = Math.max((Math.log10(row.budget + 1) / Math.log10(MAX_BUDGET)) * 100, 12); // %
          const planW = row.plan != null ? ((row.planBarW ?? row.plan) / MAX_BUDGET) * 100 : 0;
          const actualW = row.actual != null ? ((row.actualBarW ?? row.actual) / MAX_BUDGET) * 100 : 0;
          return (
            <div key={row.label} style={{ display: "flex", alignItems: "center" }}>
              <div style={{ width: "110px", minWidth: "110px", fontSize: "10px", color: "#333" }}>
                {row.group && <div style={{ marginBottom: "14px" }}>{row.group}</div>}
                <span style={{ textDecoration: row.underline ? "underline" : "none", textDecorationColor: "#c0392b" }}>
                  {row.label}
                </span>
              </div>
              <div style={{ flex: 1, position: "relative" }}>
                {/* gray track */}
                <div
                  style={{
                    position: "relative",
                    width: `${trackW}%`,
                    height: row.plan || row.actual ? "52px" : "40px",
                    backgroundColor: "#d9dee5",
                  }}
                >
                  <span
                    style={{
                      position: "absolute",
                      right: "-8px",
                      top: "50%",
                      transform: "translate(100%, -50%)",
                      fontSize: "9px",
                      color: "#555",
                    }}
                  >
                    {row.budget.toLocaleString()}
                  </span>
                </div>
                {/* red plan bar */}
                {row.plan != null && (
                  <div
                    style={{
                      position: "absolute",
                      top: "4px",
                      left: 0,
                      width: `${planW}%`,
                      height: "20px",
                      backgroundColor: "#c0392b",
                    }}
                  >
                    <span
                      style={{
                        position: "absolute",
                        top: "50%",
                        left: "50%",
                        transform: "translate(-50%, -50%)",
                        fontSize: "8px",
                        color: "#fff",
                        fontWeight: 700,
                      }}
                    >
                      {row.plan?.toLocaleString()}
                    </span>
                    {row.planPct && (
                      <span
                        style={{
                          position: "absolute",
                          right: "-6px",
                          top: "50%",
                          transform: "translate(100%, -50%)",
                          fontSize: "8px",
                          color: "#c0392b",
                          fontWeight: 700,
                        }}
                      >
                        {row.planPct}
                      </span>
                    )}
                  </div>
                )}
                {/* blue actual bar */}
                {row.actual != null && (
                  <div
                    style={{
                      position: "absolute",
                      top: "28px",
                      left: 0,
                      width: `${actualW}%`,
                      height: "20px",
                      backgroundColor: "#2b5cad",
                    }}
                  >
                    <span
                      style={{
                        position: "absolute",
                        top: "50%",
                        left: "50%",
                        transform: "translate(-50%, -50%)",
                        fontSize: "8px",
                        color: "#fff",
                        fontWeight: 700,
                      }}
                    >
                      {row.actual?.toLocaleString()}
                    </span>
                    {row.actualPct && (
                      <span
                        style={{
                          position: "absolute",
                          right: "-6px",
                          top: "50%",
                          transform: "translate(100%, -50%)",
                          fontSize: "8px",
                          color: "#2b5cad",
                          fontWeight: 700,
                        }}
                      >
                        {row.actualPct}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function CostingTab() {
  const [comment, setComment] = React.useState("");
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      {/* Row 1: Cost estimation donuts */}
      <div style={cardStyle}>
        <span style={sectionTitle}>Cost estimation</span>
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-around",
            marginTop: "10px",
            paddingBottom: "6px",
            flexWrap: "wrap",
            gap: "16px",
          }}
        >
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "10px", color: "#555", marginBottom: "2px" }}>2,588</div>
            <div style={{ position: "relative", display: "inline-block" }}>
              <span style={{ position: "absolute", left: "-34px", top: "18px", fontSize: "9px", color: "#7fa8d9" }}>2,605</span>
              <Donut percent={12} color="#9db8d9" size={150} stroke={16} />
            </div>
            <div style={{ fontSize: "11px", color: "#1a2d4d", fontWeight: 600, marginTop: "4px" }}>Bidding</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "10px", color: "#555", marginBottom: "2px" }}>2,588</div>
            <div style={{ position: "relative", display: "inline-block" }}>
              <span style={{ position: "absolute", left: "-34px", top: "18px", fontSize: "9px", color: "#7fa8d9" }}>2,605</span>
              <Donut percent={82} color="#2b5cad" size={150} stroke={16} />
            </div>
            <div style={{ fontSize: "11px", color: "#1a2d4d", fontWeight: 600, marginTop: "4px", textDecoration: "underline" }}>
              Execution Budgeting
            </div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "10px", color: "#555", marginBottom: "2px" }}>3,258</div>
            <div style={{ position: "relative", display: "inline-block" }}>
              <span style={{ position: "absolute", left: "-34px", top: "18px", fontSize: "9px", color: "#c0392b" }}>2,793</span>
              <Donut percent={86} color="#1a2d4d" size={160} stroke={18} centerLabel="Total Cost Rate" />
            </div>
            <div style={{ fontSize: "11px", color: "#1a2d4d", fontWeight: 600, marginTop: "4px" }}>Estimated Completion</div>
          </div>
        </div>
      </div>

      {/* Row 2: Budget Execution Status */}
      <BudgetExecutionStatus />

      {/* Row 3: Comment */}
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
              <option>Cost estimation</option>
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
