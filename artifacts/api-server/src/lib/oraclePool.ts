import oracledb from "oracledb";

oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;

const ORACLE_HOST = process.env.ORACLE_HOST;
const ORACLE_PORT = process.env.ORACLE_PORT || "1521";
const ORACLE_SERVICE_NAME = process.env.ORACLE_SERVICE_NAME;
const ORACLE_USER = process.env.ORACLE_USER;
const ORACLE_PASSWORD = process.env.ORACLE_PASSWORD;

let poolPromise: Promise<oracledb.Pool> | null = null;

function createPool(): Promise<oracledb.Pool> {
  if (!ORACLE_HOST || !ORACLE_SERVICE_NAME || !ORACLE_USER || !ORACLE_PASSWORD) {
    throw new Error(
      "Thiếu cấu hình Oracle trong .env (ORACLE_HOST/ORACLE_SERVICE_NAME/ORACLE_USER/ORACLE_PASSWORD)"
    );
  }
  return oracledb.createPool({
    user: ORACLE_USER,
    password: ORACLE_PASSWORD,
    connectString: `${ORACLE_HOST}:${ORACLE_PORT}/${ORACLE_SERVICE_NAME}`,
    poolMin: 1,
    poolMax: 5,
    poolIncrement: 1,
  });
}

function getPool(): Promise<oracledb.Pool> {
  if (!poolPromise) {
    poolPromise = createPool().catch((err) => {
      poolPromise = null;
      throw err;
    });
  }
  return poolPromise;
}

/** Chạy SQL trên Oracle (PIMSVINA) qua connection pool, trả về mảng object với tên cột viết thường (khớp format cũ từ REST/JSP resultSetToJsonArray). */
export async function queryOracle(
  sql: string,
  binds: unknown[] | Record<string, unknown> = []
): Promise<Record<string, any>[]> {
  const pool = await getPool();
  const conn = await pool.getConnection();
  try {
    const result = await conn.execute<Record<string, any>>(sql, binds as oracledb.BindParameters);
    const rows = result.rows ?? [];
    return rows.map((row) => {
      const lower: Record<string, any> = {};
      for (const [key, value] of Object.entries(row)) lower[key.toLowerCase()] = value;
      return lower;
    });
  } finally {
    await conn.close();
  }
}
