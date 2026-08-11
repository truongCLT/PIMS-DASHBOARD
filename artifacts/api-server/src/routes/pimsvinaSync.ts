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

/** 1단계: PIMSVINA의 모든 dashboard API를 조회만 하고 DB에는 아무것도 쓰지 않는다 (미리보기 팝업용). */
async function fetchAllPimsvinaData() {
  const [
    cfProjects,
    cfMonthly,
    scSites,
    scMonthly,
    mrProjects,
    mrMonthly,
    mrAnnual,
    mrPnl,
    pdOverview,
    pdProgress,
    pdOutsourcing,
    pdCashflow,
    pdSales,
    pdCostBudget,
    pdMilestones,
    fxRates,
    orgStructure,
    orgProjectLinks,
  ] = await Promise.all([
    fetchPimsvinaApi("dashboard_cf_projects_1q.jsp"),
    fetchPimsvinaApi("dashboard_cf_monthly_1q.jsp"),
    fetchPimsvinaApi("dashboard_sc_sites_1q.jsp"),
    fetchPimsvinaApi("dashboard_sc_monthly_1q.jsp"),
    fetchPimsvinaApi("dashboard_mr_projects_1q.jsp"),
    fetchPimsvinaApi("dashboard_mr_monthly_1q.jsp"),
    fetchPimsvinaApi("dashboard_mr_annual_1q.jsp"),
    fetchPimsvinaApi("dashboard_mr_pnl_1q.jsp"),
    fetchPimsvinaApi("dashboard_pd_overview_1q.jsp"),
    fetchPimsvinaApi("dashboard_pd_progress_1q.jsp"),
    fetchPimsvinaApi("dashboard_pd_outsourcing_1q.jsp"),
    fetchPimsvinaApi("dashboard_pd_cashflow_1q.jsp"),
    fetchPimsvinaApi("dashboard_pd_sales_1q.jsp"),
    fetchPimsvinaApi("dashboard_pd_costbudget_1q.jsp"),
    fetchPimsvinaApi("dashboard_pd_milestones_1q.jsp"),
    fetchPimsvinaApi("dashboard_fxrates_1q.jsp"),
    fetchPimsvinaApi("dashboard_orgstructure_1q.jsp"),
    fetchPimsvinaApi("dashboard_orgstructure_project_1q.jsp"),
  ]);
  return {
    cfProjects,
    cfMonthly,
    scSites,
    scMonthly,
    mrProjects,
    mrMonthly,
    mrAnnual,
    mrPnl,
    pdOverview,
    pdProgress,
    pdOutsourcing,
    pdCashflow,
    pdSales,
    pdCostBudget,
    pdMilestones,
    fxRates,
    orgStructure,
    orgProjectLinks,
  };
}

type PimsvinaData = Awaited<ReturnType<typeof fetchAllPimsvinaData>>;

/** 2단계: 미리보기 팝업에서 "확인"을 누른 뒤, 조회해둔(또는 사용자가 그대로 넘긴) 데이터를 실제 DB에 반영한다. */
async function applyPimsvinaData(fetched: PimsvinaData) {
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
    pdMilestones: 0,
    fxRates: 0,
    orgCompanies: 0,
    orgDivisions: 0,
    orgProjectLinks: 0,
  };

  // 1. Sync Cashflow Projects (+ track project_code -> id for cf_monthly)
  const cfProjectIdByCode = new Map<string, number>();
  for (const item of fetched.cfProjects) {
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
  for (const item of fetched.cfMonthly) {
    const projectId = item.project_code ? cfProjectIdByCode.get(item.project_code) : undefined;
    if (!projectId || !item.year || !item.flow_type) continue;
    // dashboard_cf_monthly_1q.jsp의 FLOW_TYPE = CFTB_CASHFLOWPLAND.CASHFLOWCATEGORY, 실제 값은 'INC'/'OUT'
    // (dashboard_pd_cashflow_1q.jsp에서도 동일 컬럼을 'INC'/'OUT'로 비교) — 'INFLOW'가 아님.
    const flowType = String(item.flow_type).toUpperCase() === "INC" ? "수입" : "지출";

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
  for (const item of fetched.scSites) {
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
  for (const item of fetched.scMonthly) {
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
  for (const item of fetched.mrProjects) {
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
          // dashboard_mr_projects_1q.jsp의 STATUS는 CBTB_FLDSUMM.CONSTDVSCODE(공사상태)를
          // FUN_GET_CA_REFFPF('17', ...)로 디코딩한 한글 라벨("완료"/"준공"/"진행중" 등) — 코드값이
          // 그대로 "closed" 문자열로 오는 게 아니므로 키워드로 판별한다.
          status: /완료|준공|종료/.test(String(item.status ?? "")) ? "closed" : "ongoing",
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
  for (const item of fetched.mrMonthly) {
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
  for (const item of fetched.mrAnnual) {
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
  for (const item of fetched.mrPnl) {
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
  for (const item of fetched.pdOverview) {
    if (!item.project_name) continue;
    const [existing] = await db
      .select()
      .from(pdOverviewTable)
      .where(eq(pdOverviewTable.projectName, item.project_name));

    if (existing) {
      await db
        .update(pdOverviewTable)
        .set({
          contractAmount: item.contract_amount != null ? String(item.contract_amount) : existing.contractAmount,
          startDate: item.start_date || existing.startDate,
          endDate: item.end_date || existing.endDate,
          client: item.client || existing.client,
          scale: item.scale || existing.scale,
          asOfMonth: item.as_of_month || existing.asOfMonth,
          scope: item.scope || existing.scope,
          revenueAnnualTarget: item.revenue_annual_target != null ? String(item.revenue_annual_target) : existing.revenueAnnualTarget,
          revenueTotal: item.revenue_total != null ? String(item.revenue_total) : existing.revenueTotal,
          cashConfirmed: item.cash_confirmed != null ? String(item.cash_confirmed) : existing.cashConfirmed,
          cashCollection: item.cash_collection != null ? String(item.cash_collection) : existing.cashCollection,
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
  for (const item of fetched.pdProgress) {
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

  // 13. Sync Project Detail Sales Monthly (revenue plan/actual per project per month)
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
        budget: item.budget != null ? String(item.budget) : null,
        plan: item.plan != null ? String(item.plan) : null,
        actual: item.actual != null ? String(item.actual) : null,
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

  // 16. Sync FX Rates — PIMSVINA가 내려주는 EFFECTIVE_DATE(effectivedate) 기준으로 연/월 이력을 쌓는다.
  // 값이 없거나 파싱 불가하면 동기화 실행 시점(현재 연/월)으로 폴백.
  //
  // CFTB_CFEXCHANGERATE.EXCHANGERATE의 기준(base)은 USD가 아니라 VND다 - CURRENCY='USD' 행의 RATE는
  // "1 USD당 VND"를 의미한다. 실제 프로덕션 코드로 확인: ch_cost_monthly_site_cash_q_1q.jsp/
  // cf_tran_transactionlist_e_1q.jsp가 둘 다 "EQUSD = AMOUNT(VND) / EXCHANGERATE WHERE CURRENCY='USD'"로
  // USD 환산액을 구한다 - VND 금액을 나눠서 USD가 나오려면 EXCHANGERATE가 반드시 "USD당 VND"여야 한다.
  // 반면 PIMS-DASHBOARD의 fx_rates 스키마는 반대 기준(USD=1 고정, 다른 통화를 "1 USD당 X")을 쓴다
  // (FX_RATES 기본값: VND 25450, KRW 1380 - 둘 다 실제로 그럴듯한 "1 USD당" 값). 따라서 PIMSVINA의
  // CURRENCY='USD' 값은 그대로 저장하면 안 되고 우리 스키마의 VND 필드로 옮겨 써야 한다. CURRENCY='KRW'가
  // 오면(아직 실제로 온 적은 없음) 마찬가지로 "1 KRW당 VND"일 것으로 추정 - 같은 달의 USD당VND 값과
  // 나눠서 "1 USD당 KRW" 교차환율을 계산해야 하므로, 월별로 먼저 모은 뒤 한 번에 변환한다.
  const syncNow = new Date();
  for (const item of fetched.fxRates) {
    if (!item.currency || item.rate == null) continue;
    const rawCurr = String(item.currency).toUpperCase().trim();
    if (rawCurr !== "USD" && rawCurr !== "KRW" && rawCurr !== "VND") continue;
    const curr = rawCurr as "USD" | "KRW" | "VND";

    let fxYear = syncNow.getFullYear();
    let fxMonth = syncNow.getMonth() + 1;
    const effectiveDateStr = String(item.effective_date ?? "").trim();
    const effectiveDateMatch = /^(\d{4})(\d{2})/.exec(effectiveDateStr);
    if (effectiveDateMatch) {
      fxYear = Number(effectiveDateMatch[1]);
      fxMonth = Number(effectiveDateMatch[2]);
    }

    const rate = Number(item.rate);

    await db
      .insert(fxRatesTable)
      .values({ currency: curr, year: fxYear, month: fxMonth, rate, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: [fxRatesTable.currency, fxRatesTable.year, fxRatesTable.month],
        set: { rate, updatedAt: new Date() },
      });
    counts.fxRates++;
  }

  // 17. Sync Org Structure (회사/부문) — CATB_COMPANYSTRUCT + CATB_BUSILINE
  const companyIdByCode = new Map<string, number>();
  const divisionIdByKey = new Map<string, number>(); // `${companyCode}:${divisionCode}` -> divisionId
  let companySort = 0;
  for (const item of fetched.orgStructure) {
    if (!item.company_code || !item.division_code) continue;
    const companyCode = String(item.company_code);

    let companyId: number | undefined = companyIdByCode.get(companyCode);
    if (companyId === undefined) {
      const [company] = await db
        .insert(companiesTable)
        .values({ label: String(item.company_name ?? companyCode), sortOrder: Number(item.company_sort) || companySort })
        .onConflictDoUpdate({
          target: companiesTable.label,
          set: { sortOrder: Number(item.company_sort) || companySort },
        })
        .returning({ id: companiesTable.id });
      if (!company) continue;
      companyId = company.id;
      companyIdByCode.set(companyCode, company.id);
      companySort++;
      counts.orgCompanies++;
    }

    const divisionLabel = String(item.division_name ?? item.division_code);
    const businessType = classifyBusinessType(item.classification, divisionLabel);
    const [division] = await db
      .insert(divisionsTable)
      .values({
        companyId,
        label: divisionLabel,
        businessType,
        sortOrder: Number(item.division_sort) || 0,
      })
      .onConflictDoUpdate({
        target: [divisionsTable.companyId, divisionsTable.label],
        set: { businessType, sortOrder: Number(item.division_sort) || 0 },
      })
      .returning({ id: divisionsTable.id });
    divisionIdByKey.set(`${companyCode}:${item.division_code}`, division.id);
    counts.orgDivisions++;
  }

  // 18. Sync Org Structure — 프로젝트(FLDCODE) -> 부문 매핑 (CATB_COMPANYSTRUCT_PROJECT)
  for (const item of fetched.orgProjectLinks) {
    if (!item.company_code || !item.division_code) continue;
    const divisionId = divisionIdByKey.get(`${item.company_code}:${item.division_code}`);
    if (divisionId == null) continue;

    const matchers = [
      item.project_code ? eq(mrProjectsTable.siteCode, String(item.project_code)) : null,
      item.project_name ? eq(mrProjectsTable.name, String(item.project_name)) : null,
    ].filter((m): m is NonNullable<typeof m> => m != null);
    if (matchers.length === 0) continue;

    for (const matcher of matchers) {
      const updated = await db
        .update(mrProjectsTable)
        .set({ divisionId })
        .where(matcher)
        .returning({ id: mrProjectsTable.id });
      if (updated.length > 0) {
        counts.orgProjectLinks += updated.length;
        break;
      }
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
  "cfProjects",
  "cfMonthly",
  "scSites",
  "scMonthly",
  "mrProjects",
  "mrMonthly",
  "mrAnnual",
  "mrPnl",
  "pdOverview",
  "pdProgress",
  "pdOutsourcing",
  "pdCashflow",
  "pdSales",
  "pdCostBudget",
  "pdMilestones",
  "fxRates",
  "orgStructure",
  "orgProjectLinks",
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
