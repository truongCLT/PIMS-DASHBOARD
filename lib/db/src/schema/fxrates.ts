import { pgTable, text, integer, doublePrecision, timestamp, primaryKey, check } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

/**
 * 월별 환율 (1 USD 기준). currency: 'USD' | 'KRW' | 'VND'.
 * purpose: 'actual_forecast'(실적/전망 환산용, 월별 탭에서 저장) | 'plan'(계획 매출 환산용, "계획" 옵션으로 저장).
 * 같은 연/월이라도 계획 환율과 실적/전망 환율은 서로 다를 수 있어 별도 행으로 보관한다
 * (purpose를 PK에 포함해 "계획" 저장이 실적/전망 월별 환율을 덮어쓰지 않도록 함).
 */
export const fxRatesTable = pgTable(
  "fx_rates",
  {
    currency: text("currency").notNull(),
    year: integer("year").notNull(),
    month: integer("month").notNull(), // 1..12
    purpose: text("purpose").notNull().default("actual_forecast"), // 'actual_forecast' | 'plan'
    rate: doublePrecision("rate").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.currency, t.year, t.month, t.purpose] }),
    check("fx_rates_currency_ck", sql`${t.currency} IN ('USD','KRW','VND')`),
    check("fx_rates_rate_ck", sql`${t.rate} > 0`),
    check("fx_rates_month_ck", sql`${t.month} BETWEEN 1 AND 12`),
    check("fx_rates_purpose_ck", sql`${t.purpose} IN ('actual_forecast','plan')`),
  ],
);
