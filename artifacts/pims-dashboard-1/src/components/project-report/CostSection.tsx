/**
 * CostSection — 원가 카드
 * Compact horizontal-bar summary of budget execution per cost item.
 * Mirrors the OverviewTab / CostingTab budget-execution pattern.
 */
import React from "react";
import { fmtPct, ratioPct } from "../../lib/projectDetailData";
import { chartTheme } from "../../lib/chartTheme";
import {
  cardStyle,
  sectionTitle,
  INK_NAVY,
  INK_BODY,
  INK_MUTED,
  CARD_BORDER,
  rateColor,
} from "../../lib/uiTokens";
import { useMoney } from "../../lib/displayUnit";
import { DASH } from "./ReportPrimitives";
import type { BudgetRowData } from "./reportTypes";

interface Props {
  budgetRows: BudgetRowData[];
}

export function CostSection({ budgetRows }: Props) {
  const { fmtMoney, unitLabel } = useMoney();

  const totalBudget = budgetRows.reduce<number>((a, r) => a + (r.budget ?? 0), 0);
  const totalActual = budgetRows.reduce<number>((a, r) => a + (r.actual ?? 0), 0);
  const totalPct = ratioPct(totalActual, totalBudget);
  const maxBudget = Math.max(...budgetRows.map((r) => r.budget ?? 0), 1);

  return (
    <div style={cardStyle}>
      <div style={{ ...sectionTitle, marginBottom: "4px" }}>
        원가
        <span
          style={{ fontSize: "11px", fontWeight: 400, color: INK_MUTED, marginLeft: "6px" }}
        >
          {unitLabel}&nbsp;&nbsp;집행률{" "}
          <span style={{ color: rateColor(totalPct), fontWeight: 700 }}>
            {fmtPct(totalPct)}
          </span>
        </span>
      </div>
      <div style={{ fontSize: "11px", color: INK_MUTED, marginBottom: "6px" }}>
        ※ 현재의 "예산집행 현황" (외주, 공통, 경비1, 경비2, 예비비)
      </div>

      {budgetRows.length === 0 ? (
        <div style={{ fontSize: "12px", color: INK_MUTED, padding: "8px 0" }}>{DASH}</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {budgetRows.map((row) => {
            const pct = ratioPct(row.actual, row.budget);
            const trackPct =
              row.budget != null && row.budget > 0
                ? Math.max((row.budget / maxBudget) * 100, 20)
                : 20;
            const actualW =
              row.actual != null && row.budget != null && row.budget > 0
                ? Math.min((row.actual / row.budget) * trackPct, trackPct)
                : 0;
            const planW =
              row.plan != null && row.budget != null && row.budget > 0
                ? Math.min((row.plan / row.budget) * trackPct, trackPct)
                : 0;

            return (
              <div
                key={row.item}
                style={{ display: "flex", alignItems: "center", gap: "6px" }}
              >
                <span
                  style={{
                    fontSize: "11px",
                    color: INK_BODY,
                    width: "60px",
                    minWidth: "60px",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {row.item}
                </span>
                <div
                  style={{
                    flex: 1,
                    position: "relative",
                    height: "18px",
                    backgroundColor: chartTheme.lightGray,
                    borderRadius: "3px",
                    overflow: "hidden",
                  }}
                >
                  {/* Actual fill */}
                  <div
                    style={{
                      position: "absolute",
                      left: 0,
                      top: 0,
                      width: `${actualW}%`,
                      height: "100%",
                      backgroundColor: chartTheme.planBlue,
                      borderRadius: "3px 0 0 3px",
                    }}
                  />
                  {/* Plan marker */}
                  {planW > 0 && (
                    <div
                      style={{
                        position: "absolute",
                        left: `${planW}%`,
                        top: 0,
                        width: "2px",
                        height: "100%",
                        backgroundColor: chartTheme.outflowRed,
                        zIndex: 2,
                      }}
                    />
                  )}
                </div>
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 700,
                    color: rateColor(pct),
                    width: "36px",
                    textAlign: "right",
                    flexShrink: 0,
                  }}
                >
                  {fmtPct(pct)}
                </span>
                <span
                  style={{
                    fontSize: "10px",
                    color: INK_MUTED,
                    width: "52px",
                    textAlign: "right",
                    flexShrink: 0,
                  }}
                >
                  {fmtMoney(row.actual)}
                </span>
              </div>
            );
          })}

          {/* Totals row */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              paddingTop: "6px",
              borderTop: `1px solid ${CARD_BORDER}`,
            }}
          >
            <span style={{ fontSize: "12px", fontWeight: 700, color: INK_NAVY }}>합계</span>
            <span style={{ fontSize: "12px", fontWeight: 700, color: rateColor(totalPct) }}>
              {fmtMoney(totalActual)} / {fmtMoney(totalBudget)} ({fmtPct(totalPct)})
            </span>
          </div>

          {/* Legend */}
          <div
            style={{
              display: "flex",
              gap: "10px",
              alignItems: "center",
              flexWrap: "wrap",
              marginTop: "2px",
            }}
          >
            {[
              { label: "예산", color: chartTheme.lightGray },
              { label: "계획", color: chartTheme.outflowRed },
              { label: "실적", color: chartTheme.planBlue },
            ].map(({ label, color }) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: "3px" }}>
                <div
                  style={{
                    width: "10px",
                    height: "10px",
                    backgroundColor: color,
                    borderRadius: "2px",
                  }}
                />
                <span style={{ fontSize: "10px", color: INK_MUTED }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
