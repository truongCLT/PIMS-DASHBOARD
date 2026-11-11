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
  monthFromMgmtreportFilename,
  type ParsedMgmtreport,
} from "@workspace/mgmtreport-parse";

// Parsing logic lives in the shared lib @workspace/mgmtreport-parse,
// used by both this server upload path and the CLI importer
// (scripts/src/import-mgmtreport.ts) so the two can never diverge.

export { MgmtreportParseError, parseMgmtreportWorkbook, monthFromMgmtreportFilename, type ParsedMgmtreport };
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
  /** 이번 반영에서 최신 파일 이름으로 바꾼 프로젝트 (되돌릴 때 역순으로 원래 이름 복원) */
  renames?: { from: string; to: string }[];
  /** 이름을 비워주기 위해 삭제한 빈 프로젝트 row (되돌릴 때 다시 생성) */
  removedProjects?: { name: string; siteCode: string | null; groupLabel: string | null; sortOrder: number; status: string }[];
  /** 이 파일 기준 실적 확정 월 (노란색 칸 또는 파일명 'YYYY.MM'). 가장 최근 반영 이력의 값이 실적 마감월로 쓰인다. */
  actualThroughMonth?: number | null;
}

// 원가 정산 관행: M월 실적은 M+1월 13일부터 마감으로 본다 (frontend lib/monthRange.ts와 같은 규칙)
const MR_CLOSE_CUTOFF_DAY = 13;
function dateRuleLastClosed(now: Date): { year: number; month: number } {
  const monthsBack = now.getDate() >= MR_CLOSE_CUTOFF_DAY ? 1 : 2;
  const d = new Date(now.getFullYear(), now.getMonth() - monthsBack, 1);
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

/** 해당 연도에 가장 최근 반영된 경영관리보고회 파일이 말하는 실적 확정 월 (없으면 null) */
export async function getUploadedActualThroughMonth(year: number): Promise<number | null> {
  const [latest] = await db
    .select({ snapshot: mrImportHistoryTable.snapshot, filename: mrImportHistoryTable.filename })
    .from(mrImportHistoryTable)
    .where(eq(mrImportHistoryTable.year, year))
    .orderBy(desc(mrImportHistoryTable.createdAt), desc(mrImportHistoryTable.id))
    .limit(1);
  if (!latest) return null;
  // 이 기능 이전에 반영된 이력엔 값이 없으므로 파일명('2026.09 …')으로 보완한다
  const m = (latest.snapshot as MrSnapshot).actualThroughMonth ?? monthFromMgmtreportFilename(latest.filename, year);
  return typeof m === "number" && m >= 1 && m <= 12 ? m : null;
}

/**
 * 실적 마감월 = max(날짜 규칙, 최근 업로드 파일의 실적 확정 월).
 * 업로드 파일에 10월까지 실적이 칠해져 있으면 날짜 규칙상 아직 9월이어도 10월을 마감으로 본다.
 */
export async function effectiveLastClosedYearMonth(now = new Date()): Promise<{
  year: number;
  month: number;
  source: "date" | "upload";
}> {
  const byDate = dateRuleLastClosed(now);
  const uploaded = await getUploadedActualThroughMonth(now.getFullYear());
  if (uploaded != null && (now.getFullYear() > byDate.year || uploaded > byDate.month)) {
    return { year: now.getFullYear(), month: uploaded, source: "upload" };
  }
  return { ...byDate, source: "date" };
}

export interface MgmtreportApplyResult {
  renamed: { from: string; to: string }[];
  /** 같은 이름의 다른 프로젝트에 데이터가 남아 있어 이름을 바꾸지 못한 경우 */
  renameSkipped: { from: string; to: string; reason: string }[];
}

// 프로젝트 상세(pd_*) 테이블은 mr_projects.id가 아니라 project_name(문자열)로 프로젝트에 연결된다.
// 이름을 바꿀 때 함께 바꿔야 PIMSVINA 동기화 데이터·사진 등이 끊기지 않는다.
async function listProjectNameTables(tx: Tx): Promise<string[]> {
  const r = await tx.execute(sql`
    select table_name from information_schema.columns
    where table_schema = 'public' and column_name = 'project_name' and table_name like 'pd\\_%'`);
  return (r.rows as { table_name: string }[]).map((x) => x.table_name);
}

async function countProjectNameRefs(tx: Tx, tables: string[], name: string): Promise<number> {
  let n = 0;
  for (const t of tables) {
    const r = await tx.execute(sql`select count(*)::int as n from ${sql.identifier(t)} where project_name = ${name}`);
    n += (r.rows[0] as { n: number }).n;
  }
  return n;
}

async function renameProjectNameRefs(tx: Tx, tables: string[], from: string, to: string) {
  for (const t of tables) {
    await tx.execute(sql`update ${sql.identifier(t)} set project_name = ${to} where project_name = ${from}`);
  }
}

const HISTORY_KEEP = 5;

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

// 이번 파일이 실제로 건드리는 키에 대해서만 "반영 직전 값"을 읽어 스냅샷으로 남긴다.
// mr_projects.fld_code/division_id/code 는 이 import가 손대지 않는 컬럼이므로 스냅샷에도 담지 않는다
// (PIMSVINA 동기화가 붙여둔 값을 되돌리기가 실수로 건드리지 않도록).
type ExistingProject = typeof mrProjectsTable.$inferSelect;

// 'SITE 36', 'site36' 처럼 DB에 표기가 섞여 있어도 파서가 만드는 'SITE36'과 같게 비교한다
const normSite = (s: string | null) => (s ? s.replace(/\s+/g, "").toUpperCase() : null);

// 파일의 프로젝트 → DB의 기존 row 매핑.
// 규칙: 같은 SITE번호를 가진 row가 이미 있으면 그 row를 그대로 쓴다 (이름·SITE번호는 건드리지 않음).
// SITE번호로 못 찾으면 이름으로 찾고, 그래도 없으면 새 프로젝트(undefined).
function resolveExistingProjects(parsed: ParsedMgmtreport, existingProjects: ExistingProject[]) {
  const byName = new Map(existingProjects.map((p) => [p.name, p]));
  const resolved = new Map<string, ExistingProject | undefined>();
  const usedBy = new Map<number, string>();
  for (const p of parsed.projects) {
    let ex: ExistingProject | undefined;
    if (p.siteCode) {
      const sameSite = existingProjects
        .filter((e) => normSite(e.siteCode) === p.siteCode)
        .sort((a, b) => Number(b.name === p.name) - Number(a.name === p.name) || a.id - b.id);
      ex = sameSite[0];
    }
    ex ??= byName.get(p.name);
    if (ex) {
      // 파일의 서로 다른 두 프로젝트가 DB의 같은 row로 모이면 숫자가 섞이므로 반영 전에 막는다
      const other = usedBy.get(ex.id);
      if (other != null) {
        throw new MgmtreportParseError(
          `'${other}'와(과) '${p.name}${p.siteCode ? ` (${p.siteCode})` : ""}'이(가) 기존 프로젝트 '${ex.name}'${ex.siteCode ? ` (${ex.siteCode})` : ""} 하나로 연결됩니다. SITE번호 또는 프로젝트명을 확인해 주세요.`,
        );
      }
      usedBy.set(ex.id, p.name);
    }
    resolved.set(p.name, ex);
  }
  return resolved;
}

async function captureBeforeState(
  tx: Tx,
  parsed: ParsedMgmtreport,
  resolved: Map<string, ExistingProject | undefined>,
): Promise<MrSnapshot> {
  // 되돌리기는 이름으로 row를 찾으므로, 스냅샷에는 파일 이름이 아니라 실제 DB row 이름을 남긴다
  const dbName = (fileName: string) => resolved.get(fileName)?.name ?? fileName;

  const projects = parsed.projects.map((p) => {
    const ex = resolved.get(p.name);
    return {
      name: dbName(p.name),
      before: ex ? { siteCode: ex.siteCode, groupLabel: ex.groupLabel, sortOrder: ex.sortOrder, status: ex.status } : null,
    };
  });

  const existingMonthly = await tx.select().from(mrMonthlyTable).where(eq(mrMonthlyTable.year, parsed.year));
  const monthlyBefore = new Map(existingMonthly.map((m) => [`${m.projectId}|${m.month}|${m.scenario}|${m.metric}`, m.amountUsd]));
  const monthly = parsed.monthly.map((m) => {
    const pid = resolved.get(m.project)?.id;
    const before = pid != null ? (monthlyBefore.get(`${pid}|${m.month}|${m.scenario}|${m.metric}`) ?? null) : null;
    return { project: dbName(m.project), year: parsed.year, month: m.month, scenario: m.scenario, metric: m.metric, before };
  });

  const annualYears = [...new Set(parsed.annual.map((a) => a.year))];
  const existingAnnual = annualYears.length
    ? await tx.select().from(mrAnnualTable).where(inArray(mrAnnualTable.year, annualYears))
    : [];
  const annualBefore = new Map(existingAnnual.map((a) => [`${a.projectId}|${a.year}|${a.scenario}|${a.metric}`, a.amountUsd]));
  const annual = parsed.annual.map((a) => {
    const pid = resolved.get(a.project)?.id;
    const before = pid != null ? (annualBefore.get(`${pid}|${a.year}|${a.scenario}|${a.metric}`) ?? null) : null;
    return { project: dbName(a.project), year: a.year, scenario: a.scenario, metric: a.metric, before };
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

export async function applyMgmtreportImport(parsed: ParsedMgmtreport, filename: string): Promise<MgmtreportApplyResult> {
  return await db.transaction(async (tx) => {
    // 반영 직전, 이번 파일이 건드릴 키들의 값을 이력으로 보관 (되돌리기용)
    const existingProjects = await tx.select().from(mrProjectsTable);
    const resolved = resolveExistingProjects(parsed, existingProjects);
    const snapshot: MrSnapshot = {
      ...(await captureBeforeState(tx, parsed, resolved)),
      actualThroughMonth: parsed.actualThroughMonth ?? monthFromMgmtreportFilename(filename, parsed.year),
    };
    const [history] = await tx
      .insert(mrImportHistoryTable)
      .values({
        filename,
        year: parsed.year,
        snapshot,
      })
      .returning({ id: mrImportHistoryTable.id });
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
      const ex = resolved.get(p.name);
      let row: { id: number } | undefined;
      if (ex) {
        // 기존 프로젝트: 이름과 이미 등록된 SITE번호는 덮어쓰지 않고, 정렬/그룹 정보만 갱신한다.
        // SITE번호가 비어 있던 프로젝트에만 파일의 SITE번호를 채워 넣는다.
        [row] = await tx
          .update(mrProjectsTable)
          .set({ siteCode: ex.siteCode ?? p.siteCode, groupLabel: p.groupLabel, sortOrder: p.sortOrder })
          .where(eq(mrProjectsTable.id, ex.id))
          .returning({ id: mrProjectsTable.id });
      } else {
        [row] = await tx
          .insert(mrProjectsTable)
          .values({ name: p.name, siteCode: p.siteCode, groupLabel: p.groupLabel, sortOrder: p.sortOrder })
          .returning({ id: mrProjectsTable.id });
      }
      if (!row) throw new Error(`프로젝트 '${p.name}' 저장 실패 (대상 행을 찾지 못함)`);
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

    // 프로젝트명을 최신 업로드 파일 기준으로 맞춘다.
    // 데이터 반영(연도 단위 교체)이 끝난 뒤에 해야, 같은 이름을 쥐고 있는 다른 row가 이제 비었는지 정확히 판단할 수 있다.
    // - 새 이름을 아무도 안 쓰면: 이름 변경 + pd_* 의 project_name 도 같이 변경
    // - 새 이름을 다른 row가 쓰고 있지만 그 row가 완전히 비었으면(이번 파일과 무관, 숫자·PIMSVINA 연결·부문 매핑 없음):
    //   그 빈 row를 지우고 이름 변경 (예: SITE42 → 'THT K2CT1 HIGH-RISE…' 를 'K2CT1 도급공사'로, 빈 456번 삭제)
    // - 그 외(다른 row에 데이터가 남아 있음): 오류 없이 기존 이름 유지, 결과에 사유를 남김
    const result: MgmtreportApplyResult = { renamed: [], renameSkipped: [] };
    const removedProjects: NonNullable<MrSnapshot["removedProjects"]> = [];
    const usedIds = new Set(idByName.values());
    const pdTables = await listProjectNameTables(tx);
    let pending = parsed.projects
      .map((p) => ({ to: p.name, row: resolved.get(p.name) }))
      .filter((x): x is { to: string; row: ExistingProject } => x.row != null && x.row.name !== x.to)
      .map((x) => ({ id: x.row.id, from: x.row.name, to: x.to }));
    // A→B, B→C 처럼 이어진 변경을 위해, 더 이상 진행이 없을 때까지 반복한다
    for (let progress = true; progress && pending.length > 0; ) {
      progress = false;
      const next: typeof pending = [];
      for (const r of pending) {
        const [holder] = await tx.select().from(mrProjectsTable).where(eq(mrProjectsTable.name, r.to)).limit(1);
        if (holder) {
          if (usedIds.has(holder.id)) {
            next.push(r); // 이번 파일의 다른 프로젝트가 쓰는 row → 그쪽 이름이 먼저 바뀌면 다음 바퀴에 가능
            continue;
          }
          const [{ n: dataRows }] = (
            await tx.execute(sql`
              select (select count(*) from ${mrMonthlyTable} where project_id = ${holder.id})
                   + (select count(*) from ${mrAnnualTable} where project_id = ${holder.id}) as n`)
          ).rows as { n: string }[];
          const refs = await countProjectNameRefs(tx, pdTables, holder.name);
          const reason =
            Number(dataRows) > 0
              ? `기존 '${r.to}' 프로젝트에 다른 연도 경영관리 데이터 ${dataRows}건이 남아 있음`
              : refs > 0
                ? `기존 '${r.to}' 프로젝트에 프로젝트 상세(PIMSVINA) 데이터 ${refs}건이 연결되어 있음`
                : holder.code || holder.fldCode || holder.divisionId != null
                  ? `기존 '${r.to}' 프로젝트에 PIMSVINA 코드 또는 부문 매핑이 있음`
                  : null;
          if (reason) {
            result.renameSkipped.push({ from: r.from, to: r.to, reason });
            continue;
          }
          await tx.delete(mrProjectsTable).where(eq(mrProjectsTable.id, holder.id));
          removedProjects.push({
            name: holder.name,
            siteCode: holder.siteCode,
            groupLabel: holder.groupLabel,
            sortOrder: holder.sortOrder,
            status: holder.status,
          });
        } else {
          // mr_projects엔 없지만 pd_*에 같은 이름의 고아 데이터가 있으면, 합쳐지면서 섞이거나 unique 충돌이 날 수 있다
          const orphanRefs = await countProjectNameRefs(tx, pdTables, r.to);
          if (orphanRefs > 0) {
            result.renameSkipped.push({
              from: r.from,
              to: r.to,
              reason: `'${r.to}' 이름으로 연결된 프로젝트 상세 데이터 ${orphanRefs}건이 이미 있음`,
            });
            continue;
          }
        }
        await tx.update(mrProjectsTable).set({ name: r.to }).where(eq(mrProjectsTable.id, r.id));
        await renameProjectNameRefs(tx, pdTables, r.from, r.to);
        result.renamed.push({ from: r.from, to: r.to });
        progress = true;
      }
      pending = next;
    }
    for (const r of pending) {
      result.renameSkipped.push({ from: r.from, to: r.to, reason: `'${r.to}' 이름을 이번 파일의 다른 프로젝트가 사용 중` });
    }

    if (result.renamed.length > 0 || removedProjects.length > 0) {
      await tx
        .update(mrImportHistoryTable)
        .set({ snapshot: { ...snapshot, renames: result.renamed, removedProjects } })
        .where(eq(mrImportHistoryTable.id, history.id));
    }
    return result;
  });
}

export class ProjectRenameError extends Error {
  constructor(
    message: string,
    public status: 400 | 404 | 409 = 400,
  ) {
    super(message);
  }
}

// 화면(Data Entry)에서 사이트명을 직접 바꿀 때 사용.
// mr_projects.name 과, 이름으로 연결된 프로젝트 상세(pd_*)의 project_name 을 한 트랜잭션에서 함께 바꾼다.
export async function renameMgmtreportProject(from: string, toRaw: string) {
  const to = toRaw.replace(/\s+/g, " ").trim();
  if (!to) throw new ProjectRenameError("새 사이트명을 입력해 주세요.");
  if (to.length > 200) throw new ProjectRenameError("사이트명은 200자 이하로 입력해 주세요.");
  return await db.transaction(async (tx) => {
    const [row] = await tx.select().from(mrProjectsTable).where(eq(mrProjectsTable.name, from)).limit(1);
    if (!row) throw new ProjectRenameError(`'${from}' 프로젝트를 찾을 수 없습니다.`, 404);
    if (to === from) return { name: to, renamedRefs: 0 };

    const [holder] = await tx.select().from(mrProjectsTable).where(eq(mrProjectsTable.name, to)).limit(1);
    if (holder) {
      throw new ProjectRenameError(
        `'${to}' 이름은 이미 다른 프로젝트${holder.siteCode ? `(${holder.siteCode})` : ""}가 사용 중입니다. 다른 이름을 입력해 주세요.`,
        409,
      );
    }
    const pdTables = await listProjectNameTables(tx);
    const orphan = await countProjectNameRefs(tx, pdTables, to);
    if (orphan > 0) {
      throw new ProjectRenameError(
        `'${to}' 이름으로 연결된 프로젝트 상세 데이터 ${orphan}건이 이미 있어 데이터가 섞일 수 있습니다. 다른 이름을 입력해 주세요.`,
        409,
      );
    }
    const renamedRefs = await countProjectNameRefs(tx, pdTables, from);
    await tx.update(mrProjectsTable).set({ name: to }).where(eq(mrProjectsTable.id, row.id));
    await renameProjectNameRefs(tx, pdTables, from, to);
    return { name: to, renamedRefs };
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

    // 0) 이 반영이 바꾼 프로젝트명을 역순으로 원래대로 돌리고(pd_* 포함), 이름을 비우려고 지웠던 빈 row를 다시 만든다.
    //    스냅샷의 나머지 항목은 모두 "변경 전 이름" 기준이므로 이 단계가 먼저여야 한다.
    if (snap.renames?.length) {
      const pdTables = await listProjectNameTables(tx);
      for (const r of [...snap.renames].reverse()) {
        await tx.update(mrProjectsTable).set({ name: r.from }).where(eq(mrProjectsTable.name, r.to));
        await renameProjectNameRefs(tx, pdTables, r.to, r.from);
      }
    }
    for (const p of snap.removedProjects ?? []) {
      await tx.insert(mrProjectsTable).values(p).onConflictDoNothing({ target: mrProjectsTable.name });
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
