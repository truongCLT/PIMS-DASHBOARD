/**
 * SalesSection — 매출 카드
 * Shows monthly plan vs actual bars and cumulative plan / actual / forecast
 * rows consistent with SaleProfitTab and OverviewTab conventions.
 */
import React from "react";
import { fmtPct, ratioPct } from "../../lib/projectDetailData";
import { chartTheme } from "../../lib/chartTheme";
import {
  cardStyle,
  sectionTitle,
  INK_NAVY,
  INK_SECONDARY,
  INK_MUTED,
  INK_BODY,
  DIVIDER,
  rateColor,
} from "../../lib/uiTokens";
import { useMoney } from "../../lib/displayUnit";
import { REPORT_YEAR } from "../../lib/mgmtreportData";
import { DASH, StatusBadge, ProgressBar, DenseRow } from "./ReportPrimitives";

interface Props {
  planMonths: (number | null)[];
  actualMonths: (number | null)[];
  resolvedMonth: number | null;
  contractAmount: number | null;
}

export function SalesSection({
  planMonths,
  actualMonths,
  resolvedMonth,
  contractAmount,
}: Props) {
  const { fmtMoney, unitLabel } = useMoney();

  // Determine reference month index
  const latestIdx = actualMonths.reduce<number>(
    (acc, v, i) => ((v ?? 0) !== 0 ? i : acc),
    -1,
  );
  const refMonth = resolvedMonth ?? latestIdx + 1;
  const monthIdx = Math.max(0, Math.min(refMonth - 1, 11));

  const monthPlan = planMonths[monthIdx] ?? null;
  const monthActual = actualMonths[monthIdx] ?? null;
  const monthRate = ratioPct(monthActual, monthPlan);

  // Cumulative to refMonth
  const cumPlan = planMonths
    .slice(0, monthIdx + 1)
    .reduce<number>((a, b) => a + (b ?? 0), 0);
  const cumActual = actualMonths
    .slice(0, monthIdx + 1)
    .reduce<number>((a, b) => a + (b ?? 0), 0);
  const cumRate = ratioPct(cumActual, cumPlan);

  // Annual plan total
  const annualPlan = planMonths.reduce<number>((a, b) => a + (b ?? 0), 0);

  // Forecast = cumulative actual + remaining plan
  const forecast =
    cumActual +
    planMonths.slice(monthIdx + 1).reduce<number>((a, b) => a + (b ?? 0), 0);

  const contractRate = ratioPct(cumActual, contractAmount);
  const monthLabel = `'${String(REPORT_YEAR).slice(2)}.${String(refMonth).padStart(2, "0")}`;
  const maxBar = Math.max(monthPlan ?? 0, monthActual ?? 0, 1);

  const hasData =
    actualMonths.some((v) => (v ?? 0) !== 0) ||
    planMonths.some((v) => (v ?? 0) !== 0);

  return (
    <div style={cardStyle}>
      <div style={{ ...sectionTitle, marginBottom: "8px" }}>
        매출
        <span
          style={{
            fontSize: "11px",
            fontWeight: 400,
            color: INK_MUTED,
            marginLeft: "6px",
          }}
        >
          계획 대비 실적(전망)&nbsp;&nbsp;{unitLabel}
        </span>
      </div>

      {!hasData ? (
        <div style={{ fontSize: "12px", color: INK_MUTED, padding: "12px 0" }}>
          ※ 경영현황판 매출 실적 및 전망과 동일하게
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {/* Monthly */}
          <div>
            <div
              style={{
                fontSize: "11px",
                fontWeight: 600,
                color: INK_SECONDARY,
                marginBottom: "4px",
              }}
            >
              당월 ({monthLabel})
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
              <MoneyBarRow
                label="계획"
                value={monthPlan}
                barPlan={monthPlan}
                barActual={null}
                max={maxBar}
                color={chartTheme.outflowRed}
                fmtMoney={fmtMoney}
              />
              <MoneyBarRow
                label="실적"
                value={monthActual}
                barPlan={monthPlan}
                barActual={monthActual}
                max={maxBar}
                color={chartTheme.planBlue}
                fmtMoney={fmtMoney}
              />
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "2px" }}>
              <StatusBadge value={monthRate} />
            </div>
          </div>

          <div style={{ borderTop: `1px solid ${DIVIDER}` }} />

          {/* Cumulative + forecast */}
          <div>
            <div
              style={{
                fontSize: "11px",
                fontWeight: 600,
                color: INK_SECONDARY,
                marginBottom: "4px",
              }}
            >
              누계 (초기~당월 누계 계획 대비 초기~당월 누계 실적)
            </div>
            <DenseRow label="계획" value={fmtMoney(cumPlan)} />
            <DenseRow
              label="실적"
              value={fmtMoney(cumActual)}
              valueColor={rateColor(cumRate)}
            />
            <DenseRow label="전망" value={fmtMoney(forecast)} />
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: "4px",
                paddingTop: "4px",
                borderTop: `1px solid ${DIVIDER}`,
              }}
            >
              <span style={{ fontSize: "11px", color: INK_MUTED }}>
                전체 원은 누계 전체 금액 (도급액)
              </span>
              <span style={{ fontSize: "11px", fontWeight: 700, color: INK_NAVY }}>
                {contractAmount != null
                  ? `${fmtMoney(contractAmount)} / ${fmtPct(contractRate)}`
                  : DASH}
              </span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: "4px",
              }}
            >
              <span style={{ fontSize: "10px", color: INK_MUTED }}>연간 계획</span>
              <span style={{ fontSize: "11px", fontWeight: 600, color: INK_BODY }}>
                {fmtMoney(annualPlan)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Internal sub-component ───────────────────────────────────────────────

function MoneyBarRow({
  label,
  value,
  barPlan,
  barActual,
  max,
  color,
  fmtMoney,
}: {
  label: string;
  value: number | null;
  barPlan: number | null;
  barActual: number | null;
  max: number;
  color: string;
  fmtMoney: (v: number | null | undefined) => string;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
      <span style={{ fontSize: "11px", color: INK_MUTED, width: "24px", flexShrink: 0 }}>
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
          width: "60px",
          textAlign: "right",
          flexShrink: 0,
        }}
      >
        {fmtMoney(value)}
      </span>
    </div>
  );
}
