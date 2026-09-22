import React, { useState } from "react";
import { FileDown, Loader2 } from "lucide-react";
import { Button } from "@workspace/aqua-glass/components/ui/button";
import { ProjectCommentPanel } from "./ProjectCommentPanel";
import { useProjectDetail, fmtPct } from "../lib/projectDetailData";
import { useMoney } from "../lib/displayUnit";
import { chartTheme } from "../lib/chartTheme";
import { SalesSection } from "./project-report/SalesSection";
import { CostSection } from "./project-report/CostSection";
import { FundsSection } from "./project-report/FundsSection";
import { StatusTableSection } from "./project-report/StatusTableSection";
import type { StatusRowData, CostBreakdownRow } from "./project-report/reportTypes";
import {
  exportProjectReportPdf,
  runProjectReportExport,
} from "../lib/exportProjectReport";
import {
  cardStyle,
  sectionTitle,
  INK_NAVY,
  INK_BODY,
  INK_MUTED,
  DIVIDER,
  TABLE_HEADER_BG,
} from "../lib/uiTokens";

const DASH = "-";

function sumNullable<T>(rows: T[], pick: (row: T) => number | null | undefined) {
  return rows.some((row) => pick(row) != null)
    ? rows.reduce((sum, row) => sum + (pick(row) ?? 0), 0)
    : null;
}

function MetricRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", padding: "4px 0", borderBottom: `1px solid ${DIVIDER}` }}>
      <span style={{ fontSize: "11px", color: INK_MUTED }}>{label}</span>
      <span style={{ fontSize: "12px", fontWeight: strong ? 700 : 600, color: strong ? INK_NAVY : INK_BODY, textAlign: "right" }}>{value}</span>
    </div>
  );
}

function PlanActualBar({ plan, actual }: { plan: number | null; actual: number | null }) {
  const max = Math.max(plan ?? 0, actual ?? 0, 1);
  return (
    <div style={{ display: "grid", gridTemplateColumns: "32px 1fr 42px", gap: "5px", alignItems: "center", marginTop: "4px" }}>
      <span style={{ fontSize: "10px", color: INK_MUTED }}>계획</span>
      <div style={{ height: "8px", background: TABLE_HEADER_BG, borderRadius: "4px", overflow: "hidden" }}>
        <div style={{ width: `${((plan ?? 0) / max) * 100}%`, height: "100%", background: chartTheme.outflowRed }} />
      </div>
      <span style={{ fontSize: "10px", textAlign: "right", color: INK_MUTED }}>{fmtPct(plan)}</span>
      <span style={{ fontSize: "10px", color: INK_MUTED }}>실적</span>
      <div style={{ height: "8px", background: TABLE_HEADER_BG, borderRadius: "4px", overflow: "hidden" }}>
        <div style={{ width: `${((actual ?? 0) / max) * 100}%`, height: "100%", background: chartTheme.planBlue }} />
      </div>
      <span style={{ fontSize: "10px", textAlign: "right", color: INK_MUTED }}>{fmtPct(actual)}</span>
    </div>
  );
}

export function ServiceReportTab({
  projectName,
  referenceYear,
  referenceMonth,
}: {
  projectName: string;
  referenceYear: number;
  referenceMonth: number;
}) {
  const { detail, isLoading } = useProjectDetail(projectName);
  const { fmtVnd, unitLabel } = useMoney();
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  if (isLoading) return <div style={{ ...cardStyle, padding: "40px", textAlign: "center", color: INK_MUTED }}>불러오는 중...</div>;

  const overview = detail?.overview;
  const monthIndex = referenceYear * 12 + referenceMonth - 1;
  const throughReference = <T extends { year: number; month: number }>(rows: T[]) =>
    rows.filter((row) => row.year * 12 + row.month - 1 <= monthIndex);
  const atReference = <T extends { year: number; month: number }>(rows: T[]) =>
    rows.filter((row) => row.year === referenceYear && row.month === referenceMonth);

  const salesRows = detail?.canonicalSalesMonthly ?? [];
  const cashRows = detail?.cashflow ?? [];
  const progressRows = detail?.progress ?? [];
  const monthSales = atReference(salesRows);
  const cumSales = throughReference(salesRows);
  const monthCash = atReference(cashRows);
  const cumCash = throughReference(cashRows);
  const monthProgress = atReference(progressRows)[0];

  const salesMonthPlan = sumNullable(monthSales, (row) => row.plan);
  const salesMonthActual = sumNullable(monthSales, (row) => row.actual);
  const salesCumPlan = sumNullable(cumSales, (row) => row.plan);
  const salesCumActual = sumNullable(cumSales, (row) => row.actual);
  const salesPlanMonths = Array.from({ length: 12 }, (_, index) =>
    sumNullable(
      salesRows.filter((row) => row.year === referenceYear && row.month === index + 1),
      (row) => row.plan,
    ),
  );
  const salesActualMonths = Array.from({ length: 12 }, (_, index) =>
    sumNullable(
      salesRows.filter((row) => row.year === referenceYear && row.month === index + 1),
      (row) => row.actual,
    ),
  );
  const cashMonthIn = sumNullable(monthCash, (row) => row.cashIn);
  const cashMonthOut = sumNullable(monthCash, (row) => row.cashOut);
  const cashCumIn = sumNullable(cumCash, (row) => row.cashIn);
  const cashCumOut = sumNullable(cumCash, (row) => row.cashOut);

  const budgetRows = detail?.costBudget ?? [];
  const outsourcingRows = detail?.outsourcing ?? [];
  const budgetItems = [
    {
      label: "외주",
      plan: sumNullable(outsourcingRows, (row) => row.executedBudget),
      actual: sumNullable(outsourcingRows, (row) => row.accum),
    },
    ...["Common", "Expense 1", "Expense 2", "Contingency"].map((item) => {
      const row = budgetRows.find((entry) => entry.item === item);
      return { label: item === "Contingency" ? "예비비" : item, plan: row?.plan ?? row?.budget ?? null, actual: row?.actual ?? null };
    }),
  ];
  const budgetPlan = sumNullable(budgetItems, (row) => row.plan);
  const budgetActual = sumNullable(budgetItems, (row) => row.actual);
  const reportBudgetRows = [
    {
      item: "외주",
      budget: sumNullable(outsourcingRows, (row) => row.budget),
      plan: sumNullable(outsourcingRows, (row) => row.executedBudget),
      actual: sumNullable(outsourcingRows, (row) => row.accum ?? row.resolved),
    },
    ...["Common", "Expense 1", "Expense 2", "Contingency"].map((item) => {
      const row = budgetRows.find((entry) => entry.item === item);
      return {
        item:
          item === "Expense 1"
            ? "경비1"
            : item === "Expense 2"
              ? "경비2"
              : item === "Contingency"
                ? "예비비"
                : item,
        budget: row?.budget ?? null,
        plan: row?.plan ?? null,
        actual: row?.actual ?? null,
      };
    }),
  ].filter((row) => row.budget != null || row.plan != null || row.actual != null);
  const durationMonths = (() => {
    const start = /^(\d{4})-(\d{1,2})/.exec(overview?.startDate ?? "");
    const end = /^(\d{4})-(\d{1,2})/.exec(overview?.endDate ?? "");
    return start && end ? (Number(end[1]) - Number(start[1])) * 12 + Number(end[2]) - Number(start[2]) + 1 : null;
  })();
  const contractConditions = detail?.costEstimation?.find((row) => row.kind === "execution")?.note ?? null;
  // 시공(Construction) 보고서와 동일한 StatusTableSection을 그대로 재사용 — 구분(공정/매출/원가/자금)별
  // 월/누계 계획·실적과 규칙 기반 상태등을 표시한다. 용역은 월별 원가 계획 데이터 소스가 따로 없어
  // 원가의 "월" 행은 비워두고(누계만 채용), 나머지는 시공과 동일한 필드 매핑을 쓴다.
  const positiveOrNull = (value: number | null) => (value != null && value > 0 ? value : null);
  const statusRows: StatusRowData[] = [
    { category: "공정", type: "월", plan: monthProgress?.planPct ?? null, actual: monthProgress?.actualPct ?? null },
    { category: "공정", type: "누계", plan: monthProgress?.planCumPct ?? null, actual: monthProgress?.actualCumPct ?? null },
    { category: "매출", type: "월", plan: salesMonthPlan, actual: salesMonthActual },
    { category: "매출", type: "누계", plan: positiveOrNull(salesCumPlan), actual: positiveOrNull(salesCumActual) },
    { category: "원가", type: "월", plan: null, actual: null },
    { category: "원가", type: "누계", plan: budgetPlan, actual: budgetActual },
    { category: "자금", type: "월", plan: salesMonthActual, actual: cashMonthIn },
    { category: "자금", type: "누계", plan: positiveOrNull(salesCumActual), actual: positiveOrNull(cashCumIn) },
  ];
  const costBreakdownRows: CostBreakdownRow[] = budgetItems.map((row) => ({
    label: row.label,
    plan: row.plan,
    actual: row.actual,
  }));
  const reportCaptureId = "service-report-capture";
  const handleReportExport = async () => {
    if (isExporting) return;
    await runProjectReportExport({
      exportAction: () =>
        exportProjectReportPdf({
          elementId: reportCaptureId,
          projectName,
          reportYear: referenceYear,
          reportMonth: referenceMonth,
        }),
      setExporting: setIsExporting,
      setError: setExportError,
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px", flexWrap: "wrap", padding: "2px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "14px", fontWeight: 700, color: INK_NAVY }}>용역 당월 보고서</span>
          <Button
            type="button"
            size="sm"
            onClick={handleReportExport}
            disabled={isExporting}
            aria-label={isExporting ? "보고서 PDF 생성 중" : "보고서 PDF 출력"}
          >
            {isExporting ? (
              <Loader2 aria-hidden="true" className="animate-spin" />
            ) : (
              <FileDown aria-hidden="true" />
            )}
            {isExporting ? "출력 중..." : "보고서 출력"}
          </Button>
        </div>
        <span style={{ fontSize: "11px", color: INK_MUTED }}>기준월 '{String(referenceYear).slice(2)}.{String(referenceMonth).padStart(2, "0")} · {unitLabel}</span>
      </div>
      {exportError && (
        <div role="alert" style={{ fontSize: "12px", color: "var(--destructive)" }}>
          {exportError}
        </div>
      )}

      <div
        id={reportCaptureId}
        data-project-report-page="service"
        style={{ display: "flex", flexDirection: "column", gap: "8px" }}
      >
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "8px" }}>
        <div style={cardStyle}>
          <div style={sectionTitle}>개요</div>
          <MetricRow label="PJ" value={projectName} strong />
          <MetricRow label="수행기간 (개월)" value={durationMonths != null ? `${durationMonths}` : DASH} />
          <MetricRow label="발주처" value={overview?.client ?? DASH} />
          <MetricRow label="도급금액" value={fmtVnd(overview?.contractAmount)} />
          <MetricRow label="수금조건" value={contractConditions ?? DASH} />
        </div>

        <SalesSection
          planMonths={salesPlanMonths}
          actualMonths={salesActualMonths}
          resolvedMonth={referenceMonth}
          allSalesMonths={salesRows}
          contractAmount={overview?.contractAmount ?? null}
        />

        <StatusTableSection rows={statusRows} costBreakdown={costBreakdownRows} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "8px" }}>
        <CostSection budgetRows={reportBudgetRows} />

        <FundsSection
          cashIn={cashCumIn ?? 0}
          cashOut={cashCumOut ?? 0}
          contractAmount={overview?.contractAmount ?? null}
          cumRev={salesCumActual ?? 0}
        />

        <div style={cardStyle}>
          <div style={sectionTitle}>주요 이슈 및 대응방안</div>
          <ProjectCommentPanel projectName={projectName} tab="service" showHeader={false} />
        </div>
      </div>
      </div>
    </div>
  );
}