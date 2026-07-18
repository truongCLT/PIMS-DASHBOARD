import ExcelJS from "exceljs";
import pg from "pg";

const FILE =
  process.argv[2] ??
  "attached_assets/2026.06_DECV법인_자금수지(7월_전망)_취합완료_R2_최종_K2HH1_수정_1784349740182.xlsx";
const SHEET = "자금수지(FS)_작성시트";

// column → month mapping (row 3 header layout)
// 6 = 22년말 소계 (pre2023), yearly subtotal cols skipped, 111 = 30년이후 (post2030)
type ColSpec = { col: number; bucket: string; month: string };

function buildColSpecs(): ColSpec[] {
  const specs: ColSpec[] = [{ col: 6, bucket: "pre2023", month: "2022-12-01" }];
  let col = 7;
  for (let year = 2023; year <= 2030; year++) {
    for (let m = 1; m <= 12; m++) {
      specs.push({
        col,
        bucket: "month",
        month: `${year}-${String(m).padStart(2, "0")}-01`,
      });
      col++;
    }
    col++; // skip yearly subtotal column (19, 32, 45, ...)
  }
  specs.push({ col: 111, bucket: "post2030", month: "2031-01-01" });
  return specs;
}

const SKIP_DIVISIONS = new Set([
  "사업전체",
  "법인합계",
  "영업 (도급/용역사업)",
  "영업(출자  / 배당 제외)",
  "영업(출자 / 배당 제외)",
  "재무/투자 (대여,차입,출자,배당 등)",
]);

function cellText(v: ExcelJS.CellValue): string {
  if (v == null) return "";
  if (typeof v === "object") {
    const o = v as unknown as Record<string, unknown>;
    if (o.richText) {
      return (o.richText as { text: string }[]).map((t) => t.text).join("");
    }
    if (typeof o.result === "string") return o.result;
    return "";
  }
  return String(v);
}

function cellNumber(v: ExcelJS.CellValue): number | null {
  if (v == null) return null;
  if (typeof v === "number") return v;
  if (typeof v === "object") {
    const o = v as unknown as Record<string, unknown>;
    if (typeof o.result === "number") return o.result;
    return null;
  }
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

const norm = (s: string) => s.replace(/\s+/g, " ").trim();

async function main() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(FILE);
  const ws = wb.getWorksheet(SHEET);
  if (!ws) throw new Error(`Sheet not found: ${SHEET}`);

  const colSpecs = buildColSpecs();

  type ProjectRec = {
    name: string;
    division: string;
    itemNameIn: string | null;
    itemNameOut: string | null;
    sortOrder: number;
    amounts: { flowType: string; bucket: string; month: string; amount: number }[];
  };
  const projects = new Map<string, ProjectRec>();
  let sortOrder = 0;

  for (let r = 16; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const division = norm(cellText(row.getCell(1).value));
    let projectName = norm(cellText(row.getCell(2).value));
    const flowType = norm(cellText(row.getCell(3).value));
    const itemName = norm(cellText(row.getCell(4).value));

    if (!division || SKIP_DIVISIONS.has(division)) continue;
    if (flowType !== "수입" && flowType !== "지출") continue; // skip 과부족 etc.
    // aggregate rows within a section
    if (/^합\s*계$/.test(projectName)) continue;
    // 본사판관비 / 재무·투자 style sections: project name may be empty or in col 1
    if (!projectName) {
      if (division === "본사판관비") projectName = "본사판관비";
      else continue; // blank project rows (template placeholders)
    }

    const key = `${division}|${projectName}`;
    let rec = projects.get(key);
    if (!rec) {
      rec = {
        name: projectName,
        division,
        itemNameIn: null,
        itemNameOut: null,
        sortOrder: sortOrder++,
        amounts: [],
      };
      projects.set(key, rec);
    }
    if (flowType === "수입" && itemName) rec.itemNameIn ??= itemName;
    if (flowType === "지출" && itemName) rec.itemNameOut ??= itemName;

    for (const spec of colSpecs) {
      const n = cellNumber(row.getCell(spec.col).value);
      if (n == null || n === 0) continue;
      rec.amounts.push({
        flowType,
        bucket: spec.bucket,
        month: spec.month,
        amount: Math.round(n * 100) / 100,
      });
    }
  }

  // drop template/placeholder projects that have no data at all
  for (const [key, rec] of projects) {
    if (rec.amounts.length === 0) projects.delete(key);
  }

  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("TRUNCATE cf_monthly_amounts, cf_projects RESTART IDENTITY CASCADE");
    let amountCount = 0;
    for (const rec of projects.values()) {
      const res = await client.query(
        `INSERT INTO cf_projects (name, division, item_name_in, item_name_out, sort_order)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [rec.name, rec.division, rec.itemNameIn, rec.itemNameOut, rec.sortOrder],
      );
      const pid = res.rows[0].id as number;
      // pre-aggregate duplicate (flowType, bucket, month) rows before insert
      const agg = new Map<string, { flowType: string; bucket: string; month: string; amount: number }>();
      for (const a of rec.amounts) {
        const k = `${a.flowType}|${a.bucket}|${a.month}`;
        const prev = agg.get(k);
        if (prev) prev.amount = Math.round((prev.amount + a.amount) * 100) / 100;
        else agg.set(k, { ...a });
      }
      const aggregated = [...agg.values()];
      // batch insert amounts
      const values: unknown[] = [];
      const tuples: string[] = [];
      aggregated.forEach((a, i) => {
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
        amountCount += aggregated.length;
      }
    }
    await client.query("COMMIT");
    console.log(`Imported ${projects.size} projects, ${amountCount} amount rows.`);
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
