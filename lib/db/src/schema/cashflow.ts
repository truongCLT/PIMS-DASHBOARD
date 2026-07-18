import {
  pgTable,
  text,
  serial,
  integer,
  date,
  numeric,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const cfProjectsTable = pgTable(
  "cf_projects",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    division: text("division").notNull(),
    itemNameIn: text("item_name_in"),
    itemNameOut: text("item_name_out"),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [uniqueIndex("cf_projects_name_division_uq").on(t.name, t.division)],
);

export const cfMonthlyAmountsTable = pgTable(
  "cf_monthly_amounts",
  {
    id: serial("id").primaryKey(),
    projectId: integer("project_id")
      .notNull()
      .references(() => cfProjectsTable.id, { onDelete: "cascade" }),
    flowType: text("flow_type").notNull(), // '수입' | '지출'
    bucket: text("bucket").notNull().default("month"), // 'month' | 'pre2023' | 'post2030'
    month: date("month", { mode: "string" }).notNull(), // first day of month
    amount: numeric("amount", { precision: 18, scale: 2 }).notNull(), // 천 USD
  },
  (t) => [
    uniqueIndex("cf_monthly_amounts_uq").on(
      t.projectId,
      t.flowType,
      t.bucket,
      t.month,
    ),
  ],
);

export const insertCfProjectSchema = createInsertSchema(cfProjectsTable).omit({
  id: true,
});
export type InsertCfProject = z.infer<typeof insertCfProjectSchema>;
export type CfProject = typeof cfProjectsTable.$inferSelect;

export const insertCfMonthlyAmountSchema = createInsertSchema(
  cfMonthlyAmountsTable,
).omit({ id: true });
export type InsertCfMonthlyAmount = z.infer<typeof insertCfMonthlyAmountSchema>;
export type CfMonthlyAmount = typeof cfMonthlyAmountsTable.$inferSelect;
