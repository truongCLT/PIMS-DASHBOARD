import { Router, type IRouter } from "express";
import { db, fxRatesTable } from "@workspace/db";
import {
  GetFxRatesResponse,
  PutFxRatesBody,
  PutFxRatesResponse,
  GetFxRatesHistoryResponse,
  PutFxRatesHistoryBody,
  PutFxRatesHistoryResponse,
} from "@workspace/api-zod";
import { requireAdmin } from "../middlewares/adminAuth";

const router: IRouter = Router();

/** 저장값이 없을 때 사용하는 기본 환율 (1 USD 기준) */
const DEFAULT_RATES: Record<"USD" | "KRW" | "VND", number> = {
  USD: 1,
  KRW: 1380,
  VND: 25450,
};

function currentYearMonth(): { year: number; month: number } {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

router.get("/fxrates", async (req, res) => {
  try {
    const rows = await db.select().from(fxRatesTable);

    const { year: curYear, month: curMonth } = currentYearMonth();
    const getLatestRate = (curr: "USD" | "KRW" | "VND"): number => {
      const filtered = rows.filter(
        (r) => r.currency === curr && (r.year < curYear || (r.year === curYear && r.month <= curMonth)),
      );
      if (filtered.length === 0) {
        const anyFiltered = rows.filter((r) => r.currency === curr);
        if (anyFiltered.length === 0) return DEFAULT_RATES[curr];
        anyFiltered.sort((a, b) => b.year - a.year || b.month - a.month || b.updatedAt.getTime() - a.updatedAt.getTime());
        return anyFiltered[0].rate;
      }
      filtered.sort((a, b) => b.year - a.year || b.month - a.month || b.updatedAt.getTime() - a.updatedAt.getTime());
      return filtered[0].rate;
    };

    res.json(
      GetFxRatesResponse.parse({
        usd: getLatestRate("USD"),
        krw: getLatestRate("KRW"),
        vnd: getLatestRate("VND"),
      }),
    );
  } catch (err) {
    req.log.error({ err }, "failed to load fx rates");
    res.status(500).json({ error: "환율 조회에 실패했습니다." });
  }
});

router.put("/fxrates", requireAdmin, async (req, res) => {
  const parsed = PutFxRatesBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "환율 값이 올바르지 않습니다. 0보다 큰 숫자를 입력해 주세요." });
    return;
  }
  const { usd, krw, vnd } = parsed.data;
  const { year, month } = currentYearMonth();
  try {
    const entries: Array<{ currency: "USD" | "KRW" | "VND"; rate: number }> = [
      { currency: "USD", rate: Math.round(usd * 100) / 100 },
      { currency: "KRW", rate: Math.round(krw * 100) / 100 },
      { currency: "VND", rate: Math.round(vnd * 100) / 100 },
    ];
    for (const e of entries) {
      await db
        .insert(fxRatesTable)
        .values({ currency: e.currency, year, month, rate: e.rate, updatedAt: new Date() })
        .onConflictDoUpdate({
          target: [fxRatesTable.currency, fxRatesTable.year, fxRatesTable.month],
          set: { rate: e.rate, updatedAt: new Date() },
        });
    }
    res.json(PutFxRatesResponse.parse({
      usd: Math.round(usd * 100) / 100,
      krw: Math.round(krw * 100) / 100,
      vnd: Math.round(vnd * 100) / 100,
    }));
  } catch (err) {
    req.log.error({ err }, "failed to save fx rates");
    res.status(500).json({ error: "환율 저장에 실패했습니다." });
  }
});

router.get("/fxrates/history", async (req, res) => {
  try {
    const rows = await db.select().from(fxRatesTable);
    type FxRateRow = typeof fxRatesTable.$inferSelect;
    const sorted = [...rows].sort((a: FxRateRow, b: FxRateRow) =>
      a.currency !== b.currency
        ? a.currency.localeCompare(b.currency)
        : a.year !== b.year
          ? a.year - b.year
          : a.month - b.month,
    );
    res.json(
      GetFxRatesHistoryResponse.parse(
        sorted.map((r: FxRateRow) => ({ currency: r.currency, year: r.year, month: r.month, rate: r.rate })),
      ),
    );
  } catch (err) {
    req.log.error({ err }, "failed to load fx rate history");
    res.status(500).json({ error: "환율 이력 조회에 실패했습니다." });
  }
});

router.put("/fxrates/history", requireAdmin, async (req, res) => {
  const parsed = PutFxRatesHistoryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "환율 값이 올바르지 않습니다. 통화·연·월·환율을 확인해 주세요." });
    return;
  }
  const { currency, year, month, rate: rawRate } = parsed.data;
  const rate = Math.round(rawRate * 100) / 100;
  try {
    await db
      .insert(fxRatesTable)
      .values({ currency, year, month, rate, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: [fxRatesTable.currency, fxRatesTable.year, fxRatesTable.month],
        set: { rate, updatedAt: new Date() },
      });
    res.json(PutFxRatesHistoryResponse.parse({ currency, year, month, rate }));
  } catch (err) {
    req.log.error({ err }, "failed to save fx rate history entry");
    res.status(500).json({ error: "환율 이력 저장에 실패했습니다." });
  }
});

export default router;
