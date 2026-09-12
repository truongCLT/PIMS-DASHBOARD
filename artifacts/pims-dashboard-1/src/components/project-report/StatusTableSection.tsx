/** StatusTableSection — 구분별 월/누계 계획·실적과 규칙 기반 상태등 카드. */
import React from "react";
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
} from "../../lib/uiTokens";
import type { StatusRowData } from "./reportTypes";

interface Props {
  rows: StatusRowData[];
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

function costLevel(plan: number | null, actual: number | null): StatusLevel {
  if (plan == null || actual == null || plan <= 0) return "empty";
  const overrunPct = ((actual - plan) / plan) * 100;
  if (overrunPct <= 2) return "green";
  if (overrunPct <= 5) return "yellow";
  return "red";
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
      row.category === "원가"
        ? costLevel(row.plan, row.actual)
        : row.category === "자금"
          ? fundsLevel(row.plan, row.actual)
          : achievementLevel(row.plan, row.actual);
    return { category: row.category, type: row.type, plan, actual, level };
  });
}

function StatusLight({ level }: { level: StatusLevel }) {
  if (level === "empty") {
    return <span style={{ color: INK_MUTED }}>-</span>;
  }
  return (
    <span
      role="img"
      aria-label={`${level} 상태`}
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

export function StatusTableSection({ rows }: Props) {
  const displayRows = buildDisplayRows(rows);

  return (
    <div style={cardStyle}>
      <div style={{ ...sectionTitle, marginBottom: "5px" }}>현황</div>
      <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${DIVIDER}` }}>
            <th style={{ ...thStyle, width: "25%" }} colSpan={2}>구분</th>
            <th style={{ ...thStyle, width: "25%", textAlign: "right" }}>계획</th>
            <th style={{ ...thStyle, textAlign: "right" }}>실적</th>
            <th style={{ ...thStyle, width: "15%", textAlign: "center" }}>상태</th>
          </tr>
        </thead>
        <tbody>
          {displayRows.map((row, index) => {
            const isFirstCategoryRow =
              index === 0 || displayRows[index - 1]?.category !== row.category;
            const isLastCategoryRow =
              index === displayRows.length - 1 ||
              displayRows[index + 1]?.category !== row.category;
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
                  {row.category}
                </td>
              )}
              <td style={{ ...tdStyle, width: "10%", color: INK_MUTED }}>
                {row.type}
              </td>
              <td style={{ ...tdStyle, textAlign: "right", color: INK_BODY }}>
                {fmtPct(row.plan)}
              </td>
              <td style={{ ...tdStyle, textAlign: "right", color: INK_BODY }}>
                {fmtPct(row.actual)}
              </td>
              <td style={{ ...tdStyle, textAlign: "center" }}>
                <StatusLight level={row.level} />
              </td>
            </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
