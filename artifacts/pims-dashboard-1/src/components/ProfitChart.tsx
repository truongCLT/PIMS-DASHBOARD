import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useDashboardData, type ProfitRow } from "../lib/mgmtreportData";
import { useDashboardFilters } from "../lib/dashboardFilters";
import { chartTheme } from "../lib/chartTheme";
import { useTheme } from "../lib/theme";
import { DetailModal, DetailDataTable } from "./DetailModal";

const NAVY   = chartTheme.profitNavy;
const GREEN  = chartTheme.profitGreen;
const LIGHT  = chartTheme.profitLight;
const ORANGE = chartTheme.sgaOrange;

/* 대우 예시1 스타일 색상 (첨부 이미지) */
const DW_OP  = "#2b4a8b"; // 영업이익 (진한 남색)
const DW_SGA = "#a9c4f0"; // 판관비 (연한 파랑 캡)
const DW_NON = "#3f9e63"; // 영업외손익 (범례 녹색 점)
const DW_POS = "#2e9e5b";
const DW_NEG = "#cf4d4d";

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
  const { t } = useTranslation(["profitChart", "common"]);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const { derived, isError } = useDashboardData();
  const { unitIndex } = useDashboardFilters();
  const { theme } = useTheme();
  const daewoo = theme.charts?.profitVariant === "daewoo"; // 대우 예시1 스타일
  const compact     = unitIndex === 1;                 // 단위 기반 폰트 축소
  const data = derived?.profitData ?? [];

  // ≥6개 버킷이면 경상이익·판관비를 그래프에서 숨기고 툴팁에만 표시
  const isCondensed = data.length >= 6;

  // ≤5개 버킷이면 매출 실적 및 전망 차트와 비슷한 실제 크기로 텍스트 확대
  // (SVG viewBox 1000 → 카드 폭으로 축소 렌더링되므로 약 1.7배 보정)
  const scaleUp = daewoo ? 1.8 : data.length > 0 && !isCondensed ? 1.4 : 1;
  const fs = (n: number) => {
    const base = compact ? Math.max(9, Math.round(n * 0.6)) : n;
    return Math.round(base * scaleUp);
  };

  const plotLeft  = daewoo ? (compact ? 160 : 115) : compact ? 130 : 80;
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
      { label: t("common:operatingProfit"),          value: `${d.op.toLocaleString("ko-KR")} (${d.opPct})`,                   color: NAVY   },
      { label: t("profitChart:nonOperatingProfitLoss"), value: `${d.non >= 0 ? "+" : ""}${d.non.toLocaleString("ko-KR")}`,     color: GREEN  },
      { label: t("profitChart:ordinaryProfit"),      value: `${d.ord.toLocaleString("ko-KR")} (${d.ordPct})`,                  color: GREEN  },
      { label: t("common:sga"),                      value: `${d.sga} (${d.sgaPct})`,                                          color: ORANGE },
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
        <text x={tx + TW / 2} y={ty + 14} textAnchor="middle" fontSize={TF - 1} fontWeight="700" fill="#16294a">
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
      border: "1px solid #e2e9f3",
      borderRadius: "6px",
      padding: "10px 12px",
      height: "100%",
      boxSizing: "border-box",
      display: "flex",
      flexDirection: "column",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
          <span style={{ fontSize: "12px", fontWeight: "600", color: chartTheme.titleNavy }}>{t("profitChart:profitLossStatus")}</span>
          {derived && <span style={{ fontSize: "10px", color: "#7c8ba3" }}>{t("common:unit")}: {derived.unitLabel}</span>}
        </div>
        <button
          onClick={() => setDetailOpen(true)}
          style={{ fontSize: "11px", color: "#2f7cf6", background: "none", border: "none", cursor: "pointer" }}
        >
          {t("profitChart:viewDetails")}
        </button>
      </div>

      {/* 대우 예시1: 범례를 차트 위에 표시 */}
      {daewoo && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", margin: "4px 0 6px", alignItems: "center" }}>
          {[
            { c: DW_OP, l: t("common:operatingProfit"), round: false },
            { c: DW_SGA, l: t("common:sga"), round: false },
            { c: DW_NON, l: t("profitChart:nonOperatingProfitLoss"), round: true },
          ].map((it) => (
            <div key={it.l} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <div style={{ width: it.round ? "10px" : "13px", height: it.round ? "10px" : "11px", backgroundColor: it.c, borderRadius: it.round ? "50%" : "3px" }} />
              <span style={{ fontSize: "11px", color: "#333", fontWeight: 600 }}>{it.l}</span>
            </div>
          ))}
          <span style={{ fontSize: "11px", color: "#5a6c8e", fontWeight: 600 }}>{t("profitChart:barTotalGross")}</span>
        </div>
      )}

      {data.length === 0 ? (
        <div style={{ height: "200px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", color: "#888", textAlign: "center", padding: "0 20px" }}>
          {isError
            ? t("profitChart:dataLoadFailed")
            : derived?.profitNote ?? t("profitChart:dataLoading")}
        </div>
      ) : (
      <svg
        viewBox={daewoo ? "0 -90 1000 575" : "0 0 1000 445"}
        style={daewoo
          ? { width: "100%", flex: 1, minHeight: 0, display: "block" }
          : { width: "100%", display: "block" }}
        preserveAspectRatio={daewoo ? "xMidYMid meet" : undefined}
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

          if (daewoo) {
            /* ── 대우 예시1: 영업이익(진한색)+판관비(연한 캡) = 매출이익 · 영업외손익은 상단 고정 칩 행 ── */
            const chipText = `${d.non >= 0 ? "+" : ""}${d.non.toLocaleString("ko-KR")}`;
            const chipColor = d.non >= 0 ? DW_POS : DW_NEG;
            const chipBg = d.non >= 0 ? "#e7f5ec" : "#fdecec";
            const chipFs = fs(13);
            const chipH = chipFs + 12;
            const chipW = Math.max(56, chipText.length * chipFs * 0.62 + 22);
            const capTop = yGross;               // 막대 전체(매출이익) 상단
            const opTop = yv(d.op);
            return (
              <g key={d.m}>
                {/* 영업이익: 0 → op (음수면 0선 아래로) */}
                <rect x={bx} y={Math.min(yv(0), opTop)} width={barW} height={Math.abs(opTop - yv(0))} rx={7} fill={DW_OP} />
                {/* 판관비 캡: op → gross */}
                <rect x={bx} y={Math.min(capTop, opTop)} width={barW} height={Math.abs(opTop - capTop)} rx={7} fill={DW_SGA} />
                {/* 매출이익 값 + 비율 (막대 바로 위) */}
                <text x={cx} y={Math.min(capTop, opTop) - 34} textAnchor="middle" fontSize={fs(17)} fontWeight="700" fill="#1a2d4d">{gross.toLocaleString("ko-KR")}</text>
                <text x={cx} y={Math.min(capTop, opTop) - 10} textAnchor="middle" fontSize={fs(12)} fill="#64748b">{d.totalPct}</text>
                {/* 영업외손익 칩 — 상단 고정 행 */}
                <rect x={cx - chipW / 2} y={-80} width={chipW} height={chipH} rx={chipH / 2} fill={chipBg} />
                <text x={cx} y={-80 + chipH / 2} textAnchor="middle" dominantBaseline="central" fontSize={chipFs} fontWeight="700" fill={chipColor}>{chipText}</text>
                {/* 월 + 영업이익률 */}
                <text x={cx} y={Y0 + 34} textAnchor="middle" fontSize={fs(13)} fontWeight="600" fill="#333">{d.m}</text>
                <text x={cx} y={Y0 + 66} textAnchor="middle" fontSize={fs(13)} fontWeight="700" fill="#2e5bdb">{d.opPct}</text>
              </g>
            );
          }

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
                  <text x={brX + 13} y={(yGross + yOpTop) / 2 - 4}  fontSize={fs(14)} fill={ORANGE}>{t("common:sga")}</text>
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

        {/* 대우 예시1: 좌측 행 라벨 */}
        {daewoo && (
          <>
            <text x={plotLeft - 12} y={-62} textAnchor="end" fontSize={fs(10)} fill="#8a99b5">{t("profitChart:nonOperatingProfitLoss")}</text>
            <text x={plotLeft - 12} y={Y0 + 66} textAnchor="end" fontSize={fs(10)} fill="#8a99b5">{t("profitChart:operatingMarginRate")}</text>
          </>
        )}

        {/* 호버 오버레이 — 모든 바 위에 올려서 마우스 이벤트 독점 */}
        {data.map((_, i) => (
          <rect
            key={`hover-${i}`}
            x={plotLeft + slot * i}
            y={daewoo ? -90 : YTOP}
            width={slot}
            height={daewoo ? Y0 + 90 + 85 : Y0 - YTOP + 38}
            fill="transparent"
            onMouseEnter={() => setHoveredIdx(i)}
            style={{ cursor: "crosshair" }}
          />
        ))}

        {/* 툴팁 */}
        {hoveredIdx != null && renderTooltip(hoveredIdx)}
      </svg>
      )}

      {/* Legend (기존 스타일: 차트 아래) */}
      {!daewoo && (
      <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginTop: "6px", justifyContent: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <div style={{ width: "14px", height: "11px", backgroundColor: LIGHT, border: `1.5px solid ${NAVY}`, borderRadius: "2px" }} />
          <span style={{ fontSize: "11px", color: "#333" }}>{t("profitChart:sgaArea")}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <div style={{ width: "14px", height: "11px", backgroundColor: NAVY, borderRadius: "2px" }} />
          <span style={{ fontSize: "11px", color: "#333" }}>{t("common:operatingProfit")}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <div style={{ width: "14px", height: "11px", backgroundColor: GREEN, borderRadius: "2px" }} />
          <span style={{ fontSize: "11px", color: "#333" }}>{t("profitChart:nonOperatingProfitLoss")}</span>
        </div>
        {/* 6개 미만일 때만 판관비·경상이익 범례 표시 */}
        {!isCondensed && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <svg width="10" height="14" viewBox="0 0 10 14">
                <path d="M 2 1 h 6 V 13 h -6" fill="none" stroke={ORANGE} strokeWidth="2" />
              </svg>
              <span style={{ fontSize: "11px", color: "#333" }}>{t("common:sga")}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <svg width="24" height="8" viewBox="0 0 24 8">
                <line x1="4" y1="4" x2="20" y2="4" stroke={GREEN} strokeWidth="1.5" strokeDasharray="3 2" />
                <circle cx="4" cy="4" r="3" fill={GREEN} />
                <circle cx="20" cy="4" r="3" fill={GREEN} />
              </svg>
              <span style={{ fontSize: "11px", color: "#333" }}>{t("profitChart:ordinaryProfit")}</span>
            </div>
          </>
        )}
        {/* 6개 이상일 때 툴팁 안내 */}
        {isCondensed && (
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <span style={{ fontSize: "10px", color: "#888" }}>{t("profitChart:hoverHint")}</span>
          </div>
        )}
      </div>
      )}

      <DetailModal open={detailOpen} onClose={() => setDetailOpen(false)} title={t("profitChart:profitLossStatus")}>
        <DetailDataTable
          rowKey={(row) => String(row.m)}
          columns={[
            { key: "m", label: t("profitChart:month"), align: "left" },
            { key: "op", label: t("common:operatingProfit"), format: (_v, row) => `${row.op.toLocaleString()} (${row.opPct})` },
            { key: "non", label: t("profitChart:nonOperatingProfitLoss"), format: (_v, row) => `${row.non >= 0 ? "+" : ""}${row.non.toLocaleString()}` },
            { key: "ord", label: t("profitChart:ordinaryProfit"), format: (_v, row) => `${row.ord.toLocaleString()} (${row.ordPct})` },
            { key: "total", label: t("common:grossProfit"), format: (_v, row) => `${row.total.toLocaleString()} (${row.totalPct})` },
            { key: "sga", label: t("common:sga"), format: (_v, row) => `${row.sga} (${row.sgaPct})` },
          ]}
          rows={data}
        />
      </DetailModal>
    </div>
  );
}
