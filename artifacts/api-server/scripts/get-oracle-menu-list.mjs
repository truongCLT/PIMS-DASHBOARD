// Lấy danh sách menu hệ thống PIMSVINA từ bảng Oracle PZTB_MENU (cây menu 3 cấp: MAIN_ID > SUB1_ID > SUB2_ID).
//
// Chạy: node artifacts/api-server/scripts/get-oracle-menu-list.mjs [--out=file.json] [--lang=ko|en|vn|ch|jp] [--all]
//   (chạy từ thư mục ROOT của repo để dotenv đọc đúng .env)
//
//   --out=<path>   Ghi kết quả JSON đầy đủ (toàn bộ cột) ra file thay vì chỉ in bảng rút gọn ra console.
//   --lang=<code>  Chọn cột tên hiển thị theo ngôn ngữ cho bảng rút gọn (mặc định vn). ko/en/vn/ch/jp.
//   --all          In toàn bộ 289+ dòng ra console thay vì chỉ 40 dòng đầu.
import "dotenv/config";
import oracledb from "oracledb";
import fs from "node:fs";

oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v ?? true];
  })
);

const LANG_COLUMN = {
  ko: "SUB2_NAME_KO",
  en: "SUB2_NAME_EN",
  vn: "SUB2_NAME_VN",
  ch: "SUB2_NAME_CH",
  jp: "SUB2_NAME_JP",
}[args.lang || "vn"] || "SUB2_NAME_VN";

async function main() {
  const conn = await oracledb.getConnection({
    user: process.env.ORACLE_USER,
    password: process.env.ORACLE_PASSWORD,
    connectString: `${process.env.ORACLE_HOST}:${process.env.ORACLE_PORT}/${process.env.ORACLE_SERVICE_NAME}`,
  });

  try {
    const result = await conn.execute(
      `SELECT MAIN_ID, SUB1_ID, SUB2_ID,
              SUB2_NAME, SUB2_NAME_KO, SUB2_NAME_EN, SUB2_NAME_CH, SUB2_NAME_JP, SUB2_NAME_VN,
              PAGE_URL, USE_YN, HPOINT, IO_GUBUN, RMKS
       FROM PZTB_MENU
       WHERE USE_YN = 'Y'
       ORDER BY MAIN_ID, SUB1_ID, SUB2_ID`
    );
    const rows = result.rows ?? [];

    if (args.out) {
      fs.writeFileSync(args.out, JSON.stringify(rows, null, 2), "utf-8");
      console.log(`Đã ghi ${rows.length} menu vào ${args.out}`);
      return;
    }

    const preview = args.all ? rows : rows.slice(0, 40);
    console.table(
      preview.map((r) => ({
        MAIN: r.MAIN_ID,
        SUB1: r.SUB1_ID,
        SUB2: r.SUB2_ID,
        NAME: r[LANG_COLUMN] ?? r.SUB2_NAME,
        PAGE_URL: r.PAGE_URL ?? "",
      }))
    );
    console.log(`Tổng: ${rows.length} menu đang hoạt động (USE_YN='Y'). Dùng --out=file.json để xuất toàn bộ.`);
  } finally {
    await conn.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
