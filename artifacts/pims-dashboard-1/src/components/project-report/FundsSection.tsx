/**
 * FundsSection — 자금 카드
 * Shows contract amount / cumulative recognised revenue / cash collected /
 * outstanding receivable, plus collection rate badge.
 * Data sourced from cashflow API — same as OverviewTab.
 */
import React from "react";
import { ratioPct } from "../../lib/projectDetailData";
import { chartTheme } from "../../lib/chartTheme";
import {
  cardStyle,
  sectionTitle,
  INK_NAVY,
  INK_SECONDARY,
  INK_MUTED,
  DIVIDER,
} from "../../lib/uiTokens";
import { useMoney } from "../../lib/displayUnit";
import { DASH, StatusBadge } from "./ReportPrimitives";

interface Props {
  cashIn: number;
  cashOut: number;
  contractAmount: number | null;
  cumRev: number;
}

export function FundsSection({ cashIn, cashOut, contractAmount, cumRev }: Props) {
  const { fmtMoney, unitLabel, convertVndToKUsd } = useMoney();
  // contractAmount đến từ pd_overview, lưu VND gốc — cashIn/cashOut/cumRev đều ở đơn vị 천 USD, nên
  // phải quy đổi trước khi hiển thị chung bằng fmtMoney() (nếu không sẽ lệch đơn vị hoàn toàn).
  const contractAmountKUsd = contractAmount != null ? convertVndToKUsd(contractAmount) : null;

  const outstanding = Math.max(0, cumRev - cashIn);
  const collectionRate = cumRev > 0 ? (cashIn / cumRev) * 100 : null;
  const hasFundData = cashIn !== 0 || cashOut !== 0;

  const items: Array<{ label: string; value: number | null; color: string }> = [
    { label: "누계 매출", value: contractAmountKUsd, color: chartTheme.neutralGray },
    { label: "누계 기성 (확정)", value: cumRev, color: chartTheme.neutralGray },
    { label: "수금 (실적)", value: cashIn, color: chartTheme.balanceNavy },
    { label: "미수금 (채권)", value: outstanding, color: chartTheme.outflowRed },
  ];

  return (
    <div style={cardStyle}>
      <div style={{ ...sectionTitle, marginBottom: "4px" }}>
        자금
        <span
          style={{ fontSize: "11px", fontWeight: 400, color: INK_MUTED, marginLeft: "6px" }}
        >
          {unitLabel}
        </span>
      </div>
      <div style={{ fontSize: "11px", color: INK_MUTED, marginBottom: "6px" }}>
        ※ 경영현황판 자금수지 (상세보기 포함)와 동일하게
      </div>

      {!hasFundData ? (
        <div style={{ fontSize: "12px", color: INK_MUTED, padding: "8px 0" }}>{DASH}</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {items.map(({ label, value, color }) => (
            <div
              key={label}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "5px 0",
                borderBottom: `1px solid ${DIVIDER}`,
              }}
            >
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                  fontSize: "11px",
                  color: INK_SECONDARY,
                }}
              >
                <span
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "2px",
                    backgroundColor: color,
                    display: "inline-block",
                    flexShrink: 0,
                  }}
                />
                {label}
              </span>
              <span style={{ fontSize: "12px", fontWeight: 600, color: INK_NAVY }}>
                {value != null ? fmtMoney(value) : DASH}
              </span>
            </div>
          ))}

          {collectionRate != null && (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                paddingTop: "6px",
              }}
            >
              <span style={{ fontSize: "11px", color: INK_MUTED }}>
                수금률 (수금 / 누계 기성)
              </span>
              <StatusBadge value={collectionRate} />
            </div>
          )}

          <div style={{ fontSize: "11px", color: INK_MUTED, marginTop: "8px" }}>
            ※ 매출처럼 계획, 전망 표시
          </div>
          <div style={{ fontSize: "11px", color: INK_MUTED }}>
            ※ 상세보기 표는 매출, 인정, 수금 채권 추가
          </div>
        </div>
      )}
    </div>
  );
}
