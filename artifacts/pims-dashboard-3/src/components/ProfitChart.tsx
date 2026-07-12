import React from "react";

export const PROFIT_DATA = [
  { m: "1월", op: 320, opPct: "9%", non: 40, total: 500, totalPct: "10%", sga: "-180", sgaPct: "6%", ord: 360, ordPct: "9%", con: "80%", svc: "20%" },
  { m: "2월", op: 350, opPct: "9%", non: 30, total: 540, totalPct: "11%", sga: "-190", sgaPct: "7%", ord: 380, ordPct: "9%", con: "81%", svc: "19%" },
  { m: "3월", op: 370, opPct: "10%", non: 25, total: 580, totalPct: "12%", sga: "-210", sgaPct: "8%", ord: 395, ordPct: "11%", con: "85%", svc: "15%" },
  { m: "4월", op: 390, opPct: "11%", non: 35, total: 620, totalPct: "12%", sga: "-230", sgaPct: "8%", ord: 425, ordPct: "12%", con: "82%", svc: "18%" },
  { m: "5월", op: 420, opPct: "12%", non: 30, total: 660, totalPct: "13%", sga: "-240", sgaPct: "9%", ord: 450, ordPct: "12%", con: "78%", svc: "22%" },
  { m: "6월", op: 450, opPct: "13%", non: 40, total: 700, totalPct: "14%", sga: "-250", sgaPct: "10%", ord: 490, ordPct: "13%", con: "80%", svc: "20%" },
];

const NAVY = "var(--color-primary-navy)";
const PRIMARY = "var(--color-primary-blue)";
const CORAL = "var(--color-accent-coral)";
const LIGHT_BLUE = "rgba(74, 127, 212, 0.1)";

const Y0 = 400;
const YTOP = 20;
const SCALE = (Y0 - YTOP) / 800;
const y = (v: number) => Y0 - v * SCALE;

export function ProfitChart() {
  const plotLeft = 80;
  const plotRight = 950;
  const slot = (plotRight - plotLeft) / PROFIT_DATA.length;
  const barW = 58;

  return (
    <div style={{
      backgroundColor: "var(--color-card-bg)",
      borderRadius: "14px",
      boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
      padding: "20px 24px",
      display: "flex",
      flexDirection: "column",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <span style={{ fontSize: "14px", fontWeight: "600", color: "var(--color-text-primary)" }}>손익현황</span>
        <button style={{ fontSize: "12px", color: "var(--color-primary-blue)", background: "none", border: "none", cursor: "pointer", fontWeight: "500" }}>
          상세보기
        </button>
      </div>

      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <svg viewBox="0 0 1000 445" style={{ width: "100%", maxHeight: "250px", display: "block" }}>
        {/* Grid lines + y labels */}
        {[0, 200, 400, 600, 800].map((v) => (
          <g key={v}>
            <line x1={plotLeft} y1={y(v)} x2={plotRight} y2={y(v)} stroke={v === 0 ? "var(--color-chart-baseline)" : "var(--color-chart-grid)"} strokeWidth={1} />
            <text x={plotLeft - 12} y={y(v) + 7} textAnchor="end" fontSize="20" fill="var(--color-text-secondary)">{v}</text>
          </g>
        ))}

        {PROFIT_DATA.map((d, i) => {
          const cx = plotLeft + slot * (i + 0.5);
          const bx = cx - barW / 2;
          const yOp = y(d.op);
          const yNon = y(d.op + d.non);
          const yTotal = y(d.total);
          const yOrd = y(d.ord);
          const brX = bx + barW + 7;

          return (
            <g key={d.m}>
              {/* 영업이익 (primary blue) */}
              <rect x={bx} y={yOp} width={barW} height={Y0 - yOp} fill={PRIMARY} rx={0} />
              <text x={cx} y={(yOp + Y0) / 2 - 4} textAnchor="middle" fontSize="24" fontWeight="700" fill="#fff">{d.op}</text>
              <text x={cx} y={(yOp + Y0) / 2 + 20} textAnchor="middle" fontSize="19" fill="rgba(255,255,255,0.8)">({d.opPct})</text>

              {/* 영업외수익 (navy) */}
              <rect x={bx} y={yNon} width={barW} height={yOp - yNon} fill={NAVY} />
              <text x={cx} y={(yNon + yOp) / 2 + 7} textAnchor="middle" fontSize="19" fontWeight="700" fill="#fff">+{d.non}</text>

              {/* 매출이익 (light, primary border, rounded top) */}
              <path d={`M ${bx} ${yTotal} a 8 8 0 0 1 8 -8 h ${barW - 16} a 8 8 0 0 1 8 8 v ${yNon - yTotal + 8} h -${barW} Z`} fill={LIGHT_BLUE} stroke={PRIMARY} strokeWidth="2" />
              <text x={cx} y={(yTotal + yNon) / 2 - 2} textAnchor="middle" fontSize="16" fontWeight="600" fill={PRIMARY}>건설: {d.con}</text>
              <text x={cx} y={(yTotal + yNon) / 2 + 18} textAnchor="middle" fontSize="16" fontWeight="600" fill={PRIMARY}>용역: {d.svc}</text>

              {/* Total above bar */}
              <text x={cx} y={yTotal - 36} textAnchor="middle" fontSize="26" fontWeight="700" fill="var(--color-text-primary)">{d.total}</text>
              <text x={cx} y={yTotal - 14} textAnchor="middle" fontSize="18" fontWeight="600" fill="var(--color-text-secondary)">({d.totalPct})</text>

              {/* 판관비 bracket (coral) */}
              <path d={`M ${brX} ${yTotal} h 7 V ${yNon} h -7`} fill="none" stroke={CORAL} strokeWidth="2.5" />
              <text x={brX + 13} y={(yTotal + yNon) / 2 - 4} fontSize="16" fontWeight="500" fill={CORAL}>판관비</text>
              <text x={brX + 13} y={(yTotal + yNon) / 2 + 18} fontSize="16" fontWeight="600" fill={CORAL}>{d.sga}({d.sgaPct})</text>

              {/* 경상이익 (navy dot + dashed leader + label) */}
              <line x1={bx - 26} y1={yOrd} x2={bx} y2={yOrd} stroke={NAVY} strokeWidth="2" strokeDasharray="4 4" />
              <circle cx={bx - 3} cy={yOrd} r="5" fill={NAVY} />
              <text x={bx - 2} y={yOrd + 22} textAnchor="end" fontSize="16" fontWeight="600" fill={NAVY}>{d.ord}({d.ordPct})</text>

              {/* Month label */}
              <text x={cx} y={Y0 + 32} textAnchor="middle" fontSize="22" fontWeight="600" fill="var(--color-text-primary)">{d.m}</text>
            </g>
          );
        })}
      </svg>
      </div>

      {/* Legend */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", marginTop: "16px", justifyContent: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: LIGHT_BLUE, border: `2px solid ${PRIMARY}`, flexShrink: 0, boxSizing: "border-box" }} />
          <span style={{ fontSize: "12px", color: "var(--color-text-secondary)", fontWeight: "500" }}>매출이익</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: PRIMARY, flexShrink: 0 }} />
          <span style={{ fontSize: "12px", color: "var(--color-text-secondary)", fontWeight: "500" }}>영업이익</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: NAVY, flexShrink: 0 }} />
          <span style={{ fontSize: "12px", color: "var(--color-text-secondary)", fontWeight: "500" }}>영업외수익</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: CORAL, flexShrink: 0 }} />
          <span style={{ fontSize: "12px", color: "var(--color-text-secondary)", fontWeight: "500" }}>판관비</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: NAVY, flexShrink: 0 }} />
          <span style={{ fontSize: "12px", color: "var(--color-text-secondary)", fontWeight: "500" }}>경상이익</span>
        </div>
      </div>
    </div>
  );
}
