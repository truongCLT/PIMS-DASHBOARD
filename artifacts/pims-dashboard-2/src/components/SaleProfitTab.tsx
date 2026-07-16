import React from "react";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LabelList,
} from "recharts";
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

const MONTHLY_REVENUE = [
  { month: "'26.04", revenue: 258, cumulative: 258 },
  { month: "'26.05", revenue: 258, cumulative: 516 },
  { month: "'26.06", revenue: 258, cumulative: 3000 },
];

const COST_RATIO = [
  { month: "'26.04", ratio: 85.0 },
  { month: "'26.05", ratio: 84.7 },
  { month: "'26.06", ratio: 84.7 },
];

export function SaleProfitTab() {
  const [comment, setComment] = React.useState("");
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      {/* Monthly Revenue */}
      <div style={cardStyle}>
        <span style={sectionTitle}>Monthly Revenue</span>
        <div style={{ width: "100%", height: "260px", marginTop: "8px" }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={MONTHLY_REVENUE} margin={{ top: 30, right: 40, left: 40, bottom: 0 }}>
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#555" }} tickLine={false} axisLine={{ stroke: "#d5dce6" }} />
              <YAxis hide domain={[0, 320]} />
              <YAxis yAxisId="cum" hide domain={[0, 3300]} />
              <Tooltip contentStyle={{ fontSize: "11px" }} />
              <Bar dataKey="revenue" name="Monthly Revenue" fill="#2b5cad" barSize={22} isAnimationActive={false}>
                <LabelList dataKey="revenue" position="top" style={{ fontSize: "9px", fill: "#555" }} formatter={(v: number) => v.toLocaleString()} />
              </Bar>
              <Line
                yAxisId="cum"
                dataKey="cumulative"
                name="누계"
                type="monotone"
                stroke="#e67e22"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              >
                <LabelList
                  dataKey="cumulative"
                  position="top"
                  style={{ fontSize: "10px", fill: "#e67e22" }}
                  formatter={(v: number) => (v === 3000 ? "3,000  누계" : "")}
                />
              </Line>
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Estimated Cost Ratio at Completion */}
      <div style={cardStyle}>
        <span style={sectionTitle}>Estimated Cost Ratio at Completion</span>
        <div style={{ width: "100%", height: "230px", marginTop: "8px" }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={COST_RATIO} margin={{ top: 30, right: 40, left: 40, bottom: 0 }}>
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#555" }} tickLine={false} axisLine={false} />
              <YAxis hide domain={[84.4, 85.2]} />
              <Tooltip contentStyle={{ fontSize: "11px" }} formatter={(v) => `${v}%`} />
              <Line
                dataKey="ratio"
                name="Estimated Cost Ratio"
                type="stepAfter"
                stroke="#7da7d9"
                strokeWidth={1.5}
                dot={false}
                isAnimationActive={false}
              >
                <LabelList
                  dataKey="ratio"
                  position="bottom"
                  offset={12}
                  style={{ fontSize: "10px", fill: "#333" }}
                  formatter={(v: number) => `${v.toFixed(1)}%`}
                />
              </Line>
            </ComposedChart>
          </ResponsiveContainer>
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
              <option>Monthly Revenue</option>
              <option>Estimated Cost Ratio at Completion</option>
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
