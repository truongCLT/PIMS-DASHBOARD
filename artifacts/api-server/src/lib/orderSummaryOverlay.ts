import type { AggregatedPnlLine } from "./mgmtreportAggregation";
import { roundMgmtreportAmount } from "./mgmtreportAggregation";

export interface OrderSummaryRow {
  year: number;
  referenceMonth: number;
  planAmount: string | number | null;
  planDate: string | null;
  actualAmount: string | number | null;
  actualDate: string | null;
}

/**
 * Replaces only the new_orders summary line for years with dedicated order
 * rows. All other management-report P&L lines remain owned by mr_pnl.
 */
export function applyOrderRowsToPnlSummary(
  linesByYear: Map<number, Map<string, AggregatedPnlLine>>,
  orderRows: OrderSummaryRow[],
) {
  const initializedYears = new Set<number>();

  for (const row of orderRows) {
    let lines = linesByYear.get(row.year);
    if (!lines) {
      lines = new Map();
      linesByYear.set(row.year, lines);
    }
    const line =
      initializedYears.has(row.year) && lines.get("new_orders")
        ? lines.get("new_orders")!
        : {
            code: "new_orders",
            label: "수 주",
            plan: Array(12).fill(0),
            actual: Array(12).fill(0),
            planTotalOverride: null,
            actualTotalOverride: null,
          };
    initializedYears.add(row.year);
    lines.set("new_orders", line);

    if (row.planAmount != null && row.planDate?.startsWith(`${row.year}-`)) {
      const month = Number(row.planDate.slice(5, 7));
      line.plan[month - 1] = roundMgmtreportAmount(
        line.plan[month - 1] + Number(row.planAmount),
      );
    }
    if (row.actualAmount != null && row.actualDate?.startsWith(`${row.year}-`)) {
      const month = Number(row.actualDate.slice(5, 7));
      line.actualTotalOverride = roundMgmtreportAmount(
        (line.actualTotalOverride ?? 0) + Number(row.actualAmount),
      );
      if (month <= row.referenceMonth) {
        line.actual[month - 1] = roundMgmtreportAmount(
          line.actual[month - 1] + Number(row.actualAmount),
        );
      }
    }
  }

  return linesByYear;
}