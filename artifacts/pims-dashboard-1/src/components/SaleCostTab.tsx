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
import { useMoney } from "../lib/displayUnit";
import { useProjectDetail } from "../lib/projectDetailData";
import { ProjectCommentPanel } from "./ProjectCommentPanel";
import { cardStyle, emptyNote, INK_MUTED } from "../lib/uiTokens";
import { chartTheme } from "../lib/chartTheme";

import {
  buildEffectivePeriod,
  buildFilterPeriod,
  buildChartData,
  buildBudgetRows,
} from "./sale-cost/helpers";
import { RevenueChartCard, CostRatioLineCard } from "./sale-cost/RevenueChartSection";
import { CostRatioCard }       from "./sale-cost/CostRatioSection";
import { BudgetExecutionSection } from "./sale-cost/BudgetExecutionSection";

// ---------------------------------------------------------------------------
// Local helpers
// ---------------------------------------------------------------------------

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
}) {
  const { t } = useTranslation(["saleCostTab", "costingTab"]);
  const { convert, fmtMoney } = useMoney();
  const {
    detail: pdDetail,
    isLoading,
    isError: hardError,
  } = useProjectDetail(projectName);

  // ── 기간 계산 ─────────────────────────────────────────────────────────────
  const filterPeriod  = buildFilterPeriod(fromYear, fromMonth, months);

  // pd salesMonthly가 있으면 전체 기간 사용, 없으면 필터 기간 폴백
  const salesMonthly  = pdDetail?.canonicalSalesMonthly ?? [];
  const pdSalesHasAny = salesMonthly.some((s) => s.plan != null || s.actual != null);
  const effectivePeriod = buildEffectivePeriod(
    pdSalesHasAny ? salesMonthly : [],
    filterPeriod,
  );

  // 서버가 경영보고 기준 + ERP/데이터입력 월별 보완으로 통합한 단일 읽기 모델
  const pdCogsLookup = new Map<string, number>();
  for (const c of pdDetail?.canonicalCogsMonthly ?? []) {
    if (c.acctCogs != null) pdCogsLookup.set(`${c.year}-${c.month}`, c.acctCogs);
  }
  const pdCogsHasAny  = filterPeriod.some(({ year, month }) => pdCogsLookup.has(`${year}-${month}`));
  const pdSalesMap = new Map<string, { plan: number | null; actual: number | null }>();
  for (const s of salesMonthly) {
    pdSalesMap.set(`${s.year}-${s.month}`, { plan: s.plan ?? null, actual: s.actual ?? null });
  }
  const lookup = (year: number, metric: "revenue" | "cogs", month: number) =>
    metric === "revenue"
      ? (pdSalesMap.get(`${year}-${month}`)?.actual ?? 0)
      : (pdCogsLookup.get(`${year}-${month}`) ?? 0);

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
  if (isLoading) {
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

      {/* 2. 누계 원가율 라인 */}
      {showCostRatioLine && hasData && ratios.length > 0 && (
        <CostRatioLineCard chartData={chartData} lastRatioIdx={lastRatioIdx} />
      )}

      {/* 3. 원가율 도넛 */}
      <CostRatioCard
        estimation={estimation}
        toYear={toYear}
        toMonth={toMonth}
        isLoading={isLoading}
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
