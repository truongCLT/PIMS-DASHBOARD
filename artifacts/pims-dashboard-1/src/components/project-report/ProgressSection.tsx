/**
 * ProgressSection — 공정 카드
 * Shows monthly and cumulative construction-progress plan vs actual
 * with horizontal progress bars and achievement badges.
 */
import React, { useState } from "react";
import { fmtPct, ratioPct } from "../../lib/projectDetailData";
import { chartTheme } from "../../lib/chartTheme";
import {
  cardStyle,
  sectionTitle,
  INK_SECONDARY,
  INK_MUTED,
  DIVIDER,
  rateColor,
} from "../../lib/uiTokens";
import { REPORT_YEAR } from "../../lib/mgmtreportData";
import { DASH, StatusBadge, ProgressBar, DataKV } from "./ReportPrimitives";
import type { ProgRowData } from "./reportTypes";
import { useMoney } from "../../lib/displayUnit";

interface CostExecutionData {
  monthlyPlan: number | null;
  monthlyActual: number | null;
  cumulativePlan: number | null;
  cumulativeActual: number | null;
  monthlyBreakdown: CostExecutionRow[];
  cumulativeBreakdown: CostExecutionRow[];
}

interface CostExecutionRow {
  label: string;
  plan: number | null;
  actual: number | null;
}

interface Props {
  progRows: ProgRowData[];
  resolvedMonth: number | null;
  costExecution: CostExecutionData;
  startDate: string | null | undefined;
  endDate: string | null | undefined;
}

export function calculateDurationRate(
  startDate: string | null | undefined,
  endDate: string | null | undefined,
  year: number,
  month: number | null,
): number | null {
  if (!startDate || !endDate || month == null) return null;

  const start = Date.parse(startDate);
  const end = Date.parse(endDate);
  const reportMonthEnd = Date.UTC(year, month, 0);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null;

  const elapsed = Math.min(Math.max(reportMonthEnd - start, 0), end - start);
  return (elapsed / (end - start)) * 100;
}

export function ProgressSection({
  progRows,
  resolvedMonth,
  costExecution,
  startDate,
  endDate,
}: Props) {
  const { fmtMoney } = useMoney();
  const latest =
    resolvedMonth != null
      ? (progRows.find((p) => p.year === REPORT_YEAR && p.month === resolvedMonth) ??
          (progRows.length > 0 ? progRows[progRows.length - 1] : null))
      : progRows.length > 0
        ? progRows[progRows.length - 1]
        : null;

  const planM = latest?.planPct ?? null;
  const actualM = latest?.actualPct ?? null;
  const planCum = latest?.planCumPct ?? null;
  const actualCum = latest?.actualCumPct ?? null;
  const monthlyRate = ratioPct(actualM, planM);
  const cumRate = ratioPct(actualCum, planCum);
  const durationRate = calculateDurationRate(startDate, endDate, REPORT_YEAR, resolvedMonth);
  const progressGap =
    durationRate != null && actualCum != null ? durationRate - actualCum : null;

  const monthLabel = latest
    ? `'${String(latest.year).slice(2)}.${String(latest.month).padStart(2, "0")}`
    : null;

  const barMax = Math.max(planM ?? 0, actualM ?? 0, 1);
  const cumMax = Math.max(planCum ?? 0, actualCum ?? 0, 1);

  return (
    <div style={cardStyle}>
      <div style={{ ...sectionTitle, marginBottom: "8px" }}>
        공정
        {monthLabel && (
          <span style={{ fontSize: "11px", fontWeight: 400, color: INK_MUTED, marginLeft: "6px" }}>
            ({monthLabel})
          </span>
        )}
      </div>

      {progRows.length === 0 ? (
        <div style={{ fontSize: "12px", color: INK_MUTED, padding: "12px 0" }}>{DASH}</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <PlanActualGroup
            label="월별 공정율 (계획 대비 실적)"
            plan={planM}
            actual={actualM}
            max={barMax}
            rate={monthlyRate}
            hoverContent={
              <CostExecutionTooltip
                title="월 원가집행"
                plan={costExecution.monthlyPlan}
                actual={costExecution.monthlyActual}
                rows={costExecution.monthlyBreakdown}
                fmtMoney={fmtMoney}
              />
            }
          />

          <div style={{ borderTop: `1px solid ${DIVIDER}` }} />

          <PlanActualGroup
            label="누계 공정율 (계획 대비 실적)"
            plan={planCum}
            actual={actualCum}
            max={cumMax}
            rate={cumRate}
            hoverContent={
              <CostExecutionTooltip
                title="누계 원가집행"
                plan={costExecution.cumulativePlan}
                actual={costExecution.cumulativeActual}
                rows={costExecution.cumulativeBreakdown}
                fmtMoney={fmtMoney}
              />
            }
          />

          <div style={{ borderTop: `1px solid ${DIVIDER}`, paddingTop: "6px" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <DataKV
                label="공기율"
                value={fmtPct(durationRate)}
              />
              <DataKV
                label="공기율 - 누계 공정률"
                value={fmtPct(progressGap)}
                valueColor={
                  progressGap == null
                    ? undefined
                    : progressGap > 0
                      ? chartTheme.outflowRed
                      : chartTheme.actualGreen
                }
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Internal sub-component ───────────────────────────────────────────────

function PlanActualGroup({
  label,
  plan,
  actual,
  max,
  rate,
  hoverContent,
}: {
  label: string;
  plan: number | null;
  actual: number | null;
  max: number;
  rate: number | null;
  hoverContent?: React.ReactNode;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      style={{ position: "relative" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        style={{
          fontSize: "11px",
          fontWeight: 600,
          color: INK_SECONDARY,
          marginBottom: "4px",
        }}
      >
        {label}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
        <BarRow label="계획" value={plan} barPlan={plan} barActual={null} max={max} color={chartTheme.outflowRed} />
        <BarRow label="실적" value={actual} barPlan={plan} barActual={actual} max={max} color={chartTheme.planBlue} />
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "3px" }}>
        <span style={{ fontSize: "11px", color: INK_SECONDARY }}>
          달성률 <StatusBadge value={rate} />
        </span>
      </div>
      {hovered && hoverContent && (
        <div
          style={{
            position: "absolute",
            zIndex: 20,
            right: 0,
            top: "100%",
            width: "273px",
            maxWidth: "calc(100vw - 48px)",
            padding: "8px 10px",
            borderRadius: "6px",
            backgroundColor: "#fff",
            border: `1px solid ${DIVIDER}`,
            boxShadow: "0 6px 18px rgba(15, 35, 58, 0.16)",
          }}
        >
          {hoverContent}
        </div>
      )}
    </div>
  );
}

function CostExecutionTooltip({
  title,
  plan,
  actual,
  rows,
  fmtMoney,
}: {
  title: string;
  plan: number | null;
  actual: number | null;
  rows: CostExecutionRow[];
  fmtMoney: (value: number | null | undefined) => string;
}) {
  const achievement = ratioPct(actual, plan);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      <div style={{ fontSize: "11px", fontWeight: 700, color: INK_SECONDARY }}>{title}</div>
      <div style={{ fontSize: "11px", fontWeight: 700, color: INK_SECONDARY, whiteSpace: "nowrap" }}>
        계획 {fmtMoney(plan)} / 실적 {fmtMoney(actual)} (달성율 : {fmtPct(achievement)})
      </div>
      <div style={{ borderTop: `1px solid ${DIVIDER}`, paddingTop: "4px", display: "flex", flexDirection: "column", gap: "4px" }}>
        {rows.map((row) => (
          <div key={row.label} style={{ fontSize: "10px", color: INK_MUTED, whiteSpace: "nowrap" }}>
            - {row.label} 계획 {fmtMoney(row.plan)} / 실적 {fmtMoney(row.actual)} (달성율 : {fmtPct(ratioPct(row.actual, row.plan))})
          </div>
        ))}
      </div>
    </div>
  );
}

function BarRow({
  label,
  value,
  barPlan,
  barActual,
  max,
  color,
}: {
  label: string;
  value: number | null;
  barPlan: number | null;
  barActual: number | null;
  max: number;
  color: string;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
      <span
        style={{
          fontSize: "11px",
          color: INK_MUTED,
          width: "24px",
          flexShrink: 0,
        }}
      >
        {label}
      </span>
      <div style={{ flex: 1 }}>
        <ProgressBar plan={barPlan} actual={barActual} max={max} color={color} />
      </div>
      <span
        style={{
          fontSize: "11px",
          fontWeight: 600,
          color: INK_MUTED,
          width: "36px",
          textAlign: "right",
          flexShrink: 0,
        }}
      >
        {fmtPct(value)}
      </span>
    </div>
  );
}
