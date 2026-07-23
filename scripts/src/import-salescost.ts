import pg from "pg";
import path from "node:path";
import { existsSync } from "node:fs";
import { parseSalescostFile } from "@workspace/salescost-parse";

// NOTE: run with NODE_OPTIONS=--max-old-space-size=6144 (workbook has huge defined-name tables)
// 파싱 로직은 @workspace/salescost-parse 라이브러리가 처리한다.
const DEFAULT_REL =
  "attached_assets/2.1_(26.06)_Summary_of_Sales+costs_1784354208238.xlsx";
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
  const parsed = await parseSalescostFile(FILE, YEAR);
  const { sites, amounts, year } = parsed;

  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("TRUNCATE sc_monthly, sc_sites RESTART IDENTITY CASCADE");
    const idByCode = new Map<string, number>();
    for (const s of sites) {
      const res = await client.query(
        `INSERT INTO sc_sites (code, name, category, biz_type, sort_order)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [s.code, s.name, s.category, s.bizType, s.sortOrder],
      );
      idByCode.set(s.code, res.rows[0].id as number);
    }
    let count = 0;
    for (const a of amounts) {
      const siteId = idByCode.get(a.code);
      if (!siteId) continue;
      await client.query(
        `INSERT INTO sc_monthly (site_id, year, month, metric, amount_vnd, amount_usd)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (site_id, year, month, metric)
         DO UPDATE SET amount_vnd = COALESCE(EXCLUDED.amount_vnd, sc_monthly.amount_vnd),
                       amount_usd = COALESCE(EXCLUDED.amount_usd, sc_monthly.amount_usd)`,
        [siteId, year, a.month, a.metric, a.amountVnd, a.amountUsd],
      );
      count++;
    }
    await client.query("COMMIT");
    console.log(`Imported ${sites.length} sites, ${count} monthly rows for ${year}.`);
    const summary = await client.query(
      `SELECT metric, count(*) AS rows, round(sum(amount_usd)::numeric, 2) AS total_usd
       FROM sc_monthly GROUP BY metric ORDER BY metric`,
    );
    console.table(summary.rows);
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
