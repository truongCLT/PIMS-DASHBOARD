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
import { useProjectDetail, selectOutsourcingForMonth } from "../lib/projectDetailData";
import { ProjectCommentPanel } from "./ProjectCommentPanel";
import { cardStyle, emptyNote, INK_MUTED } from "../lib/uiTokens";
import { chartTheme } from "../lib/chartTheme";

import {
  buildEffectivePeriod,
  buildFilterPeriod,
  buildChartData,
  buildBudgetRows,
  buildCostRatioLookup,
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
  // PIMSVINA 동기화가 실제 매출이 없는 달에도 plan=null/actual=0인 placeholder 행을 미리 만들어두는
  // 경우가 있어(원가 계획/실적 표와 동일한 현상), 그 행들까지 포함해 기간을 잡으면 차트 맨 앞에
  // 의미 없는 "0" 구간이 길게 나온다 — plan이 있거나 actual이 0이 아닌 행만 실제 데이터로 보고
  // 기간(첫 달~끝 달)을 잡는다.
  const salesMonthlyMeaningful = salesMonthly.filter((s) => s.plan != null || (s.actual ?? 0) !== 0);
  const effectivePeriod = buildEffectivePeriod(
    pdSalesHasAny ? (salesMonthlyMeaningful.length > 0 ? salesMonthlyMeaningful : salesMonthly) : [],
    filterPeriod,
  );

  // 서버가 경영보고 기준 + ERP/데이터입력 월별 보완으로 통합한 단일 읽기 모델
  const pdSalesMap = new Map<string, { plan: number | null; actual: number | null }>();
  for (const s of salesMonthly) {
    pdSalesMap.set(`${s.year}-${s.month}`, { plan: s.plan ?? null, actual: s.actual ?? null });
  }
  const lookup = (year: number, month: number) => pdSalesMap.get(`${year}-${month}`)?.actual ?? 0;
  const estimation = pdDetail?.costEstimation ?? [];
  // 누계 원가율은 "4. Cost Rate"의 표준추정원가율과 동일하게 pd_cost_estimation(execution)의
  // costAmount/contractAmount에서 가져온다 — pd_cogs_monthly는 프로젝트에 따라 VND/천USD 단위가
  // 뒤섞여 저장된 레거시 데이터가 있어(수정된 입력 버그의 과거 잔재) 매출과 직접 나누면 안 된다.
  const costRatioLookup = buildCostRatioLookup(estimation);

  // ── 차트 데이터 ───────────────────────────────────────────────────────────
  const chartData = buildChartData(effectivePeriod, {
    pdSalesHasAny,
    pdSalesMap,
    costRatioLookup,
    lookup,
    convert,
  });

  const hasData      = chartData.some((d) => d.revenue !== 0 || d.cumulative !== 0 || d.plan !== 0);
  const ratios       = chartData.filter((d) => d.ratio != null);
  // ── 예산 집행 현황 ────────────────────────────────────────────────────────
  const outsourcingRows = selectOutsourcingForMonth(pdDetail?.outsourcing ?? [], toYear, toMonth);
  // 계획 누계는 pd_cost_budget.plan(데이터 입력 탭이 "자기" 기준월 — 기본값 당월 — 까지 합산해 저장한
  // 스냅샷)을 그대로 쓰면 이 화면의 기준월(toYear/toMonth, 보고서 탭 기준월과 동기화)과 어긋난다
  // (예: 기준월 '26.08인데 '26.09 계획까지 포함). costBudgetMonthly 월별 계획을 "프로젝트 시작 ~ 기준월"
  // 전체 누계로 직접 합산해 보고서 탭 원가 카드(ProjectReportTab cumPlanFor)와 같은 값을 쓴다.
  const cbMonthly = pdDetail?.costBudgetMonthly ?? [];
  const cumPlanFor = (item: string): number | null => {
    const key = item.trim().toLowerCase();
    const rows = cbMonthly.filter(
      (row) =>
        row.item.trim().toLowerCase() === key &&
        (row.year < toYear || (row.year === toYear && row.month <= toMonth)),
    );
    return rows.some((row) => row.plan != null)
      ? rows.reduce<number>((sum, row) => sum + (row.plan ?? 0), 0)
      : null;
  };
  // 월별 계획이 하나라도 입력된 항목은 기준월까지 계획이 없으면 null이어야 한다 — 스냅샷으로 폴백하면
  // 기준월 이후 달의 계획이 섞인다(실제 발생: K8HH1 Expense 1은 '26.09부터만 계획이 있는데, 기준월
  // '26.08에서 스냅샷('26.09 계획 25)이 표시되어 원가 카드와 25 차이). 스냅샷 폴백은 월별 계획이
  // 전혀 없는 항목에만 쓴다.
  const hasMonthlyPlan = (item: string) => {
    const key = item.trim().toLowerCase();
    return cbMonthly.some((row) => row.item.trim().toLowerCase() === key && row.plan != null);
  };
  const rawBudgetRows   = (pdDetail?.costBudget ?? []).map((r) => {
    const isContingency = /contingency/i.test(r.item);
    const monthlyCumPlan = hasMonthlyPlan(r.item) ? cumPlanFor(r.item) : (r.plan ?? null);
    return {
      // Contingency는 원본 category(보통 "Indirect Cost")를 그대로 두면 Indirect Cost 소계에 합산돼
      // 버려서 별도 항목으로 요청받은 것과 어긋난다 — category를 null로 둬서 소계 그룹에서 제외한다.
      category: isContingency ? null : (r.category ?? null),
      item:     r.item,
      budget:   r.budget ?? null,
      plan:     monthlyCumPlan,
      actual:   r.actual ?? null,
      bold:     r.category == null || isContingency, // category 없는 단독 항목 또는 Contingency는 굵게 (CostingTab.tsx와 동일 규칙)
    };
  });
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
          splitForecast={splitRevenueForecast}
          referenceYear={toYear}
          referenceMonth={toMonth}
        />
      )}

      {/* 2. 누계 원가율 라인 */}
      {showCostRatioLine && hasData && ratios.length > 0 && (
        <CostRatioLineCard chartData={chartData} />
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
