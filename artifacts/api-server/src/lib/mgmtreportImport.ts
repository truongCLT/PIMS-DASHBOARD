import { desc, eq, gte, notInArray } from "drizzle-orm";
import {
  db,
  mrProjectsTable,
  mrMonthlyTable,
  mrAnnualTable,
  mrPnlTable,
  mrImportHistoryTable,
} from "@workspace/db";
import {
  MgmtreportParseError,
  parseMgmtreportWorkbook,
  buildMgmtreportPreview,
  type ParsedMgmtreport,
} from "@workspace/mgmtreport-parse";

// Parsing logic lives in the shared lib @workspace/mgmtreport-parse,
// used by both this server upload path and the CLI importer
// (scripts/src/import-mgmtreport.ts) so the two can never diverge.

export { MgmtreportParseError, parseMgmtreportWorkbook, type ParsedMgmtreport };
export const buildPreview = buildMgmtreportPreview;

// 되돌리기용 스냅샷: project id 대신 이름으로 참조해 재삽입 시 id 재매핑이 필요 없도록 함
export interface MrSnapshot {
  projects: { name: string; siteCode: string | null; groupLabel: string | null; sortOrder: number; status?: string }[];
  monthly: { project: string; year: number; month: number; scenario: string; metric: string; amountUsd: string }[];
  annual: { project: string; year: number; scenario: string; metric: string; amountUsd: string }[];
  pnl: { year: number; lineCode: string; lineLabel: string; scenario: string; month: number | null; amountUsd: string; sortOrder: number }[];
}

const HISTORY_KEEP = 5;

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function readSnapshot(tx: Tx): Promise<MrSnapshot> {
  const projects = await tx.select().from(mrProjectsTable);
  const nameById = new Map(projects.map((p) => [p.id, p.name]));
  const monthly = await tx.select().from(mrMonthlyTable);
  const annual = await tx.select().from(mrAnnualTable);
  const pnl = await tx.select().from(mrPnlTable);
  return {
    projects: projects.map((p) => ({
      name: p.name,
      siteCode: p.siteCode,
      groupLabel: p.groupLabel,
      sortOrder: p.sortOrder,
      status: p.status,
    })),
    monthly: monthly
      .filter((m) => nameById.has(m.projectId))
      .map((m) => ({
        project: nameById.get(m.projectId)!,
        year: m.year,
        month: m.month,
        scenario: m.scenario,
        metric: m.metric,
        amountUsd: m.amountUsd,
      })),
    annual: annual
      .filter((a) => nameById.has(a.projectId))
      .map((a) => ({
        project: nameById.get(a.projectId)!,
        year: a.year,
        scenario: a.scenario,
        metric: a.metric,
        amountUsd: a.amountUsd,
      })),
    pnl: pnl.map((p) => ({
      year: p.year,
      lineCode: p.lineCode,
      lineLabel: p.lineLabel,
      scenario: p.scenario,
      month: p.month,
      amountUsd: p.amountUsd,
      sortOrder: p.sortOrder,
    })),
  };
}

// mr_* 전체를 스냅샷 내용으로 완전 교체 (mr_comments 제외)
async function writeSnapshot(tx: Tx, snap: MrSnapshot) {
  await tx.delete(mrMonthlyTable);
  await tx.delete(mrAnnualTable);
  await tx.delete(mrProjectsTable);
  await tx.delete(mrPnlTable);

  const idByName = new Map<string, number>();
  for (const p of snap.projects) {
    const [row] = await tx
      .insert(mrProjectsTable)
      .values(p)
      .returning({ id: mrProjectsTable.id });
    idByName.set(p.name, row.id);
  }

  const monthlyValues = snap.monthly
    .map((m) => {
      const pid = idByName.get(m.project);
      if (!pid) return null;
      return { projectId: pid, year: m.year, month: m.month, scenario: m.scenario, metric: m.metric, amountUsd: m.amountUsd };
    })
    .filter((v) => v != null);
  for (let i = 0; i < monthlyValues.length; i += 500) {
    await tx.insert(mrMonthlyTable).values(monthlyValues.slice(i, i + 500));
  }

  const annualValues = snap.annual
    .map((a) => {
      const pid = idByName.get(a.project);
      if (!pid) return null;
      return { projectId: pid, year: a.year, scenario: a.scenario, metric: a.metric, amountUsd: a.amountUsd };
    })
    .filter((v) => v != null);
  for (let i = 0; i < annualValues.length; i += 500) {
    await tx.insert(mrAnnualTable).values(annualValues.slice(i, i + 500));
  }

  for (let i = 0; i < snap.pnl.length; i += 500) {
    await tx.insert(mrPnlTable).values(snap.pnl.slice(i, i + 500));
  }
}

export async function applyMgmtreportImport(parsed: ParsedMgmtreport, filename: string) {
  await db.transaction(async (tx) => {
    // 반영 직전 상태를 이력으로 보관 (되돌리기용)
    const snapshot = await readSnapshot(tx);
    await tx.insert(mrImportHistoryTable).values({
      filename,
      year: parsed.year,
      snapshot,
    });
    // 최근 HISTORY_KEEP건만 유지
    const keep = await tx
      .select({ id: mrImportHistoryTable.id })
      .from(mrImportHistoryTable)
      .orderBy(desc(mrImportHistoryTable.createdAt), desc(mrImportHistoryTable.id))
      .limit(HISTORY_KEEP);
    await tx.delete(mrImportHistoryTable).where(
      notInArray(
        mrImportHistoryTable.id,
        keep.map((k) => k.id),
      ),
    );

    // Full replace: this workbook is the single source of truth for mgmtreport data
    // 단, 프로젝트 진행 상태(status)는 Excel에 없으므로 이름 기준으로 보존한다
    const statusByName = new Map(snapshot.projects.map((p) => [p.name, p.status ?? "ongoing"]));
    await tx.delete(mrMonthlyTable);
    await tx.delete(mrAnnualTable);
    await tx.delete(mrProjectsTable);
    await tx.delete(mrPnlTable).where(eq(mrPnlTable.year, parsed.year));

    const idByName = new Map<string, number>();
    for (const p of parsed.projects) {
      const [row] = await tx
        .insert(mrProjectsTable)
        .values({
          name: p.name,
          siteCode: p.siteCode,
          groupLabel: p.groupLabel,
          sortOrder: p.sortOrder,
          status: statusByName.get(p.name) ?? "ongoing",
        })
        .returning({ id: mrProjectsTable.id });
      idByName.set(p.name, row.id);
    }

    const monthlyValues = parsed.monthly
      .map((m) => {
        const pid = idByName.get(m.project);
        if (!pid) return null;
        return {
          projectId: pid,
          year: parsed.year,
          month: m.month,
          scenario: m.scenario,
          metric: m.metric,
          amountUsd: String(m.amount),
        };
      })
      .filter((v) => v != null);
    for (let i = 0; i < monthlyValues.length; i += 500) {
      await tx.insert(mrMonthlyTable).values(monthlyValues.slice(i, i + 500));
    }

    const annualValues = parsed.annual
      .map((a) => {
        const pid = idByName.get(a.project);
        if (!pid) return null;
        return {
          projectId: pid,
          year: a.year,
          scenario: a.scenario,
          metric: a.metric,
          amountUsd: String(a.amount),
        };
      })
      .filter((v) => v != null);
    for (let i = 0; i < annualValues.length; i += 500) {
      await tx.insert(mrAnnualTable).values(annualValues.slice(i, i + 500));
    }

    const pnlValues = parsed.pnl.map((p) => ({
      year: parsed.year,
      lineCode: p.lineCode,
      lineLabel: p.lineLabel,
      scenario: p.scenario,
      month: p.month,
      amountUsd: String(p.amount),
      sortOrder: p.sortOrder,
    }));
    for (let i = 0; i < pnlValues.length; i += 500) {
      await tx.insert(mrPnlTable).values(pnlValues.slice(i, i + 500));
    }
  });
}

export async function listMgmtreportImportHistory() {
  const rows = await db
    .select()
    .from(mrImportHistoryTable)
    .orderBy(desc(mrImportHistoryTable.createdAt), desc(mrImportHistoryTable.id));
  return rows.map((r) => {
    const snap = r.snapshot as MrSnapshot;
    return {
      id: r.id,
      createdAt: r.createdAt.toISOString(),
      filename: r.filename,
      year: r.year,
      snapshotProjectCount: snap.projects.filter((p) => p.groupLabel == null).length,
      snapshotMonthlyCount: snap.monthly.length,
      snapshotEmpty: snap.projects.length === 0,
    };
  });
}

export class MgmtreportRevertError extends Error {}

// 선택한 이력의 스냅샷(반영 직전 상태)으로 mr_* 데이터를 되돌린다.
export async function revertMgmtreportImport(historyId: number) {
  return await db.transaction(async (tx) => {
    const [row] = await tx
      .select()
      .from(mrImportHistoryTable)
      .where(eq(mrImportHistoryTable.id, historyId));
    if (!row) {
      throw new MgmtreportRevertError("해당 반영 이력을 찾을 수 없습니다.");
    }
    const snap = row.snapshot as MrSnapshot;
    if (snap.projects.length === 0) {
      throw new MgmtreportRevertError(
        "이 이력은 반영 이전에 데이터가 없던 상태입니다. 되돌리면 모든 경영관리보고회 데이터가 삭제되므로 지원하지 않습니다.",
      );
    }
    await writeSnapshot(tx, snap);
    // 되돌린 이력과 그 이후 이력은 현재 상태와 맞지 않으므로 제거
    await tx.delete(mrImportHistoryTable).where(gte(mrImportHistoryTable.id, row.id));
    return {
      id: row.id,
      filename: row.filename,
      year: row.year,
      restoredProjects: snap.projects.filter((p) => p.groupLabel == null).length,
      restoredMonthly: snap.monthly.length,
    };
  });
}
