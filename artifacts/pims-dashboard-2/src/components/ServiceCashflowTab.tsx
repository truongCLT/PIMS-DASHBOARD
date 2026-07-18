import React, { useState } from "react";
import { MessageSquare, Send } from "lucide-react";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  ReferenceLine,
  ResponsiveContainer,
  Legend,
  LabelList,
} from "recharts";

const cardStyle: React.CSSProperties = {
  backgroundColor: "#fff",
  border: "1px solid #d0dce8",
  borderRadius: "6px",
  padding: "10px 12px",
};

const CASHFLOW_DATA = [
  { month: "Jan", cashIn: 20, cashOut: -20, equivalent: 23 },
  { month: "Feb", cashIn: 15, cashOut: -25, equivalent: 10 },
  { month: "Mar", cashIn: 50, cashOut: -20, equivalent: 53 },
  { month: "Apr", cashIn: 30, cashOut: 0, equivalent: 2 },
];

const TICKS = [-30, -20, -10, 0, 10, 20, 30, 40, 50, 60];

export function ServiceCashflowTab() {
  const [comment, setComment] = useState("");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      {/* Cashflow */}
      <div style={cardStyle}>
        <span style={{ fontSize: "13px", fontWeight: 700, color: "#1a3a6b" }}>Cashflow</span>
        <div style={{ height: "320px", marginTop: "10px" }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={CASHFLOW_DATA} stackOffset="sign" margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
              <XAxis
                dataKey="month"
                tick={{ fontSize: 12, fill: "#333", fontWeight: 600 }}
                tickLine={false}
                axisLine={{ stroke: "#d5dce6" }}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#333", fontWeight: 600 }}
                tickLine={false}
                axisLine={false}
                domain={[-30, 60]}
                ticks={TICKS}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 11, fill: "#333", fontWeight: 600 }}
                tickLine={false}
                axisLine={false}
                domain={[-30, 60]}
                ticks={TICKS}
              />
              <Legend wrapperStyle={{ fontSize: "12px", fontWeight: 600 }} iconSize={14} />
              <ReferenceLine y={0} stroke="#e0763a" strokeDasharray="3 3" />
              <Bar
                dataKey="cashIn"
                name="Cash in"
                fill="#2e6db4"
                barSize={110}
                stackId="cash"
                isAnimationActive={false}
                radius={[4, 4, 0, 0]}
              >
                <LabelList
                  dataKey="cashIn"
                  position="center"
                  style={{ fontSize: "12px", fill: "#fff", fontWeight: 700 }}
                  formatter={(v: number) => (v > 30 ? `${v}` : v > 0 ? `+${v}` : "")}
                />
              </Bar>
              <Bar
                dataKey="cashOut"
                name="Cash out"
                fill="#1e8449"
                barSize={110}
                stackId="cash"
                isAnimationActive={false}
                radius={[0, 0, 4, 4]}
              >
                <LabelList
                  dataKey="cashOut"
                  position="center"
                  style={{ fontSize: "12px", fill: "#fff", fontWeight: 700 }}
                  formatter={(v: number) => (v !== 0 ? `${v}` : "")}
                />
              </Bar>
              <Line
                dataKey="equivalent"
                name="Cash equivalent"
                type="monotone"
                stroke="#1e8449"
                strokeWidth={2}
                dot={{ r: 3, fill: "#fff", stroke: "#1e8449" }}
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <div style={{ textAlign: "center", fontSize: "11px", color: "#e07b28", marginTop: "6px" }}>
          Hiển thị 6 tháng: Apr, May, Jun, Jul, Aug, Sep
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
              <option>Cashflow</option>
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
