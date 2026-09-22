/** StatusTableSection — 구분별 월/누계 계획·실적과 규칙 기반 상태등 카드. */
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { fmtPct } from "../../lib/projectDetailData";
import { useMoney } from "../../lib/displayUnit";
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
import { StatusBadge } from "./ReportPrimitives";
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

/**
 * 원가 항목명 → i18n key. 시공 원가집행(대공종/건축/기계/전기/토목/조경/경비 — ProgressSection과 동일한
 * 매핑)과 용역 원가 breakdown(외주/예비비 — ServiceReportTab)이 이 컴포넌트를 공용으로 쓰므로 두 쪽
 * 어휘를 모두 담는다. "Common"/"Expense 1"/"Expense 2"는 이미 언어 무관 영문 그대로 쓰므로 매핑이
 * 없으면 원문 그대로 표시된다(의도된 동작).
 */
const TRADE_GROUP_LABEL_KEYS: Record<string, string> = {
  "대공종": "projectReportTab:tradeGroupMajor",
  "건축": "projectReportTab:tradeGroupBuilding",
  "기계": "projectReportTab:tradeGroupMechanical",
  "전기": "projectReportTab:tradeGroupElectrical",
  "토목": "projectReportTab:tradeGroupCivil",
  "조경": "projectReportTab:tradeGroupLandscape",
  "경비": "projectReportTab:tradeGroupExpense",
  "외주": "common:outsourcing",
  "예비비": "projectDataEntryTab:contingencyKo",
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

/** Status 점(dot) hover 시 표시할 상세 내역 — 어떤 근거로 색이 정해졌는지 보여준다. */
function StatusDetailTooltip({
  category,
  rawRows,
  costBreakdown,
}: {
  category: string;
  rawRows: StatusRowData[];
  costBreakdown: CostBreakdownRow[];
}) {
  const { t } = useTranslation(["projectReportTab", "common", "projectDataEntryTab"]);
  const { fmtMoney, fmtVnd } = useMoney();
  const isProgress = category === "공정";
  const isCost = category === "원가";
  const isFunds = category === "자금";
  const fmtValue = isProgress ? fmtPct : isCost ? fmtVnd : fmtMoney;
  const monthlyRow = rawRows.find((row) => row.type === "월");
  const cumulativeRow = rawRows.find((row) => row.type === "누계");

  const renderRow = (row: StatusRowData | undefined) => {
    if (!row) return null;
    const rate = achievementPct(row.plan, row.actual);
    return (
      <div key={row.type} style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
        <div style={{ fontSize: "10px", fontWeight: 700, color: INK_MUTED }}>
          {t(TYPE_LABEL_KEYS[row.type] ?? row.type)}
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", flexWrap: "wrap" }}>
          <span style={{ fontSize: "11px", color: INK_BODY }}>
            {t("common:plan")} <strong style={{ color: INK_NAVY }}>{fmtValue(row.plan)}</strong>
            {"  /  "}
            {t("common:actual")} <strong style={{ color: INK_NAVY }}>{fmtValue(row.actual)}</strong>
          </span>
          {!isProgress && rate != null && <StatusBadge value={rate} />}
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      <div style={{ fontSize: "11px", fontWeight: 700, color: POINT_BLUE }}>
        {t(CATEGORY_LABEL_KEYS[category] ?? category)}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
        {renderRow(monthlyRow)}
        {renderRow(cumulativeRow)}
      </div>
      {isCost && costBreakdown.some((row) => row.plan != null || row.actual != null) && (
        <div
          style={{
            borderTop: `1px solid ${DIVIDER}`,
            paddingTop: "6px",
            display: "grid",
            gridTemplateColumns: "1fr auto auto",
            columnGap: "10px",
            rowGap: "4px",
            fontSize: "10px",
          }}
        >
          <span />
          <span style={{ textAlign: "right", color: INK_MUTED, fontWeight: 700 }}>{t("common:plan")}</span>
          <span style={{ textAlign: "right", color: INK_MUTED, fontWeight: 700 }}>{t("common:actual")}</span>
          {costBreakdown
            .filter((row) => row.plan != null || row.actual != null)
            .map((row) => (
              <React.Fragment key={row.label}>
                <span style={{ color: INK_MUTED }}>{t(TRADE_GROUP_LABEL_KEYS[row.label] ?? row.label)}</span>
                <span style={{ textAlign: "right", color: INK_BODY, whiteSpace: "nowrap" }}>{fmtVnd(row.plan)}</span>
                <span style={{ textAlign: "right", color: INK_BODY, whiteSpace: "nowrap" }}>{fmtVnd(row.actual)}</span>
              </React.Fragment>
            ))}
        </div>
      )}
      {isFunds && cumulativeRow && (
        <div
          style={{
            borderTop: `1px solid ${DIVIDER}`,
            paddingTop: "6px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "8px",
            fontSize: "11px",
          }}
        >
          <span style={{ color: INK_MUTED }}>{t("projectReportTab:receivableLabel")}</span>
          <strong style={{ color: ACHIEVE_RED }}>
            {fmtMoney(Math.max((cumulativeRow.plan ?? 0) - (cumulativeRow.actual ?? 0), 0))}
          </strong>
        </div>
      )}
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
                        rawRows={rows.filter((candidate) => candidate.category === row.category)}
                        costBreakdown={costBreakdown}
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
