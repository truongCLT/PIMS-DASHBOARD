import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  serial,
  integer,
  numeric,
  uniqueIndex,
  unique,
  index,
  check,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// 프로젝트 상세 (공정/원가/외주) — 프로젝트별 입력 데이터, 단위: 천 USD

// 개요 — 프로젝트 기본 정보 (도급액, 공사 기간)
export const pdOverviewTable = pgTable(
  "pd_overview",
  {
    id: serial("id").primaryKey(),
    projectName: text("project_name").notNull(),
    fldCode: text("fld_code"), // PIMSVINA site code (FLDCODE, e.g. 'VH10TC1')
    siteCode: text("site_code"), // PIMSVINA financial site code (ACNT_FLDCODE, via CBTB_FLD_MAPPING)
    contractAmount: numeric("contract_amount", { precision: 24, scale: 8 }), // 도급액 (천 USD)
    startDate: text("start_date"), // 공사 시작일 'YYYY-MM-DD'
    endDate: text("end_date"), // 공사 종료일 'YYYY-MM-DD'
    client: text("client"), // 발주처
    scale: text("scale"), // 공사규모
    asOfMonth: text("as_of_month"), // 작성 기준월 'YYYY-MM'
    scope: text("scope"), // 수행내용 (용역)
    revenueAnnualTarget: numeric("revenue_annual_target", { precision: 24, scale: 8 }), // 연간 매출 목표 (천 USD)
    revenueTotal: numeric("revenue_total", { precision: 24, scale: 8 }), // 누계 매출 실적 (천 USD)
    cashConfirmed: numeric("cash_confirmed", { precision: 24, scale: 8 }), // Cash Confirmed (A) (천 USD)
    cashCollection: numeric("cash_collection", { precision: 24, scale: 8 }), // Cash Collection (B) (천 USD)
    slideshowIntervalSeconds: integer("slideshow_interval_seconds").notNull().default(0), // 슬라이드쇼 자동 전환 간격(초), 0=꺼짐
    isClosed: integer("is_closed", { mode: "boolean" }).notNull().default(sql`0`), // 마감 여부 (true면 데이터 편집 잠금)
  },
  (t) => [uniqueIndex("pd_overview_uq").on(t.projectName)],
);

// 공정 — 월별 공정률 (계획/실적 월간, 누계)
export const pdProgressMonthlyTable = pgTable(
  "pd_progress_monthly",
  {
    id: serial("id").primaryKey(),
    projectName: text("project_name").notNull(),
    fldCode: text("fld_code"), // PIMSVINA site code (FLDCODE)
    siteCode: text("site_code"), // PIMSVINA financial site code (ACNT_FLDCODE)
    year: integer("year").notNull(),
    month: integer("month").notNull(), // 1..12
    planPct: numeric("plan_pct", { precision: 9, scale: 4 }), // 월간 계획 공정률 (%)
    actualPct: numeric("actual_pct", { precision: 9, scale: 4 }), // 월간 실적 공정률 (%)
    planCumPct: numeric("plan_cum_pct", { precision: 9, scale: 4 }), // 누계 계획 (%)
    actualCumPct: numeric("actual_cum_pct", { precision: 9, scale: 4 }), // 누계 실적 (%)
  },
  (t) => [
    uniqueIndex("pd_progress_monthly_uq").on(t.projectName, t.year, t.month),
    check("pd_progress_month_ck", sql`${t.month} BETWEEN 1 AND 12`),
  ],
);

// 공정 — 마일스톤 (계획/실적 기간, YYYY-MM 문자열)
export const pdMilestonesTable = pgTable(
  "pd_milestones",
  {
    id: serial("id").primaryKey(),
    projectName: text("project_name").notNull(),
    fldCode: text("fld_code"), // PIMSVINA site code (FLDCODE)
    siteCode: text("site_code"), // PIMSVINA financial site code (ACNT_FLDCODE)
    label: text("label").notNull(),
    planStart: text("plan_start"), // 'YYYY-MM'
    planEnd: text("plan_end"),
    actualStart: text("actual_start"),
    actualEnd: text("actual_end"),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [index("pd_milestones_project_idx").on(t.projectName)],
);

// 원가 — 원가율 요약 (Bidding / Execution Budgeting / Estimated Completion)
export const pdCostEstimationTable = pgTable(
  "pd_cost_estimation",
  {
    id: serial("id").primaryKey(),
    projectName: text("project_name").notNull(),
    kind: text("kind").notNull(), // 'bidding' | 'execution' | 'completion'
    contractAmount: numeric("contract_amount", { precision: 24, scale: 8 }), // 도급액 기준 (천 USD)
    costAmount: numeric("cost_amount", { precision: 24, scale: 8 }), // 원가 (천 USD)
    year: integer("year"), // completion 월별 이력용 (bidding/execution 은 null)
    month: integer("month"), // 1..12
  },
  (t) => [
    unique("pd_cost_estimation_uq").on(t.projectName, t.kind, t.year, t.month).nullsNotDistinct(),
    check("pd_cost_estimation_kind_ck", sql`${t.kind} IN ('bidding','execution','completion')`),
  ],
);

// 원가 — 예산 집행 현황 (항목별 예산/기성계획/기성실적)
export const pdCostBudgetTable = pgTable(
  "pd_cost_budget",
  {
    id: serial("id").primaryKey(),
    projectName: text("project_name").notNull(),
    fldCode: text("fld_code"), // PIMSVINA site code (FLDCODE)
    siteCode: text("site_code"), // PIMSVINA financial site code (ACNT_FLDCODE)
    category: text("category"), // e.g. 'Direct Cost' | 'Indirect Cost' | null
    item: text("item").notNull(), // e.g. '외주비', '자재비'
    budget: numeric("budget", { precision: 24, scale: 8 }),
    plan: numeric("plan", { precision: 24, scale: 8 }),
    actual: numeric("actual", { precision: 24, scale: 8 }),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [index("pd_cost_budget_project_idx").on(t.projectName)],
);

// 원가 — 예산 집행 월별 계획/실적 (Common·Expense 1 항목별 1~12월)
export const pdCostBudgetMonthlyTable = pgTable(
  "pd_cost_budget_monthly",
  {
    id: serial("id").primaryKey(),
    projectName: text("project_name").notNull(),
    item: text("item").notNull(), // 'Common' | 'Expense 1'
    year: integer("year").notNull(),
    month: integer("month").notNull(), // 1..12
    plan: numeric("plan", { precision: 24, scale: 8 }),
    actual: numeric("actual", { precision: 24, scale: 8 }),
  },
  (t) => [
    uniqueIndex("pd_cost_budget_monthly_uq").on(t.projectName, t.item, t.year, t.month),
    check("pd_cost_budget_monthly_month_ck", sql`${t.month} BETWEEN 1 AND 12`),
  ],
);

// 자금 — 월별 현금흐름 (Cash in / Cash out / 보유 현금)
export const pdCashflowMonthlyTable = pgTable(
  "pd_cashflow_monthly",
  {
    id: serial("id").primaryKey(),
    projectName: text("project_name").notNull(),
    fldCode: text("fld_code"), // PIMSVINA site code (FLDCODE)
    siteCode: text("site_code"), // PIMSVINA financial site code (ACNT_FLDCODE)
    year: integer("year").notNull(),
    month: integer("month").notNull(), // 1..12
    cashIn: numeric("cash_in", { precision: 24, scale: 8 }), // 수입 (천 USD)
    cashOut: numeric("cash_out", { precision: 24, scale: 8 }), // 지출 (천 USD)
    equivalent: numeric("equivalent", { precision: 24, scale: 8 }), // 보유 현금 (천 USD)
  },
  (t) => [
    uniqueIndex("pd_cashflow_monthly_uq").on(t.projectName, t.year, t.month),
    check("pd_cashflow_month_ck", sql`${t.month} BETWEEN 1 AND 12`),
  ],
);

// 매출원가 — 월별 회계/집행(WIP) 매출원가 (용역 매출 탭)
export const pdCogsMonthlyTable = pgTable(
  "pd_cogs_monthly",
  {
    id: serial("id").primaryKey(),
    projectName: text("project_name").notNull(),
    fldCode: text("fld_code"), // PIMSVINA site code (FLDCODE)
    siteCode: text("site_code"), // PIMSVINA financial site code (ACNT_FLDCODE)
    year: integer("year").notNull(),
    month: integer("month").notNull(), // 1..12
    acctCogs: numeric("acct_cogs", { precision: 24, scale: 8 }), // 회계 매출원가 (천 USD)
    wipCogs: numeric("wip_cogs", { precision: 24, scale: 8 }), // 집행 매출원가 (WIP) (천 USD)
  },
  (t) => [
    uniqueIndex("pd_cogs_monthly_uq").on(t.projectName, t.year, t.month),
    check("pd_cogs_month_ck", sql`${t.month} BETWEEN 1 AND 12`),
  ],
);

// 매출 — 월별 매출 계획/실적 (매출 탭)
export const pdSalesMonthlyTable = pgTable(
  "pd_sales_monthly",
  {
    id: serial("id").primaryKey(),
    projectName: text("project_name").notNull(),
    fldCode: text("fld_code"), // PIMSVINA site code (FLDCODE)
    siteCode: text("site_code"), // PIMSVINA financial site code (ACNT_FLDCODE)
    year: integer("year").notNull(),
    month: integer("month").notNull(), // 1..12
    plan: numeric("plan", { precision: 24, scale: 8 }), // 매출 계획 (천 USD)
    actual: numeric("actual", { precision: 24, scale: 8 }), // 매출 실적 (천 USD)
  },
  (t) => [
    uniqueIndex("pd_sales_monthly_uq").on(t.projectName, t.year, t.month),
    check("pd_sales_month_ck", sql`${t.month} BETWEEN 1 AND 12`),
  ],
);

// 사진 — 개요 탭 현장 사진 (object storage objectPath)
export const pdPhotosTable = pgTable(
  "pd_photos",
  {
    id: serial("id").primaryKey(),
    projectName: text("project_name").notNull(),
    objectPath: text("object_path").notNull(), // '/objects/uploads/<uuid>'
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [index("pd_photos_project_idx").on(t.projectName)],
);

// 외주 — 외주/자재 계약 및 기성 현황
export const pdOutsourcingTable = pgTable(
  "pd_outsourcing",
  {
    id: serial("id").primaryKey(),
    projectName: text("project_name").notNull(),
    fldCode: text("fld_code"), // PIMSVINA site code (FLDCODE)
    siteCode: text("site_code"), // PIMSVINA financial site code (ACNT_FLDCODE)
    tradeGroup: text("trade_group"), // 대공종 (공통/토목/건축/기계/전기/조경)
    trade: text("trade").notNull(), // 세부 공종
    vendor: text("vendor"), // 업체명
    category: text("category"), // 구분 (예: 용역/외주)
    contractDate: text("contract_date"), // 최초 계약일 (자유 형식)
    changeNo: text("change_no"), // 변경 계약 차수
    budget: numeric("budget", { precision: 24, scale: 8 }), // 예산 (A)
    executedBudget: numeric("executed_budget", { precision: 24, scale: 8 }), // 집행예산
    resolved: numeric("resolved", { precision: 24, scale: 8 }), // 결의금액 (B)
    thisMonth: numeric("this_month", { precision: 24, scale: 8 }), // 기성 이번달
    accum: numeric("accum", { precision: 24, scale: 8 }), // 기성 누계 (C)
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [index("pd_outsourcing_project_idx").on(t.projectName)],
);

// 코멘트 — 프로젝트 상세 탭별 코멘트
export const pdCommentsTable = pgTable(
  "pd_comments",
  {
    id: serial("id").primaryKey(),
    projectName: text("project_name").notNull(),
    tab: text("tab").notNull(), // 'overview' | 'progress' | 'costing' | 'outsourcing' | 'cashflow' | 'saleprofit' | 'budget' | 'service'
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("pd_comments_project_tab_idx").on(t.projectName, t.tab),
    check(
      "pd_comments_tab_ck",
      sql`${t.tab} IN ('overview','progress','costing','outsourcing','cashflow','saleprofit','budget','service')`,
    ),
  ],
);

export const insertPdCommentSchema = createInsertSchema(pdCommentsTable).omit({ id: true, createdAt: true });
export type InsertPdComment = z.infer<typeof insertPdCommentSchema>;
export type PdComment = typeof pdCommentsTable.$inferSelect;

export const insertPdOverviewSchema = createInsertSchema(pdOverviewTable).omit({ id: true });
export type InsertPdOverview = z.infer<typeof insertPdOverviewSchema>;
export type PdOverview = typeof pdOverviewTable.$inferSelect;

export const insertPdProgressMonthlySchema = createInsertSchema(pdProgressMonthlyTable).omit({ id: true });
export type InsertPdProgressMonthly = z.infer<typeof insertPdProgressMonthlySchema>;
export type PdProgressMonthly = typeof pdProgressMonthlyTable.$inferSelect;

export const insertPdMilestoneSchema = createInsertSchema(pdMilestonesTable).omit({ id: true });
export type InsertPdMilestone = z.infer<typeof insertPdMilestoneSchema>;
export type PdMilestone = typeof pdMilestonesTable.$inferSelect;

export const insertPdCostEstimationSchema = createInsertSchema(pdCostEstimationTable).omit({ id: true });
export type InsertPdCostEstimation = z.infer<typeof insertPdCostEstimationSchema>;
export type PdCostEstimation = typeof pdCostEstimationTable.$inferSelect;

export const insertPdCostBudgetSchema = createInsertSchema(pdCostBudgetTable).omit({ id: true });
export type InsertPdCostBudget = z.infer<typeof insertPdCostBudgetSchema>;
export type PdCostBudget = typeof pdCostBudgetTable.$inferSelect;

export const insertPdCashflowMonthlySchema = createInsertSchema(pdCashflowMonthlyTable).omit({ id: true });
export type InsertPdCashflowMonthly = z.infer<typeof insertPdCashflowMonthlySchema>;
export type PdCashflowMonthly = typeof pdCashflowMonthlyTable.$inferSelect;

export const insertPdCogsMonthlySchema = createInsertSchema(pdCogsMonthlyTable).omit({ id: true });
export type InsertPdCogsMonthly = z.infer<typeof insertPdCogsMonthlySchema>;
export type PdCogsMonthly = typeof pdCogsMonthlyTable.$inferSelect;

export const insertPdSalesMonthlySchema = createInsertSchema(pdSalesMonthlyTable).omit({ id: true });
export type InsertPdSalesMonthly = z.infer<typeof insertPdSalesMonthlySchema>;
export type PdSalesMonthly = typeof pdSalesMonthlyTable.$inferSelect;

export const insertPdPhotoSchema = createInsertSchema(pdPhotosTable).omit({ id: true });
export type InsertPdPhoto = z.infer<typeof insertPdPhotoSchema>;
export type PdPhoto = typeof pdPhotosTable.$inferSelect;

export const insertPdOutsourcingSchema = createInsertSchema(pdOutsourcingTable).omit({ id: true });
export type InsertPdOutsourcing = z.infer<typeof insertPdOutsourcingSchema>;
export type PdOutsourcing = typeof pdOutsourcingTable.$inferSelect;
