import React from "react";
import { useTranslation } from "react-i18next";
import { chartTheme } from "../../lib/chartTheme";
import { useMoney } from "../../lib/displayUnit";
import { ratioPct } from "../../lib/projectDetailData";
import {
  CARD_BORDER,
  INK_BODY,
  INK_MUTED,
  INK_NAVY,
  cardStyle,
  rateColor,
  sectionTitle,
} from "../../lib/uiTokens";
import type { BudgetRowData } from "./reportTypes";

interface Props {
  budgetRows: BudgetRowData[];
}

interface CostGroup {
  label: string;
  subLabelKey: string;
  plan: number | null;
  actual: number | null;
}

function sumNullable<T>(
  rows: T[],
  getValue: (row: T) => number | null,
): number | null {
  const values = rows.map(getValue);
  return values.some((value) => value != null)
    ? values.reduce<number>((sum, value) => sum + (value ?? 0), 0)
    : null;
}

export function CostSection({ budgetRows }: Props) {
  // plan/actual đến từ pd_cost_budget + tổng hợp pd_outsourcing — cả hai đều lưu VND gốc (không quy
  // đổi kUSD) — dùng fmtVnd() thay vì fmtMoney().
  const { t, i18n } = useTranslation(["projectReportTab", "common", "projectDataEntryTab"]);
  const { fmtVnd, unitLabel } = useMoney();
  // row.budget으로 폴백하면 안 된다 — budget은 계약/예산 총액(pd_cost_budget.budget)이고 plan은 그
  // 항목의 "선택 기준월까지 누계 계획"(costBudgetMonthly 누계)이라, 어떤 항목의 월별 계획이 한 번도
  // 입력된 적 없어 plan이 null이어도 budget으로 대신 보여주면 데이터 입력 탭 "5. Budget Execution
  // Status"의 Cumulative Plan(해당 항목은 그냥 "-"로 비어 있음)과 숫자가 어긋난다(실제로 발생/보고됨).
  // null은 그대로 두고, 합계(sumNullable)가 다른 항목처럼 0으로 취급하게 한다.
  const getPlan = (row: BudgetRowData) => row.plan;
  const groups: CostGroup[] = [
    {
      label: "Direct Cost",
      // 보조 라벨은 화면 언어로 번역한다(KO 직접비 / VI Chi phí trực tiếp). EN은 메인 라벨과 같아 중복이므로 생략.
      subLabelKey: "projectReportTab:costGroupDirectSub",
      plan: sumNullable(
        budgetRows.filter((row) => ["외주", "Common", "경비1"].includes(row.item)),
        getPlan,
      ),
      actual: sumNullable(
        budgetRows.filter((row) => ["외주", "Common", "경비1"].includes(row.item)),
        (row) => row.actual,
      ),
    },
    {
      label: "Indirect Cost",
      subLabelKey: "projectReportTab:costGroupIndirectSub",
      plan: sumNullable(
        budgetRows.filter((row) => row.item === "경비2"),
        getPlan,
      ),
      actual: sumNullable(
        budgetRows.filter((row) => row.item === "경비2"),
        (row) => row.actual,
      ),
    },
    {
      label: "Contingency",
      subLabelKey: "projectReportTab:costGroupContingencySub",
      plan: sumNullable(
        budgetRows.filter((row) => row.item === "예비비"),
        getPlan,
      ),
      actual: sumNullable(
        budgetRows.filter((row) => row.item === "예비비"),
        (row) => row.actual,
      ),
    },
  ];
  const totalPlan = sumNullable(groups, (group) => group.plan);
  const totalActual = sumNullable(groups, (group) => group.actual);
  const totalRate = ratioPct(totalActual, totalPlan);
  const maxPlan = Math.max(...groups.map((group) => group.plan ?? 0), 1);

  return (
    <div style={{ ...cardStyle, display: "flex", flexDirection: "column" }}>
      <div style={{ ...sectionTitle, marginBottom: "14px" }}>
        {t("projectReportTab:costTitle")}
        <span
          style={{
            marginLeft: "6px",
            fontSize: "10px",
            fontWeight: 400,
            color: INK_MUTED,
          }}
        >
          {t("common:unit")}: {unitLabel}
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "9px" }}>
        {groups.map((group) => {
          const groupRate = ratioPct(group.actual, group.plan);
          const planWidth =
            group.plan != null && group.plan > 0
              ? Math.max((group.plan / maxPlan) * 100, 4)
              : 0;
          const actualWidth =
            group.actual != null && group.actual > 0
              ? Math.min(Math.max((group.actual / maxPlan) * 100, 2), 100)
              : 0;
          return (
            <div
              key={group.label}
              style={{
                display: "grid",
                gridTemplateColumns: "92px minmax(0, 1fr)",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <span style={{ display: "flex", flexDirection: "column", lineHeight: 1.25 }}>
                <span style={{ fontSize: "11px", fontWeight: 700, color: INK_BODY, whiteSpace: "nowrap" }}>
                  {group.label}
                </span>
                {!i18n.language?.startsWith("en") && t(group.subLabelKey) && (
                  <span style={{ fontSize: "10px", color: INK_MUTED }}>{t(group.subLabelKey)}</span>
                )}
              </span>
              <div>
                <div
                  style={{
                    position: "relative",
                    height: "20px",
                    border: `1px solid ${CARD_BORDER}`,
                    backgroundColor: "#fff",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      inset: "0 auto 0 0",
                      width: `${actualWidth}%`,
                      backgroundColor: chartTheme.planBlue,
                      opacity: 0.62,
                    }}
                  />
                  {planWidth > 0 && (
                    <div
                      style={{
                        position: "absolute",
                        left: `calc(${Math.min(planWidth, 100)}% - 1px)`,
                        top: 0,
                        bottom: 0,
                        width: "2px",
                        backgroundColor: chartTheme.outflowRed,
                      }}
                    />
                  )}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "5px", marginTop: "2px", fontSize: "9px", color: INK_MUTED, whiteSpace: "nowrap" }}>
                  <span>{t("common:plan")} <strong style={{ color: INK_BODY }}>{fmtVnd(group.plan)}</strong></span>
                  <span>{t("common:execution")} <strong style={{ color: INK_BODY }}>{fmtVnd(group.actual)}</strong></span>
                  <span>{t("projectReportTab:executionRateLabel")} <strong style={{ color: rateColor(groupRate) }}>{groupRate == null ? "-" : `${Math.round(groupRate * 10) / 10}%`}</strong></span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div
        style={{
          marginTop: "auto",
          paddingTop: "14px",
          borderTop: `1px solid ${CARD_BORDER}`,
          display: "grid",
          gridTemplateColumns: "52px minmax(0, 1fr) 1px minmax(0, 1fr) 1px minmax(0, 1fr)",
          alignItems: "center",
          columnGap: "7px",
          width: "100%",
          whiteSpace: "nowrap",
          fontSize: "10px",
          color: INK_MUTED,
        }}
      >
        <span style={{ fontSize: "12px", fontWeight: 700, color: INK_NAVY }}>{t("common:total")}</span>
        <span style={{ textAlign: "center" }}>
          {t("common:plan")} <strong style={{ color: INK_BODY }}>{fmtVnd(totalPlan)}</strong>
        </span>
        <span style={{ color: "#aab5c4" }}>|</span>
        <span style={{ textAlign: "center" }}>
          {t("common:execution")} <strong style={{ color: INK_BODY }}>{fmtVnd(totalActual)}</strong>
        </span>
        <span style={{ color: "#aab5c4" }}>|</span>
        <span style={{ textAlign: "right" }}>
          {t("projectReportTab:executionRateLabel")}{" "}
          <strong style={{ color: rateColor(totalRate) }}>
            {totalRate == null ? "-" : `${Math.round(totalRate * 10) / 10}%`}
          </strong>
        </span>
      </div>
    </div>
  );
}