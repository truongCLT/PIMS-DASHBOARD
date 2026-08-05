import React from "react";

const data = [
  { m: "1월", op: 320, opPct: "9%", non: 40, total: 500, totalPct: "10%", sga: "-180", sgaPct: "6%", ord: 360, ordPct: "9%", con: "80%", svc: "20%" },
  { m: "2월", op: 350, opPct: "9%", non: 30, total: 540, totalPct: "11%", sga: "-190", sgaPct: "7%", ord: 380, ordPct: "9%", con: "81%", svc: "19%" },
  { m: "3월", op: 370, opPct: "10%", non: 25, total: 580, totalPct: "12%", sga: "-210", sgaPct: "8%", ord: 395, ordPct: "11%", con: "85%", svc: "15%" },
  { m: "4월", op: 390, opPct: "11%", non: 35, total: 620, totalPct: "12%", sga: "-230", sgaPct: "8%", ord: 425, ordPct: "12%", con: "82%", svc: "18%" },
  { m: "5월", op: 420, opPct: "12%", non: 30, total: 660, totalPct: "13%", sga: "-240", sgaPct: "9%", ord: 450, ordPct: "12%", con: "78%", svc: "22%" },
  { m: "6월", op: 450, opPct: "13%", non: 40, total: 700, totalPct: "14%", sga: "-250", sgaPct: "10%", ord: 490, ordPct: "13%", con: "80%", svc: "20%" },
];

const NAVY   = "#4472ca";   // Analytics Clean mid-blue
const GREEN  = "#5b9bd5";   // lighter analytic blue
const LIGHT  = "#eef4fb";
const ORANGE = "#e07b28";

const Y0 = 400;
const YTOP = 20;
const SCALE = (Y0 - YTOP) / 800;
const y = (v: number) => Y0 - v * SCALE;

export function ProfitChart() {
  const plotLeft = 80;
  const plotRight = 950;
  const slot = (plotRight - plotLeft) / data.length;
  const barW = 58;

  return (
    <div style={{
      backgroundColor: "#fff",
      border: "1px solid #dde3ee",
      borderRadius: "6px",
      padding: "10px 12px",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
        <span style={{ fontSize: "12px", fontWeight: "600", color: "#1e2a3b" }}>손익현황</span>
        <button style={{ fontSize: "11px", color: "#4472ca", background: "none", border: "none", cursor: "pointer" }}>
          상세보기
        </button>
      </div>

      <svg viewBox="0 0 1000 445" style={{ width: "100%", display: "block" }}>
        {/* Grid lines + y labels */}
        {[0, 200, 400, 600, 800].map((v) => (
          <g key={v}>
            <line x1={plotLeft} y1={y(v)} x2={plotRight} y2={y(v)} stroke={v === 0 ? "#9aa8ba" : "#e6edf5"} strokeWidth={v === 0 ? 1.5 : 1} />
            <text x={plotLeft - 12} y={y(v) + 7} textAnchor="end" fontSize="22" fill="#333">{v}</text>
          </g>
        ))}

        {data.map((d, i) => {
          const cx = plotLeft + slot * (i + 0.5);
          const bx = cx - barW / 2;
          const yOp = y(d.op);
          const yNon = y(d.op + d.non);
          const yTotal = y(d.total);
          const yOrd = y(d.ord);
          const brX = bx + barW + 7;

          return (
            <g key={d.m}>
              {/* 영업이익 (navy) */}
              <rect x={bx} y={yOp} width={barW} height={Y0 - yOp} fill={NAVY} />
              <text x={cx} y={(yOp + Y0) / 2 - 4} textAnchor="middle" fontSize="24" fontWeight="700" fill="#fff">{d.op}</text>
              <text x={cx} y={(yOp + Y0) / 2 + 20} textAnchor="middle" fontSize="19" fill="#fff">({d.opPct})</text>

              {/* 영업외수익 (green) */}
              <rect x={bx} y={yNon} width={barW} height={yOp - yNon} fill={GREEN} />
              <text x={cx} y={(yNon + yOp) / 2 + 7} textAnchor="middle" fontSize="19" fontWeight="700" fill="#fff">+{d.non}</text>

              {/* 매출이익 (light, navy border) */}
              <rect x={bx} y={yTotal} width={barW} height={yNon - yTotal} fill={LIGHT} stroke={NAVY} strokeWidth="1.5" />
              <text x={cx} y={(yTotal + yNon) / 2 - 2} textAnchor="middle" fontSize="14" fill="#1a2d4d">건설: {d.con}</text>
              <text x={cx} y={(yTotal + yNon) / 2 + 15} textAnchor="middle" fontSize="14" fill="#1a2d4d">용역: {d.svc}</text>

              {/* Total above bar */}
              <text x={cx} y={yTotal - 32} textAnchor="middle" fontSize="26" fontWeight="700" fill={NAVY}>{d.total}</text>
              <text x={cx} y={yTotal - 10} textAnchor="middle" fontSize="20" fontWeight="600" fill={NAVY}>({d.totalPct})</text>

              {/* 판관비 bracket (orange) */}
              <path d={`M ${brX} ${yTotal} h 7 V ${yNon} h -7`} fill="none" stroke={ORANGE} strokeWidth="2" />
              <text x={brX + 13} y={(yTotal + yNon) / 2 - 12} fontSize="15" fill={ORANGE}>판관비</text>
              <text x={brX + 13} y={(yTotal + yNon) / 2 + 5} fontSize="15" fill={ORANGE}>{d.sga}</text>
              <text x={brX + 13} y={(yTotal + yNon) / 2 + 22} fontSize="15" fill={ORANGE}>({d.sgaPct})</text>

              {/* 경상이익 (green dot + dashed leader + label) */}
              <line x1={bx - 26} y1={yOrd} x2={bx} y2={yOrd} stroke={GREEN} strokeWidth="1.5" strokeDasharray="4 3" />
              <circle cx={bx - 3} cy={yOrd} r="4" fill={GREEN} />
              <text x={bx - 30} y={yOrd - 2} textAnchor="end" fontSize="15" fill={GREEN}>{d.ord}</text>
              <text x={bx - 30} y={yOrd + 14} textAnchor="end" fontSize="15" fill={GREEN}>({d.ordPct})</text>

              {/* Month label */}
              <text x={cx} y={Y0 + 32} textAnchor="middle" fontSize="24" fontWeight="600" fill="#333">{d.m}</text>
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginTop: "6px", justifyContent: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <div style={{ width: "12px", height: "10px", backgroundColor: LIGHT, border: `1.5px solid ${NAVY}`, borderRadius: "2px" }} />
          <span style={{ fontSize: "9px", color: "#333" }}>매출이익</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <div style={{ width: "12px", height: "10px", backgroundColor: NAVY, borderRadius: "2px" }} />
          <span style={{ fontSize: "9px", color: "#333" }}>영업이익</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <div style={{ width: "12px", height: "10px", backgroundColor: GREEN, borderRadius: "2px" }} />
          <span style={{ fontSize: "9px", color: "#333" }}>영업외수익</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <svg width="10" height="14" viewBox="0 0 10 14">
            <path d="M 2 1 h 6 V 13 h -6" fill="none" stroke={ORANGE} strokeWidth="2" />
          </svg>
          <span style={{ fontSize: "9px", color: "#333" }}>판관비</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <svg width="24" height="8" viewBox="0 0 24 8">
            <line x1="4" y1="4" x2="20" y2="4" stroke={GREEN} strokeWidth="1.5" strokeDasharray="3 2" />
            <circle cx="4" cy="4" r="3" fill={GREEN} />
            <circle cx="20" cy="4" r="3" fill={GREEN} />
          </svg>
          <span style={{ fontSize: "9px", color: "#333" }}>경상이익</span>
        </div>
      </div>
    </div>
  );
}
