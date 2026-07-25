import { Router, type IRouter } from "express";
import { and, asc, desc, eq } from "drizzle-orm";
import {
  db,
  pdCommentsTable,
  pdOverviewTable,
  pdProgressMonthlyTable,
  pdMilestonesTable,
  pdCostEstimationTable,
  pdCostBudgetTable,
  pdOutsourcingTable,
  pdCashflowMonthlyTable,
  pdPhotosTable,
} from "@workspace/db";
import {
  GetProjectdetailQueryParams,
  GetProjectdetailResponse,
  PutProjectdetailBody,
  PutProjectdetailResponse,
  ListProjectdetailCommentsQueryParams,
  ListProjectdetailCommentsResponse,
  CreateProjectdetailCommentBody,
  CreateProjectdetailCommentResponse,
  UpdateProjectdetailCommentBody,
  UpdateProjectdetailCommentResponse,
} from "@workspace/api-zod";
import { requireAdmin } from "../middlewares/adminAuth";

const router: IRouter = Router();

const num = (v: string | null) => (v == null ? null : Number(v));
const str = (v: number | null | undefined) => (v == null ? null : String(v));

async function loadDetail(projectName: string) {
  const [overviewRows, progress, milestones, costEstimation, costBudget, outsourcing, cashflow, photos] = await Promise.all([
    db
      .select()
      .from(pdOverviewTable)
      .where(eq(pdOverviewTable.projectName, projectName))
      .limit(1),
    db
      .select()
      .from(pdProgressMonthlyTable)
      .where(eq(pdProgressMonthlyTable.projectName, projectName))
      .orderBy(asc(pdProgressMonthlyTable.year), asc(pdProgressMonthlyTable.month)),
    db
      .select()
      .from(pdMilestonesTable)
      .where(eq(pdMilestonesTable.projectName, projectName))
      .orderBy(asc(pdMilestonesTable.sortOrder), asc(pdMilestonesTable.id)),
    db
      .select()
      .from(pdCostEstimationTable)
      .where(eq(pdCostEstimationTable.projectName, projectName)),
    db
      .select()
      .from(pdCostBudgetTable)
      .where(eq(pdCostBudgetTable.projectName, projectName))
      .orderBy(asc(pdCostBudgetTable.sortOrder), asc(pdCostBudgetTable.id)),
    db
      .select()
      .from(pdOutsourcingTable)
      .where(eq(pdOutsourcingTable.projectName, projectName))
      .orderBy(asc(pdOutsourcingTable.sortOrder), asc(pdOutsourcingTable.id)),
    db
      .select()
      .from(pdCashflowMonthlyTable)
      .where(eq(pdCashflowMonthlyTable.projectName, projectName))
      .orderBy(asc(pdCashflowMonthlyTable.year), asc(pdCashflowMonthlyTable.month)),
    db
      .select()
      .from(pdPhotosTable)
      .where(eq(pdPhotosTable.projectName, projectName))
      .orderBy(asc(pdPhotosTable.sortOrder), asc(pdPhotosTable.id)),
  ]);

  const ov = overviewRows[0];
  return {
    projectName,
    unit: "천 USD",
    overview: {
      contractAmount: ov ? num(ov.contractAmount) : null,
      startDate: ov?.startDate ?? null,
      endDate: ov?.endDate ?? null,
      client: ov?.client ?? null,
      scale: ov?.scale ?? null,
    },
    progress: progress.map((p) => ({
      year: p.year,
      month: p.month,
      planPct: num(p.planPct),
      actualPct: num(p.actualPct),
      planCumPct: num(p.planCumPct),
      actualCumPct: num(p.actualCumPct),
    })),
    milestones: milestones.map((m) => ({
      label: m.label,
      planStart: m.planStart,
      planEnd: m.planEnd,
      actualStart: m.actualStart,
      actualEnd: m.actualEnd,
    })),
    costEstimation: costEstimation.map((c) => ({
      kind: c.kind as "bidding" | "execution" | "completion",
      contractAmount: num(c.contractAmount),
      costAmount: num(c.costAmount),
      year: c.year,
      month: c.month,
    })),
    costBudget: costBudget.map((c) => ({
      category: c.category,
      item: c.item,
      budget: num(c.budget),
      plan: num(c.plan),
      actual: num(c.actual),
    })),
    outsourcing: outsourcing.map((o) => ({
      tradeGroup: o.tradeGroup,
      trade: o.trade,
      vendor: o.vendor,
      category: o.category,
      contractDate: o.contractDate,
      changeNo: o.changeNo,
      budget: num(o.budget),
      executedBudget: num(o.executedBudget),
      resolved: num(o.resolved),
      thisMonth: num(o.thisMonth),
      accum: num(o.accum),
    })),
    cashflow: cashflow.map((c) => ({
      year: c.year,
      month: c.month,
      cashIn: num(c.cashIn),
      cashOut: num(c.cashOut),
      equivalent: num(c.equivalent),
    })),
    photos: photos.map((p) => ({ objectPath: p.objectPath })),
  };
}

router.get("/projectdetail", async (req, res) => {
  const parsed = GetProjectdetailQueryParams.safeParse(req.query);
  if (!parsed.success || !parsed.data.projectName.trim()) {
    res.status(400).json({ error: "잘못된 요청 파라미터입니다." });
    return;
  }
  try {
    const detail = await loadDetail(parsed.data.projectName);
    res.json(GetProjectdetailResponse.parse(detail));
  } catch (err) {
    req.log.error({ err }, "failed to get project detail");
    res.status(500).json({ error: "프로젝트 상세 데이터 조회에 실패했습니다." });
  }
});

function validateProgress(progress: { year: number; month: number }[]): string[] {
  const errors: string[] = [];
  const seen = new Map<string, number>();
  progress.forEach((p, i) => {
    const rowNo = i + 1;
    if (!Number.isInteger(p.year) || p.year < 2000 || p.year > 2100) {
      errors.push(`공정률 ${rowNo}번째 행: 연도(${p.year})는 2000~2100 사이여야 합니다.`);
    }
    if (!Number.isInteger(p.month) || p.month < 1 || p.month > 12) {
      errors.push(`공정률 ${rowNo}번째 행: 월(${p.month})은 1~12 사이여야 합니다.`);
    } else {
      const key = `${p.year}-${p.month}`;
      const prev = seen.get(key);
      if (prev != null) {
        errors.push(`공정률 ${rowNo}번째 행: ${p.year}년 ${p.month}월이 ${prev}번째 행과 중복됩니다.`);
      } else {
        seen.set(key, rowNo);
      }
    }
  });
  return errors;
}

router.put("/projectdetail", requireAdmin, async (req, res) => {
  const parsed = PutProjectdetailBody.safeParse(req.body);
  if (!parsed.success || !parsed.data.projectName.trim()) {
    const detail = parsed.success
      ? null
      : parsed.error.issues
          .slice(0, 5)
          .map((iss) => `${iss.path.join(".")}: ${iss.message}`)
          .join(" / ");
    res.status(400).json({
      error: detail
        ? `입력값이 올바르지 않습니다. (${detail})`
        : "잘못된 요청 본문입니다.",
    });
    return;
  }
  const body = parsed.data;

  const progressErrors = validateProgress(body.progress);
  if (progressErrors.length > 0) {
    res.status(400).json({ error: progressErrors.join(" ") });
    return;
  }
  const projectName = body.projectName;

  if (body.photos.some((p) => !/^\/objects\/[\w\-./]+$/.test(p.objectPath))) {
    res.status(400).json({ error: "잘못된 사진 경로입니다." });
    return;
  }

  try {
    await db.transaction(async (tx) => {
      await tx.delete(pdOverviewTable).where(eq(pdOverviewTable.projectName, projectName));
      await tx.delete(pdProgressMonthlyTable).where(eq(pdProgressMonthlyTable.projectName, projectName));
      await tx.delete(pdMilestonesTable).where(eq(pdMilestonesTable.projectName, projectName));
      await tx.delete(pdCostEstimationTable).where(eq(pdCostEstimationTable.projectName, projectName));
      await tx.delete(pdCostBudgetTable).where(eq(pdCostBudgetTable.projectName, projectName));
      await tx.delete(pdOutsourcingTable).where(eq(pdOutsourcingTable.projectName, projectName));
      await tx.delete(pdCashflowMonthlyTable).where(eq(pdCashflowMonthlyTable.projectName, projectName));
      await tx.delete(pdPhotosTable).where(eq(pdPhotosTable.projectName, projectName));

      const ov = body.overview;
      const client = ov.client?.trim() ? ov.client.trim() : null;
      const scale = ov.scale?.trim() ? ov.scale.trim() : null;
      if (
        ov.contractAmount != null ||
        ov.startDate != null ||
        ov.endDate != null ||
        client != null ||
        scale != null
      ) {
        await tx.insert(pdOverviewTable).values({
          projectName,
          contractAmount: str(ov.contractAmount),
          startDate: ov.startDate ?? null,
          endDate: ov.endDate ?? null,
          client,
          scale,
        });
      }
      if (body.progress.length > 0) {
        await tx.insert(pdProgressMonthlyTable).values(
          body.progress.map((p) => ({
            projectName,
            year: p.year,
            month: p.month,
            planPct: str(p.planPct),
            actualPct: str(p.actualPct),
            planCumPct: str(p.planCumPct),
            actualCumPct: str(p.actualCumPct),
          })),
        );
      }
      if (body.milestones.length > 0) {
        await tx.insert(pdMilestonesTable).values(
          body.milestones.map((m, i) => ({
            projectName,
            label: m.label,
            planStart: m.planStart ?? null,
            planEnd: m.planEnd ?? null,
            actualStart: m.actualStart ?? null,
            actualEnd: m.actualEnd ?? null,
            sortOrder: i,
          })),
        );
      }
      if (body.costEstimation.length > 0) {
        await tx.insert(pdCostEstimationTable).values(
          body.costEstimation.map((c) => ({
            projectName,
            kind: c.kind,
            contractAmount: str(c.contractAmount),
            costAmount: str(c.costAmount),
            year: c.year ?? null,
            month: c.month ?? null,
          })),
        );
      }
      if (body.costBudget.length > 0) {
        await tx.insert(pdCostBudgetTable).values(
          body.costBudget.map((c, i) => ({
            projectName,
            category: c.category ?? null,
            item: c.item,
            budget: str(c.budget),
            plan: str(c.plan),
            actual: str(c.actual),
            sortOrder: i,
          })),
        );
      }
      if (body.outsourcing.length > 0) {
        await tx.insert(pdOutsourcingTable).values(
          body.outsourcing.map((o, i) => ({
            projectName,
            tradeGroup: o.tradeGroup ?? null,
            trade: o.trade,
            vendor: o.vendor ?? null,
            category: o.category ?? null,
            contractDate: o.contractDate ?? null,
            changeNo: o.changeNo ?? null,
            budget: str(o.budget),
            executedBudget: str(o.executedBudget),
            resolved: str(o.resolved),
            thisMonth: str(o.thisMonth),
            accum: str(o.accum),
            sortOrder: i,
          })),
        );
      }
      if (body.cashflow.length > 0) {
        await tx.insert(pdCashflowMonthlyTable).values(
          body.cashflow.map((c) => ({
            projectName,
            year: c.year,
            month: c.month,
            cashIn: str(c.cashIn),
            cashOut: str(c.cashOut),
            equivalent: str(c.equivalent),
          })),
        );
      }
      if (body.photos.length > 0) {
        await tx.insert(pdPhotosTable).values(
          body.photos.map((p, i) => ({
            projectName,
            objectPath: p.objectPath,
            sortOrder: i,
          })),
        );
      }
    });

    const detail = await loadDetail(projectName);
    res.json(PutProjectdetailResponse.parse(detail));
  } catch (err) {
    req.log.error({ err }, "failed to save project detail");
    res.status(500).json({ error: "프로젝트 상세 데이터 저장에 실패했습니다." });
  }
});

router.get("/projectdetail/comments", async (req, res) => {
  const parsed = ListProjectdetailCommentsQueryParams.safeParse(req.query);
  if (!parsed.success || !parsed.data.projectName.trim()) {
    res.status(400).json({ error: "잘못된 요청 파라미터입니다." });
    return;
  }
  const { projectName, tab } = parsed.data;
  try {
    const rows = await db
      .select()
      .from(pdCommentsTable)
      .where(and(eq(pdCommentsTable.projectName, projectName), eq(pdCommentsTable.tab, tab)))
      .orderBy(desc(pdCommentsTable.createdAt), desc(pdCommentsTable.id));
    res.json(
      ListProjectdetailCommentsResponse.parse({
        comments: rows.map((r) => ({
          id: r.id,
          projectName: r.projectName,
          tab: r.tab,
          body: r.body,
          createdAt: r.createdAt.toISOString(),
        })),
      }),
    );
  } catch (err) {
    req.log.error({ err }, "failed to list projectdetail comments");
    res.status(500).json({ error: "코멘트 조회에 실패했습니다." });
  }
});

router.post("/projectdetail/comments", async (req, res) => {
  const parsed = CreateProjectdetailCommentBody.safeParse(req.body);
  if (!parsed.success || parsed.data.body.trim().length === 0 || !parsed.data.projectName.trim()) {
    res.status(400).json({ error: "코멘트 내용이 올바르지 않습니다." });
    return;
  }
  const { projectName, tab, body } = parsed.data;
  try {
    const [row] = await db
      .insert(pdCommentsTable)
      .values({ projectName: projectName.trim(), tab, body: body.trim() })
      .returning();
    res.status(201).json(
      CreateProjectdetailCommentResponse.parse({
        id: row.id,
        projectName: row.projectName,
        tab: row.tab,
        body: row.body,
        createdAt: row.createdAt.toISOString(),
      }),
    );
  } catch (err) {
    req.log.error({ err }, "failed to create projectdetail comment");
    res.status(500).json({ error: "코멘트 저장에 실패했습니다." });
  }
});

router.patch("/projectdetail/comments/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const parsed = UpdateProjectdetailCommentBody.safeParse(req.body);
  if (!Number.isInteger(id) || !parsed.success || parsed.data.body.trim().length === 0) {
    res.status(400).json({ error: "코멘트 내용이 올바르지 않습니다." });
    return;
  }
  try {
    const [row] = await db
      .update(pdCommentsTable)
      .set({ body: parsed.data.body.trim() })
      .where(eq(pdCommentsTable.id, id))
      .returning();
    if (!row) {
      res.status(404).json({ error: "코멘트를 찾을 수 없습니다." });
      return;
    }
    res.json(
      UpdateProjectdetailCommentResponse.parse({
        id: row.id,
        projectName: row.projectName,
        tab: row.tab,
        body: row.body,
        createdAt: row.createdAt.toISOString(),
      }),
    );
  } catch (err) {
    req.log.error({ err }, "failed to update projectdetail comment");
    res.status(500).json({ error: "코멘트 수정에 실패했습니다." });
  }
});

router.delete("/projectdetail/comments/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "잘못된 코멘트 ID입니다." });
    return;
  }
  try {
    const rows = await db.delete(pdCommentsTable).where(eq(pdCommentsTable.id, id)).returning();
    if (rows.length === 0) {
      res.status(404).json({ error: "코멘트를 찾을 수 없습니다." });
      return;
    }
    res.status(204).end();
  } catch (err) {
    req.log.error({ err }, "failed to delete projectdetail comment");
    res.status(500).json({ error: "코멘트 삭제에 실패했습니다." });
  }
});

export default router;
