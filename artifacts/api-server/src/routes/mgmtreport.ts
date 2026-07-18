import { Router, type IRouter, type Request, type Response } from "express";
import multer from "multer";
import { and, asc, desc, eq } from "drizzle-orm";
import {
  db,
  mrProjectsTable,
  mrMonthlyTable,
  mrAnnualTable,
  mrPnlTable,
  mrCommentsTable,
} from "@workspace/db";
import {
  GetMgmtreportSummaryQueryParams,
  GetMgmtreportSummaryResponse,
  ListMgmtreportProjectsQueryParams,
  ListMgmtreportProjectsResponse,
  ListMgmtreportCommentsQueryParams,
  ListMgmtreportCommentsResponse,
  CreateMgmtreportCommentBody,
  CreateMgmtreportCommentResponse,
} from "@workspace/api-zod";
import {
  parseMgmtreportWorkbook,
  buildPreview,
  applyMgmtreportImport,
  MgmtreportParseError,
} from "../lib/mgmtreportImport";

const router: IRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

function parseYearField(raw: unknown): number | null {
  const y = Number(raw);
  if (!Number.isInteger(y) || y < 2000 || y > 2100) return null;
  return y;
}

const uploadSingle = (req: Request, res: Response) =>
  new Promise<Error | undefined>((resolve) => {
    upload.single("file")(req, res, (err?: unknown) => resolve(err as Error | undefined));
  });

async function readUpload(req: Request, res: Response) {
  const err = await uploadSingle(req, res);
  if (err) {
    const isSize = (err as { code?: string }).code === "LIMIT_FILE_SIZE";
    return {
      error: isSize
        ? "파일이 너무 큽니다. 25MB 이하의 Excel 파일만 업로드할 수 있습니다."
        : "파일 업로드에 실패했습니다. 다시 시도해 주세요.",
    } as const;
  }
  const file = (req as unknown as { file?: { buffer: Buffer; originalname: string } }).file;
  if (!file) {
    return { error: "업로드된 파일이 없습니다. Excel(.xlsx) 파일을 선택해 주세요." } as const;
  }
  const year = parseYearField((req.body as Record<string, unknown>)?.year);
  if (year == null) {
    return { error: "연도(year)가 올바르지 않습니다. 예: 2026" } as const;
  }
  return { file, year } as const;
}

router.post("/mgmtreport/import/preview", async (req, res) => {
  const r = await readUpload(req, res);
  if ("error" in r) {
    res.status(400).json({ error: r.error });
    return;
  }
  try {
    const parsed = await parseMgmtreportWorkbook(r.file.buffer, r.year);
    res.json(buildPreview(parsed));
  } catch (err) {
    if (err instanceof MgmtreportParseError) {
      res.status(422).json({ error: err.message });
      return;
    }
    req.log.error({ err }, "failed to preview mgmtreport import");
    res.status(500).json({ error: "Excel 파싱 중 오류가 발생했습니다." });
  }
});

router.post("/mgmtreport/import/apply", async (req, res) => {
  const r = await readUpload(req, res);
  if ("error" in r) {
    res.status(400).json({ error: r.error });
    return;
  }
  try {
    const parsed = await parseMgmtreportWorkbook(r.file.buffer, r.year);
    await applyMgmtreportImport(parsed);
    req.log.info(
      {
        year: r.year,
        projects: parsed.projects.length,
        monthly: parsed.monthly.length,
        annual: parsed.annual.length,
        pnl: parsed.pnl.length,
      },
      "mgmtreport import applied",
    );
    res.json({ ...buildPreview(parsed), applied: true });
  } catch (err) {
    if (err instanceof MgmtreportParseError) {
      res.status(422).json({ error: err.message });
      return;
    }
    req.log.error({ err }, "failed to apply mgmtreport import");
    res.status(500).json({ error: "데이터 반영 중 오류가 발생했습니다. 기존 데이터는 변경되지 않았습니다." });
  }
});

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

router.get("/mgmtreport/comments", async (req, res) => {
  const parsed = ListMgmtreportCommentsQueryParams.safeParse(req.query);
  if (!parsed.success || !Number.isInteger(parsed.data.year) || !Number.isInteger(parsed.data.month)) {
    res.status(400).json({ error: "잘못된 요청 파라미터입니다." });
    return;
  }
  const { year, month, section } = parsed.data;

  try {
    const conditions = [eq(mrCommentsTable.year, year), eq(mrCommentsTable.month, month)];
    if (section != null) conditions.push(eq(mrCommentsTable.section, section));
    const rows = await db
      .select()
      .from(mrCommentsTable)
      .where(and(...conditions))
      .orderBy(desc(mrCommentsTable.createdAt), desc(mrCommentsTable.id));

    res.json(
      ListMgmtreportCommentsResponse.parse({
        comments: rows.map((r) => ({
          id: r.id,
          year: r.year,
          month: r.month,
          section: r.section,
          body: r.body,
          createdAt: r.createdAt.toISOString(),
        })),
      }),
    );
  } catch (err) {
    req.log.error({ err }, "failed to list mgmtreport comments");
    res.status(500).json({ error: "코멘트 조회에 실패했습니다." });
  }
});

router.post("/mgmtreport/comments", async (req, res) => {
  const parsed = CreateMgmtreportCommentBody.safeParse(req.body);
  if (!parsed.success || parsed.data.body.trim().length === 0) {
    res.status(400).json({ error: "코멘트 내용이 올바르지 않습니다." });
    return;
  }
  const { year, month, section, body } = parsed.data;

  try {
    const [row] = await db
      .insert(mrCommentsTable)
      .values({ year, month, section, body: body.trim() })
      .returning();
    res.status(201).json(
      CreateMgmtreportCommentResponse.parse({
        id: row.id,
        year: row.year,
        month: row.month,
        section: row.section,
        body: row.body,
        createdAt: row.createdAt.toISOString(),
      }),
    );
  } catch (err) {
    req.log.error({ err }, "failed to create mgmtreport comment");
    res.status(500).json({ error: "코멘트 저장에 실패했습니다." });
  }
});

export default router;
