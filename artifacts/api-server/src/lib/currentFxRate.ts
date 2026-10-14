import { eq } from "drizzle-orm";
import { db, fxRatesTable } from "@workspace/db";
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
