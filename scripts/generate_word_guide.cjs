/**
 * Generator script to create comprehensive Word System Guides in 3 languages:
 * - docs/PIMS_DASHBOARD_System_Guide_VN.docx
 * - docs/PIMS_DASHBOARD_System_Guide_EN.docx
 * - docs/PIMS_DASHBOARD_System_Guide_KR.docx
 */

const docx = require('docx');
const fs = require('fs');
const path = require('path');

const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  HeadingLevel,
  BorderStyle,
  AlignmentType,
  ShadingType
} = docx;

// Styling constants
const FONT_PRIMARY = "Arial";
const FONT_KR = "Malgun Gothic";
const COLOR_PRIMARY = "1A365D"; // Deep Navy
const COLOR_SECONDARY = "2B6CB0"; // Accent Blue
const COLOR_TEXT = "2D3748"; // Slate Charcoal
const COLOR_MUTED = "718096";
const COLOR_BG_HEADER = "EBF8FF"; // Very Light Blue
const COLOR_BG_ZEBRA = "F7FAFC";
const COLOR_BORDER = "CBD5E0";

function createCell(text, isHeader = false, isZebra = false, widthPct = null, bold = false) {
  return new TableCell({
    width: widthPct ? { size: widthPct, type: WidthType.PERCENTAGE } : undefined,
    shading: {
      type: ShadingType.CLEAR,
      fill: isHeader ? COLOR_BG_HEADER : (isZebra ? COLOR_BG_ZEBRA : "FFFFFF")
    },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: COLOR_BORDER },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: COLOR_BORDER },
      left: { style: BorderStyle.SINGLE, size: 1, color: COLOR_BORDER },
      right: { style: BorderStyle.SINGLE, size: 1, color: COLOR_BORDER }
    },
    margins: { top: 120, bottom: 120, left: 140, right: 140 },
    children: [
      new Paragraph({
        children: [
          new TextRun({
            text: text,
            bold: isHeader || bold,
            size: isHeader ? 19 : 18,
            color: isHeader ? COLOR_PRIMARY : COLOR_TEXT,
            font: FONT_PRIMARY
          })
        ]
      })
    ]
  });
}

function createSectionHeading(title, level = HeadingLevel.HEADING_1) {
  return new Paragraph({
    heading: level,
    spacing: { before: 360, after: 140 },
    children: [
      new TextRun({
        text: title,
        bold: true,
        size: level === HeadingLevel.HEADING_1 ? 30 : (level === HeadingLevel.HEADING_2 ? 24 : 20),
        color: level === HeadingLevel.HEADING_1 ? COLOR_PRIMARY : COLOR_SECONDARY,
        font: FONT_PRIMARY
      })
    ]
  });
}

function createParagraph(text, isBold = false) {
  return new Paragraph({
    spacing: { before: 80, after: 80 },
    children: [
      new TextRun({
        text: text,
        bold: isBold,
        size: 20,
        color: COLOR_TEXT,
        font: FONT_PRIMARY
      })
    ]
  });
}

function createBullet(text, boldPrefix = "") {
  const children = [];
  if (boldPrefix) {
    children.push(new TextRun({ text: boldPrefix + " ", bold: true, size: 20, color: COLOR_PRIMARY, font: FONT_PRIMARY }));
  }
  children.push(new TextRun({ text: text, size: 20, color: COLOR_TEXT, font: FONT_PRIMARY }));

  return new Paragraph({
    bullet: { level: 0 },
    spacing: { before: 60, after: 60 },
    children: children
  });
}

function generateDocx(lang) {
  const isEn = lang === 'EN';
  const isVn = lang === 'VN';

  const docTitle = isVn
    ? "HỆ THỐNG PIMS-DASHBOARD"
    : (isEn ? "PIMS-DASHBOARD" : "PIMS 대시보드 시스템");

  const docSubtitle = isVn
    ? "Tài Liệu Hướng Dẫn Vận Hành & Đặc Tả Nguồn Dữ Liệu Tích Hợp"
    : (isEn
        ? "Comprehensive System Specification & User Operations Manual"
        : "시스템 지표별 데이터 연동 출처 및 사용자 운영 가이드");

  const docStandard = isVn
    ? "Tiêu chuẩn Chuẩn hóa 2026 | Chi tiết Đồng bộ PIMSVINA ERP, Tải lên Excel & Nhập tay Trực tiếp"
    : (isEn
        ? "Standard Baseline 2026 | Covers Data Lineage, ERP Sync, Excel Upload & Manual Entry"
        : "2026 공식 기준 명세서 | PIMSVINA ERP 자동 연동, 엑셀 일괄 업로드 및 수기 입력 총괄");

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: (!isEn && !isVn) ? FONT_KR : FONT_PRIMARY,
            color: COLOR_TEXT
          }
        }
      }
    },
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 }
          }
        },
        children: [
          // Header
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 200, after: 100 },
            children: [
              new TextRun({
                text: docTitle,
                bold: true,
                size: 40,
                color: COLOR_PRIMARY,
                font: FONT_PRIMARY
              })
            ]
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 0, after: 300 },
            children: [
              new TextRun({
                text: docSubtitle,
                size: 24,
                color: COLOR_SECONDARY,
                font: FONT_PRIMARY
              })
            ]
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 0, after: 400 },
            children: [
              new TextRun({
                text: docStandard,
                italics: true,
                size: 18,
                color: COLOR_MUTED,
                font: FONT_PRIMARY
              })
            ]
          }),

          // Section 1: Overview
          createSectionHeading(
            isVn
              ? "1. Tổng Quan Hệ Thống & Cơ Chế Thu Thập Dữ Liệu"
              : (isEn ? "1. System Overview & Architecture" : "1. 시스템 개요 및 데이터 아키텍처")
          ),
          createParagraph(
            isVn
              ? "PIMS-DASHBOARD là hệ thống thông tin quản trị và phân tích dữ liệu kinh doanh (BI) dành riêng cho DECV. Hệ thống kết nối chặt chẽ với ERP PIMSVINA để tổng hợp kết quả kinh doanh, tình hình thi công dự án, dòng tiền và chi phí nhà thầu phụ lên màn hình thời gian thực trực quan."
              : (isEn
                  ? "PIMS-DASHBOARD is an integrated executive business intelligence platform designed for DECV. It consolidates management reports, project construction tracking, cash flows, and subcontracting performance from the core PIMSVINA ERP system into real-time, actionable dashboards."
                  : "PIMS-DASHBOARD는 DECV의 경영실적, 시공 및 용역 프로젝트 현황, 자금수지, 외주 집행 실적을 종합적으로 모니터링하고 분석하기 위해 구축된 통합 비즈니스 인텔리전스 대시보드 시스템입니다. PIMSVINA ERP 시스템과 긴밀히 연계되어 실시간 데이터를 제공합니다.")
          ),
          createParagraph(
            isVn
              ? "Để đảm bảo tính chính xác, an toàn dữ liệu và tối ưu hiệu suất vận hành, dữ liệu của PIMS-DASHBOARD được nạp qua 3 kênh tiêu chuẩn:"
              : (isEn
                  ? "To ensure data accuracy, timeliness, and operational security, data flows into PIMS-DASHBOARD through three standardized channels:"
                  : "대시보드의 데이터는 정확성과 보안성, 실무 편의성을 확보하기 위해 다음 세 가지 경로를 통해 수집 및 반영됩니다:")
          ),
          createBullet(
            isVn
              ? "Truy vấn an toàn chỉ đọc (Read-only) trực tiếp từ Oracle DB PIMSVINA. Quản trị viên bấm 'PIMS Sync' trên thanh công cụ để xem trước thay đổi (Preview) trước khi xác nhận lưu vào Dashboard DB."
              : (isEn
                  ? "Automated Oracle database extraction using safe read-only queries. System administrators can inspect changes in a Preview Modal before committing updates to the live dashboard database."
                  : "안전한 Oracle DB 읽기 전용(Read-only) 쿼리를 통해 도급액, 실적 공정률, CBS 예산/실적, 외주 기성, 자금수지, 현장 사진 등을 가져오며, 관리자가 변경 사항을 미리보기(Preview)한 후 확정 반영합니다."),
            isVn ? "1. 🔄 Đồng bộ ERP Tự động (PIMSVINA Sync):" : (isEn ? "1. 🔄 Automated ERP Sync (PIMSVINA):" : "1. 🔄 PIMSVINA ERP 자동 동기화:")
          ),
          createBullet(
            isVn
              ? "Tải lên các file Excel báo cáo quản trị tổng thể (Doanh thu, Lợi nhuận gộp, Chi phí QLDN, Lợi nhuận kinh doanh, Hợp đồng mới) và File Dòng tiền. Hệ thống tự động lưu bản sao lưu (Snapshot) cho phép hoàn tác (Rollback) 1-click."
              : (isEn
                  ? "Bulk monthly workbook imports for corporate management P&L and cash flow sheets. Features built-in version snapshots allowing 1-click rollback to any previous upload state."
                  : "전사 경영보고서(매출, 매출이익, 판관비, 영업이익, 신규수주) 및 자금수지 엑셀 파일을 관리자 화면에서 업로드하여 대용량 데이터를 일괄 반영하며, 이전 버전 롤백(Rollback) 이력을 지원합니다."),
            isVn ? "2. 📤 Tải lên File Excel Định kỳ:" : (isEn ? "2. 📤 Excel File Upload:" : "2. 📤 엑셀 파일 일괄 업로드:")
          ),
          createBullet(
            isVn
              ? "Nhập trực tiếp trên giao diện web tại Tab 'Nhập dữ liệu dự án' (Project Data Entry) và các Modal quản trị (Tỷ giá USD/VND/KRW, Thông số kỹ thuật dự án, Kế hoạch chi phí theo tổ đội, Tiến độ kế hoạch, Nhận xét của Ban Giám đốc)."
              : (isEn
                  ? "Direct web input via the Project Data Entry tab and navigation header modals for parameters like exchange rates (USD/VND/KRW), project qualitative metadata, planned schedules, and qualitative management commentary."
                  : "기준 환율 설정(USD/VND/KRW), 프로젝트 일반 제원(규모, 발주처, 연면적 등), 공종별 원가 투입 계획, 마일스톤, 경영진 실적 분석 및 향후 전망 코멘트 등을 웹 화면에서 직접 입력하고 자동 저장합니다."),
            isVn ? "3. ✍️ Nhập tay Trực tiếp trên Giao diện:" : (isEn ? "3. ✍️ Direct Manual Entry:" : "3. ✍️ 화면 직접 수기 입력:")
          ),

          // Section 2: Data Lineage Matrix Table
          createSectionHeading(
            isVn
              ? "2. Ma Trận Đối Soát Chỉ Tiêu & Nguồn Dữ Liệu Chi Tiết"
              : (isEn ? "2. Indicator & Data Lineage Mapping Matrix" : "2. 지표별 데이터 연동 출처 매핑 매트릭스")
          ),
          createParagraph(
            isVn
              ? "Bảng đối soát sau đây quy định rõ từng chỉ tiêu trên Dashboard tương ứng với Menu nào, màn hình UI nào trên PIMSVINA ERP, bảng dữ liệu Oracle và cơ chế nạp:"
              : (isEn
                  ? "The table below specifies the exact origin, ERP screen mapping, underlying database source, and calculation logic for each indicator across the dashboard."
                  : "다음 표는 대시보드 내 각 화면 및 위젯별 지표가 PIMSVINA ERP의 어떤 메뉴/화면에서 조회되고, 어떤 데이터베이스 테이블 및 산출 로직을 통해 생성되는지 상세히 정의합니다.")
          ),

          // Lineage Table
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  createCell(isVn ? "Màn Hình / Phân Hệ" : (isEn ? "Module / Screen" : "대시보드 모듈"), true, false, 18),
                  createCell(isVn ? "Tên Chỉ Tiêu Dashboard" : (isEn ? "Indicator Name" : "지표명"), true, false, 20),
                  createCell(isVn ? "Cơ Chế Nạp" : (isEn ? "Input Type" : "입력 구분"), true, false, 14),
                  createCell(isVn ? "Menu & Màn Hình PIMSVINA ERP" : (isEn ? "PIMSVINA ERP Menu & UI" : "PIMSVINA 연동 메뉴 및 화면"), true, false, 24),
                  createCell(isVn ? "Bảng Dữ Liệu & Quy Tắc Tính" : (isEn ? "DB Source & Logic" : "DB 테이블 및 산출 로직"), true, false, 24)
                ]
              }),
              // Row 1
              new TableRow({
                children: [
                  createCell(isVn ? "Dashboard Toàn Công Ty\n(Màn Hình Tổng Quan)" : (isEn ? "Company Dashboard\n(Main Overview)" : "전체 관리 대시보드\n(종합 현황)")),
                  createCell(isVn ? "Doanh thu & Lợi nhuận KD lũy kế (YTD)" : (isEn ? "YTD Revenue & Operating Profit" : "당월 누적 매출 및 영업이익")),
                  createCell(isVn ? "📤 Tải lên Excel" : (isEn ? "📤 Excel Upload" : "📤 엑셀 업로드"), false, false, null, true),
                  createCell(isVn ? "Đăng ký kết quả KD hàng tháng\n(월별경영실적등록)" : (isEn ? "Monthly Management Performance Registration" : "월별경영실적등록\n(경영보고서 엑셀 매출/영업이익)")),
                  createCell(isVn ? "mr_monthly_amounts\n(Cộng dồn tháng 1 -> tháng chuẩn M)" : (isEn ? "mr_monthly_amounts\n(Sum m01 to reference month M)" : "mr_monthly_amounts\n(기준월 M까지의 월별 합계)"))
                ]
              }),
              // Row 2
              new TableRow({
                children: [
                  createCell(isVn ? "Dashboard Toàn Công Ty\n(Biểu Đồ & Thẻ Widget)" : (isEn ? "Company Dashboard\n(Charts & Widgets)" : "전체 관리 대시보드\n(차트 및 현황)")),
                  createCell(isVn ? "Doanh thu năm & Tỷ lệ trúng thầu" : (isEn ? "Full-Year Revenue & Orders Donut" : "연간 매출 및 수주 실적")),
                  createCell(isVn ? "📤 Tải lên Excel" : (isEn ? "📤 Excel Upload" : "📤 엑셀 업로드"), false, true, null, true),
                  createCell(isVn ? "Báo cáo quản trị tổng thể hàng tháng\n(연간 매출 및 신규 수주 라인)" : (isEn ? "Monthly Management Performance Registration\n(Annual target/orders)" : "월별경영실적등록\n(연간 목표 및 수주 라인)")),
                  createCell(isVn ? "mr_annual_amounts\n(Kế hoạch vs Dự báo cả năm)" : (isEn ? "mr_annual_amounts\n(plan_total vs actual_total)" : "mr_annual_amounts\n(연간 계획 대비 실적)"))
                ]
              }),
              // Row 3
              new TableRow({
                children: [
                  createCell(isVn ? "Dashboard Toàn Công Ty\n(Khung Nhận Xét Dưới Cùng)" : (isEn ? "Company Dashboard\n(Bottom Comments)" : "전체 관리 대시보드\n(하단 코멘트)")),
                  createCell(isVn ? "Phân tích kết quả & Triển vọng" : (isEn ? "Performance Analysis & Outlook" : "실적 분석 및 향후 전망 코멘트")),
                  createCell(isVn ? "✍️ Nhập tay" : (isEn ? "✍️ Manual Entry" : "✍️ 수기 직접입력"), false, false, null, true),
                  createCell(isVn ? "Khung Comment Dashboard\n(Quản trị viên chỉnh sửa trực tiếp)" : (isEn ? "Dashboard Comment Panel\n(Admin Inline Editor)" : "대시보드 코멘트 패널\n(관리자 직접 작성)")),
                  createCell(isVn ? "mr_comments\n(Lưu theo năm và tháng báo cáo)" : (isEn ? "mr_comments\n(PUT /api/mgmtreport/comments)" : "mr_comments\n(월별/연도별 코멘트 저장)"))
                ]
              }),
              // Row 4
              new TableRow({
                children: [
                  createCell(isVn ? "Chi Tiết Dự Án Xây Dựng\n(Tab Khái Yếu)" : (isEn ? "Project Detail\n(Overview Tab)" : "시공 프로젝트 상세\n(개요 탭)")),
                  createCell(isVn ? "Giá trị gói thầu / Hợp đồng (VND)" : (isEn ? "Contract Amount (VND)" : "도급액 (VND)")),
                  createCell(isVn ? "🔄 Đồng bộ ERP" : (isEn ? "🔄 ERP Sync" : "🔄 ERP 자동동기화"), false, true, null, true),
                  createCell(isVn ? "Đăng ký khái yếu công trình > Hợp đồng\n(공사개요등록 / TOTALCTRTWONAMT)" : (isEn ? "Construction Overview Registration\n(TOTALCTRTWONAMT)" : "공사개요등록 / 도급계약관리\n(도급합계금액)")),
                  createCell(isVn ? "CBTB_CTRTSUMM.TOTALCTRTWONAMT\nqua dashboard_pd_overview_1q.jsp" : (isEn ? "CBTB_CTRTSUMM.TOTALCTRTWONAMT\nvia dashboard_pd_overview_1q.jsp" : "CBTB_CTRTSUMM.TOTALCTRTWONAMT\n(JSP 조회 후 pd_overview 저장)"))
                ]
              }),
              // Row 5
              new TableRow({
                children: [
                  createCell(isVn ? "Chi Tiết Dự Án Xây Dựng\n(Tab Khái Yếu)" : (isEn ? "Project Detail\n(Overview Tab)" : "시공 프로젝트 상세\n(개요 탭)")),
                  createCell(isVn ? "Thời gian thi công (Khởi công - Hoàn thành)" : (isEn ? "Construction Period\n(Start & End Date)" : "공사기간 (착공일 ~ 준공일)")),
                  createCell(isVn ? "🔄 Đồng bộ ERP" : (isEn ? "🔄 ERP Sync" : "🔄 ERP 자동동기화"), false, false, null, true),
                  createCell(isVn ? "Khái yếu công trình > Thời gian thi công\n(STCONSTDATE / CMPLSCHDDATE)" : (isEn ? "Construction Overview Registration > Period\n(STCONSTDATE / CMPLSCHDDATE)" : "공사개요등록 > 공사기간\n(실착공일 / 실준공예정일)")),
                  createCell(isVn ? "CBTB_CONSTPERIOD (Số lần CHGSEQ mới nhất)\nƯu tiên ngày thực tế, fallback ngày HĐ" : (isEn ? "CBTB_CONSTPERIOD (latest CHGSEQ)\nFallback to CTRTSTDATE/EDDATE" : "CBTB_CONSTPERIOD 최신 차수\n(미등록 시 계약일자 폴백)"))
                ]
              }),
              // Row 6
              new TableRow({
                children: [
                  createCell(isVn ? "Chi Tiết Dự Án Xây Dựng\n(Tab Khái Yếu)" : (isEn ? "Project Detail\n(Overview Tab)" : "시공 프로젝트 상세\n(개요 탭)")),
                  createCell(isVn ? "Quy cách kỹ thuật (Quy mô, Chủ ĐT, DT sàn)" : (isEn ? "Project Specifications\n(Scale, Area, Purpose, Terms)" : "프로젝트 일반제원\n(공사규모, 연면적, 용도, 보증)")),
                  createCell(isVn ? "✍️ Nhập tay" : (isEn ? "✍️ Manual Entry" : "✍️ 수기 직접입력"), false, true, null, true),
                  createCell(isVn ? "Tab Nhập dữ liệu dự án > 0. Khái yếu" : (isEn ? "Data Entry Tab > 0. Overview" : "데이터 입력 탭 > 0. 개요 정보")),
                  createCell(isVn ? "Bảng pd_overview\n(Quản trị viên cập nhật trực tiếp)" : (isEn ? "pd_overview table\n(Saved via PUT /api/projectdetail)" : "pd_overview 테이블\n(현장별 입력값 영속 저장)"))
                ]
              }),
              // Row 7
              new TableRow({
                children: [
                  createCell(isVn ? "Chi Tiết Dự Án Xây Dựng\n(Tab Tiến Độ)" : (isEn ? "Project Detail\n(Progress Tab)" : "시공 프로젝트 상세\n(공정 탭)")),
                  createCell(isVn ? "Tiến độ thực tế hàng tháng (%)" : (isEn ? "Monthly Actual Progress (%)" : "월별 실적 공정률 (%)")),
                  createCell(isVn ? "🔄 Đồng bộ ERP" : (isEn ? "🔄 ERP Sync" : "🔄 ERP 자동동기화"), false, false, null, true),
                  createCell(isVn ? "Tỷ lệ tiến độ chi phí (%)\n(원가공정율 / 시행기성)" : (isEn ? "Cost Progress Rate (%)\nExecution Progress (Site)" : "원가공정율(%) / 시행기성(현장)\n(비목별 투입 원가)")),
                  createCell(isVn ? "CHTB_PFMCOSTRMRK & CETB_PFMCTRTHIST\nCông thức: Chi phí / (Ngân sách - Lệch)" : (isEn ? "CHTB_PFMCOSTRMRK & CETB_PFMCTRTHIST\nFormula: SUM_COST / (BDGT - DIFF)" : "CHTB_PFMCOSTRMRK & CETB_PFMCTRTHIST\n공식: 투입원가 / (실행예산 - 결의차액)"))
                ]
              }),
              // Row 8
              new TableRow({
                children: [
                  createCell(isVn ? "Chi Tiết Dự Án Xây Dựng\n(Tab Tiến Độ)" : (isEn ? "Project Detail\n(Progress Tab)" : "시공 프로젝트 상세\n(공정 탭)")),
                  createCell(isVn ? "Tiến độ kế hoạch & Mốc mốc tiến độ" : (isEn ? "Monthly Plan Progress & Milestones" : "월별 계획 공정률 및 마일스톤")),
                  createCell(isVn ? "✍️ Nhập tay\n(File Excel)" : (isEn ? "✍️ Manual Entry\n(Excel Template)" : "✍️ 수기 직접입력\n(엑셀 템플릿 지원)"), false, true, null, true),
                  createCell(isVn ? "Tab Nhập dữ liệu > 1. Tiến độ / 2. Mốc tiến độ" : (isEn ? "Data Entry Tab > 1. Progress / 2. Milestones" : "데이터 입력 탭 > 1. 공정률 / 2. 마일스톤")),
                  createCell(isVn ? "pd_progress_monthly.plan_pct\npd_milestones (Hỗ trợ upload Excel)" : (isEn ? "pd_progress_monthly.plan_pct\npd_milestones (Excel upload supported)" : "pd_progress_monthly.plan_pct\npd_milestones (마일스톤 엑셀 일괄 업로드)"))
                ]
              }),
              // Row 9
              new TableRow({
                children: [
                  createCell(isVn ? "Chi Tiết Dự Án Xây Dựng\n(Tab Doanh Thu/Giá Vốn)" : (isEn ? "Project Detail\n(Sale/Profit Tab)" : "시공 프로젝트 상세\n(매출/원가 탭)")),
                  createCell(isVn ? "Tỷ lệ giá vốn (Ngân sách & Ước hoàn thành)" : (isEn ? "Cost Rate Setup\n(Execution & Completion)" : "원가율 설정\n(실행예산 및 준공추정)")),
                  createCell(isVn ? "🔄 Đồng bộ ERP" : (isEn ? "🔄 ERP Sync" : "🔄 ERP 자동동기화"), false, false, null, true),
                  createCell(isVn ? "Màn hình Báo cáo Quyết toán Tỷ lệ Chi phí\n(Business Budget REC7, Gross Profit REC9)" : (isEn ? "Settlement Ratio Cost Screen\n(Business Budget, Gross Profit %)" : "정산원가율 리포트 화면\n(사업예산 REC7, 매출이익율 REC9)")),
                  createCell(isVn ? "ch_cost_settle_ratio_q_1q.jsp\nLưu giá trị gốc VND & lịch sử các tháng" : (isEn ? "ch_cost_settle_ratio_q_1q.jsp\nExact VND amounts & historical months" : "ch_cost_settle_ratio_q_1q.jsp\n(VND 원본 및 전 월별 이력 저장)"))
                ]
              }),
              // Row 10
              new TableRow({
                children: [
                  createCell(isVn ? "Chi Tiết Dự Án Xây Dựng\n(Tab Thầu Phụ / Thuê Ngoài)" : (isEn ? "Project Detail\n(Outsourcing Tab)" : "시공 프로젝트 상세\n(외주 탭)")),
                  createCell(isVn ? "Danh sách HĐ thầu phụ & Giá trị nghiệm thu" : (isEn ? "Subcontract List & Monthly Progress" : "외주 계약 및 월별 기성 실적")),
                  createCell(isVn ? "🔄 Đồng bộ ERP" : (isEn ? "🔄 ERP Sync" : "🔄 ERP 자동동기화"), false, true, null, true),
                  createCell(isVn ? "Tiến độ thanh toán thi hành (Công trường)\n(시행기성 / Đăng ký chi tiết BOQ)" : (isEn ? "Execution Progress (Site)\nRequest Execution Resolution" : "시행기성(현장) / (외주)내역입찰\n(도급예산, 실행예산, 결의금액, 당월/누계기성)")),
                  createCell(isVn ? "CDTB_ORDCONTTYPE, CETB_PFMCTRTHIST\nCETB_PFMSCHDHIST qua dashboard_pd_outsourcing" : (isEn ? "CDTB_ORDCONTTYPE, CETB_PFMCTRTHIST\nCETB_PFMSCHDHIST via dashboard_pd_outsourcing" : "CDTB_ORDCONTTYPE, CETB_PFMCTRTHIST\n(VND 원본 저장으로 환율 왜곡 방지)"))
                ]
              }),
              // Row 11
              new TableRow({
                children: [
                  createCell(isVn ? "Chi Tiết Dự Án Xây Dựng\n(Tab Chi Phí / CBS)" : (isEn ? "Project Detail\n(Costing Tab)" : "시공 프로젝트 상세\n(비용 탭)")),
                  createCell(isVn ? "Tình hình giải ngân theo cây chi phí CBS" : (isEn ? "CBS Budget Execution\n(Direct / Indirect / Contingency)" : "CBS 비목별 예산 집행 현황\n(직접비, 간접비, 예비비)")),
                  createCell(isVn ? "🔄 Đồng bộ ERP" : (isEn ? "🔄 ERP Sync" : "🔄 ERP 자동동기화"), false, false, null, true),
                  createCell(isVn ? "Tờ trình ngân sách thực hiện > Chi tiết chi phí\n(실행예산품의서 / 비목별 원가투입 현황)" : (isEn ? "Execution Budget Proposal > Breakdown\nCost Input Status by Execution Details" : "실행예산품의서 / 비목별 원가투입 현황\n(표준 CBS 트리 분류)")),
                  createCell(isVn ? "CATB_STNDCBS & CHTB_PFMCOSTRMRK\nTrực tiếp (Thầu phụ/Chung/CP1), Gián tiếp (CP2)" : (isEn ? "CATB_STNDCBS & CHTB_PFMCOSTRMRK\nDirect(Outsourcing/Common/Exp1), Indirect(Exp2)" : "CATB_STNDCBS & CHTB_PFMCOSTRMRK\n(표준 CBS 잎사귀 노드 기반 100% 일치 매핑)"))
                ]
              }),
              // Row 12
              new TableRow({
                children: [
                  createCell(isVn ? "Chi Tiết Dự Án Xây Dựng\n(Tab Dòng Tiền)" : (isEn ? "Project Detail\n(Cash Flow Tab)" : "시공 프로젝트 상세\n(자금수지 탭)")),
                  createCell(isVn ? "Dòng tiền dự án (Thu, Chi, Số dư)" : (isEn ? "Project Monthly Cash Flow" : "프로젝트 월별 자금 입출금")),
                  createCell(isVn ? "🔄 Đồng bộ ERP" : (isEn ? "🔄 ERP Sync" : "🔄 ERP 자동동기화"), false, true, null, true),
                  createCell(isVn ? "Biến động quỹ công trường (Tiền mặt/Tiền gửi)\n(1.현장자금변동 / CFTB_CFTRANSACTION)" : (isEn ? "1. Site Fund Movement (Cash / Bank)\nCash Flow Transactions" : "1.현장자금변동(현금/예금)\n(입금, 출금, 기초잔액)")),
                  createCell(isVn ? "CFTB_CFTRANSACTION, CFTB_OPENINGBALANCE\nFallback dữ liệu excel dòng tiền nếu chưa có" : (isEn ? "CFTB_CFTRANSACTION, CFTB_OPENINGBALANCE\nFallback to uploaded CF excel if missing" : "CFTB_CFTRANSACTION, CFTB_OPENINGBALANCE\n(ERP 미등록 시 자금수지 엑셀 데이터 사전채움)"))
                ]
              })
            ]
          }),

          // Section 3: User Operations Guide
          createSectionHeading(
            isVn
              ? "3. Hướng Dẫn Vận Hành Từng Màn Hình Cho Người Dùng"
              : (isEn ? "3. User Operations Guide by Screen" : "3. 화면별 사용자 조작 및 활용 가이드")
          ),
          createParagraph(
            isVn
              ? "Phần này hướng dẫn các thao tác thực tế dành cho người dùng theo dõi và quản trị viên hệ thống:"
              : (isEn
                  ? "This section provides step-by-step instructions for everyday users, project managers, and system administrators."
                  : "본 섹션은 일반 사용자, 현장 관리자, 시스템 관리자가 대시보드를 효과적으로 활용할 수 있도록 주요 기능별 조작 방법을 안내합니다.")
          ),

          createSectionHeading(
            isVn ? "3.1 Bộ Lọc Toàn Cục & Thanh Điều Hướng Trên Cùng" : (isEn ? "3.1 Global Filter & Navigation Bar" : "3.1 글로벌 필터 및 상단 네비게이션 바"),
            HeadingLevel.HEADING_2
          ),
          createBullet(
            isVn
              ? "Nhấp chọn giữa Toàn công ty (DECV TOTAL), Khối Xây dựng (시공), Khối Dịch vụ (용역), hoặc lọc theo trạng thái dự án (Đang thực hiện / Đã kết thúc) ở thanh cây thư mục bên trái."
              : (isEn
                  ? "Select between Company Total ('전체'), Construction Division ('시공'), Service Division ('용역'), or filter by project lifecycle status ('진행중' In-Progress / '종료' Completed)."
                  : "좌측 사이드바에서 전체 집계(전체), 시공 부문 합계(시공), 용역 부문 합계(용역)를 선택하거나, 진행중/종료 상태별 필터를 클릭하여 분석 범위를 즉시 전환할 수 있습니다."),
            isVn ? "Chọn Phạm Vi (Scope):" : (isEn ? "Scope Filtering:" : "조회 범위(Scope) 필터:")
          ),
          createBullet(
            isVn
              ? "Chọn khoảng tháng bắt đầu và kết thúc để xem lịch sử. Thiết lập tháng chốt sổ quản trị để xác định ranh giới giữa số Thực tế và số Dự báo."
              : (isEn
                  ? "Change Start and End Year-Month pickers to evaluate historical trends. Set reference closing month to align with accounting cutoff schedules."
                  : "조회 시작월과 종료월을 선택하여 원하는 기간의 추이를 조회할 수 있습니다. 마감 기준월 설정을 통해 회계 마감 일정에 맞춘 실적/전망 경계를 관리합니다."),
            isVn ? "Chọn Kỳ Báo Cáo:" : (isEn ? "Period Selection:" : "조회 기간 설정:")
          ),
          createBullet(
            isVn
              ? "Chuyển đổi tức thì giữa USD, KRW và VND. Nút gạt Đơn vị (Unit K: Nghìn USD/Tỷ VND vs Unit 1: Đầy đủ) giúp hiển thị linh hoạt từ cấp lãnh đạo đến chi tiết kế toán."
              : (isEn
                  ? "Instant conversion between USD, KRW, and VND. Toggle Unit (Unit K: Thousand USD/Bil VND vs Unit 1: Full Currency) for high-level vs granular precision."
                  : "USD, KRW, VND 버튼을 클릭하여 전체 대시보드 통화를 즉시 환산할 수 있습니다. 단위 토글(Unit K / 1)을 통해 요약 단위(천 USD/십억 VND)와 상세 원화/달러 금액을 전환합니다."),
            isVn ? "Chuyển Đổi Tiền Tệ & Đơn Vị:" : (isEn ? "Currency & Unit Toggle:" : "통화 및 단위 전환:")
          ),
          createBullet(
            isVn
              ? "Tải toàn bộ báo cáo Dashboard đang xem ra file Excel chuẩn hoặc file in PDF chất lượng cao tại menu 'Download' góc trên bên phải."
              : (isEn
                  ? "Download the full active dashboard view into formatted Excel workbooks or high-resolution PDF printouts via the top right Download menu."
                  : "상단 우측의 '다운로드' 메뉴를 통해 현재 필터가 적용된 전체 화면을 고품질 엑셀(.xlsx) 보고서 또는 PDF(.pdf) 문서로 즉시 출력할 수 있습니다."),
            isVn ? "Xuất Báo Cáo:" : (isEn ? "Export Reports:" : "보고서 내보내기:")
          ),

          createSectionHeading(
            isVn ? "3.2 Tab Nhập Dữ Liệu Dự Án (Dành Cho Quản Trị Viên)" : (isEn ? "3.2 Project Data Entry Tab (Admin Operations)" : "3.2 프로젝트 데이터 입력 탭 (관리자 전용)"),
            HeadingLevel.HEADING_2
          ),
          createParagraph(
            isVn
              ? "Tab Nhập dữ liệu chỉ hiển thị sau khi quản trị viên xác thực mật khẩu (nhấp vào logo PIMS góc dưới thanh menu bên trái). Cho phép tinh chỉnh các thông số nhập tay:"
              : (isEn
                  ? "The Data Entry tab is accessible exclusively to administrators (authenticated by clicking the bottom PIMS logo and entering the administrator password). It allows fine-grained manual adjustments and schedule configurations:"
                  : "데이터 입력 탭은 사이드바 하단 PIMS 로고를 클릭하여 관리자 인증을 완료한 사용자에게만 활성화되는 관리자 전용 기능입니다. 수기 제원 입력 및 공정표 관리를 수행합니다:")
          ),
          createBullet(
            isVn
              ? "Mỗi thẻ thông tin (Khái yếu, Tiến độ, Mốc tiến độ, Kế hoạch chi phí, Ngân sách, Thầu phụ, Dòng tiền) có nút 'Lưu' riêng và nút 'Khóa kỳ (Lock/Unlock)' nhằm ngăn chặn việc sửa nhầm số liệu của các kỳ đã khóa sổ."
              : (isEn
                  ? "Each card (Overview, Progress, Milestones, Cost Plan, Budget, Outsourcing, Cashflow) features an individual Save button and a Lock/Unlock button to freeze finalized accounting periods."
                  : "개요, 공정률, 마일스톤, 원가 계획, 예산집행, 외주, 자금수지 각 카드별로 개별 '저장' 버튼과 '마감(Lock/Unlock)' 버튼이 제공되어, 마감 완료된 항목의 오수정을 방지합니다."),
            isVn ? "Khóa Kỳ & Tự Động Lưu:" : (isEn ? "Section Locks & Auto-Save:" : "섹션별 마감 잠금 및 자동 저장:")
          ),
          createBullet(
            isVn
              ? "Tại thẻ Mốc tiến độ, nhấp 'Tải mẫu Excel', điền danh sách các mốc offline và bấm 'Upload Excel' để nhập hàng loạt cực kỳ nhanh chóng."
              : (isEn
                  ? "Download the pre-formatted Milestones Excel template, populate milestones offline, and upload for instant bulk population."
                  : "마일스톤 카드에서 'Excel 양식 다운로드' 후 오프라인에서 작성하고 'Excel 업로드'를 누르면 다수의 공정 마일스톤이 일괄 등록됩니다."),
            isVn ? "Nhập Mốc Tiến Độ Qua Excel:" : (isEn ? "Milestones Excel Template:" : "마일스톤 엑셀 일괄 등록:")
          ),
          createBullet(
            isVn
              ? "Các trường số tiền nhập theo nguyên giá VND thực tế của dự án. Hệ thống tự động áp dụng tỷ giá hợp đồng để quy đổi khi xem bằng USD hoặc KRW."
              : (isEn
                  ? "Enter raw monthly amounts directly in project currency (VND). The system automatically converts values based on contract exchange rates for multi-currency viewing."
                  : "원가 및 예산 금액은 현장 계약 통화인 VND 원본 기준으로 입력하며, 대시보드 표시 시 현장별 계약환율 및 기준환율에 따라 USD/KRW로 자동 변환됩니다."),
            isVn ? "Quy Tắc Tiền Tệ Nhập:" : (isEn ? "Currency Precision:" : "입력 통화 원칙:")
          ),

          createSectionHeading(
            isVn ? "3.3 Quy Trình 3 Bước Đồng Bộ Dữ Liệu ERP PIMSVINA" : (isEn ? "3.3 Automated ERP Synchronization Workflow" : "3.3 PIMSVINA ERP 자동 동기화 절차"),
            HeadingLevel.HEADING_2
          ),
          createParagraph(
            isVn
              ? "Khi có dữ liệu mới trên ERP cần cập nhật về Dashboard, quản trị viên thực hiện theo 3 bước an toàn tuyệt đối:"
              : (isEn
                  ? "To keep project details synchronized with the ERP while maintaining 100% data integrity, follow this standard procedure:"
                  : "PIMSVINA ERP의 최신 공사/외주/원가 정보를 대시보드에 반영할 때는 다음의 안전 절차를 따릅니다:")
          ),
          createBullet(
            isVn
              ? "Bấm nút 'PIMS 동기화' (PIMS Sync) trên thanh tiêu đề trên cùng. Hệ thống kết nối cơ sở dữ liệu Oracle qua kết nối chỉ đọc và truy vấn trạng thái mới nhất của tất cả dự án."
              : (isEn
                  ? "Click the 'PIMS Sync' button in the top header. The server connects to the Oracle database using read-only queries and retrieves the latest snapshots for all sites."
                  : "상단 헤더의 'PIMS 동기화' 버튼을 클릭합니다. 서버가 Oracle 데이터베이스에 읽기 전용으로 안전하게 접속하여 전 현장의 최신 스냅샷을 조회합니다."),
            isVn ? "Bước 1: Chạy Xem Trước (Preview):" : (isEn ? "Step 1: Trigger Preview:" : "1단계: 동기화 미리보기 실행:")
          ),
          createBullet(
            isVn
              ? "Cửa sổ Xem trước xuất hiện, hiển thị số lượng bản ghi mới/thay đổi của từng hạng mục (Khái yếu, Tiến độ, Thầu phụ, Dòng tiền, Chi phí, Tỷ lệ giá vốn)."
              : (isEn
                  ? "Review the Preview Modal displaying the record count, contract updates, and specific field differences across Overview, Progress, Outsourcing, Cost, and Cash Flow."
                  : "화면에 나타난 '동기화 미리보기' 팝업에서 개요, 공정률, 외주 계약, CBS 예산, 자금수지 등 항목별 변경 건수와 세부 변경 내용을 확인합니다."),
            isVn ? "Bước 2: Kiểm Tra Số Liệu Thay Đổi:" : (isEn ? "Step 2: Inspect Changes:" : "2단계: 변경 사항 사전 검토:")
          ),
          createBullet(
            isVn
              ? "Bấm nút 'Xác nhận (Confirm)' để áp dụng dữ liệu vào cơ sở dữ liệu Dashboard. Tất cả màn hình và biểu đồ sẽ cập nhật ngay lập tức mà không cần khởi động lại dịch vụ."
              : (isEn
                  ? "Click 'Confirm Sync' to commit changes into the dashboard database. All screens and charts update immediately without server restart."
                  : "변경 내역 확인 후 '반영(Confirm)' 버튼을 누르면 대시보드 DB에 안전하게 반영되며, 화면 새로고침 없이 즉시 최신 데이터가 반영됩니다."),
            isVn ? "Bước 3: Xác Nhận Cập Nhật:" : (isEn ? "Step 3: Confirm & Apply:" : "3단계: 확정 반영:")
          ),

          // Section 4: Maintenance & FAQ
          createSectionHeading(
            isVn ? "4. Câu Hỏi Thường Gặp & Xử Lý Sự Cố (FAQ)" : (isEn ? "4. Troubleshooting & Maintenance FAQ" : "4. 운영 유지보수 및 주요 FAQ")
          ),
          createBullet(
            isVn
              ? "Dữ liệu chi phí và thầu phụ được lưu trữ bằng số tiền VND gốc để tránh lệch tỷ giá. Hãy kiểm tra modal 'Cài đặt tỷ giá' (Fx Rate Editor) để đảm bảo tỷ giá quy đổi khớp với tỷ giá hợp đồng của dự án (CBTB_CTRTSUMM.RATEUSD)."
              : (isEn
                  ? "All synchronized cost and outsourcing figures are stored in raw VND. Discrepancies usually stem from differing exchange rate dates. Check the Fx Rate Editor to ensure exchange rates match the ERP's contract rates (CBTB_CTRTSUMM.RATEUSD)."
                  : "대시보드는 ERP 원본 데이터와 일치하도록 외주 및 원가 데이터를 VND 원본으로 저장합니다. 표시 금액에 차이가 있다면 '환율 설정' 모달에서 적용된 환율이 현장 계약환율과 일치하는지 확인하십시오."),
            isVn ? "H: Tại sao có sự chênh lệch nhỏ về tiền tệ so với ERP?" : (isEn ? "Q: Why do currency amounts slightly differ from ERP?" : "Q: ERP 화면과 금액 환산 차이가 발생하는 이유는 무엇인가요?")
          ),
          createBullet(
            isVn
              ? "Mở Modal Tải lên Báo cáo Quản trị, chọn tab 'Lịch sử tải lên' và bấm nút 'Hoàn tác (Rollback)' tại bản ghi mong muốn để khôi phục ngay trạng thái dữ liệu trước đó."
              : (isEn
                  ? "Open the Management Report Upload modal, select the 'Upload History' tab, and click 'Rollback' next to the previous version to restore prior records instantly."
                  : "경영보고 업로드 모달을 열고 '반영 이력 관리' 탭에서 직전 업로드 회차의 '되돌리기(Rollback)' 버튼을 클릭하면 즉시 이전 데이터 상태로 복구됩니다."),
            isVn ? "H: Nếu tải lên nhầm file Excel thì khôi phục thế nào?" : (isEn ? "Q: How do I recover if wrong Excel data was uploaded?" : "Q: 엑셀 파일이 잘못 업로드된 경우 어떻게 복구하나요?")
          ),
          createBullet(
            isVn
              ? "Hệ thống tự động liên kết mã dự án ERP (FLDCODE) với mã site Dashboard. Nếu là dự án mới mở, tiến trình đồng bộ sẽ tự động tạo dự án mới ở trạng thái 'Đang thực hiện' và hiển thị ngay trên thanh menu."
              : (isEn
                  ? "The system automatically matches ERP FLDCODE with dashboard site codes. If a project is new, the sync service automatically registers it under 'Ongoing' status and displays it on the sidebar."
                  : "동기화 서비스가 ERP의 현장코드(FLDCODE)를 자동 감지하여 매핑합니다. 신규 개설된 프로젝트인 경우 자동으로 '진행중' 프로젝트로 등록되어 사이드바에 즉시 노출됩니다."),
            isVn ? "H: Nếu dự án mới chưa thấy trên thanh menu thì làm sao?" : (isEn ? "Q: Why is a new project missing from the sidebar?" : "Q: 신규 프로젝트가 사이드바에 보이지 않으면 어떻게 해야 하나요?")
          )
        ]
      }
    ]
  });

  const outPath = path.resolve(`d:/code/PIMS-DASHBOARD/docs/PIMS_DASHBOARD_System_Guide_${lang}.docx`);
  return Packer.toBuffer(doc).then(buffer => {
    fs.writeFileSync(outPath, buffer);
    console.log(`Generated: ${outPath}`);
  });
}

async function main() {
  await generateDocx('VN');
  await generateDocx('EN');
  await generateDocx('KR');
  console.log('Word document generation (VN, EN, KR) completed successfully!');
}

main().catch(err => {
  console.error('Error generating Word docs:', err);
  process.exit(1);
});
