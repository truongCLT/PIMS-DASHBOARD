/**
 * ProjectReportTab — 보고서 탭
 *
 * This file owns data orchestration and layout only.
 * All section components live under ./project-report/.
 *
 * Layout (reference: image_1788587739244.png):
 *   Header: 당월 보고서 title + reference-month selector
 *   Row 1 (auto-fit ≥240px): 공정 | 매출 | 현황 표
 *   Row 2 (auto-fit ≥240px): 원가 | 자금 | 코멘트
 */
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { FileDown, Loader2 } from "lucide-react";
import { Button } from "@workspace/aqua-glass/components/ui/button";
import {
  useGetCashflowMonthly,
  getGetCashflowMonthlyQueryKey,
} from "@workspace/api-client-react";
import { ProjectCommentPanel } from "./ProjectCommentPanel";
import { useProjectDetail } from "../lib/projectDetailData";
import { getMrCashflowRef } from "../data/mrProjectLinks";
import { REPORT_YEAR } from "../lib/mgmtreportData";
import { maxSelectableMonth } from "../lib/monthRange";
import {
  cardStyle,
  sectionTitle,
  INK_NAVY,
  INK_BODY,
  INK_MUTED,
  CARD_BORDER,
} from "../lib/uiTokens";

import {
  ProgressSection,
  selectProgressReportRow,
} from "./project-report/ProgressSection";
import { SalesSection } from "./project-report/SalesSection";
import { StatusTableSection } from "./project-report/StatusTableSection";
import { CostSection } from "./project-report/CostSection";
import { FundsSection } from "./project-report/FundsSection";
import type { StatusRowData, TradeProgressRow } from "./project-report/reportTypes";
import {
  exportProjectReportPdf,
  runProjectReportExport,
} from "../lib/exportProjectReport";

// "5. 예산 집행 현황"(Budget Execution Status, SaleCostTab/ProjectDataEntryTab의 MONTHLY_BUDGET_ITEMS와
// 동일한 항목)과 같은 소스를 쓴다 — 예전엔 트레이드별 "외주 건축/기계/전기/토목/조경/경비" 항목을 썼는데,
// 그 항목들의 월별 실적을 채우던 PIMSVINA 동기화(dashboard_pd_trade_cost_monthly_1q.jsp)가 이 세션에서
// 이미 제거되어 더 이상 값이 안 들어오면서 "원가" 현황 행이 항상 "-"만 뜨는 버그가 됐다(요청으로 확인/수정).
const PROCESS_COST_PLAN_ITEMS = new Set([
  "Outsourcing",
  "Common",
  "Expense 1",
  "Expense 2",
  "Contingency",
]);

const PROCESS_COST_GROUPS = [
  { label: "외주", items: ["Outsourcing"] },
  { label: "Common", items: ["Common"] },
  { label: "Expense 1", items: ["Expense 1"] },
  { label: "Expense 2", items: ["Expense 2"] },
  { label: "Contingency", items: ["Contingency"] },
] as const;

// 공정 카드 hover 팝업의 공종 목록 — 데이터 입력 탭 TRADE_GROUP_PROCESS_ITEM과 같은 매핑
// (tradeGroup = pd_outsourcing 대공종, item = costBudgetMonthly 계획 항목).
const PROCESS_TRADES = [
  { tradeGroup: "건축", item: "외주 건축", labelKey: "projectDataEntryTab:tradeGroupArchitecture" },
  { tradeGroup: "기계", item: "외주 기계", labelKey: "projectDataEntryTab:tradeGroupMechanical" },
  { tradeGroup: "전기", item: "외주 전기", labelKey: "projectDataEntryTab:tradeGroupElectrical" },
  { tradeGroup: "토목", item: "외주 토목", labelKey: "projectDataEntryTab:tradeGroupCivil" },
  { tradeGroup: "조경", item: "외주 조경", labelKey: "projectDataEntryTab:tradeGroupLandscape" },
] as const;

// ─── Responsive grid helpers ───────────────────────────────────────────────

/** auto-fit grid: items collapse to single column below ~minW × column-count */
function reportGrid(minColW: string): React.CSSProperties {
  return {
    display: "grid",
    gridTemplateColumns: `repeat(auto-fit, minmax(${minColW}, 1fr))`,
    gap: "8px",
    alignItems: "stretch",
  };
}

export function resolveLatestProjectReportMonth({
  asOfMonth,
  progress,
  revenueActuals,
}: {
  asOfMonth?: string | null;
  progress: Array<{
    year: number;
    month: number;
    actualPct?: number | null;
    actualCumPct?: number | null;
  }>;
  revenueActuals: Array<number | null>;
}): number | null {
  // 실제 실적(공정/매출) 데이터가 있으면 그 데이터 기준으로 "가장 최근 실적이 있는 달"을 우선 찾는다.
  // Data Entry의 "Base Month of Record"(asOfMonth)는 수기 입력이라 최신 실적 달과 어긋날 수 있으므로
  // (예: 실제 실적은 8월까지인데 asOfMonth를 습관적으로 당월 9월로 입력해둔 경우), 실적 데이터가 있는
  // 한 asOfMonth보다 우선한다 — 그래야 "당월(마감 전) 실적을 기준월로 써서 계획 데이터가 실적 계산에
  // 섞이는" 문제를 asOfMonth가 다시 일으키지 않는다.
  //
  // actualPct(월간 델타)만 보고 판단한다 — actualCumPct는 보지 않는다. PIMSVINA sync는 아직 그 달
  // 실적이 없으면 지난달과 같은 누계 스냅샷을 그대로 다시 내려주므로(예: 9~12월 actualCumPct가 8월과
  // 동일하게 59.1로 "얼어붙어" 반복), actualCumPct만으로는 "진짜 최신 실적 달"과 "아직 반영 안 된
  // 빈 달"을 구분할 수 없다. actualPct는 이번 달 누계 − 지난달 누계라서 반영 안 된 달은 항상 0이
  // 되므로, actualPct가 0이 아닌 마지막 달을 찾아야 한다(매출 실적 판정과 동일한 규칙).
  const latestProgressActual = [...progress]
    .reverse()
    .find((row) => row.year === REPORT_YEAR && (row.actualPct ?? 0) !== 0);
  if (latestProgressActual) return latestProgressActual.month;

  for (let index = revenueActuals.length - 1; index >= 0; index -= 1) {
    if ((revenueActuals[index] ?? 0) !== 0) return index + 1;
  }

  const asOfMatch = /^(\d{4})-(\d{2})$/.exec(asOfMonth ?? "");
  if (
    asOfMatch &&
    Number(asOfMatch[1]) === REPORT_YEAR &&
    Number(asOfMatch[2]) >= 1 &&
    Number(asOfMatch[2]) <= 12
  ) {
    return Number(asOfMatch[2]);
  }

  // 실적 데이터도, asOfMonth도 없으면 "달력 기준 직전월"(당월은 아직 마감 전이라 제외)로 기본값을 둔다.
  return maxSelectableMonth();
}

// ─── Main component ────────────────────────────────────────────────────────

export function ProjectReportTab({
  projectName,
  selectedMonth,
  onSelectedMonthChange,
  onResolvedMonthChange,
}: {
  projectName: string;
  selectedMonth: number | null;
  onSelectedMonthChange: (month: number | null) => void;
  onResolvedMonthChange: (month: number | null) => void;
}) {
  const { t } = useTranslation(["projectReportTab", "common", "overviewTab"]);
  const { detail, isLoading } = useProjectDetail(projectName);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  // ── Construction progress ───────────────────────────────────────────────
  const progress = detail?.progress ?? [];
  const progRows = [...progress]
    .sort((a, b) => a.year * 12 + a.month - (b.year * 12 + b.month))
    .filter(
      (p) =>
        p.planCumPct != null ||
        p.actualCumPct != null ||
        p.planPct != null ||
        p.actualPct != null,
    );

  // ── Revenue (canonical project-detail monthly read model) ────────────────
  const reportSales = (detail?.canonicalSalesMonthly ?? []).filter(
    (row) => row.year === REPORT_YEAR,
  );
  const revMonths: (number | null)[] = Array.from(
    { length: 12 },
    (_, index) =>
      reportSales.find((row) => row.month === index + 1)?.actual ?? null,
  );
  const planMonths: (number | null)[] = Array.from(
    { length: 12 },
    (_, index) =>
      reportSales.find((row) => row.month === index + 1)?.plan ?? null,
  );

  const latestActualMonth = resolveLatestProjectReportMonth({
    asOfMonth: detail?.overview?.asOfMonth,
    progress: progRows,
    revenueActuals: revMonths,
  });
  const lastActualIdx = latestActualMonth == null ? -1 : latestActualMonth - 1;
  // 사용자가 고를 수 있는 상한 — 실적이 있는 가장 최근 월(latestActualMonth)이 우선이고,
  // 그마저 없으면 달력 기준 직전월(maxSelectableMonth)로 제한한다. 당월(마감 전) 실적이
  // 없는데도 당월을 기준월로 선택하면 계획 데이터가 실적 계산에 섞이는 문제를 방지한다.
  const maxSelectable = latestActualMonth ?? maxSelectableMonth();
  const resolvedMonth =
    selectedMonth != null ? Math.min(selectedMonth, maxSelectable) : latestActualMonth;
  useEffect(() => {
    onResolvedMonthChange(resolvedMonth);
  }, [onResolvedMonthChange, resolvedMonth]);

  // Cumulative revenue up to resolvedMonth — 연 누계(해당 REPORT_YEAR만). "매출" Status row는
  // 규칙(연 누계 실적 >= 연 누계 계획)에 맞춰 이 값을 그대로 쓴다.
  const cumRev =
    resolvedMonth != null
      ? revMonths.slice(0, resolvedMonth).reduce<number>((a, b) => a + (b ?? 0), 0)
      : revMonths.reduce<number>((a, b) => a + (b ?? 0), 0);

  // 전체 누계(이전 연도 실적 포함) — SalesSection의 "Overall Cumulative"와 동일한 계산이다. Funds
  // 카드의 "Cumulative Revenue"는 이 값과 일치해야 하므로(자금은 프로젝트 시작부터의 누계 매출 대비
  // 수금 현황을 보는 것이라 "연 누계"가 아니라 "전체 누계" 기준이 맞다) 여기서 같은 방식으로 계산한다.
  const overallRefMonth = Math.max(1, Math.min(resolvedMonth ?? 1, 12));
  const overallCumRev = (detail?.canonicalSalesMonthly ?? [])
    .filter(
      (row) =>
        row.year < REPORT_YEAR ||
        (row.year === REPORT_YEAR && row.month <= overallRefMonth),
    )
    .reduce<number>((sum, row) => sum + (row.actual ?? 0), 0);

  // ── Cashflow ─────────────────────────────────────────────────────────────
  const cfRef = getMrCashflowRef(projectName);
  const cfParams = {
    projectName: cfRef?.name ?? "",
    division: cfRef?.division,
    fromYear: REPORT_YEAR,
    fromMonth: 1,
    months: 12,
  };
  const cfQ = useGetCashflowMonthly(cfParams, {
    query: {
      enabled: cfRef != null,
      queryKey: getGetCashflowMonthlyQueryKey(cfParams),
    },
  });
  // 자금은 "전체 누계"(프로젝트 시작부터의 누계 매출 대비 수금) 기준이어야 하므로(위 overallCumRev
  // 주석 참고) REPORT_YEAR로 필터링하지 않는다 — 예전엔 여기서 당해 연도만 남기는 바람에 이전 연도의
  // 실제 수금액이 통째로 빠져, 미수금(cumRev-cashIn)이 실제보다 훨씬 크게 보이는 문제가 있었다(실사용자
  // 확인: 실제로는 매출보다 더 많이 받았는데 미수금이 크게 나옴).
  const pdCashPoints = (detail?.cashflow ?? [])
    .map((c) => ({
      month: `${c.year}-${String(c.month).padStart(2, "0")}`,
      cashIn: c.cashIn ?? 0,
      cashOut: c.cashOut ?? 0,
      equivalent: c.equivalent ?? 0,
    }));
  const hasPdCashRows = (detail?.cashflow ?? []).length > 0;
  const cfPoints = hasPdCashRows ? pdCashPoints : (cfQ.data?.points ?? []);

  const cfFiltered =
    resolvedMonth == null
      ? cfPoints
      : cfPoints.filter((p) => {
          const cutoff = `${REPORT_YEAR}-${String(resolvedMonth).padStart(2, "0")}`;
          return p.month <= cutoff;
        });
  const cashIn = cfFiltered.reduce<number>((a, p) => a + (p.cashIn ?? 0), 0);
  const cashOut = cfFiltered.reduce<number>((a, p) => a + (p.cashOut ?? 0), 0);
  const cashMonthIn =
    resolvedMonth == null
      ? null
      : (cfPoints.find(
          (point) =>
            point.month ===
            `${REPORT_YEAR}-${String(resolvedMonth).padStart(2, "0")}`,
        )?.cashIn ?? null);

  // ── Cost budget ───────────────────────────────────────────────────────────
  // Common/경비1/경비2/예비비의 "계획(plan)"은 costBudgetMonthly(월별 입력 그리드, 데이터 입력 탭
  // "5. 예산 집행 현황" 표의 Monthly Plan과 같은 소스)를 보고서 탭이 고른 기준월까지 직접 누계해서
  // 뽑는다 — 예전엔 detail.costBudget.plan(pd_cost_budget, 데이터 입력 탭이 "자기 자신의" 기준월
  // (selectedExecutionMonth) 기준으로 계산해 저장해두는 스냅샷)을 그대로 읽었는데, 그 스냅샷의 기준월이
  // 보고서 탭에서 고른 기준월과 다르면(또는 데이터 입력에서 스냅샷을 재계산/저장하기 전에 월별 그리드만
  // 수정하면) 여기 숫자가 방금 입력한 값과 어긋나는 버그가 있었다(실제로 발생/보고됨).
  //
  // "실적(actual)"은 반대로 costBudgetMonthly를 누계하면 안 된다 — 데이터 입력 탭에서도 Cumulative
  // Actual은 월별 실적 그리드를 합산하지 않고 pd_cost_budget.actual(PIMSVINA dashboard_pd_costbudget_1q
  // 동기화가 내려주는, 이미 누계된 단일 스냅샷)을 그대로 읽기 전용으로 보여준다(ProjectDataEntryTab.tsx
  // actualAmount()/"Cumulative Actual" 칼럼과 동일 규칙) — 월별 실적 그리드는 그 스냅샷만큼 과거 이력이
  // 다 채워져 있다는 보장이 없어, 합산하면 오히려 실제보다 작게 나오는 값이 된다. 그래서 실적은 데이터
  // 입력 탭과 동일하게 스냅샷을 그대로 쓴다.
  const budget = detail?.costBudget ?? [];
  const findBudget = (name: string) =>
    budget.find((r) => r.item.trim().toLowerCase() === name.toLowerCase()) ?? null;
  //
  // 계획 누계는 실적 스냅샷(pd_cost_budget.actual, 프로젝트 시작부터의 전체 누계)과 같은 기준이어야
  // 하므로 "프로젝트 시작 ~ 기준월" 전체 누계로 합산한다 — 예전엔 REPORT_YEAR만 합산해서 이전 연도
  // 계획이 통째로 빠져, 계획이 실적의 절반 수준으로 보이고 집행률이 190%대로 나오는 버그가 있었다
  // (실사용자 확인: 월별 계획/실적을 동일하게 넣었는데 원가 카드와 예산 집행 현황 숫자가 다름).
  const cbMonthly = detail?.costBudgetMonthly ?? [];
  const cumPlanFor = (item: string): number | null => {
    const rows = cbMonthly.filter(
      (row) =>
        row.item === item &&
        (row.year < REPORT_YEAR ||
          (row.year === REPORT_YEAR &&
            (resolvedMonth == null || row.month <= resolvedMonth))),
    );
    return rows.some((row) => row.plan != null)
      ? rows.reduce<number>((sum, row) => sum + (row.plan ?? 0), 0)
      : null;
  };

  // "외주" 행도 나머지 4개 항목과 동일하게 pd_cost_budget(스냅샷)/costBudgetMonthly(월별 계획)에서
  // 뽑는다 — 데이터 입력 탭 "5. Budget Execution Status" 표는 Outsourcing 행도 그 두 소스만 쓴다(표
  // 상단 안내문 "Outsourcing-type budget/execution actuals are automatically aggregated from the
  // 'Outsourcing/Materials' table below"는 그 값이 costBudgetMonthly/costBudget에 미리 합산되어
  // 들어간다는 뜻이지, 이 보고서가 pd_outsourcing 계약 테이블(outRows/outBudget/outPlan/outActual,
  // 계약금액·기성 누계 — 단위/기준월 정의가 전혀 다름)을 따로 다시 집계해도 된다는 뜻이 아니다). 예전엔
  // outRows에서 다시 집계해서 데이터 입력 탭 숫자와 몇 배씩 어긋났다(실제로 발생/보고됨).
  const allBudgetRows = [
    {
      item: "외주",
      budget: findBudget("Outsourcing")?.budget ?? null,
      plan: cumPlanFor("Outsourcing"),
      actual: findBudget("Outsourcing")?.actual ?? null,
    },
    {
      item: "Common",
      budget: findBudget("Common")?.budget ?? null,
      plan: cumPlanFor("Common"),
      actual: findBudget("Common")?.actual ?? null,
    },
    {
      item: "경비1",
      budget: findBudget("Expense 1")?.budget ?? null,
      plan: cumPlanFor("Expense 1"),
      actual: findBudget("Expense 1")?.actual ?? null,
    },
    {
      item: "경비2",
      budget: findBudget("Expense 2")?.budget ?? null,
      plan: cumPlanFor("Expense 2"),
      actual: findBudget("Expense 2")?.actual ?? null,
    },
    {
      item: "예비비",
      budget: findBudget("Contingency")?.budget ?? null,
      plan: cumPlanFor("Contingency"),
      actual: findBudget("Contingency")?.actual ?? null,
    },
  ].filter((r) => r.budget != null || r.actual != null || r.plan != null);

  // ── Status table data ─────────────────────────────────────────────────────
  const latestProg = selectProgressReportRow(progRows, resolvedMonth);

  const refMonthIdx = resolvedMonth != null ? resolvedMonth - 1 : lastActualIdx;
  const salesMonthActual = refMonthIdx >= 0 ? (revMonths[refMonthIdx] ?? null) : null;
  const salesMonthPlan = refMonthIdx >= 0 ? (planMonths[refMonthIdx] ?? null) : null;
  const salesCumPlan =
    resolvedMonth != null
      ? planMonths.slice(0, resolvedMonth).reduce<number>((a, b) => a + (b ?? 0), 0)
      : planMonths.reduce<number>((a, b) => a + (b ?? 0), 0);

  // 공정별 원가 계획: 선택 기준월의 월별/누계 계획 대비 실적
  const costPlanRows = (detail?.costBudgetMonthly ?? []).filter(
    (row) =>
      PROCESS_COST_PLAN_ITEMS.has(row.item) &&
      row.year === REPORT_YEAR &&
      (resolvedMonth == null || row.month <= resolvedMonth),
  );
  const selectedCostRows =
    resolvedMonth == null
      ? costPlanRows.filter((row) => row.month === Math.max(0, ...costPlanRows.map((item) => item.month)))
      : costPlanRows.filter((row) => row.month === resolvedMonth);
  const sumNullable = (
    rows: typeof costPlanRows,
    field: "plan" | "actual",
  ): number | null =>
    rows.some((row) => row[field] != null)
      ? rows.reduce<number>((sum, row) => sum + (row[field] ?? 0), 0)
      : null;
  const makeCostBreakdown = (rows: typeof costPlanRows) =>
    PROCESS_COST_GROUPS.map((group) => {
      const groupRows = rows.filter((row) => group.items.some((item) => item === row.item));
      return {
        label: group.label,
        plan: sumNullable(groupRows, "plan"),
        actual: sumNullable(groupRows, "actual"),
      };
    });
  const costExecution = {
    monthlyPlan: sumNullable(selectedCostRows, "plan"),
    monthlyActual: sumNullable(selectedCostRows, "actual"),
    cumulativePlan: sumNullable(costPlanRows, "plan"),
    cumulativeActual: sumNullable(costPlanRows, "actual"),
    monthlyBreakdown: makeCostBreakdown(selectedCostRows),
    cumulativeBreakdown: makeCostBreakdown(costPlanRows),
  };
  // 현황 표의 "원가" 달성률(%)은 costExecution.*Plan/*Actual(항목별 절대 금액 합계, 현황 표 원가 판정용)을
  // 그대로 쓰면 안 된다 — "외주 건축"/"외주 경비"처럼 Plan이 한 번도 입력된 적 없는 항목까지 실적 합계에
  // 포함되면서, 그 항목의 실적만 분자에 더해지고 분모(계획)에는 전혀 반영되지 않아 달성률이 수십만%로
  // 폭주한다(실제로 발생했던 문제). 상태등 판정(costCategoryLevel)과 동일하게 "계획이 있는 항목만" 비교한
  // 별도 합계를 만들어 현황 표 표시에만 사용한다.
  const comparableCostRows = (rows: typeof costPlanRows) => rows.filter((row) => row.plan != null);
  const statusCostMonthlyPlan = sumNullable(comparableCostRows(selectedCostRows), "plan");
  const statusCostMonthlyActual = sumNullable(comparableCostRows(selectedCostRows), "actual");
  const statusCostCumulativePlan = sumNullable(comparableCostRows(costPlanRows), "plan");
  const statusCostCumulativeActual = sumNullable(comparableCostRows(costPlanRows), "actual");

  // 공정 카드 hover 팝업 — 공종(건축/기계/전기/토목/조경)별 계획 대비 달성률. 데이터 입력 탭
  // "4. 공정별 원가 계획/실적" 표와 같은 규칙으로 뽑는다: 계획 = costBudgetMonthly의 "외주 X" 항목
  // plan(수동 입력), 실적 = pd_outsourcing의 대공종(tradeGroup)별 이번달(thisMonth) 합계(ProjectDataEntryTab
  // getProcessCostValue와 동일). 월 = 기준월 1개월, 누계 = 프로젝트 시작 ~ 기준월.
  const refYm = resolvedMonth != null ? REPORT_YEAR * 12 + resolvedMonth - 1 : null;
  const sumOrNull = (values: Array<number | null | undefined>) =>
    values.some((v) => v != null)
      ? values.reduce<number>((sum, v) => sum + (v ?? 0), 0)
      : null;
  const makeTradeBreakdown = (inRange: (ym: number) => boolean): TradeProgressRow[] =>
    PROCESS_TRADES.map((trade) => ({
      labelKey: trade.labelKey,
      plan: sumOrNull(
        cbMonthly
          .filter((row) => row.item === trade.item && inRange(row.year * 12 + row.month - 1))
          .map((row) => row.plan),
      ),
      actual: sumOrNull(
        (detail?.outsourcing ?? [])
          .filter(
            (row) =>
              (row.tradeGroup === "공통" ? "대공종" : row.tradeGroup) === trade.tradeGroup &&
              inRange(row.year * 12 + row.month - 1),
          )
          .map((row) => row.thisMonth),
      ),
    }));
  const tradeMonthlyBreakdown =
    refYm == null ? [] : makeTradeBreakdown((ym) => ym === refYm);
  const tradeCumulativeBreakdown =
    refYm == null ? [] : makeTradeBreakdown((ym) => ym <= refYm);

  // 공정 카드(ProgressSection)의 계획/실적 금액 —ConstructionProgressTab(Progress 탭)의
  // costPlanAmount/costActualAmount와 동일하게, 기준월의 costBudgetMonthly 전체 행(항목 필터 없음)을
  // 합산한다. Progress 탭에 보이는 금액과 일치시키기 위한 계산으로, 위 statusCostMonthlyPlan/Actual
  // (Status 표 원가 판정용, 5개 예산 항목 중 Plan이 있는 것만 합산)과는 다른 수치다.
  const referenceCostRows = (detail?.costBudgetMonthly ?? []).filter(
    (row) => row.year === REPORT_YEAR && row.month === resolvedMonth,
  );
  const progressCardPlanAmount =
    referenceCostRows.some((row) => row.plan != null)
      ? referenceCostRows.reduce<number>((sum, row) => sum + (row.plan ?? 0), 0)
      : null;
  const progressCardActualAmount =
    referenceCostRows.some((row) => row.actual != null)
      ? referenceCostRows.reduce<number>((sum, row) => sum + (row.actual ?? 0), 0)
      : null;

  const statusRows: StatusRowData[] = [
    {
      category: "공정",
      type: "월",
      plan: latestProg?.planPct ?? null,
      actual: latestProg?.actualPct ?? null,
    },
    {
      category: "공정",
      type: "누계",
      plan: latestProg?.planCumPct ?? null,
      actual: latestProg?.actualCumPct ?? null,
    },
    { category: "매출", type: "월", plan: salesMonthPlan, actual: salesMonthActual },
    {
      category: "매출",
      type: "누계",
      plan: salesCumPlan > 0 ? salesCumPlan : null,
      actual: cumRev > 0 ? cumRev : null,
    },
    {
      category: "원가",
      type: "월",
      plan: statusCostMonthlyPlan,
      actual: statusCostMonthlyActual,
    },
    {
      category: "원가",
      type: "누계",
      plan: statusCostCumulativePlan,
      actual: statusCostCumulativeActual,
    },
    {
      category: "자금",
      type: "월",
      plan: salesMonthActual,
      actual: cashMonthIn,
    },
    {
      category: "자금",
      type: "누계",
      plan: overallCumRev > 0 ? overallCumRev : null,
      actual: cashIn > 0 ? cashIn : null,
    },
  ];

  // ── Misc ──────────────────────────────────────────────────────────────────
  const contractAmount = detail?.overview?.contractAmount ?? null;

  const latestMonthLabel =
    latestActualMonth != null
      ? `'${String(REPORT_YEAR).slice(2)}.${String(latestActualMonth).padStart(2, "0")}`
      : null;

  const monthSelectStyle: React.CSSProperties = {
    fontSize: "12px",
    border: `1px solid ${CARD_BORDER}`,
    borderRadius: "4px",
    padding: "2px 6px",
    color: INK_BODY,
    cursor: "pointer",
    backgroundColor: "#fff",
  };
  const reportCaptureId = "project-report-capture";
  const handleReportExport = async () => {
    if (isExporting) return;
    await runProjectReportExport({
      exportAction: () =>
        exportProjectReportPdf({
          elementId: reportCaptureId,
          projectName,
          reportYear: REPORT_YEAR,
          reportMonth: resolvedMonth,
        }),
      setExporting: setIsExporting,
      setError: setExportError,
    });
  };

  // ── Render ────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div
        style={{
          ...cardStyle,
          padding: "40px",
          textAlign: "center",
          fontSize: "13px",
          color: INK_MUTED,
        }}
      >
        {t("common:loading")}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      {/* ── Header ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "4px 2px",
          flexWrap: "wrap",
          gap: "8px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span
            style={{
              fontSize: "14px",
              fontWeight: 700,
              color: INK_NAVY,
              letterSpacing: "0.02em",
            }}
          >
            {t("projectReportTab:title")}
          </span>
          <Button
            type="button"
            size="sm"
            onClick={handleReportExport}
            disabled={isExporting}
            aria-label={isExporting ? t("projectReportTab:exportAriaGenerating") : t("projectReportTab:exportAriaExport")}
          >
            {isExporting ? (
              <Loader2 aria-hidden="true" className="animate-spin" />
            ) : (
              <FileDown aria-hidden="true" />
            )}
            {isExporting ? t("projectReportTab:exporting") : t("projectReportTab:exportButton")}
          </Button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "12px", color: INK_BODY, fontWeight: 600 }}>{t("common:baseMonth")}:</span>
          <select
            value={selectedMonth ?? ""}
            onChange={(e) =>
              onSelectedMonthChange(e.target.value === "" ? null : Number(e.target.value))
            }
            style={monthSelectStyle}
          >
            <option value="">
              {t("overviewTab:latestMonth")}{latestMonthLabel ? ` (${latestMonthLabel})` : ""}
            </option>
            {/* 실적이 마감되지 않은 월(latestActualMonth 이후)은 선택 목록에서 제외 —
                계획 데이터가 실적 계산에 섞이는 것을 방지. */}
            {Array.from({ length: maxSelectable }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>
                {`'${String(REPORT_YEAR).slice(2)}.${String(m).padStart(2, "0")}`}
              </option>
            ))}
          </select>
        </div>
      </div>
      {exportError && (
        <div role="alert" style={{ fontSize: "12px", color: "var(--destructive)" }}>
          {exportError}
        </div>
      )}
      <div
        id={reportCaptureId}
        data-project-report-page="report"
        style={{ display: "flex", flexDirection: "column", gap: "8px" }}
      >
        {/* ── Row 1: 공정 | 매출 | 현황 표 ── */}
        <div style={reportGrid("240px")}>
          <ProgressSection
            progRows={progRows}
            resolvedMonth={resolvedMonth}
            startDate={detail?.overview?.startDate}
            endDate={detail?.overview?.endDate}
            monthlyPlanAmount={progressCardPlanAmount}
            monthlyActualAmount={progressCardActualAmount}
            tradeMonthly={tradeMonthlyBreakdown}
            tradeCumulative={tradeCumulativeBreakdown}
          />
          <SalesSection
            planMonths={planMonths}
            actualMonths={revMonths}
            resolvedMonth={resolvedMonth}
            allSalesMonths={detail?.canonicalSalesMonthly ?? []}
            contractAmount={detail?.overview?.contractAmount ?? null}
          />
          <StatusTableSection
            rows={statusRows}
            costBreakdown={costExecution.cumulativeBreakdown}
          />
        </div>
        {/* ── Row 2: 원가 | 자금 | 코멘트 ── */}
        <div style={reportGrid("240px")}>
          <CostSection budgetRows={allBudgetRows} />
          <FundsSection
            cashIn={cashIn}
            cashOut={cashOut}
            contractAmount={contractAmount}
            cumRev={overallCumRev}
          />
          <div style={cardStyle}>
            <div style={{ ...sectionTitle, marginBottom: "8px" }}>{t("projectReportTab:issuesTitle")}</div>
            <ProjectCommentPanel projectName={projectName} tab="budget" showHeader={false} />
          </div>
        </div>
      </div>
    </div>
  );
}
