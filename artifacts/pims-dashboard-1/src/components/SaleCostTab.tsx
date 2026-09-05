/**
 * 매출/원가 통합 탭 — 쿼리 · 데이터 가공 · 레이아웃만 담당.
 *
 * 주요 규칙:
 * - 매출 그래프: salesMonthly 전체 기간(사이트 착공~준공)을 사용, 24개월 필터 미적용.
 * - 원가율 도넛: 실행예산 편성 먼저, 표준추정원가율(= 준공추정) 마지막.
 * - 예산 집행 현황 합계 라벨: "총 예산".
 * - 시각화 · 레이아웃 세부 구현은 sale-cost/ 하위 모듈로 위임.
 */
import React from "react";
import { useTranslation } from "react-i18next";
import {
  useListSalescostSites,
  getListSalescostSitesQueryKey,
} from "@workspace/api-client-react";
import { useMrProject } from "../data/mrProjectLinks";
import { REPORT_YEAR } from "../lib/mgmtreportData";
import { useMoney } from "../lib/displayUnit";
import { useProjectDetail, fmtPct, ratioPct } from "../lib/projectDetailData";
import { ProjectCommentPanel } from "./ProjectCommentPanel";
import { cardStyle, sectionTitle, emptyNote, INK_MUTED, INK_BODY, INK_NAVY, DIVIDER, TABLE_HEADER_BG } from "../lib/uiTokens";
import { chartTheme } from "../lib/chartTheme";

import {
  buildEffectivePeriod,
  buildFilterPeriod,
  extractYears,
  buildChartData,
  buildBudgetRows,
} from "./sale-cost/helpers";
import { RevenueChartCard, CostRatioLineCard } from "./sale-cost/RevenueChartSection";
import { CostRatioCard }       from "./sale-cost/CostRatioSection";
import { BudgetExecutionSection } from "./sale-cost/BudgetExecutionSection";

// ---------------------------------------------------------------------------
// Local helpers
// ---------------------------------------------------------------------------

function useSiteMonths(year: number, metric: "revenue" | "cogs", enabled: boolean) {
  const params = { year, metric };
  return useListSalescostSites(params, {
    query: { enabled, queryKey: getListSalescostSitesQueryKey(params) },
  });
}

function Notice({ children, error }: { children: React.ReactNode; error?: boolean }) {
  return (
    <div style={{ ...emptyNote, color: error ? chartTheme.outflowRed : INK_MUTED }}>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export function SaleCostTab({
  projectName,
  fromYear,
  fromMonth,
  months,
  toYear,
  toMonth,
  showCostRatioLine = true,
  showBudgetExecution = true,
  showRevenueCumulativeLine = true,
  splitRevenueForecast = false,
  serviceCostBreakdown = false,
}: {
  projectName: string;
  fromYear: number;
  fromMonth: number;
  months: number;
  toYear: number;
  toMonth: number;
  showCostRatioLine?: boolean;
  showBudgetExecution?: boolean;
  showRevenueCumulativeLine?: boolean;
  splitRevenueForecast?: boolean;
  serviceCostBreakdown?: boolean;
}) {
  const { t } = useTranslation(["saleCostTab", "costingTab"]);
  const { convert, fmtMoney } = useMoney();
  const { detail: pdDetail, isLoading: pdLoading } = useProjectDetail(projectName);

  // ── 기간 계산 ─────────────────────────────────────────────────────────────
  const filterPeriod  = buildFilterPeriod(fromYear, fromMonth, months);
  const [yearA, yearB, yearC] = extractYears(filterPeriod);

  // pd salesMonthly가 있으면 전체 기간 사용, 없으면 필터 기간 폴백
  const salesMonthly  = pdDetail?.salesMonthly ?? [];
  const pdSalesHasAny = salesMonthly.some((s) => s.plan != null || s.actual != null);
  const effectivePeriod = buildEffectivePeriod(
    pdSalesHasAny ? salesMonthly : [],
    filterPeriod,
  );

  // ── sc_sites 쿼리 (site_code 연결) ────────────────────────────────────────
  const mrMain   = useMrProject(projectName, REPORT_YEAR);
  const siteCode = mrMain.project?.siteCode ?? null;
  const hasSite  = siteCode != null;

  const revA  = useSiteMonths(yearA,        "revenue", hasSite);
  const cogsA = useSiteMonths(yearA,        "cogs",    hasSite);
  const revB  = useSiteMonths(yearB ?? 0,   "revenue", hasSite && yearB != null);
  const cogsB = useSiteMonths(yearB ?? 0,   "cogs",    hasSite && yearB != null);
  const revC  = useSiteMonths(yearC ?? 0,   "revenue", hasSite && yearC != null);
  const cogsC = useSiteMonths(yearC ?? 0,   "cogs",    hasSite && yearC != null);

  // ── mr_projects 폴백 쿼리 ─────────────────────────────────────────────────
  const mrA = useMrProject(projectName, yearA);
  const mrB = useMrProject(projectName, yearB ?? 0, yearB != null);
  const mrC = useMrProject(projectName, yearC ?? 0, yearC != null);

  // ── 로딩 / 오류 판정 ──────────────────────────────────────────────────────
  const scQueries = hasSite
    ? [revA, cogsA, ...(yearB != null ? [revB, cogsB] : []), ...(yearC != null ? [revC, cogsC] : [])]
    : [];
  const allQueries = [...scQueries, mrMain, mrA, ...(yearB != null ? [mrB] : []), ...(yearC != null ? [mrC] : [])];
  const isLoading  = allQueries.some((q) => q.isLoading);
  const hardError  = allQueries.some((q) =>
    "isError" in q && typeof q.isError === "boolean"
      ? q.isError && ((q as { error?: { status?: number } | null }).error?.status ?? 0) !== 404
      : false,
  );

  // ── sc / mr 값 조회 함수 ──────────────────────────────────────────────────
  const scLookup = (year: number, metric: "revenue" | "cogs", month: number): number => {
    const q =
      year === yearA ? (metric === "revenue" ? revA : cogsA)
      : year === yearB ? (metric === "revenue" ? revB : cogsB)
      : year === yearC ? (metric === "revenue" ? revC : cogsC)
      : null;
    return q?.data?.sites.find((s) => s.code === siteCode)?.months[month - 1] ?? 0;
  };

  const mrLookup = (year: number, metric: "revenue" | "cogs", month: number): number => {
    const q = year === yearA ? mrA : year === yearB ? mrB : year === yearC ? mrC : null;
    const arr = metric === "revenue" ? q?.project?.revenueActual : q?.project?.cogsActual;
    return arr?.[month - 1] ?? 0;
  };

  // ── pd 원가 맵 ────────────────────────────────────────────────────────────
  const pdCogsLookup = new Map<string, number>();
  for (const c of pdDetail?.cogsMonthly ?? []) {
    if (c.acctCogs != null) pdCogsLookup.set(`${c.year}-${c.month}`, c.acctCogs);
  }
  const pdCogsHasAny  = filterPeriod.some(({ year, month }) => pdCogsLookup.has(`${year}-${month}`));
  const scHasAny      = hasSite && filterPeriod.some(({ year, month }) => scLookup(year, "revenue", month) !== 0);
  const lookup        = scHasAny ? scLookup : mrLookup;

  // ── pd 매출 맵 ────────────────────────────────────────────────────────────
  const pdSalesMap = new Map<string, { plan: number | null; actual: number | null }>();
  for (const s of salesMonthly) {
    pdSalesMap.set(`${s.year}-${s.month}`, { plan: s.plan ?? null, actual: s.actual ?? null });
  }

  // ── 차트 데이터 ───────────────────────────────────────────────────────────
  const chartData = buildChartData(effectivePeriod, {
    pdSalesHasAny,
    pdSalesMap,
    pdCogsHasAny,
    pdCogsLookup,
    lookup,
    convert,
  });

  const hasData      = chartData.some((d) => d.revenue !== 0 || d.cumulative !== 0 || d.plan !== 0);
  const ratios       = chartData.filter((d) => d.ratio != null);
  let lastRatioIdx   = -1;
  chartData.forEach((d, i) => { if (d.ratio != null) lastRatioIdx = i; });
  const referenceIndex = toYear * 12 + toMonth - 1;
  const serviceCogs = pdDetail?.cogsMonthly ?? [];
  const sumNullable = (values: Array<number | null | undefined>) =>
    values.some((value) => value != null)
      ? values.reduce<number>((sum, value) => sum + (value ?? 0), 0)
      : null;
  const cogsBeforeReference = serviceCogs.filter((row) => row.year * 12 + row.month - 1 <= referenceIndex);
  const cogsAfterReference = serviceCogs.filter((row) => row.year * 12 + row.month - 1 > referenceIndex);
  const serviceCostSummary = {
    plan: sumNullable(serviceCogs.map((row) => row.plan)),
    wipActual: sumNullable(cogsBeforeReference.map((row) => row.wipCogs ?? row.actual)),
    wipForecast: sumNullable(cogsAfterReference.map((row) => row.wipCogs ?? row.actual)),
    acctActual: sumNullable(cogsBeforeReference.map((row) => row.acctCogs ?? row.actual)),
    acctForecast: sumNullable(cogsAfterReference.map((row) => row.acctCogs ?? row.actual)),
  };
  const forecastRevenue = sumNullable((pdDetail?.salesMonthly ?? []).map((row) => row.actual));
  const forecastCost =
    serviceCostSummary.acctActual != null || serviceCostSummary.acctForecast != null
      ? (serviceCostSummary.acctActual ?? 0) + (serviceCostSummary.acctForecast ?? 0)
      : null;

  // ── 예산 집행 현황 ────────────────────────────────────────────────────────
  const estimation      = pdDetail?.costEstimation ?? [];
  const outsourcingRows = pdDetail?.outsourcing    ?? [];
  const rawBudgetRows   = (pdDetail?.costBudget ?? []).map((r) => ({
    category: r.category ?? null,
    item:     r.item,
    budget:   r.budget ?? null,
    plan:     r.plan   ?? null,
    actual:   r.actual ?? null,
    bold:     r.category == null || /contingency/i.test(r.item),
  }));
  const budgetRowsWithSum = buildBudgetRows(
    rawBudgetRows,
    outsourcingRows.length > 0
      ? {
          budget: outsourcingRows.reduce((a, o) => a + (o.budget          ?? 0), 0),
          plan:   outsourcingRows.reduce((a, o) => a + (o.executedBudget  ?? 0), 0),
          actual: outsourcingRows.reduce((a, o) => a + (o.accum           ?? 0), 0),
          label:  t("costingTab:outsourcingItem"),
        }
      : null,
    t("saleCostTab:totalBudget"),
  );

  // ── 로딩 / 오류 / 빈 데이터 ──────────────────────────────────────────────
  if (isLoading || pdLoading) {
    return <div style={cardStyle}><Notice>{t("saleCostTab:loadingNotice")}</Notice></div>;
  }
  if (hardError) {
    return <div style={cardStyle}><Notice error>{t("saleCostTab:errorNotice")}</Notice></div>;
  }
  if (!hasData && estimation.length === 0 && budgetRowsWithSum.length === 0) {
    return <div style={cardStyle}><Notice>{t("saleCostTab:noDataNotice")}</Notice></div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      {/* 1. 매출 차트 */}
      {hasData && (
        <RevenueChartCard
          chartData={chartData}
          pdSalesHasAny={pdSalesHasAny}
          showCumulativeLine={showRevenueCumulativeLine}
          splitForecast={splitRevenueForecast}
          referenceYear={toYear}
          referenceMonth={toMonth}
        />
      )}

      {serviceCostBreakdown && (
        <div style={cardStyle}>
          <span style={sectionTitle}>{t("saleCostTab:serviceCostTitle")}</span>
          <div style={{ overflowX: "auto", marginTop: "8px" }}>
            <table style={{ width: "100%", minWidth: "620px", borderCollapse: "collapse", fontSize: "12px" }}>
              <thead>
                <tr>
                  <th style={{ padding: "7px", textAlign: "left", backgroundColor: TABLE_HEADER_BG, color: INK_NAVY }}>{t("saleCostTab:costBasis")}</th>
                  <th style={{ padding: "7px", textAlign: "right", backgroundColor: TABLE_HEADER_BG, color: INK_NAVY }}>{t("common:plan")}</th>
                  <th style={{ padding: "7px", textAlign: "right", backgroundColor: TABLE_HEADER_BG, color: INK_NAVY }}>{t("common:actual")}</th>
                  <th style={{ padding: "7px", textAlign: "right", backgroundColor: TABLE_HEADER_BG, color: INK_NAVY }}>{t("saleCostTab:forecast")}</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { label: t("saleCostTab:wipCost"), actual: serviceCostSummary.wipActual, forecast: serviceCostSummary.wipForecast },
                  { label: t("saleCostTab:accountingCost"), actual: serviceCostSummary.acctActual, forecast: serviceCostSummary.acctForecast },
                ].map((row) => (
                  <tr key={row.label}>
                    <td style={{ padding: "8px 7px", borderBottom: `1px solid ${DIVIDER}`, color: INK_BODY, fontWeight: 700 }}>{row.label}</td>
                    <td style={{ padding: "8px 7px", textAlign: "right", borderBottom: `1px solid ${DIVIDER}` }}>{fmtMoney(serviceCostSummary.plan)}</td>
                    <td style={{ padding: "8px 7px", textAlign: "right", borderBottom: `1px solid ${DIVIDER}` }}>{fmtMoney(row.actual)}</td>
                    <td style={{ padding: "8px 7px", textAlign: "right", borderBottom: `1px solid ${DIVIDER}` }}>{fmtMoney(row.forecast)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", marginTop: "8px", padding: "8px 10px", backgroundColor: TABLE_HEADER_BG, borderRadius: "6px" }}>
            <span style={{ fontSize: "12px", color: INK_BODY }}>{t("saleCostTab:forecastCostRatio")}</span>
            <strong style={{ color: INK_NAVY }}>{fmtPct(ratioPct(forecastCost, forecastRevenue))}</strong>
          </div>
        </div>
      )}

      {/* 2. 누계 원가율 라인 */}
      {showCostRatioLine && hasData && ratios.length > 0 && (
        <CostRatioLineCard chartData={chartData} lastRatioIdx={lastRatioIdx} />
      )}

      {/* 3. 원가율 도넛 */}
      <CostRatioCard
        estimation={estimation}
        toYear={toYear}
        toMonth={toMonth}
        isLoading={pdLoading}
      />

      {/* 4. 예산 집행 현황 */}
      {showBudgetExecution && <BudgetExecutionSection rows={budgetRowsWithSum} />}

      {/* 5. 코멘트 */}
      <div style={cardStyle}>
        <ProjectCommentPanel projectName={projectName} tab="saleprofit" />
      </div>
    </div>
  );
}
