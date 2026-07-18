import React, { useState } from "react";
import { Download, MessageSquare, Send } from "lucide-react";
import { Donut, MiniBar } from "./ProjectDashboard";
import { ServiceSaleTab } from "./ServiceSaleTab";
import { ServiceOutsourcingTab } from "./ServiceOutsourcingTab";
import { ServiceCashflowTab } from "./ServiceCashflowTab";

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

const TABS = ["Overview", "Sale & Profit", "Budget Execution", "Outsourcing", "Cashflow"];

const TAB_LABELS: Record<string, string> = {
  Overview: "개요",
  "Sale & Profit": "매출",
  "Budget Execution": "예산집행",
  Outsourcing: "외주",
  Cashflow: "자금",
};

const YEARS = Array.from({ length: 21 }, (_, i) => 2015 + i); // 2015 ~ 2035
const MONTHS = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];

const selectStyle: React.CSSProperties = {
  border: "none",
  outline: "none",
  fontSize: "12px",
  color: "#333",
  backgroundColor: "transparent",
  cursor: "pointer",
  appearance: "none" as const,
  WebkitAppearance: "none" as const,
  paddingRight: "14px",
};

function YearMonthSelect({
  year,
  month,
  onYear,
  onMonth,
}: {
  year: number;
  month: string;
  onYear: (y: number) => void;
  onMonth: (m: string) => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "2px",
        border: "1px solid #ccd4dd",
        borderRadius: "6px",
        padding: "4px 8px",
        backgroundColor: "#fff",
      }}
    >
      <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
        <select value={year} onChange={(e) => onYear(Number(e.target.value))} style={selectStyle}>
          {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <span style={{ position: "absolute", right: 0, fontSize: "9px", color: "#888", pointerEvents: "none" }}>▼</span>
      </div>
      <span style={{ fontSize: "12px", color: "#aab2bc", margin: "0 1px" }}>년</span>
      <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
        <select value={month} onChange={(e) => onMonth(e.target.value)} style={selectStyle}>
          {MONTHS.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <span style={{ position: "absolute", right: 0, fontSize: "9px", color: "#888", pointerEvents: "none" }}>▼</span>
      </div>
      <span style={{ fontSize: "12px", color: "#aab2bc", margin: "0 1px" }}>월</span>
    </div>
  );
}

export function ServiceProjectDashboard({ projectName }: { projectName: string }) {
  const [currency, setCurrency] = useState("USD");
  const [unitOn, setUnitOn] = useState(true);
  const [activeTab, setActiveTab] = useState("Overview");
  const [comment, setComment] = useState("");
  const [fromYear, setFromYear] = useState(2026);
  const [fromMonth, setFromMonth] = useState("04");
  const [toYear, setToYear] = useState(2026);
  const [toMonth, setToMonth] = useState("06");

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
          <YearMonthSelect year={fromYear} month={fromMonth} onYear={setFromYear} onMonth={setFromMonth} />
          <span style={{ fontSize: "12px", color: "#aab2bc" }}>→</span>
          <YearMonthSelect year={toYear} month={toMonth} onYear={setToYear} onMonth={setToMonth} />
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
              backgroundColor: unitOn ? "#5b5fc7" : "#b0b8c4",
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

      {/* Project info bar — always visible */}
      <div style={{ ...cardStyle, margin: "8px 10px 0", display: "flex", gap: "10px", alignItems: "stretch" }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 0", fontSize: "12px", color: "#1a2d4d" }}>
            <span style={{ fontWeight: 700, paddingRight: "14px" }}>Project : {projectName}</span>
            <span style={{ borderLeft: "1px solid #d5dce6", padding: "0 14px" }}>발주처 : 0000000</span>
            <span style={{ borderLeft: "1px solid #d5dce6", padding: "0 14px" }}>
              수행기간 : '00.00.00~'00.00.00&nbsp;&nbsp;(00개월)
            </span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 0", fontSize: "12px", color: "#1a2d4d", marginTop: "8px" }}>
            <span style={{ fontWeight: 700, paddingRight: "14px" }}>도급액 : 0,000,000</span>
            <span style={{ borderLeft: "1px solid #d5dce6", padding: "0 14px" }}>
              수행내용 : 인허가, 프리콘 보고서 제출
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

      {/* Horizontal tab bar */}
      <div
        style={{
          display: "flex",
          gap: "4px",
          padding: "8px 10px 0",
          backgroundColor: "#f0f4f9",
          borderBottom: "2px solid #c8d2de",
          marginTop: "8px",
        }}
      >
        {TABS.map((tab) => {
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
              {TAB_LABELS[tab] ?? tab}
            </button>
          );
        })}
      </div>

      {/* Body */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px", padding: "10px" }}>
        {activeTab === "Sale & Profit" ? (
          <ServiceSaleTab />
        ) : activeTab === "Outsourcing" ? (
          <ServiceOutsourcingTab />
        ) : activeTab === "Cashflow" ? (
          <ServiceCashflowTab />
        ) : activeTab === "Overview" ? (
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "8px" }}>
            {/* Row 1: Revenue / Budget Execution Status / Cash */}
            <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr", gap: "8px" }}>
              {/* Revenue */}
              <div style={cardStyle}>
                <span style={sectionTitle}>Revenue</span>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-around", marginTop: "10px" }}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "10px", color: "#555", marginBottom: "2px" }}>1,194</div>
                    <Donut percent={27.6} color="#2b5cad" size={150} stroke={16} label="27.6%" labelSize={24} />
                    <div style={{ fontSize: "10px", color: "#1a2d4d", fontWeight: 700, marginTop: "4px", textDecoration: "underline" }}>
                      Achievement Rate
                    </div>
                    <div style={{ fontSize: "11px", color: "#1a2d4d", fontWeight: 700, marginTop: "6px", textDecoration: "underline" }}>
                      Annual Target Achievement
                    </div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "10px", color: "#555", marginBottom: "2px" }}>1,194</div>
                    <Donut percent={27.6} color="#2b5cad" size={150} stroke={16} label="27.6%" labelSize={24} />
                    <div style={{ fontSize: "10px", color: "#1a2d4d", fontWeight: 700, marginTop: "4px", textDecoration: "underline" }}>
                      Achievement Rate
                    </div>
                    <div style={{ fontSize: "11px", color: "#1a2d4d", fontWeight: 700, marginTop: "6px", textDecoration: "underline" }}>
                      Total Revenue Achievement
                    </div>
                  </div>
                </div>
              </div>

              {/* Budget Execution Status */}
              <div style={cardStyle}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <span style={sectionTitle}>
                    Budget <u>Execution Status</u>
                  </span>
                  <span style={{ fontSize: "10px", color: "#333", fontWeight: 600 }}>Total Execution : 00.0%</span>
                </div>
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
                    { label: "Direct Cost", budget: 2477, spent: 977, pct: "35.2%" },
                    { label: "Expense 2", budget: 258, spent: 99, pct: "45.3%" },
                    { label: "Contingency", budget: 60, spent: 0, pct: "" },
                  ].map((g) => {
                    const H = 150;
                    const bh = Math.max((Math.log10(g.budget + 1) / Math.log10(2500)) * H, 8);
                    const sh = g.spent > 0 ? Math.max(bh * (g.spent / g.budget), 6) : 0;
                    return (
                      <div key={g.label} style={{ textAlign: "center" }}>
                        <div style={{ fontSize: "9px", color: "#555", marginBottom: "2px" }}>{g.budget.toLocaleString()}</div>
                        <div style={{ height: `${H}px`, display: "flex", alignItems: "flex-end", gap: "3px", justifyContent: "center" }}>
                          <div style={{ width: "24px", height: `${bh}px`, backgroundColor: "#d9dee5" }} />
                          {sh > 0 && (
                            <div style={{ width: "24px", height: `${sh}px`, backgroundColor: "#2b5cad", position: "relative" }}>
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
                        <div style={{ fontSize: "9px", color: "#333", fontWeight: 600, marginTop: "2px" }}>{g.label}</div>
                      </div>
                    );
                  })}
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
                    height: "190px",
                  }}
                >
                  <MiniBar value={80} max={100} color="#c9d2dd" label="Revenue" height={150} valueLabel="00" width={24} />
                  <MiniBar value={72} max={100} color="#c9d2dd" label="Confirmed (A)" height={150} valueLabel="00" width={24} />
                  <MiniBar value={70} max={100} color="#2b5cad" label="Collection (B)" height={150} valueLabel="00" width={24} />
                  <MiniBar value={18} max={100} color="#c0392b" label="Outstanding (A)-(B)" height={150} valueLabel="00" width={24} />
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
                    <option>Revenue</option>
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
        ) : (
          <div
            style={{
              ...cardStyle,
              padding: "60px 20px",
              textAlign: "center",
              fontSize: "13px",
              color: "#5a6a7e",
            }}
          >
            {TAB_LABELS[activeTab] ?? activeTab} 화면은 준비 중입니다.
          </div>
        )}
      </div>
    </div>
  );
}
