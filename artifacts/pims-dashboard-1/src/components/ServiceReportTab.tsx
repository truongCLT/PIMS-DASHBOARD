import React from "react";
import { ProjectCommentPanel } from "./ProjectCommentPanel";
import { useProjectDetail, fmtPct, ratioPct } from "../lib/projectDetailData";
import { useMoney } from "../lib/displayUnit";
import { chartTheme } from "../lib/chartTheme";
import {
  cardStyle,
  sectionTitle,
  INK_NAVY,
  INK_BODY,
  INK_MUTED,
  DIVIDER,
  TABLE_HEADER_BG,
  SUCCESS_GREEN,
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

function StatusRate({ value }: { value: number | null }) {
  if (value == null) return <span style={{ color: INK_MUTED }}>{DASH}</span>;
  return <span style={{ color: value >= 100 ? SUCCESS_GREEN : chartTheme.outflowRed, fontWeight: 700 }}>{fmtPct(value)}</span>;
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
  const { fmtMoney, unitLabel } = useMoney();

  if (isLoading) return <div style={{ ...cardStyle, padding: "40px", textAlign: "center", color: INK_MUTED }}>불러오는 중...</div>;

  const overview = detail?.overview;
  const monthIndex = referenceYear * 12 + referenceMonth - 1;
  const throughReference = <T extends { year: number; month: number }>(rows: T[]) =>
    rows.filter((row) => row.year * 12 + row.month - 1 <= monthIndex);
  const atReference = <T extends { year: number; month: number }>(rows: T[]) =>
    rows.filter((row) => row.year === referenceYear && row.month === referenceMonth);

  const salesRows = detail?.salesMonthly ?? [];
  const costRows = detail?.cogsMonthly ?? [];
  const cashRows = detail?.cashflow ?? [];
  const progressRows = detail?.progress ?? [];
  const monthSales = atReference(salesRows);
  const cumSales = throughReference(salesRows);
  const monthCost = atReference(costRows);
  const cumCost = throughReference(costRows);
  const monthCash = atReference(cashRows);
  const cumCash = throughReference(cashRows);
  const monthProgress = atReference(progressRows)[0];

  const salesMonthPlan = sumNullable(monthSales, (row) => row.plan);
  const salesMonthActual = sumNullable(monthSales, (row) => row.actual);
  const salesCumPlan = sumNullable(cumSales, (row) => row.plan);
  const salesCumActual = sumNullable(cumSales, (row) => row.actual);
  const costMonthPlan = sumNullable(monthCost, (row) => row.plan);
  const costMonthActual = sumNullable(monthCost, (row) => row.actual);
  const costCumPlan = sumNullable(cumCost, (row) => row.plan);
  const costCumActual = sumNullable(cumCost, (row) => row.actual);
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

  const statusRows = [
    { label: "공정", monthPlan: monthProgress?.planPct ?? null, monthActual: monthProgress?.actualPct ?? null, cumPlan: monthProgress?.planCumPct ?? null, cumActual: monthProgress?.actualCumPct ?? null, percent: true },
    { label: "매출", monthPlan: salesMonthPlan, monthActual: salesMonthActual, cumPlan: salesCumPlan, cumActual: salesCumActual },
    { label: "원가", monthPlan: costMonthPlan, monthActual: costMonthActual, cumPlan: costCumPlan, cumActual: costCumActual },
    { label: "자금", monthPlan: null, monthActual: cashMonthIn, cumPlan: null, cumActual: cashCumIn },
  ];
  const formatStatus = (value: number | null, percent?: boolean) => percent ? fmtPct(value) : fmtMoney(value);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "2px" }}>
        <span style={{ fontSize: "14px", fontWeight: 700, color: INK_NAVY }}>용역 당월 보고서</span>
        <span style={{ fontSize: "11px", color: INK_MUTED }}>기준월 '{String(referenceYear).slice(2)}.{String(referenceMonth).padStart(2, "0")} · {unitLabel}</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "8px" }}>
        <div style={cardStyle}>
          <div style={sectionTitle}>개요</div>
          <MetricRow label="PJ" value={projectName} strong />
          <MetricRow label="수행기간 (개월)" value={durationMonths != null ? `${durationMonths}` : DASH} />
          <MetricRow label="발주처" value={overview?.client ?? DASH} />
          <MetricRow label="도급금액" value={fmtMoney(overview?.contractAmount)} />
          <MetricRow label="수금조건" value={contractConditions ?? DASH} />
        </div>

        <div style={cardStyle}>
          <div style={sectionTitle}>매출</div>
          <MetricRow label="월 계획" value={fmtMoney(salesMonthPlan)} />
          <MetricRow label="월 실적(전망)" value={fmtMoney(salesMonthActual)} />
          <MetricRow label="누계 계획" value={fmtMoney(salesCumPlan)} />
          <MetricRow label="누계 실적" value={fmtMoney(salesCumActual)} />
          <MetricRow label="전체 도급액" value={fmtMoney(overview?.contractAmount)} strong />
        </div>

        <div style={{ ...cardStyle, overflowX: "auto" }}>
          <div style={sectionTitle}>현황</div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "10px" }}>
            <thead>
              <tr>
                <th style={{ padding: "4px", background: TABLE_HEADER_BG }}>구분</th>
                <th style={{ padding: "4px", background: TABLE_HEADER_BG }}>현황</th>
                <th style={{ padding: "4px", background: TABLE_HEADER_BG }}>계획</th>
                <th style={{ padding: "4px", background: TABLE_HEADER_BG }}>실적</th>
                <th style={{ padding: "4px", background: TABLE_HEADER_BG }}>상태</th>
              </tr>
            </thead>
            <tbody>
              {statusRows.flatMap((row) => [
                <tr key={`${row.label}-month`}>
                  <td style={{ padding: "4px", borderBottom: `1px solid ${DIVIDER}` }} rowSpan={2}>{row.label}</td>
                  <td style={{ padding: "4px", borderBottom: `1px solid ${DIVIDER}` }}>월</td>
                  <td style={{ padding: "4px", textAlign: "right", borderBottom: `1px solid ${DIVIDER}` }}>{formatStatus(row.monthPlan, row.percent)}</td>
                  <td style={{ padding: "4px", textAlign: "right", borderBottom: `1px solid ${DIVIDER}` }}>{formatStatus(row.monthActual, row.percent)}</td>
                  <td style={{ padding: "4px", textAlign: "right", borderBottom: `1px solid ${DIVIDER}` }}><StatusRate value={ratioPct(row.monthActual, row.monthPlan)} /></td>
                </tr>,
                <tr key={`${row.label}-cum`}>
                  <td style={{ padding: "4px", borderBottom: `1px solid ${DIVIDER}` }}>누계</td>
                  <td style={{ padding: "4px", textAlign: "right", borderBottom: `1px solid ${DIVIDER}` }}>{formatStatus(row.cumPlan, row.percent)}</td>
                  <td style={{ padding: "4px", textAlign: "right", borderBottom: `1px solid ${DIVIDER}` }}>{formatStatus(row.cumActual, row.percent)}</td>
                  <td style={{ padding: "4px", textAlign: "right", borderBottom: `1px solid ${DIVIDER}` }}><StatusRate value={ratioPct(row.cumActual, row.cumPlan)} /></td>
                </tr>,
              ])}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "8px" }}>
        <div style={cardStyle}>
          <div style={sectionTitle}>원가</div>
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
          <div style={sectionTitle}>자금</div>
          <MetricRow label="월 입금" value={fmtMoney(cashMonthIn)} />
          <MetricRow label="월 출금" value={fmtMoney(cashMonthOut)} />
          <MetricRow label="누계 입금" value={fmtMoney(cashCumIn)} />
          <MetricRow label="누계 출금" value={fmtMoney(cashCumOut)} />
          <div style={{ marginTop: "8px", fontSize: "11px", fontWeight: 700, color: INK_NAVY }}>상세보기</div>
          <MetricRow label="매출" value={fmtMoney(salesCumActual)} />
          <MetricRow label="인정" value={fmtMoney(recognized)} />
          <MetricRow label="수금 채권" value={fmtMoney(receivable)} strong />
        </div>

        <div style={cardStyle}>
          <div style={sectionTitle}>코멘트</div>
          <ProjectCommentPanel projectName={projectName} />
        </div>
      </div>
    </div>
  );
}