const { Client } = require("pg");
require("dotenv").config({ path: "../../.env" });

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const rows = await client.query(
    `select kind, year, month, initial_business_budget, initial_contract_amount, initial_gross_profit_ratio
     from pd_cost_estimation
     where project_name = 'K8HH1 도급공사' and kind = 'execution'
     order by year, month`
  );
  console.log("=== pd_cost_estimation (execution) ===");
  console.log(rows.rows);

  await client.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
