import { db, cfProjectsTable, cfMonthlyAmountsTable, pdCashflowMonthlyTable } from "@workspace/db";
import {
  parseCashflowWorkbook,
  buildCashflowPreview,
  CashflowParseError,
  type ParsedCashflow,
} from "@workspace/cashflow-parse";

// Re-export for callers (routes) that import from this module
export { parseCashflowWorkbook, buildCashflowPreview, CashflowParseError };
export type { ParsedCashflow };

const round2 = (n: number) => Math.round(n * 100) / 100;

export async function applyCashflowImport(parsed: ParsedCashflow) {
  await db.transaction(async (tx) => {
    // Full replace: the workbook is the single source of truth for cashflow data
    await tx.delete(cfMonthlyAmountsTable);
    await tx.delete(cfProjectsTable);

    // 프로젝트 상세(화면 "8. Monthly Cash Flow")는 project_name(부문 무시) 기준으로 pd_cashflow_monthly를
    // 읽으므로, 같은 이름이 여러 부문(division)에 걸쳐 있으면 여기서 합산해 한 줄로 반영한다.
    const byNameMonth = new Map<string, Map<string, { cashIn: number; cashOut: number }>>();

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

      let monthMap = byNameMonth.get(p.name);
      if (!monthMap) {
        monthMap = new Map();
        byNameMonth.set(p.name, monthMap);
      }
      for (const a of p.amounts) {
        const rec = monthMap.get(a.month) ?? { cashIn: 0, cashOut: 0 };
        if (a.flowType === "수입") rec.cashIn = round2(rec.cashIn + a.amount);
        else if (a.flowType === "지출") rec.cashOut = round2(rec.cashOut + a.amount);
        monthMap.set(a.month, rec);
      }
    }

    // 프로젝트 상세 화면이 실제로 보는 pd_cashflow_monthly에도 반영한다 — 그동안은 여기 데이터가
    // 비어 있을 때만 cf_monthly_amounts를 "임시 미리보기"로만 보여주고 저장은 안 됐는데, 요청에 따라
    // import 시점에 바로 정식 반영한다(사용자가 그 프로젝트에서 직접 입력/수정한 confirmedProgress
    // 등 다른 칸은 그대로 두고, Cash In/Out/Equivalent만 덮어쓴다).
    for (const [projectName, monthMap] of byNameMonth) {
      for (const [monthKey, { cashIn, cashOut }] of monthMap) {
        // 화면 표시와 동일한 규칙: 누적(이월) 없이 그 달 Cash In - Cash Out만 Equivalent로 쓴다.
        const equivalent = Math.round(cashIn) - Math.round(cashOut);
        const [year, month] = monthKey.slice(0, 7).split("-").map(Number);
        await tx
          .insert(pdCashflowMonthlyTable)
          .values({
            projectName,
            year,
            month,
            cashIn: String(cashIn),
            cashOut: String(cashOut),
            equivalent: String(equivalent),
          })
          .onConflictDoUpdate({
            target: [
              pdCashflowMonthlyTable.projectName,
              pdCashflowMonthlyTable.year,
              pdCashflowMonthlyTable.month,
            ],
            set: {
              cashIn: String(cashIn),
              cashOut: String(cashOut),
              equivalent: String(equivalent),
            },
          });
      }
    }
  });
}
