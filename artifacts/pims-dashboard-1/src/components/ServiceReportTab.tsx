import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { FileDown, Loader2 } from "lucide-react";
import { Button } from "@workspace/aqua-glass/components/ui/button";
import { ProjectCommentPanel } from "./ProjectCommentPanel";
import { useProjectDetail, fmtPct } from "../lib/projectDetailData";
import {
  useGetCashflowMonthly,
  getGetCashflowMonthlyQueryKey,
} from "@workspace/api-client-react";
import { getMrCashflowRef } from "../data/mrProjectLinks";
import { useMoney } from "../lib/displayUnit";
import { chartTheme } from "../lib/chartTheme";
import { REPORT_YEAR } from "../lib/mgmtreportData";
import { maxSelectableMonth } from "../lib/monthRange";
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
  CARD_BORDER,
} from "../lib/uiTokens";

const DASH = "-";

const monthSelectStyle: React.CSSProperties = {
  fontSize: "12px",
  border: `1px solid ${CARD_BORDER}`,
  borderRadius: "4px",
  padding: "2px 6px",
  color: INK_BODY,
  cursor: "pointer",
  backgroundColor: "#fff",
};

/** 'YYYY-MM-DD...' → 'YYYY-MM-DD' / null·undefined → "-" */
function fmtDate(d: string | null | undefined): string {
  if (!d) return DASH;
  return d.slice(0, 10);
}

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

/** 용역 보고서의 기본 기준월 = 달력 기준 마감 규칙상 가장 최근 마감월(maxSelectableMonth — M월은
 * M+2월 13일부터 마감). 시공 보고서/다른 탭의 기준월과 같은 값이다.
 *
 * 예전엔 "매출 실적이 0이 아닌 마지막 달"을 기준월로 썼는데, 용역은 매출이 특정 달에만 띄엄띄엄
 * 발생하는 경우가 많아(예: K2CT1 프리콘 — '26.07에만 매출) 마감월이 '26.08인데도 기준월이 '26.07로
 * 뒤처져 보였다(실사용자 보고). 매출이 없는 달도 "그 달 실적 0"이 정상 결과이므로 마감월을 그대로
 * 쓴다. asOfMonth(데이터 입력 탭 수기 입력)는 갱신이 안 된 채 과거 값으로 남아 있는 경우가 많아
 * 기준월을 다시 뒤로 끌어내리므로 쓰지 않는다. 다른 달은 기준월 선택 박스에서 고를 수 있다.
 * 인자는 호출부 호환용으로만 남겨둔다. */
export function resolveLatestServiceReportMonth(_args?: {
  asOfMonth?: string | null;
  revenueActuals?: Array<number | null>;
}): number {
  return maxSelectableMonth();
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
  selectedMonth,
  onSelectedMonthChange,
  onResolvedMonthChange,
}: {
  projectName: string;
  selectedMonth: number | null;
  onSelectedMonthChange: (month: number | null) => void;
  onResolvedMonthChange: (month: number | null) => void;
}) {
  const { t } = useTranslation(["serviceReportTab", "projectReportTab", "projectDataEntryTab", "overviewTab", "common"]);
  const { detail, isLoading } = useProjectDetail(projectName);
  const { fmtVnd, unitLabel } = useMoney();
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const overview = detail?.overview;
  const salesRows = detail?.canonicalSalesMonthly ?? [];
  const cashRows = detail?.cashflow ?? [];

  const reportSales = salesRows.filter((row) => row.year === REPORT_YEAR);
  const revMonths: (number | null)[] = Array.from(
    { length: 12 },
    (_, index) => reportSales.find((row) => row.month === index + 1)?.actual ?? null,
  );
  const latestActualMonth = resolveLatestServiceReportMonth({
    asOfMonth: overview?.asOfMonth,
    revenueActuals: revMonths,
  });
  // 시공 ProjectReportTab과 동일한 원칙 — 실적이 있는 가장 최근 월(latestActualMonth)까지만 선택
  // 가능하게 해서, 아직 마감 전인 당월/향후월의 계획 데이터가 실적 계산에 섞이는 것을 방지한다.
  const maxSelectable = latestActualMonth ?? maxSelectableMonth();
  const resolvedMonth = selectedMonth != null ? Math.min(selectedMonth, maxSelectable) : latestActualMonth ?? maxSelectableMonth();
  useEffect(() => {
    onResolvedMonthChange(resolvedMonth);
  }, [onResolvedMonthChange, resolvedMonth]);

  const monthIndex = REPORT_YEAR * 12 + resolvedMonth - 1;
  const throughReference = <T extends { year: number; month: number }>(rows: T[]) =>
    rows.filter((row) => row.year * 12 + row.month - 1 <= monthIndex);
  const atReference = <T extends { year: number; month: number }>(rows: T[]) =>
    rows.filter((row) => row.year === REPORT_YEAR && row.month === resolvedMonth);

  const monthSales = atReference(salesRows);
  // Status 상태등 규칙(연 누계 실적 >= 연 누계 계획)은 "연 누계"이지, 이전 연도까지 합친 전체 누계가
  // 아니다 — 시공 쪽 ProjectReportTab(reportSales)과 동일하게 REPORT_YEAR로 먼저 필터링한다.
  const cumSales = throughReference(reportSales);
  // 자금: 자금 탭(ServiceCashflowTab)과 같은 우선순위 — 데이터 입력 탭에서 저장한 pd_cashflow_monthly
  // 행이 있으면 그것을, 없으면 자금수지 Excel(cf_*, getMrCashflowRef 매핑) 값을 쓴다. 예전엔 pd 행만
  // 읽어서, pd 자금 데이터가 없는 대부분의 용역 현장(자금 탭에는 cf_* 값이 정상 표시됨)에서 보고서
  // 자금 카드/현황 "자금" 행이 0 또는 "-"로 나왔다(실사용자 보고). 전체 누계이므로 착공월부터 조회한다.
  const cfRef = getMrCashflowRef(projectName);
  const cfStart = /^(\d{4})-(\d{1,2})/.exec(overview?.startDate ?? "");
  const cfStartIdx = cfStart
    ? Number(cfStart[1]) * 12 + Number(cfStart[2]) - 1
    : (REPORT_YEAR - 5) * 12;
  const cfParams = {
    projectName: cfRef?.name ?? "",
    division: cfRef?.division,
    fromYear: Math.floor(Math.min(cfStartIdx, monthIndex) / 12),
    fromMonth: (Math.min(cfStartIdx, monthIndex) % 12) + 1,
    months: Math.min(120, Math.max(1, monthIndex - Math.min(cfStartIdx, monthIndex) + 1)),
  };
  const cfQ = useGetCashflowMonthly(cfParams, {
    query: {
      enabled: cfRef != null && cashRows.length === 0,
      queryKey: getGetCashflowMonthlyQueryKey(cfParams),
    },
  });
  const cashSourceRows =
    cashRows.length > 0
      ? cashRows
      : (cfQ.data?.points ?? []).map((p) => ({
          year: Number(p.month.slice(0, 4)),
          month: Number(p.month.slice(5, 7)),
          cashIn: p.cashIn ?? null,
          cashOut: p.cashOut ?? null,
        }));
  const monthCash = atReference(cashSourceRows);
  const cumCash = throughReference(cashSourceRows);

  const salesMonthPlan = sumNullable(monthSales, (row) => row.plan);
  const salesMonthActual = sumNullable(monthSales, (row) => row.actual);
  const salesCumPlan = sumNullable(cumSales, (row) => row.plan);
  const salesCumActual = sumNullable(cumSales, (row) => row.actual);
  // 전체 누계(이전 연도 실적 포함) — Funds 카드의 "Cumulative Revenue"는 "연 누계"가 아니라 프로젝트
  // 시작부터의 전체 누계 매출과 일치해야 한다(시공 ProjectReportTab의 overallCumRev와 동일한 개념).
  const overallSalesCumActual = sumNullable(throughReference(salesRows), (row) => row.actual);
  const salesPlanMonths = Array.from({ length: 12 }, (_, index) =>
    sumNullable(
      reportSales.filter((row) => row.month === index + 1),
      (row) => row.plan,
    ),
  );
  const salesActualMonths = Array.from({ length: 12 }, (_, index) =>
    sumNullable(
      reportSales.filter((row) => row.month === index + 1),
      (row) => row.actual,
    ),
  );
  const cashMonthIn = sumNullable(monthCash, (row) => row.cashIn);
  const cashMonthOut = sumNullable(monthCash, (row) => row.cashOut);
  const cashCumIn = sumNullable(cumCash, (row) => row.cashIn);
  const cashCumOut = sumNullable(cumCash, (row) => row.cashOut);

  // 시공 ProjectReportTab과 동일한 원칙 — Outsourcing 포함 5개 항목 모두 pd_outsourcing(pd_outsourcing
  // 계약 테이블)을 다시 집계하지 않고 costBudget(스냅샷)/costBudgetMonthly(월별 그리드)만 쓴다(데이터
  // 입력 탭 actualAmount()/"Budget/Actual của cả 5 dòng (kể cả Outsourcing) đọc thẳng từ pd_cost_budget
  // ... không còn tự cộng từ bảng Ngoài giao (pd_outsourcing) nữa"와 동일 규칙) — 예전엔 pd_outsourcing에서
  // 다시 집계해서 데이터 입력 탭 "Budget Execution Status" 표의 숫자와 몇 배씩 어긋났다(실제로 발견됨:
  // Report 탭 Execution이 Data Entry의 Cumulative가 아니라 Monthly 값과 같아지는 등).
  //
  // "계획(plan)"은 costBudgetMonthly를 기준월까지 직접 누계해서 뽑는다 — costBudget.plan 스냅샷을
  // 그대로 읽으면 데이터 입력 탭에서 재계산/저장하기 전까지 값이 비어(null) 있어(실제 발견된 문제:
  // Indirect Cost/Contingency가 "-"로 표시됨), 방금 입력한 월별 계획과 어긋난다.
  const budgetRows = detail?.costBudget ?? [];
  const findBudget = (name: string) =>
    budgetRows.find((r) => r.item.trim().toLowerCase() === name.toLowerCase()) ?? null;
  const cbMonthly = detail?.costBudgetMonthly ?? [];
  // 실적(pd_cost_budget.actual)이 프로젝트 시작부터의 전체 누계이므로 계획도 "프로젝트 시작 ~ 기준월"
  // 전체 누계로 합산한다 — 예전엔 REPORT_YEAR만 합산해서 이전 연도 계획이 빠져 집행률이 폭주했다
  // (시공 ProjectReportTab cumPlanFor와 동일 수정).
  const cumPlanFor = (item: string): number | null => {
    const rows = cbMonthly.filter(
      (row) => row.item === item && row.year * 12 + row.month - 1 <= monthIndex,
    );
    return rows.some((row) => row.plan != null)
      ? rows.reduce<number>((sum, row) => sum + (row.plan ?? 0), 0)
      : null;
  };
  // 실적도 기준월까지 월별 실적(costBudgetMonthly.actual)을 누계한다 — 스냅샷(pd_cost_budget.actual)은
  // 기준월 이후 실적이 섞이고 기준월을 바꿔도 안 변한다(시공 ProjectReportTab cumActualFor와 동일).
  // 월별 실적이 없는 항목만 스냅샷 폴백.
  const cumActualFor = (item: string): number | null => {
    const itemRows = cbMonthly.filter((row) => row.item === item);
    if (!itemRows.some((row) => row.actual != null && row.actual !== 0)) return findBudget(item)?.actual ?? null;
    return itemRows
      .filter((row) => row.year * 12 + row.month - 1 <= monthIndex)
      .reduce<number>((sum, row) => sum + (row.actual ?? 0), 0);
  };
  const BUDGET_ITEM_NAMES = ["Outsourcing", "Common", "Expense 1", "Expense 2", "Contingency"] as const;
  const budgetItems = BUDGET_ITEM_NAMES.map((item) => {
    const row = findBudget(item);
    return {
      label: item === "Outsourcing" ? "외주" : item === "Contingency" ? "예비비" : item,
      plan: cumPlanFor(item) ?? row?.budget ?? null,
      actual: cumActualFor(item),
    };
  });
  // 계획이 한 번도 입력된 적 없는 항목(예: 외주)까지 포함해 합산하면, 그 항목의 실적만 분자에 더해지고
  // 분모(계획)엔 반영되지 않아 달성률이 비정상적으로 폭주한다 — 계획이 있는 항목만 비교한다(시공
  // ProjectReportTab의 동일 문제 수정과 같은 원칙).
  const comparableBudgetItems = budgetItems.filter((row) => row.plan != null);
  const budgetPlan = sumNullable(comparableBudgetItems, (row) => row.plan);
  const budgetActual = sumNullable(comparableBudgetItems, (row) => row.actual);
  const reportBudgetRows = BUDGET_ITEM_NAMES.map((item) => {
    const row = findBudget(item);
    return {
      item:
        item === "Outsourcing"
          ? "외주"
          : item === "Expense 1"
            ? "경비1"
            : item === "Expense 2"
              ? "경비2"
              : item === "Contingency"
                ? "예비비"
                : item,
      budget: row?.budget ?? null,
      plan: cumPlanFor(item),
      actual: cumActualFor(item),
    };
  }).filter((row) => row.budget != null || row.plan != null || row.actual != null);
  const durationMonths = (() => {
    const start = /^(\d{4})-(\d{1,2})/.exec(overview?.startDate ?? "");
    const end = /^(\d{4})-(\d{1,2})/.exec(overview?.endDate ?? "");
    return start && end ? (Number(end[1]) - Number(start[1])) * 12 + Number(end[2]) - Number(start[2]) + 1 : null;
  })();
  const contractConditions = overview?.paymentTerms ?? null;
  // 시공(Construction) 보고서와 동일한 StatusTableSection을 그대로 재사용 — 구분(매출/원가/자금)별
  // 월/누계 계획·실적과 규칙 기반 상태등을 표시한다. 용역은 공정(진행률) 개념이 없어 "공정" 행은
  // 아예 넣지 않고, 원가의 "월" 행은 월별 원가 계획 데이터 소스가 따로 없어 비워둔다(누계만 채용).
  const positiveOrNull = (value: number | null) => (value != null && value > 0 ? value : null);
  const statusRows: StatusRowData[] = [
    { category: "매출", type: "월", plan: salesMonthPlan, actual: salesMonthActual },
    { category: "매출", type: "누계", plan: positiveOrNull(salesCumPlan), actual: positiveOrNull(salesCumActual) },
    { category: "원가", type: "월", plan: null, actual: null },
    { category: "원가", type: "누계", plan: budgetPlan, actual: budgetActual },
    { category: "자금", type: "월", plan: salesMonthActual, actual: cashMonthIn },
    { category: "자금", type: "누계", plan: positiveOrNull(overallSalesCumActual), actual: positiveOrNull(cashCumIn) },
  ];
  const costBreakdownRows: CostBreakdownRow[] = budgetItems.map((row) => ({
    label: row.label,
    plan: row.plan,
    actual: row.actual,
  }));
  const latestMonthLabel =
    latestActualMonth != null
      ? `'${String(REPORT_YEAR).slice(2)}.${String(latestActualMonth).padStart(2, "0")}`
      : null;
  const reportCaptureId = "service-report-capture";
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

  if (isLoading) {
    return <div style={{ ...cardStyle, padding: "40px", textAlign: "center", color: INK_MUTED }}>{t("common:loading")}</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px", flexWrap: "wrap", padding: "2px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "14px", fontWeight: 700, color: INK_NAVY }}>{t("serviceReportTab:title")}</span>
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
            onChange={(e) => onSelectedMonthChange(e.target.value === "" ? null : Number(e.target.value))}
            style={monthSelectStyle}
          >
            <option value="">
              {t("overviewTab:latestMonth")}{latestMonthLabel ? ` (${latestMonthLabel})` : ""}
            </option>
            {Array.from({ length: maxSelectable }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>
                {`'${String(REPORT_YEAR).slice(2)}.${String(m).padStart(2, "0")}`}
              </option>
            ))}
          </select>
          <span style={{ fontSize: "11px", color: INK_MUTED }}>{unitLabel}</span>
        </div>
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
          <div style={sectionTitle}>{t("serviceReportTab:overviewTitle")}</div>
          <MetricRow label={t("serviceReportTab:pjLabel")} value={projectName} strong />
          <MetricRow label={t("projectDataEntryTab:performanceStartDate")} value={fmtDate(overview?.startDate)} />
          <MetricRow label={t("projectDataEntryTab:performanceEndDate")} value={fmtDate(overview?.endDate)} />
          <MetricRow label={t("serviceReportTab:performancePeriodLabel")} value={durationMonths != null ? `${durationMonths}` : DASH} />
          <MetricRow label={t("serviceReportTab:clientLabel")} value={overview?.client ?? DASH} />
          <MetricRow label={t("projectDataEntryTab:scopeOfWork")} value={overview?.scope ?? DASH} />
          <MetricRow label={t("serviceReportTab:contractAmountLabel")} value={fmtVnd(overview?.contractAmount)} />
          <MetricRow label={t("serviceReportTab:collectionConditionLabel")} value={contractConditions ?? DASH} />
        </div>

        <SalesSection
          planMonths={salesPlanMonths}
          actualMonths={salesActualMonths}
          resolvedMonth={resolvedMonth}
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
          cumRev={overallSalesCumActual ?? 0}
        />

        <div style={cardStyle}>
          <div style={sectionTitle}>{t("projectReportTab:issuesTitle")}</div>
          <ProjectCommentPanel projectName={projectName} tab="service" showHeader={false} />
        </div>
      </div>
      </div>
    </div>
  );
}