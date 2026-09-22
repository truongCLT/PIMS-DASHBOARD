/**
 * Shared types for the project report tab sections.
 */

export interface BudgetRowData {
  item: string;
  budget: number | null;
  plan: number | null;
  actual: number | null;
}

export interface StatusRowData {
  category: string;
  type: "월" | "누계";
  plan: number | null;
  actual: number | null;
}

/** 공정별 원가집행 내역 한 줄 (대공종/건축/기계/... 등) — ProgressSection의 hover 상세, StatusTableSection의 원가 판정에 공용으로 쓰인다. */
export interface CostBreakdownRow {
  label: string;
  plan: number | null;
  actual: number | null;
}

export interface ProgRowData {
  year: number;
  month: number;
  planPct?: number | null;
  actualPct?: number | null;
  planCumPct?: number | null;
  actualCumPct?: number | null;
}
