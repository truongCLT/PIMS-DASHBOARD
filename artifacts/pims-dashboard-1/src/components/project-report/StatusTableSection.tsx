/** StatusTableSection — KPI 목표/실적과 규칙 기반 상태등 카드. */
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
  padding: "8px 6px",
  fontSize: "12px",
  verticalAlign: "middle",
};

type StatusLevel = "green" | "yellow" | "red" | "empty";

interface KpiRow {
  category: string;
  plan: number | null;
  actual: number | null;
  level: StatusLevel;
}

const statusColor: Record<Exclude<StatusLevel, "empty">, string> = {
  green: ACHIEVE_GREEN,
  yellow: WARNING_BORDER,
  red: ACHIEVE_RED,
};

function getRow(rows: StatusRowData[], category: string, type: StatusRowData["type"]) {
  return rows.find((row) => row.category === category && row.type === type);
}

function achievementPct(plan: number | null | undefined, actual: number | null | undefined) {
  if (plan == null || actual == null || plan <= 0) return null;
  return (actual / plan) * 100;
}

function progressLevel(
  monthly: StatusRowData | undefined,
  cumulative: StatusRowData | undefined,
): StatusLevel {
  if (cumulative?.plan == null || cumulative.actual == null) return "empty";
  if (cumulative.actual < cumulative.plan) return "red";
  if (monthly?.plan != null && monthly.actual != null && monthly.actual < monthly.plan) {
    return "yellow";
  }
  return "green";
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

function buildKpiRows(rows: StatusRowData[]): KpiRow[] {
  const progressMonth = getRow(rows, "공정", "월");
  const progressCum = getRow(rows, "공정", "누계");
  const salesMonth = getRow(rows, "매출", "월");
  const salesCum = getRow(rows, "매출", "누계");
  const costCum = getRow(rows, "원가", "누계");
  const fundsCum = getRow(rows, "자금", "누계");

  return [
    {
      category: "공정",
      plan: progressCum?.plan ?? null,
      actual: progressCum?.actual ?? null,
      level: progressLevel(progressMonth, progressCum),
    },
    {
      category: "매출",
      plan: salesCum?.plan != null ? 100 : null,
      actual: achievementPct(salesCum?.plan, salesCum?.actual),
      level: progressLevel(salesMonth, salesCum),
    },
    {
      category: "원가",
      plan: costCum?.plan != null ? 100 : null,
      actual: achievementPct(costCum?.plan, costCum?.actual),
      level: costLevel(costCum?.plan ?? null, costCum?.actual ?? null),
    },
    {
      category: "자금",
      plan: fundsCum?.plan != null ? 100 : null,
      actual: achievementPct(fundsCum?.plan, fundsCum?.actual),
      level: fundsLevel(fundsCum?.plan ?? null, fundsCum?.actual ?? null),
    },
  ];
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
  const kpiRows = buildKpiRows(rows);

  return (
    <div style={cardStyle}>
      <div style={{ ...sectionTitle, marginBottom: "8px" }}>현황</div>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${DIVIDER}` }}>
            <th style={thStyle}>KPI</th>
            <th style={{ ...thStyle, textAlign: "right" }}>목표</th>
            <th style={{ ...thStyle, textAlign: "right" }}>실적</th>
            <th style={{ ...thStyle, textAlign: "center" }}>상태</th>
          </tr>
        </thead>
        <tbody>
          {kpiRows.map((row) => (
            <tr key={row.category} style={{ borderBottom: `1px solid ${DIVIDER}` }}>
              <td style={{ ...tdStyle, fontWeight: 600, color: INK_NAVY }}>
                {row.category}
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
            ))}
        </tbody>
      </table>
    </div>
  );
}
