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

export type LookupFn = (year: number, metric: "revenue" | "cogs", month: number) => number;

/** effectivePeriod × lookups → RevenuePoint[] */
export function buildChartData(
  effectivePeriod: Array<{ year: number; month: number }>,
  {
    pdSalesHasAny,
    pdSalesMap,
    pdCogsHasAny,
    pdCogsLookup,
    lookup,
    convert,
  }: {
    pdSalesHasAny: boolean;
    pdSalesMap: Map<string, { plan: number | null; actual: number | null }>;
    pdCogsHasAny: boolean;
    pdCogsLookup: Map<string, number>;
    lookup: LookupFn;
    convert: (v: number) => number;
  },
): RevenuePoint[] {
  let cumulative = 0;
  let cumCogs = 0;
  let cumPlan = 0;
  return effectivePeriod.map(({ year, month }) => {
    const pdRow = pdSalesHasAny ? pdSalesMap.get(`${year}-${month}`) : undefined;
    const revenue = pdSalesHasAny ? (pdRow?.actual ?? 0) : lookup(year, "revenue", month);
    const plan    = pdSalesHasAny ? (pdRow?.plan ?? 0)   : 0;
    const cogs    = pdSalesHasAny
      ? (pdCogsHasAny ? (pdCogsLookup.get(`${year}-${month}`) ?? 0) : 0)
      : lookup(year, "cogs", month);
    cumulative += revenue;
    cumCogs    += cogs;
    cumPlan    += plan;
    return {
      year,
      month,
      label: `'${String(year).slice(2)}.${String(month).padStart(2, "0")}`,
      revenue:    Math.round(convert(revenue)),
      plan:       Math.round(convert(plan)),
      cumulative: Math.round(convert(cumulative)),
      planCum:    Math.round(convert(cumPlan)),
      ratio:
        cumulative > 0 && !(pdSalesHasAny && !pdCogsHasAny)
          ? Math.round((cumCogs / cumulative) * 1000) / 10
          : null,
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
