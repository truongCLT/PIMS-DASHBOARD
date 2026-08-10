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
import { tokens as aquaTokens } from "@workspace/aqua-glass";
const AG = aquaTokens.color.light;

const ROW_COLUMNS = "1fr 1.6fr 1.6fr";

const cardStyle: React.CSSProperties = {
  backgroundColor: "#fff",
  border: `1px solid ${AG.border}`,
  borderRadius: "8px",
  padding: "10px 12px",
};

const sectionTitle: React.CSSProperties = {
  fontSize: "16px",
  fontWeight: 700,
  color: AG.primary,
  marginBottom: "6px",
};

const emptyNote: React.CSSProperties = {
  padding: "40px 12px",
  textAlign: "center",
  fontSize: "13px",
  color: AG.mutedForeground,
};

/** raw Korean item name (fixed identifier from cost-budget data) → translation key */
const ITEM_LABEL_KEY: Record<string, string> = {
  "외주성": "outsourcingItem",
};

function PhotoCard({ projectName, photos }: { projectName: string; photos: ProjectDetailPhoto[] }) {
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
  const { fmtMoney } = useMoney();

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
  const [cashMonth, setCashMonth] = useState<number | null>(null); // null = 전체(누계)
  // 월 필터용: cashMonth 선택 시 해당 월(0-based index = cashMonth-1)까지 누계
  const cumRevFiltered = cashMonth == null
    ? cumRev
    : revMonths.slice(0, cashMonth).reduce((a, b) => a + (b ?? 0), 0);
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
  // 월 필터: cashMonth 선택 시 해당 월까지 누계
  const cfFiltered = cashMonth == null
    ? cfPoints
    : cfPoints.filter((p) => {
        const ym = p.month; // "YYYY-MM"
        const cutoff = `${REPORT_YEAR}-${String(cashMonth).padStart(2, "0")}`;
        return ym <= cutoff;
      });
  const cashIn = cfFiltered.reduce((a, p) => a + (p.cashIn ?? 0), 0);
  const cashOut = cfFiltered.reduce((a, p) => a + (p.cashOut ?? 0), 0);
  let balance: number | null = null;
  for (const p of cfFiltered) {
    if (p.cashIn !== 0 || p.cashOut !== 0 || p.equivalent !== 0) balance = p.equivalent;
  }
  const hasCash = (hasPdCashRows || cfRef != null) && cfPoints.some((p) => p.cashIn !== 0 || p.cashOut !== 0 || p.equivalent !== 0);

  // ---- 공정 (progress) ----
  const progress = detail?.progress ?? [];
  const sorted = [...progress].sort((a, b) => a.year * 12 + a.month - (b.year * 12 + b.month));
  let latest: (typeof sorted)[number] | null = null;
  for (const p of sorted) {
    if (p.planCumPct != null || p.actualCumPct != null) latest = p;
  }
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
  const [budgetMonth, setBudgetMonth] = useState<number | null>(null); // null = 전체
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
    if (budgetMonth == null) return null; // 전체: monthly 미사용
    // 1월부터 선택월까지 누적 합산
    const rows = cbm.filter((r) => r.item === item && r.year === REPORT_YEAR && r.month <= budgetMonth);
    if (rows.length === 0) return null;
    const total = rows.reduce((a, r) => a + (r[field] ?? 0), 0);
    return total > 0 ? total : null;
  };
  const budgetRows = [
    {
      item: "외주성",
      budget: outBudget,
      plan: budgetMonth == null
        ? (outRows.some((r) => r.executedBudget != null) ? outRows.reduce((a, r) => a + (r.executedBudget ?? 0), 0) : null)
        : getCbm("외주성", "plan"),
      actual: budgetMonth == null ? outActual : getCbm("외주성", "actual"),
    },
    {
      item: "Common",
      budget: common?.budget ?? null,
      plan: budgetMonth == null ? (common?.plan ?? null) : getCbm("Common", "plan"),
      actual: budgetMonth == null ? (common?.actual ?? null) : getCbm("Common", "actual"),
    },
    {
      item: "Expense 1",
      budget: expense1?.budget ?? null,
      plan: budgetMonth == null ? (expense1?.plan ?? null) : getCbm("Expense 1", "plan"),
      actual: budgetMonth == null ? (expense1?.actual ?? null) : getCbm("Expense 1", "actual"),
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
      plan: budgetMonth == null ? (expense2?.plan ?? null) : getCbm("Expense 2", "plan"),
      actual: budgetMonth == null ? (expense2?.actual ?? null) : getCbm("Expense 2", "actual"),
    },
    {
      item: "Contingency",
      budget: contingency?.budget ?? null,
      plan: budgetMonth == null ? (contingency?.plan ?? null) : getCbm("Contingency", "plan"),
      actual: budgetMonth == null ? (contingency?.actual ?? null) : getCbm("Contingency", "actual"),
    },
  ].filter((r) => r.budget != null || r.actual != null || r.plan != null);
  const allBudgetRows = [...budgetRows, ...extraBudgetRows];

  const MAX_H = 110;

  return (
    <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "8px" }}>
      {/* Row 1: Progress / Revenue / Cost estimation */}
      <div style={{ display: "grid", gridTemplateColumns: ROW_COLUMNS, gap: "8px" }}>
        {/* Progress */}
        <div style={cardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={sectionTitle}>{t("common:process")}</span>
            <span
              style={{
                fontSize: "11px",
                backgroundColor: chartTheme.planBlue,
                color: "#fff",
                borderRadius: "3px",
                padding: "1px 5px",
                height: "fit-content",
              }}
            >
              {monthlyActual != null
                ? `${t("overviewTab:constructionShort")} ${monthlyActual >= 0 ? "+" : ""}${monthlyActual.toFixed(1)}%`
                : `${t("overviewTab:constructionShort")} -`}
            </span>
          </div>
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
                      <div style={{ fontSize: "14px", color: chartTheme.planBlue, fontWeight: 800, marginBottom: "6px" }}>
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
                            <span style={{ fontSize: "11px", color: "#555", marginTop: "5px", fontWeight: 600 }}>{b.label}</span>
                          </div>
                        ))}
                      </div>
                      <div style={{ fontSize: "12px", fontWeight: 700, color: "#333", marginTop: "4px" }}>{t("common:monthly")}</div>
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
                        <span style={{ color: "#777" }}>{t("overviewTab:planA")}</span>
                        <span style={{ color: chartTheme.planBlue, fontSize: "14px", fontWeight: 800 }}>{fmtPct(planCum)}</span>
                      </div>
                      <svg width={136} height={136} viewBox="0 0 160 160">
                        {/* 회색 기준 링 (100%) */}
                        <circle cx={cx} cy={cy} r={rIn} fill="none" stroke="#e2e7ee" strokeWidth={16} />
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
                        <text x={cx} y={cy + 2} textAnchor="middle" fontSize={30} fontWeight={800} fill={chartTheme.planBlue}>
                          {fmtPct(actualCum)}
                        </text>
                        <text x={cx} y={cy + 22} textAnchor="middle" fontSize={13} fill="#555">
                          {t("overviewTab:actualB")}
                        </text>
                      </svg>
                      <div style={{ fontSize: "12px", fontWeight: 700, color: "#333", marginTop: "2px" }}>{t("common:cumulative")}</div>
                    </div>
                  );
                })()}
              </div>
            </>
          )}
          <div
            style={{
              textAlign: "center",
              fontSize: "12px",
              color: "#333",
              fontWeight: 700,
              marginTop: "8px",
              borderTop: `1px solid ${AG.background}`,
              paddingTop: "6px",
            }}
          >
            {t("overviewTab:elapsedRate", { value: fmtPct(elapsed) })}
          </div>
        </div>

        {/* Revenue */}
        <div style={cardStyle}>
          <span style={sectionTitle}>{t("common:revenue")}</span>
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
                      color: (thisMonthRev / thisMonthPlan) >= 1 ? chartTheme.planBlue : chartTheme.outflowRed,
                      whiteSpace: "nowrap",
                    }}>
                      {fmtPct((thisMonthRev / thisMonthPlan) * 100)}
                    </span>
                  ) : (
                    <span style={{ fontSize: "15px", color: "#aaa" }}>-</span>
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
                  <span style={{ fontSize: "12px", fontWeight: 700, color: "#333", marginTop: "10px" }}>{t("common:currentMonth")}</span>
                </div>

                {/* 연 */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <div style={{ marginTop: "-46px" }}>
                    <Donut
                      percent={ratioPct(cumRev, annualPlanRev) ?? 0}
                      color={chartTheme.planBlue}
                      size={110}
                      stroke={13}
                      label={fmtPct(ratioPct(cumRev, annualPlanRev))}
                      labelSize={18}
                    />
                  </div>
                  <div style={{ fontSize: "12px", color: AG.foreground, fontWeight: 700, marginTop: "12px" }}>
                    {t("overviewTab:annualShort")}
                  </div>
                </div>

                {/* 누계 */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <div style={{ marginTop: "-46px" }}>
                    <Donut
                      percent={ratioPct(cumRev, overview.contractAmount) ?? 0}
                      color={chartTheme.balanceNavy}
                      size={110}
                      stroke={13}
                      label={fmtPct(ratioPct(cumRev, overview.contractAmount))}
                      labelSize={18}
                    />
                  </div>
                  <div style={{ fontSize: "12px", color: AG.foreground, fontWeight: 700, marginTop: "12px" }}>
                    {t("common:cumulative")}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Cost estimation */}
        <div style={cardStyle}>
          <span style={sectionTitle}>{t("overviewTab:costRate")}</span>
          {bidding == null && execution == null && completion == null ? (
            <div style={emptyNote}>{t("overviewTab:noCostRateData")}</div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "16px", marginTop: "8px" }}>

              {/* 좌측: 입찰 + 실행예산 소형 스택 */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0", flex: "0 0 auto" }}>
                {[
                  { title: t("overviewTab:bidding"), sub: "입찰 원가율", data: bidding, color: chartTheme.neutralGray },
                  { title: t("overviewTab:executionBudgetPlan"), sub: "실행예산 원가율", data: execution, color: chartTheme.balanceNavy },
                ].map((c, i) => (
                  <div key={c.title}>
                    {i > 0 && (
                      <div style={{ borderTop: `1px dashed ${AG.border}`, margin: "4px 0" }} />
                    )}
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                      <div style={{ marginTop: i === 0 ? "-6px" : "6px" }}>
                        <Donut
                          percent={estPct(c.data) ?? 0}
                          color={c.color}
                          size={82}
                          stroke={9}
                          label={fmtPct(estPct(c.data))}
                          labelSize={14}
                        />
                      </div>
                      <div style={{ fontSize: "12px", color: AG.foreground, fontWeight: 700, marginTop: "3px" }}>{c.title}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* 우측: 준공추정 대형 도넛 */}
              <div style={{ flex: "0 0 auto", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                <Donut
                  percent={estPct(completion) ?? 0}
                  color={chartTheme.planBlue}
                  size={148}
                  stroke={16}
                  label={fmtPct(estPct(completion))}
                  labelSize={26}
                />
                <div style={{ fontSize: "14px", color: AG.foreground, fontWeight: 800, marginTop: "2px" }}>
                  {t("overviewTab:completionCostRate")}
                </div>
              </div>

            </div>
          )}
        </div>
      </div>

      {/* Row 2: Photo / Budget Execution Status / Cash */}
      <div style={{ display: "grid", gridTemplateColumns: ROW_COLUMNS, gap: "8px" }}>
        {/* Photo */}
        <PhotoCard projectName={projectName} photos={detail?.photos ?? []} />

        {/* Budget Execution Status */}
        <div style={cardStyle}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
            <span style={sectionTitle}>
              {t("overviewTab:budgetExecutionStatus")}
            </span>
            <select
              value={budgetMonth ?? ""}
              onChange={(e) => setBudgetMonth(e.target.value === "" ? null : Number(e.target.value))}
              style={{ fontSize: "12px", border: `1px solid ${AG.border}`, borderRadius: "4px", padding: "2px 4px", color: "#333", cursor: "pointer" }}
            >
              <option value="">{t("common:all")}</option>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>{t("overviewTab:monthOption", { month: m })}</option>
              ))}
            </select>
          </div>
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
                  const SUB_W = 31;
                  const renderGroup = (g: (typeof allBudgetRows)[number]) => {
                    const bud = g.budget ?? 0;
                    const pln = g.plan ?? 0;
                    const act = g.actual ?? 0;
                    const pct = bud > 0 && act > 0 ? (act / bud) * 100 : null;
                    const bh = barH(bud);
                    const ph = barH(pln);
                    const ah = barH(act);
                    const subTop = Math.max(ph, ah);
                    return (
                      <div key={g.item} style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", alignItems: "center" }}>
                        {/* 예산 금액 (막대 위) */}
                        <div title={fmtMoney(bud || null)} style={{ fontSize: "12px", fontWeight: 600, color: "#333", marginBottom: "2px", whiteSpace: "nowrap", maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {fmtMoney(bud || null)}
                        </div>
                        {/* 막대 영역 (% 라벨 공간 포함) */}
                        <div style={{ position: "relative", height: `${H + LABEL_H}px`, width: `${GRAY_W}px` }}>
                          {/* 회색: 총 예산 */}
                          <div style={{ position: "absolute", bottom: 0, left: 0, width: `${GRAY_W}px`, height: `${Math.max(bh, 2)}px`, backgroundColor: chartTheme.lightGray, borderRadius: "2px 2px 0 0" }} />
                          {/* 집행율 % (계획/실적 막대 위) */}
                          {pct != null && (
                            <div style={{ position: "absolute", bottom: `${subTop + 2}px`, left: "50%", transform: "translateX(-50%)", fontSize: "12px", fontWeight: 700, color: chartTheme.inflowBlue, whiteSpace: "nowrap" }}>
                              {fmtPct(pct)}
                            </div>
                          )}
                          {/* 빨강: 집행 계획 */}
                          {g.plan != null && ph > 0 && (
                            <div title={fmtMoney(pln || null)} style={{ position: "absolute", bottom: 0, left: `${GRAY_W / 2 - SUB_W - 1}px`, width: `${SUB_W}px`, height: `${ph}px`, backgroundColor: chartTheme.outflowRed }} />
                          )}
                          {/* 파랑: 집행 실적 (금액 라벨 막대 안) */}
                          {g.actual != null && ah > 0 && (
                            <div style={{ position: "absolute", bottom: 0, left: `${GRAY_W / 2 + 1}px`, width: `${SUB_W}px`, height: `${ah}px`, backgroundColor: chartTheme.inflowBlue }}>
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
                        </div>
                        {/* 항목명 */}
                        <div style={{ fontSize: "13px", color: AG.foreground, fontWeight: 700, marginTop: "4px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%" }}>
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
                            border: `1px solid ${AG.border}`,
                            borderRadius: "8px",
                            padding: "6px 8px 8px",
                          }}
                        >
                          <div style={{ textAlign: "center", fontSize: "13px", color: AG.foreground, fontWeight: 700, marginBottom: "4px" }}>
                            Direct Cost : {fmtPct(directCostPct)}
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
              {/* 범례 */}
              <div style={{ display: "flex", gap: "12px", marginTop: "8px", justifyContent: "flex-end", flexWrap: "wrap" }}>
                {[
                  { label: t("overviewTab:totalBudget"), color: chartTheme.lightGray },
                  {
                    label: budgetMonth == null
                      ? t("overviewTab:executionPlanCumulative")
                      : t("overviewTab:executionPlanMonth", { month: budgetMonth }),
                    color: chartTheme.outflowRed,
                  },
                  {
                    label: budgetMonth == null
                      ? t("overviewTab:executionActualCumulative")
                      : t("overviewTab:executionActualMonth", { month: budgetMonth }),
                    color: chartTheme.inflowBlue,
                  },
                ].map(({ label, color }) => (
                  <div key={label} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <div style={{ width: "11px", height: "11px", backgroundColor: color, borderRadius: "2px" }} />
                    <span style={{ fontSize: "12px", color: "#555" }}>{label}</span>
                  </div>
                ))}
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
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                <span style={sectionTitle}>{t("overviewTab:funds")}</span>
                <select
                  value={cashMonth ?? ""}
                  onChange={(e) => setCashMonth(e.target.value === "" ? null : Number(e.target.value))}
                  style={{ fontSize: "12px", border: `1px solid ${AG.border}`, borderRadius: "4px", padding: "2px 4px", color: "#333", cursor: "pointer" }}
                >
                  <option value="">{t("common:all")}</option>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <option key={m} value={m}>{t("overviewTab:monthOption", { month: m })}</option>
                  ))}
                </select>
              </div>
              {isLoadingFund ? (
                <div style={emptyNote}>{t("overviewTab:loadingFundData")}</div>
              ) : !hasFundData ? (
                <div style={emptyNote}>{t("overviewTab:noFundData")}</div>
              ) : (
                <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-around", marginTop: "10px", height: "170px" }}>
                  <MiniBar
                    value={revenue}
                    max={cashMax}
                    color={chartTheme.neutralGray}
                    label={t("common:revenue")}
                    height={120}
                    valueLabel={fmtMoney(revenue)}
                    valueOnTop
                    width={34}
                  />
                  <MiniBar
                    value={confirmed}
                    max={cashMax}
                    color={chartTheme.neutralGray}
                    label={t("overviewTab:confirmedA")}
                    height={120}
                    valueLabel={fmtMoney(confirmed)}
                    valueOnTop
                    width={34}
                  />
                  <MiniBar
                    value={collection}
                    max={cashMax}
                    color={chartTheme.balanceNavy}
                    label={t("overviewTab:collectionB")}
                    height={120}
                    valueLabel={fmtMoney(collection)}
                    valueOnTop
                    width={34}
                  />
                  <MiniBar
                    value={outstanding}
                    max={cashMax}
                    color={chartTheme.outflowRed}
                    label={t("overviewTab:receivableAB")}
                    height={120}
                    valueLabel={fmtMoney(outstanding)}
                    valueOnTop
                    width={34}
                  />
                </div>
              )}
            </div>
          );
        })()}
      </div>
    </div>
  );
}
