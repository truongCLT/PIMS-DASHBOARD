/** Shared types used across the 매출/원가 tab sub-components. */

export type RevenuePoint = {
  label: string;
  revenue: number;
  plan: number;
  cumulative: number;
  planCum: number;
  /** 누계 원가율 (%); null = 계산 불가 */
  ratio: number | null;
};

export type BudgetRow = {
  category: string | null;
  item: string;
  budget: number | null;
  plan: number | null;
  actual: number | null;
  bold?: boolean;
};
