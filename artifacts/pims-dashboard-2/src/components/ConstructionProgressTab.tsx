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
  ResponsiveContainer,
} from "recharts";
import { Send, MessageSquare } from "lucide-react";
import projectPhoto from "../assets/project-photo.png";

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
  size = 130,
  stroke = 16,
  color = "#c0392b",
  track = "#e3e8ef",
  extraArc,
  label,
}: {
  percent: number;
  size?: number;
  stroke?: number;
  color?: string;
  track?: string;
  extraArc?: { percent: number; color: string };
  label?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const arc = (p: number) => (Math.min(Math.max(p, 0), 100) / 100) * c;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
      {extraArc && (
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={extraArc.color}
          strokeWidth={stroke}
          strokeDasharray={`${arc(extraArc.percent)} ${c}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      )}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeDasharray={`${arc(percent)} ${c}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      {label && (
        <text
          x={size / 2}
          y={size / 2}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={22}
          fontWeight={700}
          fill="#1a2d4d"
        >
          {label}
        </text>
      )}
    </svg>
  );
}

/* ---------- Project lifecycle data (2025-Jan ~ 2025-Dec) ---------- */
const LIFECYCLE_DATA = [
  { month: "2025-Jan", plan: 8, actual: 10, planAccum: 1.0, actualAccum: 1.2 },
  { month: "2025-Feb", plan: 24, actual: 22, planAccum: 2.5, actualAccum: 2.2 },
  { month: "2025-Mar", plan: 18, actual: 16, planAccum: 3.2, actualAccum: 2.8 },
  { month: "2025-Apr", plan: 20, actual: 18, planAccum: 4.0, actualAccum: 3.4 },
  { month: "2025-May", plan: 28, actual: 24, planAccum: 5.5, actualAccum: 4.6 },
  { month: "2025-Jun", plan: 10, actual: 9, planAccum: 5.8, actualAccum: 4.9 },
  { month: "2025-July", plan: 12, actual: 14, planAccum: 6.2, actualAccum: 5.4 },
  { month: "2025-Aug", plan: 38, actual: 30, planAccum: 7.8, actualAccum: 6.4 },
  { month: "2025-Sep", plan: 24, actual: 26, planAccum: 8.6, actualAccum: 7.2 },
  { month: "2025-Oct", plan: 20, actual: 24, planAccum: 9.2, actualAccum: 7.8 },
  { month: "2025-Nov", plan: 14, actual: 20, planAccum: 9.6, actualAccum: 8.2 },
  { month: "2025-Dec", plan: 36, actual: 38, planAccum: 10.4, actualAccum: 8.8 },
];

/* ---------- Milestone data ---------- */
/* Positions are fractions (0~1) across the 26-01 ~ 27-02 axis. */
const MILESTONE_MONTHS = [
  "26-01", "26-02", "26-03", "26-04", "26-05", "26-06", "26-07",
  "26-08", "26-09", "26-10", "26-11", "26-12", "27-01", "27-02",
];
const TODAY_POS = 5.4 / 14; // dashed "today" line around 26-06

type Milestone = {
  label: string;
  underline?: boolean;
  plan?: [number, number];   // [startMonthIdx, endMonthIdx] in 0..14
  actual?: [number, number];
};

const MILESTONES: Milestone[] = [
  { label: "Commencement", plan: [0.7, 1.0] },
  { label: "Completion foundation", underline: true, plan: [1.0, 2.0], actual: [1.2, 2.4] },
  { label: "Completion Basement", underline: true, plan: [1.8, 3.4], actual: [2.2, 4.4] },
  { label: "Completion Mock-Up", plan: [3.7, 6.8], actual: [4.2, 5.6] },
  { label: "Super Structure", plan: [2.6, 9.2], actual: [3.6, 5.4] },
  { label: "Masonry", underline: true, plan: [4.6, 10.2], actual: [4.2, 5.4] },
  { label: "Drywall", plan: [5.2, 12.6], actual: [5.2, 5.4] },
  { label: "Water proofing", plan: [6.0, 12.6] },
  { label: "Floor Plastering", plan: [7.2, 12.6] },
  { label: "Furniture", underline: true },
  { label: "FF approval" },
  { label: "MC approval" },
  { label: "Completion (Approval)" },
];

function MilestoneChart() {
  const AXIS_LEFT = 150; // px reserved for labels
  return (
    <div style={cardStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <span style={{ ...sectionTitle }}>Mile Stone</span>
        <div style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "9px", color: "#333" }}>
          <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ width: "26px", height: "5px", backgroundColor: "#e02020", display: "inline-block" }} />
            <u>Plan</u>
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ width: "26px", height: "5px", backgroundColor: "#1e6fdd", display: "inline-block" }} />
            Actual
          </span>
        </div>
      </div>
      <div style={{ position: "relative", marginTop: "8px" }}>
        {/* today dashed line */}
        <div
          style={{
            position: "absolute",
            top: 0,
            bottom: "18px",
            left: `calc(${AXIS_LEFT}px + (100% - ${AXIS_LEFT}px) * ${TODAY_POS})`,
            borderLeft: "2px dashed #f0b429",
          }}
        />
        {MILESTONES.map((m) => (
          <div key={m.label} style={{ display: "flex", alignItems: "center", height: "22px" }}>
            <div
              style={{
                width: `${AXIS_LEFT}px`,
                minWidth: `${AXIS_LEFT}px`,
                fontSize: "9px",
                color: "#333",
                textDecoration: m.underline ? "underline" : "none",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                paddingRight: "8px",
              }}
            >
              {m.label}
            </div>
            <div style={{ flex: 1, position: "relative", height: "100%" }}>
              {m.plan && (
                <div
                  style={{
                    position: "absolute",
                    top: "3px",
                    left: `${(m.plan[0] / 14) * 100}%`,
                    width: `${((m.plan[1] - m.plan[0]) / 14) * 100}%`,
                    height: "5px",
                    backgroundColor: "#e02020",
                  }}
                />
              )}
              {m.actual && (
                <div
                  style={{
                    position: "absolute",
                    top: "11px",
                    left: `${(m.actual[0] / 14) * 100}%`,
                    width: `${((m.actual[1] - m.actual[0]) / 14) * 100}%`,
                    height: "5px",
                    backgroundColor: "#1e6fdd",
                  }}
                />
              )}
            </div>
          </div>
        ))}
        {/* month axis */}
        <div style={{ display: "flex", marginTop: "4px" }}>
          <div style={{ width: `${AXIS_LEFT}px`, minWidth: `${AXIS_LEFT}px` }} />
          <div style={{ flex: 1, display: "flex" }}>
            {MILESTONE_MONTHS.map((mo) => (
              <span key={mo} style={{ flex: 1, fontSize: "8px", color: "#777", textAlign: "left" }}>
                {mo}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ConstructionProgressTab({ projectName }: { projectName: string }) {
  const [comment, setComment] = React.useState("");
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      {/* Row 1: Construction site progress + Progress */}
      <div style={{ display: "grid", gridTemplateColumns: "1.9fr 1fr", gap: "8px" }}>
        {/* Construction site progress */}
        <div style={{ ...cardStyle, display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
            <span style={{ ...sectionTitle, color: "#1a2d4d" }}>Construction site progress</span>
            <span style={{ fontSize: "10px", color: "#1e6fdd", textDecoration: "underline", cursor: "pointer" }}>
              View detail
            </span>
          </div>
          <div style={{ position: "relative", flex: 1 }}>
            <img
              src={projectPhoto}
              alt={`${projectName} 공사 현장`}
              style={{ width: "100%", height: "100%", minHeight: "230px", objectFit: "cover", borderRadius: "4px", display: "block" }}
            />
            {[
              { text: "E Tower\nRF2 in-progress", left: "18%", top: "8%" },
              { text: "F Tower\nRF1 in-progress", left: "46%", top: "8%" },
              { text: "Office Tower\nRF2 complete", left: "72%", top: "12%" },
            ].map((t) => (
              <div
                key={t.text}
                style={{
                  position: "absolute",
                  left: t.left,
                  top: t.top,
                  color: "#ffd400",
                  fontSize: "12px",
                  fontWeight: 800,
                  whiteSpace: "pre-line",
                  textShadow: "0 1px 3px rgba(0,0,0,0.7)",
                  textAlign: "center",
                }}
              >
                {t.text}
              </div>
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "center", gap: "6px", padding: "8px 0 2px" }}>
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                style={{
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  backgroundColor: i === 0 ? "#1e6fdd" : "#c9d2dd",
                }}
              />
            ))}
          </div>
        </div>

        {/* Progress */}
        <div style={cardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ ...sectionTitle, color: "#3e7d4c" }}>Progress</span>
            <span
              style={{
                fontSize: "9px",
                backgroundColor: "#dff2e3",
                color: "#3e7d4c",
                borderRadius: "3px",
                padding: "2px 6px",
                height: "fit-content",
                fontWeight: 700,
              }}
            >
              (B-A) +3.9%
            </span>
          </div>
          <div style={{ textAlign: "center", fontSize: "10px", color: "#333", marginTop: "4px" }}>
            Planned Progres (A)
          </div>
          <div style={{ display: "flex", justifyContent: "center", margin: "4px 0 2px", position: "relative" }}>
            <Donut percent={36.6} color="#c0392b" extraArc={{ percent: 32.5, color: "#2b5cad" }} label="36.6%" />
            <span style={{ position: "absolute", right: "6px", bottom: "10px", fontSize: "10px", color: "#c0392b", fontWeight: 700 }}>
              32.5%
            </span>
          </div>
          <div style={{ textAlign: "center", fontSize: "10px", color: "#1a2d4d", fontWeight: 600 }}>
            Actual Progress (B)
          </div>
          <div
            style={{
              textAlign: "center",
              fontSize: "11px",
              color: "#333",
              fontWeight: 700,
              marginTop: "8px",
              borderTop: "1px solid #eef1f5",
              paddingTop: "6px",
            }}
          >
            <u>Time Elapsed Rate</u> (00.0%)
          </div>
        </div>
      </div>

      {/* Row 2: Project lifecycle progress */}
      <div style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
          <span style={{ ...sectionTitle, color: "#1a2d4d" }}>Project lifecycle progress</span>
          <span style={{ fontSize: "10px", color: "#1e6fdd", textDecoration: "underline", cursor: "pointer" }}>
            View detail
          </span>
        </div>
        <div style={{ width: "100%", height: "240px" }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={LIFECYCLE_DATA} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="#eef1f5" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 9, fill: "#555" }} tickLine={false} axisLine={{ stroke: "#d5dce6" }} />
              <YAxis
                yAxisId="left"
                tick={{ fontSize: 9, fill: "#555" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${v}%`}
                domain={[0, 80]}
                ticks={[0, 20, 40, 60, 80]}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 9, fill: "#555" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${v}%`}
                domain={[0, 20]}
                ticks={[0, 5, 10, 15, 20]}
              />
              <Tooltip contentStyle={{ fontSize: "11px" }} />
              <Legend wrapperStyle={{ fontSize: "10px" }} iconSize={10} />
              <Bar yAxisId="left" dataKey="plan" name="Plan Monthly" fill="#2b5cad" barSize={12} isAnimationActive={false} />
              <Bar yAxisId="left" dataKey="actual" name="Actual Monthly" fill="#9dc3e6" barSize={12} isAnimationActive={false} />
              <Line yAxisId="right" dataKey="planAccum" name="Plan Accum" stroke="#3e7d4c" strokeWidth={2} dot={{ r: 2 }} isAnimationActive={false} />
              <Line yAxisId="right" dataKey="actualAccum" name="Actual Accum" stroke="#e08a3c" strokeWidth={2} dot={{ r: 2 }} isAnimationActive={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 3: Mile Stone */}
      <MilestoneChart />

      {/* Row 4: Comment */}
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
              <option>Construction progress</option>
              <option>Mile Stone</option>
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
