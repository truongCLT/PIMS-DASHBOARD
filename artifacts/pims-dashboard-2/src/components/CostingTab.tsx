import React from "react";
import { ProjectCommentPanel } from "./ProjectCommentPanel";

import {
  useListSalescostSites,
  getListSalescostSitesQueryKey,
} from "@workspace/api-client-react";
import { useProjectDetail, fmtPct, ratioPct } from "../lib/projectDetailData";
import { useMoney } from "../lib/displayUnit";
import { useMrProject } from "../data/mrProjectLinks";
import { REPORT_YEAR } from "../lib/mgmtreportData";
import { chartTheme } from "../lib/chartTheme";

const cardStyle: React.CSSProperties = {
  backgroundColor: "#fff",
  border: "1px solid #d0dce8",
  borderRadius: "6px",
  padding: "10px 12px",
};

const sectionTitle: React.CSSProperties = {
  fontSize: "11px",
  fontWeight: 600,
  color: "#4472c4",
};

const emptyStyle: React.CSSProperties = {
  padding: "24px 0",
  textAlign: "center",
  fontSize: "11px",
  color: "#8a97a8",
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
          fill="#1a2d4d"
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

type BudgetRow = {
  category: string | null;
  item: string;
  budget: number | null;
  plan: number | null;
  actual: number | null;
};

function BudgetExecutionStatus({ rows }: { rows: BudgetRow[] }) {
  const { fmtMoney } = useMoney();
  const maxBudget = Math.max(...rows.map((r) => r.budget ?? 0), 1);
  let lastCategory: string | null = null;
  return (
    <div style={cardStyle}>
      <span style={sectionTitle}>예산 집행 현황</span>
      {rows.length === 0 ? (
        <div style={emptyStyle}>예산 집행 데이터가 없습니다. ( - )</div>
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
              <div key={`${row.item}-${i}`} style={{ display: "flex", alignItems: "center" }}>
                <div style={{ width: "110px", minWidth: "110px", fontSize: "10px", color: "#333" }}>
                  {showCategory && <div style={{ marginBottom: "14px", fontWeight: 700 }}>{row.category}</div>}
                  <span>{row.item}</span>
                </div>
                <div style={{ flex: 1, position: "relative" }}>
                  <div
                    style={{
                      position: "relative",
                      width: `${trackW}%`,
                      height: row.plan != null || row.actual != null ? "52px" : "40px",
                      backgroundColor: chartTheme.lightGray,
                    }}
                  >
                    <span
                      style={{
                        position: "absolute",
                        right: "-8px",
                        top: "50%",
                        transform: "translate(100%, -50%)",
                        fontSize: "9px",
                        color: "#555",
                      }}
                    >
                      {fmtMoney(row.budget)}
                    </span>
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
                          fontSize: "8px",
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
                            fontSize: "8px",
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
                          fontSize: "8px",
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
                            fontSize: "8px",
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
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const MONTH_LABELS = ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"];

/** DB 원가 실적 (sc_monthly cogs 우선, 없으면 mr_monthly cogs 폴백) */
function DbCostActualCard({ projectName }: { projectName: string }) {
  const { fmtMoney, unitLabel } = useMoney();
  const mr = useMrProject(projectName, REPORT_YEAR);
  const siteCode = mr.project?.siteCode ?? null;
  const cogsParams = { year: REPORT_YEAR, metric: "cogs" as const };
  const cogsQ = useListSalescostSites(cogsParams, {
    query: { enabled: siteCode != null, queryKey: getListSalescostSitesQueryKey(cogsParams) },
  });
  const scMonths = cogsQ.data?.sites.find((s) => s.code === siteCode)?.months ?? [];
  const scHasAny = scMonths.some((v) => (v ?? 0) !== 0);
  const months = scHasAny ? scMonths : (mr.project?.cogsActual ?? []);
  const hasAny = months.some((v) => (v ?? 0) !== 0);
  const loading = mr.isLoading || (siteCode != null && cogsQ.isLoading);

  let cum = 0;
  const rows = MONTH_LABELS.map((label, i) => {
    const v = months[i] ?? 0;
    cum += v;
    return { label, value: v, cum };
  });

  return (
    <div style={cardStyle}>
      <span style={sectionTitle}>
        실제 원가 ({REPORT_YEAR}년 · {unitLabel}{hasAny ? (scHasAny ? " · 매출/원가 DB" : " · 경영관리보고회 DB") : ""})
      </span>
      {loading ? (
        <div style={emptyStyle}>불러오는 중…</div>
      ) : !hasAny ? (
        <div style={emptyStyle}>DB에 원가 실적 데이터가 없습니다. ( - )</div>
      ) : (
        <div style={{ overflowX: "auto", marginTop: "8px" }}>
          <table style={{ borderCollapse: "collapse", width: "100%", fontSize: "10px" }}>
            <thead>
              <tr>
                <th style={{ border: "1px solid #d0dce8", padding: "4px 6px", backgroundColor: "#eef3f9", color: "#1a2d4d", textAlign: "left" }}>구분</th>
                {rows.map((r) => (
                  <th key={r.label} style={{ border: "1px solid #d0dce8", padding: "4px 6px", backgroundColor: "#eef3f9", color: "#1a2d4d", textAlign: "right" }}>
                    {r.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ border: "1px solid #d0dce8", padding: "4px 6px", fontWeight: 600, color: "#333", whiteSpace: "nowrap" }}>월 원가</td>
                {rows.map((r) => (
                  <td key={r.label} style={{ border: "1px solid #d0dce8", padding: "4px 6px", textAlign: "right", color: "#333" }}>
                    {r.value !== 0 ? fmtMoney(r.value) : "-"}
                  </td>
                ))}
              </tr>
              <tr>
                <td style={{ border: "1px solid #d0dce8", padding: "4px 6px", fontWeight: 600, color: chartTheme.planBlue, whiteSpace: "nowrap" }}>누계</td>
                {rows.map((r) => (
                  <td key={r.label} style={{ border: "1px solid #d0dce8", padding: "4px 6px", textAlign: "right", color: chartTheme.planBlue, fontWeight: 600 }}>
                    {r.cum !== 0 ? fmtMoney(r.cum) : "-"}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
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
  }));

  // 합계 행 (예산 데이터가 있을 때만)
  const rowsWithSum: BudgetRow[] =
    budgetRows.length > 0
      ? [
          ...budgetRows,
          {
            category: null,
            item: "합계",
            budget: budgetRows.reduce((a, r) => a + (r.budget ?? 0), 0),
            plan: budgetRows.some((r) => r.plan != null) ? budgetRows.reduce((a, r) => a + (r.plan ?? 0), 0) : null,
            actual: budgetRows.some((r) => r.actual != null) ? budgetRows.reduce((a, r) => a + (r.actual ?? 0), 0) : null,
          },
        ]
      : [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      {/* Row 1: Cost estimation donuts */}
      <div style={cardStyle}>
        <span style={sectionTitle}>원가 견적</span>
        {isLoading ? (
          <div style={emptyStyle}>불러오는 중…</div>
        ) : estimation.length === 0 ? (
          <div style={emptyStyle}>원가율 데이터가 없습니다. ( - )</div>
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
                  ? ` ('${String(row.year).slice(2)}.${String(row.month).padStart(2, "0")} 기준)`
                  : "";
              return (
                <div key={meta.kind} style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "10px", color: "#555", marginBottom: "2px" }}>
                    {cost != null || contract != null ? `${fmtMoney(cost)} / ${fmtMoney(contract)}` : "-"}
                  </div>
                  <Donut percent={pct ?? 0} color={meta.color} size={150} stroke={16} centerLabel={fmtPct(pct)} />
                  <div style={{ fontSize: "11px", color: "#1a2d4d", fontWeight: 600, marginTop: "4px" }}>
                    {meta.label}
                    {baseMonth}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Row 2: DB 원가 실적 */}
      <DbCostActualCard projectName={projectName} />

      {/* Row 3: Budget Execution Status */}
      <BudgetExecutionStatus rows={rowsWithSum} />

      {/* Row 3: Comment */}
      <div style={cardStyle}>
        <ProjectCommentPanel projectName={projectName} tab="costing" />
      </div>
    </div>
  );
}
