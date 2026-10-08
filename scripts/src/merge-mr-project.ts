import pg from "pg";

// 중복으로 생성된 mr_projects row (같은 site_code, 다른 name) 를 1개로 합치는 one-off 스크립트.
// 원인: 과거 업로드에서 라벨 표기가 달라 같은 site_code 가 서로 다른 project row 로 쪼개짐
// (예: "K8CT1 모델하우스 (SITE39)" vs "THT K8CT1 MODEL... (SITE39)").
// 기본은 dry-run — 실제 반영하려면 --apply 를 추가로 넘긴다.
//
// 사용법:
//   dotenv -e .env -- npx tsx scripts/src/merge-mr-project.ts SITE39
//   dotenv -e .env -- npx tsx scripts/src/merge-mr-project.ts SITE39 --apply

const SITE_CODE = process.argv[2];
const APPLY = process.argv.includes("--apply");

if (!SITE_CODE) {
  console.error("usage: merge-mr-project.ts <siteCode> [--apply]");
  process.exit(1);
}

type ProjectRow = {
  id: number;
  name: string;
  code: string | null;
  site_code: string | null;
  fld_code: string | null;
  group_label: string | null;
  sort_order: number;
  status: string;
  division_id: number | null;
};

async function main() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    const { rows } = await client.query<ProjectRow>(
      `SELECT id, name, code, site_code, fld_code, group_label, sort_order, status, division_id
       FROM mr_projects WHERE site_code = $1 ORDER BY id ASC`,
      [SITE_CODE],
    );

    if (rows.length <= 1) {
      console.log(`site_code=${SITE_CODE}: ${rows.length}건 — 중복 없음, 할 일 없음.`);
      return;
    }

    // keeper 선정: PIMSVINA 동기화 키(fld_code)가 있는 row 최우선, 그다음 code, 그다음 division_id,
    // 전부 같으면 가장 먼저 생성된 id. fld_code 를 잃으면 PIMSVINA 동기화 연결이 끊어지므로 최우선.
    const score = (r: ProjectRow) => (r.fld_code ? 3 : 0) + (r.code ? 2 : 0) + (r.division_id ? 1 : 0);
    const keeper = [...rows].sort((a, b) => score(b) - score(a) || a.id - b.id)[0];
    const losers = rows.filter((r) => r.id !== keeper.id);

    console.log(`site_code=${SITE_CODE}: ${rows.length}건 발견`);
    console.log("  KEEP  :", keeper);
    for (const l of losers) console.log("  MERGE :", l);

    for (const loser of losers) {
      const monthly = await client.query(
        `SELECT year, month, scenario, metric, amount_usd FROM mr_monthly WHERE project_id = $1`,
        [loser.id],
      );
      const annual = await client.query(
        `SELECT year, scenario, metric, amount_usd FROM mr_annual WHERE project_id = $1`,
        [loser.id],
      );
      console.log(`    -> mr_monthly ${monthly.rowCount}건, mr_annual ${annual.rowCount}건 이관 예정`);
    }

    if (!APPLY) {
      console.log("\n(dry-run) 실제로 반영하려면 --apply 를 추가하세요.");
      return;
    }

    await client.query("BEGIN");
    for (const loser of losers) {
      // keeper 에 이미 같은 (year, month, scenario, metric) 이 있으면 keeper 값 유지, loser 쪽은 버림 (중복 unique 방지)
      await client.query(
        `UPDATE mr_monthly m SET project_id = $1
         WHERE m.project_id = $2
           AND NOT EXISTS (
             SELECT 1 FROM mr_monthly k
             WHERE k.project_id = $1 AND k.year = m.year AND k.month = m.month
               AND k.scenario = m.scenario AND k.metric = m.metric
           )`,
        [keeper.id, loser.id],
      );
      await client.query(`DELETE FROM mr_monthly WHERE project_id = $1`, [loser.id]);

      await client.query(
        `UPDATE mr_annual a SET project_id = $1
         WHERE a.project_id = $2
           AND NOT EXISTS (
             SELECT 1 FROM mr_annual k
             WHERE k.project_id = $1 AND k.year = a.year
               AND k.scenario = a.scenario AND k.metric = a.metric
           )`,
        [keeper.id, loser.id],
      );
      await client.query(`DELETE FROM mr_annual WHERE project_id = $1`, [loser.id]);

      await client.query(`DELETE FROM mr_projects WHERE id = $1`, [loser.id]);
    }
    await client.query("COMMIT");
    console.log("완료: merge 반영됨.");
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
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
