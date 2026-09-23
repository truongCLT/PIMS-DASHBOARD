import React, { useState, useRef, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  useListMgmtreportProjects,
  getListMgmtreportProjectsQueryKey,
} from "@workspace/api-client-react";
import { useDashboardData, type ProfitRow, REPORT_YEAR } from "../lib/mgmtreportData";
import { useDashboardFilters, makeConverter } from "../lib/dashboardFilters";
import { classifyMrProject, resolveProjectBusinessType } from "../data/projects";
import { filterProfitProjects } from "../lib/mgmtreportReconciliation";
import { chartTheme, chartTypography } from "../lib/chartTheme";
import { INK_BODY, INK_MUTED, POINT_BLUE, CARD_BORDER, emptyNote, ACHIEVE_RED } from "../lib/uiTokens";
import { useTheme } from "../lib/theme";
import { ChartTooltipPanel } from "@workspace/aqua-glass/components/ui/chart";
import {
  Empty,
  EmptyDescription,
} from "@workspace/aqua-glass/components/ui/empty";
import { DetailModal, DetailDataTable } from "./DetailModal";

/** "N월" → 0-based 월 인덱스. 월 형식 아니면 null. */
function extractMonthIdx(label: string): number | null {
  const m = /^(\d+)월$/.exec(label);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  return n >= 1 && n <= 12 ? n - 1 : null;
}

const NAVY   = chartTheme.profitNavy;
const GREEN  = chartTheme.profitGreen;
const LIGHT  = chartTheme.profitLight;
const ORANGE = chartTheme.sgaOrange;

/* 대우 예시1 스타일 색상 (첨부 이미지) */
const DW_OP  = chartTheme.dwOp;
const DW_SGA = chartTheme.dwSga;

const Y0   = 414; // 매출 차트의 하단 플롯 기준선에 맞춤
const YTOP = 40;  // 매출 차트의 상단 그리드 시작 위치에 맞춤

function niceStep(raw: number): number {
  const mag = Math.pow(10, Math.floor(Math.log10(Math.max(raw, 1))));
  const n = raw / mag;
  if (n <= 1) return mag;
  if (n <= 2) return 2 * mag;
  if (n <= 5) return 5 * mag;
  return 10 * mag;
}

export function ProfitChart() {
  const { t } = useTranslation(["profitChart", "common"]);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [drillRow, setDrillRow] = useState<ProfitRow | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const chartAreaRef = useRef<HTMLDivElement>(null);
  const [cardContentWidth, setCardContentWidth] = useState(600);
  const [chartAreaSize, setChartAreaSize] = useState({ width: 600, height: 315 });

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setCardContentWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { derived, isError } = useDashboardData();
  const filters = useDashboardFilters();
  const { unitIndex, currency, fxRates, project, division, statusFilter } = filters;
  const convert = makeConverter(currency, unitIndex, fxRates);

  /* ── 경영보고 프로젝트별 월 매출/원가 ── */
  const projectSelected = project !== "All";
  const divisionSelected = !projectSelected && division != null;
  const projectsQuery = useListMgmtreportProjects(
    { year: REPORT_YEAR },
    {
      query: {
        queryKey: getListMgmtreportProjectsQueryKey({ year: REPORT_YEAR }),
      },
    },
  );

  /* ── 드릴다운 rows 계산 ── */
  const drillMonthIdx = drillRow ? extractMonthIdx(drillRow.m) : null;
  const drillSiteRows = useMemo(() => {
    if (drillMonthIdx == null) return [];
    const projects = filterProfitProjects(
      projectsQuery.data?.projects ?? [],
      projectSelected
        ? { projectName: project }
        : {
            division: divisionSelected ? division : null,
            status: divisionSelected ? statusFilter : null,
          },
      classifyMrProject,
    );

    return projects
      .map((p) => {
        const rev = convert(p.revenueActual[drillMonthIdx] ?? 0);
        const cogs = convert(p.cogsActual[drillMonthIdx] ?? 0);
        const gross = rev - cogs;
        return {
          name: p.name,
          category: p.companyLabel ?? "-",
          bizType: resolveProjectBusinessType(p.name, p.businessType),
          revenue: Math.round(rev),
          cogs: Math.round(cogs),
          gross: Math.round(gross),
        };
      })
      .filter((r) => r.revenue !== 0 || r.cogs !== 0)
      .sort((a, b) => b.gross - a.gross);
  }, [
    drillMonthIdx,
    projectsQuery.data,
    projectSelected,
    project,
    divisionSelected,
    division,
    statusFilter,
    convert,
  ]);

  const drillGrossTotal = drillSiteRows.reduce((acc, r) => acc + r.gross, 0);
  const drillRevenueTotal = drillSiteRows.reduce((acc, r) => acc + r.revenue, 0);
  const drillCogsTotal = drillSiteRows.reduce((acc, r) => acc + r.cogs, 0);
  const drillGrossDifference = drillRow == null ? 0 : drillGrossTotal - drillRow.total;
  const drillRowsWithShare = drillSiteRows.map((r) => ({
    ...r,
    share: drillGrossTotal !== 0 ? `${Number(((r.gross / drillGrossTotal) * 100).toFixed(1))}%` : "-",
  }));

  const drillIsLoading = projectsQuery.isLoading;
  const { theme } = useTheme();
  const daewoo = theme.charts?.profitVariant === "daewoo"; // 대우 예시1 스타일
  const compact     = unitIndex === 1;                 // 단위 기반 폰트 축소
  const data = derived?.profitData ?? [];

  useEffect(() => {
    const el = chartAreaRef.current;
    if (!el || data.length === 0) return;
    const updateSize = (width: number, height: number) => {
      if (width > 0 && height > 0) setChartAreaSize({ width, height });
    };
    updateSize(el.clientWidth, el.clientHeight);
    const ro = new ResizeObserver(([entry]) => {
      updateSize(entry.contentRect.width, entry.contentRect.height);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [data.length, daewoo]);

  // ≥6개 버킷이면 경상이익·판관비를 그래프에서 숨기고 툴팁에만 표시
  const isCondensed = data.length >= 6;

  // ≤5개 버킷이면 매출 실적 및 전망 차트와 비슷한 실제 크기로 텍스트 확대
  // (SVG viewBox 1000 → 카드 폭으로 축소 렌더링되므로 약 1.7배 보정)
  const scaleUp = daewoo ? 1.8 : 1;
  const fs = (n: number) => {
    const base = compact ? Math.max(9, Math.round(n * 0.6)) : n;
    const scaled = Math.round(base * scaleUp);
    return daewoo ? scaled : Math.min(scaled, 14);
  };

  /*
   * 대우형 손익 차트는 SVG를 카드 높이에 맞춰 균일 확대한다.
   * 확대 후 보이는 가로 범위 안에 12개월을 다시 배치해 좌우 잘림을 방지한다.
   */
  const daewooScale = Math.max(
    chartAreaSize.width / 1000,
    chartAreaSize.height / 530,
  );
  const renderScale = daewoo ? daewooScale : cardContentWidth / 1000;
  const _inv = 1 / Math.max(renderScale, 0.001);
  const axisFs  = chartTypography.axis * _inv;
  const monthFs = chartTypography.month * _inv;
  const valueFs = chartTypography.value * _inv;
  const rateFs  = chartTypography.rate * _inv;

  const visibleSvgWidth = daewoo
    ? chartAreaSize.width / Math.max(daewooScale, 0.001)
    : 1000;
  const visibleLeft = (1000 - visibleSvgWidth) / 2;
  const plotLeft = daewoo
    ? visibleLeft + (compact ? 90 : 70)
    : compact ? 130 : 80;
  const plotRight = daewoo ? 1000 - visibleLeft - 24 : 950;
  const slot = data.length > 0 ? (plotRight - plotLeft) / data.length : 0;
  const barW = daewoo ? Math.min(42, Math.max(18, slot * 0.58)) : 58;

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

  const hoveredRow = hoveredIdx == null ? null : data[hoveredIdx];
  const tooltipWidth = Math.max(0, Math.min(240, cardContentWidth - 16));
  const tooltipCenter =
    hoveredIdx == null || data.length === 0
      ? 0
      : cardContentWidth * ((hoveredIdx + 0.5) / data.length);
  const tooltipLeft = Math.max(
    8,
    Math.min(tooltipCenter - tooltipWidth / 2, cardContentWidth - tooltipWidth - 8),
  );

  return (
    <div ref={cardRef} style={{
      backgroundColor: "#fff",
      border: `1px solid ${CARD_BORDER}`,
      borderRadius: "6px",
      padding: "10px 12px",
      height: "100%",
      boxSizing: "border-box",
      display: "flex",
      flexDirection: "column",
      fontFamily: chartTypography.fontFamily,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
          <span style={{ fontSize: `${chartTypography.title}px`, fontWeight: "600", color: chartTheme.titleNavy }}>{t("profitChart:profitLossStatus")}</span>
          {derived && <span style={{ fontSize: `${chartTypography.unit}px`, color: INK_MUTED }}>{t("common:unit")}: {derived.unitLabel}</span>}
        </div>
        <button
          onClick={() => setDetailOpen(true)}
          style={{ fontSize: `${chartTypography.action}px`, color: POINT_BLUE, background: "none", border: "none", cursor: "pointer" }}
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
          ].map((it) => (
            <div key={it.l} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <div style={{ width: it.round ? "10px" : "13px", height: it.round ? "10px" : "11px", backgroundColor: it.c, borderRadius: it.round ? "50%" : "3px" }} />
              <span style={{ fontSize: `${chartTypography.legend}px`, color: INK_BODY, fontWeight: 600 }}>{it.l}</span>
            </div>
          ))}
          <span style={{ fontSize: `${chartTypography.legend}px`, color: chartTheme.subLabel, fontWeight: 600 }}>{t("profitChart:barTotalGross")}</span>
        </div>
      )}

      {data.length === 0 ? (
        <Empty className="min-h-40 rounded-none p-5">
          <EmptyDescription className="text-xs">
            {isError
              ? t("profitChart:dataLoadFailed")
              : derived?.profitNote ?? t("profitChart:dataLoading")}
          </EmptyDescription>
        </Empty>
      ) : (
      <div ref={chartAreaRef} style={{ position: "relative", width: "100%", flex: daewoo ? 1 : undefined, minHeight: daewoo ? 0 : undefined }}>
      <svg
        viewBox={daewoo ? "0 0 1000 530" : "0 0 1000 445"}
        style={daewoo
          ? { width: "100%", height: "100%", minHeight: 0, display: "block", fontFamily: chartTypography.fontFamily }
          : { width: "100%", display: "block", fontFamily: chartTypography.fontFamily }}
        preserveAspectRatio={daewoo ? "xMidYMid slice" : undefined}
        onMouseLeave={() => setHoveredIdx(null)}
      >
        {/* Grid lines + y labels */}
        {gridVals.map((v) => (
          <g key={v}>
            <line x1={plotLeft} y1={yv(v)} x2={plotRight} y2={yv(v)}
              stroke={v === 0 ? chartTheme.refLine : chartTheme.gridLine}
              strokeWidth={v === 0 ? 1.5 : 1}
              strokeDasharray={v === 0 ? undefined : "3 3"}
            />
            <text x={plotLeft - 12} y={yv(v) + 7} textAnchor="end" fontSize={axisFs} fill={chartTheme.axisText}>
              {v.toLocaleString("ko-KR", { minimumFractionDigits: 0, maximumFractionDigits: 1 })}
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
          const forecastFill = d.isForecast ? "#fff" : undefined;
          const forecastDash = d.isForecast ? "5 3" : undefined;

          if (daewoo) {
            /* ── 대우 예시1: 영업이익(진한색)+판관비(연한 캡) = 매출이익 ── */
            const chipText = d.op.toLocaleString("ko-KR", { minimumFractionDigits: 0, maximumFractionDigits: 1 });
            const chipColor = DW_OP;
            const chipBg = chartTheme.opRateBg;
            const chipFs = valueFs;
            const chipH = chipFs + 12;
            const chipW = Math.max(56, chipText.length * chipFs * 0.62 + 22);
            const capTop = yGross;               // 막대 전체(매출이익) 상단
            const opTop = yv(d.op);
            return (
              <g key={d.m}>
                {/* 영업이익: 0 → op (음수면 0선 아래로) */}
                <rect
                  x={bx}
                  y={Math.min(yv(0), opTop)}
                  width={barW}
                  height={Math.abs(opTop - yv(0))}
                  rx={7}
                  fill={forecastFill ?? DW_OP}
                  stroke={d.isForecast ? DW_OP : undefined}
                  strokeWidth={d.isForecast ? 1.8 : 0}
                  strokeDasharray={forecastDash}
                />
                {/* 판관비 캡: op → gross */}
                <rect
                  x={bx}
                  y={Math.min(capTop, opTop)}
                  width={barW}
                  height={Math.abs(opTop - capTop)}
                  rx={7}
                  fill={forecastFill ?? DW_SGA}
                  stroke={d.isForecast ? DW_SGA : undefined}
                  strokeWidth={d.isForecast ? 1.8 : 0}
                  strokeDasharray={forecastDash}
                />
                {/* 매출이익 값 + 비율 (막대 바로 위) */}
                <text x={cx} y={Math.min(capTop, opTop) - 34} textAnchor="middle" fontSize={valueFs} fontWeight="700" fill={chartTheme.valueFill}>{gross.toLocaleString("ko-KR", { minimumFractionDigits: 0, maximumFractionDigits: 1 })}</text>
                <text x={cx} y={Math.min(capTop, opTop) - 10} textAnchor="middle" fontSize={rateFs} fontWeight="700" fill={chartTheme.axisSmall}>{d.totalPct}</text>
                {/* 월 라벨 */}
                <text x={cx} y={Y0 + 34} textAnchor="middle" fontSize={monthFs} fontWeight="600" fill={chartTheme.axisText}>{d.m}</text>
                {/* 영업이익 칩 — 월 라벨 하단 */}
                <rect x={cx - chipW / 2} y={Y0 + 46} width={chipW} height={chipH} rx={chipH / 2} fill={chipBg} />
                <text x={cx} y={Y0 + 46 + chipH / 2} textAnchor="middle" dominantBaseline="central" fontSize={chipFs} fontWeight="700" fill={chipColor}>{chipText}</text>
                {/* 영업이익률 칩 — 영업이익 칩 하단 */}
                {(() => {
                  const opFs = rateFs;
                  const opH  = opFs + 10;
                  const opW  = Math.max(48, d.opPct.length * opFs * 0.62 + 16);
                  const opY  = Y0 + 46 + chipH + 6;
                  return (
                    <>
                      <rect x={cx - opW / 2} y={opY} width={opW} height={opH} rx={opH / 2} fill={chartTheme.opRateBg} />
                      <text x={cx} y={opY + opH / 2} textAnchor="middle" dominantBaseline="central" fontSize={opFs} fontWeight="700" fill={DW_OP}>{d.opPct}</text>
                    </>
                  );
                })()}
              </g>
            );
          }

          return (
            <g key={d.m}>
              {/* 영업이익 (navy, from zero) */}
              <rect
                x={bx}
                y={yOpTop}
                width={barW}
                height={Math.max(yOpBot - yOpTop, 0)}
                fill={forecastFill ?? NAVY}
                stroke={d.isForecast ? NAVY : undefined}
                strokeWidth={d.isForecast ? 1.8 : 0}
                strokeDasharray={forecastDash}
              />
              {yOpBot - yOpTop > 44 && (
                <text x={cx} y={(yOpTop + yOpBot) / 2 + 7} textAnchor="middle" fontSize={valueFs} fontWeight="700" fill="#fff">{d.op.toLocaleString("ko-KR", { minimumFractionDigits: 0, maximumFractionDigits: 1 })}</text>
              )}

              {/* 판관비 영역 (light): op → gross */}
              <rect
                x={bx} y={Math.min(yGross, yOpTop)}
                width={barW} height={Math.abs(yOpTop - yGross)}
                fill={forecastFill ?? LIGHT}
                stroke={NAVY}
                strokeWidth="1.5"
                strokeDasharray={forecastDash}
              />

              {/* 영업외손익 (green segment) */}
              <rect
                x={bx}
                y={yv(nonTop)}
                width={barW}
                height={Math.max(yv(nonBot) - yv(nonTop), 0)}
                fill={forecastFill ?? GREEN}
                stroke={d.isForecast ? GREEN : undefined}
                strokeWidth={d.isForecast ? 1.8 : 0}
                strokeDasharray={forecastDash}
              />
              {Math.abs(yv(nonBot) - yv(nonTop)) > 22 && (
                <text x={cx} y={(yv(nonTop) + yv(nonBot)) / 2 + 7} textAnchor="middle" fontSize={valueFs} fontWeight="700" fill="#fff">
                  {d.non >= 0 ? "+" : ""}{d.non.toLocaleString("ko-KR", { minimumFractionDigits: 0, maximumFractionDigits: 1 })}
                </text>
              )}

              {/* 매출이익 label above bar */}
              <text x={cx} y={labelTopY - 32} textAnchor="middle" fontSize={valueFs} fontWeight="700" fill={NAVY}>{gross.toLocaleString("ko-KR", { minimumFractionDigits: 0, maximumFractionDigits: 1 })}</text>
              <text x={cx} y={labelTopY - 10} textAnchor="middle" fontSize={rateFs} fontWeight="700" fill={NAVY}>({d.totalPct})</text>

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
                  <text x={bx - 2} y={yOrd + 19} textAnchor="end" fontSize={fs(14)} fill={GREEN}>{d.ord.toLocaleString("ko-KR", { minimumFractionDigits: 0, maximumFractionDigits: 1 })}({d.ordPct})</text>
                </>
              )}

              {/* Month label */}
              <text x={cx} y={Y0 + 32} textAnchor="middle" fontSize={monthFs} fontWeight="600" fill={chartTheme.axisText}>{d.m}</text>
            </g>
          );
        })}

        {/* zero baseline */}
        <line x1={plotLeft} y1={yZero} x2={plotRight} y2={yZero} stroke={chartTheme.refLine} strokeWidth={1.5} />

        {/* 영업이익·영업이익률 라벨 — 맨 왼쪽에 한 번씩만 */}
        {daewoo && data.length > 0 && (() => {
          const chipFs = valueFs;
          const chipH  = chipFs + 12;
          const opFs   = rateFs;
          const opH    = opFs + 10;
          const opY    = Y0 + 46 + chipH + 6;
          return (
            <>
              <text x={plotLeft - 8} y={Y0 + 46 + chipH / 2} textAnchor="end" dominantBaseline="central" fontSize={axisFs} fill={chartTheme.axisSmall}>
                {t("common:operatingProfit")}
              </text>
              <text x={plotLeft - 8} y={opY + opH / 2} textAnchor="end" dominantBaseline="central" fontSize={axisFs} fill={chartTheme.axisSmall}>
                {t("profitChart:operatingMarginRate")}
              </text>
            </>
          );
        })()}


        {/* 호버 오버레이 — 모든 바 위에 올려서 마우스 이벤트 독점 */}
        {data.map((_, i) => (
          <rect
            key={`hover-${i}`}
            x={plotLeft + slot * i}
            y={daewoo ? YTOP : YTOP}
            width={slot}
            height={daewoo ? Y0 - YTOP + 110 : Y0 - YTOP + 38}
            fill="transparent"
            onMouseEnter={() => setHoveredIdx(i)}
            style={{ cursor: "crosshair" }}
          />
        ))}

      </svg>
      {hoveredRow && (
        <ChartTooltipPanel
          title={`${hoveredRow.m} · ${hoveredRow.isForecast ? t("profitChart:forecast") : t("profitChart:actual")}`}
          lines={[
            { label: t("common:operatingProfit"), value: hoveredRow.op.toLocaleString("ko-KR", { minimumFractionDigits: 0, maximumFractionDigits: 1 }), color: NAVY },
            { label: t("profitChart:ordinaryProfit"), value: `${hoveredRow.ord.toLocaleString("ko-KR", { minimumFractionDigits: 0, maximumFractionDigits: 1 })} (${hoveredRow.ordPct})`, color: GREEN },
            { label: t("common:sga"), value: `${hoveredRow.sga} (${hoveredRow.sgaPct})`, color: ORANGE },
            ...(!daewoo
              ? [{
                  label: t("profitChart:nonOperatingProfitLoss"),
                  value: `${hoveredRow.non >= 0 ? "+" : ""}${hoveredRow.non.toLocaleString("ko-KR", { minimumFractionDigits: 0, maximumFractionDigits: 1 })}`,
                  color: GREEN,
                }]
              : []),
          ]}
          style={{
            position: "absolute",
            top: "8px",
            left: `${tooltipLeft}px`,
            zIndex: 2,
            width: `${tooltipWidth}px`,
            maxWidth: "calc(100% - 16px)",
          }}
        />
      )}
      </div>
      )}

      {/* Legend (기존 스타일: 차트 아래) */}
      {!daewoo && (
      <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginTop: "6px", justifyContent: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <div style={{ width: "14px", height: "11px", backgroundColor: NAVY, borderRadius: "2px" }} />
          <span style={{ fontSize: `${chartTypography.legend}px`, color: INK_BODY }}>{t("profitChart:actual")}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <div style={{ width: "14px", height: "11px", backgroundColor: "#fff", border: `1.5px dashed ${NAVY}`, borderRadius: "2px" }} />
          <span style={{ fontSize: `${chartTypography.legend}px`, color: INK_BODY }}>{t("profitChart:forecast")}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <div style={{ width: "14px", height: "11px", backgroundColor: LIGHT, border: `1.5px solid ${NAVY}`, borderRadius: "2px" }} />
          <span style={{ fontSize: `${chartTypography.legend}px`, color: INK_BODY }}>{t("profitChart:sgaArea")}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <div style={{ width: "14px", height: "11px", backgroundColor: NAVY, borderRadius: "2px" }} />
          <span style={{ fontSize: `${chartTypography.legend}px`, color: INK_BODY }}>{t("common:operatingProfit")}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <div style={{ width: "14px", height: "11px", backgroundColor: GREEN, borderRadius: "2px" }} />
          <span style={{ fontSize: `${chartTypography.legend}px`, color: INK_BODY }}>{t("profitChart:nonOperatingProfitLoss")}</span>
        </div>
        {/* 6개 미만일 때만 판관비·경상이익 범례 표시 */}
        {!isCondensed && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <svg width="10" height="14" viewBox="0 0 10 14">
                <path d="M 2 1 h 6 V 13 h -6" fill="none" stroke={ORANGE} strokeWidth="2" />
              </svg>
              <span style={{ fontSize: "11px", color: INK_BODY }}>{t("common:sga")}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <svg width="24" height="8" viewBox="0 0 24 8">
                <line x1="4" y1="4" x2="20" y2="4" stroke={GREEN} strokeWidth="1.5" strokeDasharray="3 2" />
                <circle cx="4" cy="4" r="3" fill={GREEN} />
                <circle cx="20" cy="4" r="3" fill={GREEN} />
              </svg>
              <span style={{ fontSize: "11px", color: INK_BODY }}>{t("profitChart:ordinaryProfit")}</span>
            </div>
          </>
        )}
        {/* 6개 이상일 때 툴팁 안내 */}
        {isCondensed && (
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <span style={{ fontSize: "10px", color: INK_MUTED }}>{t("profitChart:hoverHint")}</span>
          </div>
        )}
      </div>
      )}

      {/* 스코프 뷰: 판관비·영업이익 미제공 안내 — 테마 무관하게 항상 표시 */}
      {derived?.profitNote && data.length > 0 && (
        <div style={{ fontSize: "10px", color: INK_MUTED, textAlign: "center", padding: "2px 0 2px" }}>
          {derived.profitNote}
        </div>
      )}

      {/* ── 1차 손익 상세 모달 ── */}
      <DetailModal
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        title={t("profitChart:profitLossStatus")}
        subtitle={derived?.unitLabel}
      >
        <DetailDataTable
          rowKey={(row) => String(row.m)}
          columns={[
            { key: "m", label: t("profitChart:month"), align: "left" },
            {
              key: "isForecast",
              label: t("profitChart:actualForecastType"),
              align: "center",
              format: (value) => value == null ? "-" : value ? t("profitChart:forecast") : t("profitChart:actual"),
            },
            { key: "op", label: t("common:operatingProfit"), format: (_v, row) => `${row.op.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 1 })} (${row.opPct})` },
            { key: "non", label: t("profitChart:nonOperatingProfitLoss"), format: (_v, row) => `${row.non >= 0 ? "+" : ""}${row.non.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 1 })}` },
            { key: "ord", label: t("profitChart:ordinaryProfit"), format: (_v, row) => `${row.ord.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 1 })} (${row.ordPct})` },
            { key: "total", label: t("common:grossProfit"), format: (_v, row) => `${row.total.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 1 })} (${row.totalPct})` },
            { key: "sgaValue", label: t("common:sga"), format: (_v, row) => `${row.sgaValue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 1 })} (${row.sgaPct})` },
          ]}
          rows={data}
          totalRow={(() => {
            const total = data.reduce(
              (sum, row) => ({
                revenueValue: sum.revenueValue + row.revenueValue,
                op: sum.op + row.op,
                non: sum.non + row.non,
                ord: sum.ord + row.ord,
                gross: sum.gross + row.total,
                sga: sum.sga + row.sgaValue,
              }),
              { revenueValue: 0, op: 0, non: 0, ord: 0, gross: 0, sga: 0 },
            );
            const ratio = (value: number) =>
              total.revenueValue !== 0
                ? `${((value / total.revenueValue) * 100).toLocaleString("en-US", {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 1,
                  })}%`
                : "-";
            return {
              revenueValue: total.revenueValue,
              op: total.op,
              opPct: ratio(total.op),
              non: total.non,
              ord: total.ord,
              ordPct: ratio(total.ord),
              total: total.gross,
              totalPct: ratio(total.gross),
              sgaValue: total.sga,
              sgaPct: ratio(total.sga),
            };
          })()}
          onRowClick={(row) => {
            if (extractMonthIdx(row.m) != null) setDrillRow(row);
          }}
          isRowClickable={(row) => extractMonthIdx(row.m) != null}
        />
      </DetailModal>

      {/* ── 2차 현장별 매출이익 드릴다운 모달 ── */}
      <DetailModal
        open={drillRow != null}
        onClose={() => setDrillRow(null)}
        title={drillRow ? t("profitChart:siteDetailTitle", { month: drillRow.m }) : ""}
        subtitle={derived?.unitLabel}
      >
        {drillIsLoading ? (
          <div style={{ ...emptyNote, padding: "28px 16px" }}>
            {t("profitChart:loadingSiteData")}
          </div>
        ) : projectsQuery.isError ? (
          <div style={{ ...emptyNote, padding: "28px 16px", color: ACHIEVE_RED }}>
            {t("profitChart:dataLoadFailed")}
          </div>
        ) : drillRowsWithShare.length === 0 ? (
          <div style={{ ...emptyNote, padding: "28px 16px" }}>
            {drillRow && drillRow.total !== 0
              ? t("profitChart:siteDataNotReceived")
              : t("profitChart:noSiteData")}
          </div>
        ) : (
          <>
            <DetailDataTable
              rowKey={(row) => row.name}
              columns={[
                { key: "name", label: t("profitChart:colSiteName"), align: "left" },
                { key: "category", label: t("profitChart:colCategory"), align: "left" },
                { key: "bizType", label: t("profitChart:colBizType"), align: "left" },
                { key: "revenue", label: t("common:revenue"), align: "right", format: (v) => typeof v === "number" ? v.toLocaleString("ko-KR", { minimumFractionDigits: 0, maximumFractionDigits: 1 }) : "-" },
                { key: "cogs", label: t("common:cogs"), align: "right", format: (v) => typeof v === "number" ? v.toLocaleString("ko-KR", { minimumFractionDigits: 0, maximumFractionDigits: 1 }) : "-" },
                { key: "gross", label: t("common:grossProfit"), align: "right", format: (v) => typeof v === "number" ? v.toLocaleString("ko-KR", { minimumFractionDigits: 0, maximumFractionDigits: 1 }) : "-" },
                { key: "share", label: t("profitChart:colShare"), align: "right" },
              ]}
              rows={drillRowsWithShare}
              totalRow={{
                revenue: drillRevenueTotal,
                cogs: drillCogsTotal,
                gross: drillGrossTotal,
                share: "100%",
              }}
            />
            <div style={{ ...emptyNote, padding: "8px 12px 0", textAlign: "right" }}>
              {t("profitChart:summaryDifference", {
                value: drillGrossDifference.toLocaleString("ko-KR", { minimumFractionDigits: 0, maximumFractionDigits: 1 }),
              })}
            </div>
          </>
        )}
      </DetailModal>
    </div>
  );
}
