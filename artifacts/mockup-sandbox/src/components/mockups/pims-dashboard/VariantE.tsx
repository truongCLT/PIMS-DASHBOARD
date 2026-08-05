/**
 * Variant E — Analytics Clean
 * Dark navy top nav + horizontal tabs, light-gray canvas, white cards,
 * mid-blue accent. Matches the attached analytics dashboard reference image.
 * Data types and chart types unchanged.
 */
import React, { useState } from "react";
import { SalesChart }       from "./components/SalesChart";
import { ProfitChart }      from "./components/ProfitChart";
import { OrderStatus }      from "./components/OrderStatus";
import { CashFlowChart }    from "./components/CashFlowChart";
import { PerformanceTable } from "./components/PerformanceTable";
import { CommentPanel }     from "./components/CommentPanel";
import { Download, ChevronDown, BarChart2, TrendingUp, DollarSign,
         Activity, Bell, User, Grid, Settings, Menu } from "lucide-react";
import "./_group.css";

/* ── Palette ──────────────────────────────────────────────────── */
const NAV_BG   = "#1e2a3b";   // dark navy header
const NAV_TEXT = "#b0bec9";
const NAV_ACT  = "#ffffff";
const ACCENT   = "#4472ca";   // analytics mid-blue
const ACCENT2  = "#5b9bd5";   // lighter blue
const BG       = "#f2f5fa";   // page canvas
const WHITE    = "#ffffff";
const BORDER   = "#dde3ee";
const TEXT     = "#1e2a3b";
const MUTED    = "#6b7d96";
const SUB      = "#9ab0c8";
const SUCCESS  = "#2ecc71";
const WARN     = "#e67e22";
const DANGER   = "#e74c3c";

/* ── Top Navigation Bar ───────────────────────────────────────── */
const TOP_TABS = ["Vision Scope", "Business Insight", "Direct Enquiry",
                  "Conversions", "Discrepancy", "About Visitor", "Currency"];

function TopNav({ activeTab, setActiveTab }: { activeTab: string; setActiveTab: (t:string)=>void }) {
  return (
    <div style={{ backgroundColor: NAV_BG, flexShrink: 0 }}>
      {/* Brand bar */}
      <div style={{
        display: "flex", alignItems: "center", gap: "12px",
        padding: "0 20px", height: "48px",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{
            width: "28px", height: "28px", borderRadius: "6px",
            background: `linear-gradient(135deg, ${ACCENT} 0%, ${ACCENT2} 100%)`,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Grid size={14} color="#fff" />
          </div>
          <span style={{ color: WHITE, fontWeight: "700", fontSize: "14px", letterSpacing: "0.04em" }}>
            EEOZ <span style={{ color: NAV_TEXT, fontWeight: "400", fontSize: "11px" }}>대시보드</span>
          </span>
        </div>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Right icons */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div style={{ fontSize: "12px", color: NAV_TEXT }}>USD 1K</div>
          <button style={{
            backgroundColor: ACCENT, color: WHITE, border: "none",
            borderRadius: "6px", padding: "5px 14px",
            fontSize: "11px", cursor: "pointer", fontWeight: "600",
            display: "flex", alignItems: "center", gap: "5px",
          }}>
            <Download size={11} /> 다운로드
          </button>
          <Bell size={16} color={NAV_TEXT} style={{ cursor: "pointer" }} />
          <div style={{
            width: "28px", height: "28px", borderRadius: "50%",
            background: `linear-gradient(135deg, ${ACCENT} 0%, #6f9de8 100%)`,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <User size={14} color="#fff" />
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{
        display: "flex", alignItems: "flex-end", gap: "2px",
        padding: "0 20px", height: "38px", overflowX: "auto",
      }}>
        {TOP_TABS.map(tab => {
          const active = tab === activeTab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: "6px 14px",
                backgroundColor: active ? `rgba(68,114,202,0.18)` : "transparent",
                color: active ? NAV_ACT : NAV_TEXT,
                border: "none",
                borderBottom: active ? `2px solid ${ACCENT2}` : "2px solid transparent",
                borderRadius: "4px 4px 0 0",
                fontSize: "11px",
                cursor: "pointer",
                fontWeight: active ? "600" : "400",
                whiteSpace: "nowrap",
                transition: "all 0.15s",
              }}
            >
              {tab}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ── Left Sidebar (project tree) ──────────────────────────────── */
const TREE = [
  { label: "DECV", open: true, children: [
    { label: "시공", open: true, active: true, children: [
      { label: "진행중", leaf: true },
      { label: "종료",   leaf: true },
    ]},
    { label: "용역", open: false, children: [
      { label: "진행중", leaf: true },
      { label: "종료",   leaf: true },
    ]},
  ]},
  { label: "TCC",    open: false, children: [] },
  { label: "DE HEIM", open: false, children: [] },
];

function SideNode({ node, depth=0 }: { node: any; depth?: number }) {
  const [open, setOpen] = useState(node.open ?? false);
  const has  = node.children && node.children.length > 0;
  const pl   = `${12 + depth * 12}px`;
  const isTop = depth === 0;
  return (
    <div>
      <div
        onClick={() => has && setOpen(!open)}
        style={{
          display: "flex", alignItems: "center", gap: "6px",
          padding: `5px 10px 5px ${pl}`,
          cursor: has || node.leaf ? "pointer" : "default",
          backgroundColor: node.active ? `rgba(68,114,202,0.10)` : "transparent",
          borderLeft: node.active ? `3px solid ${ACCENT}` : "3px solid transparent",
          color: node.active ? ACCENT : isTop ? TEXT : MUTED,
          fontSize: isTop ? "11px" : "10.5px",
          fontWeight: isTop ? "700" : node.active ? "600" : "400",
          userSelect: "none",
        }}
      >
        {!isTop && (
          <span style={{
            width: "5px", height: "5px", borderRadius: "50%", flexShrink: 0,
            backgroundColor: node.active ? ACCENT : BORDER,
          }} />
        )}
        <span style={{ flex: 1 }}>{node.label}</span>
        {has && (
          <ChevronDown
            size={10} color={MUTED}
            style={{ transform: open ? "rotate(0deg)" : "rotate(-90deg)", transition: "0.15s" }}
          />
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
      width: "160px", minWidth: "160px", backgroundColor: WHITE,
      display: "flex", flexDirection: "column",
      borderRight: `1px solid ${BORDER}`,
    }}>
      {/* DECV TOTAL button */}
      <div style={{
        display: "flex", alignItems: "center", gap: "8px",
        padding: "10px 12px",
        color: TEXT, fontSize: "11px", fontWeight: "700",
        borderBottom: `1px solid ${BORDER}`,
        cursor: "pointer",
      }}>
        <BarChart2 size={13} color={ACCENT} />
        DECV TOTAL
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "6px 0" }}>
        {TREE.map((n, i) => <SideNode key={i} node={n} depth={0} />)}
      </div>

      {/* Branding */}
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

/* ── Sub-filter bar ───────────────────────────────────────────── */
function FilterBar() {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap",
      padding: "8px 16px",
      backgroundColor: WHITE,
      borderBottom: `1px solid ${BORDER}`,
      flexShrink: 0,
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
            padding: "3px 10px", fontSize: "10px", color: TEXT,
            backgroundColor: BG, cursor: "pointer",
            display: "flex", alignItems: "center", gap: "4px",
          }}>
            {val} <ChevronDown size={9} color={MUTED} />
          </div>
        </div>
      ))}
      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "6px" }}>
        <span style={{ fontSize: "10px", color: MUTED }}>단위:</span>
        <div style={{
          width: "30px", height: "16px", backgroundColor: ACCENT, borderRadius: "8px",
          position: "relative",
        }}>
          <div style={{
            position: "absolute", right: "2px", top: "2px",
            width: "12px", height: "12px", backgroundColor: WHITE, borderRadius: "50%",
          }} />
        </div>
        <span style={{ fontSize: "10px", color: TEXT, fontWeight: "600" }}>K USD</span>
      </div>
    </div>
  );
}

/* ── KPI metric cards ─────────────────────────────────────────── */
const KPI_DATA = [
  { label: "당월 매출",         icon: TrendingUp,  plan: 1297,  actual: 2360,  ach: "182%", color: ACCENT,  bg: `rgba(68,114,202,0.06)`  },
  { label: "당월 영업이익",     icon: DollarSign,  plan: 395,   actual: 127,   ach: "32%",  color: WARN,    bg: `rgba(230,126,34,0.06)`  },
  { label: "연간 누적 매출",    icon: BarChart2,   plan: 47318, actual: 42060, ach: "89%",  color: "#0891b2", bg: `rgba(8,145,178,0.06)` },
  { label: "연간 누적 영업이익",icon: Activity,    plan: 5003,  actual: 6613,  ach: "132%", color: SUCCESS, bg: `rgba(46,204,113,0.06)`  },
];

function KPICard({ label, icon: Icon, plan, actual, ach, color, bg }: any) {
  return (
    <div style={{
      flex: 1, minWidth: 0,
      backgroundColor: WHITE,
      border: `1px solid ${BORDER}`,
      borderRadius: "10px",
      overflow: "hidden",
      boxShadow: "0 1px 4px rgba(30,42,59,0.06)",
    }}>
      {/* colored top strip */}
      <div style={{
        backgroundColor: bg,
        borderBottom: `1px solid ${BORDER}`,
        padding: "8px 14px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <span style={{ fontSize: "10px", fontWeight: "600", color: MUTED, letterSpacing: "0.04em" }}>
          {label}
        </span>
        <div style={{
          width: "22px", height: "22px", borderRadius: "6px",
          backgroundColor: color + "20",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Icon size={12} color={color} />
        </div>
      </div>
      {/* numbers */}
      <div style={{ padding: "10px 14px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div>
            <div style={{ fontSize: "9px", color: SUB, marginBottom: "2px" }}>계획</div>
            <div style={{ fontSize: "clamp(13px,1.1vw,18px)", fontWeight: "700", color: TEXT }}>
              {plan.toLocaleString()}
            </div>
          </div>
          <div>
            <div style={{ fontSize: "9px", color: SUB, marginBottom: "2px" }}>실적</div>
            <div style={{ fontSize: "clamp(13px,1.1vw,18px)", fontWeight: "700", color: TEXT }}>
              {actual.toLocaleString()}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "9px", color: SUB, marginBottom: "2px" }}>달성률</div>
            <div style={{ fontSize: "clamp(14px,1.3vw,22px)", fontWeight: "800", color }}>
              {ach}
            </div>
          </div>
        </div>
        {/* mini progress bar */}
        <div style={{
          marginTop: "8px", height: "3px", borderRadius: "2px",
          backgroundColor: BORDER,
        }}>
          <div style={{
            height: "100%", borderRadius: "2px",
            width: Math.min(100, parseInt(ach)) + "%",
            backgroundColor: color,
          }} />
        </div>
      </div>
    </div>
  );
}

/* ── Widget card wrapper ──────────────────────────────────────── */
function WidgetCard({ title, badge, children, style }: { title: string; badge?: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      backgroundColor: WHITE,
      border: `1px solid ${BORDER}`,
      borderRadius: "10px",
      overflow: "hidden",
      boxShadow: "0 1px 4px rgba(30,42,59,0.06)",
      display: "flex",
      flexDirection: "column",
      ...style,
    }}>
      {/* card header */}
      <div style={{
        padding: "8px 14px",
        borderBottom: `1px solid ${BORDER}`,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexShrink: 0,
        backgroundColor: `rgba(68,114,202,0.03)`,
      }}>
        <span style={{ fontSize: "11px", fontWeight: "600", color: TEXT }}>{title}</span>
        {badge && (
          <span style={{
            fontSize: "9px", fontWeight: "600", color: ACCENT,
            backgroundColor: `rgba(68,114,202,0.10)`,
            borderRadius: "4px", padding: "2px 6px",
          }}>{badge}</span>
        )}
        <Settings size={11} color={SUB} style={{ cursor: "pointer" }} />
      </div>
      {/* card body */}
      <div style={{ flex: 1, padding: "8px 12px", minHeight: 0, overflow: "hidden" }}>
        {children}
      </div>
    </div>
  );
}

/* ── Main export ──────────────────────────────────────────────── */
export function VariantE() {
  const [activeTab, setActiveTab] = useState("Business Insight");

  return (
    <div style={{
      display: "flex", flexDirection: "column",
      height: "100vh", overflow: "hidden",
      fontFamily: "'Noto Sans KR','Inter',sans-serif",
      backgroundColor: BG,
    }}>
      {/* ① Top nav */}
      <TopNav activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* ② Body: sidebar + main */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <Sidebar />

        {/* ③ Main column */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {/* Sub-filter bar */}
          <FilterBar />

          {/* Scrollable content */}
          <div style={{ flex: 1, overflowY: "auto", padding: "10px 14px", display: "flex", flexDirection: "column", gap: "10px" }}>

            {/* KPI row */}
            <div style={{ display: "flex", gap: "10px" }}>
              {KPI_DATA.map(k => <KPICard key={k.label} {...k} />)}
            </div>

            {/* Row 2: 매출 / 손익 / 수주 */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 260px", gap: "10px" }}>
              <WidgetCard title="매출 실적 및 전망" badge="단위: 천 USD">
                <SalesChart />
              </WidgetCard>
              <WidgetCard title="손익현황" badge="단위: 천 USD">
                <ProfitChart />
              </WidgetCard>
              <WidgetCard title="수주 실적 현황">
                <OrderStatus />
              </WidgetCard>
            </div>

            {/* Row 3: 자금수지 / 경영실적 / 상세 */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 260px", gap: "10px" }}>
              <WidgetCard title="자금수지" badge="DECV 전체">
                <CashFlowChart />
              </WidgetCard>
              <WidgetCard title="경영실적 현황" badge="단위: 천 USD">
                <PerformanceTable />
              </WidgetCard>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <WidgetCard title="실적 분석" style={{ flex: 1 }}>
                  <CommentPanel title="실적" section="analysis" />
                </WidgetCard>
                <WidgetCard title="전망" style={{ flex: 1 }}>
                  <CommentPanel title="전망" section="outlook" />
                </WidgetCard>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
