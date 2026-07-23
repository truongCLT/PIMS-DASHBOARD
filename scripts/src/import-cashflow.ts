import pg from "pg";
import { parseCashflowFile } from "@workspace/cashflow-parse";

// NOTE: 풀 로드(wb.xlsx.readFile) 시 ~4GB RSS → OOM. 스트리밍 파싱은
// @workspace/cashflow-parse 라이브러리가 처리한다.
const FILE =
  process.argv[2] ??
  "attached_assets/2026.06_DECV법인_자금수지(7월_전망)_취합완료_R2_최종_K2HH1_수정_1784349740182.xlsx";

async function main() {
  const parsed = await parseCashflowFile(FILE);
  const { projects } = parsed;

  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("TRUNCATE cf_monthly_amounts, cf_projects RESTART IDENTITY CASCADE");
    let amountCount = 0;
    for (const rec of projects) {
      const res = await client.query(
        `INSERT INTO cf_projects (name, division, item_name_in, item_name_out, sort_order)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [rec.name, rec.division, rec.itemNameIn, rec.itemNameOut, rec.sortOrder],
      );
      const pid = res.rows[0].id as number;
      // amounts are already aggregated by @workspace/cashflow-parse
      const values: unknown[] = [];
      const tuples: string[] = [];
      rec.amounts.forEach((a, i) => {
        const base = i * 5;
        tuples.push(`($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5})`);
        values.push(pid, a.flowType, a.bucket, a.month, a.amount);
      });
      if (tuples.length > 0) {
        await client.query(
          `INSERT INTO cf_monthly_amounts (project_id, flow_type, bucket, month, amount)
           VALUES ${tuples.join(", ")}
           ON CONFLICT (project_id, flow_type, bucket, month)
           DO UPDATE SET amount = cf_monthly_amounts.amount + EXCLUDED.amount`,
          values,
        );
        amountCount += rec.amounts.length;
      }
    }
    await client.query("COMMIT");
    console.log(`Imported ${projects.length} projects, ${amountCount} amount rows.`);
    const summary = await client.query(
      `SELECT p.division, count(DISTINCT p.id) AS projects, count(a.id) AS rows
       FROM cf_projects p LEFT JOIN cf_monthly_amounts a ON a.project_id = p.id
       GROUP BY p.division ORDER BY p.division`,
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
