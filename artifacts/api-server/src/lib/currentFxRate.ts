import { eq, inArray } from "drizzle-orm";
import { db, fxRatesTable, pdOverviewTable } from "@workspace/db";
import { fetchPimsvinaApi } from "./pimsvinaClient";

export type FxCurrency = "USD" | "KRW" | "VND";

/** PIMSVINA에도 값이 없을 때 사용하는 최종 기본 환율 (1 USD 기준) */
export const DEFAULT_RATES: Record<FxCurrency, number> = {
  USD: 1,
  KRW: 1380,
  VND: 25450,
};

function currentYearMonth(): { year: number; month: number } {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

/**
 * PIMSVINA의 공식 환율(최신 월)을 조회한다. 계산(교차환율) 없이 각 통화의 행 값을 그대로 사용한다.
 * fxrates.ts의 GET /fxrates와 동일한 로직 — "현재 환율"을 묻는 곳은 모두 이 함수를 써야
 * 화면(FxRateMonthlyEditor 등)이 보여주는 값과 API가 계산에 쓰는 값이 어긋나지 않는다.
 */
async function getPimsvinaRates(): Promise<Record<FxCurrency, number> | null> {
  try {
    const rows = await fetchPimsvinaApi("dashboard_common_exchangerate_1q.jsp", {});
    if (!Array.isArray(rows) || rows.length === 0) return null;

    const usdSelfRow = rows.find((r) => r.basemoney === "USD" && r.chgmoney === "USD");
    const usd = usdSelfRow?.rate != null ? Number(usdSelfRow.rate) : DEFAULT_RATES.USD;

    const usdRow = rows.find((r) => r.basemoney === "VND" && r.chgmoney === "USD");
    const vnd = usdRow?.rate != null ? Number(usdRow.rate) : null;
    if (vnd == null || Number.isNaN(vnd)) return null;

    const krwRow = rows.find((r) => r.basemoney === "KRW" && r.chgmoney === "KRW");
    const krw = krwRow?.rate != null ? Number(krwRow.rate) : DEFAULT_RATES.KRW;

    return { USD: usd, KRW: krw, VND: vnd };
  } catch (e) {
    return null;
  }
}

/**
 * "현재 환율" 1개 값을 반환한다 — 월별 환율 이력(fx_rates)에 해당 (year, month) 행이 없을 때
 * 쓰는 폴백. PIMSVINA 최신 공식 환율을 우선 쓰고, 호출 실패 시에만 DB에 저장된 "actual_forecast"
 * 환율(오늘 이전 가장 가까운 월) 또는 최종 기본값으로 떨어진다 — GET /fxrates와 동일한 우선순위.
 * "계획(plan)" 전용 환율은 없다 — 계획 입력 시점에 고정하는 값이라 "현재" 개념이 없고, 기존에도
 * 월별 이력이 없으면 이 공용 현재 환율로 대체해 왔다.
 */
export async function getCurrentRate(currency: FxCurrency): Promise<number> {
  if (currency === "USD") return 1;

  const pimsvinaRates = await getPimsvinaRates();
  if (pimsvinaRates) return pimsvinaRates[currency];

  const rows = await db.select().from(fxRatesTable).where(eq(fxRatesTable.purpose, "actual_forecast"));
  const { year: curYear, month: curMonth } = currentYearMonth();
  const filtered = rows.filter(
    (r) => r.currency === currency && (r.year < curYear || (r.year === curYear && r.month <= curMonth)),
  );
  if (filtered.length === 0) {
    const anyFiltered = rows.filter((r) => r.currency === currency);
    if (anyFiltered.length === 0) return DEFAULT_RATES[currency];
    anyFiltered.sort((a, b) => b.year - a.year || b.month - a.month || b.updatedAt.getTime() - a.updatedAt.getTime());
    return anyFiltered[0].rate;
  }
  filtered.sort((a, b) => b.year - a.year || b.month - a.month || b.updatedAt.getTime() - a.updatedAt.getTime());
  return filtered[0].rate;
}

/**
 * 현장 계약 환율(CBTB_CTRTSUMM.RATEUSD/RATEKRW, dashboard_common_siterate_1q.jsp) — Revenue/Costing/
 * Outsourcing 탭(ProjectDashboard.tsx의 siteRates)이 "현재 환율" 대신 우선적으로 쓰는 값이다. "월별 매출
 * 환율 설정"에 그 달 행이 없을 때의 폴백은 전역 "현재 환율"이 아니라 이 현장별 계약 환율이어야
 * 화면과 일치한다(실사용자 보고: Revenue tab의 Sales Actual 금액이 API 값과 달랐던 이유).
 * siteCode는 우리 DB의 pseudo site_code(예: "SITE18")이고, CBTB_CTRTSUMM은 PIMSVINA FLDCODE로
 * 키가 잡혀 있어 pd_overview에서 먼저 FLDCODE를 찾아야 한다(없으면 siteCode를 그대로 FLDCODE로
 * 간주 — /pimsvina/siterate 라우트와 동일한 폴백).
 */
export async function getSiteContractRates(
  siteCodes: string[],
): Promise<Map<string, { rateUsd: number | null; rateKrw: number | null }>> {
  const distinct = [...new Set(siteCodes.filter((s) => s))];
  const result = new Map<string, { rateUsd: number | null; rateKrw: number | null }>();
  if (distinct.length === 0) return result;

  const overviewRows = await db
    .select({ siteCode: pdOverviewTable.siteCode, fldCode: pdOverviewTable.fldCode })
    .from(pdOverviewTable)
    .where(inArray(pdOverviewTable.siteCode, distinct));
  const fldCodeBySite = new Map(overviewRows.map((r) => [r.siteCode, r.fldCode]));

  await Promise.all(
    distinct.map(async (siteCode) => {
      const fldCode = fldCodeBySite.get(siteCode) || siteCode;
      try {
        const rows = await fetchPimsvinaApi("dashboard_common_siterate_1q.jsp", { site_code: fldCode });
        const row = rows[0];
        result.set(siteCode, {
          rateUsd: row?.rate_usd != null ? Number(row.rate_usd) : null,
          rateKrw: row?.rate_krw != null ? Number(row.rate_krw) : null,
        });
      } catch {
        result.set(siteCode, { rateUsd: null, rateKrw: null });
      }
    }),
  );
  return result;
}
