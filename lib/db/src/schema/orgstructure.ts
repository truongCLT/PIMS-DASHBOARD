import { sql } from "drizzle-orm";
import { pgTable, serial, text, integer, check, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// 회사/부문 조직 구조 (사이드바 메뉴 트리, 시공/용역 구분에 사용)

export const companiesTable = pgTable(
  "companies",
  {
    id: serial("id").primaryKey(),
    label: text("label").notNull(), // "DECV", "TCC", "DE HEIM"
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [unique("companies_label_uq").on(t.label)],
);

export const divisionsTable = pgTable(
  "divisions",
  {
    id: serial("id").primaryKey(),
    companyId: integer("company_id")
      .notNull()
      .references(() => companiesTable.id, { onDelete: "cascade" }),
    label: text("label").notNull(), // "시공", "용역", "자체개발", "용지매각"
    businessType: text("business_type").notNull().$type<"시공" | "용역">(),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [
    check("divisions_business_type_ck", sql`${t.businessType} IN ('시공','용역')`),
    unique("divisions_company_label_uq").on(t.companyId, t.label),
  ],
);

export const insertCompanySchema = createInsertSchema(companiesTable).omit({ id: true });
export type InsertCompany = z.infer<typeof insertCompanySchema>;
export type Company = typeof companiesTable.$inferSelect;

export const insertDivisionSchema = createInsertSchema(divisionsTable).omit({ id: true });
export type InsertDivision = z.infer<typeof insertDivisionSchema>;
export type Division = typeof divisionsTable.$inferSelect;
