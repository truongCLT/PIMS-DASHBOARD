import React, { useEffect, useState } from "react";
import type { ProjectDetailPhoto } from "@workspace/api-client-react";
import {
  useListSalescostSites,
  getListSalescostSitesQueryKey,
  useGetCashflowMonthly,
  getGetCashflowMonthlyQueryKey,
} from "@workspace/api-client-react";
import projectPhoto from "../assets/project-photo.png";
import { Donut, MiniBar } from "./charts";
import { useProjectDetail, fmtPct, ratioPct } from "../lib/projectDetailData";
import { useMoney } from "../lib/displayUnit";
import { getMrCashflowRef, useMrProject } from "../data/mrProjectLinks";
import { REPORT_YEAR } from "../lib/mgmtreportData";
import { chartTheme } from "../lib/chartTheme";

const ROW_COLUMNS = "1fr 1.6fr 1.6fr";

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
  marginBottom: "6px",
};

const emptyNote: React.CSSProperties = {
  padding: "40px 12px",
  textAlign: "center",
  fontSize: "11px",
  color: "#8a97a8",
};

function PhotoCard({ projectName, photos }: { projectName: string; photos: ProjectDetailPhoto[] }) {
  const [active, setActive] = useState(0);

  // 프로젝트 변경 또는 사진 수 감소 시 인덱스 보정
  useEffect(() => {
    setActive(0);
  }, [projectName]);
  useEffect(() => {
    if (active >= photos.length && photos.length > 0) setActive(0);
  }, [photos.length, active]);

  const hasPhotos = photos.length > 0;
  const src = hasPhotos ? `/api/storage${photos[Math.min(active, photos.length - 1)].objectPath}` : projectPhoto;

  return (
    <div style={{ ...cardStyle, padding: "8px", display: "flex", flexDirection: "column" }}>
      <img
        src={src}
        alt={`${projectName} 현장 사진`}
        style={{ width: "100%", flex: 1, objectFit: "cover", borderRadius: "4px", minHeight: "180px" }}
      />
      {hasPhotos && photos.length > 1 && (
        <div style={{ display: "flex", justifyContent: "center", gap: "6px", padding: "8px 0 2px" }}>
          {photos.map((_, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              aria-label={`사진 ${i + 1} 보기`}
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                border: "none",
                padding: 0,
                cursor: "pointer",
                backgroundColor: i === active ? "#1a2d4d" : "#c9d2dd",
              }}
            />
          ))}
        </div>
      )}
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
  const cfPoints = cfQ.data?.points ?? [];
  const cashIn = cfPoints.reduce((a, p) => a + (p.cashIn ?? 0), 0);
  const cashOut = cfPoints.reduce((a, p) => a + (p.cashOut ?? 0), 0);
  let balance: number | null = null;
  for (const p of cfPoints) {
    if (p.cashIn !== 0 || p.cashOut !== 0 || p.equivalent !== 0) balance = p.equivalent;
  }
  const hasCash = cfRef != null && cfPoints.some((p) => p.cashIn !== 0 || p.cashOut !== 0 || p.equivalent !== 0);

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
  const completion = est("completion");
  const estPct = (e: { contractAmount?: number | null; costAmount?: number | null } | null) =>
    e ? ratioPct(e.costAmount ?? null, e.contractAmount ?? null) : null;

  // ---- 실행예산 집행 (Direct Cost = Common + Expense 1 + 외주성) ----
  // Common·Expense 1은 데이터 입력(costBudget), 외주성 예산·실적은 외주/자재 표에서 자동 집계
  const cb = detail?.costBudget ?? [];
  const findCb = (name: string) => cb.find((r) => r.item.trim().toLowerCase() === name.toLowerCase()) ?? null;
  const common = findCb("Common");
  const expense1 = findCb("Expense 1");
  const outRows = detail?.outsourcing ?? [];
  const outBudget = outRows.some((r) => r.budget != null) ? outRows.reduce((a, r) => a + (r.budget ?? 0), 0) : null;
  const outActual = outRows.some((r) => r.accum != null || r.resolved != null)
    ? outRows.reduce((a, r) => a + (r.accum ?? r.resolved ?? 0), 0)
    : null;
  const budgetRows = [
    { item: "Common", budget: common?.budget ?? null, actual: common?.actual ?? null },
    { item: "Expense 1", budget: expense1?.budget ?? null, actual: expense1?.actual ?? null },
    { item: "외주성", budget: outBudget, actual: outActual },
  ].filter((r) => r.budget != null || r.actual != null);
  const budgetTotal = budgetRows.reduce((a, r) => a + (r.budget ?? 0), 0);
  const actualTotal = budgetRows.reduce((a, r) => a + (r.actual ?? 0), 0);
  const directCostPct = ratioPct(actualTotal, budgetTotal);

  const MAX_H = 110;

  return (
    <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "8px" }}>
      {/* Row 1: Progress / Revenue / Cost estimation */}
      <div style={{ display: "grid", gridTemplateColumns: ROW_COLUMNS, gap: "8px" }}>
        {/* Progress */}
        <div style={cardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ ...sectionTitle, color: chartTheme.profitGreen }}>Progress</span>
            <span
              style={{
                fontSize: "9px",
                backgroundColor: chartTheme.profitGreen,
                color: "#fff",
                borderRadius: "3px",
                padding: "1px 5px",
                height: "fit-content",
              }}
            >
              {monthlyActual != null ? `공사 ${monthlyActual >= 0 ? "+" : ""}${monthlyActual.toFixed(1)}%` : "공사 -"}
            </span>
          </div>
          {latest == null ? (
            <div style={emptyNote}>공정 데이터가 없습니다. 데이터 입력 탭에서 입력해 주세요.</div>
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
                {[
                  {
                    group: "월별",
                    bars: [
                      { label: "계획", value: monthlyPlan, color: chartTheme.planBlue },
                      { label: "실적", value: monthlyActual, color: chartTheme.outflowRed },
                    ],
                    rate: monthlyAchieveRate,
                  },
                  {
                    group: "누계",
                    bars: [
                      { label: "계획", value: planCum, color: chartTheme.planBlue },
                      { label: "실적", value: actualCum, color: chartTheme.outflowRed },
                    ],
                    rate: achieveRate,
                  },
                ].map((grp) => {
                  const gmax = Math.max(...grp.bars.map((b) => b.value ?? 0), 1);
                  return (
                  <div key={grp.group} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "flex-end", gap: "10px", height: `${MAX_H + 28}px` }}>
                      {grp.bars.map((b) => (
                        <div
                          key={b.label}
                          style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", height: "100%" }}
                        >
                          <span style={{ fontSize: "10px", fontWeight: 700, color: b.color, marginBottom: "4px" }}>
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
                          <span style={{ fontSize: "9px", color: "#555", marginTop: "5px", fontWeight: 600 }}>{b.label}</span>
                        </div>
                      ))}
                    </div>
                    <div style={{ fontSize: "10px", fontWeight: 700, color: "#333", marginTop: "4px" }}>{grp.group}</div>
                    <div style={{ fontSize: "10px", color: chartTheme.profitGreen, fontWeight: 700, marginTop: "2px" }}>
                      달성률 {fmtPct(grp.rate)}
                    </div>
                  </div>
                  );
                })}
              </div>
            </>
          )}
          <div
            style={{
              textAlign: "center",
              fontSize: "10px",
              color: "#333",
              fontWeight: 700,
              marginTop: "8px",
              borderTop: "1px solid #eef1f5",
              paddingTop: "6px",
            }}
          >
            Time Elapsed Rate ({fmtPct(elapsed)})
          </div>
        </div>

        {/* Revenue */}
        <div style={cardStyle}>
          <span style={sectionTitle}>Revenue</span>
          {mr.isLoading || (siteCode != null && (revQ.isLoading || cogsQ.isLoading)) ? (
            <div style={emptyNote}>매출 데이터를 불러오는 중입니다…</div>
          ) : !hasRevenue ? (
            <div style={emptyNote}>{`${REPORT_YEAR}년 매출 데이터가 없습니다.`}</div>
          ) : (
            <>
              <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-around", marginTop: "6px" }}>
                <div style={{ display: "flex", gap: "10px", alignItems: "flex-end" }}>
                  <MiniBar
                    value={thisMonthPlan ?? 0}
                    max={Math.max(thisMonthPlan ?? 0, thisMonthRev ?? 0, 1)}
                    color={chartTheme.neutralGray}
                    label="계획"
                    height={110}
                    valueLabel={fmtMoney(thisMonthPlan)}
                  />
                  <MiniBar
                    value={thisMonthRev ?? 0}
                    max={Math.max(thisMonthPlan ?? 0, thisMonthRev ?? 0, 1)}
                    color={chartTheme.planBlue}
                    label="실적"
                    height={110}
                    valueLabel={fmtMoney(thisMonthRev)}
                  />
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "10px", color: "#555", marginBottom: "2px" }}>
                    {fmtMoney(cumRev)} / {fmtMoney(annualPlanRev)}
                  </div>
                  <Donut
                    percent={ratioPct(cumRev, annualPlanRev) ?? 0}
                    color={chartTheme.planBlue}
                    size={110}
                    stroke={13}
                    label={fmtPct(ratioPct(cumRev, annualPlanRev))}
                    labelSize={18}
                  />
                  <div style={{ fontSize: "10px", color: "#1a2d4d", fontWeight: 700, marginTop: "4px", textDecoration: "underline" }}>
                    Achievement Rate
                  </div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "10px", color: "#555", marginBottom: "2px" }}>
                    {fmtMoney(cumRev)} / {fmtMoney(overview.contractAmount)}
                  </div>
                  <Donut
                    percent={ratioPct(cumRev, overview.contractAmount) ?? 0}
                    color={chartTheme.balanceNavy}
                    size={110}
                    stroke={13}
                    label={fmtPct(ratioPct(cumRev, overview.contractAmount))}
                    labelSize={18}
                  />
                  <div style={{ fontSize: "10px", color: "#1a2d4d", fontWeight: 700, marginTop: "4px", textDecoration: "underline" }}>
                    Contract Progress
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "space-around", marginTop: "6px" }}>
                <span style={{ fontSize: "10px", fontWeight: 700, color: "#333" }}>당월 매출 (계획 대비 실적)</span>
                <span style={{ fontSize: "10px", fontWeight: 700, color: "#1a2d4d", textDecoration: "underline" }}>
                  연간 목표 매출 달성률
                </span>
                <span style={{ fontSize: "10px", fontWeight: 700, color: "#1a2d4d", textDecoration: "underline" }}>
                  누계 매출 (도급액 대비)
                </span>
              </div>
            </>
          )}
        </div>

        {/* Cost estimation */}
        <div style={cardStyle}>
          <span style={sectionTitle}>Cost estimation (원가율 비교)</span>
          {bidding == null && execution == null && completion == null ? (
            <div style={emptyNote}>원가율 데이터가 없습니다. 데이터 입력 탭에서 입력해 주세요.</div>
          ) : (
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-around", marginTop: "14px" }}>
              {[
                { title: "입찰 원가율", note: "최초 입찰 시 (고정)", data: bidding, color: chartTheme.neutralGray },
                { title: "실행예산 원가율", note: "실행예산 편성 시 (고정)", data: execution, color: chartTheme.balanceNavy },
                { title: "준공추정 원가율", note: "현재 기준 (매월·분기 갱신)", data: completion, color: chartTheme.planBlue },
              ].map((c) => (
                <div key={c.title} style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "9px", color: "#555", marginBottom: "2px" }}>
                    {fmtMoney(c.data?.costAmount)} / {fmtMoney(c.data?.contractAmount)}
                  </div>
                  <Donut
                    percent={estPct(c.data) ?? 0}
                    color={c.color}
                    size={116}
                    stroke={13}
                    label={fmtPct(estPct(c.data))}
                    labelSize={19}
                  />
                  <div style={{ fontSize: "11px", color: "#1a2d4d", fontWeight: 700, marginTop: "6px" }}>{c.title}</div>
                  <div style={{ fontSize: "9px", color: "#777", marginTop: "2px" }}>{c.note}</div>
                </div>
              ))}
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
          <span style={sectionTitle}>
            Budget <u>Execution Status</u>
          </span>
          {budgetRows.length === 0 ? (
            <div style={emptyNote}>실행예산 데이터가 없습니다. 데이터 입력 탭에서 입력해 주세요.</div>
          ) : (
            <>
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-end",
                  justifyContent: "space-around",
                  marginTop: "10px",
                  paddingBottom: "4px",
                }}
              >
                {budgetRows.map((g) => {
                  const H = 130;
                  const budget = g.budget ?? 0;
                  const spent = g.actual ?? 0;
                  const maxBudget = Math.max(...budgetRows.map((r) => r.budget ?? 0), 1);
                  const bh = Math.max((Math.log10(budget + 1) / Math.log10(maxBudget + 1)) * H, 8);
                  const sh = spent > 0 && budget > 0 ? Math.max(bh * (spent / budget), 6) : 0;
                  const pct = ratioPct(g.actual, g.budget);
                  return (
                    <div key={g.item} style={{ textAlign: "center" }}>
                      <div style={{ fontSize: "9px", color: "#555", marginBottom: "2px" }}>{fmtMoney(g.budget)}</div>
                      <div style={{ height: `${H}px`, display: "flex", alignItems: "flex-end", gap: "3px", justifyContent: "center" }}>
                        <div style={{ width: "22px", height: `${bh}px`, backgroundColor: chartTheme.lightGray }} />
                        {sh > 0 && (
                          <div style={{ width: "22px", height: `${sh}px`, backgroundColor: chartTheme.outflowRed, position: "relative" }}>
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
                              {fmtMoney(spent)}
                            </span>
                          </div>
                        )}
                      </div>
                      {pct != null && (
                        <div style={{ fontSize: "9px", color: chartTheme.inflowBlue, fontWeight: 600, marginTop: "2px" }}>{fmtPct(pct)}</div>
                      )}
                      <div style={{ fontSize: "9px", color: "#333", fontWeight: 600, marginTop: "2px" }}>{g.item}</div>
                    </div>
                  );
                })}
              </div>
              <div style={{ textAlign: "right", fontSize: "10px", color: "#333", fontWeight: 600 }}>
                Direct Cost 집행 : {fmtMoney(actualTotal)} / {fmtMoney(budgetTotal)} ({fmtPct(directCostPct)})
              </div>
            </>
          )}
        </div>

        {/* Cash */}
        <div style={cardStyle}>
          <span style={sectionTitle}>Cash</span>
          {cfRef != null && cfQ.isLoading ? (
            <div style={emptyNote}>자금수지 데이터를 불러오는 중입니다…</div>
          ) : !hasCash ? (
            <div style={emptyNote}>
              {cfRef == null ? "이 프로젝트에 매핑된 자금수지 데이터가 없습니다." : `${REPORT_YEAR}년 자금수지 데이터가 없습니다.`}
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                alignItems: "flex-end",
                justifyContent: "space-around",
                marginTop: "10px",
                height: "170px",
              }}
            >
              <MiniBar
                value={cashIn}
                max={Math.max(cashIn, cashOut, Math.abs(balance ?? 0), 1)}
                color={chartTheme.neutralGray}
                label="수금"
                height={120}
                valueLabel={fmtMoney(cashIn)}
                valueOnTop
                width={34}
              />
              <MiniBar
                value={cashOut}
                max={Math.max(cashIn, cashOut, Math.abs(balance ?? 0), 1)}
                color={chartTheme.outflowRed}
                label="지출"
                height={120}
                valueLabel={fmtMoney(cashOut)}
                valueOnTop
                width={34}
              />
              <MiniBar
                value={Math.max(balance ?? 0, 0)}
                max={Math.max(cashIn, cashOut, Math.abs(balance ?? 0), 1)}
                color={chartTheme.planBlue}
                label="잔액"
                height={120}
                valueLabel={fmtMoney(balance)}
                valueOnTop
                width={34}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
