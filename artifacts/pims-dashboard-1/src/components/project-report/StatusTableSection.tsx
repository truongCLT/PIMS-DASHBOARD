/** StatusTableSection — 구분별 월/누계 계획·실적과 규칙 기반 상태등 카드. */
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { fmtPct } from "../../lib/projectDetailData";
import {
  cardStyle,
  sectionTitle,
  INK_NAVY,
  INK_BODY,
  INK_MUTED,
  DIVIDER,
  ACHIEVE_GREEN,
  ACHIEVE_RED,
  WARNING_BORDER,
  POINT_BLUE,
} from "../../lib/uiTokens";
import type { StatusRowData, CostBreakdownRow } from "./reportTypes";

interface Props {
  rows: StatusRowData[];
  costBreakdown?: CostBreakdownRow[];
}

const thStyle: React.CSSProperties = {
  padding: "6px 6px",
  fontWeight: 700,
  color: INK_BODY,
  textAlign: "left",
  fontSize: "11px",
  whiteSpace: "nowrap",
};

const tdStyle: React.CSSProperties = {
  padding: "5px 5px",
  fontSize: "11px",
  verticalAlign: "middle",
};

type StatusLevel = "green" | "yellow" | "red" | "empty";

/** StatusRowData.category(공정/매출/원가/자금) → i18n key */
const CATEGORY_LABEL_KEYS: Record<string, string> = {
  "공정": "common:process",
  "매출": "common:revenue",
  "원가": "projectReportTab:categoryCost",
  "자금": "overviewTab:funds",
};

/** StatusRowData.type(월/누계) → i18n key */
const TYPE_LABEL_KEYS: Record<string, string> = {
  "월": "projectReportTab:typeMonthly",
  "누계": "common:cumulative",
};

interface DisplayRow {
  category: string;
  type: StatusRowData["type"];
  plan: number | null;
  actual: number | null;
  level: StatusLevel;
}

const statusColor: Record<Exclude<StatusLevel, "empty">, string> = {
  green: ACHIEVE_GREEN,
  yellow: WARNING_BORDER,
  red: ACHIEVE_RED,
};

function achievementPct(plan: number | null | undefined, actual: number | null | undefined) {
  if (plan == null || actual == null || plan <= 0) return null;
  return (actual / plan) * 100;
}

function achievementLevel(plan: number | null, actual: number | null): StatusLevel {
  if (plan == null || actual == null || plan <= 0) return "empty";
  const rate = (actual / plan) * 100;
  if (rate >= 100) return "green";
  if (rate >= 90) return "yellow";
  return "red";
}

function costCategoryLevel(rows: CostBreakdownRow[]): StatusLevel {
  const comparableRows = rows.filter(
    (row) => row.plan != null && row.actual != null && row.plan > 0,
  );
  if (comparableRows.length === 0) return "empty";
  const overrunRates = comparableRows.map(
    (row) => (((row.actual ?? 0) - (row.plan ?? 0)) / (row.plan ?? 1)) * 100,
  );
  if (overrunRates.some((rate) => rate > 5)) return "red";
  if (overrunRates.filter((rate) => rate > 2 && rate <= 5).length >= 3) {
    return "yellow";
  }
  return "green";
}

function fundsLevel(plan: number | null, actual: number | null): StatusLevel {
  if (plan == null || actual == null) return "empty";
  const receivable = Math.max(plan - actual, 0);
  if (receivable === 0) return "green";
  // 보고서 금액 단위는 K USD이며 1,000은 약 10억 원 구간에 해당한다.
  return receivable < 1_000 ? "yellow" : "red";
}

function buildDisplayRows(rows: StatusRowData[]): DisplayRow[] {
  return rows.map((row) => {
    const isProgress = row.category === "공정";
    const plan = isProgress ? row.plan : row.plan != null ? 100 : null;
    const actual = isProgress ? row.actual : achievementPct(row.plan, row.actual);
    const level =
      row.category === "자금"
          ? fundsLevel(row.plan, row.actual)
          : achievementLevel(row.plan, row.actual);
    return { category: row.category, type: row.type, plan, actual, level };
  });
}

function achievementCategoryLevel(rows: DisplayRow[]): StatusLevel {
  const cumulative = rows.find((row) => row.type === "누계");
  const monthly = rows.find((row) => row.type === "월");
  if (
    !cumulative ||
    cumulative.plan == null ||
    cumulative.actual == null ||
    cumulative.plan <= 0
  ) {
    return "empty";
  }
  if (cumulative.actual < cumulative.plan) return "red";
  if (
    monthly?.plan != null &&
    monthly.actual != null &&
    monthly.plan > 0 &&
    monthly.actual < monthly.plan
  ) {
    return "yellow";
  }
  return "green";
}

/** 구분(공정/매출/원가/자금)별 판정 기준 문구 i18n key — 그림 2의 판정 기준표를 그대로 반영한다. */
const STATUS_RULE_KEYS: Record<string, Record<Exclude<StatusLevel, "empty">, string>> = {
  "공정": {
    green: "projectReportTab:statusRuleProgressGreen",
    yellow: "projectReportTab:statusRuleProgressYellow",
    red: "projectReportTab:statusRuleProgressRed",
  },
  "매출": {
    green: "projectReportTab:statusRuleRevenueGreen",
    yellow: "projectReportTab:statusRuleRevenueYellow",
    red: "projectReportTab:statusRuleRevenueRed",
  },
  "원가": {
    green: "projectReportTab:statusRuleCostGreen",
    yellow: "projectReportTab:statusRuleCostYellow",
    red: "projectReportTab:statusRuleCostRed",
  },
  "자금": {
    green: "projectReportTab:statusRuleFundsGreen",
    yellow: "projectReportTab:statusRuleFundsYellow",
    red: "projectReportTab:statusRuleFundsRed",
  },
};

/** 판정 기준 — 현재 판정된 색의 기준 문구 한 줄만 보여준다. */
function StatusRuleLegend({ category, activeLevel }: { category: string; activeLevel: StatusLevel }) {
  const { t } = useTranslation(["projectReportTab"]);
  const ruleKeys = STATUS_RULE_KEYS[category];
  if (!ruleKeys || activeLevel === "empty") return null;
  return (
    <div
      style={{
        borderTop: `1px solid ${DIVIDER}`,
        paddingTop: "6px",
        display: "flex",
        flexDirection: "column",
        gap: "4px",
      }}
    >
      <div style={{ fontSize: "10px", fontWeight: 700, color: INK_MUTED }}>
        {t("projectReportTab:statusRuleTitle")}
      </div>
      <div style={{ display: "flex", alignItems: "flex-start", gap: "6px" }}>
        <span
          style={{
            marginTop: "3px",
            display: "inline-block",
            flexShrink: 0,
            width: "8px",
            height: "8px",
            borderRadius: "50%",
            backgroundColor: statusColor[activeLevel],
          }}
        />
        <span
          style={{
            fontSize: "10px",
            lineHeight: 1.4,
            color: INK_NAVY,
            fontWeight: 700,
          }}
        >
          {t(ruleKeys[activeLevel])}
        </span>
      </div>
    </div>
  );
}

/** Status 점(dot) hover 시 표시할 상세 내역 — 어떤 근거로 색이 정해졌는지 보여준다. */
function StatusDetailTooltip({
  category,
  level,
}: {
  category: string;
  level: StatusLevel;
}) {
  const { t } = useTranslation(["projectReportTab", "common", "projectDataEntryTab"]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      <div style={{ fontSize: "11px", fontWeight: 700, color: POINT_BLUE }}>
        {t(CATEGORY_LABEL_KEYS[category] ?? category)}
      </div>
      <StatusRuleLegend category={category} activeLevel={level} />
    </div>
  );
}

function StatusLight({ level }: { level: StatusLevel }) {
  const { t } = useTranslation(["projectReportTab"]);
  if (level === "empty") {
    return <span style={{ color: INK_MUTED }}>-</span>;
  }
  return (
    <span
      role="img"
      aria-label={`${level} ${t("projectReportTab:statusAriaSuffix")}`}
      style={{
        display: "inline-block",
        width: "13px",
        height: "13px",
        borderRadius: "50%",
        backgroundColor: statusColor[level],
        boxShadow: `inset 0 0 0 1px ${statusColor[level]}`,
      }}
    />
  );
}

export function StatusTableSection({ rows, costBreakdown = [] }: Props) {
  const { t } = useTranslation(["projectReportTab", "common", "overviewTab"]);
  const displayRows = buildDisplayRows(rows);
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);

  return (
    <div style={cardStyle}>
      <div style={{ ...sectionTitle, marginBottom: "5px" }}>{t("common:status")}</div>
      <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${DIVIDER}` }}>
            <th style={{ ...thStyle, width: "25%" }} colSpan={2}>{t("projectReportTab:statusCategoryHeader")}</th>
            <th style={{ ...thStyle, width: "25%", textAlign: "right" }}>{t("common:plan")}</th>
            <th style={{ ...thStyle, textAlign: "right" }}>{t("common:actual")}</th>
            <th style={{ ...thStyle, width: "15%", textAlign: "center" }}>{t("projectReportTab:statusColumnHeader")}</th>
          </tr>
        </thead>
        <tbody>
          {displayRows.map((row, index) => {
            const isFirstCategoryRow =
              index === 0 || displayRows[index - 1]?.category !== row.category;
            const isLastCategoryRow =
              index === displayRows.length - 1 ||
              displayRows[index + 1]?.category !== row.category;
            const categoryRows = displayRows.filter(
              (candidate) => candidate.category === row.category,
            );
            const isLastCategoryGroup = index + categoryRows.length >= displayRows.length;
            const cumulativeLevel =
              row.category === "원가"
                ? costCategoryLevel(costBreakdown)
                : row.category === "자금"
                  ? categoryRows.find((candidate) => candidate.type === "누계")?.level ?? "empty"
                  : achievementCategoryLevel(categoryRows);
            return (
            <tr
              key={`${row.category}-${row.type}`}
              style={{
                borderBottom: `1px ${isLastCategoryRow ? "solid" : "dotted"} ${DIVIDER}`,
              }}
            >
              {isFirstCategoryRow && (
                <td
                  rowSpan={2}
                  style={{
                    ...tdStyle,
                    width: "15%",
                    fontWeight: 600,
                    color: INK_NAVY,
                    verticalAlign: "middle",
                  }}
                >
                  {t(CATEGORY_LABEL_KEYS[row.category] ?? row.category)}
                </td>
              )}
              <td style={{ ...tdStyle, width: "10%", color: INK_MUTED }}>
                {t(TYPE_LABEL_KEYS[row.type] ?? row.type)}
              </td>
              <td style={{ ...tdStyle, textAlign: "right", color: INK_BODY }}>
                {fmtPct(row.plan)}
              </td>
              <td style={{ ...tdStyle, textAlign: "right", color: INK_BODY }}>
                {fmtPct(row.actual)}
              </td>
              {isFirstCategoryRow && (
                <td
                  rowSpan={2}
                  style={{
                    ...tdStyle,
                    position: "relative",
                    textAlign: "center",
                    verticalAlign: "middle",
                  }}
                  onMouseEnter={() => setHoveredCategory(row.category)}
                  onMouseLeave={() => setHoveredCategory(null)}
                >
                  <StatusLight level={cumulativeLevel} />
                  {hoveredCategory === row.category && cumulativeLevel !== "empty" && (
                    <div
                      style={{
                        position: "absolute",
                        zIndex: 20,
                        right: 0,
                        ...(isLastCategoryGroup
                          ? { bottom: "calc(100% + 10px)" }
                          : { top: "calc(100% + 10px)" }),
                        width: "270px",
                        maxWidth: "calc(100vw - 48px)",
                        padding: "10px 12px",
                        borderRadius: "8px",
                        backgroundColor: "#fff",
                        border: `1px solid ${DIVIDER}`,
                        boxShadow: "0 8px 24px rgba(15, 35, 58, 0.18)",
                        textAlign: "left",
                        whiteSpace: "normal",
                      }}
                    >
                      <span
                        aria-hidden="true"
                        style={{
                          position: "absolute",
                          right: "18px",
                          ...(isLastCategoryGroup ? { bottom: "-5px" } : { top: "-5px" }),
                          width: "10px",
                          height: "10px",
                          backgroundColor: "#fff",
                          transform: "rotate(45deg)",
                          ...(isLastCategoryGroup
                            ? { borderRight: `1px solid ${DIVIDER}`, borderBottom: `1px solid ${DIVIDER}` }
                            : { borderLeft: `1px solid ${DIVIDER}`, borderTop: `1px solid ${DIVIDER}` }),
                        }}
                      />
                      <StatusDetailTooltip
                        category={row.category}
                        level={cumulativeLevel}
                      />
                    </div>
                  )}
                </td>
              )}
            </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
