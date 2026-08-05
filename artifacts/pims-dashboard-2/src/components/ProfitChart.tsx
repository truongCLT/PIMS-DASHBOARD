import React, { useState } from "react";
import { useDashboardData } from "../lib/mgmtreportData";
import { useDashboardFilters } from "../lib/dashboardFilters";
import { chartTheme } from "../lib/chartTheme";

const NAVY   = chartTheme.profitNavy;
const GREEN  = chartTheme.profitGreen;
const LIGHT  = chartTheme.profitLight;
const ORANGE = chartTheme.sgaOrange;

const Y0   = 400; // bottom of plot area
const YTOP = 20;

function niceStep(raw: number): number {
  const mag = Math.pow(10, Math.floor(Math.log10(Math.max(raw, 1))));
  const n = raw / mag;
  if (n <= 1) return mag;
  if (n <= 2) return 2 * mag;
  if (n <= 5) return 5 * mag;
  return 10 * mag;
}

/** 툴팁 한 줄 */
interface TipLine { label: string; value: string; color: string }

export function ProfitChart() {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const { derived, isError } = useDashboardData();
  const { unitIndex } = useDashboardFilters();
  const compact     = unitIndex === 1;                 // 단위 기반 폰트 축소
  const data = derived?.profitData ?? [];

  // ≥6개 버킷이면 경상이익·판관비를 그래프에서 숨기고 툴팁에만 표시
  const isCondensed = data.length >= 6;

  // ≤5개 버킷이면 매출 실적 및 전망 차트와 비슷한 실제 크기로 텍스트 확대
  // (SVG viewBox 1000 → 카드 폭으로 축소 렌더링되므로 약 1.7배 보정)
  const scaleUp = data.length > 0 && !isCondensed ? 1.4 : 1;
  const fs = (n: number) => {
    const base = compact ? Math.max(9, Math.round(n * 0.6)) : n;
    return Math.round(base * scaleUp);
  };

  const plotLeft  = compact ? 130 : 80;
  const plotRight = 950;
  const slot = data.length > 0 ? (plotRight - plotLeft) / data.length : 0;
  const barW = 58;

  const rawMax = Math.max(
    1,
    ...data.map((d) => Math.max(d.total + Math.max(d.non, 0), d.ord, d.op, 0)),
  );
  const rawMin = Math.min(
    0,
    ...data.map((d) => Math.min(d.op, d.ord, d.total + Math.min(d.non, 0))),
  );
  const step   = niceStep((rawMax - rawMin) / 4);
  const maxVal = step * Math.ceil(rawMax / step || 1);
  const minVal = rawMin < 0 ? -step * Math.ceil(-rawMin / step) : 0;
  const SCALE  = (Y0 - YTOP) / (maxVal - minVal);
  const yv = (v: number) => Y0 - (v - minVal) * SCALE;

  const gridVals: number[] = [];
  for (let v = minVal; v <= maxVal + 1e-9; v += step) gridVals.push(v);
  const yZero = yv(0);

  // ── 툴팁 렌더링 ──────────────────────────────────────────────────
  const TW = 230;   // SVG 단위 툴팁 너비
  const TH = 86;    // SVG 단위 툴팁 높이
  const TF = 15;    // 툴팁 내부 폰트 크기

  function renderTooltip(idx: number) {
    const d   = data[idx];
    const cx  = plotLeft + slot * (idx + 0.5);
    // 가장자리 클램핑
    const tx  = Math.max(plotLeft, Math.min(cx - TW / 2, plotRight - TW));
    const ty  = YTOP + 2;

    const lines: TipLine[] = [
      { label: "영업이익",   value: `${d.op.toLocaleString("ko-KR")} (${d.opPct})`,                   color: NAVY   },
      { label: "영업외손익", value: `${d.non >= 0 ? "+" : ""}${d.non.toLocaleString("ko-KR")}`,        color: GREEN  },
      { label: "경상이익",   value: `${d.ord.toLocaleString("ko-KR")} (${d.ordPct})`,                  color: GREEN  },
      { label: "판관비",     value: `${d.sga} (${d.sgaPct})`,                                           color: ORANGE },
    ];

    return (
      <g key="tooltip" style={{ pointerEvents: "none" }}>
        {/* 배경 */}
        <rect
          x={tx} y={ty} width={TW} height={TH}
          rx={5} ry={5}
          fill="white"
          stroke="#c0cede"
          strokeWidth="1.5"
          filter="url(#tip-shadow)"
        />
        {/* 월 헤더 */}
        <text x={tx + TW / 2} y={ty + 14} textAnchor="middle" fontSize={TF - 1} fontWeight="700" fill="#1a2d4d">
          {d.m}
        </text>
        {/* 항목 줄 */}
        {lines.map((l, i) => (
          <g key={l.label}>
            <text x={tx + 10}       y={ty + 30 + i * (TF + 3)} fontSize={TF} fill="#666">{l.label}</text>
            <text x={tx + TW - 10}  y={ty + 30 + i * (TF + 3)} fontSize={TF} fontWeight="600" fill={l.color} textAnchor="end">{l.value}</text>
          </g>
        ))}
      </g>
    );
  }

  return (
    <div style={{
      backgroundColor: "#fff",
      border: "1px solid #dde3ee",
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
      <svg
        viewBox="0 0 1000 445"
        style={{ width: "100%", display: "block" }}
        onMouseLeave={() => setHoveredIdx(null)}
      >
        <defs>
          <filter id="tip-shadow" x="-5%" y="-10%" width="115%" height="130%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#00000022" />
          </filter>
        </defs>

        {/* Grid lines + y labels */}
        {gridVals.map((v) => (
          <g key={v}>
            <line x1={plotLeft} y1={yv(v)} x2={plotRight} y2={yv(v)}
              stroke={v === 0 ? "#9aa8ba" : "#e6edf5"}
              strokeWidth={v === 0 ? 1.5 : 1}
            />
            <text x={plotLeft - 12} y={yv(v) + 7} textAnchor="end" fontSize={fs(18)} fill="#333">
              {v.toLocaleString("ko-KR")}
            </text>
          </g>
        ))}

        {/* Bars */}
        {data.map((d, i) => {
          const cx       = plotLeft + slot * (i + 0.5);
          const bx       = cx - barW / 2;
          const gross    = d.total;
          const yOpTop   = yv(Math.max(d.op, 0));
          const yOpBot   = yv(Math.min(d.op, 0));
          const yGross   = yv(gross);
          const nonTop   = gross + Math.max(d.non, 0);
          const nonBot   = gross + Math.min(d.non, 0);
          const yOrd     = yv(d.ord);
          const brX      = bx + barW + 7;
          const labelTopY = Math.min(yv(nonTop), yGross, yOrd);

          return (
            <g key={d.m}>
              {/* 영업이익 (navy, from zero) */}
              <rect x={bx} y={yOpTop} width={barW} height={Math.max(yOpBot - yOpTop, 0)} fill={NAVY} />
              {yOpBot - yOpTop > 44 && (
                <>
                  <text x={cx} y={(yOpTop + yOpBot) / 2 - 4}  textAnchor="middle" fontSize={fs(17)} fontWeight="700" fill="#fff">{d.op.toLocaleString("ko-KR")}</text>
                  <text x={cx} y={(yOpTop + yOpBot) / 2 + 20} textAnchor="middle" fontSize={fs(16)} fill="#fff">({d.opPct})</text>
                </>
              )}

              {/* 판관비 영역 (light): op → gross */}
              <rect
                x={bx} y={Math.min(yGross, yOpTop)}
                width={barW} height={Math.abs(yOpTop - yGross)}
                fill={LIGHT} stroke={NAVY} strokeWidth="1.5"
              />

              {/* 영업외손익 (green segment) */}
              <rect x={bx} y={yv(nonTop)} width={barW} height={Math.max(yv(nonBot) - yv(nonTop), 0)} fill={GREEN} />
              {Math.abs(yv(nonBot) - yv(nonTop)) > 22 && (
                <text x={cx} y={(yv(nonTop) + yv(nonBot)) / 2 + 7} textAnchor="middle" fontSize={fs(16)} fontWeight="700" fill="#fff">
                  {d.non >= 0 ? "+" : ""}{d.non.toLocaleString("ko-KR")}
                </text>
              )}

              {/* 매출이익 label above bar */}
              <text x={cx} y={labelTopY - 32} textAnchor="middle" fontSize={fs(21)} fontWeight="700" fill={NAVY}>{gross.toLocaleString("ko-KR")}</text>
              <text x={cx} y={labelTopY - 10} textAnchor="middle" fontSize={fs(17)} fontWeight="600" fill={NAVY}>({d.totalPct})</text>

              {/* 판관비 bracket — 6개 미만일 때만 표시 */}
              {!isCondensed && (
                <>
                  <path d={`M ${brX} ${yGross} h 7 V ${yOpTop} h -7`} fill="none" stroke={ORANGE} strokeWidth="2" />
                  <text x={brX + 13} y={(yGross + yOpTop) / 2 - 4}  fontSize={fs(14)} fill={ORANGE}>판관비</text>
                  <text x={brX + 13} y={(yGross + yOpTop) / 2 + 13} fontSize={fs(14)} fill={ORANGE}>{d.sga}({d.sgaPct})</text>
                </>
              )}

              {/* 경상이익 점/점선 — 6개 미만일 때만 표시 */}
              {!isCondensed && (
                <>
                  <line x1={bx - 26} y1={yOrd} x2={bx} y2={yOrd} stroke={GREEN} strokeWidth="1.5" strokeDasharray="4 3" />
                  <circle cx={bx - 3} cy={yOrd} r="4" fill={GREEN} />
                  <text x={bx - 2} y={yOrd + 19} textAnchor="end" fontSize={fs(14)} fill={GREEN}>{d.ord.toLocaleString("ko-KR")}({d.ordPct})</text>
                </>
              )}

              {/* Month label */}
              <text x={cx} y={Y0 + 32} textAnchor="middle" fontSize={fs(17)} fontWeight="600" fill="#333">{d.m}</text>
            </g>
          );
        })}

        {/* zero baseline */}
        <line x1={plotLeft} y1={yZero} x2={plotRight} y2={yZero} stroke="#9aa8ba" strokeWidth={1.5} />

        {/* 호버 오버레이 — 모든 바 위에 올려서 마우스 이벤트 독점 */}
        {data.map((_, i) => (
          <rect
            key={`hover-${i}`}
            x={plotLeft + slot * i}
            y={YTOP}
            width={slot}
            height={Y0 - YTOP + 38}
            fill="transparent"
            onMouseEnter={() => setHoveredIdx(i)}
            style={{ cursor: "crosshair" }}
          />
        ))}

        {/* 툴팁 */}
        {hoveredIdx != null && renderTooltip(hoveredIdx)}
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
        {/* 6개 미만일 때만 판관비·경상이익 범례 표시 */}
        {!isCondensed && (
          <>
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
          </>
        )}
        {/* 6개 이상일 때 툴팁 안내 */}
        {isCondensed && (
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <span style={{ fontSize: "10px", color: "#888" }}>※ 막대에 마우스를 올리면 경상이익·판관비 상세를 볼 수 있습니다</span>
          </div>
        )}
      </div>
    </div>
  );
}
