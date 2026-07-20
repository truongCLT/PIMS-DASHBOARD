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
import { useProjectDetail, fmtNum, fmtPct, ratioPct } from "../lib/projectDetailData";
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
  const prevMonthRev = lastMonthIdx >= 1 ? (revMonths[lastMonthIdx - 1] ?? 0) : null;
  const cumRev = revMonths.reduce((a, b) => a + (b ?? 0), 0);
  const cumCogs = cogsMonths.reduce((a, b) => a + (b ?? 0), 0);
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
  const monthlyActual = latest?.actualPct ?? null;
  const achieveRate = ratioPct(actualCum, planCum);
  const overview = detail?.overview ?? { contractAmount: null, startDate: null, endDate: null };
  const elapsed = timeElapsedPct(overview.startDate, overview.endDate);

  // ---- 원가율 (costEstimation) ----
  const est = (kind: string) => detail?.costEstimation.find((e) => e.kind === kind) ?? null;
  const bidding = est("bidding");
  const execution = est("execution");
  const completion = est("completion");
  const estPct = (e: { contractAmount?: number | null; costAmount?: number | null } | null) =>
    e ? ratioPct(e.costAmount ?? null, e.contractAmount ?? null) : null;

  // ---- 실행예산 집행 (costBudget) ----
  const budgetRows = (detail?.costBudget ?? []).filter((r) => r.budget != null || r.actual != null).slice(0, 5);
  const budgetTotal = budgetRows.reduce((a, r) => a + (r.budget ?? 0), 0);
  const actualTotal = budgetRows.reduce((a, r) => a + (r.actual ?? 0), 0);
  const directCostPct = ratioPct(actualTotal, budgetTotal);

  const MAX_H = 110;
  const maxProg = Math.max(planCum ?? 0, actualCum ?? 0, 1);

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
                  justifyContent: "center",
                  alignItems: "flex-end",
                  gap: "28px",
                  margin: "16px 0 10px",
                  height: `${MAX_H + 28}px`,
                }}
              >
                {[
                  { label: "계획 (A)", value: planCum, color: chartTheme.planBlue },
                  { label: "실적 (B)", value: actualCum, color: chartTheme.outflowRed },
                ].map((b) => (
                  <div
                    key={b.label}
                    style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", height: "100%" }}
                  >
                    <span style={{ fontSize: "11px", fontWeight: 700, color: b.color, marginBottom: "4px" }}>
                      {fmtPct(b.value)}
                    </span>
                    <div
                      style={{
                        width: "48px",
                        height: `${Math.round(((b.value ?? 0) / maxProg) * MAX_H)}px`,
                        backgroundColor: b.color,
                        borderRadius: "3px 3px 0 0",
                      }}
                    />
                    <span style={{ fontSize: "10px", color: "#555", marginTop: "5px", fontWeight: 600 }}>{b.label}</span>
                  </div>
                ))}
              </div>
              <div style={{ textAlign: "center", fontSize: "11px", color: chartTheme.profitGreen, fontWeight: 700 }}>
                달성률 : {fmtPct(achieveRate)} (B/A)
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
                    value={prevMonthRev ?? 0}
                    max={Math.max(prevMonthRev ?? 0, thisMonthRev ?? 0, 1)}
                    color={chartTheme.neutralGray}
                    label="전월"
                    height={110}
                    valueLabel={fmtNum(prevMonthRev)}
                  />
                  <MiniBar
                    value={thisMonthRev ?? 0}
                    max={Math.max(prevMonthRev ?? 0, thisMonthRev ?? 0, 1)}
                    color={chartTheme.planBlue}
                    label="당월"
                    height={110}
                    valueLabel={fmtNum(thisMonthRev)}
                  />
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "10px", color: "#555", marginBottom: "2px" }}>{fmtNum(cumRev)}</div>
                  <Donut
                    percent={ratioPct(cumRev, overview.contractAmount) ?? 0}
                    color={chartTheme.planBlue}
                    size={110}
                    stroke={13}
                    label={fmtPct(ratioPct(cumRev, overview.contractAmount))}
                    labelSize={18}
                  />
                  <div style={{ fontSize: "10px", color: "#1a2d4d", fontWeight: 700, marginTop: "4px", textDecoration: "underline" }}>
                    Achievement Rate
                  </div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "10px", color: "#555", marginBottom: "2px" }}>{fmtNum(cumCogs)}</div>
                  <Donut
                    percent={ratioPct(cumCogs, cumRev) ?? 0}
                    color={chartTheme.balanceNavy}
                    size={110}
                    stroke={13}
                    label={fmtPct(ratioPct(cumCogs, cumRev))}
                    labelSize={18}
                  />
                  <div style={{ fontSize: "10px", color: "#1a2d4d", fontWeight: 700, marginTop: "4px", textDecoration: "underline" }}>
                    Cost Rate
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "space-around", marginTop: "6px" }}>
                <span style={{ fontSize: "10px", fontWeight: 700, color: "#333" }}>This Month</span>
                <span style={{ fontSize: "10px", fontWeight: 700, color: "#1a2d4d", textDecoration: "underline" }}>
                  누계 매출 (도급액 대비)
                </span>
                <span style={{ fontSize: "10px", fontWeight: 700, color: "#1a2d4d", textDecoration: "underline" }}>
                  누계 원가율
                </span>
              </div>
            </>
          )}
        </div>

        {/* Cost estimation */}
        <div style={cardStyle}>
          <span style={sectionTitle}>Cost estimation</span>
          {bidding == null && execution == null && completion == null ? (
            <div style={emptyNote}>원가율 데이터가 없습니다. 데이터 입력 탭에서 입력해 주세요.</div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-around", marginTop: "6px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "9px", color: "#555" }}>{fmtNum(bidding?.costAmount)}</div>
                  <Donut percent={estPct(bidding) ?? 0} color={chartTheme.planBlue} size={78} stroke={9} label={fmtPct(estPct(bidding))} labelSize={14} />
                  <div style={{ fontSize: "10px", color: "#1a2d4d", fontWeight: 600 }}>Bidding</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "9px", color: "#555" }}>{fmtNum(execution?.costAmount)}</div>
                  <Donut percent={estPct(execution) ?? 0} color={chartTheme.balanceNavy} size={78} stroke={9} label={fmtPct(estPct(execution))} labelSize={14} />
                  <div style={{ fontSize: "10px", color: "#1a2d4d", fontWeight: 600, textDecoration: "underline" }}>
                    Execution Budgeting
                  </div>
                </div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "10px", color: "#555" }}>
                  {fmtNum(completion?.contractAmount)} / {fmtNum(completion?.costAmount)}
                </div>
                <Donut percent={estPct(completion) ?? 0} color={chartTheme.planBlue} size={160} stroke={18} label={fmtPct(estPct(completion))} labelSize={26} />
                <div style={{ fontSize: "11px", color: "#1a2d4d", fontWeight: 700, marginTop: "4px" }}>Total Cost Rate</div>
                <div style={{ fontSize: "10px", color: "#333", marginTop: "2px" }}>Estimated Completion</div>
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
                      <div style={{ fontSize: "9px", color: "#555", marginBottom: "2px" }}>{fmtNum(g.budget)}</div>
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
                              {fmtNum(spent)}
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
                Direct Cost : {fmtPct(directCostPct)}
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
                label="유입 누계"
                height={140}
                valueLabel={fmtNum(cashIn)}
                width={24}
              />
              <MiniBar
                value={cashOut}
                max={Math.max(cashIn, cashOut, Math.abs(balance ?? 0), 1)}
                color={chartTheme.outflowRed}
                label="유출 누계"
                height={140}
                valueLabel={fmtNum(cashOut)}
                width={24}
              />
              <MiniBar
                value={Math.max(balance ?? 0, 0)}
                max={Math.max(cashIn, cashOut, Math.abs(balance ?? 0), 1)}
                color={chartTheme.planBlue}
                label="잔액"
                height={140}
                valueLabel={fmtNum(balance)}
                width={24}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
