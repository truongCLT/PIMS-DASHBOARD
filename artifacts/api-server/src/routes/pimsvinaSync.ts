import { Router, type IRouter } from "express";
import fs from "fs";
import crypto from "crypto";
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
  pdSalesMonthlyTable,
  pdCostBudgetTable,
  fxRatesTable,
} from "@workspace/db";
import { eq, and, isNull } from "drizzle-orm";

const router: IRouter = Router();

// Configs from environment variables (.env)
const PIMSVINA_BASE_URL =
  process.env.PIMSVINA_BASE_URL || "http://boatcon.infoerp.com.vn:8081/site/jsp/Common/dashboard";
const PRIVATE_KEY_PATH =
  process.env.PIMS_JWT_PRIVATE_KEY_PATH || "D:/pims_keys/pims_jwt_private.pem";
const PIMS_JWT_ISS = process.env.PIMS_JWT_ISS || "pims";
const PIMS_JWT_AUD = process.env.PIMS_JWT_AUD || "daewoo-gw-api";
const PIMS_JWT_KID = process.env.PIMS_JWT_KID || "pims-rsa-2026-01";

let cachedPrivateKey: string | null = null;

function getPrivateKey(): string {
  if (cachedPrivateKey) return cachedPrivateKey;
  if (fs.existsSync(PRIVATE_KEY_PATH)) {
    cachedPrivateKey = fs.readFileSync(PRIVATE_KEY_PATH, "utf8");
    return cachedPrivateKey;
  }
  if (process.env.PIMS_JWT_PRIVATE_KEY) {
    return process.env.PIMS_JWT_PRIVATE_KEY;
  }
  throw new Error("Private Key file not found at path: " + PRIVATE_KEY_PATH);
}

function base64UrlEncode(str: string | Buffer): string {
  const buf = typeof str === "string" ? Buffer.from(str, "utf8") : str;
  return buf.toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function generateRS256JwtToken(): string {
  const header = {
    alg: "RS256",
    typ: "JWT",
    kid: PIMS_JWT_KID,
  };

  const nowSec = Math.floor(Date.now() / 1000);
  const payload = {
    iss: PIMS_JWT_ISS,
    aud: PIMS_JWT_AUD,
    sub: "dashboard_sync_service",
    iat: nowSec,
    exp: nowSec + 600,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  const signer = crypto.createSign("SHA256");
  signer.update(signingInput);
  const signature = signer.sign(getPrivateKey());
  const encodedSignature = base64UrlEncode(signature);

  return `${signingInput}.${encodedSignature}`;
}

async function fetchPimsvinaApi(endpoint: string, params: Record<string, string> = {}): Promise<any[]> {
  try {
    const token = generateRS256JwtToken();
    const baseUrl = PIMSVINA_BASE_URL.replace(/\/$/, "");
    const url = new URL(`${baseUrl}/${endpoint}`);
    Object.entries(params).forEach(([k, v]) => url.searchParams.append(k, v));

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    const resText = await response.text();
    if (!response.ok) {
      console.warn(`[PIMSVINA Sync] ${endpoint} HTTP ${response.status} Body: ${resText}`);
      return [];
    }

    const resJson = JSON.parse(resText);
    if (resJson && resJson.success && Array.isArray(resJson.data)) {
      return resJson.data;
    }
    return [];
  } catch (err: any) {
    console.error(`[PIMSVINA Sync Error] ${endpoint}:`, err.message);
    return [];
  }
}

const MONTH_KEYS = Array.from({ length: 12 }, (_, i) => "m" + String(i + 1).padStart(2, "0"));

router.post("/sync-pimsvina", async (req, res) => {
  try {
    const counts = {
      cfProjects: 0,
      cfMonthly: 0,
      scSites: 0,
      scMonthly: 0,
      mrProjects: 0,
      mrMonthly: 0,
      mrAnnual: 0,
      mrPnl: 0,
      pdOverview: 0,
      pdProgress: 0,
      pdOutsourcing: 0,
      pdCashflow: 0,
      pdSales: 0,
      pdCostBudget: 0,
      fxRates: 0,
    };

    // 1. Sync Cashflow Projects (+ track project_code -> id for cf_monthly)
    const cfProjectIdByCode = new Map<string, number>();
    const cfProjects = await fetchPimsvinaApi("dashboard_cf_projects_1q.jsp");
    for (const item of cfProjects) {
      if (!item.name || !item.division) continue;
      const [existing] = await db
        .select()
        .from(cfProjectsTable)
        .where(and(eq(cfProjectsTable.name, item.name), eq(cfProjectsTable.division, item.division)));

      if (!existing) {
        const [inserted] = await db
          .insert(cfProjectsTable)
          .values({
            name: item.name,
            division: item.division,
            code: item.project_code || null,
            itemNameIn: item.item_name_in || null,
            itemNameOut: item.item_name_out || null,
            sortOrder: Number(item.sort_order) || 0,
          })
          .returning({ id: cfProjectsTable.id });
        counts.cfProjects++;
        if (item.project_code) cfProjectIdByCode.set(item.project_code, inserted.id);
      } else {
        if (item.project_code && existing.code !== item.project_code) {
          await db
            .update(cfProjectsTable)
            .set({ code: item.project_code })
            .where(eq(cfProjectsTable.id, existing.id));
        }
        if (item.project_code) cfProjectIdByCode.set(item.project_code, existing.id);
      }
    }

    // 2. Sync Cashflow Monthly Amounts (needs cf_projects synced first)
    const cfMonthly = await fetchPimsvinaApi("dashboard_cf_monthly_1q.jsp");
    for (const item of cfMonthly) {
      const projectId = item.project_code ? cfProjectIdByCode.get(item.project_code) : undefined;
      if (!projectId || !item.year || !item.flow_type) continue;
      const flowType = String(item.flow_type).toUpperCase() === "INFLOW" ? "수입" : "지출";

      for (const key of MONTH_KEYS) {
        if (item[key] == null) continue;
        const monthNum = key.slice(1);
        const monthDate = `${item.year}-${monthNum}-01`;
        const amount = String(item[key]);

        await db
          .insert(cfMonthlyAmountsTable)
          .values({ projectId, flowType, bucket: "month", month: monthDate, amount })
          .onConflictDoUpdate({
            target: [
              cfMonthlyAmountsTable.projectId,
              cfMonthlyAmountsTable.flowType,
              cfMonthlyAmountsTable.bucket,
              cfMonthlyAmountsTable.month,
            ],
            set: { amount },
          });
        counts.cfMonthly++;
      }
    }

    // 3. Sync Sales & Cost Sites (+ track site code -> id for sc_monthly)
    const scSiteIdByCode = new Map<string, number>();
    const scSites = await fetchPimsvinaApi("dashboard_sc_sites_1q.jsp");
    for (const item of scSites) {
      if (!item.code || !item.name) continue;
      const [existing] = await db.select().from(scSitesTable).where(eq(scSitesTable.code, item.code));
      if (!existing) {
        const [inserted] = await db
          .insert(scSitesTable)
          .values({
            code: item.code,
            name: item.name,
            category: item.category || null,
            bizType: item.biz_type || null,
            sortOrder: Number(item.sort_order) || 0,
          })
          .returning({ id: scSitesTable.id });
        counts.scSites++;
        scSiteIdByCode.set(item.code, inserted.id);
      } else {
        scSiteIdByCode.set(item.code, existing.id);
      }
    }

    // 4. Sync Sales & Cost Monthly (needs sc_sites synced first)
    const scMonthly = await fetchPimsvinaApi("dashboard_sc_monthly_1q.jsp");
    for (const item of scMonthly) {
      const siteId = item.site_code ? scSiteIdByCode.get(item.site_code) : undefined;
      if (!siteId || !item.year || !item.month || !item.metric) continue;
      const metric = String(item.metric).toLowerCase();
      const amountVnd = item.amount_vnd != null ? String(item.amount_vnd) : null;
      const amountUsd = item.amount_usd != null ? String(item.amount_usd) : null;

      await db
        .insert(scMonthlyTable)
        .values({ siteId, year: Number(item.year), month: Number(item.month), metric, amountVnd, amountUsd })
        .onConflictDoUpdate({
          target: [scMonthlyTable.siteId, scMonthlyTable.year, scMonthlyTable.month, scMonthlyTable.metric],
          set: { amountVnd, amountUsd },
        });
      counts.scMonthly++;
    }

    // 5. Sync Management Report Projects (+ track project_code -> id for mr_monthly/mr_annual)
    const mrProjectIdByCode = new Map<string, number>();
    const mrProjects = await fetchPimsvinaApi("dashboard_mr_projects_1q.jsp");
    for (const item of mrProjects) {
      if (!item.name) continue;
      const [existing] = await db.select().from(mrProjectsTable).where(eq(mrProjectsTable.name, item.name));
      if (!existing) {
        const [inserted] = await db
          .insert(mrProjectsTable)
          .values({
            name: item.name,
            code: item.code || null,
            siteCode: item.site_code || null,
            groupLabel: item.group_label || null,
            sortOrder: Number(item.sort_order) || 0,
            status: item.status === "closed" ? "closed" : "ongoing",
          })
          .returning({ id: mrProjectsTable.id });
        counts.mrProjects++;
        if (item.code) mrProjectIdByCode.set(item.code, inserted.id);
      } else {
        if (item.code && existing.code !== item.code) {
          await db.update(mrProjectsTable).set({ code: item.code }).where(eq(mrProjectsTable.id, existing.id));
        }
        if (item.code) mrProjectIdByCode.set(item.code, existing.id);
      }
    }

    // 6. Sync Management Report Monthly (needs mr_projects synced first)
    const mrMonthly = await fetchPimsvinaApi("dashboard_mr_monthly_1q.jsp");
    for (const item of mrMonthly) {
      const projectId = item.project_code ? mrProjectIdByCode.get(item.project_code) : undefined;
      if (!projectId || !item.year || !item.month || !item.scenario || !item.metric) continue;
      const amountUsd = String(item.amount_usd ?? 0);

      await db
        .insert(mrMonthlyTable)
        .values({
          projectId,
          year: Number(item.year),
          month: Number(item.month),
          scenario: item.scenario,
          metric: item.metric,
          amountUsd,
        })
        .onConflictDoUpdate({
          target: [
            mrMonthlyTable.projectId,
            mrMonthlyTable.year,
            mrMonthlyTable.month,
            mrMonthlyTable.scenario,
            mrMonthlyTable.metric,
          ],
          set: { amountUsd },
        });
      counts.mrMonthly++;
    }

    // 7. Sync Management Report Annual (needs mr_projects synced first)
    const mrAnnual = await fetchPimsvinaApi("dashboard_mr_annual_1q.jsp");
    for (const item of mrAnnual) {
      const projectId = item.project_code ? mrProjectIdByCode.get(item.project_code) : undefined;
      if (!projectId || !item.year || !item.scenario || !item.metric) continue;
      const amountUsd = String(item.amount_usd ?? 0);

      await db
        .insert(mrAnnualTable)
        .values({ projectId, year: Number(item.year), scenario: item.scenario, metric: item.metric, amountUsd })
        .onConflictDoUpdate({
          target: [mrAnnualTable.projectId, mrAnnualTable.year, mrAnnualTable.scenario, mrAnnualTable.metric],
          set: { amountUsd },
        });
      counts.mrAnnual++;
    }

    // 8. Sync Management Report P&L (company-wide, no project reference)
    const mrPnl = await fetchPimsvinaApi("dashboard_mr_pnl_1q.jsp");
    for (const item of mrPnl) {
      if (!item.year || !item.line_code || !item.scenario) continue;
      const lineLabel = item.line_label || item.line_code;
      const amountUsd = String(item.amount_usd ?? 0);
      const sortOrder = Number(item.sort_order) || 0;
      const month = item.month != null ? Number(item.month) : null;
      const year = Number(item.year);

      // mr_pnl_uq treats every NULL month as distinct, so ON CONFLICT can't target it here;
      // match manually (IS NULL for yearly-total rows) instead of relying on the DB constraint.
      const [existing] = await db
        .select({ id: mrPnlTable.id })
        .from(mrPnlTable)
        .where(
          and(
            eq(mrPnlTable.year, year),
            eq(mrPnlTable.lineCode, item.line_code),
            eq(mrPnlTable.scenario, item.scenario),
            month != null ? eq(mrPnlTable.month, month) : isNull(mrPnlTable.month),
          ),
        );

      if (existing) {
        await db.update(mrPnlTable).set({ lineLabel, amountUsd, sortOrder }).where(eq(mrPnlTable.id, existing.id));
      } else {
        await db.insert(mrPnlTable).values({ year, lineCode: item.line_code, lineLabel, scenario: item.scenario, month, amountUsd, sortOrder });
      }
      counts.mrPnl++;
    }

    // 9. Sync Project Detail Overview
    const pdOverview = await fetchPimsvinaApi("dashboard_pd_overview_1q.jsp");
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
            contractAmount: item.contract_amount != null ? String(item.contract_amount) : null,
            startDate: item.start_date || null,
            endDate: item.end_date || null,
            client: item.client || null,
            scale: item.scale || null,
            asOfMonth: item.as_of_month || null,
            scope: item.scope || null,
            revenueAnnualTarget: item.revenue_annual_target != null ? String(item.revenue_annual_target) : null,
            revenueTotal: item.revenue_total != null ? String(item.revenue_total) : null,
            cashConfirmed: item.cash_confirmed != null ? String(item.cash_confirmed) : null,
            cashCollection: item.cash_collection != null ? String(item.cash_collection) : null,
          })
          .where(eq(pdOverviewTable.projectName, item.project_name));
      } else {
        await db.insert(pdOverviewTable).values({
          projectName: item.project_name,
          contractAmount: item.contract_amount != null ? String(item.contract_amount) : null,
          startDate: item.start_date || null,
          endDate: item.end_date || null,
          client: item.client || null,
          scale: item.scale || null,
          asOfMonth: item.as_of_month || null,
          scope: item.scope || null,
          revenueAnnualTarget: item.revenue_annual_target != null ? String(item.revenue_annual_target) : null,
          revenueTotal: item.revenue_total != null ? String(item.revenue_total) : null,
          cashConfirmed: item.cash_confirmed != null ? String(item.cash_confirmed) : null,
          cashCollection: item.cash_collection != null ? String(item.cash_collection) : null,
        });
        counts.pdOverview++;
      }
    }

    // 10. Sync Project Detail Progress (keyed directly by project_name)
    const pdProgress = await fetchPimsvinaApi("dashboard_pd_progress_1q.jsp");
    for (const item of pdProgress) {
      if (!item.project_name || !item.year || !item.month) continue;
      const planPct = item.plan_pct != null ? String(item.plan_pct) : null;
      const actualPct = item.actual_pct != null ? String(item.actual_pct) : null;
      const planCumPct = item.plan_cum_pct != null ? String(item.plan_cum_pct) : null;
      const actualCumPct = item.actual_cum_pct != null ? String(item.actual_cum_pct) : null;

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
    const pdOutsourcing = await fetchPimsvinaApi("dashboard_pd_outsourcing_1q.jsp");
    const pdOutsourcingByProject = new Map<string, any[]>();
    for (const item of pdOutsourcing) {
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
          budget: item.budget != null ? String(item.budget) : null,
          executedBudget: item.executed_budget != null ? String(item.executed_budget) : null,
          resolved: item.resolved != null ? String(item.resolved) : null,
          thisMonth: item.this_month != null ? String(item.this_month) : null,
          accum: item.accum != null ? String(item.accum) : null,
          sortOrder: Number(item.sort_order) || 0,
        });
        counts.pdOutsourcing++;
      }
    }

    // 12. Sync Project Detail Cashflow Monthly (cash in/out per project per month)
    const pdCashflow = await fetchPimsvinaApi("dashboard_pd_cashflow_1q.jsp");
    for (const item of pdCashflow) {
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

    // 13. Sync Project Detail Sales Monthly (revenue plan/actual per project per month)
    const pdSales = await fetchPimsvinaApi("dashboard_pd_sales_1q.jsp");
    for (const item of pdSales) {
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
    const pdCostBudget = await fetchPimsvinaApi("dashboard_pd_costbudget_1q.jsp");
    const pdCostBudgetByProject = new Map<string, any[]>();
    for (const item of pdCostBudget) {
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
          budget: item.budget != null ? String(item.budget) : null,
          plan: item.plan != null ? String(item.plan) : null,
          actual: item.actual != null ? String(item.actual) : null,
          sortOrder: Number(item.sort_order) || 0,
        });
        counts.pdCostBudget++;
      }
    }

    // 15. Sync FX Rates
    const fxRates = await fetchPimsvinaApi("dashboard_fxrates_1q.jsp");
    for (const item of fxRates) {
      if (!item.currency || !item.rate) continue;
      const curr = String(item.currency).toUpperCase();
      if (!["USD", "KRW", "VND"].includes(curr)) continue;

      await db
        .insert(fxRatesTable)
        .values({
          currency: curr as "USD" | "KRW" | "VND",
          rate: Number(item.rate),
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: fxRatesTable.currency,
          set: {
            rate: Number(item.rate),
            updatedAt: new Date(),
          },
        });
      counts.fxRates++;
    }

    res.json({
      success: true,
      message: "Đồng bộ dữ liệu PIMSVINA thành công!",
      counts,
    });
  } catch (err: any) {
    console.error("[PIMSVINA Sync Error]:", err);
    res.status(500).json({
      success: false,
      error: "Lỗi đồng bộ dữ liệu PIMSVINA: " + err.message,
    });
  }
});

export default router;
