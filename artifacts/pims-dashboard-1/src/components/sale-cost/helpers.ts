/**
 * Pure data-transformation helpers for the 매출/원가 tab.
 * No React hooks, no JSX — safe to import anywhere.
 */
import type { RevenuePoint, BudgetRow } from "./types";

/** 월 순서에 따라 정렬된 salesMonthly에서 연속 {year,month} 목록을 생성 */
export function buildEffectivePeriod(
  salesMonthly: Array<{ year: number; month: number }>,
  fallback: Array<{ year: number; month: number }>,
): Array<{ year: number; month: number }> {
  if (salesMonthly.length === 0) return fallback;
  const sorted = [...salesMonthly].sort(
    (a, b) => a.year * 12 + a.month - (b.year * 12 + b.month),
  );
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const out: Array<{ year: number; month: number }> = [];
  let y = first.year;
  let m = first.month;
  while (y < last.year || (y === last.year && m <= last.month)) {
    out.push({ year: y, month: m });
    m++;
    if (m > 12) { m = 1; y++; }
  }
  return out;
}

/** {year,month} 목록에서 해당 기간의 연도 집합(최대 3개)을 추출 */
export function extractYears(
  period: Array<{ year: number; month: number }>,
): [number, number | null, number | null] {
  const ys = [...new Set(period.map((p) => p.year))];
  return [ys[0], ys[1] ?? null, ys[2] ?? null];
}

/** from/months 로 연속 월 목록 생성 */
export function buildFilterPeriod(
  fromYear: number,
  fromMonth: number,
  months: number,
): Array<{ year: number; month: number }> {
  const out: Array<{ year: number; month: number }> = [];
  let y = fromYear;
  let m = fromMonth;
  for (let i = 0; i < months; i++) {
    out.push({ year: y, month: m });
    m++;
    if (m > 12) { m = 1; y++; }
  }
  return out;
}

export type LookupFn = (year: number, month: number) => number;

// 누계 원가율의 합리적 상한 — pd_cost_estimation(execution)의 costAmount/contractAmount는 항상
// 같은 통화 기준으로 함께 저장되므로 정상적인 범위를 크게 벗어나는 값은 데이터 이상으로 본다.
const RATIO_SANITY_CAP_PERCENT = 2000;

/** 분모(계약금액) 대비 비정상적으로 큰 비율(데이터 오류로 추정)은 null로 처리한다. */
export function sanitizeRatioPercent(ratioPercent: number | null): number | null {
  if (ratioPercent == null) return null;
  return Math.abs(ratioPercent) > RATIO_SANITY_CAP_PERCENT ? null : ratioPercent;
}

/** pd_cost_estimation의 execution 행들로 {year}-{month} → 원가율(%) 맵을 만든다 — "4. Cost Rate"의
 * 표준추정원가율(costAmount/contractAmount)과 동일한 계산·데이터 소스. pd_cogs_monthly와 달리
 * costAmount/contractAmount는 항상 같은 단위(VND 원본)로 함께 저장되므로 매출-원가 단위 불일치
 * 문제가 없다. */
export function buildCostRatioLookup(
  costEstimation: Array<{ kind: string; year?: number | null; month?: number | null; costAmount?: number | null; contractAmount?: number | null }>,
): Map<string, number> {
  const lookup = new Map<string, number>();
  for (const row of costEstimation) {
    if (row.kind !== "execution" || row.year == null || row.month == null) continue;
    if (row.costAmount == null || !row.contractAmount) continue;
    lookup.set(`${row.year}-${row.month}`, Math.round((row.costAmount / row.contractAmount) * 1000) / 10);
  }
  return lookup;
}

/** effectivePeriod × lookups → RevenuePoint[] */
export function buildChartData(
  effectivePeriod: Array<{ year: number; month: number }>,
  {
    pdSalesHasAny,
    pdSalesMap,
    costRatioLookup,
    lookup,
    convert,
    convertPlan,
  }: {
    pdSalesHasAny: boolean;
    pdSalesMap: Map<string, { plan: number | null; actual: number | null }>;
    costRatioLookup: Map<string, number>;
    lookup: LookupFn;
    // "월별 매출 환율 설정"에 그 달 환율이 입력돼 있으면 그 환율로, 없으면 호출하는 쪽의 기존
    // 환율(현재/계약 환율)로 변환한다 — year/month를 받아 달마다 다른 환율을 적용할 수 있게 한다.
    convert: (v: number, year: number, month: number) => number;
    // 계획(plan)은 계획 수립 시 고정한 환율 트랙(purpose: "plan")을 써야 한다 — revenue(실적)와 같은
    // converter를 쓰면 통화를 바꿔도 달성률이 USD 기준과 똑같이 나오는 버그가 생긴다(메인 대시보드
    // 매출 차트에서 실사용자 보고로 발견된 것과 같은 종류의 버그). 생략하면 convert와 동일하게 취급.
    convertPlan?: (v: number, year: number, month: number) => number;
  },
): RevenuePoint[] {
  const convertPlanFn = convertPlan ?? convert;
  let cumulative = 0;
  let cumPlan = 0;
  // 누계는 "그 달 환율로 변환된 금액"을 그대로 누적한다(월별 원본 USD 값을 누적한 뒤 한 환율로
  // 일괄 변환하면 달마다 다른 환율이 반영되지 않는다) — 요청: 누계도 달별 환율 그대로 반영.
  let cumulativeConverted = 0;
  let cumPlanConverted = 0;
  return effectivePeriod.map(({ year, month }) => {
    const pdRow = pdSalesHasAny ? pdSalesMap.get(`${year}-${month}`) : undefined;
    const revenue = pdSalesHasAny ? (pdRow?.actual ?? 0) : lookup(year, month);
    const plan    = pdSalesHasAny ? (pdRow?.plan ?? 0)   : 0;
    cumulative += revenue;
    cumPlan    += plan;
    const revenueConverted = convert(revenue, year, month);
    const planConverted    = convertPlanFn(plan, year, month);
    cumulativeConverted += revenueConverted;
    cumPlanConverted    += planConverted;
    return {
      year,
      month,
      label: `'${String(year).slice(2)}.${String(month).padStart(2, "0")}`,
      revenue:    Math.round(revenueConverted),
      plan:       Math.round(planConverted),
      cumulative: Math.round(cumulativeConverted),
      planCum:    Math.round(cumPlanConverted),
      ratio: sanitizeRatioPercent(costRatioLookup.get(`${year}-${month}`) ?? null),
    };
  });
}

/** 외주 행 삽입 + 총 예산 합계 행 추가 */
export function buildBudgetRows(
  raw: BudgetRow[],
  outsourcing: { budget: number; plan: number; actual: number; label: string } | null,
  totalLabel: string,
): BudgetRow[] {
  const rows: BudgetRow[] = [...raw];

  // PIMSVINA đôi khi đã tự đồng bộ sẵn 1 dòng "Outsourcing" trực tiếp vào pd_cost_budget (item trùng
  // tên, category null hoặc "Direct Cost") — nếu chèn thêm dòng tổng hợp từ pd_outsourcing bên dưới mà
  // không kiểm tra, sẽ ra 2 dòng "Outsourcing" trùng nhau. Bỏ qua chèn nếu đã có sẵn. So khớp theo
  // chuỗi tiếng Anh cố định "outsourcing" (dữ liệu PIMSVINA gốc luôn tiếng Anh, không theo ngôn ngữ UI)
  // thay vì outsourcing.label (đã dịch — "외주"/"Thuê ngoài" sẽ không khớp được với dữ liệu gốc).
  const hasNativeOutsourcingRow = rows.some((r) => r.item.trim().toLowerCase() === "outsourcing");

  if (!hasNativeOutsourcingRow && outsourcing && (outsourcing.budget > 0 || outsourcing.plan > 0 || outsourcing.actual > 0)) {
    const commonIdx      = rows.findIndex((r) => r.category === "Direct Cost" && r.item === "Common");
    const directFirstIdx = rows.findIndex((r) => r.category === "Direct Cost");
    const insertIdx =
      commonIdx >= 0 ? commonIdx : directFirstIdx >= 0 ? directFirstIdx : rows.length;
    rows.splice(insertIdx, 0, {
      category: "Direct Cost",
      item: outsourcing.label,
      budget: outsourcing.budget > 0 ? outsourcing.budget : null,
      plan:   outsourcing.plan   > 0 ? outsourcing.plan   : null,
      actual: outsourcing.actual > 0 ? outsourcing.actual : null,
      bold: false,
    });
  }

  if (rows.length === 0) return [];

  // 카테고리별 소계 바 삽입 — 개별 항목뿐 아니라 카테고리 합계도 "총 예산" 행과 같은 방식(그래프 바)으로
  // 비교할 수 있도록, 카테고리가 있는 모든 행(Direct Cost/Indirect Cost/Contingency 등)에 대해 각 카테고리
  // 첫 항목 바로 앞에 소계 행을 헤더처럼 추가한다(이 소계 행 자체가 카테고리 라벨을 겸하므로 별도 텍스트
  // 헤더는 필요 없다) — 항목이 1개뿐인 카테고리(Contingency 등)도 예외 없이 동일하게 적용한다.
  const rowsWithSubtotals: BudgetRow[] = [];
  rows.forEach((row, i) => {
    const isFirstOfCategory = row.category != null && rows[i - 1]?.category !== row.category;
    if (isFirstOfCategory && row.category != null) {
      const group = rows.filter((r) => r.category === row.category);
      rowsWithSubtotals.push({
        category: null,
        item: row.category,
        budget: group.reduce((a, r) => a + (r.budget ?? 0), 0),
        plan:   group.some((r) => r.plan   != null) ? group.reduce((a, r) => a + (r.plan   ?? 0), 0) : null,
        actual: group.some((r) => r.actual != null) ? group.reduce((a, r) => a + (r.actual ?? 0), 0) : null,
        bold: true,
      });
    }
    rowsWithSubtotals.push(row);
  });

  return [
    ...rowsWithSubtotals,
    {
      category: null,
      item: totalLabel,
      budget: rows.reduce((a, r) => a + (r.budget ?? 0), 0),
      plan:   rows.some((r) => r.plan   != null) ? rows.reduce((a, r) => a + (r.plan   ?? 0), 0) : null,
      actual: rows.some((r) => r.actual != null) ? rows.reduce((a, r) => a + (r.actual ?? 0), 0) : null,
      bold: true,
    },
  ];
}
