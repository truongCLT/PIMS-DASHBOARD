/**
 * ProgressSection — 공정 카드
 * Shows monthly and cumulative construction-progress plan vs actual
 * with horizontal progress bars and achievement badges.
 */
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { fmtPct, ratioPct } from "../../lib/projectDetailData";
import { chartTheme } from "../../lib/chartTheme";
import {
  cardStyle,
  sectionTitle,
  INK_SECONDARY,
  INK_BODY,
  INK_MUTED,
  DIVIDER,
  rateColor,
} from "../../lib/uiTokens";
import { REPORT_YEAR } from "../../lib/mgmtreportData";
import { DASH, StatusBadge, ProgressBar, DataKV } from "./ReportPrimitives";
import type { ProgRowData, CostBreakdownRow } from "./reportTypes";
import { useMoney } from "../../lib/displayUnit";

interface CostExecutionData {
  monthlyPlan: number | null;
  monthlyActual: number | null;
  cumulativePlan: number | null;
  cumulativeActual: number | null;
  monthlyBreakdown: CostBreakdownRow[];
  cumulativeBreakdown: CostBreakdownRow[];
}

interface Props {
  progRows: ProgRowData[];
  resolvedMonth: number | null;
  costExecution: CostExecutionData;
  startDate: string | null | undefined;
  endDate: string | null | undefined;
}

/** 공정별 원가 그룹명(대공종/건축/기계/전기/토목/조경/경비) → i18n key */
const TRADE_GROUP_LABEL_KEYS: Record<string, string> = {
  "대공종": "projectReportTab:tradeGroupMajor",
  "건축": "projectReportTab:tradeGroupBuilding",
  "기계": "projectReportTab:tradeGroupMechanical",
  "전기": "projectReportTab:tradeGroupElectrical",
  "토목": "projectReportTab:tradeGroupCivil",
  "조경": "projectReportTab:tradeGroupLandscape",
  "경비": "projectReportTab:tradeGroupExpense",
};

export function selectProgressReportRow(
  progRows: ProgRowData[],
  resolvedMonth: number | null,
): ProgRowData | null {
  if (progRows.length === 0) return null;
  if (resolvedMonth == null) return progRows[progRows.length - 1] ?? null;
  return (
    [...progRows]
      .reverse()
      .find(
        (row) =>
          row.year === REPORT_YEAR &&
          row.month <= resolvedMonth,
      ) ?? null
  );
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
  const { t } = useTranslation(["projectReportTab", "common"]);
  const { fmtVnd } = useMoney();
  const latest = selectProgressReportRow(progRows, resolvedMonth);

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
        {t("common:process")}
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
            label={t("projectReportTab:monthlyProgressLabel")}
            plan={planM}
            actual={actualM}
            max={barMax}
            rate={monthlyRate}
            hoverContent={
              <CostExecutionTooltip
                title={t("projectReportTab:monthlyCostExecutionTitle")}
                plan={costExecution.monthlyPlan}
                actual={costExecution.monthlyActual}
                rows={costExecution.monthlyBreakdown}
                fmtVnd={fmtVnd}
              />
            }
          />

          <div style={{ borderTop: `1px solid ${DIVIDER}` }} />

          <PlanActualGroup
            label={t("projectReportTab:cumulativeProgressLabel")}
            plan={planCum}
            actual={actualCum}
            max={cumMax}
            rate={cumRate}
            openUpward
            hoverContent={
              <CostExecutionTooltip
                title={t("projectReportTab:cumulativeCostExecutionTitle")}
                plan={costExecution.cumulativePlan}
                actual={costExecution.cumulativeActual}
                rows={costExecution.cumulativeBreakdown}
                fmtVnd={fmtVnd}
              />
            }
          />

          <div style={{ borderTop: `1px solid ${DIVIDER}`, paddingTop: "6px" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <DataKV
                label={t("projectReportTab:durationRate")}
                value={fmtPct(durationRate)}
              />
              <DataKV
                label={t("projectReportTab:durationVsProgressGap")}
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
  openUpward = false,
}: {
  label: string;
  plan: number | null;
  actual: number | null;
  max: number;
  rate: number | null;
  hoverContent?: React.ReactNode;
  openUpward?: boolean;
}) {
  const { t } = useTranslation(["common"]);
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
        <BarRow label={t("common:plan")} value={plan} barPlan={null} barActual={plan} max={max} color={chartTheme.outflowRed} />
        <BarRow label={t("common:actual")} value={actual} barPlan={plan} barActual={actual} max={max} color={chartTheme.planBlue} />
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "3px" }}>
        <span style={{ fontSize: "11px", color: INK_SECONDARY }}>
          {t("common:achievementRate")} <StatusBadge value={rate} />
        </span>
      </div>
      {hovered && hoverContent && (
        <div
          style={{
            position: "absolute",
            zIndex: 20,
            right: 0,
            ...(openUpward ? { bottom: "calc(100% + 10px)" } : { top: "calc(100% + 10px)" }),
            width: "280px",
            maxWidth: "calc(100vw - 48px)",
            padding: "10px 12px",
            borderRadius: "8px",
            backgroundColor: "#fff",
            border: `1px solid ${DIVIDER}`,
            boxShadow: "0 8px 24px rgba(15, 35, 58, 0.18)",
          }}
        >
          <span
            aria-hidden="true"
            style={{
              position: "absolute",
              right: "18px",
              ...(openUpward ? { bottom: "-5px" } : { top: "-5px" }),
              width: "10px",
              height: "10px",
              backgroundColor: "#fff",
              transform: "rotate(45deg)",
              ...(openUpward
                ? { borderRight: `1px solid ${DIVIDER}`, borderBottom: `1px solid ${DIVIDER}` }
                : { borderLeft: `1px solid ${DIVIDER}`, borderTop: `1px solid ${DIVIDER}` }),
            }}
          />
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
  rows = [],
  fmtVnd,
}: {
  title: string;
  plan: number | null;
  actual: number | null;
  rows?: CostBreakdownRow[];
  // pd_cost_budget_monthly.plan/actual는 VND 원본으로 저장되므로 fmtVnd()로 포맷한다 (fmtMoney()는
  // 천 USD 기준 값을 가정하므로 여기서 쓰면 안 됨).
  fmtVnd: (value: number | null | undefined) => string;
}) {
  const { t } = useTranslation(["projectReportTab", "common"]);
  const achievement = ratioPct(actual, plan);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      <div style={{ fontSize: "11px", fontWeight: 700, color: INK_SECONDARY }}>{title}</div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", flexWrap: "wrap" }}>
        <span style={{ fontSize: "11px", color: INK_SECONDARY }}>
          {t("common:plan")} <strong>{fmtVnd(plan)}</strong>
          {"  /  "}
          {t("common:actual")} <strong>{fmtVnd(actual)}</strong>
        </span>
        {achievement != null && <StatusBadge value={achievement} />}
      </div>
      {rows.some((row) => row.plan != null || row.actual != null) && (
        <div
          style={{
            borderTop: `1px solid ${DIVIDER}`,
            paddingTop: "6px",
            display: "grid",
            gridTemplateColumns: "1fr auto auto auto",
            columnGap: "10px",
            rowGap: "4px",
            fontSize: "10px",
          }}
        >
          <span />
          <span style={{ textAlign: "right", color: INK_MUTED, fontWeight: 700 }}>{t("common:plan")}</span>
          <span style={{ textAlign: "right", color: INK_MUTED, fontWeight: 700 }}>{t("common:actual")}</span>
          <span style={{ textAlign: "right", color: INK_MUTED, fontWeight: 700 }}>%</span>
          {rows
            .filter((row) => row.plan != null || row.actual != null)
            .map((row) => (
              <React.Fragment key={row.label}>
                <span style={{ color: INK_MUTED }}>{t(TRADE_GROUP_LABEL_KEYS[row.label] ?? row.label)}</span>
                <span style={{ textAlign: "right", color: INK_BODY, whiteSpace: "nowrap" }}>{fmtVnd(row.plan)}</span>
                <span style={{ textAlign: "right", color: INK_BODY, whiteSpace: "nowrap" }}>{fmtVnd(row.actual)}</span>
                <span style={{ textAlign: "right", color: INK_BODY, whiteSpace: "nowrap" }}>{fmtPct(ratioPct(row.actual, row.plan))}</span>
              </React.Fragment>
            ))}
        </div>
      )}
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
