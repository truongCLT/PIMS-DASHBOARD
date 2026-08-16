import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { ProjectDetailPhoto } from "@workspace/api-client-react";
import {
  useListSalescostSites,
  getListSalescostSitesQueryKey,
  useGetCashflowMonthly,
  getGetCashflowMonthlyQueryKey,
} from "@workspace/api-client-react";
import projectPhoto from "../assets/project-photo.png";
import { PhotoPager } from "./PhotoPager";
import { Donut, MiniBar } from "./charts";
import { useProjectDetail, fmtPct, ratioPct } from "../lib/projectDetailData";
import { useMoney } from "../lib/displayUnit";
import { getMrCashflowRef, useMrProject } from "../data/mrProjectLinks";
import { REPORT_YEAR } from "../lib/mgmtreportData";
import { chartTheme } from "../lib/chartTheme";
import { cardStyle, sectionTitle, emptyNote, INK_NAVY, INK_BODY, INK_SECONDARY, INK_MUTED, CARD_BORDER, DIVIDER, PROGRESS_TRACK, ACHIEVE_GREEN, ACHIEVE_RED, rateColor } from "../lib/uiTokens";

const ROW_COLUMNS = "1fr 1.6fr 1.6fr";

/** 달성률 색 규칙: 100% 이상 녹색, 미만 빨간색 (디자인 의견서) — 공통 토큰 재수출 */
export { ACHIEVE_GREEN, ACHIEVE_RED, rateColor };

/** 카드 공통 헤더 — 제목 + 단위 표기 + 우측 상단 핵심 결과값 배지 */
export function CardHeader({
  title,
  unit,
  badgeLabel,
  badgeValue,
  badgeColor,
  right,
}: {
  title: string;
  unit?: string;
  badgeLabel?: string;
  badgeValue?: string;
  badgeColor?: string;
  right?: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px", gap: "8px" }}>
      <span style={{ display: "flex", alignItems: "baseline", gap: "6px", minWidth: 0 }}>
        <span style={{ ...sectionTitle, marginBottom: 0 }}>{title}</span>
        {unit && <span style={{ fontSize: "11px", color: INK_MUTED, whiteSpace: "nowrap" }}>{unit}</span>}
      </span>
      <span style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
        {badgeValue != null && (
          <span
            style={{
              fontSize: "11px",
              fontWeight: 700,
              color: badgeColor ?? INK_NAVY,
              backgroundColor: `${badgeColor ?? INK_NAVY}14`,
              border: `1px solid ${badgeColor ?? INK_NAVY}33`,
              borderRadius: "10px",
              padding: "2px 8px",
              whiteSpace: "nowrap",
            }}
          >
            {badgeLabel ? `${badgeLabel} ` : ""}{badgeValue}
          </span>
        )}
        {right}
      </span>
    </div>
  );
}

const monthSelectStyle: React.CSSProperties = {
  fontSize: "12px",
  border: `1px solid ${CARD_BORDER}`,
  borderRadius: "4px",
  padding: "2px 4px",
  color: INK_BODY,
  cursor: "pointer",
};


/** raw Korean item name (fixed identifier from cost-budget data) → translation key */
const ITEM_LABEL_KEY: Record<string, string> = {
  "외주성": "outsourcingItem",
};

function PhotoCard({ projectName, photos, slideshowIntervalSeconds = 0 }: { projectName: string; photos: ProjectDetailPhoto[]; slideshowIntervalSeconds?: number }) {
  const { t } = useTranslation(["overviewTab", "common"]);
  const [active, setActive] = useState(0);

  useEffect(() => { setActive(0); }, [projectName]);
  useEffect(() => {
    if (active >= photos.length && photos.length > 0) setActive(0);
  }, [photos.length, active]);

  const hasPhotos = photos.length > 0;
  const safeIdx = Math.min(active, Math.max(photos.length - 1, 0));
  const src = hasPhotos ? `/api/storage${photos[safeIdx].objectPath}` : projectPhoto;
  const total = hasPhotos ? photos.length : 1;

  return (
    <div style={{ ...cardStyle, padding: "8px", display: "flex", flexDirection: "column", minHeight: "220px" }}>
      <PhotoPager
        src={src}
        alt={t("overviewTab:sitePhotoAlt", { projectName })}
        total={total}
        current={hasPhotos ? safeIdx : 0}
        onChange={setActive}
        imgStyle={{ minHeight: "170px" }}
        autoPlayIntervalSeconds={slideshowIntervalSeconds}
      />
    </div>
  );
}

/** 오늘 기준 공사 기간 경과율(%) — 시작/종료일 없으면 null */
function timeElapsedPct(startDate: string | null, endDate: string | null): number | null {
  if (!startDate || !endDate) return null;
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return null;
  const now = Date.now();
  return Math.min(Math.max(((now - start) / (end - start)) * 100, 0), 100);
}

export function OverviewTab({ projectName }: { projectName: string }) {
  const { t } = useTranslation(["overviewTab", "common"]);
  const { detail } = useProjectDetail(projectName);
  const { fmtMoney, unitLabel } = useMoney();

  // ---- 매출 (salescost — mr_projects.site_code 로 자동 연결, 없으면 mr_monthly 폴백) ----
  const mr = useMrProject(projectName, REPORT_YEAR);
  const siteCode = mr.project?.siteCode ?? null;
  const revParams = { year: REPORT_YEAR, metric: "revenue" as const };
  const cogsParams = { year: REPORT_YEAR, metric: "cogs" as const };
  const revQ = useListSalescostSites(revParams, {
    query: { enabled: siteCode != null, queryKey: getListSalescostSitesQueryKey(revParams) },
  });
  const cogsQ = useListSalescostSites(cogsParams, {
    query: { enabled: siteCode != null, queryKey: getListSalescostSitesQueryKey(cogsParams) },
  });
  const scRevMonths = revQ.data?.sites.find((s) => s.code === siteCode)?.months ?? [];
  const scCogsMonths = cogsQ.data?.sites.find((s) => s.code === siteCode)?.months ?? [];
  const scHasAny = scRevMonths.some((v) => (v ?? 0) !== 0);
  // sc 데이터가 없으면 경영관리보고회 월별 실적(mr_monthly)으로 폴백
  const revMonths = scHasAny ? scRevMonths : (mr.project?.revenueActual ?? []);
  const cogsMonths = scHasAny ? scCogsMonths : (mr.project?.cogsActual ?? []);
  let lastMonthIdx = -1;
  for (let i = 0; i < revMonths.length; i++) if ((revMonths[i] ?? 0) !== 0) lastMonthIdx = i;
  const thisMonthRev = lastMonthIdx >= 0 ? (revMonths[lastMonthIdx] ?? 0) : null;
  const planMonths = mr.project?.revenuePlan ?? [];
  const thisMonthPlan = lastMonthIdx >= 0 ? (planMonths[lastMonthIdx] ?? 0) : null;
  const annualPlanRev = planMonths.reduce((a, b) => a + (b ?? 0), 0);
  const cumRev = revMonths.reduce((a, b) => a + (b ?? 0), 0);
  const cumCogs = cogsMonths.reduce((a, b) => a + (b ?? 0), 0);
  void cumCogs;
  const hasRevenue = lastMonthIdx >= 0;

  // ---- 자금 (cashflow) ----
  // cumRevFiltered 는 resolvedMonth 확정 후 아래에서 계산
  const cfRef = getMrCashflowRef(projectName);
  const cfParams = {
    projectName: cfRef?.name ?? "",
    division: cfRef?.division,
    fromYear: REPORT_YEAR,
    fromMonth: 1,
    months: 12,
  };
  const cfQ = useGetCashflowMonthly(cfParams, {
    query: { enabled: cfRef != null, queryKey: getGetCashflowMonthlyQueryKey(cfParams) },
  });
  // 데이터 입력 탭에서 저장한 월별 자금(pd_cashflow_monthly)이 있으면 우선 사용
  const pdCashPoints = (detail?.cashflow ?? [])
    .filter((c) => c.year === REPORT_YEAR)
    .map((c) => ({
      month: `${c.year}-${String(c.month).padStart(2, "0")}`,
      cashIn: c.cashIn ?? 0,
      cashOut: c.cashOut ?? 0,
      equivalent: c.equivalent ?? 0,
    }));
  const hasPdCashRows = (detail?.cashflow ?? []).length > 0;
  const cfPoints = hasPdCashRows ? pdCashPoints : (cfQ.data?.points ?? []);
  const hasCash = (hasPdCashRows || cfRef != null) && cfPoints.some((p) => p.cashIn !== 0 || p.cashOut !== 0 || p.equivalent !== 0);
  // cfFiltered·cashIn·cashOut·balance 는 resolvedMonth 확정 후 아래에서 계산

  // ---- 공정 (progress) ----
  const progress = detail?.progress ?? [];
  const sorted = [...progress].sort((a, b) => a.year * 12 + a.month - (b.year * 12 + b.month));
  const progRows = sorted.filter((p) => p.planCumPct != null || p.actualCumPct != null || p.planPct != null || p.actualPct != null);

  // ---- 전역 기준월 ----
  // "직전 실적이 있는 월" = revMonths 기준 최신 실적 월, 없으면 progress 마지막 월
  const latestActualMonth: number | null = lastMonthIdx >= 0
    ? lastMonthIdx + 1
    : (progRows.length > 0 ? progRows[progRows.length - 1].month : null);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null); // null = 최신월
  const resolvedMonth = selectedMonth ?? latestActualMonth ?? null;
  // cumRevFiltered: resolvedMonth 기준 누계
  const cumRevFiltered = resolvedMonth == null
    ? cumRev
    : revMonths.slice(0, resolvedMonth).reduce((a, b) => a + (b ?? 0), 0);
  // cfFiltered·cashIn·cashOut·balance: resolvedMonth 기준 필터
  const cfFiltered = resolvedMonth == null
    ? cfPoints
    : cfPoints.filter((p) => {
        const cutoff = `${REPORT_YEAR}-${String(resolvedMonth).padStart(2, "0")}`;
        return p.month <= cutoff;
      });
  const cashIn = cfFiltered.reduce((a, p) => a + (p.cashIn ?? 0), 0);
  const cashOut = cfFiltered.reduce((a, p) => a + (p.cashOut ?? 0), 0);
  let balance: number | null = null;
  for (const p of cfFiltered) {
    if (p.cashIn !== 0 || p.cashOut !== 0 || p.equivalent !== 0) balance = p.equivalent;
  }

  const latest = resolvedMonth != null
    ? (progRows.find((p) => p.year === REPORT_YEAR && p.month === resolvedMonth) ?? (progRows.length > 0 ? progRows[progRows.length - 1] : null))
    : (progRows.length > 0 ? progRows[progRows.length - 1] : null);
  const planCum = latest?.planCumPct ?? null;
  const actualCum = latest?.actualCumPct ?? null;
  const monthlyPlan = latest?.planPct ?? null;
  const monthlyActual = latest?.actualPct ?? null;
  const achieveRate = ratioPct(actualCum, planCum);
  const monthlyAchieveRate = ratioPct(monthlyActual, monthlyPlan);
  const overview = detail?.overview ?? { contractAmount: null, startDate: null, endDate: null };
  const elapsed = timeElapsedPct(overview.startDate, overview.endDate);

  // ---- 원가율 (costEstimation) ----
  const est = (kind: string) => detail?.costEstimation.find((e) => e.kind === kind) ?? null;
  const bidding = est("bidding");
  const execution = est("execution");
  // completion(준공추정)은 월별 이력 중 가장 최근 기준월 값 사용 (기준월 없는 행은 폴백)
  const completion = (() => {
    const rows = (detail?.costEstimation ?? []).filter((e) => e.kind === "completion");
    const dated = rows
      .filter((e) => e.year != null && e.month != null)
      .sort((a, b) => a.year! * 100 + a.month! - (b.year! * 100 + b.month!));
    return dated[dated.length - 1] ?? rows[0] ?? null;
  })();
  const estPct = (e: { contractAmount?: number | null; costAmount?: number | null } | null) =>
    e ? ratioPct(e.costAmount ?? null, e.contractAmount ?? null) : null;

  // ---- 실행예산 집행 (Direct Cost = Common + Expense 1 + 외주성) ----
  const cb = detail?.costBudget ?? [];
  const findCb = (name: string) => cb.find((r) => r.item.trim().toLowerCase() === name.toLowerCase()) ?? null;
  const common = findCb("Common");
  const expense1 = findCb("Expense 1");
  const expense2 = findCb("Expense 2");
  const contingency = findCb("Contingency");
  const outRows = detail?.outsourcing ?? [];
  const outBudget = outRows.some((r) => r.budget != null) ? outRows.reduce((a, r) => a + (r.budget ?? 0), 0) : null;
  const outActual = outRows.some((r) => r.accum != null || r.resolved != null)
    ? outRows.reduce((a, r) => a + (r.accum ?? r.resolved ?? 0), 0)
    : null;
  const cbm = detail?.costBudgetMonthly ?? [];
  const getCbm = (item: string, field: "plan" | "actual") => {
    if (resolvedMonth == null) return null; // 최신월/전체: monthly 미사용
    // 1월부터 선택월까지 누적 합산
    const rows = cbm.filter((r) => r.item === item && r.year === REPORT_YEAR && r.month <= resolvedMonth);
    if (rows.length === 0) return null;
    const total = rows.reduce((a, r) => a + (r[field] ?? 0), 0);
    return total > 0 ? total : null;
  };
  const budgetRows = [
    {
      item: "외주성",
      budget: outBudget,
      plan: resolvedMonth == null
        ? (outRows.some((r) => r.executedBudget != null) ? outRows.reduce((a, r) => a + (r.executedBudget ?? 0), 0) : null)
        : getCbm("외주성", "plan"),
      actual: resolvedMonth == null ? outActual : getCbm("외주성", "actual"),
    },
    {
      item: "Common",
      budget: common?.budget ?? null,
      plan: resolvedMonth == null ? (common?.plan ?? null) : getCbm("Common", "plan"),
      actual: resolvedMonth == null ? (common?.actual ?? null) : getCbm("Common", "actual"),
    },
    {
      item: "Expense 1",
      budget: expense1?.budget ?? null,
      plan: resolvedMonth == null ? (expense1?.plan ?? null) : getCbm("Expense 1", "plan"),
      actual: resolvedMonth == null ? (expense1?.actual ?? null) : getCbm("Expense 1", "actual"),
    },
  ].filter((r) => r.budget != null || r.actual != null || r.plan != null);
  // Direct Cost % 는 Common·Expense 1·외주성 기준 (Expense 2·Contingency 제외)
  const budgetTotal = budgetRows.reduce((a, r) => a + (r.budget ?? 0), 0);
  const actualTotal = budgetRows.reduce((a, r) => a + (r.actual ?? 0), 0);
  const directCostPct = ratioPct(actualTotal, budgetTotal);
  // Direct Cost 외 항목 (첨부 레이아웃: 오른쪽 별도 표시)
  const extraBudgetRows = [
    {
      item: "Expense 2",
      budget: expense2?.budget ?? null,
      plan: resolvedMonth == null ? (expense2?.plan ?? null) : getCbm("Expense 2", "plan"),
      actual: resolvedMonth == null ? (expense2?.actual ?? null) : getCbm("Expense 2", "actual"),
    },
    {
      item: "Contingency",
      budget: contingency?.budget ?? null,
      plan: resolvedMonth == null ? (contingency?.plan ?? null) : getCbm("Contingency", "plan"),
      actual: resolvedMonth == null ? (contingency?.actual ?? null) : getCbm("Contingency", "actual"),
    },
  ].filter((r) => r.budget != null || r.actual != null || r.plan != null);
  const allBudgetRows = [...budgetRows, ...extraBudgetRows];
  // Total Cost % = 전체 항목(Expense 2·Contingency 포함) 기준
  const totalBudgetSum = allBudgetRows.reduce((a, r) => a + (r.budget ?? 0), 0);
  const totalActualSum = allBudgetRows.reduce((a, r) => a + (r.actual ?? 0), 0);
  const totalCostPct = ratioPct(totalActualSum, totalBudgetSum);

  const MAX_H = 110;

  const latestMonthLabel = latestActualMonth != null
    ? `'${String(REPORT_YEAR).slice(2)}.${String(latestActualMonth).padStart(2, "0")}`
    : null;

  return (
    <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "8px" }}>
      {/* 전역 기준월 선택기 */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 0 0" }}>
        <span style={{ fontSize: "12px", color: INK_BODY, fontWeight: 600 }}>{t("overviewTab:referenceMonth")} :</span>
        <select
          value={selectedMonth ?? ""}
          onChange={(e) => setSelectedMonth(e.target.value === "" ? null : Number(e.target.value))}
          style={monthSelectStyle}
        >
          <option value="">
            {t("overviewTab:latestMonth")}{latestMonthLabel ? ` (${latestMonthLabel})` : ""}
          </option>
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
            <option key={m} value={m}>
              {`'${String(REPORT_YEAR).slice(2)}.${String(m).padStart(2, "0")}`}
            </option>
          ))}
        </select>
      </div>

      {/* Row 1: Progress / Revenue / Cost estimation */}
      <div style={{ display: "grid", gridTemplateColumns: ROW_COLUMNS, gap: "8px" }}>
        {/* Progress */}
        <div style={cardStyle}>
          <CardHeader
            title={t("common:process")}
            unit="%"
            badgeLabel={t("common:achievementRate")}
            badgeValue={fmtPct(achieveRate)}
            badgeColor={rateColor(achieveRate)}
            right={undefined}
          />
          {latest == null ? (
            <div style={emptyNote}>{t("overviewTab:noProcessData")}</div>
          ) : (
            <>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-around",
                  alignItems: "flex-end",
                  gap: "12px",
                  margin: "16px 0 10px",
                }}
              >
                {/* 월별 — 2개 막대 + 중앙 상단 달성률 */}
                {(() => {
                  const bars = [
                    { label: t("common:plan"), value: monthlyPlan, color: chartTheme.planBlue },
                    { label: t("common:actual"), value: monthlyActual, color: chartTheme.actualGreen },
                  ];
                  const gmax = Math.max(...bars.map((b) => b.value ?? 0), 1);
                  return (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                      <div style={{ fontSize: "14px", color: rateColor(monthlyAchieveRate), fontWeight: 800, marginBottom: "6px" }}>
                        {t("common:achievementRate")} {fmtPct(monthlyAchieveRate)}
                      </div>
                      <div style={{ display: "flex", alignItems: "flex-end", gap: "10px", height: `${MAX_H + 20}px` }}>
                        {bars.map((b) => (
                          <div
                            key={b.label}
                            style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", height: "100%" }}
                          >
                            <span style={{ fontSize: "12px", fontWeight: 700, color: b.color, marginBottom: "4px" }}>
                              {fmtPct(b.value)}
                            </span>
                            <div
                              style={{
                                width: "34px",
                                height: `${Math.round(((b.value ?? 0) / gmax) * MAX_H)}px`,
                                backgroundColor: b.color,
                                borderRadius: "3px 3px 0 0",
                              }}
                            />
                            <span style={{ fontSize: "11px", color: INK_SECONDARY, marginTop: "5px", fontWeight: 600 }}>{b.label}</span>
                          </div>
                        ))}
                      </div>
                      <div style={{ fontSize: "12px", fontWeight: 700, color: INK_BODY, marginTop: "4px" }}>{t("common:monthly")}</div>
                    </div>
                  );
                })()}

                {/* 누계 — 이중 도넛 (회색 100% + 빨강 계획 + 파랑 실적) */}
                {(() => {
                  const cx = 80, cy = 80, rIn = 54, rOut = 68;
                  const cIn = 2 * Math.PI * rIn;
                  const cOut = 2 * Math.PI * rOut;
                  const aPct = Math.max(0, Math.min(actualCum ?? 0, 100));
                  const pPct = Math.max(0, Math.min(planCum ?? 0, 100));
                  return (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                      <div style={{ fontSize: "12px", fontWeight: 700, marginBottom: "4px", whiteSpace: "nowrap" }}>
                        <span style={{ color: INK_MUTED }}>{t("overviewTab:planA")}</span>
                        <span style={{ color: chartTheme.planBlue, fontSize: "14px", fontWeight: 800 }}>{fmtPct(planCum)}</span>
                      </div>
                      <svg width={136} height={136} viewBox="0 0 160 160">
                        {/* 회색 기준 링 (100%) */}
                        <circle cx={cx} cy={cy} r={rIn} fill="none" stroke={PROGRESS_TRACK} strokeWidth={16} />
                        {/* 빨강: 실적 달성률 (내부 링) */}
                        <circle
                          cx={cx} cy={cy} r={rIn} fill="none"
                          stroke={chartTheme.actualGreen} strokeWidth={16}
                          strokeDasharray={`${(aPct / 100) * cIn} ${cIn}`}
                          transform={`rotate(-90 ${cx} ${cy})`}
                        />
                        {/* 파랑: 계획 달성률 (외부 링) */}
                        <circle
                          cx={cx} cy={cy} r={rOut} fill="none"
                          stroke={chartTheme.planBlue} strokeWidth={8}
                          strokeDasharray={`${(pPct / 100) * cOut} ${cOut}`}
                          strokeLinecap="round"
                          transform={`rotate(-90 ${cx} ${cy})`}
                        />
                        <text x={cx} y={cy + 2} textAnchor="middle" fontSize={30} fontWeight={800} fill={rateColor(achieveRate)}>
                          {fmtPct(actualCum)}
                        </text>
                        <text x={cx} y={cy + 22} textAnchor="middle" fontSize={13} fill={INK_SECONDARY}>
                          {t("overviewTab:actualB")}
                        </text>
                      </svg>
                      <div style={{ fontSize: "12px", fontWeight: 700, color: INK_BODY, marginTop: "2px" }}>{t("common:cumulative")}</div>
                    </div>
                  );
                })()}
              </div>
            </>
          )}
          {/* 공기율 — 공정율과 유사한 그래프 표현 (수평 진행 바) */}
          <div style={{ marginTop: "8px", borderTop: `1px solid ${DIVIDER}`, paddingTop: "8px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "12px", color: INK_BODY, fontWeight: 700, whiteSpace: "nowrap" }}>
                {t("overviewTab:elapsedLabel")}
              </span>
              <div style={{ flex: 1, height: "10px", backgroundColor: PROGRESS_TRACK, borderRadius: "5px", overflow: "hidden" }}>
                <div
                  style={{
                    width: `${Math.max(0, Math.min(elapsed ?? 0, 100))}%`,
                    height: "100%",
                    backgroundColor: chartTheme.planBlue,
                    borderRadius: "5px",
                  }}
                />
              </div>
              <span style={{ fontSize: "13px", fontWeight: 800, color: chartTheme.planBlue, whiteSpace: "nowrap" }}>
                {fmtPct(elapsed)}
              </span>
            </div>
          </div>
        </div>

        {/* Revenue */}
        <div style={cardStyle}>
          <CardHeader
            title={t("common:revenue")}
            unit={unitLabel}
          />
          {mr.isLoading || (siteCode != null && (revQ.isLoading || cogsQ.isLoading)) ? (
            <div style={emptyNote}>{t("overviewTab:loadingRevenue")}</div>
          ) : !hasRevenue ? (
            <div style={emptyNote}>{t("overviewTab:noRevenueData", { year: REPORT_YEAR })}</div>
          ) : (
            <>
              <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-evenly", width: "100%", marginTop: "22px" }}>
                {/* 당월 */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                  {thisMonthPlan != null && thisMonthPlan > 0 && thisMonthRev != null ? (
                    <span style={{
                      fontSize: "15px",
                      fontWeight: 800,
                      color: rateColor((thisMonthRev / thisMonthPlan) * 100),
                      whiteSpace: "nowrap",
                    }}>
                      {fmtPct((thisMonthRev / thisMonthPlan) * 100)}
                    </span>
                  ) : (
                    <span style={{ fontSize: "15px", color: INK_MUTED }}>-</span>
                  )}
                  <div style={{ display: "flex", gap: "10px", alignItems: "flex-end" }}>
                    <MiniBar
                      value={thisMonthPlan ?? 0}
                      max={Math.max(thisMonthPlan ?? 0, thisMonthRev ?? 0, 1)}
                      color={chartTheme.neutralGray}
                      label={t("common:plan")}
                      height={110}
                      valueLabel={fmtMoney(thisMonthPlan)}
                    />
                    <MiniBar
                      value={thisMonthRev ?? 0}
                      max={Math.max(thisMonthPlan ?? 0, thisMonthRev ?? 0, 1)}
                      color={chartTheme.planBlue}
                      label={t("common:actual")}
                      height={110}
                      valueLabel={fmtMoney(thisMonthRev)}
                    />
                  </div>
                  <span style={{ fontSize: "12px", fontWeight: 700, color: INK_BODY, marginTop: "10px" }}>{t("common:currentMonth")}</span>
                </div>

                {/* 년 — 연간 계획 대비 실적 */}
                {(() => {
                  const annualPct = ratioPct(cumRev, annualPlanRev);
                  return (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                      <div style={{ marginTop: "-46px" }}>
                        <Donut
                          percent={annualPct ?? 0}
                          color={rateColor(annualPct)}
                          size={110}
                          stroke={13}
                          label={fmtPct(annualPct)}
                          labelSize={18}
                          labelColor={rateColor(annualPct)}
                        />
                      </div>
                      <div style={{ fontSize: "12px", color: INK_NAVY, fontWeight: 700, marginTop: "12px" }}>
                        {t("overviewTab:annualShort")}
                      </div>
                      <div style={{ fontSize: "11px", color: INK_SECONDARY, marginTop: "2px", whiteSpace: "nowrap" }}>
                        {t("common:actual")} <b style={{ color: INK_NAVY }}>{fmtMoney(cumRev)}</b>
                        {" / "}{t("common:plan")} {fmtMoney(annualPlanRev)}
                      </div>
                    </div>
                  );
                })()}

                {/* 누계 — 도급액 대비 */}
                {(() => {
                  const totalPct = ratioPct(cumRev, overview.contractAmount);
                  return (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                      <div style={{ marginTop: "-46px" }}>
                        <Donut
                          percent={totalPct ?? 0}
                          color={rateColor(totalPct)}
                          size={110}
                          stroke={13}
                          label={fmtPct(totalPct)}
                          labelSize={18}
                          labelColor={rateColor(totalPct)}
                        />
                      </div>
                      <div style={{ fontSize: "12px", color: INK_NAVY, fontWeight: 700, marginTop: "12px" }}>
                        {t("common:cumulative")}
                      </div>
                      <div style={{ fontSize: "11px", color: INK_SECONDARY, marginTop: "2px", whiteSpace: "nowrap" }}>
                        {t("common:actual")} <b style={{ color: INK_NAVY }}>{fmtMoney(cumRev)}</b>
                        {" / "}{t("common:contractAmount")} {fmtMoney(overview.contractAmount)}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </>
          )}
        </div>

        {/* Cost estimation — 입찰→실행예산→준공추정 3단계 막대 + 개선폭 */}
        {(() => {
          const stages = [
            { key: "bidding", title: t("overviewTab:bidding"), data: bidding, color: chartTheme.paleBlue },
            { key: "execution", title: t("overviewTab:executionBudgetPlan"), data: execution, color: chartTheme.planBlue },
            { key: "completion", title: t("overviewTab:completionCostRate"), data: completion, color: ACHIEVE_GREEN },
          ];
          const biddingPct = estPct(bidding);
          const completionPct = estPct(completion);
          const improve = biddingPct != null && completionPct != null ? biddingPct - completionPct : null;
          const improveColor = improve == null ? INK_MUTED : improve >= 0 ? ACHIEVE_GREEN : ACHIEVE_RED;
          const H = 150;
          const maxPct = Math.max(...stages.map((s) => estPct(s.data) ?? 0), 1);
          return (
            <div style={cardStyle}>
              <CardHeader
                title={t("overviewTab:costRate")}
                unit={overview.contractAmount != null ? t("overviewTab:contractBase", { amount: fmtMoney(overview.contractAmount) }) : "%"}
                badgeValue={improve != null ? `${improve >= 0 ? "-" : "+"}${Math.abs(improve).toFixed(1)}%p` : undefined}
                badgeLabel={improve != null ? t("overviewTab:vsBidding") : undefined}
                badgeColor={improveColor}
              />
              {bidding == null && execution == null && completion == null ? (
                <div style={emptyNote}>{t("overviewTab:noCostRateData")}</div>
              ) : (
                <div style={{ position: "relative", display: "flex", alignItems: "flex-end", justifyContent: "space-around", gap: "12px", marginTop: "14px", padding: "0 8px" }}>
                  {stages.map((s) => {
                    const pct = estPct(s.data);
                    const bh = pct != null ? Math.max((pct / maxPct) * H, 8) : 0;
                    return (
                      <div key={s.key} style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", alignItems: "center" }}>
                        <div style={{ fontSize: "16px", fontWeight: 800, color: INK_NAVY, marginBottom: "6px" }}>
                          {fmtPct(pct)}
                        </div>
                        <div
                          style={{
                            width: "46px",
                            height: `${bh}px`,
                            backgroundColor: s.color,
                            borderRadius: "8px 8px 3px 3px",
                          }}
                        />
                        <div style={{ fontSize: "12px", color: INK_NAVY, fontWeight: 700, marginTop: "5px", whiteSpace: "nowrap", maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {s.title}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })()}
      </div>

      {/* Row 2: Photo / Budget Execution Status / Cash */}
      <div style={{ display: "grid", gridTemplateColumns: ROW_COLUMNS, gap: "8px" }}>
        {/* Photo */}
        <PhotoCard projectName={projectName} photos={detail?.photos ?? []} slideshowIntervalSeconds={detail?.overview?.slideshowIntervalSeconds ?? 0} />

        {/* Budget Execution Status */}
        <div style={cardStyle}>
          <CardHeader
            title={t("overviewTab:budgetExecutionStatus")}
            unit={unitLabel}
            badgeLabel={t("overviewTab:totalCost")}
            badgeValue={fmtPct(totalCostPct)}
            badgeColor={chartTheme.planBlue}
            right={undefined}
          />
          {allBudgetRows.length === 0 ? (
            <div style={emptyNote}>{t("overviewTab:noBudgetData")}</div>
          ) : (
            <>
              {/* 항목별 그룹 막대: 회색(총 예산) 뒤 + 빨강(계획)·파랑(실적) 앞 */}
              <div style={{ display: "flex", gap: "10px", alignItems: "stretch" }}>
                {(() => {
                  const H = 130; // 막대 최대 높이
                  const LABEL_H = 18; // % 라벨 예약 공간 (막대 위)
                  const maxVal = Math.max(
                    ...allBudgetRows.flatMap((r) => [r.budget ?? 0, r.plan ?? 0, r.actual ?? 0]),
                    1,
                  );
                  const barH = (v: number | null) =>
                    v != null && v > 0 ? Math.max((v / maxVal) * H, 8) : 0;
                  const GRAY_W = 68;
                  const renderGroup = (g: (typeof allBudgetRows)[number]) => {
                    const bud = g.budget ?? 0;
                    const pln = g.plan ?? 0;
                    const act = g.actual ?? 0;
                    const pct = bud > 0 && act > 0 ? (act / bud) * 100 : null;
                    const bh = barH(bud);
                    const ph = barH(pln);
                    const ah = barH(act);
                    // % 라벨은 계획 선 또는 실적 막대 상단 중 높은 쪽 위에 표시
                    const subTop = Math.max(ph, ah);
                    return (
                      <div key={g.item} style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", alignItems: "center" }}>
                        {/* 예산 금액 (막대 위) */}
                        <div title={fmtMoney(bud || null)} style={{ fontSize: "12px", fontWeight: 600, color: INK_BODY, marginBottom: "2px", whiteSpace: "nowrap", maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {fmtMoney(bud || null)}
                        </div>
                        {/* 막대 영역 (% 라벨 공간 포함) */}
                        <div style={{ position: "relative", height: `${H + LABEL_H}px`, width: `${GRAY_W}px` }}>
                          {/* 회색: 총 예산 (배경) */}
                          <div style={{ position: "absolute", bottom: 0, left: 0, width: `${GRAY_W}px`, height: `${Math.max(bh, 2)}px`, backgroundColor: chartTheme.lightGray, borderRadius: "2px 2px 0 0" }} />
                          {/* 파랑: 집행 실적 — 총예산 막대 안에 같은 너비로 오버랩 */}
                          {g.actual != null && ah > 0 && (
                            <div style={{ position: "absolute", bottom: 0, left: 0, width: `${GRAY_W}px`, height: `${ah}px`, backgroundColor: chartTheme.inflowBlue, borderRadius: "0 0 2px 2px" }}>
                              <span
                                title={fmtMoney(act || null)}
                                style={{
                                  position: "absolute",
                                  top: "50%",
                                  left: "50%",
                                  transform: "translate(-50%, -50%)",
                                  fontSize: "10px",
                                  color: "#fff",
                                  fontWeight: 700,
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {fmtMoney(act || null)}
                              </span>
                            </div>
                          )}
                          {/* 빨강: 집행 계획 — 해당 비율 높이의 가로 선 */}
                          {g.plan != null && ph > 0 && (
                            <div
                              title={fmtMoney(pln || null)}
                              style={{ position: "absolute", bottom: `${ph}px`, left: 0, width: `${GRAY_W}px`, height: "3px", backgroundColor: chartTheme.outflowRed, borderRadius: "2px", zIndex: 2 }}
                            />
                          )}
                          {/* 집행율 % (계획 선/실적 막대 상단 중 높은 쪽 위) */}
                          {pct != null && (
                            <div style={{ position: "absolute", bottom: `${subTop + 4}px`, left: "50%", transform: "translateX(-50%)", fontSize: "12px", fontWeight: 700, color: chartTheme.inflowBlue, whiteSpace: "nowrap" }}>
                              {fmtPct(pct)}
                            </div>
                          )}
                        </div>
                        {/* 항목명 */}
                        <div style={{ fontSize: "13px", color: INK_NAVY, fontWeight: 700, marginTop: "4px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%" }}>
                          {ITEM_LABEL_KEY[g.item] ? t(`overviewTab:${ITEM_LABEL_KEY[g.item]}`) : g.item}
                        </div>
                      </div>
                    );
                  };
                  return (
                    <>
                      {/* Direct Cost 그룹 박스 (외주성·Common·Expense 1) */}
                      {budgetRows.length > 0 && (
                        <div
                          style={{
                            flex: budgetRows.length,
                            minWidth: 0,
                            backgroundColor: "rgba(214, 226, 240, 0.28)",
                            border: `1px solid ${CARD_BORDER}`,
                            borderRadius: "8px",
                            padding: "6px 8px 8px",
                          }}
                        >
                          <div style={{ textAlign: "center", fontSize: "13px", color: INK_NAVY, fontWeight: 700, marginBottom: "4px" }}>
                            {t("overviewTab:directCost")} : {fmtPct(directCostPct)}
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-around", gap: "8px", alignItems: "flex-end" }}>
                            {budgetRows.map(renderGroup)}
                          </div>
                        </div>
                      )}
                      {/* 박스 밖: Expense 2 · Contingency */}
                      {extraBudgetRows.length > 0 && (
                        <div style={{ flex: extraBudgetRows.length, minWidth: 0, display: "flex", justifyContent: "space-around", gap: "8px", alignItems: "flex-end", padding: "6px 0 8px" }}>
                          {extraBudgetRows.map(renderGroup)}
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
              {/* 합계 (좌) + 범례 (우) — 같은 행 */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginTop: "10px",
                  paddingTop: "7px",
                  borderTop: `1px solid ${DIVIDER}`,
                  flexWrap: "wrap",
                  gap: "6px",
                }}
              >
                <span style={{ fontSize: "13px", color: INK_NAVY, fontWeight: 700 }}>
                  {t("common:total")} : {fmtMoney(totalActualSum || null)} / {fmtMoney(totalBudgetSum || null)}
                  {totalCostPct != null && ` (${fmtPct(totalCostPct)})`}
                </span>
                <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
                  {[
                    { label: t("overviewTab:totalBudget"), color: chartTheme.lightGray },
                    { label: t("overviewTab:executionPlanCumulative"), color: chartTheme.outflowRed },
                    { label: t("overviewTab:executionActualCumulative"), color: chartTheme.inflowBlue },
                  ].map(({ label, color }) => (
                    <div key={label} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      <div style={{ width: "11px", height: "11px", backgroundColor: color, borderRadius: "2px" }} />
                      <span style={{ fontSize: "12px", color: INK_SECONDARY }}>{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* 자금 — 매출·확정·수금·채권 */}
        {(() => {
          const revenue    = overview.contractAmount ?? 0; // 도급액 (매출)
          const confirmed  = cumRevFiltered;                // 누계 기성 매출 (확정 A)
          const collection = cashIn;                        // 실제 수금 (수금 B)
          const outstanding = Math.max(0, confirmed - collection); // 채권 (A-B)
          const cashMax = Math.max(revenue, confirmed, collection, outstanding, 1);
          const hasFundData = revenue !== 0 || confirmed !== 0 || collection !== 0;
          const isLoadingFund = (cfRef != null && cfQ.isLoading) || mr.isLoading;
          return (
            <div style={cardStyle}>
              <CardHeader
                title={t("overviewTab:funds")}
                unit={unitLabel}
                badgeLabel={t("overviewTab:collectionRate")}
                badgeValue={confirmed > 0 ? fmtPct((collection / confirmed) * 100) : undefined}
                badgeColor={confirmed > 0 ? rateColor((collection / confirmed) * 100) : undefined}
                right={undefined}
              />
              {isLoadingFund ? (
                <div style={emptyNote}>{t("overviewTab:loadingFundData")}</div>
              ) : !hasFundData ? (
                <div style={emptyNote}>{t("overviewTab:noFundData")}</div>
              ) : (
                <>
                  {/* 막대 그래프 — 숫자 라벨 제거 */}
                  <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-around", marginTop: "10px", height: "130px" }}>
                    <MiniBar value={revenue}     max={cashMax} color={chartTheme.neutralGray}  label={t("common:revenue")}           height={100} width={34} />
                    <MiniBar value={confirmed}   max={cashMax} color={chartTheme.neutralGray}  label={t("overviewTab:confirmedA")}   height={100} width={34} />
                    <MiniBar value={collection}  max={cashMax} color={chartTheme.balanceNavy}  label={t("overviewTab:collectionB")}  height={100} width={34} />
                    <MiniBar value={outstanding} max={cashMax} color={chartTheme.outflowRed}   label={t("overviewTab:receivableAB")} height={100} width={34} />
                  </div>
                  {/* 하단 수치 테이블 */}
                  <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "8px", fontSize: "12px" }}>
                    <tbody>
                      {([
                        { label: t("common:revenue"),           value: revenue,      color: chartTheme.neutralGray },
                        { label: t("overviewTab:confirmedA"),   value: confirmed,    color: chartTheme.neutralGray },
                        { label: t("overviewTab:collectionB"),  value: collection,   color: chartTheme.balanceNavy },
                        { label: t("overviewTab:receivableAB"), value: outstanding,  color: chartTheme.outflowRed  },
                      ] as const).map(({ label, value, color }) => (
                        <tr key={label} style={{ borderTop: `1px solid ${DIVIDER}` }}>
                          <td style={{ padding: "4px 4px 4px 0", display: "flex", alignItems: "center", gap: "5px", whiteSpace: "nowrap" }}>
                            <div style={{ width: "8px", height: "8px", borderRadius: "2px", backgroundColor: color, flexShrink: 0 }} />
                            <span style={{ color: INK_MUTED }}>{label}</span>
                          </td>
                          <td style={{ padding: "4px 0", textAlign: "right", fontWeight: 600, color: INK_NAVY, whiteSpace: "nowrap" }}>
                            {fmtMoney(value)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
            </div>
          );
        })()}
      </div>
    </div>
  );
}
