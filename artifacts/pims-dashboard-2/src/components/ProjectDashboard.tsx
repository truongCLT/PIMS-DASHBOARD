import React, { useState } from "react";
import { Download, MessageSquare, Send } from "lucide-react";
import projectPhoto from "../assets/project-photo.png";
import { ConstructionProgressTab } from "./ConstructionProgressTab";
import { CostingTab } from "./CostingTab";
import { OutsourcingTab } from "./OutsourcingTab";
import { CashflowTab } from "./CashflowTab";
import { SaleProfitTab } from "./SaleProfitTab";

/* ---------- small SVG donut ---------- */
function Donut({
  percent,
  size = 110,
  stroke = 14,
  color = "#2b5cad",
  track = "#e3e8ef",
  label,
  labelSize = 20,
  extraArc,
}: {
  percent: number;
  size?: number;
  stroke?: number;
  color?: string;
  track?: string;
  label?: string;
  labelSize?: number;
  extraArc?: { percent: number; color: string };
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
        strokeLinecap="butt"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      {label && (
        <text
          x={size / 2}
          y={size / 2}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={labelSize}
          fontWeight={700}
          fill="#1a2d4d"
        >
          {label}
        </text>
      )}
    </svg>
  );
}

/* ---------- simple vertical bar ---------- */
function MiniBar({
  value,
  max,
  color,
  label,
  height = 90,
  width = 18,
  valueLabel,
}: {
  value: number;
  max: number;
  color: string;
  label: string;
  height?: number;
  width?: number;
  valueLabel?: string;
}) {
  const h = max > 0 ? Math.max((value / max) * height, 2) : 2;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "3px" }}>
      <div style={{ height: `${height}px`, display: "flex", alignItems: "flex-end" }}>
        <div style={{ width: `${width}px`, height: `${h}px`, backgroundColor: color, borderRadius: "2px 2px 0 0" }} />
      </div>
      <span style={{ fontSize: "9px", color: "#555", whiteSpace: "nowrap" }}>{label}</span>
      {valueLabel != null && <span style={{ fontSize: "9px", color: "#333", fontWeight: 600 }}>{valueLabel}</span>}
    </div>
  );
}

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

const SIDE_TABS = ["Overview", "Construction progress", "Sale & Profit", "Costing", "Outsourcing", "Cashflow"];

const SIDE_TAB_LABELS: Record<string, string> = {
  Overview: "개요",
  "Construction progress": "공정",
  "Sale & Profit": "매출",
  Costing: "원가",
  Outsourcing: "외주",
  Cashflow: "자금",
};

export function ProjectDashboard({ projectName }: { projectName: string }) {
  const [currency, setCurrency] = useState("USD");
  const [unitOn, setUnitOn] = useState(true);
  const [activeTab, setActiveTab] = useState("Overview");
  const [overviewComment, setOverviewComment] = useState("");

  return (
    <div style={{ flex: 1, overflowY: "auto", backgroundColor: "#e8edf3" }}>
      {/* Banner */}
      <div
        style={{
          background: "linear-gradient(90deg, #dfe9f5 0%, #c9dcf0 55%, #9fc0e0 100%)",
          padding: "16px 20px 12px",
        }}
      >
        <div style={{ fontSize: "22px", fontWeight: 800, color: "#1a3a6b" }}>Dashboard of {projectName}</div>
      </div>

      {/* Filter row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "18px",
          flexWrap: "wrap",
          backgroundColor: "#fff",
          borderBottom: "1px solid #d5dce6",
          padding: "8px 20px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "12px", color: "#333", fontWeight: 600 }}>기간 :</span>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              border: "1px solid #ccd4dd",
              borderRadius: "6px",
              padding: "4px 10px",
              backgroundColor: "#fff",
            }}
          >
            <input
              type="month"
              defaultValue="2026-04"
              style={{ border: "none", outline: "none", fontSize: "12px", color: "#333", width: "110px" }}
            />
            <span style={{ fontSize: "12px", color: "#aab2bc" }}>→</span>
            <input
              type="month"
              defaultValue="2026-06"
              style={{ border: "none", outline: "none", fontSize: "12px", color: "#333", width: "110px" }}
            />
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "12px", color: "#333", fontWeight: 600 }}>Currency :</span>
          <div style={{ display: "flex", border: "1px solid #ccd4dd", borderRadius: "6px", overflow: "hidden" }}>
            {["USD", "KRW", "VND"].map((c) => (
              <button
                key={c}
                onClick={() => setCurrency(c)}
                style={{
                  padding: "5px 12px",
                  fontSize: "12px",
                  fontWeight: 600,
                  border: "none",
                  cursor: "pointer",
                  backgroundColor: currency === c ? "#fff" : "#f2f5f9",
                  color: currency === c ? "#1e6fdd" : "#666",
                  borderRight: c !== "VND" ? "1px solid #e0e6ee" : "none",
                }}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "12px", color: "#333", fontWeight: 600 }}>Unit :</span>
          <div
            onClick={() => setUnitOn(!unitOn)}
            style={{
              width: "36px",
              height: "20px",
              backgroundColor: "#5b5fc7",
              borderRadius: "10px",
              position: "relative",
              cursor: "pointer",
            }}
          >
            <div
              style={{
                position: "absolute",
                left: unitOn ? "18px" : "2px",
                top: "2px",
                width: "16px",
                height: "16px",
                backgroundColor: "#fff",
                borderRadius: "50%",
                boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
                transition: "left 0.15s ease",
              }}
            />
          </div>
          <span style={{ fontSize: "12px", color: "#333", fontWeight: 600 }}>1K {currency}</span>
        </div>

        <button
          style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            backgroundColor: "#2e4568",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            padding: "7px 14px",
            fontSize: "12px",
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          <Download size={13} />
          Export Excel
        </button>
      </div>

      {/* Horizontal tab bar */}
      <div
        style={{
          display: "flex",
          gap: "4px",
          padding: "8px 10px 0",
          backgroundColor: "#f0f4f9",
          borderBottom: "2px solid #c8d2de",
        }}
      >
        {SIDE_TABS.map((tab) => {
          const active = tab === activeTab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: "7px 20px",
                fontSize: "12px",
                fontWeight: active ? 700 : 500,
                color: active ? "#1a3a6b" : "#5a6a7e",
                backgroundColor: active ? "#fff" : "transparent",
                border: "1px solid",
                borderColor: active ? "#c8d2de" : "transparent",
                borderBottom: active ? "2px solid #fff" : "none",
                borderRadius: "4px 4px 0 0",
                cursor: "pointer",
                marginBottom: active ? "-2px" : "0",
                whiteSpace: "nowrap",
              }}
            >
              {SIDE_TAB_LABELS[tab] ?? tab}
            </button>
          );
        })}
      </div>

      {/* Body: content */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px", padding: "10px" }}>
        {activeTab === "Construction progress" ? (
          <div style={{ flex: 1, minWidth: 0 }}>
            <ConstructionProgressTab projectName={projectName} />
          </div>
        ) : activeTab === "Costing" ? (
          <div style={{ flex: 1, minWidth: 0 }}>
            <CostingTab />
          </div>
        ) : activeTab === "Outsourcing" ? (
          <div style={{ flex: 1, minWidth: 0 }}>
            <OutsourcingTab />
          </div>
        ) : activeTab === "Cashflow" ? (
          <div style={{ flex: 1, minWidth: 0 }}>
            <CashflowTab />
          </div>
        ) : activeTab === "Sale & Profit" ? (
          <div style={{ flex: 1, minWidth: 0 }}>
            <SaleProfitTab />
          </div>
        ) : (
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "8px" }}>
          {/* Project info bar */}
          <div style={{ ...cardStyle, display: "flex", gap: "10px", alignItems: "stretch" }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 0", fontSize: "12px", color: "#1a2d4d" }}>
                <span style={{ fontWeight: 700, paddingRight: "14px" }}>Project : {projectName}</span>
                <span style={{ borderLeft: "1px solid #d5dce6", padding: "0 14px" }}>발주처 : 000000000000</span>
                <span style={{ borderLeft: "1px solid #d5dce6", padding: "0 14px" }}>
                  공사기간 : '00.00.00~'00.00.00&nbsp;&nbsp;(00개월)
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "6px 0",
                  fontSize: "12px",
                  color: "#1a2d4d",
                  marginTop: "8px",
                }}
              >
                <span style={{ fontWeight: 700, paddingRight: "14px" }}>도급액 : 0,000,000</span>
                <span style={{ borderLeft: "1px solid #d5dce6", padding: "0 14px" }}>
                  공사규모 : B2~00F&nbsp;&nbsp;0개동 (오피스 및 아파트)&nbsp;&nbsp;공동주택 000세대
                </span>
              </div>
            </div>
            <div
              style={{
                border: "1px solid #c8d2de",
                borderRadius: "4px",
                padding: "8px 14px",
                fontSize: "13px",
                fontWeight: 700,
                color: "#1a2d4d",
                display: "flex",
                alignItems: "center",
                whiteSpace: "nowrap",
              }}
            >
              작성 기준 : 6월 말
            </div>
          </div>

          {/* Row 1: Progress / Revenue / Cost estimation */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1.6fr 1.6fr", gap: "8px" }}>
            {/* Progress */}
            <div style={cardStyle}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ ...sectionTitle, color: "#3e7d4c" }}>Progress</span>
                <span
                  style={{
                    fontSize: "9px",
                    backgroundColor: "#3e7d4c",
                    color: "#fff",
                    borderRadius: "3px",
                    padding: "1px 5px",
                    height: "fit-content",
                  }}
                >
                  공사 +0.9%
                </span>
              </div>
              <div style={{ fontSize: "10px", color: "#c0392b", marginTop: "4px" }}>
                Planned Progress (A) <b>32.5%</b>
              </div>
              <div style={{ display: "flex", justifyContent: "center", margin: "6px 0 2px" }}>
                <Donut
                  percent={36.6}
                  color="#c0392b"
                  extraArc={{ percent: 32.5, color: "#2b5cad" }}
                  size={130}
                  stroke={16}
                  label="36.6%"
                  labelSize={22}
                />
              </div>
              <div style={{ textAlign: "center", fontSize: "10px", color: "#1a2d4d", fontWeight: 600 }}>
                Actual Progress (B)
              </div>
              <div
                style={{
                  textAlign: "center",
                  fontSize: "10px",
                  color: "#333",
                  fontWeight: 700,
                  marginTop: "8px",
                  borderTop: "1px solid #eef1f5",
                  paddingTop: "6px",
                }}
              >
                Time Elapsed Rate (00.0%)
              </div>
            </div>

            {/* Revenue */}
            <div style={cardStyle}>
              <span style={sectionTitle}>Revenue</span>
              <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-around", marginTop: "6px" }}>
                <div style={{ display: "flex", gap: "10px", alignItems: "flex-end" }}>
                  <MiniBar value={55} max={100} color="#c9d2dd" label="Plan" height={110} valueLabel="00" />
                  <MiniBar value={75} max={100} color="#2b5cad" label="Actual" height={110} valueLabel="00" />
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "10px", color: "#555", marginBottom: "2px" }}>1,194</div>
                  <Donut percent={27.6} color="#2b5cad" size={110} stroke={13} label="27.6%" labelSize={18} />
                  <div style={{ fontSize: "10px", color: "#1a2d4d", fontWeight: 700, marginTop: "4px", textDecoration: "underline" }}>
                    Achievement Rate
                  </div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "10px", color: "#555", marginBottom: "2px" }}>3,298</div>
                  <Donut percent={36.6} color="#1a3a6b" size={110} stroke={13} label="36.6%" labelSize={18} />
                  <div style={{ fontSize: "10px", color: "#1a2d4d", fontWeight: 700, marginTop: "4px", textDecoration: "underline" }}>
                    Achievement Rate
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "space-around", marginTop: "6px" }}>
                <span style={{ fontSize: "10px", fontWeight: 700, color: "#333" }}>This Month</span>
                <span style={{ fontSize: "10px", fontWeight: 700, color: "#1a2d4d", textDecoration: "underline" }}>
                  Annual Target Achievement
                </span>
                <span style={{ fontSize: "10px", fontWeight: 700, color: "#1a2d4d", textDecoration: "underline" }}>
                  Total Target Achievement
                </span>
              </div>
            </div>

            {/* Cost estimation */}
            <div style={cardStyle}>
              <span style={sectionTitle}>Cost estimation</span>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-around", marginTop: "6px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "9px", color: "#555" }}>2,605</div>
                    <Donut percent={87.2} color="#2b5cad" size={78} stroke={9} label="87.2%" labelSize={14} />
                    <div style={{ fontSize: "10px", color: "#1a2d4d", fontWeight: 600 }}>Bidding</div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "9px", color: "#555" }}>2,605</div>
                    <Donut percent={87.2} color="#1a3a6b" size={78} stroke={9} label="87.2%" labelSize={14} />
                    <div style={{ fontSize: "10px", color: "#1a2d4d", fontWeight: 600, textDecoration: "underline" }}>
                      Execution Budgeting
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "10px", color: "#555" }}>3,298 / 2,793</div>
                  <Donut percent={84.7} color="#2b5cad" size={160} stroke={18} label="84.7%" labelSize={26} />
                  <div style={{ fontSize: "11px", color: "#1a2d4d", fontWeight: 700, marginTop: "4px" }}>
                    Total Cost Rate
                  </div>
                  <div style={{ fontSize: "10px", color: "#333", marginTop: "2px" }}>Estimated Completion</div>
                </div>
              </div>
            </div>
          </div>

          {/* Row 2: Photo / Budget Execution Status / Cash */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1.6fr 1.2fr", gap: "8px" }}>
            {/* Photo */}
            <div style={{ ...cardStyle, padding: "8px", display: "flex", flexDirection: "column" }}>
              <img
                src={projectPhoto}
                alt={`${projectName} 현장 사진`}
                style={{ width: "100%", flex: 1, objectFit: "cover", borderRadius: "4px", minHeight: "180px" }}
              />
              <div style={{ display: "flex", justifyContent: "center", gap: "6px", padding: "8px 0 2px" }}>
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    style={{
                      width: "6px",
                      height: "6px",
                      borderRadius: "50%",
                      backgroundColor: i === 0 ? "#1a2d4d" : "#c9d2dd",
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Budget Execution Status */}
            <div style={cardStyle}>
              <span style={sectionTitle}>
                Budget <u>Execution Status</u>
              </span>
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-end",
                  justifyContent: "space-around",
                  marginTop: "10px",
                  paddingBottom: "4px",
                }}
              >
                {[
                  { label: "Outsourcing", budget: 2477, spent: 977, pct: "35.2%", boxed: true },
                  { label: "Common", budget: 55, spent: 35, pct: "62.5%", boxed: true },
                  { label: "Expense 1", budget: 34, spent: 19, pct: "45.3%", boxed: true },
                  { label: "Expense 2", budget: 258, spent: 99, pct: "45.3%", boxed: false },
                  { label: "Contingency", budget: 60, spent: 0, pct: "", boxed: false },
                ].map((g) => {
                  const H = 130;
                  const bh = Math.max((Math.log10(g.budget + 1) / Math.log10(2500)) * H, 8);
                  const sh = g.spent > 0 ? Math.max(bh * (g.spent / g.budget), 6) : 0;
                  return (
                    <div key={g.label} style={{ textAlign: "center" }}>
                      <div style={{ fontSize: "9px", color: "#555", marginBottom: "2px" }}>{g.budget.toLocaleString()}</div>
                      <div style={{ height: `${H}px`, display: "flex", alignItems: "flex-end", gap: "3px", justifyContent: "center" }}>
                        <div style={{ width: "22px", height: `${bh}px`, backgroundColor: "#d9dee5", position: "relative" }}>
                          {g.pct && (
                            <span
                              style={{
                                position: "absolute",
                                top: "-2px",
                                left: "50%",
                                transform: "translate(-50%, -100%)",
                                fontSize: "8px",
                                color: "#4a90d9",
                              }}
                            />
                          )}
                        </div>
                        {sh > 0 && (
                          <div style={{ width: "22px", height: `${sh}px`, backgroundColor: "#c0392b", position: "relative" }}>
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
                              {g.spent}
                            </span>
                          </div>
                        )}
                      </div>
                      {g.pct && <div style={{ fontSize: "9px", color: "#4a90d9", fontWeight: 600, marginTop: "2px" }}>{g.pct}</div>}
                      <div style={{ fontSize: "9px", color: "#333", fontWeight: 600, marginTop: "2px", textDecoration: g.boxed ? "underline" : "none" }}>
                        {g.label}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div style={{ textAlign: "right", fontSize: "10px", color: "#333", fontWeight: 600 }}>
                Direct Cost : 36.5%
              </div>
            </div>

            {/* Cash */}
            <div style={cardStyle}>
              <span style={sectionTitle}>Cash</span>
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-end",
                  justifyContent: "space-around",
                  marginTop: "10px",
                  height: "170px",
                }}
              >
                <MiniBar value={80} max={100} color="#c9d2dd" label="Revenue" height={140} valueLabel="00" width={24} />
                <MiniBar value={72} max={100} color="#c9d2dd" label="Confirmed (A)" height={140} valueLabel="00" width={24} />
                <MiniBar value={70} max={100} color="#2b5cad" label="Collection (B)" height={140} valueLabel="00" width={24} />
                <MiniBar value={18} max={100} color="#c0392b" label="Outstanding (A)-(B)" height={140} valueLabel="00" width={24} />
              </div>
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
                  <option>Progress</option>
                  <option>Revenue</option>
                  <option>Cost estimation</option>
                  <option>Budget Execution Status</option>
                  <option>Cash</option>
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
                value={overviewComment}
                onChange={(e) => setOverviewComment(e.target.value)}
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
        )}

      </div>
    </div>
  );
}
