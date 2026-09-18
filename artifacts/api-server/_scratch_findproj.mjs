import "dotenv/config";
import pg from "pg";

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  const r = await client.query(
    `SELECT name, site_code, fld_code FROM mr_projects WHERE name ILIKE '%K8HH1%'`
  );
  console.table(r.rows);
} finally {
  await client.end();
}
