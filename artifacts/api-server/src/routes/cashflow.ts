import { Router, type IRouter } from "express";
import { and, asc, eq, inArray } from "drizzle-orm";
import { db, cfProjectsTable, cfMonthlyAmountsTable } from "@workspace/db";
import {
  ListCashflowProjectsResponseItem,
  GetCashflowMonthlyResponse,
  GetCashflowMonthlyQueryParams,
  GetCashflowAggregateQueryParams,
  GetCashflowAggregateResponse,
} from "@workspace/api-zod";
import {
  parseCashflowWorkbook,
  buildCashflowPreview,
  applyCashflowImport,
  CashflowParseError,
} from "../lib/cashflowImport";
import { readExcelUpload } from "../lib/excelUpload";
import { requireAdmin } from "../middlewares/adminAuth";

const router: IRouter = Router();

router.post("/cashflow/import/preview", requireAdmin, async (req, res) => {
  const r = await readExcelUpload(req, res);
  if ("error" in r) {
    res.status(400).json({ error: r.error });
    return;
  }
  try {
    const parsed = await parseCashflowWorkbook(r.file.buffer);
    res.json(buildCashflowPreview(parsed));
  } catch (err) {
    if (err instanceof CashflowParseError) {
      res.status(422).json({ error: err.message });
      return;
    }
    req.log.error({ err }, "failed to preview cashflow import");
    res.status(500).json({ error: "Excel 파싱 중 오류가 발생했습니다." });
  }
});

router.post("/cashflow/import/apply", requireAdmin, async (req, res) => {
  const r = await readExcelUpload(req, res);
  if ("error" in r) {
    res.status(400).json({ error: r.error });
    return;
  }
  try {
    const parsed = await parseCashflowWorkbook(r.file.buffer);
    await applyCashflowImport(parsed);
    req.log.info(
      { projects: parsed.projects.length },
      "cashflow import applied",
    );
    res.json({ ...buildCashflowPreview(parsed), applied: true });
  } catch (err) {
    if (err instanceof CashflowParseError) {
      res.status(422).json({ error: err.message });
      return;
    }
    req.log.error({ err }, "failed to apply cashflow import");
    res.status(500).json({ error: "데이터 반영 중 오류가 발생했습니다. 기존 데이터는 변경되지 않았습니다." });
  }
});

router.get("/cashflow/projects", async (req, res) => {
  try {
    const rows = await db
      .select({
        id: cfProjectsTable.id,
        name: cfProjectsTable.name,
        division: cfProjectsTable.division,
      })
      .from(cfProjectsTable)
      .orderBy(asc(cfProjectsTable.sortOrder));
    res.json(rows.map((r) => ListCashflowProjectsResponseItem.parse(r)));
  } catch (err) {
    req.log.error({ err }, "failed to list cashflow projects");
    res.status(500).json({ error: "자금수지 프로젝트 목록 조회에 실패했습니다." });
  }
});

router.get("/cashflow/monthly", async (req, res) => {
  const parsed = GetCashflowMonthlyQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "잘못된 요청 파라미터입니다." });
    return;
  }
  const { projectName, division, fromYear, fromMonth, months = 6 } = parsed.data;
  if (![fromYear, fromMonth, months].every(Number.isInteger)) {
    res.status(400).json({ error: "잘못된 요청 파라미터입니다." });
    return;
  }

  try {
    const [project] = await db
      .select()
      .from(cfProjectsTable)
      .where(
        division
          ? and(eq(cfProjectsTable.name, projectName), eq(cfProjectsTable.division, division))
          : eq(cfProjectsTable.name, projectName),
      )
      .orderBy(asc(cfProjectsTable.sortOrder))
      .limit(1);
    if (!project) {
      const requested: string[] = [];
      let y = fromYear;
      let m = fromMonth;
      for (let i = 0; i < months; i++) {
        requested.push(`${y}-${String(m).padStart(2, "0")}`);
        m++;
        if (m > 12) { m = 1; y++; }
      }
      const points = requested.map((key) => ({ month: key, cashIn: 0, cashOut: 0, equivalent: 0 }));
      res.json(GetCashflowMonthlyResponse.parse({ projectName, unit: "천 USD", points }));
      return;
    }

    const amounts = await db
      .select({
        flowType: cfMonthlyAmountsTable.flowType,
        month: cfMonthlyAmountsTable.month,
        amount: cfMonthlyAmountsTable.amount,
      })
      .from(cfMonthlyAmountsTable)
      .where(eq(cfMonthlyAmountsTable.projectId, project.id))
      .orderBy(asc(cfMonthlyAmountsTable.month));

    // aggregate per month key (YYYY-MM); pre2023/post2030 buckets participate
    // in the cumulative balance via their placeholder months
    const byMonth = new Map<string, { cashIn: number; cashOut: number }>();
    for (const a of amounts) {
      const key = a.month.slice(0, 7);
      const rec = byMonth.get(key) ?? { cashIn: 0, cashOut: 0 };
      const n = Number(a.amount);
      if (a.flowType === "수입") rec.cashIn += n;
      else if (a.flowType === "지출") rec.cashOut += n;
      byMonth.set(key, rec);
    }

    const requested: string[] = [];
    {
      let y = fromYear;
      let m = fromMonth;
      for (let i = 0; i < months; i++) {
        requested.push(`${y}-${String(m).padStart(2, "0")}`);
        m++;
        if (m > 12) {
          m = 1;
          y++;
        }
      }
    }

    const sortedKeys = [...byMonth.keys()].sort();
    const points = requested.map((key) => {
      const rec = byMonth.get(key) ?? { cashIn: 0, cashOut: 0 };
      // cumulative balance across all history up to and including this month
      let cumulative = 0;
      for (const k of sortedKeys) {
        if (k > key) break;
        const r = byMonth.get(k)!;
        cumulative += r.cashIn - r.cashOut;
      }
      return {
        month: key,
        cashIn: Math.round(rec.cashIn * 100) / 100,
        cashOut: Math.round(rec.cashOut * 100) / 100,
        equivalent: Math.round(cumulative * 100) / 100,
      };
    });

    const data = GetCashflowMonthlyResponse.parse({
      projectName: project.name,
      unit: "천 USD",
      points,
    });
    res.json(data);
  } catch (err) {
    req.log.error({ err }, "failed to get cashflow monthly series");
    res.status(500).json({ error: "자금수지 데이터 조회에 실패했습니다." });
  }
});

router.get("/cashflow/aggregate", async (req, res) => {
  const parsed = GetCashflowAggregateQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "잘못된 요청 파라미터입니다." });
    return;
  }
  const { division, divisions, names, fromYear, fromMonth, months = 6 } = parsed.data;
  if (![fromYear, fromMonth, months].every(Number.isInteger)) {
    res.status(400).json({ error: "잘못된 요청 파라미터입니다." });
    return;
  }
  if (division && divisions) {
    res.status(400).json({ error: "division과 divisions는 동시에 사용할 수 없습니다." });
    return;
  }
  const nameList = names
    ? names.split(",").map((n) => n.trim()).filter((n) => n.length > 0)
    : null;
  if (nameList != null && nameList.length === 0) {
    res.status(400).json({ error: "잘못된 요청 파라미터입니다." });
    return;
  }
  const divisionList = divisions
    ? divisions.split(",").map((d) => d.trim()).filter((d) => d.length > 0)
    : division
      ? [division]
      : null;
  if (divisionList != null && divisionList.length === 0) {
    res.status(400).json({ error: "잘못된 요청 파라미터입니다." });
    return;
  }

  try {
    const conditions = [
      divisionList ? inArray(cfProjectsTable.division, divisionList) : undefined,
      nameList ? inArray(cfProjectsTable.name, nameList) : undefined,
    ].filter((c) => c != null);
    const amounts = await db
      .select({
        flowType: cfMonthlyAmountsTable.flowType,
        month: cfMonthlyAmountsTable.month,
        amount: cfMonthlyAmountsTable.amount,
      })
      .from(cfMonthlyAmountsTable)
      .innerJoin(cfProjectsTable, eq(cfMonthlyAmountsTable.projectId, cfProjectsTable.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(asc(cfMonthlyAmountsTable.month));

    if (amounts.length === 0) {
      const requested: string[] = [];
      let y = fromYear;
      let m = fromMonth;
      for (let i = 0; i < months; i++) {
        requested.push(`${y}-${String(m).padStart(2, "0")}`);
        m++;
        if (m > 12) { m = 1; y++; }
      }
      const points = requested.map((key) => ({ month: key, cashIn: 0, cashOut: 0, equivalent: 0 }));
      const scope = divisionList ? divisionList.join("+") : (nameList ? nameList.join("+") : "전체");
      res.json(GetCashflowAggregateResponse.parse({ scope, unit: "천 USD", points }));
      return;
    }

    const byMonth = new Map<string, { cashIn: number; cashOut: number }>();
    for (const a of amounts) {
      const key = a.month.slice(0, 7);
      const rec = byMonth.get(key) ?? { cashIn: 0, cashOut: 0 };
      const n = Number(a.amount);
      if (a.flowType === "수입") rec.cashIn += n;
      else if (a.flowType === "지출") rec.cashOut += n;
      byMonth.set(key, rec);
    }

    const requested: string[] = [];
    {
      let y = fromYear;
      let m = fromMonth;
      for (let i = 0; i < months; i++) {
        requested.push(`${y}-${String(m).padStart(2, "0")}`);
        m++;
        if (m > 12) {
          m = 1;
          y++;
        }
      }
    }

    const sortedKeys = [...byMonth.keys()].sort();
    const points = requested.map((key) => {
      const rec = byMonth.get(key) ?? { cashIn: 0, cashOut: 0 };
      let cumulative = 0;
      for (const k of sortedKeys) {
        if (k > key) break;
        const r = byMonth.get(k)!;
        cumulative += r.cashIn - r.cashOut;
      }
      return {
        month: key,
        cashIn: Math.round(rec.cashIn * 100) / 100,
        cashOut: Math.round(rec.cashOut * 100) / 100,
        equivalent: Math.round(cumulative * 100) / 100,
      };
    });

    const data = GetCashflowAggregateResponse.parse({
      scope: divisionList ? divisionList.join("+") : "전체",
      unit: "천 USD",
      points,
    });
    res.json(data);
  } catch (err) {
    req.log.error({ err }, "failed to get cashflow aggregate series");
    res.status(500).json({ error: "자금수지 집계 조회에 실패했습니다." });
  }
});

export default router;
