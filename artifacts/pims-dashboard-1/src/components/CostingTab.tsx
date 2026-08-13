import React from "react";
import { useTranslation } from "react-i18next";
import { ProjectCommentPanel } from "./ProjectCommentPanel";

import { useProjectDetail, fmtPct, ratioPct } from "../lib/projectDetailData";
import { useMoney } from "../lib/displayUnit";
import { chartTheme } from "../lib/chartTheme";
import { cardStyle, sectionTitle } from "../lib/uiTokens";

const emptyStyle: React.CSSProperties = {
  padding: "24px 0",
  textAlign: "center",
  fontSize: "13px",
  color: "#7c8ba3",
};

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
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
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
          fill="#16294a"
        >
          {centerLabel}
        </text>
      )}
    </svg>
  );
}

const EST_META: { kind: "bidding" | "execution" | "completion"; label: string; color: string }[] = [
  { kind: "bidding", label: "입찰", color: chartTheme.paleBlue },
  { kind: "execution", label: "실행예산 편성", color: chartTheme.planBlue },
  { kind: "completion", label: "준공추정원가율", color: chartTheme.headingNavy },
];

/** raw Korean label (fixed set above) → translation key */
const EST_LABEL_KEY: Record<string, string> = {
  "입찰": "estBidding",
  "실행예산 편성": "estExecutionBudget",
  "준공추정원가율": "estCompletionCostRatio",
};

type BudgetRow = {
  category: string | null;
  item: string;
  budget: number | null;
  plan: number | null;
  actual: number | null;
  bold?: boolean;
};

function BudgetExecutionStatus({ rows }: { rows: BudgetRow[] }) {
  const { t } = useTranslation(["costingTab", "common"]);
  const { fmtMoney } = useMoney();
  const maxBudget = Math.max(...rows.map((r) => r.budget ?? 0), 1);
  let lastCategory: string | null = null;
  return (
    <div style={cardStyle}>
      <span style={sectionTitle}>{t("costingTab:budgetExecutionStatusTitle")}</span>
      {rows.length === 0 ? (
        <div style={emptyStyle}>{t("costingTab:noBudgetDataNotice")}</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "18px", marginTop: "14px" }}>
          {rows.map((row, i) => {
            const showCategory = row.category != null && row.category !== lastCategory;
            lastCategory = row.category ?? lastCategory;
            const trackW = row.budget != null ? Math.max((Math.log10(row.budget + 1) / Math.log10(maxBudget + 1)) * 100, 12) : 12;
            const planW = row.plan != null ? Math.min((row.plan / maxBudget) * 100, 100) : 0;
            const actualW = row.actual != null ? Math.min((row.actual / maxBudget) * 100, 100) : 0;
            const planPct = ratioPct(row.plan, row.budget);
            const actualPct = ratioPct(row.actual, row.budget);
            return (
              <React.Fragment key={`${row.item}-${i}`}>
              {showCategory && (
                <div style={{
                  fontSize: "12px",
                  fontWeight: 700,
                  color: "#333",
                  marginTop: i === 0 ? 0 : "2px",
                  marginBottom: "-8px",
                }}>
                  {row.category}
                </div>
              )}
              <div style={{ display: "flex", alignItems: "center" }}>
                <div style={{ width: "110px", minWidth: "110px", fontSize: "12px", color: "#333", fontWeight: row.bold ? 700 : 400 }}>
                  <span>{row.item}</span>
                </div>
                <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
                  <div
                    style={{
                      position: "relative",
                      width: `${trackW}%`,
                      height: row.plan != null || row.actual != null ? "52px" : "40px",
                      backgroundColor: chartTheme.lightGray,
                    }}
                  >
                  </div>
                  {row.plan != null && (
                    <div
                      style={{
                        position: "absolute",
                        top: "4px",
                        left: 0,
                        width: `${Math.max(planW, 3)}%`,
                        height: "20px",
                        backgroundColor: chartTheme.outflowRed,
                      }}
                    >
                      <span
                        style={{
                          position: "absolute",
                          top: "50%",
                          left: "50%",
                          transform: "translate(-50%, -50%)",
                          fontSize: "10px",
                          color: "#fff",
                          fontWeight: 700,
                        }}
                      >
                        {fmtMoney(row.plan)}
                      </span>
                      {planPct != null && (
                        <span
                          style={{
                            position: "absolute",
                            right: "-6px",
                            top: "50%",
                            transform: "translate(100%, -50%)",
                            fontSize: "10px",
                            color: chartTheme.outflowRed,
                            fontWeight: 700,
                          }}
                        >
                          {fmtPct(planPct)}
                        </span>
                      )}
                    </div>
                  )}
                  {row.actual != null && (
                    <div
                      style={{
                        position: "absolute",
                        top: "28px",
                        left: 0,
                        width: `${Math.max(actualW, 3)}%`,
                        height: "20px",
                        backgroundColor: chartTheme.planBlue,
                      }}
                    >
                      <span
                        style={{
                          position: "absolute",
                          top: "50%",
                          left: "50%",
                          transform: "translate(-50%, -50%)",
                          fontSize: "10px",
                          color: "#fff",
                          fontWeight: 700,
                        }}
                      >
                        {fmtMoney(row.actual)}
                      </span>
                      {actualPct != null && (
                        <span
                          style={{
                            position: "absolute",
                            right: "-6px",
                            top: "50%",
                            transform: "translate(100%, -50%)",
                            fontSize: "10px",
                            color: chartTheme.planBlue,
                            fontWeight: 700,
                          }}
                        >
                          {fmtPct(actualPct)}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                {/* 예산 금액 — 카드 바깥으로 넘치지 않도록 고정 너비 컬럼으로 분리 */}
                <div style={{ width: "58px", minWidth: "58px", textAlign: "right", fontSize: "11px", color: "#555", paddingLeft: "4px" }}>
                  {fmtMoney(row.budget)}
                </div>
              </div>
              </React.Fragment>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function CostingTab({
  projectName,
  toYear,
  toMonth,
}: {
  projectName: string;
  toYear: number;
  toMonth: number;
}) {
  const { t } = useTranslation(["costingTab", "common"]);
  const { fmtMoney } = useMoney();
  const { detail, isLoading } = useProjectDetail(projectName);

  const estimation = detail?.costEstimation ?? [];
  // 준공추정(completion)은 월별 이력 중 조회 기간 마지막 월 이하의 가장 최근 값 사용
  const completionRows = estimation.filter((e) => e.kind === "completion");
  const datedCompletions = completionRows
    .filter((e) => e.year != null && e.month != null)
    .filter((e) => e.year! * 100 + e.month! <= toYear * 100 + toMonth)
    .sort((a, b) => a.year! * 100 + a.month! - (b.year! * 100 + b.month!));
  const pickedCompletion =
    datedCompletions[datedCompletions.length - 1] ??
    completionRows.find((e) => e.year == null || e.month == null) ??
    null;
  const budgetRows: BudgetRow[] = (detail?.costBudget ?? []).map((r) => ({
    category: r.category ?? null,
    item: r.item,
    budget: r.budget ?? null,
    plan: r.plan ?? null,
    actual: r.actual ?? null,
    bold: r.category == null, // category 없는 단독 항목(Contingency 등)은 굵게
  }));

  // 합계 행 (예산 데이터가 있을 때만)
  const rowsWithSum: BudgetRow[] =
    budgetRows.length > 0
      ? [
          ...budgetRows,
          {
            category: null,
            item: t("common:total"),
            budget: budgetRows.reduce((a, r) => a + (r.budget ?? 0), 0),
            plan: budgetRows.some((r) => r.plan != null) ? budgetRows.reduce((a, r) => a + (r.plan ?? 0), 0) : null,
            actual: budgetRows.some((r) => r.actual != null) ? budgetRows.reduce((a, r) => a + (r.actual ?? 0), 0) : null,
            bold: true,
          },
        ]
      : [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      {/* Row 1: Cost estimation donuts */}
      <div style={cardStyle}>
        <span style={sectionTitle}>{t("costingTab:costEstimationTitle")}</span>
        {isLoading ? (
          <div style={emptyStyle}>{t("common:loading")}</div>
        ) : estimation.length === 0 ? (
          <div style={emptyStyle}>{t("costingTab:noCostRatioDataNotice")}</div>
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
                meta.kind === "completion" ? pickedCompletion : estimation.find((e) => e.kind === meta.kind);
              const contract = row?.contractAmount ?? null;
              const cost = row?.costAmount ?? null;
              const pct = ratioPct(cost, contract);
              const baseMonth =
                meta.kind === "completion" && row?.year != null && row?.month != null
                  ? t("costingTab:asOfBasis", {
                      ym: `${String(row.year).slice(2)}.${String(row.month).padStart(2, "0")}`,
                    })
                  : "";
              return (
                <div key={meta.kind} style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "12px", color: "#555", marginBottom: "2px" }}>
                    {cost != null || contract != null ? `${fmtMoney(cost)} / ${fmtMoney(contract)}` : "-"}
                  </div>
                  <Donut percent={pct ?? 0} color={meta.color} size={150} stroke={16} centerLabel={fmtPct(pct)} />
                  <div style={{ fontSize: "13px", color: "#16294a", fontWeight: 600, marginTop: "4px" }}>
                    {t(`costingTab:${EST_LABEL_KEY[meta.label]}`)}
                    {baseMonth}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Row 2: DB 원가 실적 */}

      {/* Row 3: Budget Execution Status */}
      <BudgetExecutionStatus rows={rowsWithSum} />

      {/* Row 3: Comment */}
      <div style={cardStyle}>
        <ProjectCommentPanel projectName={projectName} tab="costing" />
      </div>
    </div>
  );
}
