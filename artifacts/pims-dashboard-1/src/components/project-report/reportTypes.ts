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

export interface ProgRowData {
  year: number;
  month: number;
  planPct?: number | null;
  actualPct?: number | null;
  planCumPct?: number | null;
  actualCumPct?: number | null;
}
