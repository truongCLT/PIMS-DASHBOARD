import { Router, type IRouter } from "express";
import { db, fxRatesTable } from "@workspace/db";
import { GetFxRatesResponse, PutFxRatesBody, PutFxRatesResponse } from "@workspace/api-zod";
import { requireAdmin } from "../middlewares/adminAuth";

const router: IRouter = Router();

/** 저장값이 없을 때 사용하는 기본 환율 (1 USD 기준) */
const DEFAULT_RATES: Record<"USD" | "KRW" | "VND", number> = {
  USD: 1,
  KRW: 1380,
  VND: 25450,
};

router.get("/fxrates", async (req, res) => {
  try {
    const rows = await db.select().from(fxRatesTable);
    const map = new Map(rows.map((r) => [r.currency, r.rate]));
    res.json(
      GetFxRatesResponse.parse({
        usd: map.get("USD") ?? DEFAULT_RATES.USD,
        krw: map.get("KRW") ?? DEFAULT_RATES.KRW,
        vnd: map.get("VND") ?? DEFAULT_RATES.VND,
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
  try {
    const entries: Array<{ currency: string; rate: number }> = [
      { currency: "USD", rate: usd },
      { currency: "KRW", rate: krw },
      { currency: "VND", rate: vnd },
    ];
    for (const e of entries) {
      await db
        .insert(fxRatesTable)
        .values({ currency: e.currency, rate: e.rate, updatedAt: new Date() })
        .onConflictDoUpdate({
          target: fxRatesTable.currency,
          set: { rate: e.rate, updatedAt: new Date() },
        });
    }
    res.json(PutFxRatesResponse.parse({ usd, krw, vnd }));
  } catch (err) {
    req.log.error({ err }, "failed to save fx rates");
    res.status(500).json({ error: "환율 저장에 실패했습니다." });
  }
});

export default router;
