/**
 * 예산 집행 현황 카드.
 * 각 행에 예산(트랙) · 집행 계획(빨강 바) · 실적/집행률(파랑 바)을 표시하며,
 * 합계 행은 "총 예산" 라벨로 렌더링된다.
 */
import React from "react";
import { useTranslation } from "react-i18next";
import { chartTheme } from "../../lib/chartTheme";
import { useMoney } from "../../lib/displayUnit";
import { fmtPct, ratioPct } from "../../lib/projectDetailData";
import { cardStyle, sectionTitle, emptyNote, INK_BODY, INK_SECONDARY } from "../../lib/uiTokens";
import type { BudgetRow } from "./types";

export function BudgetExecutionSection({ rows }: { rows: BudgetRow[] }) {
  const { t } = useTranslation(["saleCostTab", "costingTab"]);
  // budget/plan/actual đến từ pd_cost_budget + dòng Outsourcing tổng hợp từ pd_outsourcing — cả hai
  // đều lưu VND gốc (không quy đổi kUSD) — dùng fmtVnd() thay vì fmtMoney().
  const { fmtVnd } = useMoney();

  const maxBudget = Math.max(...rows.map((r) => r.budget ?? 0), 1);
  let lastCategory: string | null = null;

  return (
    <div style={cardStyle}>
      <span style={sectionTitle}>{t("costingTab:budgetExecutionStatusTitle")}</span>
      {rows.length === 0 ? (
        <div style={emptyNote}>{t("costingTab:noBudgetDataNotice")}</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "18px", marginTop: "14px" }}>
          {rows.map((row, i) => {
            const showCategory = row.category != null && row.category !== lastCategory;
            lastCategory = row.category ?? lastCategory;

            const trackW  = row.budget != null
              ? Math.max((Math.log10(row.budget + 1) / Math.log10(maxBudget + 1)) * 100, 12)
              : 12;
            const planW   = row.plan   != null ? Math.min((row.plan   / maxBudget) * 100, 100) : 0;
            const actualW = row.actual != null ? Math.min((row.actual / maxBudget) * 100, 100) : 0;
            const planPct   = ratioPct(row.plan,   row.budget);
            const actualPct = ratioPct(row.actual, row.budget);

            return (
              <React.Fragment key={`${row.item}-${i}`}>
                {showCategory && (
                  <div
                    style={{
                      fontSize: "12px",
                      fontWeight: 700,
                      color: INK_BODY,
                      marginTop: i === 0 ? 0 : "2px",
                      marginBottom: "-8px",
                    }}
                  >
                    {row.category}
                  </div>
                )}
                <div style={{ display: "flex", alignItems: "center" }}>
                  {/* 항목명 */}
                  <div
                    style={{
                      width: "110px",
                      minWidth: "110px",
                      fontSize: "12px",
                      color: INK_BODY,
                      fontWeight: row.bold ? 700 : 400,
                    }}
                  >
                    {row.item}
                  </div>

                  {/* 바 영역 */}
                  <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
                    {/* 트랙 배경 (예산 비율 기준 너비) */}
                    <div
                      style={{
                        width: `${trackW}%`,
                        height: row.plan != null || row.actual != null ? "52px" : "40px",
                        backgroundColor: chartTheme.lightGray,
                      }}
                    />
                    {/* 집행 계획 바 (빨강) */}
                    {row.plan != null && (
                      <div
                        style={{
                          position: "absolute",
                          top: "4px",
                          left: 0,
                          width: `${Math.max(planW, 3)}%`,
                          height: "20px",
                          backgroundColor: chartTheme.outflowRed,
                        }}
                      >
                        <span
                          style={{
                            position: "absolute",
                            top: "50%",
                            left: "50%",
                            transform: "translate(-50%,-50%)",
                            fontSize: "10px",
                            color: "#fff",
                            fontWeight: 700,
                          }}
                        >
                          {fmtVnd(row.plan)}
                        </span>
                        {planPct != null && (
                          <span
                            style={{
                              position: "absolute",
                              right: "-6px",
                              top: "50%",
                              transform: "translate(100%,-50%)",
                              fontSize: "10px",
                              color: chartTheme.outflowRed,
                              fontWeight: 700,
                            }}
                          >
                            {fmtPct(planPct)}
                          </span>
                        )}
                      </div>
                    )}
                    {/* 실적(집행률) 바 (파랑) */}
                    {row.actual != null && (
                      <div
                        style={{
                          position: "absolute",
                          top: "28px",
                          left: 0,
                          width: `${Math.max(actualW, 3)}%`,
                          height: "20px",
                          backgroundColor: chartTheme.planBlue,
                        }}
                      >
                        <span
                          style={{
                            position: "absolute",
                            top: "50%",
                            left: "50%",
                            transform: "translate(-50%,-50%)",
                            fontSize: "10px",
                            color: "#fff",
                            fontWeight: 700,
                          }}
                        >
                          {fmtVnd(row.actual)}
                        </span>
                        {actualPct != null && (
                          <span
                            style={{
                              position: "absolute",
                              right: "-6px",
                              top: "50%",
                              transform: "translate(100%,-50%)",
                              fontSize: "10px",
                              color: chartTheme.planBlue,
                              fontWeight: 700,
                            }}
                          >
                            {fmtPct(actualPct)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 예산 금액 — 고정 너비 컬럼 */}
                  <div
                    style={{
                      width: "58px",
                      minWidth: "58px",
                      textAlign: "right",
                      fontSize: "11px",
                      color: INK_SECONDARY,
                      paddingLeft: "4px",
                    }}
                  >
                    {fmtVnd(row.budget)}
                  </div>
                </div>
              </React.Fragment>
            );
          })}

          {/* 색상 범례 */}
          <div
            style={{
              display: "flex",
              gap: "16px",
              fontSize: "11px",
              color: INK_SECONDARY,
              marginTop: "-4px",
              paddingLeft: "110px",
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <span
                style={{
                  display: "inline-block",
                  width: "12px",
                  height: "10px",
                  backgroundColor: chartTheme.outflowRed,
                  borderRadius: "2px",
                }}
              />
              {t("saleCostTab:budgetLegendPlan")}
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <span
                style={{
                  display: "inline-block",
                  width: "12px",
                  height: "10px",
                  backgroundColor: chartTheme.planBlue,
                  borderRadius: "2px",
                }}
              />
              {t("saleCostTab:budgetLegendActual")}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
