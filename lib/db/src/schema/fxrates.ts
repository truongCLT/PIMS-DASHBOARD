import { pgTable, text, doublePrecision, timestamp, check } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

/** 수동 입력 환율 (1 USD 기준). currency: 'USD' | 'KRW' | 'VND' */
export const fxRatesTable = pgTable(
  "fx_rates",
  {
    currency: text("currency").primaryKey(),
    rate: doublePrecision("rate").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check("fx_rates_currency_ck", sql`${t.currency} IN ('USD','KRW','VND')`),
    check("fx_rates_rate_ck", sql`${t.rate} > 0`),
  ],
);
