import { db, scSitesTable, scMonthlyTable } from "@workspace/db";
import {
  parseSalescostWorkbook,
  buildSalescostPreview,
  SalescostParseError,
  type ParsedSalescost,
} from "@workspace/salescost-parse";

// Re-export for callers (routes) that import from this module
export { parseSalescostWorkbook, buildSalescostPreview, SalescostParseError };
export type { ParsedSalescost };

export async function applySalescostImport(parsed: ParsedSalescost) {
  await db.transaction(async (tx) => {
    // Full replace: the workbook is the single source of truth for sales/cost data
    await tx.delete(scMonthlyTable);
    await tx.delete(scSitesTable);

    const idByCode = new Map<string, number>();
    for (const s of parsed.sites) {
      const [row] = await tx
        .insert(scSitesTable)
        .values({
          code: s.code,
          name: s.name,
          category: s.category,
          bizType: s.bizType,
          sortOrder: s.sortOrder,
        })
        .returning({ id: scSitesTable.id });
      idByCode.set(s.code, row.id);
    }

    // merge duplicate (site, month, metric) rows: COALESCE semantics like the CLI upsert
    const merged = new Map<
      string,
      { siteId: number; month: number; metric: string; amountVnd: number | null; amountUsd: number | null }
    >();
    for (const a of parsed.amounts) {
      const siteId = idByCode.get(a.code);
      if (!siteId) continue;
      const k = `${siteId}|${a.month}|${a.metric}`;
      const prev = merged.get(k);
      if (prev) {
        if (a.amountVnd != null) prev.amountVnd = a.amountVnd;
        if (a.amountUsd != null) prev.amountUsd = a.amountUsd;
      } else {
        merged.set(k, {
          siteId,
          month: a.month,
          metric: a.metric,
          amountVnd: a.amountVnd,
          amountUsd: a.amountUsd,
        });
      }
    }
    const values = [...merged.values()].map((a) => ({
      siteId: a.siteId,
      year: parsed.year,
      month: a.month,
      metric: a.metric,
      amountVnd: a.amountVnd != null ? String(a.amountVnd) : null,
      amountUsd: a.amountUsd != null ? String(a.amountUsd) : null,
    }));
    for (let i = 0; i < values.length; i += 500) {
      await tx.insert(scMonthlyTable).values(values.slice(i, i + 500));
    }
  });
}
