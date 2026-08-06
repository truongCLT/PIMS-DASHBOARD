import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  serial,
  integer,
  numeric,
  uniqueIndex,
  check,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// 경영관리보고회 (Management Report) — per-project plan vs actual/forecast, 단위: 천 USD

export const mrProjectsTable = pgTable(
  "mr_projects",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(), // normalized label, e.g. 'K8HH1 도급공사'
    code: text("code"), // PIMSVINA project_code (dashboard_mr_projects_1q.jsp), null for Excel-imported rows
    siteCode: text("site_code"), // e.g. 'SITE23' when present in label
    groupLabel: text("group_label"), // e.g. 'DECV법인 취합본 [법인전체]' | null for regular projects
    sortOrder: integer("sort_order").notNull().default(0),
    status: text("status").notNull().default("ongoing"), // 'ongoing'(진행중) | 'closed'(종료)
  },
  (t) => [
    uniqueIndex("mr_projects_name_uq").on(t.name),
    uniqueIndex("mr_projects_code_uq").on(t.code),
    check("mr_projects_status_ck", sql`${t.status} IN ('ongoing','closed')`),
  ],
);

export const mrMonthlyTable = pgTable(
  "mr_monthly",
  {
    id: serial("id").primaryKey(),
    projectId: integer("project_id")
      .notNull()
      .references(() => mrProjectsTable.id, { onDelete: "cascade" }),
    year: integer("year").notNull(),
    month: integer("month").notNull(), // 1..12
    scenario: text("scenario").notNull(), // 'plan' | 'actual'
    metric: text("metric").notNull(), // 'revenue' | 'cogs'
    amountUsd: numeric("amount_usd", { precision: 18, scale: 4 }).notNull(), // 천 USD
  },
  (t) => [
    uniqueIndex("mr_monthly_uq").on(t.projectId, t.year, t.month, t.scenario, t.metric),
    check("mr_monthly_month_ck", sql`${t.month} BETWEEN 1 AND 12`),
    check("mr_monthly_scenario_ck", sql`${t.scenario} IN ('plan','actual')`),
    check("mr_monthly_metric_ck", sql`${t.metric} IN ('revenue','cogs')`),
  ],
);

export const mrAnnualTable = pgTable(
  "mr_annual",
  {
    id: serial("id").primaryKey(),
    projectId: integer("project_id")
      .notNull()
      .references(() => mrProjectsTable.id, { onDelete: "cascade" }),
    year: integer("year").notNull(), // e.g. 2025 (전년 실적 계), 2026..2030 (전망)
    scenario: text("scenario").notNull(), // 'plan' | 'actual' | 'forecast'
    metric: text("metric").notNull(), // 'revenue' | 'cogs'
    amountUsd: numeric("amount_usd", { precision: 18, scale: 4 }).notNull(),
  },
  (t) => [
    uniqueIndex("mr_annual_uq").on(t.projectId, t.year, t.scenario, t.metric),
    check("mr_annual_scenario_ck", sql`${t.scenario} IN ('plan','actual','forecast')`),
    check("mr_annual_metric_ck", sql`${t.metric} IN ('revenue','cogs')`),
  ],
);

// 법인 손익 라인 (수주, 수주이익, 매출총이익, 판매관리비, 영업이익, 금융원가, 이자수익, 경상이익 등)
export const mrPnlTable = pgTable(
  "mr_pnl",
  {
    id: serial("id").primaryKey(),
    year: integer("year").notNull(),
    lineCode: text("line_code").notNull(), // e.g. 'new_orders','order_profit','gross_profit','sga','op_profit1','op_profit2','finance_cost','interest_income','ordinary_profit','misc_income','fx_gain','fx_loss'
    lineLabel: text("line_label").notNull(), // original Korean label
    scenario: text("scenario").notNull(), // 'plan' | 'actual'
    month: integer("month"), // 1..12, null = yearly total only
    amountUsd: numeric("amount_usd", { precision: 18, scale: 4 }).notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [
    uniqueIndex("mr_pnl_uq").on(t.year, t.lineCode, t.scenario, t.month),
    check("mr_pnl_month_ck", sql`${t.month} IS NULL OR (${t.month} BETWEEN 1 AND 12)`),
    check("mr_pnl_scenario_ck", sql`${t.scenario} IN ('plan','actual')`),
  ],
);

// 실적/전망 코멘트 (메인 대시보드 하단 패널)
export const mrCommentsTable = pgTable(
  "mr_comments",
  {
    id: serial("id").primaryKey(),
    year: integer("year").notNull(),
    month: integer("month").notNull(), // 1..12
    section: text("section").notNull(), // 'analysis'(실적) | 'outlook'(전망)
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check("mr_comments_month_ck", sql`${t.month} BETWEEN 1 AND 12`),
    check("mr_comments_section_ck", sql`${t.section} IN ('analysis','outlook')`),
  ],
);

// Excel 반영 이력 — 반영 직전의 mr_* 전체 스냅샷을 보관해 되돌리기를 지원
export const mrImportHistoryTable = pgTable("mr_import_history", {
  id: serial("id").primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  filename: text("filename").notNull(), // 업로드된 Excel 파일명
  year: integer("year").notNull(), // 반영 대상 연도
  snapshot: jsonb("snapshot").notNull(), // 반영 직전 mr_projects/mr_monthly/mr_annual/mr_pnl 전체
});

export type MrImportHistory = typeof mrImportHistoryTable.$inferSelect;

export const insertMrProjectSchema = createInsertSchema(mrProjectsTable).omit({ id: true });
export type InsertMrProject = z.infer<typeof insertMrProjectSchema>;
export type MrProject = typeof mrProjectsTable.$inferSelect;

export const insertMrMonthlySchema = createInsertSchema(mrMonthlyTable).omit({ id: true });
export type InsertMrMonthly = z.infer<typeof insertMrMonthlySchema>;
export type MrMonthly = typeof mrMonthlyTable.$inferSelect;

export const insertMrAnnualSchema = createInsertSchema(mrAnnualTable).omit({ id: true });
export type InsertMrAnnual = z.infer<typeof insertMrAnnualSchema>;
export type MrAnnual = typeof mrAnnualTable.$inferSelect;

export const insertMrPnlSchema = createInsertSchema(mrPnlTable).omit({ id: true });
export type InsertMrPnl = z.infer<typeof insertMrPnlSchema>;
export type MrPnl = typeof mrPnlTable.$inferSelect;
