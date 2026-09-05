/**
 * ProgressSection — 공정 카드
 * Shows monthly and cumulative construction-progress plan vs actual
 * with horizontal progress bars and achievement badges.
 */
import React from "react";
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

interface Props {
  progRows: ProgRowData[];
  resolvedMonth: number | null;
}

export function ProgressSection({ progRows, resolvedMonth }: Props) {
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
          />

          <div style={{ borderTop: `1px solid ${DIVIDER}` }} />

          <PlanActualGroup
            label="누계 공정율 (계획 대비 실적)"
            plan={planCum}
            actual={actualCum}
            max={cumMax}
            rate={cumRate}
          />

          <div style={{ borderTop: `1px solid ${DIVIDER}`, paddingTop: "6px" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <DataKV
                label="공정율"
                value={fmtPct(actualCum)}
                valueColor={rateColor(cumRate)}
              />
              <DataKV
                label="공정율 - 누계 공정율"
                value={
                  actualCum != null && actualM != null
                    ? fmtPct(actualCum - actualM)
                    : DASH
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
}: {
  label: string;
  plan: number | null;
  actual: number | null;
  max: number;
  rate: number | null;
}) {
  return (
    <div>
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
