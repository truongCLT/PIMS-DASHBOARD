import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  serial,
  integer,
  numeric,
  uniqueIndex,
  check,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const scSitesTable = pgTable(
  "sc_sites",
  {
    id: serial("id").primaryKey(),
    code: text("code").notNull(), // e.g. 'SITE05'
    name: text("name").notNull(), // e.g. 'Infra Management'
    category: text("category"), // 'Infra' | 'Housing' | null
    bizType: text("biz_type"), // 'Construction' | 'Consulting' | 'O&M'
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [uniqueIndex("sc_sites_code_uq").on(t.code)],
);

export const scMonthlyTable = pgTable(
  "sc_monthly",
  {
    id: serial("id").primaryKey(),
    siteId: integer("site_id")
      .notNull()
      .references(() => scSitesTable.id, { onDelete: "cascade" }),
    year: integer("year").notNull(),
    month: integer("month").notNull(), // 1..12
    // 'revenue' | 'cogs' | 'repair_allowance' | 'site_cost' | 'hq_transfer' | 'sga' | 'employees'
    metric: text("metric").notNull(),
    amountVnd: numeric("amount_vnd", { precision: 20, scale: 2 }),
    amountUsd: numeric("amount_usd", { precision: 18, scale: 4 }), // 천 USD (1000 USD)
  },
  (t) => [
    uniqueIndex("sc_monthly_uq").on(t.siteId, t.year, t.month, t.metric),
    check("sc_monthly_month_ck", sql`${t.month} BETWEEN 1 AND 12`),
    check(
      "sc_monthly_metric_ck",
      sql`${t.metric} IN ('revenue','cogs','repair_allowance','site_cost','hq_transfer','sga','employees')`,
    ),
  ],
);

export const insertScSiteSchema = createInsertSchema(scSitesTable).omit({
  id: true,
});
export type InsertScSite = z.infer<typeof insertScSiteSchema>;
export type ScSite = typeof scSitesTable.$inferSelect;

export const insertScMonthlySchema = createInsertSchema(scMonthlyTable).omit({
  id: true,
});
export type InsertScMonthly = z.infer<typeof insertScMonthlySchema>;
export type ScMonthly = typeof scMonthlyTable.$inferSelect;
