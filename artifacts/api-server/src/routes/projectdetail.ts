import { Router, type IRouter } from "express";
import { asc, eq } from "drizzle-orm";
import {
  db,
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
    })),
    costBudget: costBudget.map((c) => ({
      category: c.category,
      item: c.item,
      budget: num(c.budget),
      plan: num(c.plan),
      actual: num(c.actual),
    })),
    outsourcing: outsourcing.map((o) => ({
      trade: o.trade,
      vendor: o.vendor,
      category: o.category,
      contractDate: o.contractDate,
      changeNo: o.changeNo,
      budget: num(o.budget),
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

router.put("/projectdetail", requireAdmin, async (req, res) => {
  const parsed = PutProjectdetailBody.safeParse(req.body);
  if (!parsed.success || !parsed.data.projectName.trim()) {
    res.status(400).json({ error: "잘못된 요청 본문입니다." });
    return;
  }
  const body = parsed.data;
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
      if (ov.contractAmount != null || ov.startDate != null || ov.endDate != null) {
        await tx.insert(pdOverviewTable).values({
          projectName,
          contractAmount: str(ov.contractAmount),
          startDate: ov.startDate ?? null,
          endDate: ov.endDate ?? null,
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
            trade: o.trade,
            vendor: o.vendor ?? null,
            category: o.category ?? null,
            contractDate: o.contractDate ?? null,
            changeNo: o.changeNo ?? null,
            budget: str(o.budget),
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

export default router;
