import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { FileDown, Loader2 } from "lucide-react";
import { Button } from "./ui/button";
import { ProjectCommentPanel } from "./ProjectCommentPanel";
import { useProjectDetail, fmtPct, ratioPct } from "../lib/projectDetailData";
import { useMoney } from "../lib/displayUnit";
import { chartTheme } from "../lib/chartTheme";
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
  SUCCESS_GREEN,
  WARNING_BORDER,
  ACHIEVE_RED,
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

type Signal = "green" | "yellow" | "red" | "none";

function TrafficLight({ signal }: { signal: Signal }) {
  const color =
    signal === "green"
      ? SUCCESS_GREEN
      : signal === "yellow"
        ? WARNING_BORDER
        : signal === "red"
          ? ACHIEVE_RED
          : INK_MUTED;
  const label =
    signal === "green" ? "초록불" : signal === "yellow" ? "노란불" : signal === "red" ? "빨간불" : DASH;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", color, fontWeight: 700, whiteSpace: "nowrap" }}>
      <span style={{ width: "9px", height: "9px", borderRadius: "50%", backgroundColor: color, boxShadow: `0 0 0 2px ${color}20` }} />
      {label}
    </span>
  );
}

export function ServiceReportTab({
  projectName,
  referenceYear,
  referenceMonth,
  krwPerUsd,
}: {
  projectName: string;
  referenceYear: number;
  referenceMonth: number;
  krwPerUsd: number;
}) {
  const { t } = useTranslation(["common", "serviceProjectDashboard", "dashboardHeader"]);
  const { detail, isLoading } = useProjectDetail(projectName);
  const { fmtMoney, unitLabel } = useMoney();
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  if (isLoading) return <div style={{ ...cardStyle, padding: "40px", textAlign: "center", color: INK_MUTED }}>{t("common:loading", "불러오는 중...")}</div>;

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
  const durationMonths = (() => {
    const start = /^(\d{4})-(\d{1,2})/.exec(overview?.startDate ?? "");
    const end = /^(\d{4})-(\d{1,2})/.exec(overview?.endDate ?? "");
    return start && end ? (Number(end[1]) - Number(start[1])) * 12 + Number(end[2]) - Number(start[2]) + 1 : null;
  })();
  const contractConditions = detail?.costEstimation?.find((row) => row.kind === "execution")?.note ?? null;
  const recognized = cashCumIn;
  const receivable = salesCumActual != null && recognized != null ? salesCumActual - recognized : null;

  const planActualSignal = (
    monthPlan: number | null,
    monthActual: number | null,
    cumPlan: number | null,
    cumActual: number | null,
  ): { signal: Signal; condition: string } => {
    if (monthPlan == null || monthActual == null || cumPlan == null || cumActual == null) {
      return { signal: "none", condition: "판정 데이터 없음" };
    }
    if (cumActual < cumPlan) return { signal: "red", condition: "누계 실적 < 누계 계획" };
    if (monthActual < monthPlan) return { signal: "yellow", condition: "누계 달성, 월 실적 < 월 계획" };
    return { signal: "green", condition: "누계 실적 ≥ 누계 계획" };
  };
  const progressSignal = planActualSignal(
    monthProgress?.planPct ?? null,
    monthProgress?.actualPct ?? null,
    monthProgress?.planCumPct ?? null,
    monthProgress?.actualCumPct ?? null,
  );
  const salesSignal = planActualSignal(salesMonthPlan, salesMonthActual, salesCumPlan, salesCumActual);
  const costDeviations = budgetItems
    .filter((row) => row.plan != null && row.plan > 0 && row.actual != null)
    .map((row) => Math.abs(((row.actual! - row.plan!) / row.plan!) * 100));
  const totalCostDeviation =
    budgetPlan != null && budgetPlan > 0 && budgetActual != null
      ? Math.abs(((budgetActual - budgetPlan) / budgetPlan) * 100)
      : null;
  const overFiveCount = costDeviations.filter((value) => value > 5).length;
  const overTwoCount = costDeviations.filter((value) => value > 2 && value <= 5).length;
  const costSignal: { signal: Signal; condition: string; priority: string } =
    totalCostDeviation == null
      ? { signal: "none", condition: "판정 데이터 없음", priority: DASH }
      : overFiveCount > 0
        ? { signal: "red", condition: `${overFiveCount}개 항목 계획 대비 5% 초과`, priority: "우선" }
        : overTwoCount >= 3 || totalCostDeviation > 2
          ? {
              signal: "yellow",
              condition:
                overTwoCount >= 3
                  ? `${overTwoCount}개 항목 계획 대비 2~5% 이격`
                  : `총 원가 계획 대비 ${totalCostDeviation.toFixed(1)}% 이격`,
              priority: "2선",
            }
          : { signal: "green", condition: `총 원가 계획 대비 ${totalCostDeviation.toFixed(1)}% 이격`, priority: "3선" };
  const tenEokKrwInKUsd = 1_000_000_000 / Math.max(krwPerUsd, 1) / 1_000;
  const fundsSignal: { signal: Signal; condition: string } =
    receivable == null
      ? { signal: "none", condition: "판정 데이터 없음" }
      : receivable <= 0
        ? { signal: "green", condition: "채권이 0" }
        : receivable < tenEokKrwInKUsd
          ? { signal: "yellow", condition: "채권이 0~10억" }
          : { signal: "red", condition: "채권이 10억 이상" };
  const statusRows = [
    { label: "공정", ...progressSignal, priority: DASH },
    { label: "매출", ...salesSignal, priority: DASH },
    { label: "원가", ...costSignal },
    { label: "자금", ...fundsSignal, priority: DASH },
  ];
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
          <span style={{ fontSize: "14px", fontWeight: 700, color: INK_NAVY }}>{t("serviceProjectDashboard:reportTitle", "용역 당월 보고서")}</span>
          <Button
            type="button"
            size="sm"
            onClick={handleReportExport}
            disabled={isExporting}
            aria-label={isExporting ? t("common:exporting", "보고서 PDF 생성 중") : t("common:exportReport", "보고서 PDF 출력")}
          >
            {isExporting ? (
              <Loader2 aria-hidden="true" className="animate-spin" />
            ) : (
              <FileDown aria-hidden="true" />
            )}
            {isExporting ? t("common:exporting", "출력 중...") : t("common:exportReport", "보고서 출력")}
          </Button>
        </div>
        <span style={{ fontSize: "11px", color: INK_MUTED }}>{t("dashboardHeader:asOfMonthLabel", "기준월")} '{String(referenceYear).slice(2)}.{String(referenceMonth).padStart(2, "0")} · {unitLabel}</span>
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
          <div style={sectionTitle}>{t("common:overview", "개요")}</div>
          <MetricRow label="PJ" value={projectName} strong />
          <MetricRow label="수행기간 (개월)" value={durationMonths != null ? `${durationMonths}` : DASH} />
          <MetricRow label="발주처" value={overview?.client ?? DASH} />
          <MetricRow label="도급금액" value={fmtMoney(overview?.contractAmount)} />
          <MetricRow label="수금조건" value={contractConditions ?? DASH} />
        </div>

        <div style={cardStyle}>
          <div style={sectionTitle}>{t("common:revenue", "매출")}</div>
          <MetricRow label="월 계획" value={fmtMoney(salesMonthPlan)} />
          <MetricRow label="월 실적(전망)" value={fmtMoney(salesMonthActual)} />
          <MetricRow label="누계 계획" value={fmtMoney(salesCumPlan)} />
          <MetricRow label="누계 실적" value={fmtMoney(salesCumActual)} />
          <MetricRow label="전체 도급액" value={fmtMoney(overview?.contractAmount)} strong />
        </div>

        <div style={{ ...cardStyle, overflowX: "auto" }}>
          <div style={sectionTitle}>{t("common:status", "현황")}</div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "10px" }}>
            <thead>
              <tr>
                <th style={{ padding: "4px", background: TABLE_HEADER_BG }}>{t("common:division", "구분")}</th>
                <th style={{ padding: "4px", background: TABLE_HEADER_BG }}>{t("serviceProjectDashboard:criteriaHeader", "판정 기준")}</th>
                <th style={{ padding: "4px", background: TABLE_HEADER_BG }}>{t("serviceProjectDashboard:signalHeader", "신호등")}</th>
                <th style={{ padding: "4px", background: TABLE_HEADER_BG }}>{t("serviceProjectDashboard:priorityHeader", "우선순위")}</th>
              </tr>
            </thead>
            <tbody>
              {statusRows.map((row) => (
                <tr key={row.label}>
                  <td style={{ padding: "6px 4px", borderBottom: `1px solid ${DIVIDER}`, fontWeight: 700, color: INK_NAVY }}>{row.label}</td>
                  <td style={{ padding: "6px 4px", borderBottom: `1px solid ${DIVIDER}`, color: INK_BODY }}>{row.condition}</td>
                  <td style={{ padding: "6px 4px", borderBottom: `1px solid ${DIVIDER}` }}><TrafficLight signal={row.signal} /></td>
                  <td style={{ padding: "6px 4px", textAlign: "center", borderBottom: `1px solid ${DIVIDER}`, fontWeight: row.priority !== DASH ? 700 : 400 }}>{row.priority}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "8px" }}>
        <div style={cardStyle}>
          <div style={sectionTitle}>{t("common:costOfRevenue", "원가")}</div>
          {budgetItems.map((row) => (
            <div key={row.label} style={{ padding: "3px 0", borderBottom: `1px solid ${DIVIDER}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: INK_BODY }}>
                <span>{row.label}</span>
                <span>{fmtMoney(row.actual)} / {fmtMoney(row.plan)}</span>
              </div>
              <PlanActualBar plan={ratioPct(row.plan, budgetPlan)} actual={ratioPct(row.actual, row.plan)} />
            </div>
          ))}
          <MetricRow label="예산집행 현황" value={`${fmtMoney(budgetActual)} / ${fmtMoney(budgetPlan)}`} strong />
        </div>

        <div style={cardStyle}>
          <div style={sectionTitle}>{t("common:cashFlow", "자금")}</div>
          <MetricRow label="월 입금" value={fmtMoney(cashMonthIn)} />
          <MetricRow label="월 출금" value={fmtMoney(cashMonthOut)} />
          <MetricRow label="누계 입금" value={fmtMoney(cashCumIn)} />
          <MetricRow label="누계 출금" value={fmtMoney(cashCumOut)} />
          <div style={{ marginTop: "8px", fontSize: "11px", fontWeight: 700, color: INK_NAVY }}>{t("common:detailView", "상세보기")}</div>
          <MetricRow label="매출" value={fmtMoney(salesCumActual)} />
          <MetricRow label="인정" value={fmtMoney(recognized)} />
          <MetricRow label="수금 채권" value={fmtMoney(receivable)} strong />
        </div>

        <div style={cardStyle}>
          <div style={sectionTitle}>{t("common:keyIssuesTitle", "주요 이슈 및 대응방안")}</div>
          <ProjectCommentPanel projectName={projectName} tab="service" showHeader={false} />
        </div>
      </div>
      </div>
    </div>
  );
}