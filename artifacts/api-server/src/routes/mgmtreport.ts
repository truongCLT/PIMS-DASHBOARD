import { Router, type IRouter } from "express";
import { asc, eq } from "drizzle-orm";
import { db, mrProjectsTable, mrMonthlyTable, mrAnnualTable, mrPnlTable } from "@workspace/db";
import {
  GetMgmtreportSummaryQueryParams,
  GetMgmtreportSummaryResponse,
  ListMgmtreportProjectsQueryParams,
  ListMgmtreportProjectsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

const round2 = (n: number) => Math.round(n * 100) / 100;

router.get("/mgmtreport/summary", async (req, res) => {
  const parsed = GetMgmtreportSummaryQueryParams.safeParse(req.query);
  if (!parsed.success || !Number.isInteger(parsed.data.year)) {
    res.status(400).json({ error: "잘못된 요청 파라미터입니다." });
    return;
  }
  const { year } = parsed.data;

  try {
    const rows = await db
      .select()
      .from(mrPnlTable)
      .where(eq(mrPnlTable.year, year))
      .orderBy(asc(mrPnlTable.sortOrder));

    if (rows.length === 0) {
      res.status(404).json({ error: "해당 연도의 경영관리보고회 데이터가 없습니다." });
      return;
    }

    type Line = {
      code: string;
      label: string;
      plan: number[];
      actual: number[];
      planTotal: number;
      actualTotal: number;
      planTotalOverride: number | null;
      actualTotalOverride: number | null;
    };
    const lines = new Map<string, Line>();
    for (const r of rows) {
      let l = lines.get(r.lineCode);
      if (!l) {
        l = {
          code: r.lineCode,
          label: r.lineLabel,
          plan: Array(12).fill(0),
          actual: Array(12).fill(0),
          planTotal: 0,
          actualTotal: 0,
          planTotalOverride: null,
          actualTotalOverride: null,
        };
        lines.set(r.lineCode, l);
      }
      const v = Number(r.amountUsd);
      if (r.month == null) {
        if (r.scenario === "plan") l.planTotalOverride = v;
        else l.actualTotalOverride = v;
      } else if (r.scenario === "plan") {
        l.plan[r.month - 1] = round2(v);
      } else {
        l.actual[r.month - 1] = round2(v);
      }
    }

    const out = [...lines.values()].map((l) => ({
      code: l.code,
      label: l.label,
      plan: l.plan,
      actual: l.actual,
      planTotal: round2(l.planTotalOverride ?? l.plan.reduce((a, b) => a + b, 0)),
      actualTotal: round2(l.actualTotalOverride ?? l.actual.reduce((a, b) => a + b, 0)),
    }));

    res.json(GetMgmtreportSummaryResponse.parse({ year, unit: "천 USD", lines: out }));
  } catch (err) {
    req.log.error({ err }, "failed to get mgmtreport summary");
    res.status(500).json({ error: "경영관리보고회 요약 조회에 실패했습니다." });
  }
});

router.get("/mgmtreport/projects", async (req, res) => {
  const parsed = ListMgmtreportProjectsQueryParams.safeParse(req.query);
  if (!parsed.success || !Number.isInteger(parsed.data.year)) {
    res.status(400).json({ error: "잘못된 요청 파라미터입니다." });
    return;
  }
  const { year, includeGroups = false } = parsed.data;

  try {
    const projects = await db
      .select()
      .from(mrProjectsTable)
      .orderBy(asc(mrProjectsTable.sortOrder));
    const monthly = await db
      .select()
      .from(mrMonthlyTable)
      .where(eq(mrMonthlyTable.year, year));
    const annual = await db.select().from(mrAnnualTable);

    if (monthly.length === 0) {
      res.status(404).json({ error: "해당 연도의 경영관리보고회 데이터가 없습니다." });
      return;
    }

    type Proj = {
      name: string;
      siteCode: string | null;
      isGroup: boolean;
      revenuePlan: number[];
      revenueActual: number[];
      cogsPlan: number[];
      cogsActual: number[];
      annual: { year: number; scenario: string; revenue: number; cogs: number }[];
    };
    const byId = new Map<number, Proj>();
    for (const p of projects) {
      if (!includeGroups && p.groupLabel != null) continue;
      byId.set(p.id, {
        name: p.name,
        siteCode: p.siteCode,
        isGroup: p.groupLabel != null,
        revenuePlan: Array(12).fill(0),
        revenueActual: Array(12).fill(0),
        cogsPlan: Array(12).fill(0),
        cogsActual: Array(12).fill(0),
        annual: [],
      });
    }
    for (const m of monthly) {
      const p = byId.get(m.projectId);
      if (!p) continue;
      const v = round2(Number(m.amountUsd));
      const arr =
        m.metric === "revenue"
          ? m.scenario === "plan"
            ? p.revenuePlan
            : p.revenueActual
          : m.scenario === "plan"
            ? p.cogsPlan
            : p.cogsActual;
      arr[m.month - 1] = v;
    }
    const annKey = new Map<string, { year: number; scenario: string; revenue: number; cogs: number }>();
    for (const a of annual) {
      const p = byId.get(a.projectId);
      if (!p) continue;
      const key = `${a.projectId}:${a.year}:${a.scenario}`;
      let rec = annKey.get(key);
      if (!rec) {
        rec = { year: a.year, scenario: a.scenario, revenue: 0, cogs: 0 };
        annKey.set(key, rec);
        p.annual.push(rec);
      }
      if (a.metric === "revenue") rec.revenue = round2(Number(a.amountUsd));
      else rec.cogs = round2(Number(a.amountUsd));
    }
    for (const p of byId.values()) {
      p.annual.sort((x, y) => x.year - y.year || x.scenario.localeCompare(y.scenario));
    }

    res.json(
      ListMgmtreportProjectsResponse.parse({
        year,
        unit: "천 USD",
        projects: [...byId.values()],
      }),
    );
  } catch (err) {
    req.log.error({ err }, "failed to list mgmtreport projects");
    res.status(500).json({ error: "프로젝트별 경영관리보고회 조회에 실패했습니다." });
  }
});

export default router;
