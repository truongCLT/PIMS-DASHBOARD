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
import type { StatusRowData } from "./project-report/reportTypes";
import {
  exportProjectReportPdf,
  runProjectReportExport,
} from "../lib/exportProjectReport";

const PROCESS_COST_PLAN_ITEMS = new Set([
  "외주 건축",
  "외주 기계",
  "외주 전기",
  "외주 토목",
  "외주 조경",
  "외주 경비",
  "Common",
  "Expense 1",
  "Expense 2",
]);

const PROCESS_COST_GROUPS = [
  { label: "대공종", items: ["Common"] },
  { label: "건축", items: ["외주 건축"] },
  { label: "기계", items: ["외주 기계"] },
  { label: "전기", items: ["외주 전기"] },
  { label: "토목", items: ["외주 토목"] },
  { label: "조경", items: ["외주 조경"] },
  { label: "경비", items: ["외주 경비", "Expense 1", "Expense 2"] },
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
  const pdCashPoints = (detail?.cashflow ?? [])
    .filter((c) => c.year === REPORT_YEAR)
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
  const cb = detail?.costBudget ?? [];
  const findCb = (name: string) =>
    cb.find((r) => r.item.trim().toLowerCase() === name.toLowerCase()) ?? null;
  const common = findCb("Common");
  const expense1 = findCb("Expense 1");
  const expense2 = findCb("Expense 2");
  const contingency = findCb("Contingency");

  const outRows = detail?.outsourcing ?? [];
  const outBudget = outRows.some((r) => r.budget != null)
    ? outRows.reduce<number>((a, r) => a + (r.budget ?? 0), 0)
    : null;
  const outPlan = outRows.some((r) => r.executedBudget != null)
    ? outRows.reduce<number>((a, r) => a + (r.executedBudget ?? 0), 0)
    : null;
  const outActual = outRows.some((r) => r.accum != null || r.resolved != null)
    ? outRows.reduce<number>((a, r) => a + (r.accum ?? r.resolved ?? 0), 0)
    : null;

  const allBudgetRows = [
    { item: "외주", budget: outBudget, plan: outPlan, actual: outActual },
    {
      item: "Common",
      budget: common?.budget ?? null,
      plan: common?.plan ?? null,
      actual: common?.actual ?? null,
    },
    {
      item: "경비1",
      budget: expense1?.budget ?? null,
      plan: expense1?.plan ?? null,
      actual: expense1?.actual ?? null,
    },
    {
      item: "경비2",
      budget: expense2?.budget ?? null,
      plan: expense2?.plan ?? null,
      actual: expense2?.actual ?? null,
    },
    {
      item: "예비비",
      budget: contingency?.budget ?? null,
      plan: contingency?.plan ?? null,
      actual: contingency?.actual ?? null,
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
  // 현황 표의 "원가" 달성률(%)은 costExecution.*Plan/*Actual(항목별 절대 금액 합계, 공정 카드 툴팁용)을
  // 그대로 쓰면 안 된다 — "외주 건축"/"외주 경비"처럼 Plan이 한 번도 입력된 적 없는 항목까지 실적 합계에
  // 포함되면서, 그 항목의 실적만 분자에 더해지고 분모(계획)에는 전혀 반영되지 않아 달성률이 수십만%로
  // 폭주한다(실제로 발생했던 문제). 상태등 판정(costCategoryLevel)과 동일하게 "계획이 있는 항목만" 비교한
  // 별도 합계를 만들어 현황 표 표시에만 사용한다.
  const comparableCostRows = (rows: typeof costPlanRows) => rows.filter((row) => row.plan != null);
  const statusCostMonthlyPlan = sumNullable(comparableCostRows(selectedCostRows), "plan");
  const statusCostMonthlyActual = sumNullable(comparableCostRows(selectedCostRows), "actual");
  const statusCostCumulativePlan = sumNullable(comparableCostRows(costPlanRows), "plan");
  const statusCostCumulativeActual = sumNullable(comparableCostRows(costPlanRows), "actual");

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
            costExecution={costExecution}
            startDate={detail?.overview?.startDate}
            endDate={detail?.overview?.endDate}
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
