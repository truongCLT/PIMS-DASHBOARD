import { pgTable, text, integer, doublePrecision, timestamp, primaryKey, check } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

/** 월별 환율 (1 USD 기준). currency: 'USD' | 'KRW' | 'VND'. 월별 이력 보관, (currency,year,month) 복합키 */
export const fxRatesTable = pgTable(
  "fx_rates",
  {
    currency: text("currency").notNull(),
    year: integer("year").notNull(),
    month: integer("month").notNull(), // 1..12
    rate: doublePrecision("rate").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.currency, t.year, t.month] }),
    check("fx_rates_currency_ck", sql`${t.currency} IN ('USD','KRW','VND')`),
    check("fx_rates_rate_ck", sql`${t.rate} > 0`),
    check("fx_rates_month_ck", sql`${t.month} BETWEEN 1 AND 12`),
  ],
);
