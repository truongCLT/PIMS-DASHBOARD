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
  koreanLabel: string;
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
  const { t } = useTranslation(["projectReportTab", "common", "projectDataEntryTab"]);
  const { fmtVnd, unitLabel } = useMoney();
  const getPlan = (row: BudgetRowData) => row.plan ?? row.budget;
  const groups: CostGroup[] = [
    {
      label: "Direct Cost",
      koreanLabel: t("projectDataEntryTab:directCostKo"),
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
      koreanLabel: t("projectDataEntryTab:indirectCostKo"),
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
      koreanLabel: t("projectDataEntryTab:contingencyKo"),
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
                <span style={{ fontSize: "10px", color: INK_MUTED }}>{group.koreanLabel}</span>
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