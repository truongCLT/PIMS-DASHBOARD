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

  return (
    <div style={cardStyle}>
      <span style={sectionTitle}>{t("costingTab:budgetExecutionStatusTitle")}</span>
      {rows.length === 0 ? (
        <div style={emptyNote}>{t("costingTab:noBudgetDataNotice")}</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "18px", marginTop: "14px" }}>
          {rows.map((row, i) => {
            const trackW  = row.budget != null
              ? Math.max((Math.log10(row.budget + 1) / Math.log10(maxBudget + 1)) * 100, 12)
              : 12;
            const planPct   = ratioPct(row.plan,   row.budget);
            const actualPct = ratioPct(row.actual, row.budget);
            // 계획/실적 바 너비는 각 행 "자기 예산 대비 비율"(옆에 뜨는 %와 같은 값)만큼 트랙(trackW) 안을
            // 채워야 한다 — 이전엔 전체 행 중 가장 큰 예산(maxBudget)을 분모로 써서, Outsourcing처럼 예산
            // 규모가 압도적으로 큰 항목이 있으면 Common/Expense1처럼 실행률이 높아도(68.7%) 항상 최소폭
            // (3%)으로 뭉개져 보였다 — 그 결과 실행률이 0%인 Contingency와 시각적으로 구분이 안 됐다.
            const planW   = planPct   != null ? Math.min(Math.max(planPct,   0), 100) / 100 * trackW : 0;
            const actualW = actualPct != null ? Math.min(Math.max(actualPct, 0), 100) / 100 * trackW : 0;

            return (
              <React.Fragment key={`${row.item}-${i}`}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    paddingTop: row.bold ? "8px" : 0,
                    borderTop: row.bold ? `1px solid ${chartTheme.gridLine}` : "none",
                  }}
                >
                  {/* 항목명 — 소계/총계 행(bold)은 카테고리 헤더를 따로 두지 않고 이 라벨 자체가 그룹
                      요약임을 나타낸다(예: "Direct Cost" 소계, "Total Budget" 총계). */}
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
                          width: `${row.plan === 0 ? 0 : Math.max(planW, 3)}%`,
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
                          width: `${row.actual === 0 ? 0 : Math.max(actualW, 3)}%`,
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
