import React from "react";
import { useDashboardData } from "../lib/mgmtreportData";
import { chartTheme } from "../lib/chartTheme";

const NAVY = chartTheme.profitNavy;
const GREEN = chartTheme.profitGreen;
const LIGHT = chartTheme.profitLight;
const ORANGE = chartTheme.sgaOrange;

const Y0 = 400; // bottom of plot area
const YTOP = 20;

function niceStep(raw: number): number {
  const mag = Math.pow(10, Math.floor(Math.log10(Math.max(raw, 1))));
  const n = raw / mag;
  if (n <= 1) return mag;
  if (n <= 2) return 2 * mag;
  if (n <= 5) return 5 * mag;
  return 10 * mag;
}

export function ProfitChart() {
  const { derived, isError } = useDashboardData();
  const data = derived?.profitData ?? [];

  const plotLeft = 80;
  const plotRight = 950;
  const slot = data.length > 0 ? (plotRight - plotLeft) / data.length : 0;
  const barW = 58;

  /*
   * Consistent accounting identity:
   *   매출이익(gross) = 영업이익(op) + 판관비(sga)
   * Stack: navy = op (0..op), light box = sga (op..gross).
   * 영업외손익(non = 경상이익 - 영업이익②) is a separate green segment
   * attached above (positive) or below (negative) the gross top.
   * 경상이익(ord) is the dashed green marker line.
   */
  const rawMax = Math.max(
    1,
    ...data.map((d) => Math.max(d.total + Math.max(d.non, 0), d.ord, d.op, 0)),
  );
  const rawMin = Math.min(
    0,
    ...data.map((d) => Math.min(d.op, d.ord, d.total + Math.min(d.non, 0))),
  );
  const step = niceStep((rawMax - rawMin) / 4);
  const maxVal = step * Math.ceil(rawMax / step || 1);
  const minVal = rawMin < 0 ? -step * Math.ceil(-rawMin / step) : 0;
  const SCALE = (Y0 - YTOP) / (maxVal - minVal);
  const y = (v: number) => Y0 - (v - minVal) * SCALE;
  const gridVals: number[] = [];
  for (let v = minVal; v <= maxVal + 1e-9; v += step) gridVals.push(v);
  const yZero = y(0);

  return (
    <div style={{
      backgroundColor: "#fff",
      border: "1px solid #d0dce8",
      borderRadius: "6px",
      padding: "10px 12px",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
          <span style={{ fontSize: "12px", fontWeight: "600", color: chartTheme.titleNavy }}>손익현황</span>
          {derived && <span style={{ fontSize: "10px", color: "#5a6a7e" }}>단위: {derived.unitLabel}</span>}
        </div>
        <button style={{ fontSize: "11px", color: "#1e6fdd", background: "none", border: "none", cursor: "pointer" }}>
          상세보기
        </button>
      </div>

      {data.length === 0 ? (
        <div style={{ height: "200px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", color: "#888", textAlign: "center", padding: "0 20px" }}>
          {isError
            ? "데이터를 불러오지 못했습니다."
            : derived?.profitNote ?? "데이터 로딩 중…"}
        </div>
      ) : (
      <svg viewBox="0 0 1000 445" style={{ width: "100%", display: "block" }}>
        {/* Grid lines + y labels */}
        {gridVals.map((v) => (
          <g key={v}>
            <line x1={plotLeft} y1={y(v)} x2={plotRight} y2={y(v)} stroke={v === 0 ? "#9aa8ba" : "#e6edf5"} strokeWidth={v === 0 ? 1.5 : 1} />
            <text x={plotLeft - 12} y={y(v) + 7} textAnchor="end" fontSize="18" fill="#333">{v.toLocaleString("ko-KR")}</text>
          </g>
        ))}

        {data.map((d, i) => {
          const cx = plotLeft + slot * (i + 0.5);
          const bx = cx - barW / 2;
          const gross = d.total; // = op + sga
          const yOpTop = y(Math.max(d.op, 0));
          const yOpBot = y(Math.min(d.op, 0));
          const yGross = y(gross);
          const nonTop = gross + Math.max(d.non, 0);
          const nonBot = gross + Math.min(d.non, 0);
          const yOrd = y(d.ord);
          const brX = bx + barW + 7;
          const labelTopY = Math.min(y(nonTop), yGross, yOrd);

          return (
            <g key={d.m}>
              {/* 영업이익 (navy, from zero line) */}
              <rect x={bx} y={yOpTop} width={barW} height={Math.max(yOpBot - yOpTop, 0)} fill={NAVY} />
              {yOpBot - yOpTop > 44 && (
                <>
                  <text x={cx} y={(yOpTop + yOpBot) / 2 - 4} textAnchor="middle" fontSize="17" fontWeight="700" fill="#fff">{d.op.toLocaleString("ko-KR")}</text>
                  <text x={cx} y={(yOpTop + yOpBot) / 2 + 20} textAnchor="middle" fontSize="16" fill="#fff">({d.opPct})</text>
                </>
              )}

              {/* 판관비 영역 (light, navy border): op → gross */}
              <rect x={bx} y={Math.min(yGross, yOpTop)} width={barW} height={Math.abs(yOpTop - yGross)} fill={LIGHT} stroke={NAVY} strokeWidth="1.5" />

              {/* 영업외손익 (green segment above/below gross top) */}
              <rect x={bx} y={y(nonTop)} width={barW} height={Math.max(y(nonBot) - y(nonTop), 0)} fill={GREEN} />
              {Math.abs(y(nonBot) - y(nonTop)) > 22 && (
                <text x={cx} y={(y(nonTop) + y(nonBot)) / 2 + 7} textAnchor="middle" fontSize="16" fontWeight="700" fill="#fff">{d.non >= 0 ? "+" : ""}{d.non.toLocaleString("ko-KR")}</text>
              )}

              {/* 매출이익 label above bar */}
              <text x={cx} y={labelTopY - 32} textAnchor="middle" fontSize="21" fontWeight="700" fill={NAVY}>{gross.toLocaleString("ko-KR")}</text>
              <text x={cx} y={labelTopY - 10} textAnchor="middle" fontSize="17" fontWeight="600" fill={NAVY}>({d.totalPct})</text>

              {/* 판관비 bracket (orange): op → gross */}
              <path d={`M ${brX} ${yGross} h 7 V ${yOpTop} h -7`} fill="none" stroke={ORANGE} strokeWidth="2" />
              <text x={brX + 13} y={(yGross + yOpTop) / 2 - 4} fontSize="14" fill={ORANGE}>판관비</text>
              <text x={brX + 13} y={(yGross + yOpTop) / 2 + 13} fontSize="14" fill={ORANGE}>{d.sga}({d.sgaPct})</text>

              {/* 경상이익 (green dot + dashed leader + label) */}
              <line x1={bx - 26} y1={yOrd} x2={bx} y2={yOrd} stroke={GREEN} strokeWidth="1.5" strokeDasharray="4 3" />
              <circle cx={bx - 3} cy={yOrd} r="4" fill={GREEN} />
              <text x={bx - 2} y={yOrd + 19} textAnchor="end" fontSize="14" fill={GREEN}>{d.ord.toLocaleString("ko-KR")}({d.ordPct})</text>

              {/* Month label */}
              <text x={cx} y={Y0 + 32} textAnchor="middle" fontSize="17" fontWeight="600" fill="#333">{d.m}</text>
            </g>
          );
        })}

        {/* zero baseline on top of bars */}
        <line x1={plotLeft} y1={yZero} x2={plotRight} y2={yZero} stroke="#9aa8ba" strokeWidth={1.5} />
      </svg>
      )}

      {/* Legend */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginTop: "6px", justifyContent: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <div style={{ width: "14px", height: "11px", backgroundColor: LIGHT, border: `1.5px solid ${NAVY}`, borderRadius: "2px" }} />
          <span style={{ fontSize: "11px", color: "#333" }}>판관비 영역</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <div style={{ width: "14px", height: "11px", backgroundColor: NAVY, borderRadius: "2px" }} />
          <span style={{ fontSize: "11px", color: "#333" }}>영업이익</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <div style={{ width: "14px", height: "11px", backgroundColor: GREEN, borderRadius: "2px" }} />
          <span style={{ fontSize: "11px", color: "#333" }}>영업외손익</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <svg width="10" height="14" viewBox="0 0 10 14">
            <path d="M 2 1 h 6 V 13 h -6" fill="none" stroke={ORANGE} strokeWidth="2" />
          </svg>
          <span style={{ fontSize: "11px", color: "#333" }}>판관비</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <svg width="24" height="8" viewBox="0 0 24 8">
            <line x1="4" y1="4" x2="20" y2="4" stroke={GREEN} strokeWidth="1.5" strokeDasharray="3 2" />
            <circle cx="4" cy="4" r="3" fill={GREEN} />
            <circle cx="20" cy="4" r="3" fill={GREEN} />
          </svg>
          <span style={{ fontSize: "11px", color: "#333" }}>경상이익</span>
        </div>
      </div>
    </div>
  );
}
