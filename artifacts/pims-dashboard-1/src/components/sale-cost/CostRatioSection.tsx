/**
 * 원가율 도넛 카드 — 입찰, 실행예산 편성, 표준추정원가율.
 * 각 도넛 hover 시 도급액 / 추정원가 금액을 title 속성으로 표시한다.
 */
import React from "react";
import { useTranslation } from "react-i18next";
import { chartTheme } from "../../lib/chartTheme";
import { useMoney } from "../../lib/displayUnit";
import { fmtPct } from "../../lib/projectDetailData";
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
// 도넛 순서: 입찰 → 실행예산 편성 → 표준추정원가율
// ---------------------------------------------------------------------------

const EST_META: {
  kind: "bidding" | "execution" | "completion";
  labelKey: string;
  color: string;
}[] = [
  { kind: "bidding",    labelKey: "estBidding",             color: chartTheme.paleBlue    },
  { kind: "execution",  labelKey: "estExecutionBudget",    color: chartTheme.planBlue    },
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
  ratioPct?: number | null;
  initialBusinessBudget?: number | null;
  initialContractAmount?: number | null;
  initialGrossProfitRatio?: number | null;
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
  const { fmtMoneyFull, fmtVnd } = useMoney();

  // Execution/Completion đến từ PIMSVINA sync và có thể có nhiều dòng lịch sử (1 dòng/tháng) — luôn
  // lấy dòng của tháng MỚI NHẤT đã đồng bộ (giống mục "4. Cost Rate" ở Data Entry), bỏ cutoff theo
  // toYear/toMonth (cutoff đó chỉ hợp lý khi completion từng là dự báo nhập tay nhiều tháng tương lai).
  const pickLatestByKind = (kind: "execution" | "completion") => {
    const rows = estimation.filter((e) => e.kind === kind);
    const dated = rows
      .filter((e) => e.year != null && e.month != null)
      .sort((a, b) => a.year! * 100 + a.month! - (b.year! * 100 + b.month!));
    return dated[dated.length - 1] ?? rows.find((e) => e.year == null || e.month == null) ?? null;
  };
  const pickedExecution = pickLatestByKind("execution");
  const pickedCompletion = pickLatestByKind("completion");
  // Initial Business Budget(최초 승인 예산)는 Base Month별로 바뀌는 값이 아니라 한 번 승인되면 고정되는
  // 기준선이라, 최신 달 행에 우연히 null이 와도 다른 달 행에는 값이 있을 수 있다 — 이력 전체에서 값이
  // 있는 가장 최근 달의 값을 찾아 쓴다(ProjectDataEntryTab "4. Cost Rate"와 동일한 원칙).
  const latestInitialBudgetRow = estimation
    .filter((e) => e.kind === "execution" && e.initialBusinessBudget != null)
    .reduce<CostEstimationRow | null>((latest, e) => {
      if (!latest) return e;
      const eKey = (e.year ?? 0) * 100 + (e.month ?? 0);
      const latestKey = (latest.year ?? 0) * 100 + (latest.month ?? 0);
      return eKey > latestKey ? e : latest;
    }, null);

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
                : meta.kind === "execution"
                  ? pickedExecution
                  : estimation.find((e) => e.kind === meta.kind);
            // Cùng công thức với mục "4. Cost Rate" (ProjectDataEntryTab)/CostingTab: Execution hiển thị
            // Initial Budget (ngân sách gốc được duyệt lần đầu), không phải Business Budget hiện tại.
            // Completion lấy nguyên Contract Amount/Cost của dòng Execution CÙNG Base Month (Completion
            // luôn đồng bộ chung year/month với Execution) thay vì Contract=100 cố định/REC9 riêng.
            const contract =
              meta.kind === "completion" ? (pickedExecution?.contractAmount ?? null) : (row?.contractAmount ?? null);
            const cost =
              meta.kind === "completion"
                ? (pickedExecution?.costAmount ?? null)
                : meta.kind === "execution"
                  ? (latestInitialBudgetRow?.initialBusinessBudget ?? null)
                  : (row?.costAmount ?? null);
            // Ratio(%) = Cost/Contract*100 cho cả 3 dòng (nguyên tắc "원가율" — luôn <= 100% khi có lãi).
            const pct = contract != null && cost != null && contract !== 0 ? (cost / contract) * 100 : null;
            // execution/completion은 VND 원본 그대로 저장되므로 fmtVnd(), bidding(수동 입력)은 천 USD
            // 기준이므로 fmtMoneyFull()을 쓴다(Unit 토글에 상관없이 항상 전체 금액 — fmtVnd()와 동일한
            // 성격이라야 옆의 execution 금액과 자릿수가 맞게 보인다).
            const fmtAmount = meta.kind === "bidding" ? fmtMoneyFull : fmtVnd;
            const hoverTitle =
              contract != null || cost != null
                ? `도급액: ${fmtAmount(contract)} / 원가: ${fmtAmount(cost)}`
                : undefined;
            const baseMonth =
              meta.kind === "completion" && row?.year != null && row?.month != null
                ? t("costingTab:asOfBasis", {
                    ym: `${String(row.year).slice(2)}.${String(row.month).padStart(2, "0")}`,
                  })
                : "";
            return (
              <div key={meta.kind} style={{ textAlign: "center", width: "170px" }}>
                <div
                  style={{ fontSize: "12px", color: INK_SECONDARY, marginBottom: "2px" }}
                  title={hoverTitle}
                >
                  {cost != null || contract != null ? `${fmtAmount(cost)} / ${fmtAmount(contract)}` : "-"}
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
