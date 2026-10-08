import { and, desc, eq, gte, inArray, notInArray, sql } from "drizzle-orm";
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

// 되돌리기용 스냅샷: 이번 반영이 실제로 건드리는 키만, 그 반영 직전 값을 기록한다
// (before === null 이면 그 키가 반영 전에는 존재하지 않았다는 뜻 → 되돌릴 때는 삭제)
export interface MrSnapshot {
  projects: {
    name: string;
    before: { siteCode: string | null; groupLabel: string | null; sortOrder: number; status: string } | null;
  }[];
  monthly: { project: string; year: number; month: number; scenario: string; metric: string; before: string | null }[];
  annual: { project: string; year: number; scenario: string; metric: string; before: string | null }[];
  pnl: {
    year: number;
    lineCode: string;
    scenario: string;
    month: number | null;
    before: { lineLabel: string; amountUsd: string; sortOrder: number } | null;
  }[];
}

const HISTORY_KEEP = 5;

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

// 이번 파일이 실제로 건드리는 키에 대해서만 "반영 직전 값"을 읽어 스냅샷으로 남긴다.
// mr_projects.fld_code/division_id/code 는 이 import가 손대지 않는 컬럼이므로 스냅샷에도 담지 않는다
// (PIMSVINA 동기화가 붙여둔 값을 되돌리기가 실수로 건드리지 않도록).
async function captureBeforeState(tx: Tx, parsed: ParsedMgmtreport): Promise<MrSnapshot> {
  const existingProjects = await tx.select().from(mrProjectsTable);
  const projectByName = new Map(existingProjects.map((p) => [p.name, p]));

  const projects = parsed.projects.map((p) => {
    const ex = projectByName.get(p.name);
    return {
      name: p.name,
      before: ex ? { siteCode: ex.siteCode, groupLabel: ex.groupLabel, sortOrder: ex.sortOrder, status: ex.status } : null,
    };
  });

  const existingMonthly = await tx.select().from(mrMonthlyTable).where(eq(mrMonthlyTable.year, parsed.year));
  const monthlyBefore = new Map(existingMonthly.map((m) => [`${m.projectId}|${m.month}|${m.scenario}|${m.metric}`, m.amountUsd]));
  const monthly = parsed.monthly.map((m) => {
    const pid = projectByName.get(m.project)?.id;
    const before = pid != null ? (monthlyBefore.get(`${pid}|${m.month}|${m.scenario}|${m.metric}`) ?? null) : null;
    return { project: m.project, year: parsed.year, month: m.month, scenario: m.scenario, metric: m.metric, before };
  });

  const annualYears = [...new Set(parsed.annual.map((a) => a.year))];
  const existingAnnual = annualYears.length
    ? await tx.select().from(mrAnnualTable).where(inArray(mrAnnualTable.year, annualYears))
    : [];
  const annualBefore = new Map(existingAnnual.map((a) => [`${a.projectId}|${a.year}|${a.scenario}|${a.metric}`, a.amountUsd]));
  const annual = parsed.annual.map((a) => {
    const pid = projectByName.get(a.project)?.id;
    const before = pid != null ? (annualBefore.get(`${pid}|${a.year}|${a.scenario}|${a.metric}`) ?? null) : null;
    return { project: a.project, year: a.year, scenario: a.scenario, metric: a.metric, before };
  });

  const existingPnl = await tx.select().from(mrPnlTable).where(eq(mrPnlTable.year, parsed.year));
  const pnlBefore = new Map(
    existingPnl.map((p) => [`${p.lineCode}|${p.scenario}|${p.month}`, { lineLabel: p.lineLabel, amountUsd: p.amountUsd, sortOrder: p.sortOrder }]),
  );
  const pnl = parsed.pnl.map((p) => ({
    year: parsed.year,
    lineCode: p.lineCode,
    scenario: p.scenario,
    month: p.month,
    before: pnlBefore.get(`${p.lineCode}|${p.scenario}|${p.month}`) ?? null,
  }));

  return { projects, monthly, annual, pnl };
}

export async function applyMgmtreportImport(parsed: ParsedMgmtreport, filename: string) {
  await db.transaction(async (tx) => {
    // 반영 직전, 이번 파일이 건드릴 키들의 값을 이력으로 보관 (되돌리기용)
    const snapshot = await captureBeforeState(tx, parsed);
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

    // 삭제 후 재삽입이 아니라 "값이 바뀐 것만 update, 없던 것만 insert" — 이 파일이 언급하지 않는
    // 다른 연도/다른 프로젝트의 기존 데이터는 절대 건드리지 않는다.
    // mr_projects.fld_code/division_id/code 는 여기서 다루지 않으므로 PIMSVINA 동기화가
    // 붙여둔 값이 그대로 유지된다.
    const idByName = new Map<string, number>();
    for (const p of parsed.projects) {
      // name 이 바뀌었더라도 같은 siteCode를 가진 기존 row 가 있으면 그 row 를 재사용한다
      // (파서가 siteCode 기준으로 레이블을 canonical name 으로 합치지만, 과거 업로드에서
      // 이미 다른 name 으로 들어간 row 가 DB 에 남아있을 수 있으므로 여기서도 한 번 더 막는다)
      const existingBySite = p.siteCode
        ? await tx
            .select({ id: mrProjectsTable.id, name: mrProjectsTable.name })
            .from(mrProjectsTable)
            .where(eq(mrProjectsTable.siteCode, p.siteCode))
            .limit(1)
        : [];

      let row: { id: number };
      if (existingBySite.length > 0 && existingBySite[0].name !== p.name) {
        [row] = await tx
          .update(mrProjectsTable)
          .set({ name: p.name, groupLabel: p.groupLabel, sortOrder: p.sortOrder })
          .where(eq(mrProjectsTable.id, existingBySite[0].id))
          .returning({ id: mrProjectsTable.id });
      } else {
        [row] = await tx
          .insert(mrProjectsTable)
          .values({ name: p.name, siteCode: p.siteCode, groupLabel: p.groupLabel, sortOrder: p.sortOrder })
          .onConflictDoUpdate({
            target: mrProjectsTable.name,
            set: { siteCode: p.siteCode, groupLabel: p.groupLabel, sortOrder: p.sortOrder },
          })
          .returning({ id: mrProjectsTable.id });
      }
      idByName.set(p.name, row.id);
    }

    // mr_monthly도 mr_pnl과 같은 이유로 전체 교체가 맞다 — 이 파일은 해당 연도의 전사 월별
    // 매출/원가 표 전체를 담고 있으므로("반영 시 기존 경영관리보고회 데이터가 새 파일 내용으로
    // 교체됩니다" — 업로드 모달 안내문), 이전 파일엔 있었지만 이번 파일에서 셀이 비워진 (project,
    // month, scenario, metric) 조합은 parsed.monthly에 아예 나타나지 않는다. 그대로 두면 지운 값이
    // 화면에 계속 남는 동일한 버그가 나므로, 연도 단위로 먼저 비우고 이번 파일 내용으로 다시 채운다.
    await tx.delete(mrMonthlyTable).where(eq(mrMonthlyTable.year, parsed.year));

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
      const chunk = monthlyValues.slice(i, i + 500);
      await tx
        .insert(mrMonthlyTable)
        .values(chunk)
        .onConflictDoUpdate({
          target: [mrMonthlyTable.projectId, mrMonthlyTable.year, mrMonthlyTable.month, mrMonthlyTable.scenario, mrMonthlyTable.metric],
          set: { amountUsd: sql`excluded.amount_usd` },
        });
    }

    // mr_annual도 동일한 이유로 전체 교체 — 이 파일이 언급하는 연도들(전년 실적 + 당년~+4년 전망)
    // 범위 안에서는, 이전엔 있었지만 이번 파일에서 비워진 값이 남지 않도록 먼저 비우고 다시 채운다.
    const annualYears = [...new Set(parsed.annual.map((a) => a.year))];
    if (annualYears.length > 0) {
      await tx.delete(mrAnnualTable).where(inArray(mrAnnualTable.year, annualYears));
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
      const chunk = annualValues.slice(i, i + 500);
      await tx
        .insert(mrAnnualTable)
        .values(chunk)
        .onConflictDoUpdate({
          target: [mrAnnualTable.projectId, mrAnnualTable.year, mrAnnualTable.scenario, mrAnnualTable.metric],
          set: { amountUsd: sql`excluded.amount_usd` },
        });
    }

    // mr_pnl(법인 손익)은 project와 무관한 해당 연도 전체 보고서 — 이 파일이 그 해의 완전한 표를
    // 담고 있으므로, 이전 반영에서 값이 있었지만 이번 파일에서는 셀이 비어 있어 parsed.pnl에 아예
    // 나타나지 않는 키(예: 실적 칸을 지운 경우)는 그대로 두면 옛 값이 영원히 남는다(버그 재현:
    // 8월 실적 수주를 지워도 화면엔 이전 값이 계속 표시됨). 그래서 project 테이블과 달리 mr_pnl만은
    // 연도 단위로 먼저 비우고 이번 파일 내용으로 다시 채운다.
    await tx.delete(mrPnlTable).where(eq(mrPnlTable.year, parsed.year));

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
      const chunk = pnlValues.slice(i, i + 500);
      await tx
        .insert(mrPnlTable)
        .values(chunk)
        .onConflictDoUpdate({
          target: [mrPnlTable.year, mrPnlTable.lineCode, mrPnlTable.scenario, mrPnlTable.month],
          set: { lineLabel: sql`excluded.line_label`, amountUsd: sql`excluded.amount_usd`, sortOrder: sql`excluded.sort_order` },
        });
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
      snapshotProjectCount: snap.projects.length,
      snapshotMonthlyCount: snap.monthly.length,
      // 이번 반영이 건드린 프로젝트 전부가 그 전엔 존재하지 않았다면(=이 파일이 첫 반영) 되돌리기 비활성화
      snapshotEmpty: snap.projects.length > 0 && snap.projects.every((p) => p.before == null),
    };
  });
}

export class MgmtreportRevertError extends Error {}

// 선택한 이력이 건드렸던 키들만 반영 직전 값으로 되돌린다(before=null인 키는 그 반영이 새로 만든 것이므로 삭제).
// 이 반영이 손대지 않은 다른 연도/다른 프로젝트의 데이터는 전혀 건드리지 않는다.
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
    if (snap.projects.length > 0 && snap.projects.every((p) => p.before == null)) {
      throw new MgmtreportRevertError(
        "이 이력은 최초 반영 건이라 되돌릴 이전 상태가 없습니다.",
      );
    }

    // 1) 프로젝트: 이 반영이 새로 만든 프로젝트는 삭제(하위 mr_monthly/mr_annual도 cascade로 함께 삭제),
    //    기존 프로젝트는 site_code/group_label/sort_order/status만 이전 값으로 복원
    //    (fld_code/division_id/code는 이 반영이 건드린 적이 없으므로 그대로 둔다)
    for (const p of snap.projects) {
      if (p.before == null) {
        await tx.delete(mrProjectsTable).where(eq(mrProjectsTable.name, p.name));
      } else {
        await tx
          .update(mrProjectsTable)
          .set({ siteCode: p.before.siteCode, groupLabel: p.before.groupLabel, sortOrder: p.before.sortOrder, status: p.before.status })
          .where(eq(mrProjectsTable.name, p.name));
      }
    }

    const remaining = await tx.select({ id: mrProjectsTable.id, name: mrProjectsTable.name }).from(mrProjectsTable);
    const idByName = new Map(remaining.map((p) => [p.name, p.id]));

    // 2) 월별/연간: 프로젝트가 위에서 삭제됐다면 cascade로 이미 없어졌으므로 건너뛰고,
    //    남아있는 프로젝트에 대해서만 이전 값으로 복원하거나(없던 키였다면) 삭제
    for (const m of snap.monthly) {
      const pid = idByName.get(m.project);
      if (pid == null) continue;
      const where = and(
        eq(mrMonthlyTable.projectId, pid),
        eq(mrMonthlyTable.year, m.year),
        eq(mrMonthlyTable.month, m.month),
        eq(mrMonthlyTable.scenario, m.scenario),
        eq(mrMonthlyTable.metric, m.metric),
      );
      if (m.before == null) {
        await tx.delete(mrMonthlyTable).where(where);
      } else {
        await tx
          .insert(mrMonthlyTable)
          .values({ projectId: pid, year: m.year, month: m.month, scenario: m.scenario, metric: m.metric, amountUsd: m.before })
          .onConflictDoUpdate({
            target: [mrMonthlyTable.projectId, mrMonthlyTable.year, mrMonthlyTable.month, mrMonthlyTable.scenario, mrMonthlyTable.metric],
            set: { amountUsd: m.before },
          });
      }
    }

    for (const a of snap.annual) {
      const pid = idByName.get(a.project);
      if (pid == null) continue;
      const where = and(
        eq(mrAnnualTable.projectId, pid),
        eq(mrAnnualTable.year, a.year),
        eq(mrAnnualTable.scenario, a.scenario),
        eq(mrAnnualTable.metric, a.metric),
      );
      if (a.before == null) {
        await tx.delete(mrAnnualTable).where(where);
      } else {
        await tx
          .insert(mrAnnualTable)
          .values({ projectId: pid, year: a.year, scenario: a.scenario, metric: a.metric, amountUsd: a.before })
          .onConflictDoUpdate({
            target: [mrAnnualTable.projectId, mrAnnualTable.year, mrAnnualTable.scenario, mrAnnualTable.metric],
            set: { amountUsd: a.before },
          });
      }
    }

    // 3) 법인 손익(mr_pnl): 프로젝트와 무관하므로 그대로 복원/삭제
    for (const p of snap.pnl) {
      const where = and(
        eq(mrPnlTable.year, p.year),
        eq(mrPnlTable.lineCode, p.lineCode),
        eq(mrPnlTable.scenario, p.scenario),
        p.month == null ? sql`${mrPnlTable.month} IS NULL` : eq(mrPnlTable.month, p.month),
      );
      if (p.before == null) {
        await tx.delete(mrPnlTable).where(where);
      } else {
        await tx
          .insert(mrPnlTable)
          .values({ year: p.year, lineCode: p.lineCode, lineLabel: p.before.lineLabel, scenario: p.scenario, month: p.month, amountUsd: p.before.amountUsd, sortOrder: p.before.sortOrder })
          .onConflictDoUpdate({
            target: [mrPnlTable.year, mrPnlTable.lineCode, mrPnlTable.scenario, mrPnlTable.month],
            set: { lineLabel: p.before.lineLabel, amountUsd: p.before.amountUsd, sortOrder: p.before.sortOrder },
          });
      }
    }

    // 되돌린 이력과 그 이후 이력은 현재 상태와 맞지 않으므로 제거
    await tx.delete(mrImportHistoryTable).where(gte(mrImportHistoryTable.id, row.id));
    return {
      id: row.id,
      filename: row.filename,
      year: row.year,
      restoredProjects: snap.projects.length,
      restoredMonthly: snap.monthly.length,
    };
  });
}
