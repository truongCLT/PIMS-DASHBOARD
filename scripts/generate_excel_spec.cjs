/**
 * Generator script to create comprehensive Excel Data Mapping Specifications:
 * - docs/PIMS_DASHBOARD_System_Specification_EN.xlsx
 * - docs/PIMS_DASHBOARD_System_Specification_KR.xlsx
 * - docs/PIMS_DASHBOARD_System_Specification_VN.xlsx
 *
 * Sheet 1 (Data Lineage Matrix) is generated from the same LINEAGE_ROWS data
 * used by generate_word_guide.cjs's Section 2 table, so both documents stay
 * aligned with the user's hand-corrected reference EN docx (2026-10-06).
 */

const ExcelJS = require('exceljs');
const path = require('path');
const { TYPE, SCREEN, LINEAGE_ROWS } = require('./generate_word_guide.cjs');

async function generateExcel(lang) {
  const isEn = lang === 'EN';
  const isVn = lang === 'VN';
  const pick = (obj) => (isVn ? obj.vn : (isEn ? obj.en : obj.kr));
  const fontName = isEn || isVn ? 'Arial' : 'Malgun Gothic';

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "PIMS-DASHBOARD System";
  workbook.created = new Date();

  // Colors
  const NAVY = "1A365D";
  const BLUE_HEADER = "2B6CB0";
  const GRAY_BORDER = "CBD5E0";
  const WHITE = "FFFFFF";

  const t = {
    sheet1Name: isVn ? "Ma Trận Đối Soát" : (isEn ? "Data Lineage Matrix" : "데이터 연동 명세서"),
    sheet1Title: isVn
      ? "PIMS-DASHBOARD Ma Trận Nguồn Dữ Liệu & Tích Hợp Hệ Thống"
      : (isEn ? "PIMS-DASHBOARD System Data Origin & Integration Matrix" : "PIMS-DASHBOARD 시스템 지표별 데이터 연동 및 입력 출처 명세서"),
    colScreen: isVn ? "Màn Hình" : (isEn ? "Screen" : "화면"),
    colIndicator: isVn ? "Tên Chỉ Tiêu" : (isEn ? "Indicator Name" : "지표명"),
    colInputType: isVn ? "Cơ Chế Nạp" : (isEn ? "Input Type" : "입력 구분"),
    colMenu: isVn ? "Menu PIMSVINA" : (isEn ? "PIMSVINA Menu" : "PIMSVINA 메뉴"),
    colUi: isVn ? "Tên Màn Hình PIMSVINA (UI)" : (isEn ? "PIMSVINA name UI" : "PIMSVINA 화면명 (UI)"),
    sheet2Name: isVn ? "Tổng Hợp Phân Loại Nhập Liệu" : (isEn ? "Input Classification Summary" : "입력방식별 분류 요약"),
    sheet2Title: isVn
      ? "Tổng Hợp Phương Thức Nhập Dữ Liệu (Đồng Bộ / Tải Excel / Nhập Tay)"
      : (isEn ? "Summary of Data Entry Methods (Sync / Upload / Manual)" : "데이터 수집 및 입력 방식별 요약 분류"),
    colCategory: isVn ? "Phương Thức Thu Thập Dữ Liệu" : (isEn ? "Data Source Category" : "데이터 수집 방식"),
    colTraits: isVn ? "Đặc Điểm & Chu Kỳ Cập Nhật" : (isEn ? "Characteristics & Update Cycle" : "특징 및 갱신 주기"),
    colRole: isVn ? "Đơn Vị Phụ Trách" : (isEn ? "Responsible Role" : "담당 주체"),
    colTargets: isVn ? "Chỉ Tiêu & Màn Hình Áp Dụng" : (isEn ? "Applied Metrics & Screens" : "해당 지표 및 화면"),
  };

  // 1. Sheet: Data Lineage Matrix
  const sheet1 = workbook.addWorksheet(t.sheet1Name, {
    views: [{ state: 'frozen', ySplit: 2 }]
  });

  sheet1.columns = [
    { header: t.colScreen, key: "screen", width: 30 },
    { header: t.colIndicator, key: "indicator", width: 42 },
    { header: t.colInputType, key: "input_type", width: 18 },
    { header: t.colMenu, key: "menu", width: 42 },
    { header: t.colUi, key: "ui", width: 42 },
  ];

  sheet1.spliceRows(1, 0, [t.sheet1Title]);
  sheet1.mergeCells('A1:E1');
  const titleCell = sheet1.getCell('A1');
  titleCell.font = { name: fontName, size: 14, bold: true, color: { argb: WHITE } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  sheet1.getRow(1).height = 36;

  const headerRow = sheet1.getRow(2);
  headerRow.height = 28;
  headerRow.eachCell((cell) => {
    cell.font = { name: fontName, size: 10, bold: true, color: { argb: WHITE } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BLUE_HEADER } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: GRAY_BORDER } },
      bottom: { style: 'medium', color: { argb: NAVY } },
      left: { style: 'thin', color: { argb: GRAY_BORDER } },
      right: { style: 'thin', color: { argb: GRAY_BORDER } }
    };
  });

  LINEAGE_ROWS.forEach((item) => {
    const row = sheet1.addRow({
      screen: pick(item.screen),
      indicator: pick(item.indicator),
      input_type: pick(item.type),
      menu: item.menu,
      ui: item.ui,
    });

    row.height = 26;
    row.eachCell((cell, colNumber) => {
      cell.font = { name: fontName, size: 9.5 };
      cell.alignment = { vertical: 'middle', wrapText: true };
      cell.border = {
        top: { style: 'thin', color: { argb: GRAY_BORDER } },
        bottom: { style: 'thin', color: { argb: GRAY_BORDER } },
        left: { style: 'thin', color: { argb: GRAY_BORDER } },
        right: { style: 'thin', color: { argb: GRAY_BORDER } }
      };

      // Highlight input types
      if (colNumber === 3) {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        if (item.type === TYPE.ERP) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: "E6FFFA" } }; // Light Teal
          cell.font = { name: fontName, size: 9.5, bold: true, color: { argb: "234E52" } };
        } else if (item.type === TYPE.EXCEL) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: "EBF8FF" } }; // Light Blue
          cell.font = { name: fontName, size: 9.5, bold: true, color: { argb: "2A4365" } };
        } else if (item.type === TYPE.MANUAL) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: "FFFAF0" } }; // Light Amber
          cell.font = { name: fontName, size: 9.5, bold: true, color: { argb: "744210" } };
        } else {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: "F0FFF4" } }; // Light Green (mixed types)
          cell.font = { name: fontName, size: 9.5, bold: true, color: { argb: "22543D" } };
        }
      }
    });
  });

  // 2. Sheet: Classification Summary (input method summary)
  const sheet2 = workbook.addWorksheet(t.sheet2Name);
  sheet2.columns = [
    { header: t.colCategory, key: "category", width: 28 },
    { header: t.colTraits, key: "traits", width: 38 },
    { header: t.colRole, key: "role", width: 22 },
    { header: t.colTargets, key: "targets", width: 55 }
  ];

  sheet2.spliceRows(1, 0, [t.sheet2Title]);
  sheet2.mergeCells('A1:D1');
  const titleCell2 = sheet2.getCell('A1');
  titleCell2.font = { name: fontName, size: 14, bold: true, color: { argb: WHITE } };
  titleCell2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
  titleCell2.alignment = { vertical: 'middle', horizontal: 'center' };
  sheet2.getRow(1).height = 36;

  sheet2.getRow(2).height = 26;
  sheet2.getRow(2).eachCell((c) => {
    c.font = { name: fontName, size: 10, bold: true, color: { argb: WHITE } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BLUE_HEADER } };
    c.alignment = { vertical: 'middle', horizontal: 'center' };
    c.border = {
      top: { style: 'thin', color: { argb: GRAY_BORDER } },
      bottom: { style: 'medium', color: { argb: NAVY } },
      left: { style: 'thin', color: { argb: GRAY_BORDER } },
      right: { style: 'thin', color: { argb: GRAY_BORDER } }
    };
  });

  // Build target lists dynamically from LINEAGE_ROWS so the summary never drifts from the matrix.
  const byType = (predicate) => LINEAGE_ROWS.filter(predicate).map(r => pick(r.indicator)).join(isVn || isEn ? ", " : ", ");

  const summaryData = isEn ? [
    {
      category: "🔄 Automated Sync (PIMSVINA ERP)",
      traits: "Safe read-only Oracle DB extraction. Preview inspection before apply.",
      role: "System Admin (1-Click trigger)",
      targets: byType(r => r.type === TYPE.ERP || r.type === TYPE.MANUAL_ERP || r.type === TYPE.EXCEL_ERP)
    },
    {
      category: "📤 Excel File Upload",
      traits: "Bulk workbook upload via Admin modal with 1-click rollback history.",
      role: "Finance & Accounting / Admin",
      targets: byType(r => r.type === TYPE.EXCEL || r.type === TYPE.EXCEL_ERP)
    },
    {
      category: "✍️ Direct Manual Entry",
      traits: "Web UI inputs in Project Data Entry Tab and Header Modals with auto-save & section locks.",
      role: "Project Managers & System Admin",
      targets: byType(r => r.type === TYPE.MANUAL || r.type === TYPE.MANUAL_ERP)
    }
  ] : (isVn ? [
    {
      category: "🔄 Đồng bộ ERP Tự động (PIMSVINA)",
      traits: "Truy vấn Oracle DB an toàn chỉ đọc. Xem trước (Preview) trước khi xác nhận.",
      role: "Quản trị viên hệ thống (1-Click)",
      targets: byType(r => r.type === TYPE.ERP || r.type === TYPE.MANUAL_ERP || r.type === TYPE.EXCEL_ERP)
    },
    {
      category: "📤 Tải lên File Excel",
      traits: "Tải lên file Excel hàng loạt qua modal quản trị, có lịch sử hoàn tác (Rollback) 1-click.",
      role: "Phòng Tài chính - Kế toán / Quản trị viên",
      targets: byType(r => r.type === TYPE.EXCEL || r.type === TYPE.EXCEL_ERP)
    },
    {
      category: "✍️ Nhập tay Trực tiếp",
      traits: "Nhập liệu trên giao diện web tại Tab Nhập dữ liệu dự án và các Modal quản trị, tự động lưu & khóa theo từng mục.",
      role: "Quản lý dự án / Quản trị viên hệ thống",
      targets: byType(r => r.type === TYPE.MANUAL || r.type === TYPE.MANUAL_ERP)
    }
  ] : [
    {
      category: "🔄 ERP 자동 동기화 (PIMSVINA)",
      traits: "Oracle DB 안전 읽기전용 조회. 변경 사항 사전 검토(Preview) 후 1클릭 확정 반영.",
      role: "시스템 관리자 (버튼 실행)",
      targets: byType(r => r.type === TYPE.ERP || r.type === TYPE.MANUAL_ERP || r.type === TYPE.EXCEL_ERP)
    },
    {
      category: "📤 엑셀 파일 일괄 업로드",
      traits: "관리자 업로드 모달을 통한 대용량 엑셀 파싱 및 이전 상태 되돌리기(Rollback) 이력 관리.",
      role: "경영기획 / 재무팀 / 관리자",
      targets: byType(r => r.type === TYPE.EXCEL || r.type === TYPE.EXCEL_ERP)
    },
    {
      category: "✍️ 화면 직접 수기 입력",
      traits: "프로젝트 데이터 입력 탭 및 헤더 모달을 통한 실시간 웹 입력 (자동 저장 및 마감 잠금 지원).",
      role: "현장 관리자 / 시스템 관리자",
      targets: byType(r => r.type === TYPE.MANUAL || r.type === TYPE.MANUAL_ERP)
    }
  ]);

  summaryData.forEach((s) => {
    const row = sheet2.addRow(s);
    row.height = 48;
    row.eachCell((cell) => {
      cell.font = { name: fontName, size: 9.5 };
      cell.alignment = { vertical: 'middle', wrapText: true };
      cell.border = {
        top: { style: 'thin', color: { argb: GRAY_BORDER } },
        bottom: { style: 'thin', color: { argb: GRAY_BORDER } },
        left: { style: 'thin', color: { argb: GRAY_BORDER } },
        right: { style: 'thin', color: { argb: GRAY_BORDER } }
      };
    });
  });

  const outPath = path.resolve(`d:/code/PIMS-DASHBOARD/docs/PIMS_DASHBOARD_System_Specification_${lang}.xlsx`);
  await workbook.xlsx.writeFile(outPath);
  console.log(`Generated: ${outPath}`);
}

async function main() {
  await generateExcel('EN');
  await generateExcel('KR');
  await generateExcel('VN');
  console.log('Excel generation (EN, KR, VN) completed successfully!');
}

main().catch(err => {
  console.error('Error generating Excel:', err);
  process.exit(1);
});
