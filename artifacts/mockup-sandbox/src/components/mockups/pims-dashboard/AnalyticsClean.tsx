/**
 * Analytics Clean — Dashboard
 * PIMS Dashboard 2 기준 복사본에 Analytics Clean 디자인 요소 적용.
 * 레이아웃·그리드·컴포넌트 구성 동일, 데이터·차트 유형 변경 없음.
 */
import React, { useState } from "react";
import { SalesChart }       from "./components/SalesChart";
import { ProfitChart }      from "./components/ProfitChart";
import { OrderStatus }      from "./components/OrderStatus";
import { CashFlowChart }    from "./components/CashFlowChart";
import { PerformanceTable } from "./components/PerformanceTable";
import { CommentPanel }     from "./components/CommentPanel";
import {
  Download, ChevronDown, TrendingUp, DollarSign, BarChart2,
  Activity, Bell, User, Grid, FolderClosed, Settings,
} from "lucide-react";
import "./_group.css";

/* ── Design tokens ─────────────────────────────────────────── */
const NAV_BG   = "#1e2a3b";
const NAV_TEXT = "#8fa8c2";
const NAV_ACT  = "#ffffff";
const ACCENT   = "#4472ca";
const BG       = "#f2f5fa";
const WHITE    = "#ffffff";
const BORDER   = "#dde3ee";
const TEXT     = "#1e2a3b";
const MUTED    = "#6b7d96";
const SUB      = "#9ab0c8";

const STRIP_COLORS = ["#4472ca", "#e67e22", "#0891b2", "#059669"];
const STRIP_ICONS  = [TrendingUp, DollarSign, BarChart2, Activity];

/* ── Top navigation bar ────────────────────────────────────── */
const TOP_TABS = [
  "Vision Scope", "Business Insight", "Direct Enquiry",
  "Conversions", "Discrepancy", "About Visitor", "Currency",
];

function TopNav({ active, setActive }: { active: string; setActive: (t: string) => void }) {
  return (
    <div style={{ backgroundColor: NAV_BG, flexShrink: 0 }}>
      {/* Brand bar */}
      <div style={{
        display: "flex", alignItems: "center", padding: "0 20px",
        height: "46px", borderBottom: "1px solid rgba(255,255,255,0.06)",
        gap: "12px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{
            width: "26px", height: "26px", borderRadius: "6px",
            background: `linear-gradient(135deg, ${ACCENT} 0%, #5b9bd5 100%)`,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Grid size={13} color="#fff" />
          </div>
          <span style={{ color: NAV_ACT, fontWeight: "700", fontSize: "13px", letterSpacing: "0.04em" }}>
            PIMS <span style={{ color: NAV_TEXT, fontWeight: "400", fontSize: "11px" }}>대시보드</span>
          </span>
        </div>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: "11px", color: NAV_TEXT }}>K USD</span>
        <button style={{
          backgroundColor: ACCENT, color: WHITE, border: "none",
          borderRadius: "6px", padding: "5px 12px",
          fontSize: "11px", cursor: "pointer", fontWeight: "600",
          display: "flex", alignItems: "center", gap: "5px",
        }}>
          <Download size={11} />다운로드
        </button>
        <Bell size={15} color={NAV_TEXT} style={{ cursor: "pointer" }} />
        <div style={{
          width: "26px", height: "26px", borderRadius: "50%",
          background: `linear-gradient(135deg, ${ACCENT} 0%, #7ab4e8 100%)`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <User size={13} color="#fff" />
        </div>
      </div>

      {/* Tab bar */}
      <div style={{
        display: "flex", alignItems: "flex-end", gap: "2px",
        padding: "0 20px", height: "36px",
      }}>
        {TOP_TABS.map(tab => {
          const isActive = tab === active;
          return (
            <button key={tab} onClick={() => setActive(tab)} style={{
              padding: "5px 13px",
              backgroundColor: isActive ? "rgba(68,114,202,0.18)" : "transparent",
              color: isActive ? NAV_ACT : NAV_TEXT,
              border: "none",
              borderBottom: isActive ? `2px solid #5b9bd5` : "2px solid transparent",
              borderRadius: "4px 4px 0 0",
              fontSize: "11px", cursor: "pointer",
              fontWeight: isActive ? "600" : "400",
              whiteSpace: "nowrap",
            }}>{tab}</button>
          );
        })}
      </div>
    </div>
  );
}

/* ── Left sidebar ──────────────────────────────────────────── */
const TREE = [
  { label: "DECV", open: true, children: [
    { label: "시공", open: true, active: true, children: [
      { label: "진행중" }, { label: "종료" },
    ]},
    { label: "용역", open: false, children: [
      { label: "진행중" }, { label: "종료" },
    ]},
  ]},
  { label: "TCC",     open: false, children: [] },
  { label: "DE HEIM", open: false, children: [] },
];

function SideNode({ node, depth = 0 }: { node: any; depth?: number }) {
  const [open, setOpen] = useState(node.open ?? false);
  const has = node.children?.length > 0;
  const pl = `${12 + depth * 12}px`;
  return (
    <div>
      <div onClick={() => has && setOpen(!open)} style={{
        display: "flex", alignItems: "center", gap: "6px",
        padding: `5px 10px 5px ${pl}`,
        cursor: has || node.leaf ? "pointer" : "default",
        backgroundColor: node.active ? `rgba(68,114,202,0.10)` : "transparent",
        borderLeft: node.active ? `3px solid ${ACCENT}` : "3px solid transparent",
        color: node.active ? ACCENT : depth === 0 ? TEXT : MUTED,
        fontSize: depth === 0 ? "11px" : "10.5px",
        fontWeight: depth === 0 ? "700" : node.active ? "600" : "400",
        userSelect: "none",
      }}>
        {depth > 0 && (
          <span style={{
            width: "5px", height: "5px", borderRadius: "50%", flexShrink: 0,
            backgroundColor: node.active ? ACCENT : BORDER,
          }} />
        )}
        <span style={{ flex: 1 }}>{node.label}</span>
        {has && (
          <ChevronDown size={10} color={SUB}
            style={{ transform: open ? "rotate(0deg)" : "rotate(-90deg)", transition: "0.15s" }} />
        )}
      </div>
      {open && node.children?.map((c: any, i: number) => (
        <SideNode key={i} node={c} depth={depth + 1} />
      ))}
    </div>
  );
}

function Sidebar() {
  return (
    <div style={{
      width: "170px", minWidth: "170px", backgroundColor: WHITE,
      display: "flex", flexDirection: "column",
      borderRight: `1px solid ${BORDER}`,
    }}>
      <div style={{
        display: "flex", alignItems: "center", gap: "8px",
        padding: "10px 12px", color: TEXT, fontSize: "11px", fontWeight: "700",
        borderBottom: `1px solid ${BORDER}`, cursor: "pointer",
      }}>
        <FolderClosed size={13} color={ACCENT} fill={ACCENT} />
        DECV TOTAL
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "4px 0" }}>
        {TREE.map((n, i) => <SideNode key={i} node={n} depth={0} />)}
      </div>
      <div style={{
        padding: "10px 12px", borderTop: `1px solid ${BORDER}`,
        textAlign: "center",
      }}>
        <div style={{ fontSize: "10px", fontWeight: "700", color: ACCENT }}>PIMS System</div>
        <div style={{ fontSize: "9px", color: SUB }}>For DAEWOO E&C VINA</div>
      </div>
    </div>
  );
}

/* ── Sub filter bar ────────────────────────────────────────── */
function FilterBar() {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap",
      padding: "7px 14px", backgroundColor: WHITE,
      borderBottom: `1px solid ${BORDER}`, flexShrink: 0,
    }}>
      {[
        { label: "프로젝트", val: "전체" },
        { label: "조회 기간", val: "---- → ----" },
        { label: "조회 기준", val: "월" },
        { label: "통화", val: "USD" },
      ].map(({ label, val }) => (
        <div key={label} style={{ display: "flex", alignItems: "center", gap: "5px" }}>
          <span style={{ fontSize: "10px", color: MUTED, fontWeight: "600" }}>{label}</span>
          <div style={{
            border: `1px solid ${BORDER}`, borderRadius: "5px",
            padding: "3px 9px", fontSize: "10px", color: TEXT,
            backgroundColor: BG, display: "flex", alignItems: "center", gap: "4px",
          }}>
            {val} <ChevronDown size={9} color={MUTED} />
          </div>
        </div>
      ))}
      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "6px" }}>
        <span style={{ fontSize: "10px", color: MUTED }}>단위:</span>
        <div style={{
          width: "28px", height: "15px", backgroundColor: ACCENT,
          borderRadius: "8px", position: "relative",
        }}>
          <div style={{
            position: "absolute", right: "2px", top: "2px",
            width: "11px", height: "11px", backgroundColor: WHITE, borderRadius: "50%",
          }} />
        </div>
        <span style={{ fontSize: "10px", color: TEXT, fontWeight: "600" }}>K USD</span>
      </div>
    </div>
  );
}

/* ── KPI strip card ────────────────────────────────────────── */
const KPI_DATA = [
  { label: "당월 매출",          plan: 12072, actual: 9898,  ach: "82%",  achColor: "#e67e22" },
  { label: "당월 영업이익",      plan: 1511,  actual: 1208,  ach: "80%",  achColor: "#e74c3c" },
  { label: "연간 누적 매출",     plan: 47318, actual: 42060, ach: "89%",  achColor: "#e67e22" },
  { label: "연간 누적 영업이익", plan: 5003,  actual: 6613,  ach: "132%", achColor: "#2ecc71" },
];

function KPICard({ label, plan, actual, ach, achColor, color, IconComp }: any) {
  const pct = Math.min(100, parseFloat(ach));
  return (
    <div style={{
      flex: 1, minWidth: 0, backgroundColor: WHITE,
      border: `1px solid ${BORDER}`, borderRadius: "10px",
      overflow: "hidden", boxShadow: "0 1px 4px rgba(30,42,59,0.07)",
      display: "flex", flexDirection: "column",
    }}>
      {/* Coloured header strip */}
      <div style={{
        backgroundColor: color + "12",
        borderBottom: `1px solid ${color}22`,
        padding: "7px 13px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <span style={{ fontSize: "clamp(9px,0.75vw,12px)", fontWeight: "600", color: MUTED }}>
          {label.startsWith("연간 ") ? <><span style={{ opacity: 0.7 }}>연간 </span>{label.slice(3)}</> : label}
        </span>
        <div style={{
          width: "20px", height: "20px", borderRadius: "5px",
          backgroundColor: color + "22",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <IconComp size={11} color={color} />
        </div>
      </div>

      {/* Numbers */}
      <div style={{ padding: "8px 13px 10px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "7px" }}>
          {[["계획", plan], ["실적", actual]].map(([lbl, val]) => (
            <div key={String(lbl)}>
              <div style={{ fontSize: "9px", color: SUB, marginBottom: "2px" }}>{lbl}</div>
              <div style={{ fontSize: "clamp(14px,1.3vw,22px)", fontWeight: "700", color: TEXT }}>
                {Number(val).toLocaleString()}
              </div>
            </div>
          ))}
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "9px", color: SUB, marginBottom: "2px" }}>달성률</div>
            <div style={{ fontSize: "clamp(14px,1.3vw,22px)", fontWeight: "800", color: achColor }}>{ach}</div>
          </div>
        </div>
        {/* Progress bar */}
        <div style={{ height: "3px", borderRadius: "2px", backgroundColor: color + "20" }}>
          <div style={{
            height: "100%", borderRadius: "2px",
            width: `${pct}%`, backgroundColor: parseFloat(ach) > 100 ? achColor : color,
          }} />
        </div>
      </div>
    </div>
  );
}

/* ── Widget card wrapper ───────────────────────────────────── */
function Card({ title, badge, children, style }: {
  title: string; badge?: string; children: React.ReactNode; style?: React.CSSProperties;
}) {
  return (
    <div style={{
      backgroundColor: WHITE, border: `1px solid ${BORDER}`,
      borderRadius: "10px", overflow: "hidden",
      boxShadow: "0 1px 4px rgba(30,42,59,0.06)",
      display: "flex", flexDirection: "column",
      ...style,
    }}>
      {/* Card header */}
      <div style={{
        padding: "7px 13px",
        borderBottom: `1px solid ${BORDER}`,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexShrink: 0,
        background: `linear-gradient(90deg, rgba(68,114,202,0.04) 0%, transparent 100%)`,
      }}>
        <span style={{ fontSize: "11px", fontWeight: "600", color: TEXT }}>{title}</span>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {badge && (
            <span style={{
              fontSize: "9px", fontWeight: "600", color: ACCENT,
              backgroundColor: `rgba(68,114,202,0.10)`,
              borderRadius: "4px", padding: "2px 6px",
            }}>{badge}</span>
          )}
          <Settings size={11} color={SUB} style={{ cursor: "pointer" }} />
        </div>
      </div>
      {/* Card body */}
      <div style={{ flex: 1, padding: "8px 12px", minHeight: 0, overflow: "hidden" }}>
        {children}
      </div>
    </div>
  );
}

/* ── Root component ────────────────────────────────────────── */
export function AnalyticsClean() {
  const [activeTab, setActiveTab] = useState("Business Insight");

  return (
    <div style={{
      display: "flex", flexDirection: "column", height: "100vh",
      overflow: "hidden", fontFamily: "'Noto Sans KR','Inter',sans-serif",
      backgroundColor: BG,
    }}>
      {/* ① Top nav */}
      <TopNav active={activeTab} setActive={setActiveTab} />

      {/* ② Body */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <Sidebar />

        {/* ③ Main column */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <FilterBar />

          {/* Scrollable content — mirrors PIMS Dashboard 2 grid exactly */}
          <div style={{
            flex: 1, overflowY: "auto",
            padding: "8px 12px", display: "flex", flexDirection: "column", gap: "8px",
          }}>

            {/* KPI row — 4 cards, same order as PIMS Dashboard 2 */}
            <div style={{ display: "flex", gap: "8px" }}>
              {KPI_DATA.map((k, i) => (
                <KPICard key={k.label} {...k} color={STRIP_COLORS[i]} IconComp={STRIP_ICONS[i]} />
              ))}
            </div>

            {/* Row 2: 매출 차트 | 손익 차트 | 수주 실적 (330px) — same as PIMS Dashboard 2 */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 330px", gap: "8px" }}>
              <Card title="매출 실적 및 전망" badge="단위: 천 USD"><SalesChart /></Card>
              <Card title="손익현황" badge="단위: 천 USD"><ProfitChart /></Card>
              <Card title="수주 실적 현황"><OrderStatus /></Card>
            </div>

            {/* Row 3: 자금수지 | 경영실적 */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              <Card title="자금수지" badge="DECV 전체"><CashFlowChart /></Card>
              <Card title="경영실적 현황" badge="단위: 천 USD"><PerformanceTable /></Card>
            </div>

            {/* Row 4: 실적 | 전망 — same as PIMS Dashboard 2 */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              <Card title="실적" style={{ minHeight: "160px" }}>
                <CommentPanel title="실적" section="analysis" />
              </Card>
              <Card title="전망" style={{ minHeight: "160px" }}>
                <CommentPanel title="전망" section="outlook" />
              </Card>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
