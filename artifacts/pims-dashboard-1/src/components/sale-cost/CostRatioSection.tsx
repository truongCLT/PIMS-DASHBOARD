/**
 * 원가율 도넛 카드 — 실행예산 편성 먼저(왼쪽), 입찰, 표준추정원가율.
 * 각 도넛 hover 시 도급액 / 추정원가 금액을 title 속성으로 표시한다.
 */
import React from "react";
import { useTranslation } from "react-i18next";
import { chartTheme } from "../../lib/chartTheme";
import { useMoney } from "../../lib/displayUnit";
import { fmtPct, ratioPct } from "../../lib/projectDetailData";
import { cardStyle, sectionTitle, emptyNote, INK_NAVY, INK_SECONDARY } from "../../lib/uiTokens";

// ---------------------------------------------------------------------------
// Donut SVG primitive
// ---------------------------------------------------------------------------

function Donut({
  percent,
  size = 150,
  stroke = 16,
  color = chartTheme.planBlue,
  track = chartTheme.trackGray,
  centerLabel,
}: {
  percent: number;
  size?: number;
  stroke?: number;
  color?: string;
  track?: string;
  centerLabel?: string;
}) {
  const r   = (size - stroke) / 2;
  const c   = 2 * Math.PI * r;
  const arc = (Math.min(Math.max(percent, 0), 100) / 100) * c;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeDasharray={`${arc} ${c}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      {centerLabel && (
        <text
          x={size / 2}
          y={size / 2}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={15}
          fontWeight={700}
          fill={INK_NAVY}
        >
          {centerLabel}
        </text>
      )}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// 도넛 순서: 실행예산 편성 → 입찰 → 표준추정원가율
// ---------------------------------------------------------------------------

const EST_META: {
  kind: "bidding" | "execution" | "completion";
  labelKey: string;
  color: string;
}[] = [
  { kind: "execution",  labelKey: "estExecutionBudget",    color: chartTheme.planBlue    },
  { kind: "bidding",    labelKey: "estBidding",             color: chartTheme.paleBlue    },
  { kind: "completion", labelKey: "estStandardCompletion",  color: chartTheme.headingNavy },
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CostEstimationRow = {
  kind: "bidding" | "execution" | "completion";
  contractAmount?: number | null;
  costAmount?: number | null;
  year?: number | null;
  month?: number | null;
};

// ---------------------------------------------------------------------------
// Public component
// ---------------------------------------------------------------------------

export function CostRatioCard({
  estimation,
  toYear,
  toMonth,
  isLoading,
}: {
  estimation: CostEstimationRow[];
  toYear: number;
  toMonth: number;
  isLoading: boolean;
}) {
  const { t } = useTranslation(["saleCostTab", "costingTab"]);
  const { fmtMoney } = useMoney();

  // 준공추정: 조회 기간 마지막 월 이하의 가장 최근 값
  const completionRows = estimation.filter((e) => e.kind === "completion");
  const datedCompletions = completionRows
    .filter((e) => e.year != null && e.month != null)
    .filter((e) => e.year! * 100 + e.month! <= toYear * 100 + toMonth)
    .sort((a, b) => a.year! * 100 + a.month! - (b.year! * 100 + b.month!));
  const pickedCompletion =
    datedCompletions[datedCompletions.length - 1] ??
    completionRows.find((e) => e.year == null || e.month == null) ??
    null;

  const noData = !isLoading && estimation.length === 0;

  return (
    <div style={cardStyle}>
      <span style={sectionTitle}>{t("saleCostTab:costRatioTitle")}</span>
      {isLoading || noData ? (
        <div style={emptyNote}>{t("costingTab:noCostRatioDataNotice")}</div>
      ) : (
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-around",
            marginTop: "10px",
            paddingBottom: "6px",
            flexWrap: "wrap",
            gap: "16px",
          }}
        >
          {EST_META.map((meta) => {
            const row =
              meta.kind === "completion"
                ? pickedCompletion
                : estimation.find((e) => e.kind === meta.kind);
            const contract = row?.contractAmount ?? null;
            const cost     = row?.costAmount ?? null;
            const pct      = ratioPct(cost, contract);
            const hoverTitle =
              contract != null || cost != null
                ? `도급액: ${fmtMoney(contract)} / 추정원가: ${fmtMoney(cost)}`
                : undefined;
            const baseMonth =
              meta.kind === "completion" && row?.year != null && row?.month != null
                ? t("costingTab:asOfBasis", {
                    ym: `${String(row.year).slice(2)}.${String(row.month).padStart(2, "0")}`,
                  })
                : "";
            return (
              <div key={meta.kind} style={{ textAlign: "center" }}>
                <div
                  style={{ fontSize: "12px", color: INK_SECONDARY, marginBottom: "2px" }}
                  title={hoverTitle}
                >
                  {cost != null || contract != null
                    ? `${fmtMoney(cost)} / ${fmtMoney(contract)}`
                    : "-"}
                </div>
                <div title={hoverTitle} style={{ cursor: "default" }}>
                  <Donut
                    percent={pct ?? 0}
                    color={meta.color}
                    size={150}
                    stroke={16}
                    centerLabel={fmtPct(pct)}
                  />
                </div>
                <div
                  style={{
                    fontSize: "13px",
                    color: INK_NAVY,
                    fontWeight: 600,
                    marginTop: "4px",
                  }}
                >
                  {t(`saleCostTab:${meta.labelKey}`)}
                  {baseMonth}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
