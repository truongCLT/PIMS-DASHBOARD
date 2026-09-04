import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, pdOverviewTable } from "@workspace/db";
import { fetchPimsvinaApi } from "../lib/pimsvinaClient";
import { GetPimsvinaSiterateResponse, GetPimsvinaExchangerateResponse } from "@workspace/api-zod";

const router: IRouter = Router();

// Type 1: per-site contract exchange rate (CBTB_CTRTSUMM.RATEUSD/RATEKRW), used by the
// Overview/Progress/Revenue/Costing/Outsourcing tabs.
router.get("/pimsvina/siterate", async (req, res) => {
  const siteCode = typeof req.query.siteCode === "string" ? req.query.siteCode.trim() : "";
  if (!siteCode) {
    res.status(400).json({ error: "siteCode is required" });
    return;
  }
  try {
    // CBTB_CTRTSUMM (the source table behind this jsp) is keyed by the raw PIMSVINA FLDCODE
    // (e.g. "VH11TA3"), not by our pseudo site_code (e.g. "SITE29") — those only coincide for
    // sites where FLDCODE happens to already be in "SITE##" form. Resolve the real FLDCODE first.
    const [overview] = await db
      .select({ fldCode: pdOverviewTable.fldCode })
      .from(pdOverviewTable)
      .where(eq(pdOverviewTable.siteCode, siteCode));
    const fldCode = overview?.fldCode || siteCode;
    const rows = await fetchPimsvinaApi("dashboard_common_siterate_1q.jsp", { site_code: fldCode });
    const row = rows[0];
    res.json(
      GetPimsvinaSiterateResponse.parse({
        siteCode,
        rateUsd: row?.rate_usd != null ? Number(row.rate_usd) : null,
        rateKrw: row?.rate_krw != null ? Number(row.rate_krw) : null,
      }),
    );
  } catch (err) {
    req.log.error({ err }, "failed to load PIMSVINA site rate");
    res.status(500).json({ error: "현장 계약 환율 조회에 실패했습니다." });
  }
});

// Type 2: latest official monthly exchange rate (CHTB_EXCHANGE_RATIO), used by the general
// Dashboard and the Cashflow tab.
router.get("/pimsvina/exchangerate", async (req, res) => {
  try {
    const rows = await fetchPimsvinaApi("dashboard_common_exchangerate_1q.jsp", {}).catch(() => []);
    const usdRow = Array.isArray(rows) ? rows.find((r) => r.basemoney === "VND" && r.chgmoney === "USD") : null;
    const krwRow = Array.isArray(rows) ? rows.find((r) => r.basemoney === "KRW" && r.chgmoney === "KRW") : null;

    const result: Array<{ currency: "USD" | "KRW"; yymm: string; rate: number }> = [];
    if (usdRow?.rate != null) result.push({ currency: "USD", yymm: String(usdRow.yymm), rate: Number(usdRow.rate) });
    if (krwRow?.rate != null) result.push({ currency: "KRW", yymm: String(krwRow.yymm), rate: Number(krwRow.rate) });

    res.json(GetPimsvinaExchangerateResponse.parse(result));
  } catch (err) {
    res.json([]);
  }
});

export default router;
