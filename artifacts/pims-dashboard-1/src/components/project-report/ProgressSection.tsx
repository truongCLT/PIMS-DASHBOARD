/**
 * ProgressSection — 공정 카드
 * Shows monthly and cumulative construction-progress plan vs actual
 * with horizontal progress bars and achievement badges.
 */
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { fmtPct, ratioPct } from "../../lib/projectDetailData";
import { useMoney } from "../../lib/displayUnit";
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
import type { ProgRowData, TradeProgressRow } from "./reportTypes";

interface Props {
  progRows: ProgRowData[];
  resolvedMonth: number | null;
  startDate: string | null | undefined;
  endDate: string | null | undefined;
  monthlyPlanAmount?: number | null;
  monthlyActualAmount?: number | null;
  tradeMonthly?: TradeProgressRow[];
  tradeCumulative?: TradeProgressRow[];
}

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
  startDate,
  endDate,
  monthlyPlanAmount = null,
  monthlyActualAmount = null,
  tradeMonthly = [],
  tradeCumulative = [],
}: Props) {
  const { t } = useTranslation(["projectReportTab", "common"]);
  const { fmtVnd, unitLabel } = useMoney();
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
              <ProgressPctTooltip
                title={t("projectReportTab:monthlyProgressLabel")}
                plan={planM}
                actual={actualM}
                rate={monthlyRate}
                trades={tradeMonthly}
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
              <ProgressPctTooltip
                title={t("projectReportTab:cumulativeProgressLabel")}
                plan={planCum}
                actual={actualCum}
                rate={cumRate}
                trades={tradeCumulative}
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
            width: "300px",
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

/** 공정 카드 hover 팝업 — 상단에 공정률(%) 계획/실적, 그 아래에 공종(건축/기계/전기/토목/조경)별
 * 계획 대비 달성률 표. 공종별 금액은 데이터 입력 탭 "4. 공정별 원가 계획/실적"과 같은 소스다
 * (ProjectReportTab makeTradeBreakdown). 예전엔 공정률 %만 다시 보여줬는데, 요청은 공종별 달성률이었다. */
function ProgressPctTooltip({
  title,
  plan,
  actual,
  rate,
  trades = [],
  planAmountLabel = null,
  actualAmountLabel = null,
}: {
  title: string;
  plan: number | null;
  actual: number | null;
  rate: number | null;
  trades?: TradeProgressRow[];
  planAmountLabel?: string | null;
  actualAmountLabel?: string | null;
}) {
  const { t } = useTranslation(["common", "projectDataEntryTab"]);
  const { fmtVnd } = useMoney();
  const cell: React.CSSProperties = { fontSize: "11px", color: INK_SECONDARY, padding: "3px 2px", textAlign: "right", whiteSpace: "nowrap" };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      <div style={{ fontSize: "11px", fontWeight: 700, color: INK_SECONDARY }}>{title}</div>
      {trades.length > 0 && (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${DIVIDER}` }}>
              <th style={{ ...cell, textAlign: "left", fontWeight: 700 }} />
              <th style={{ ...cell, fontWeight: 700 }}>{t("common:plan")}</th>
              <th style={{ ...cell, fontWeight: 700 }}>{t("common:actual")}</th>
              <th style={{ ...cell, fontWeight: 700 }}>{t("common:achievementRate")}</th>
            </tr>
          </thead>
          <tbody>
            {trades.map((row) => {
              const tradeRate = row.plan != null && row.plan !== 0 ? ratioPct(row.actual, row.plan) : null;
              return (
                <tr key={row.labelKey} style={{ borderBottom: `1px dotted ${DIVIDER}` }}>
                  <td style={{ ...cell, textAlign: "left", fontWeight: 600, color: INK_BODY }}>{t(row.labelKey)}</td>
                  <td style={cell}>{row.plan != null ? fmtVnd(row.plan) : DASH}</td>
                  <td style={cell}>{row.actual != null ? fmtVnd(row.actual) : DASH}</td>
                  <td style={{ ...cell, fontWeight: 700, color: tradeRate != null ? rateColor(tradeRate) : INK_MUTED }}>
                    {tradeRate != null ? fmtPct(tradeRate) : DASH}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", flexWrap: "wrap" }}>
        <span style={{ fontSize: "11px", color: INK_SECONDARY }}>
          {t("common:plan")} <strong>{fmtPct(plan)}</strong>
          {"  /  "}
          {t("common:actual")} <strong>{fmtPct(actual)}</strong>
        </span>
        {rate != null && <StatusBadge value={rate} />}
      </div>
      {(planAmountLabel != null || actualAmountLabel != null) && (
        <div style={{ display: "flex", flexDirection: "column", gap: "2px", borderTop: `1px solid ${DIVIDER}`, paddingTop: "6px" }}>
          {planAmountLabel != null && (
            <span style={{ fontSize: "11px", color: INK_SECONDARY }}>
              {t("common:plan")} <strong>{planAmountLabel}</strong>
            </span>
          )}
          {actualAmountLabel != null && (
            <span style={{ fontSize: "11px", color: INK_SECONDARY }}>
              {t("common:actual")} <strong>{actualAmountLabel}</strong>
            </span>
          )}
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
