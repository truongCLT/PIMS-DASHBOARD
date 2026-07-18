import { Router, type IRouter } from "express";
import { and, asc, eq } from "drizzle-orm";
import { db, scSitesTable, scMonthlyTable } from "@workspace/db";
import {
  GetSalescostSummaryQueryParams,
  GetSalescostSummaryResponse,
  ListSalescostSitesQueryParams,
  ListSalescostSitesResponse,
} from "@workspace/api-zod";
import {
  parseSalescostWorkbook,
  buildSalescostPreview,
  applySalescostImport,
  SalescostParseError,
} from "../lib/salescostImport";
import { readExcelUpload } from "../lib/excelUpload";
import { requireAdmin } from "../middlewares/adminAuth";

const router: IRouter = Router();

router.post("/salescost/import/preview", requireAdmin, async (req, res) => {
  const r = await readExcelUpload(req, res, { requireYear: true });
  if ("error" in r) {
    res.status(400).json({ error: r.error });
    return;
  }
  try {
    const parsed = await parseSalescostWorkbook(r.file.buffer, r.year!);
    res.json(buildSalescostPreview(parsed));
  } catch (err) {
    if (err instanceof SalescostParseError) {
      res.status(422).json({ error: err.message });
      return;
    }
    req.log.error({ err }, "failed to preview salescost import");
    res.status(500).json({ error: "Excel 파싱 중 오류가 발생했습니다." });
  }
});

router.post("/salescost/import/apply", requireAdmin, async (req, res) => {
  const r = await readExcelUpload(req, res, { requireYear: true });
  if ("error" in r) {
    res.status(400).json({ error: r.error });
    return;
  }
  try {
    const parsed = await parseSalescostWorkbook(r.file.buffer, r.year!);
    await applySalescostImport(parsed);
    req.log.info(
      { year: r.year, sites: parsed.sites.length, amounts: parsed.amounts.length },
      "salescost import applied",
    );
    res.json({ ...buildSalescostPreview(parsed), applied: true });
  } catch (err) {
    if (err instanceof SalescostParseError) {
      res.status(422).json({ error: err.message });
      return;
    }
    req.log.error({ err }, "failed to apply salescost import");
    res.status(500).json({ error: "데이터 반영 중 오류가 발생했습니다. 기존 데이터는 변경되지 않았습니다." });
  }
});

const round2 = (n: number) => Math.round(n * 100) / 100;

router.get("/salescost/summary", async (req, res) => {
  const parsed = GetSalescostSummaryQueryParams.safeParse(req.query);
  if (!parsed.success || !Number.isInteger(parsed.data.year)) {
    res.status(400).json({ error: "잘못된 요청 파라미터입니다." });
    return;
  }
  const { year } = parsed.data;

  try {
    const rows = await db
      .select({
        month: scMonthlyTable.month,
        metric: scMonthlyTable.metric,
        amountUsd: scMonthlyTable.amountUsd,
      })
      .from(scMonthlyTable)
      .where(eq(scMonthlyTable.year, year));

    if (rows.length === 0) {
      res.status(404).json({ error: "해당 연도의 매출/원가 데이터가 없습니다." });
      return;
    }

    const acc = new Map<number, { revenue: number; cogs: number; sga: number }>();
    for (let m = 1; m <= 12; m++) acc.set(m, { revenue: 0, cogs: 0, sga: 0 });
    for (const r of rows) {
      const a = acc.get(r.month);
      if (!a || r.amountUsd == null) continue;
      const v = Number(r.amountUsd);
      if (r.metric === "revenue") a.revenue += v;
      else if (r.metric === "cogs") a.cogs += v;
      else if (r.metric === "sga") a.sga += v;
    }

    const points = [...acc.entries()].map(([month, a]) => {
      const revenue = round2(a.revenue);
      const cogs = round2(a.cogs);
      const sga = round2(a.sga);
      const grossProfit = round2(revenue - cogs);
      return {
        month,
        revenue,
        cogs,
        grossProfit,
        sga,
        operatingProfit: round2(grossProfit - sga),
      };
    });

    res.json(GetSalescostSummaryResponse.parse({ year, unit: "천 USD", points }));
  } catch (err) {
    req.log.error({ err }, "failed to get salescost summary");
    res.status(500).json({ error: "매출/원가 요약 조회에 실패했습니다." });
  }
});

router.get("/salescost/sites", async (req, res) => {
  const parsed = ListSalescostSitesQueryParams.safeParse(req.query);
  if (!parsed.success || !Number.isInteger(parsed.data.year)) {
    res.status(400).json({ error: "잘못된 요청 파라미터입니다." });
    return;
  }
  const { year, metric = "revenue" } = parsed.data;

  try {
    const rows = await db
      .select({
        code: scSitesTable.code,
        name: scSitesTable.name,
        category: scSitesTable.category,
        bizType: scSitesTable.bizType,
        month: scMonthlyTable.month,
        metric: scMonthlyTable.metric,
        amountUsd: scMonthlyTable.amountUsd,
      })
      .from(scSitesTable)
      .innerJoin(scMonthlyTable, eq(scMonthlyTable.siteId, scSitesTable.id))
      .where(and(eq(scMonthlyTable.year, year), eq(scMonthlyTable.metric, metric)))
      .orderBy(asc(scSitesTable.sortOrder), asc(scMonthlyTable.month));

    const siteMap = new Map<
      string,
      { code: string; name: string; category: string | null; bizType: string | null; months: number[] }
    >();
    let any = false;
    for (const r of rows) {
      let s = siteMap.get(r.code);
      if (!s) {
        s = {
          code: r.code,
          name: r.name,
          category: r.category,
          bizType: r.bizType,
          months: Array(12).fill(0),
        };
        siteMap.set(r.code, s);
      }
      if (r.amountUsd == null || r.month < 1 || r.month > 12) continue;
      s.months[r.month - 1] = round2(Number(r.amountUsd));
      any = true;
    }

    if (!any) {
      res.status(404).json({ error: "해당 조건의 매출/원가 데이터가 없습니다." });
      return;
    }

    const sites = [...siteMap.values()].map((s) => ({
      code: s.code,
      name: s.name,
      category: s.category,
      bizType: s.bizType,
      months: s.months,
      total: round2(s.months.reduce((a, b) => a + b, 0)),
    }));

    res.json(ListSalescostSitesResponse.parse({ year, metric, unit: "천 USD", sites }));
  } catch (err) {
    req.log.error({ err }, "failed to list salescost sites");
    res.status(500).json({ error: "사이트별 매출/원가 조회에 실패했습니다." });
  }
});

export default router;
