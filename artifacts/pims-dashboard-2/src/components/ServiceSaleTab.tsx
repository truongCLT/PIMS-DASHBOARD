import React, { useState } from "react";
import { MessageSquare, Send } from "lucide-react";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  LabelList,
  Legend,
} from "recharts";

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
  marginBottom: "6px",
};

const REVENUE_DATA = [
  { month: "'26.04", revenue: 258, cumulative: 120 },
  { month: "'26.05", revenue: 0, cumulative: 700 },
  { month: "'26.06", revenue: 250, cumulative: 3000 },
];

const COST_DATA = [
  { month: "'26.04", acct: 258, wip: 30, acctCum: 130, wipCum: 180 },
  { month: "'26.05", acct: 0, wip: 34, acctCum: 520, wipCum: 900 },
  { month: "'26.06", acct: 60, wip: 26, acctCum: 1450, wipCum: 1400 },
];

function barLabel(props: any) {
  const { x, y, width, value } = props;
  if (!value) return null;
  return (
    <text x={x + width / 2} y={y - 5} textAnchor="middle" fontSize={9} fill="#555">
      {Number(value).toLocaleString()}
    </text>
  );
}

export function ServiceSaleTab() {
  const [comment, setComment] = useState("");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      {/* Monthly Revenue */}
      <div style={cardStyle}>
        <span style={{ ...sectionTitle }}>Monthly <u>Revenue</u></span>
        <div style={{ height: "230px", marginTop: "6px" }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={REVENUE_DATA} margin={{ top: 24, right: 30, bottom: 4, left: 30 }}>
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: "#333" }}
                axisLine={{ stroke: "#c8d2de" }}
                tickLine={false}
              />
              <YAxis hide yAxisId="bar" domain={[0, 1000]} />
              <YAxis hide yAxisId="line" domain={[0, 3300]} />
              <Bar yAxisId="bar" dataKey="revenue" barSize={26} fill="#2b5cad" isAnimationActive={false}>
                <LabelList dataKey="revenue" content={barLabel} />
              </Bar>
              <Line
                yAxisId="line"
                dataKey="cumulative"
                type="monotone"
                stroke="#e07b28"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
                label={(props: any) =>
                  props.index === REVENUE_DATA.length - 1 ? (
                    <g>
                      <text x={props.x - 8} y={props.y - 12} textAnchor="end" fontSize={11} fontWeight={700} fill="#333">
                        {Number(props.value).toLocaleString()}
                      </text>
                      <text x={props.x - 8} y={props.y + 16} textAnchor="end" fontSize={11} fontWeight={600} fill="#e07b28">
                        누계
                      </text>
                    </g>
                  ) : <g />
                }
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Cost */}
      <div style={cardStyle}>
        <span style={sectionTitle}>Cost</span>
        <div style={{ height: "250px", marginTop: "6px" }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={COST_DATA} margin={{ top: 24, right: 30, bottom: 4, left: 30 }}>
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: "#333" }}
                axisLine={{ stroke: "#c8d2de" }}
                tickLine={false}
              />
              <YAxis hide yAxisId="bar" domain={[0, 900]} />
              <YAxis hide yAxisId="line" domain={[0, 1600]} />
              <Legend
                verticalAlign="top"
                align="center"
                iconSize={12}
                wrapperStyle={{ fontSize: "11px", paddingBottom: "8px" }}
              />
              <Bar yAxisId="bar" dataKey="wip" name="집행 매출원가 (WIP)" barSize={26} fill="#ffd966" isAnimationActive={false}>
                <LabelList dataKey="wip" content={barLabel} />
              </Bar>
              <Bar yAxisId="bar" dataKey="acct" name="회계 매출원가" barSize={26} fill="#c55a11" isAnimationActive={false}>
                <LabelList dataKey="acct" content={barLabel} />
              </Bar>
              <Line
                yAxisId="line"
                dataKey="acctCum"
                name="회계 매출원가 누계"
                type="monotone"
                stroke="#e07b28"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
              <Line
                yAxisId="line"
                dataKey="wipCum"
                name="집행 매출원가 (WIP) 누계"
                type="monotone"
                stroke="#1f3864"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
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
              <option>Cost</option>
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
