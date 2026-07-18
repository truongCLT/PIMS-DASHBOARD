import React, { useState } from "react";
import { Download, MessageSquare, Send } from "lucide-react";
import projectPhoto from "../assets/project-photo.png";
import { ConstructionProgressTab } from "./ConstructionProgressTab";
import { CostingTab } from "./CostingTab";
import { OutsourcingTab } from "./OutsourcingTab";
import { ServiceCashflowTab } from "./ServiceCashflowTab";
import { ProjectDataEntryTab } from "./ProjectDataEntryTab";
import { SaleProfitTab } from "./SaleProfitTab";
import { OverviewTab } from "./OverviewTab";
import { useProjectDetail, fmtNum } from "../lib/projectDetailData";
import { useAdminAuth } from "../lib/adminAuth";
export { Donut, MiniBar } from "./charts";


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

const SIDE_TABS = ["Overview", "Construction progress", "Sale & Profit", "Costing", "Outsourcing", "Cashflow", "Data entry"];

const SIDE_TAB_LABELS: Record<string, string> = {
  Overview: "개요",
  "Construction progress": "공정",
  "Sale & Profit": "매출",
  Costing: "원가",
  Outsourcing: "외주",
  Cashflow: "자금",
  "Data entry": "데이터 입력",
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

export function ProjectDashboard({ projectName }: { projectName: string }) {
  const [currency, setCurrency] = useState("USD");
  const [unitOn, setUnitOn] = useState(true);
  const [activeTab, setActiveTab] = useState("Overview");
  const { isAdmin } = useAdminAuth();
  const [overviewComment, setOverviewComment] = useState("");
  const [fromYear, setFromYear] = useState(2026);
  const [fromMonth, setFromMonth] = useState("04");
  const [toYear, setToYear] = useState(2026);
  const [toMonth, setToMonth] = useState("06");
  const periodMonths = Math.min(
    24,
    Math.max(1, (toYear - fromYear) * 12 + (Number(toMonth) - Number(fromMonth)) + 1),
  );

  const { detail } = useProjectDetail(projectName);
  const ov = detail?.overview ?? { contractAmount: null, startDate: null, endDate: null };
  const fmtDate = (d: string | null) => (d ? `'${d.slice(2, 4)}.${d.slice(5, 7)}.${d.slice(8, 10)}` : "-");
  const periodLabel =
    ov.startDate && ov.endDate
      ? (() => {
          const s = new Date(ov.startDate);
          const e = new Date(ov.endDate);
          const mo = Math.max(0, Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24 * 30.44)));
          return `${fmtDate(ov.startDate)}~${fmtDate(ov.endDate)}\u00A0\u00A0(${mo}개월)`;
        })()
      : "-";

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
          {/* From */}
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
              <select value={fromYear} onChange={(e) => setFromYear(Number(e.target.value))} style={selectStyle}>
                {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
              <span style={{ position: "absolute", right: 0, fontSize: "9px", color: "#888", pointerEvents: "none" }}>▼</span>
            </div>
            <span style={{ fontSize: "12px", color: "#aab2bc", margin: "0 1px" }}>년</span>
            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <select value={fromMonth} onChange={(e) => setFromMonth(e.target.value)} style={selectStyle}>
                {MONTHS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
              <span style={{ position: "absolute", right: 0, fontSize: "9px", color: "#888", pointerEvents: "none" }}>▼</span>
            </div>
            <span style={{ fontSize: "12px", color: "#aab2bc", margin: "0 1px" }}>월</span>
          </div>
          <span style={{ fontSize: "12px", color: "#aab2bc" }}>→</span>
          {/* To */}
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
              <select value={toYear} onChange={(e) => setToYear(Number(e.target.value))} style={selectStyle}>
                {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
              <span style={{ position: "absolute", right: 0, fontSize: "9px", color: "#888", pointerEvents: "none" }}>▼</span>
            </div>
            <span style={{ fontSize: "12px", color: "#aab2bc", margin: "0 1px" }}>년</span>
            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <select value={toMonth} onChange={(e) => setToMonth(e.target.value)} style={selectStyle}>
                {MONTHS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
              <span style={{ position: "absolute", right: 0, fontSize: "9px", color: "#888", pointerEvents: "none" }}>▼</span>
            </div>
            <span style={{ fontSize: "12px", color: "#aab2bc", margin: "0 1px" }}>월</span>
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
            <span style={{ borderLeft: "1px solid #d5dce6", padding: "0 14px" }}>발주처 : 000000000000</span>
            <span style={{ borderLeft: "1px solid #d5dce6", padding: "0 14px" }}>
              공사기간 : {periodLabel}
            </span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 0", fontSize: "12px", color: "#1a2d4d", marginTop: "8px" }}>
            <span style={{ fontWeight: 700, paddingRight: "14px" }}>도급액 : {fmtNum(ov.contractAmount)}</span>
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
        {SIDE_TABS.filter((tab) => tab !== "Data entry" || isAdmin).map((tab) => {
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
            <CostingTab projectName={projectName} />
          </div>
        ) : activeTab === "Outsourcing" ? (
          <div style={{ flex: 1, minWidth: 0 }}>
            <OutsourcingTab projectName={projectName} />
          </div>
        ) : activeTab === "Data entry" ? (
          <div style={{ flex: 1, minWidth: 0 }}>
            <ProjectDataEntryTab projectName={projectName} />
          </div>
        ) : activeTab === "Cashflow" ? (
          <div style={{ flex: 1, minWidth: 0 }}>
            <ServiceCashflowTab
              projectName={projectName}
              fromYear={fromYear}
              fromMonth={Number(fromMonth)}
              months={periodMonths}
            />
          </div>
        ) : activeTab === "Sale & Profit" ? (
          <div style={{ flex: 1, minWidth: 0 }}>
            <SaleProfitTab
              projectName={projectName}
              fromYear={fromYear}
              fromMonth={Number(fromMonth)}
              months={periodMonths}
            />
          </div>
        ) : (
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "8px" }}>
          <OverviewTab projectName={projectName} />

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
