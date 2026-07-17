import React from "react";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Cell,
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

function MiniBar({
  value,
  max,
  color,
  label,
  height = 220,
  width = 24,
}: {
  value: number;
  max: number;
  color: string;
  label: string;
  height?: number;
  width?: number;
}) {
  const h = max > 0 ? Math.max((value / max) * height, 4) : 4;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
      <div style={{ height: `${height}px`, display: "flex", alignItems: "flex-end" }}>
        <div style={{ position: "relative", width: `${width}px`, height: `${h}px`, backgroundColor: color }}>
          <span
            style={{
              position: "absolute",
              top: "-14px",
              left: "50%",
              transform: "translateX(-50%)",
              fontSize: "9px",
              color: "#555",
            }}
          >
            00
          </span>
        </div>
      </div>
      <span style={{ fontSize: "9px", color: "#555", textAlign: "center", whiteSpace: "pre-line" }}>{label}</span>
    </div>
  );
}

/* Cash in positive (blue), Cash out negative (green), two equivalent lines */
const CASHFLOW_DATA: {
  month: string;
  cashIn: number | null;
  cashOut: number | null;
  planLine: number | null;
  actualLine: number | null;
}[] = [
  { month: "Jun-2025", cashIn: 20, cashOut: -20, planLine: 24, actualLine: 8 },
  { month: "Jul-2025", cashIn: 15, cashOut: -25, planLine: 23, actualLine: 9 },
  { month: "Aug-2025", cashIn: null, cashOut: null, planLine: null, actualLine: 10 },
  { month: "Sep-2025", cashIn: null, cashOut: null, planLine: null, actualLine: 9 },
  { month: "Oct-2025", cashIn: null, cashOut: null, planLine: 18, actualLine: 5 },
  { month: "Nov-2025", cashIn: null, cashOut: null, planLine: null, actualLine: 2 },
  { month: "Dec-2025", cashIn: null, cashOut: null, planLine: null, actualLine: -2 },
  { month: "Jan-2026", cashIn: null, cashOut: null, planLine: null, actualLine: 2 },
  { month: "Feb-2026", cashIn: null, cashOut: null, planLine: 52, actualLine: 6 },
  { month: "Apr-2026", cashIn: null, cashOut: null, planLine: null, actualLine: 8 },
  { month: "May-2026", cashIn: null, cashOut: null, planLine: null, actualLine: 6 },
  { month: "Jun-2026", cashIn: null, cashOut: null, planLine: 33, actualLine: 4 },
  { month: "Jul-2026", cashIn: 50, cashOut: -20, planLine: null, actualLine: 15 },
];

export function CashflowTab() {
  const [comment, setComment] = React.useState("");
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      {/* Row 1: Cash + Remaining budget of outsourcing */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 2.7fr", gap: "8px" }}>
        {/* Cash */}
        <div style={cardStyle}>
          <span style={sectionTitle}>Cash</span>
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-around",
              marginTop: "40px",
              paddingBottom: "6px",
            }}
          >
            <MiniBar value={88} max={100} color="#c9d2dd" label={"Revenue"} />
            <MiniBar value={76} max={100} color="#c9d2dd" label={"Confirmed\n(A)"} />
            <MiniBar value={74} max={100} color="#2b5cad" label={"Collection\n(B)"} />
            <MiniBar value={24} max={100} color="#c0392b" label={"Outstanding\n(A)-(B)"} />
          </div>
        </div>

        {/* Remaining budget of outsourcing */}
        <div style={cardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
            <span style={{ ...sectionTitle, color: "#1a2d4d" }}>Remaining budget of outsourcing</span>
            <span style={{ fontSize: "10px", color: "#1e6fdd", textDecoration: "underline", cursor: "pointer" }}>
              View detail
            </span>
          </div>
          <div style={{ width: "100%", height: "320px" }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={CASHFLOW_DATA} stackOffset="sign" margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#eef1f5" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 9, fill: "#555" }} tickLine={false} axisLine={{ stroke: "#d5dce6" }} />
                <YAxis
                  tick={{ fontSize: 9, fill: "#555" }}
                  tickLine={false}
                  axisLine={false}
                  domain={[-30, 60]}
                  ticks={[-30, -20, -10, 0, 10, 20, 30, 40, 50, 60]}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fontSize: 9, fill: "#555" }}
                  tickLine={false}
                  axisLine={false}
                  domain={[-30, 60]}
                  ticks={[-30, -20, -10, 0, 10, 20, 30, 40, 50, 60]}
                />
                <Tooltip contentStyle={{ fontSize: "11px" }} />
                <Legend wrapperStyle={{ fontSize: "12px" }} iconSize={12} />
                <ReferenceLine y={0} stroke="#e0a030" strokeDasharray="3 3" />
                <Bar dataKey="cashIn" name="Cash in" fill="#2b5cad" barSize={26} stackId="cash" isAnimationActive={false}>
                  <LabelList dataKey="cashIn" position="center" style={{ fontSize: "9px", fill: "#fff", fontWeight: 700 }} formatter={(v: number) => (v > 0 ? `+${v}` : v)} />
                  {CASHFLOW_DATA.map((d, i) => (
                    <Cell key={i} fill="#2b5cad" />
                  ))}
                </Bar>
                <Bar dataKey="cashOut" name="Cash out" fill="#1e8449" barSize={26} stackId="cash" isAnimationActive={false} radius={[0, 0, 4, 4]}>
                  <LabelList dataKey="cashOut" position="center" style={{ fontSize: "9px", fill: "#fff", fontWeight: 700 }} />
                </Bar>
                <Line
                  dataKey="planLine"
                  name="Cash equivalent"
                  stroke="#e67e22"
                  strokeWidth={2}
                  dot={{ r: 3, fill: "#fff", stroke: "#e67e22" }}
                  connectNulls
                  isAnimationActive={false}
                />
                <Line
                  dataKey="actualLine"
                  legendType="none"
                  name="Cash equivalent (actual)"
                  stroke="#e6c619"
                  strokeWidth={2}
                  dot={false}
                  type="monotone"
                  connectNulls
                  isAnimationActive={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 2: Comment */}
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
              <option>Cash</option>
              <option>Remaining budget of outsourcing</option>
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
