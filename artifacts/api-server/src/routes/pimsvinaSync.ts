import { Router, type IRouter } from "express";
import { fetchPimsvinaApi } from "../lib/pimsvinaClient";
import {
  db,
  cfProjectsTable,
  cfMonthlyAmountsTable,
  scSitesTable,
  scMonthlyTable,
  mrProjectsTable,
  mrMonthlyTable,
  mrAnnualTable,
  mrPnlTable,
  pdOverviewTable,
  pdProgressMonthlyTable,
  pdOutsourcingTable,
  pdCashflowMonthlyTable,
  pdCogsMonthlyTable,
  pdSalesMonthlyTable,
  pdCostBudgetTable,
  pdMilestonesTable,
  fxRatesTable,
  companiesTable,
  divisionsTable,
} from "@workspace/db";
import { eq, and, isNull } from "drizzle-orm";
import { requireAdmin } from "../middlewares/adminAuth";

/** SRS와 동일한 서비스 부문 키워드 — CATB_BUSILINE.CLASSIFICATION이 없거나 인식 불가할 때 부문명으로 추정 (프론트 classifyMrProject와 동일 기준) */
const SERVICE_DIVISION_KEYWORDS = ["용역", "프리콘", "인허가", "산출", "유지관리", "운영관리", "분양대행"];

function classifyBusinessType(rawClassification: unknown, divisionLabel: string): "시공" | "용역" {
  const v = String(rawClassification ?? "").trim();
  if (v === "용역" || v === "2" || /service/i.test(v)) return "용역";
  if (v === "시공" || v === "1" || /construction/i.test(v)) return "시공";
  return SERVICE_DIVISION_KEYWORDS.some((k) => divisionLabel.includes(k)) ? "용역" : "시공";
}

const router: IRouter = Router();

const MONTH_KEYS = Array.from({ length: 12 }, (_, i) => "m" + String(i + 1).padStart(2, "0"));

/** 1단계: PIMSVINA의 모든 dashboard API를 조회만 하고 DB에는 아무것도 쓰지 않는다 (미리보기 팝업용). */
async function fetchAllPimsvinaData() {
  const [
    pdOverview,
    pdProgress,
    pdOutsourcing,
    pdCashflow,
    pdCogs,
    pdSales,
    pdCostBudget,
    pdMilestones,
  ] = await Promise.all([
    fetchPimsvinaApi("dashboard_pd_overview_1q.jsp"),
    fetchPimsvinaApi("dashboard_pd_progress_1q.jsp"),
    fetchPimsvinaApi("dashboard_pd_outsourcing_1q.jsp"),
    fetchPimsvinaApi("dashboard_pd_cashflow_1q.jsp"),
    fetchPimsvinaApi("dashboard_pd_cogs_monthly_1q.jsp"),
    fetchPimsvinaApi("dashboard_pd_sales_1q.jsp"),
    fetchPimsvinaApi("dashboard_pd_costbudget_1q.jsp"),
    fetchPimsvinaApi("dashboard_pd_milestones_1q.jsp"),
  ]);
  return {
    pdOverview,
    pdProgress,
    pdOutsourcing,
    pdCashflow,
    pdCogs,
    pdSales,
    pdCostBudget,
    pdMilestones,
  };
}

type PimsvinaData = Awaited<ReturnType<typeof fetchAllPimsvinaData>>;

/** 2단계: 미리보기 팝업에서 "확인"을 누른 뒤, 조회해둔(또는 사용자가 그대로 넘긴) 데이터를 실제 DB에 반영한다. */
async function applyPimsvinaData(fetched: PimsvinaData) {
  const pdOverview = fetched.pdOverview ?? [];
  const pdProgress = fetched.pdProgress ?? [];
  const pdOutsourcing = fetched.pdOutsourcing ?? [];
  const pdCashflow = fetched.pdCashflow ?? [];
  const pdCogs = fetched.pdCogs ?? [];
  const pdSales = fetched.pdSales ?? [];
  const pdCostBudget = fetched.pdCostBudget ?? [];
  const pdMilestones = fetched.pdMilestones ?? [];

  const counts = {
    pdOverview: 0,
    pdProgress: 0,
    pdOutsourcing: 0,
    pdCashflow: 0,
    pdCogs: 0,
    pdSales: 0,
    pdCostBudget: 0,
    pdMilestones: 0,
  };

  // Helper: PIMS-DASHBOARD stores currency fields in 1,000 VND / kUSD units (multiplied by 25.4M for VND display)
  // PIMSVINA Oracle APIs return exact raw amounts (VND / USD). Dividing by 1000 converts raw VND to 1k VND unit.
  const toK = (v: any) => {
    if (v == null || v === "") return null;
    const n = Number(v);
    return isNaN(n) ? null : String(n / 1000);
  };

  // 1. Sync Project Detail Overview
  for (const item of pdOverview) {
    if (!item.project_name) continue;
    const [existing] = await db
      .select()
      .from(pdOverviewTable)
      .where(eq(pdOverviewTable.projectName, item.project_name));

    if (existing) {
      await db
        .update(pdOverviewTable)
        .set({
          contractAmount: item.contract_amount != null ? toK(item.contract_amount) : existing.contractAmount,
          startDate: item.start_date || existing.startDate,
          endDate: item.end_date || existing.endDate,
          client: item.client || existing.client,
          scale: item.scale || existing.scale,
          asOfMonth: item.as_of_month || existing.asOfMonth,
          scope: item.scope || existing.scope,
          revenueAnnualTarget: item.revenue_annual_target != null ? toK(item.revenue_annual_target) : existing.revenueAnnualTarget,
          revenueTotal: item.revenue_total != null ? toK(item.revenue_total) : existing.revenueTotal,
          cashConfirmed: item.cash_confirmed != null ? toK(item.cash_confirmed) : existing.cashConfirmed,
          cashCollection: item.cash_collection != null ? toK(item.cash_collection) : existing.cashCollection,
        })
        .where(eq(pdOverviewTable.projectName, item.project_name));
    } else {
      await db.insert(pdOverviewTable).values({
        projectName: item.project_name,
        contractAmount: item.contract_amount != null ? toK(item.contract_amount) : null,
        startDate: item.start_date || null,
        endDate: item.end_date || null,
        client: item.client || null,
        scale: item.scale || null,
        asOfMonth: item.as_of_month || null,
        scope: item.scope || null,
        revenueAnnualTarget: item.revenue_annual_target != null ? toK(item.revenue_annual_target) : null,
        revenueTotal: item.revenue_total != null ? toK(item.revenue_total) : null,
        cashConfirmed: item.cash_confirmed != null ? toK(item.cash_confirmed) : null,
        cashCollection: item.cash_collection != null ? toK(item.cash_collection) : null,
      });
      counts.pdOverview++;
    }
  }

  // 10. Sync Project Detail Progress (keyed directly by project_name)
  for (const item of fetched.pdProgress) {
    if (!item.project_name || !item.year || !item.month) continue;
    const sanitizeNumStr = (v: any) => {
      if (v == null || v === "") return null;
      const n = Number(v);
      if (isNaN(n)) return null;
      // Clamp to safe numeric(9,4) range [-99999.9999, 99999.9999]
      const clamped = Math.min(99999.9999, Math.max(-99999.9999, n));
      return String(clamped);
    };

    const planPct = sanitizeNumStr(item.plan_pct);
    const actualPct = sanitizeNumStr(item.actual_pct);
    const planCumPct = sanitizeNumStr(item.plan_cum_pct);
    const actualCumPct = sanitizeNumStr(item.actual_cum_pct);

    await db
      .insert(pdProgressMonthlyTable)
      .values({
        projectName: item.project_name,
        year: Number(item.year),
        month: Number(item.month),
        planPct,
        actualPct,
        planCumPct,
        actualCumPct,
      })
      .onConflictDoUpdate({
        target: [pdProgressMonthlyTable.projectName, pdProgressMonthlyTable.year, pdProgressMonthlyTable.month],
        set: { planPct, actualPct, planCumPct, actualCumPct },
      });
    counts.pdProgress++;
  }

  // 11. Sync Project Detail Outsourcing (no natural unique key -> full replace per project)
  const pdOutsourcingByProject = new Map<string, any[]>();
  for (const item of fetched.pdOutsourcing) {
    if (!item.project_name || !item.trade) continue;
    if (!pdOutsourcingByProject.has(item.project_name)) pdOutsourcingByProject.set(item.project_name, []);
    pdOutsourcingByProject.get(item.project_name)!.push(item);
  }
  for (const [projectName, items] of pdOutsourcingByProject) {
    await db.delete(pdOutsourcingTable).where(eq(pdOutsourcingTable.projectName, projectName));
    for (const item of items) {
      await db.insert(pdOutsourcingTable).values({
        projectName,
        tradeGroup: item.trade_group || null,
        trade: item.trade,
        vendor: item.vendor || null,
        category: item.category || null,
        contractDate: item.contract_date || null,
        changeNo: item.change_no != null ? String(item.change_no) : null,
        budget: toK(item.budget),
        executedBudget: toK(item.executed_budget),
        resolved: toK(item.resolved),
        thisMonth: toK(item.this_month),
        accum: toK(item.accum),
        sortOrder: Number(item.sort_order) || 0,
      });
      counts.pdOutsourcing++;
    }
  }

  // 12. Sync Project Detail Cashflow Monthly (cash in/out per project per month)
  for (const item of fetched.pdCashflow) {
    if (!item.project_name || !item.year || !item.month) continue;
    const cashIn = item.cash_in != null ? String(item.cash_in) : null;
    const cashOut = item.cash_out != null ? String(item.cash_out) : null;
    const equivalent = item.equivalent != null ? String(item.equivalent) : null;

    await db
      .insert(pdCashflowMonthlyTable)
      .values({
        projectName: item.project_name,
        year: Number(item.year),
        month: Number(item.month),
        cashIn,
        cashOut,
        equivalent,
      })
      .onConflictDoUpdate({
        target: [pdCashflowMonthlyTable.projectName, pdCashflowMonthlyTable.year, pdCashflowMonthlyTable.month],
        set: { cashIn, cashOut, equivalent },
      });
    counts.pdCashflow++;
  }

  // 13. Sync Project Detail COGS Monthly (acct_cogs & wip_cogs per project per month)
  for (const item of fetched.pdCogs || []) {
    if (!item.project_name || !item.year || !item.month) continue;
    const acctCogs = item.acct_cogs != null ? String(item.acct_cogs) : null;
    const wipCogs = item.wip_cogs != null ? String(item.wip_cogs) : null;

    await db
      .insert(pdCogsMonthlyTable)
      .values({
        projectName: item.project_name,
        year: Number(item.year),
        month: Number(item.month),
        acctCogs,
        wipCogs,
      })
      .onConflictDoUpdate({
        target: [pdCogsMonthlyTable.projectName, pdCogsMonthlyTable.year, pdCogsMonthlyTable.month],
        set: { acctCogs, wipCogs },
      });
    counts.pdCogs++;
  }

  // 14. Sync Project Detail Sales Monthly (revenue plan/actual per project per month)
  for (const item of fetched.pdSales) {
    if (!item.project_name || !item.year || !item.month) continue;
    const plan = item.plan != null ? String(item.plan) : null;
    const actual = item.actual != null ? String(item.actual) : null;

    await db
      .insert(pdSalesMonthlyTable)
      .values({
        projectName: item.project_name,
        year: Number(item.year),
        month: Number(item.month),
        plan,
        actual,
      })
      .onConflictDoUpdate({
        target: [pdSalesMonthlyTable.projectName, pdSalesMonthlyTable.year, pdSalesMonthlyTable.month],
        set: { plan, actual },
      });
    counts.pdSales++;
  }

  // 14. Sync Project Detail Cost Budget (no natural unique key -> full replace per project)
  const pdCostBudgetByProject = new Map<string, any[]>();
  for (const item of fetched.pdCostBudget) {
    if (!item.project_name || !item.item) continue;
    if (!pdCostBudgetByProject.has(item.project_name)) pdCostBudgetByProject.set(item.project_name, []);
    pdCostBudgetByProject.get(item.project_name)!.push(item);
  }
  for (const [projectName, items] of pdCostBudgetByProject) {
    await db.delete(pdCostBudgetTable).where(eq(pdCostBudgetTable.projectName, projectName));
    for (const item of items) {
      await db.insert(pdCostBudgetTable).values({
        projectName,
        category: item.category || null,
        item: item.item,
        budget: toK(item.budget),
        plan: toK(item.plan),
        actual: toK(item.actual),
        sortOrder: Number(item.sort_order) || 0,
      });
      counts.pdCostBudget++;
    }
  }

  // 15. Sync Project Milestones — CBTB_CONSTHISTORY(공사이력) 기반 근사치. APQP_WBS로 시도했으나 실제 DB에
  // 없는 테이블로 확인되어 대체. 이 소스는 계획/실적 기간이 아니라 단일 이벤트 날짜라 planStart/planEnd는
  // 항상 null, actualStart=actualEnd=해당 이벤트월로 채워짐 - 완전한 마일스톤 트래커는 아님(근사치).
  // no natural unique key across syncs -> full replace per project (pd_outsourcing/pd_cost_budget와 동일 패턴)
  const pdMilestonesByProject = new Map<string, any[]>();
  for (const item of fetched.pdMilestones) {
    if (!item.project_name || !item.label) continue;
    if (!pdMilestonesByProject.has(item.project_name)) pdMilestonesByProject.set(item.project_name, []);
    pdMilestonesByProject.get(item.project_name)!.push(item);
  }
  for (const [projectName, items] of pdMilestonesByProject) {
    await db.delete(pdMilestonesTable).where(eq(pdMilestonesTable.projectName, projectName));
    let sortOrder = 0;
    for (const item of items) {
      await db.insert(pdMilestonesTable).values({
        projectName,
        label: item.label,
        planStart: item.plan_start || null,
        planEnd: item.plan_end || null,
        actualStart: item.actual_start || null,
        actualEnd: item.actual_end || null,
        sortOrder: sortOrder++,
      });
      counts.pdMilestones++;
    }
  }

  return counts;
}

// 1단계: 미리보기 — PIMSVINA에서 데이터를 조회만 하고 DB에는 저장하지 않는다.
router.post("/sync-pimsvina/preview", requireAdmin, async (_req, res) => {
  try {
    const data = await fetchAllPimsvinaData();
    res.json({ success: true, data });
  } catch (err: any) {
    console.error("[PIMSVINA Sync Preview Error]:", err);
    res.status(500).json({
      success: false,
      error: "PIMSVINA 데이터 조회에 실패했습니다: " + err.message,
    });
  }
});

// 2단계: 확인 — 미리보기 화면에서 사용자가 검토한 데이터를 그대로 받아 DB에 반영한다.
const PIMSVINA_DATA_KEYS = [
  "pdOverview",
  "pdProgress",
  "pdOutsourcing",
  "pdCashflow",
  "pdCogs",
  "pdSales",
  "pdCostBudget",
  "pdMilestones",
] as const;

function isPimsvinaData(value: unknown): value is PimsvinaData {
  if (value == null || typeof value !== "object") return false;
  return PIMSVINA_DATA_KEYS.every((k) => Array.isArray((value as Record<string, unknown>)[k]));
}

router.post("/sync-pimsvina/confirm", requireAdmin, async (req, res) => {
  const body = req.body as { data?: unknown } | null;
  if (!isPimsvinaData(body?.data)) {
    res.status(400).json({ success: false, error: "잘못된 요청 본문입니다." });
    return;
  }
  try {
    const counts = await applyPimsvinaData(body.data);
    res.json({
      success: true,
      message: "Đồng bộ dữ liệu PIMSVINA thành công!",
      counts,
    });
  } catch (err: any) {
    console.error("[PIMSVINA Sync Confirm Error]:", err);
    res.status(500).json({
      success: false,
      error: "Lỗi đồng bộ dữ liệu PIMSVINA: " + err.message,
    });
  }
});

export default router;
