import { Router, type IRouter } from "express";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import {
  db,
  mrProjectsTable,
  pdCommentsTable,
  pdOverviewTable,
  pdProgressMonthlyTable,
  pdMilestonesTable,
  pdCostEstimationTable,
  pdCostBudgetTable,
  pdCostBudgetMonthlyTable,
  pdOutsourcingTable,
  pdCashflowMonthlyTable,
  pdCogsMonthlyTable,
  pdSalesMonthlyTable,
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

class DuplicateCogsMonthError extends Error {}
class DuplicateSalesMonthError extends Error {}
class InvalidSalesRowError extends Error {}

const num = (v: string | null) => (v == null ? null : Number(v));
const str = (v: number | null | undefined) => (v == null ? null : String(v));

async function loadDetail(projectName: string) {
  const [mrProjectRows, overviewRows, progress, milestones, costEstimation, costBudget, costBudgetMonthly, outsourcing, cashflow, cogsMonthly, salesMonthly, photos] = await Promise.all([
    db
      .select({ siteCode: mrProjectsTable.siteCode })
      .from(mrProjectsTable)
      .where(eq(mrProjectsTable.name, projectName))
      .limit(1),
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
      .from(pdCostBudgetMonthlyTable)
      .where(eq(pdCostBudgetMonthlyTable.projectName, projectName))
      .orderBy(asc(pdCostBudgetMonthlyTable.item), asc(pdCostBudgetMonthlyTable.year), asc(pdCostBudgetMonthlyTable.month)),
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
      .from(pdCogsMonthlyTable)
      .where(eq(pdCogsMonthlyTable.projectName, projectName))
      .orderBy(asc(pdCogsMonthlyTable.year), asc(pdCogsMonthlyTable.month)),
    db
      .select()
      .from(pdSalesMonthlyTable)
      .where(eq(pdSalesMonthlyTable.projectName, projectName))
      .orderBy(asc(pdSalesMonthlyTable.year), asc(pdSalesMonthlyTable.month)),
    db
      .select()
      .from(pdPhotosTable)
      .where(eq(pdPhotosTable.projectName, projectName))
      .orderBy(asc(pdPhotosTable.sortOrder), asc(pdPhotosTable.id)),
  ]);

  const ov = overviewRows[0];
  const formatDateStr = (d: string | null | undefined) => {
    if (!d) return null;
    const clean = d.trim();
    if (/^\d{8}$/.test(clean)) {
      return `${clean.slice(0, 4)}-${clean.slice(4, 6)}-${clean.slice(6, 8)}`;
    }
    return clean;
  };

  return {
    projectName,
    unit: "천 USD",
    overview: {
      siteCode: mrProjectRows[0]?.siteCode ?? null,
      contractAmount: ov ? num(ov.contractAmount) : null,
      startDate: formatDateStr(ov?.startDate),
      endDate: formatDateStr(ov?.endDate),
      client: ov?.client ?? null,
      scale: ov?.scale ?? null,
      asOfMonth: ov?.asOfMonth ?? null,
      scope: ov?.scope ?? null,
      revenueAnnualTarget: ov ? num(ov.revenueAnnualTarget) : null,
      revenueTotal: ov ? num(ov.revenueTotal) : null,
      cashConfirmed: ov ? num(ov.cashConfirmed) : null,
      cashCollection: ov ? num(ov.cashCollection) : null,
      slideshowIntervalSeconds: ov?.slideshowIntervalSeconds ?? 0,
      isClosed: !!ov?.isClosed,
    },
    progress: progress.map((p) => {
      const clamp100 = (v: number | null) => (v == null ? null : Math.min(100, Math.max(0, v)));
      return {
        year: p.year,
        month: p.month,
        planPct: clamp100(num(p.planPct)),
        actualPct: clamp100(num(p.actualPct)),
        planCumPct: clamp100(num(p.planCumPct)),
        actualCumPct: clamp100(num(p.actualCumPct)),
      };
    }),
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
    costBudgetMonthly: costBudgetMonthly.map((c) => ({
      item: c.item,
      year: c.year,
      month: c.month,
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
    cogsMonthly: cogsMonthly.map((c) => ({
      year: c.year,
      month: c.month,
      acctCogs: num(c.acctCogs),
      wipCogs: num(c.wipCogs),
    })),
    salesMonthly: salesMonthly.map((s) => ({
      year: s.year,
      month: s.month,
      plan: num(s.plan),
      actual: num(s.actual),
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

// Must match VND_PER_K_USD in ProjectDataEntryTab.tsx — that's the rate the Data Entry tab
// used to convert the entered VND into the "천 USD" (thousand USD) values stored in pd_sales_monthly,
// so it's also the rate needed to convert them back to VND for this endpoint's consumer.
const VND_PER_K_USD = 25_400_000;
const toVnd = (kUsd: string | null) => (kUsd == null ? null : Math.round(Number(kUsd) * VND_PER_K_USD));

/**
 * GET all Monthly Revenue (Data Entry tab, "Monthly Revenue" section — pd_sales_monthly) rows
 * across every project — for bulk export/consumption by an external report (Productivity Report).
 * NOTE: kept at the "/outsourcing/all" path because that is the URL the consuming report already
 * calls; despite the path name this no longer returns pd_outsourcing data.
 */
router.get("/outsourcing/all", async (req, res) => {
  try {
    const rows = await db
      .select({
        projectName: pdSalesMonthlyTable.projectName,
        // 수기 입력(Data Entry)된 행은 fld_code/site_code가 비어있음 -> mr_projects.site_code로 보완
        siteCode: sql<string | null>`coalesce(${pdSalesMonthlyTable.siteCode}, ${mrProjectsTable.siteCode})`,
        fldCode: pdSalesMonthlyTable.fldCode,
        year: pdSalesMonthlyTable.year,
        month: pdSalesMonthlyTable.month,
        revenuePlan: pdSalesMonthlyTable.plan,
        revenueActual: pdSalesMonthlyTable.actual,
      })
      .from(pdSalesMonthlyTable)
      .leftJoin(mrProjectsTable, eq(mrProjectsTable.name, pdSalesMonthlyTable.projectName))
      .orderBy(asc(pdSalesMonthlyTable.projectName), asc(pdSalesMonthlyTable.year), asc(pdSalesMonthlyTable.month));
    res.json({
      data: rows.map((r) => ({
        ...r,
        revenuePlan: toVnd(r.revenuePlan),
        revenueActual: toVnd(r.revenueActual),
      })),
    });
  } catch (err) {
    req.log.error({ err }, "failed to list all monthly revenue rows");
    res.status(500).json({ error: "매출(월별) 전체 조회에 실패했습니다." });
  }
});

/** GET all Monthly Cost of Revenue (COGS) rows across every project — for bulk export/consumption. */
router.get("/cogs-monthly/all", async (req, res) => {
  try {
    const rows = await db
      .select()
      .from(pdCogsMonthlyTable)
      .orderBy(asc(pdCogsMonthlyTable.projectName), asc(pdCogsMonthlyTable.year), asc(pdCogsMonthlyTable.month));
    res.json({ data: rows });
  } catch (err) {
    req.log.error({ err }, "failed to list all cogs monthly rows");
    res.status(500).json({ error: "매출원가(월별) 전체 조회에 실패했습니다." });
  }
});

/** GET all Monthly Revenue (plan/actual) rows across every project — for bulk export/consumption. */
router.get("/sales-monthly/all", async (req, res) => {
  try {
    const rows = await db
      .select()
      .from(pdSalesMonthlyTable)
      .orderBy(asc(pdSalesMonthlyTable.projectName), asc(pdSalesMonthlyTable.year), asc(pdSalesMonthlyTable.month));
    res.json({ data: rows });
  } catch (err) {
    req.log.error({ err }, "failed to list all sales monthly rows");
    res.status(500).json({ error: "매출(월별) 전체 조회에 실패했습니다." });
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

/* ── 마감/해지 토글 ── */
router.patch("/projectdetail/close", requireAdmin, async (req, res) => {
  const { projectName, closed } = req.body ?? {};
  if (typeof projectName !== "string" || !projectName.trim() || typeof closed !== "boolean") {
    res.status(400).json({ error: "projectName(string)과 closed(boolean)이 필요합니다." });
    return;
  }
  try {
    await db
      .update(pdOverviewTable)
      .set({ isClosed: (closed ? 1 : 0) as any })
      .where(eq(pdOverviewTable.projectName, projectName.trim()));
    res.json({ projectName: projectName.trim(), isClosed: closed });
  } catch (err) {
    req.log.error({ err }, "failed to toggle close status");
    res.status(500).json({ error: "마감 상태 변경에 실패했습니다." });
  }
});

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

  /* 마감 상태이면 편집 차단 */
  const closedRows = await db.select({ isClosed: pdOverviewTable.isClosed })
    .from(pdOverviewTable)
    .where(eq(pdOverviewTable.projectName, body.projectName.trim()));
  if (closedRows[0]?.isClosed) {
    res.status(403).json({ error: "마감된 프로젝트는 데이터를 수정할 수 없습니다. 마감을 해지한 후 시도해주세요." });
    return;
  }

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

  {
    const asOf = body.overview.asOfMonth;
    if (asOf != null && asOf.trim() !== "" && !/^\d{4}-(0[1-9]|1[0-2])$/.test(asOf.trim())) {
      res.status(400).json({ error: "작성 기준월은 YYYY-MM 형식이어야 합니다." });
      return;
    }
  }

  try {
    await db.transaction(async (tx) => {
      // 구버전 클라이언트/Excel 업로드가 신규 필드를 생략(undefined)한 경우 기존 값을 보존한다.
      const existingOvRows = await tx
        .select()
        .from(pdOverviewTable)
        .where(eq(pdOverviewTable.projectName, projectName));
      const prevOv = existingOvRows[0];

      await tx.delete(pdOverviewTable).where(eq(pdOverviewTable.projectName, projectName));
      await tx.delete(pdProgressMonthlyTable).where(eq(pdProgressMonthlyTable.projectName, projectName));
      await tx.delete(pdMilestonesTable).where(eq(pdMilestonesTable.projectName, projectName));
      await tx.delete(pdCostEstimationTable).where(eq(pdCostEstimationTable.projectName, projectName));
      await tx.delete(pdCostBudgetTable).where(eq(pdCostBudgetTable.projectName, projectName));
      await tx.delete(pdCostBudgetMonthlyTable).where(eq(pdCostBudgetMonthlyTable.projectName, projectName));
      await tx.delete(pdOutsourcingTable).where(eq(pdOutsourcingTable.projectName, projectName));
      await tx.delete(pdCashflowMonthlyTable).where(eq(pdCashflowMonthlyTable.projectName, projectName));
      if (body.cogsMonthly !== undefined) {
        await tx.delete(pdCogsMonthlyTable).where(eq(pdCogsMonthlyTable.projectName, projectName));
      }
      if (body.salesMonthly !== undefined) {
        await tx.delete(pdSalesMonthlyTable).where(eq(pdSalesMonthlyTable.projectName, projectName));
      }
      await tx.delete(pdPhotosTable).where(eq(pdPhotosTable.projectName, projectName));

      const ov = body.overview;
      const client = ov.client?.trim() ? ov.client.trim() : null;
      const scale = ov.scale?.trim() ? ov.scale.trim() : null;
      // 신규 필드: undefined(생략)는 기존 값 유지, null은 명시적 삭제
      const asOfMonth =
        ov.asOfMonth === undefined ? (prevOv?.asOfMonth ?? null) : ov.asOfMonth?.trim() ? ov.asOfMonth.trim() : null;
      const scope =
        ov.scope === undefined ? (prevOv?.scope ?? null) : ov.scope?.trim() ? ov.scope.trim() : null;
      const revenueAnnualTarget =
        ov.revenueAnnualTarget === undefined ? (prevOv?.revenueAnnualTarget ?? null) : str(ov.revenueAnnualTarget);
      const revenueTotal = ov.revenueTotal === undefined ? (prevOv?.revenueTotal ?? null) : str(ov.revenueTotal);
      const cashConfirmed = ov.cashConfirmed === undefined ? (prevOv?.cashConfirmed ?? null) : str(ov.cashConfirmed);
      const cashCollection =
        ov.cashCollection === undefined ? (prevOv?.cashCollection ?? null) : str(ov.cashCollection);
      const slideshowIntervalSeconds =
        ov.slideshowIntervalSeconds !== undefined
          ? (ov.slideshowIntervalSeconds ?? 0)
          : (prevOv?.slideshowIntervalSeconds ?? 0);
      if (
        ov.contractAmount != null ||
        ov.startDate != null ||
        ov.endDate != null ||
        client != null ||
        scale != null ||
        asOfMonth != null ||
        scope != null ||
        revenueAnnualTarget != null ||
        revenueTotal != null ||
        cashConfirmed != null ||
        cashCollection != null ||
        slideshowIntervalSeconds > 0
      ) {
        await tx.insert(pdOverviewTable).values({
          projectName,
          contractAmount: str(ov.contractAmount),
          startDate: ov.startDate ?? null,
          endDate: ov.endDate ?? null,
          client,
          scale,
          asOfMonth,
          scope,
          revenueAnnualTarget,
          revenueTotal,
          cashConfirmed,
          cashCollection,
          slideshowIntervalSeconds,
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
      const cbmRows = (body.costBudgetMonthly ?? []).filter(
        (r) => r.plan != null || r.actual != null,
      );
      if (cbmRows.length > 0) {
        await tx.insert(pdCostBudgetMonthlyTable).values(
          cbmRows.map((c) => ({
            projectName,
            item: c.item,
            year: c.year,
            month: c.month,
            plan: str(c.plan),
            actual: str(c.actual),
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
      const cogsRows = body.cogsMonthly ?? [];
      const cogsKeys = new Set<string>();
      for (const c of cogsRows) {
        const k = `${c.year}-${c.month}`;
        if (cogsKeys.has(k)) {
          throw new DuplicateCogsMonthError(`${c.year}년 ${c.month}월`);
        }
        cogsKeys.add(k);
      }
      if (cogsRows.length > 0) {
        await tx.insert(pdCogsMonthlyTable).values(
          cogsRows.map((c) => ({
            projectName,
            year: c.year,
            month: c.month,
            acctCogs: str(c.acctCogs),
            wipCogs: str(c.wipCogs),
          })),
        );
      }
      const salesRows = body.salesMonthly ?? [];
      const salesKeys = new Set<string>();
      for (const s of salesRows) {
        if (!Number.isInteger(s.year) || s.year < 2000 || s.year > 2100 || !Number.isInteger(s.month) || s.month < 1 || s.month > 12) {
          throw new InvalidSalesRowError(`${s.year}.${s.month}`);
        }
        const k = `${s.year}-${s.month}`;
        if (salesKeys.has(k)) {
          throw new DuplicateSalesMonthError(`${s.year}년 ${s.month}월`);
        }
        salesKeys.add(k);
      }
      if (salesRows.length > 0) {
        await tx.insert(pdSalesMonthlyTable).values(
          salesRows.map((s) => ({
            projectName,
            year: s.year,
            month: s.month,
            plan: str(s.plan),
            actual: str(s.actual),
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
    if (err instanceof DuplicateCogsMonthError) {
      res.status(400).json({ error: `월별 매출원가에 중복된 월이 있습니다: ${err.message}` });
      return;
    }
    if (err instanceof DuplicateSalesMonthError) {
      res.status(400).json({ error: `월별 매출에 중복된 월이 있습니다: ${err.message}` });
      return;
    }
    if (err instanceof InvalidSalesRowError) {
      res.status(400).json({ error: `월별 매출의 연도/월이 올바르지 않습니다: ${err.message} (연도 2000~2100, 월 1~12의 정수)` });
      return;
    }
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
