/**
 * StatusTableSection — 현황 표 카드
 * Plan vs actual status table: 공정 / 매출 / 원가 / 자금 × 월 / 누계.
 * The cumulative row uses TABLE_HEADER_BG (existing token) instead of an
 * invented colour.
 */
import React from "react";
import { ratioPct, fmtPct } from "../../lib/projectDetailData";
import {
  cardStyle,
  sectionTitle,
  INK_NAVY,
  INK_SECONDARY,
  INK_BODY,
  DIVIDER,
  TABLE_HEADER_BG,
  rateColor,
} from "../../lib/uiTokens";
import { StatusBadge } from "./ReportPrimitives";
import type { StatusRowData } from "./reportTypes";

interface Props {
  rows: StatusRowData[];
}

const thStyle: React.CSSProperties = {
  padding: "5px 6px",
  fontWeight: 700,
  color: INK_NAVY,
  textAlign: "left",
  fontSize: "11px",
  whiteSpace: "nowrap",
};

const tdStyle: React.CSSProperties = {
  padding: "4px 6px",
  fontSize: "11px",
  verticalAlign: "middle",
};

export function StatusTableSection({ rows }: Props) {
  return (
    <div style={cardStyle}>
      <div style={{ ...sectionTitle, marginBottom: "8px" }}>현황</div>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
        <thead>
          <tr style={{ backgroundColor: TABLE_HEADER_BG }}>
            <th style={thStyle} />
            <th style={thStyle} />
            <th style={{ ...thStyle, textAlign: "right" }}>계획</th>
            <th style={{ ...thStyle, textAlign: "right" }}>실적</th>
            <th style={{ ...thStyle, textAlign: "right" }}>상태</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const rate = ratioPct(r.actual, r.plan);
            const isFirst = i === 0 || rows[i - 1].category !== r.category;
            // Use TABLE_HEADER_BG (existing token) for cumulative rows
            const rowBg = r.type === "누계" ? TABLE_HEADER_BG : undefined;
            return (
              <tr
                key={`${r.category}-${r.type}`}
                style={{ borderTop: `1px solid ${DIVIDER}`, backgroundColor: rowBg }}
              >
                <td
                  style={{
                    ...tdStyle,
                    fontWeight: isFirst ? 700 : 400,
                    color: isFirst ? INK_NAVY : "transparent",
                    whiteSpace: "nowrap",
                  }}
                >
                  {isFirst ? r.category : ""}
                </td>
                <td style={{ ...tdStyle, color: INK_SECONDARY }}>{r.type}</td>
                <td style={{ ...tdStyle, textAlign: "right", color: INK_BODY }}>
                  {fmtPct(r.plan)}
                </td>
                <td style={{ ...tdStyle, textAlign: "right", color: rateColor(rate) }}>
                  {fmtPct(r.actual)}
                </td>
                <td style={{ ...tdStyle, textAlign: "right" }}>
                  <StatusBadge value={rate} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
