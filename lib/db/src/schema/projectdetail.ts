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
    contractAmount: numeric("contract_amount", { precision: 24, scale: 8 }), // 도급액 (VND 원본 그대로 저장, 천 USD 아님 — 표시 시 UI에서 통화 변환)
    startDate: text("start_date"), // 공사 시작일 'YYYY-MM-DD'
    endDate: text("end_date"), // 공사 종료일 'YYYY-MM-DD'
    client: text("client"), // 발주처
    scale: text("scale"), // 공사규모
    location: text("location"), // 위치
    siteArea: text("site_area"), // 대지면적
    grossFloorArea: text("gross_floor_area"), // 연면적
    purpose: text("purpose"), // 용도
    ownershipStake: text("ownership_stake"), // 지분
    partnerCompany: text("partner_company"), // 파트너사
    contractMethod: text("contract_method"), // 계약방식
    paymentTerms: text("payment_terms"), // 수금조건
    defectWarrantyPeriod: text("defect_warranty_period"), // 하자보증기간
    defectWarrantyBond: text("defect_warranty_bond"), // 하자보증증권
    advancePayment: text("advance_payment"), // 선급금
    retention: text("retention"), // 유보금
    veTerms: text("ve_terms"), // VE 조건
    asOfMonth: text("as_of_month"), // 작성 기준월 'YYYY-MM'
    scope: text("scope"), // 수행내용 (용역)
    revenueAnnualTarget: numeric("revenue_annual_target", {
      precision: 24,
      scale: 8,
    }), // 연간 매출 목표 (천 USD)
    revenueTotal: numeric("revenue_total", { precision: 24, scale: 8 }), // 누계 매출 실적 (천 USD)
    cashConfirmed: numeric("cash_confirmed", { precision: 24, scale: 8 }), // Cash Confirmed (A) (천 USD)
    cashCollection: numeric("cash_collection", { precision: 24, scale: 8 }), // Cash Collection (B) (천 USD)
    slideshowIntervalSeconds: integer("slideshow_interval_seconds")
      .notNull()
      .default(0), // 슬라이드쇼 자동 전환 간격(초), 0=꺼짐
    isClosed: integer("is_closed")
      .notNull()
      .default(sql`0`), // 마감 여부 (true면 데이터 편집 잠금)
  },
  (t) => [uniqueIndex("pd_overview_uq").on(t.projectName)],
);

// 섹션별 마감 상태 — 기존 pd_overview.is_closed는 전체 마감 호환용으로 유지한다.
export const pdSectionLocksTable = pgTable(
  "pd_section_locks",
  {
    id: serial("id").primaryKey(),
    projectName: text("project_name").notNull(),
    sectionKey: text("section_key").notNull(),
    isClosed: integer("is_closed")
      .notNull()
      .default(sql`0`),
  },
  (t) => [uniqueIndex("pd_section_locks_uq").on(t.projectName, t.sectionKey)],
);

// 데이터 입력 계획 변경 버전 — 프로젝트별 계획값 묶음의 변경 차수를 기록
export const pdPlanVersionsTable = pgTable("pd_plan_versions", {
  projectName: text("project_name").primaryKey(),
  version: integer("version").notNull().default(1),
  fingerprint: text("fingerprint").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

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
    fldCode: text("fld_code"), // PIMSVINA site code (FLDCODE) — 'execution'/'completion'만 동기화 시 채워짐, 'bidding'(수동 입력)은 null
    siteCode: text("site_code"), // PIMSVINA financial site code (ACNT_FLDCODE, via CBTB_FLD_MAPPING) — 위와 동일
    // contractAmount/costAmount 단위는 kind에 따라 다르다: 'bidding'은 수동 입력(천 USD), 'execution'은
    // PIMSVINA settle-ratio 리포트에서 동기화한 VND 원본 그대로(천 USD 아님), 'completion'은 Contract
    // Amount=100 고정 + Cost는 Execution 값 기반 계산 결과(그래서 Execution과 같은 단위) — 표시는 UI에서
    // kind별로 fmtMoney(천 USD)/fmtVnd(VND 원본)를 구분해서 사용한다.
    contractAmount: numeric("contract_amount", { precision: 24, scale: 8 }),
    costAmount: numeric("cost_amount", { precision: 24, scale: 8 }),
    year: integer("year"), // completion 월별 이력용 (bidding/execution 은 null)
    month: integer("month"), // 1..12
    // completion 전용: PIMSVINA settle-ratio 리포트의 Gross Profit ratio(%)를 그대로 동기화한 값.
    // Contract Amount가 100으로 고정되어 있으므로 화면의 Ratio(%) 계산식(Contract/Cost*100)을 그대로
    // 적용하면 이 값과 일치하지 않아, Completion 행에서는 계산 대신 이 값을 직접 표시한다.
    ratioPct: numeric("ratio_pct", { precision: 10, scale: 4 }),
    // execution 전용: ch_cost_settle_ratio_q_1q.jsp의 "V_0"(PFMCHGSEQ=0, Initial Budget) 컬럼 —
    // 현재 진행 중인 실행예산(Execution)과 별개로, 최초 승인된 예산 기준선. 단위는 contractAmount/
    // costAmount와 동일(VND 원본).
    initialBusinessBudget: numeric("initial_business_budget", { precision: 24, scale: 8 }),
    initialContractAmount: numeric("initial_contract_amount", { precision: 24, scale: 8 }),
    initialGrossProfitRatio: numeric("initial_gross_profit_ratio", { precision: 10, scale: 4 }),
  },
  (t) => [
    unique("pd_cost_estimation_uq")
      .on(t.projectName, t.kind, t.year, t.month)
      .nullsNotDistinct(),
    check(
      "pd_cost_estimation_kind_ck",
      sql`${t.kind} IN ('bidding','execution','completion')`,
    ),
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
    actualSource: text("actual_source"), // null=manual/import, 'pimsvina'=ERP-owned actual
  },
  (t) => [
    uniqueIndex("pd_cost_budget_monthly_uq").on(
      t.projectName,
      t.item,
      t.year,
      t.month,
    ),
    check("pd_cost_budget_monthly_month_ck", sql`${t.month} BETWEEN 1 AND 12`),
  ],
);

// 자금 — 월별 현금흐름 (Cash in / Cash out / 보유 현금 / 기성 확정)
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
    confirmedProgress: numeric("confirmed_progress", {
      precision: 24,
      scale: 8,
    }), // 기성 확정 금액 (천 USD)
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
    // 1..12, 0 = "전년 누계"(해당 year 이전 연도들의 누계, 자동 업로드 완성 전까지 수기 입력용 임시값)
    month: integer("month").notNull(),
    plan: numeric("plan", { precision: 24, scale: 8 }), // 매출 계획 (천 USD)
    actual: numeric("actual", { precision: 24, scale: 8 }), // 매출 실적 (천 USD)
  },
  (t) => [
    uniqueIndex("pd_sales_monthly_uq").on(t.projectName, t.year, t.month),
    check("pd_sales_month_ck", sql`${t.month} BETWEEN 0 AND 12`),
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

// 조감도 — PIMSVINA에서 동기화된 개요 탭 사진 (CBTB_CONSTPIC.AIRVIEWPICPATH) — 프로젝트당 1장, 읽기 전용
export const pdSiteOverviewPhotoTable = pgTable("pd_site_overview_photo", {
  projectName: text("project_name").primaryKey(),
  filePath: text("file_path"), // PZTB_FILEUPLOAD.FILE_PATH (예: '/cb/prjt')
  fileName: text("file_name"), // PZTB_FILEUPLOAD.FILE_NAME
});

// 현장 사진(월별) — PIMSVINA에서 동기화된 공정 탭 슬라이더용 (CBTB_CONSTMONTHPIC) — 읽기 전용
export const pdSitePhotosMonthlyTable = pgTable(
  "pd_site_photos_monthly",
  {
    id: serial("id").primaryKey(),
    projectName: text("project_name").notNull(),
    year: integer("year").notNull(),
    month: integer("month").notNull(), // 1..12
    seq: integer("seq").notNull(),
    location: text("location"),
    contType: text("cont_type"), // 공종/내용 구분 (예: 'Overview', 'Finishing works')
    note: text("note"),
    filePath: text("file_path"), // PZTB_FILEUPLOAD.FILE_PATH
    fileName: text("file_name"), // PZTB_FILEUPLOAD.FILE_NAME
  },
  (t) => [
    uniqueIndex("pd_site_photos_monthly_uq").on(t.projectName, t.year, t.month, t.seq),
    index("pd_site_photos_monthly_project_idx").on(t.projectName),
    check("pd_site_photos_monthly_month_ck", sql`${t.month} BETWEEN 1 AND 12`),
  ],
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
    // budget/executedBudget/resolved/thisMonth/accum: PIMSVINA 동기화 전용 — VND 원본 그대로 저장
    // (천 USD 환산 안 함, dashboard_pd_outsourcing_1q.jsp의 BDGTAMT/EXECAMT/CTRTAMT/PRGSAMT 그대로) —
    // 표시는 UI에서 fmtVnd()로 통화 변환.
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
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("pd_comments_project_tab_idx").on(t.projectName, t.tab),
    check(
      "pd_comments_tab_ck",
      sql`${t.tab} IN ('overview','progress','costing','outsourcing','cashflow','saleprofit','budget','service')`,
    ),
  ],
);

export const insertPdCommentSchema = createInsertSchema(pdCommentsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertPdComment = z.infer<typeof insertPdCommentSchema>;
export type PdComment = typeof pdCommentsTable.$inferSelect;

export const insertPdOverviewSchema = createInsertSchema(pdOverviewTable).omit({
  id: true,
});
export type InsertPdOverview = z.infer<typeof insertPdOverviewSchema>;
export type PdOverview = typeof pdOverviewTable.$inferSelect;

export const insertPdProgressMonthlySchema = createInsertSchema(
  pdProgressMonthlyTable,
).omit({ id: true });
export type InsertPdProgressMonthly = z.infer<
  typeof insertPdProgressMonthlySchema
>;
export type PdProgressMonthly = typeof pdProgressMonthlyTable.$inferSelect;

export const insertPdMilestoneSchema = createInsertSchema(
  pdMilestonesTable,
).omit({ id: true });
export type InsertPdMilestone = z.infer<typeof insertPdMilestoneSchema>;
export type PdMilestone = typeof pdMilestonesTable.$inferSelect;

export const insertPdCostEstimationSchema = createInsertSchema(
  pdCostEstimationTable,
).omit({ id: true });
export type InsertPdCostEstimation = z.infer<
  typeof insertPdCostEstimationSchema
>;
export type PdCostEstimation = typeof pdCostEstimationTable.$inferSelect;

export const insertPdCostBudgetSchema = createInsertSchema(
  pdCostBudgetTable,
).omit({ id: true });
export type InsertPdCostBudget = z.infer<typeof insertPdCostBudgetSchema>;
export type PdCostBudget = typeof pdCostBudgetTable.$inferSelect;

export const insertPdCashflowMonthlySchema = createInsertSchema(
  pdCashflowMonthlyTable,
).omit({ id: true });
export type InsertPdCashflowMonthly = z.infer<
  typeof insertPdCashflowMonthlySchema
>;
export type PdCashflowMonthly = typeof pdCashflowMonthlyTable.$inferSelect;

export const insertPdCogsMonthlySchema = createInsertSchema(
  pdCogsMonthlyTable,
).omit({ id: true });
export type InsertPdCogsMonthly = z.infer<typeof insertPdCogsMonthlySchema>;
export type PdCogsMonthly = typeof pdCogsMonthlyTable.$inferSelect;

export const insertPdSalesMonthlySchema = createInsertSchema(
  pdSalesMonthlyTable,
).omit({ id: true });
export type InsertPdSalesMonthly = z.infer<typeof insertPdSalesMonthlySchema>;
export type PdSalesMonthly = typeof pdSalesMonthlyTable.$inferSelect;

export const insertPdPhotoSchema = createInsertSchema(pdPhotosTable).omit({
  id: true,
});
export type InsertPdPhoto = z.infer<typeof insertPdPhotoSchema>;
export type PdPhoto = typeof pdPhotosTable.$inferSelect;

export const insertPdOutsourcingSchema = createInsertSchema(
  pdOutsourcingTable,
).omit({ id: true });
export type InsertPdOutsourcing = z.infer<typeof insertPdOutsourcingSchema>;
export type PdOutsourcing = typeof pdOutsourcingTable.$inferSelect;
