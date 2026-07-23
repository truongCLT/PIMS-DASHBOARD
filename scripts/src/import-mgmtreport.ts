import pg from "pg";
import path from "node:path";
import { existsSync } from "node:fs";
import { parseMgmtreportFile } from "@workspace/mgmtreport-parse";

// 경영관리보고회 CLI importer. Parsing logic lives in the shared lib
// @workspace/mgmtreport-parse, used by both this CLI and the API server
// web upload (artifacts/api-server/src/lib/mgmtreportImport.ts).
const DEFAULT_REL =
  "attached_assets/2026.06_경영관리보고회_취합완료_1784355378039.xlsx";
function resolveFile(arg: string | undefined): string {
  const candidates = arg
    ? [arg, path.resolve(process.cwd(), arg)]
    : [
        path.resolve(process.cwd(), DEFAULT_REL),
        path.resolve(process.cwd(), "..", DEFAULT_REL),
      ];
  for (const c of candidates) if (existsSync(c)) return c;
  throw new Error(`Excel file not found. Tried: ${candidates.join(", ")}`);
}
const FILE = resolveFile(process.argv[2]);
const YEAR = Number(process.argv[3] ?? 2026);

async function main() {
  const { projects, monthly, annual, pnl } = await parseMgmtreportFile(FILE, YEAR);

  // ---- insert ----
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    // 프로젝트 진행 상태(status)는 Excel에 없으므로 이름 기준으로 보존
    const prevStatus = await client.query(`SELECT name, status FROM mr_projects`);
    const statusByName = new Map<string, string>(
      prevStatus.rows.map((r: { name: string; status: string }) => [r.name, r.status]),
    );
    await client.query("TRUNCATE mr_monthly, mr_annual, mr_pnl, mr_projects RESTART IDENTITY CASCADE");
    const idByName = new Map<string, number>();
    for (const p of projects) {
      const res = await client.query(
        `INSERT INTO mr_projects (name, site_code, group_label, sort_order, status)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [p.name, p.siteCode, p.groupLabel, p.sortOrder, statusByName.get(p.name) ?? "ongoing"],
      );
      idByName.set(p.name, res.rows[0].id as number);
    }
    let mCount = 0;
    for (const m of monthly) {
      const pid = idByName.get(m.project);
      if (!pid) continue;
      await client.query(
        `INSERT INTO mr_monthly (project_id, year, month, scenario, metric, amount_usd)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (project_id, year, month, scenario, metric) DO UPDATE SET amount_usd = EXCLUDED.amount_usd`,
        [pid, YEAR, m.month, m.scenario, m.metric, m.amount],
      );
      mCount++;
    }
    let aCount = 0;
    for (const a of annual) {
      const pid = idByName.get(a.project);
      if (!pid) continue;
      await client.query(
        `INSERT INTO mr_annual (project_id, year, scenario, metric, amount_usd)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (project_id, year, scenario, metric) DO UPDATE SET amount_usd = EXCLUDED.amount_usd`,
        [pid, a.year, a.scenario, a.metric, a.amount],
      );
      aCount++;
    }
    let pCount = 0;
    for (const p of pnl) {
      await client.query(
        `INSERT INTO mr_pnl (year, line_code, line_label, scenario, month, amount_usd, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (year, line_code, scenario, month) DO UPDATE SET amount_usd = EXCLUDED.amount_usd`,
        [YEAR, p.lineCode, p.lineLabel, p.scenario, p.month, p.amount, p.sortOrder],
      );
      pCount++;
    }
    await client.query("COMMIT");
    console.log(
      `Imported ${projects.length} projects, ${mCount} monthly, ${aCount} annual, ${pCount} pnl rows for ${YEAR}.`,
    );
    const check = await client.query(
      `SELECT scenario, metric, round(sum(amount_usd)::numeric,2) AS total
       FROM mr_monthly GROUP BY scenario, metric ORDER BY scenario, metric`,
    );
    console.table(check.rows);
    const pnlCheck = await client.query(
      `SELECT line_code, scenario, round(sum(amount_usd)::numeric,2) AS total
       FROM mr_pnl WHERE line_code IN ('gross_profit','sga','op_profit1','ordinary_profit','new_orders')
       GROUP BY line_code, scenario ORDER BY line_code, scenario`,
    );
    console.table(pnlCheck.rows);
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
