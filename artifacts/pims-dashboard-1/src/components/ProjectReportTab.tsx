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
import React, { useState } from "react";
import {
  useListSalescostSites,
  getListSalescostSitesQueryKey,
  useGetCashflowMonthly,
  getGetCashflowMonthlyQueryKey,
} from "@workspace/api-client-react";
import { ProjectCommentPanel } from "./ProjectCommentPanel";
import { useProjectDetail } from "../lib/projectDetailData";
import { useMrProject, getMrCashflowRef } from "../data/mrProjectLinks";
import { REPORT_YEAR } from "../lib/mgmtreportData";
import {
  cardStyle,
  sectionTitle,
  INK_NAVY,
  INK_BODY,
  INK_MUTED,
  CARD_BORDER,
} from "../lib/uiTokens";

import { ProgressSection } from "./project-report/ProgressSection";
import { SalesSection } from "./project-report/SalesSection";
import { StatusTableSection } from "./project-report/StatusTableSection";
import { CostSection } from "./project-report/CostSection";
import { FundsSection } from "./project-report/FundsSection";
import type { StatusRowData } from "./project-report/reportTypes";

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

// ─── Main component ────────────────────────────────────────────────────────

export function ProjectReportTab({ projectName }: { projectName: string }) {
  const { detail, isLoading } = useProjectDetail(projectName);

  // ── Reference-month selector ────────────────────────────────────────────
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);

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

  // ── Revenue (sc_sites → mr_monthly fallback) ────────────────────────────
  const mr = useMrProject(projectName, REPORT_YEAR);
  const siteCode = mr.project?.siteCode ?? null;
  const revParams = { year: REPORT_YEAR, metric: "revenue" as const };
  const revQ = useListSalescostSites(revParams, {
    query: {
      enabled: siteCode != null,
      queryKey: getListSalescostSitesQueryKey(revParams),
    },
  });
  const scRevMonths = revQ.data?.sites.find((s) => s.code === siteCode)?.months ?? [];
  const scHasAny = scRevMonths.some((v) => (v ?? 0) !== 0);
  const revMonths: (number | null)[] = scHasAny
    ? scRevMonths
    : (mr.project?.revenueActual ?? []);
  const planMonths: (number | null)[] = mr.project?.revenuePlan ?? [];

  // Last month with actual revenue
  let lastActualIdx = -1;
  for (let i = 0; i < revMonths.length; i++) {
    if ((revMonths[i] ?? 0) !== 0) lastActualIdx = i;
  }
  const latestActualMonth =
    lastActualIdx >= 0
      ? lastActualIdx + 1
      : progRows.length > 0
        ? progRows[progRows.length - 1].month
        : null;
  const resolvedMonth = selectedMonth ?? latestActualMonth ?? null;

  // Cumulative revenue up to resolvedMonth
  const cumRev =
    resolvedMonth != null
      ? revMonths.slice(0, resolvedMonth).reduce<number>((a, b) => a + (b ?? 0), 0)
      : revMonths.reduce<number>((a, b) => a + (b ?? 0), 0);

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
  const latestProg =
    resolvedMonth != null
      ? (progRows.find((p) => p.year === REPORT_YEAR && p.month === resolvedMonth) ??
          (progRows.length > 0 ? progRows[progRows.length - 1] : null))
      : progRows.length > 0
        ? progRows[progRows.length - 1]
        : null;

  const refMonthIdx = resolvedMonth != null ? resolvedMonth - 1 : lastActualIdx;
  const salesMonthActual = refMonthIdx >= 0 ? (revMonths[refMonthIdx] ?? null) : null;
  const salesMonthPlan = refMonthIdx >= 0 ? (planMonths[refMonthIdx] ?? null) : null;
  const salesCumPlan =
    resolvedMonth != null
      ? planMonths.slice(0, resolvedMonth).reduce<number>((a, b) => a + (b ?? 0), 0)
      : planMonths.reduce<number>((a, b) => a + (b ?? 0), 0);

  const totalBudget = allBudgetRows.reduce<number>((a, r) => a + (r.budget ?? 0), 0);
  const totalActual = allBudgetRows.reduce<number>((a, r) => a + (r.actual ?? 0), 0);
  const totalPlan = allBudgetRows.reduce<number>((a, r) => a + (r.plan ?? 0), 0);

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
      plan: totalPlan > 0 ? totalPlan : null,
      actual: totalActual > 0 ? totalActual : null,
    },
    {
      category: "원가",
      type: "누계",
      plan: totalBudget > 0 ? totalBudget : null,
      actual: totalActual > 0 ? totalActual : null,
    },
    {
      category: "자금",
      type: "월",
      plan: cumRev > 0 ? cumRev : null,
      actual: cashIn > 0 ? cashIn : null,
    },
    {
      category: "자금",
      type: "누계",
      plan: cumRev > 0 ? cumRev : null,
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
        불러오는 중...
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
        <span
          style={{
            fontSize: "14px",
            fontWeight: 700,
            color: INK_NAVY,
            letterSpacing: "0.02em",
          }}
        >
          당월 보고서
        </span>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "12px", color: INK_BODY, fontWeight: 600 }}>기준월:</span>
          <select
            value={selectedMonth ?? ""}
            onChange={(e) =>
              setSelectedMonth(e.target.value === "" ? null : Number(e.target.value))
            }
            style={monthSelectStyle}
          >
            <option value="">
              최신월{latestMonthLabel ? ` (${latestMonthLabel})` : ""}
            </option>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>
                {`'${String(REPORT_YEAR).slice(2)}.${String(m).padStart(2, "0")}`}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Row 1: 공정 | 매출 | 현황 표 ── */}
      <div style={reportGrid("240px")}>
        <ProgressSection progRows={progRows} resolvedMonth={resolvedMonth} />
        <SalesSection
          planMonths={planMonths}
          actualMonths={revMonths}
          resolvedMonth={resolvedMonth}
          contractAmount={contractAmount}
        />
        <StatusTableSection rows={statusRows} />
      </div>

      {/* ── Row 2: 원가 | 자금 | 코멘트 ── */}
      <div style={reportGrid("240px")}>
        <CostSection budgetRows={allBudgetRows} />
        <FundsSection
          cashIn={cashIn}
          cashOut={cashOut}
          contractAmount={contractAmount}
          cumRev={cumRev}
        />
        <div style={cardStyle}>
          <div style={{ ...sectionTitle, marginBottom: "8px" }}>코멘트</div>
          <ProjectCommentPanel projectName={projectName} tab="budget" showHeader={false} />
        </div>
      </div>
    </div>
  );
}
