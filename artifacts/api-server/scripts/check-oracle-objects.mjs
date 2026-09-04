// Chạy: node artifacts/api-server/scripts/check-oracle-objects.mjs
// (chạy từ thư mục ROOT của repo để dotenv đọc đúng .env)
// Mục đích: dò từng bảng Oracle mà 2 câu SQL "overview" và "cashflow" join tới,
// để biết chính xác bảng nào gây ORA-00942 dưới quyền user hiện tại.
import "dotenv/config";
import oracledb from "oracledb";

const TABLES = [
  "CBTB_FLD_MAPPING",
  "CBTB_ORDERCORP",
  "IFTB_CUSTMST",
  "CJTB_BUSPLAN_DETL",
  "CJTB_SALESAMTRST",
  "CCTB_UTKSCHD",
  "CFTB_CFTRANSACTION",
  "CFTB_CASHFLOWTYPE",
  "CATB_COMPANYSTRUCT_PROJECT",
  "CATB_BUSILINE",
  "CHTB_EXCHANGE_RATIO",
  "CBTB_FLDSUMM",
  "CBTB_CTRTSUMM",
  "CBTB_CONSTPERIOD",
  "CCTB_UTKCHGSEQ",
  "CFTB_OPENINGBALANCE",
];

async function main() {
  const conn = await oracledb.getConnection({
    user: process.env.ORACLE_USER,
    password: process.env.ORACLE_PASSWORD,
    connectString: `${process.env.ORACLE_HOST}:${process.env.ORACLE_PORT}/${process.env.ORACLE_SERVICE_NAME}`,
  });

  for (const t of TABLES) {
    try {
      await conn.execute(`SELECT COUNT(*) FROM ${t} WHERE ROWNUM = 1`);
      console.log(`[OK]   ${t}`);
    } catch (err) {
      console.log(`[FAIL] ${t} -> ${err.message.split("\n")[0]}`);
    }
  }
  await conn.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
