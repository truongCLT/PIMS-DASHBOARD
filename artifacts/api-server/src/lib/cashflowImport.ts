import { db, cfProjectsTable, cfMonthlyAmountsTable } from "@workspace/db";
import {
  parseCashflowWorkbook,
  buildCashflowPreview,
  CashflowParseError,
  type ParsedCashflow,
} from "@workspace/cashflow-parse";

// Re-export for callers (routes) that import from this module
export { parseCashflowWorkbook, buildCashflowPreview, CashflowParseError };
export type { ParsedCashflow };

export async function applyCashflowImport(parsed: ParsedCashflow) {
  await db.transaction(async (tx) => {
    // Full replace: the workbook is the single source of truth for cashflow data
    await tx.delete(cfMonthlyAmountsTable);
    await tx.delete(cfProjectsTable);

    for (const p of parsed.projects) {
      const [row] = await tx
        .insert(cfProjectsTable)
        .values({
          name: p.name,
          division: p.division,
          itemNameIn: p.itemNameIn,
          itemNameOut: p.itemNameOut,
          sortOrder: p.sortOrder,
        })
        .returning({ id: cfProjectsTable.id });

      // amounts are already aggregated by @workspace/cashflow-parse
      const values = p.amounts.map((a) => ({
        projectId: row.id,
        flowType: a.flowType,
        bucket: a.bucket,
        month: a.month,
        amount: String(a.amount),
      }));
      for (let i = 0; i < values.length; i += 500) {
        await tx.insert(cfMonthlyAmountsTable).values(values.slice(i, i + 500));
      }
    }
  });
}
