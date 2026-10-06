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

// Input type badges (icon + localized label), reused across the lineage matrix rows below.
const TYPE = {
  EXCEL: { en: "📤 Excel Upload", kr: "📤 엑셀 업로드", vn: "📤 Tải lên Excel" },
  ERP: { en: "🔄 ERP Sync", kr: "🔄 ERP 자동동기화", vn: "🔄 Đồng bộ ERP" },
  MANUAL: { en: "✍️ Manual Entry", kr: "✍️ 수기 직접입력", vn: "✍️ Nhập tay" },
  EXCEL_ERP: { en: "📤 Excel Upload, 🔄 ERP Sync", kr: "📤 엑셀 업로드, 🔄 ERP 자동동기화", vn: "📤 Tải lên Excel, 🔄 Đồng bộ ERP" },
  MANUAL_ERP: { en: "✍️ Manual Entry, 🔄 ERP Sync", kr: "✍️ 수기 직접입력, 🔄 ERP 자동동기화", vn: "✍️ Nhập tay, 🔄 Đồng bộ ERP" }
};

// Reusable screen/module labels for the lineage matrix (translated per language).
const SCREEN = {
  COMPANY_OVERVIEW: { en: "Company Dashboard - Main Overview", kr: "전체 관리 대시보드 (종합 현황)", vn: "Dashboard Toàn Công Ty - Tổng Quan" },
  COMPANY_CHARTS: { en: "Company Dashboard - Charts", kr: "전체 관리 대시보드 (차트)", vn: "Dashboard Toàn Công Ty - Biểu Đồ" },
  COMPANY_COMMENTS: { en: "Company Dashboard - Comments", kr: "전체 관리 대시보드 (코멘트)", vn: "Dashboard Toàn Công Ty - Nhận Xét" },
  CONS_OVERVIEW: { en: "Project Detail (Construction) - Overview Tab", kr: "시공 프로젝트 상세 (개요 탭)", vn: "Chi Tiết Dự Án (Xây Dựng) - Tab Khái Yếu" },
  CONS_PROGRESS: { en: "Project Detail (Construction) - Progress Tab", kr: "시공 프로젝트 상세 (공정 탭)", vn: "Chi Tiết Dự Án (Xây Dựng) - Tab Tiến Độ" },
  CONS_SALE_PROFIT: { en: "Project Detail (Construction) - Sale/Profit Tab", kr: "시공 프로젝트 상세 (매출/원가 탭)", vn: "Chi Tiết Dự Án (Xây Dựng) - Tab Doanh Thu/Giá Vốn" },
  CONS_OUTSOURCING: { en: "Project Detail (Construction) - Outsourcing Tab", kr: "시공 프로젝트 상세 (외주 탭)", vn: "Chi Tiết Dự Án (Xây Dựng) - Tab Thầu Phụ" },
  CONS_COSTING: { en: "Project Detail (Construction) - Costing Tab", kr: "시공 프로젝트 상세 (비용 탭)", vn: "Chi Tiết Dự Án (Xây Dựng) - Tab Chi Phí" },
  CONS_CASHFLOW: { en: "Project Detail (Construction) - Cash Flow Tab", kr: "시공 프로젝트 상세 (자금수지 탭)", vn: "Chi Tiết Dự Án (Xây Dựng) - Tab Dòng Tiền" },
  SVC_OVERVIEW: { en: "Project Detail (Service) - Overview & Sales", kr: "용역 프로젝트 상세 (개요 및 매출)", vn: "Chi Tiết Dự Án (Dịch Vụ) - Khái Yếu & Doanh Thu" },
  SVC_SALES_COGS: { en: "Project Detail (Service) - Sales & COGS Tab", kr: "용역 프로젝트 상세 (매출/원가 탭)", vn: "Chi Tiết Dự Án (Dịch Vụ) - Tab Doanh Thu/Giá Vốn" },
  SYSADMIN: { en: "System Administration - Data Sync & Imports", kr: "시스템 관리 (데이터 연동 및 업로드)", vn: "Quản Trị Hệ Thống - Đồng Bộ & Nạp Dữ Liệu" }
};

// Indicator & Data Lineage Mapping Matrix (Section 2), aligned 1:1 with the user's
// hand-corrected reference EN docx (2026-10-06). The "PIMSVINA Menu" and "PIMSVINA
// name UI" columns are literal ERP navigation breadcrumbs/UI labels and are kept
// identical across EN/KR/VN since they must match what appears on screen in PIMSVINA.
const LINEAGE_ROWS = [
  { screen: SCREEN.COMPANY_OVERVIEW, type: TYPE.EXCEL,
    indicator: { en: "YTD Revenue (Plan / Actual / Achievement Rate)", kr: "당월 누적 매출 (계획/실적/달성률)", vn: "Doanh thu lũy kế (Kế hoạch / Thực tế / Tỷ lệ đạt)" },
    menu: "", ui: "" },
  { screen: SCREEN.COMPANY_OVERVIEW, type: TYPE.EXCEL,
    indicator: { en: "YTD Operating Profit (Plan / Actual / Achievement Rate)", kr: "당월 누적 영업이익 (계획/실적/달성률)", vn: "Lợi nhuận kinh doanh lũy kế (Kế hoạch / Thực tế / Tỷ lệ đạt)" },
    menu: "", ui: "" },
  { screen: SCREEN.COMPANY_OVERVIEW, type: TYPE.EXCEL,
    indicator: { en: "Annual Revenue (Plan / Forecast / Achievement Rate)", kr: "연간 매출 (계획/전망/달성률)", vn: "Doanh thu cả năm (Kế hoạch / Dự báo / Tỷ lệ đạt)" },
    menu: "", ui: "" },
  { screen: SCREEN.COMPANY_OVERVIEW, type: TYPE.EXCEL,
    indicator: { en: "Annual Operating Profit (Plan / Forecast / Achievement Rate)", kr: "연간 영업이익 (계획/전망/달성률)", vn: "Lợi nhuận kinh doanh cả năm (Kế hoạch / Dự báo / Tỷ lệ đạt)" },
    menu: "", ui: "" },
  { screen: SCREEN.COMPANY_CHARTS, type: TYPE.EXCEL,
    indicator: { en: "Monthly Sales Trend (Plan vs Actual/Forecast)", kr: "월별 매출 추이 (계획 대비 실적/전망)", vn: "Xu hướng doanh thu hàng tháng (Kế hoạch so với Thực tế/Dự báo)" },
    menu: "", ui: "" },
  { screen: SCREEN.COMPANY_CHARTS, type: TYPE.EXCEL,
    indicator: { en: "Monthly P&L Status (Gross Profit, SG&A, Operating Profit)", kr: "월별 손익 현황 (매출이익, 판관비, 영업이익)", vn: "Tình hình lãi/lỗ hàng tháng (Lợi nhuận gộp, Chi phí QLDN, Lợi nhuận KD)" },
    menu: "", ui: "" },
  { screen: SCREEN.COMPANY_CHARTS, type: TYPE.EXCEL,
    indicator: { en: "Order Status (Contract Target, Incurred Orders, Balance)", kr: "수주 현황 (수주 목표, 발생 수주, 잔여)", vn: "Tình hình trúng thầu (Mục tiêu hợp đồng, Đơn hàng phát sinh, Số dư)" },
    menu: "", ui: "" },
  { screen: SCREEN.COMPANY_CHARTS, type: TYPE.EXCEL_ERP,
    indicator: { en: "Company Cash Flow (Inflow, Outflow, Net Balance)", kr: "회사 자금수지 (입금, 출금, 순잔액)", vn: "Dòng tiền công ty (Thu, Chi, Số dư ròng)" },
    menu: "Cash Flow > Report > Cash Flow ReportCash Flow Excel Upload",
    ui: "Income > month (1-12)Outcome > month (1-12)" },
  { screen: SCREEN.COMPANY_COMMENTS, type: TYPE.MANUAL,
    indicator: { en: "Executive Comments (Performance Analysis & Outlook)", kr: "경영진 코멘트 (실적 분석 및 전망)", vn: "Nhận xét Ban Giám đốc (Phân tích kết quả & Triển vọng)" },
    menu: "", ui: "" },
  { screen: SCREEN.CONS_OVERVIEW, type: TYPE.ERP,
    indicator: { en: "Contract Amount", kr: "도급액", vn: "Giá trị hợp đồng" },
    menu: "Common > Construction Overview > Register Construction Overview",
    ui: "Tab Contract Details > Total Contract Amount" },
  { screen: SCREEN.CONS_OVERVIEW, type: TYPE.ERP,
    indicator: { en: "Construction Period (Construction Start Date & Construction End Date)", kr: "공사기간 (착공일 및 준공일)", vn: "Thời gian thi công (Ngày khởi công & Ngày hoàn thành)" },
    menu: "Common > Construction Overview > Register Construction Overview",
    ui: "Tab Construction Period > - Actual Start Date- Actual Final Completion / Expected Final Completion Date" },
  { screen: SCREEN.CONS_OVERVIEW, type: TYPE.MANUAL,
    indicator: {
      en: "Project Specifications (Client, Scale, Location, Site Area, Gross Floor Area, Purpose, Ownership Stake, Partner Company, Contract Method, Payment Terms, Defect Warranty Period, Defect Warranty Bond, Advance Payment, Retention, VE Terms)",
      kr: "프로젝트 제원 (발주처, 규모, 위치, 대지면적, 연면적, 용도, 지분율, 파트너사, 계약방식, 지급조건, 하자보증기간, 하자보증금, 선수금, 유보금, VE 조건)",
      vn: "Thông số dự án (Chủ đầu tư, Quy mô, Vị trí, Diện tích đất, Tổng diện tích sàn, Mục đích, Tỷ lệ sở hữu, Đối tác, Phương thức hợp đồng, Điều khoản thanh toán, Thời hạn bảo hành, Bảo lãnh bảo hành, Tạm ứng, Giữ lại, Điều khoản VE)"
    },
    menu: "", ui: "" },
  { screen: SCREEN.CONS_OVERVIEW, type: TYPE.ERP,
    indicator: { en: "Site Photo", kr: "현장 사진", vn: "Ảnh công trường" },
    menu: "Common > Perspective/Photo > Register Perspective",
    ui: "Aerial rendering" },
  { screen: SCREEN.CONS_PROGRESS, type: TYPE.ERP,
    indicator: { en: "Monthly Actual (%)", kr: "월별 실적 (%)", vn: "Thực tế hàng tháng (%)" },
    menu: "1. Cost > Cost Performance > Cost Input Status by Execution Details2. Sub-Contracting > Request Execution Resolution (Site) > Request Execution Resolution(Site)",
    ui: "1. Sum total column input By Month(1-12)2. Sum column Execution Budget > Amount3. Request Execution Resolution(Site) sum column Execution Budget minus sum column Implementation AmountActual = (1(each month)/(2-3))*100%" },
  { screen: SCREEN.CONS_PROGRESS, type: TYPE.MANUAL,
    indicator: { en: "Monthly Plan(%)", kr: "월별 계획 (%)", vn: "Kế hoạch hàng tháng (%)" },
    menu: "", ui: "" },
  { screen: SCREEN.CONS_PROGRESS, type: TYPE.ERP,
    indicator: { en: "Site Progress Status", kr: "현장 진행 현황", vn: "Tình trạng tiến độ công trường" },
    menu: "Common > Perspective/Photo > Register Site Photos",
    ui: "Photo List" },
  { screen: SCREEN.CONS_SALE_PROFIT, type: TYPE.EXCEL,
    indicator: { en: "Site Monthly Revenue (Plan / Actual / Forecast)", kr: "현장 월별 매출 (계획/실적/전망)", vn: "Doanh thu hàng tháng của công trường (Kế hoạch / Thực tế / Dự báo)" },
    menu: "", ui: "" },
  { screen: SCREEN.CONS_SALE_PROFIT, type: TYPE.ERP,
    indicator: { en: "Cost Rate", kr: "원가율", vn: "Tỷ lệ giá vốn" },
    menu: "Cost > Settlement ratio cost >  Settlement Cost Ratio",
    ui: "Row in column month > Business Budget, Contract Amount, Gross Profit Ratio" },
  { screen: SCREEN.CONS_OUTSOURCING, type: TYPE.ERP,
    indicator: {
      en: "Outsourcing/Materials 1.Budget (A), Executed Budget, Resolved Amount (B), 2. This Month's Progress Payment, Cumulative Progress Payment (C))",
      kr: "외주/자재 1.예산(A), 실행예산, 확정금액(B), 2. 당월 기성금, 누계 기성금(C))",
      vn: "Thầu phụ/Vật tư 1.Ngân sách (A), Ngân sách thực hiện, Giá trị đã xác định (B), 2. Thanh toán tiến độ tháng này, Thanh toán tiến độ lũy kế (C))"
    },
    menu: "1. Sub-Contracting > Request Execution Resolution (Site) > Request Execution Resolution(Site)2. Sub-Contracting > Implementation Progress Payment(Site) > Interim Payment Status",
    ui: "1. Execution Budget, Operational Budget, Implementation Amount2. - Tab This Month column 당월기성금액 (B)- Tab All column Progress Payment > Amount (B)" },
  { screen: SCREEN.CONS_COSTING, type: TYPE.ERP,
    indicator: { en: "Budget Execution Status (Direct Cost, Indirect Cost, Contingency)", kr: "예산 집행 현황 (직접비, 간접비, 예비비)", vn: "Tình hình thực hiện ngân sách (Chi phí trực tiếp, Chi phí gián tiếp, Dự phòng)" },
    menu: "Cost > Cost Performance > Cost Input Status by Execution Details",
    ui: "-Row Direct Cost > Common Work, Expense I, Outsoucre (data not in Common Work, Expense I)- Row Indirect Cost > Expense II- Row Contingency > Contingency" },
  { screen: SCREEN.CONS_COSTING, type: TYPE.MANUAL,
    indicator: { en: "Monthly Cost Plan & Work Type Breakdown", kr: "월별 원가 계획 및 공종별 내역", vn: "Kế hoạch chi phí hàng tháng & Phân loại theo loại công việc" },
    menu: "", ui: "Data Entry Tab > 4. Cost Plan/Actual by Work Type" },
  { screen: SCREEN.CONS_CASHFLOW, type: TYPE.ERP,
    indicator: { en: "Project Cash Inflow / Cash Outflow / Cash Balance", kr: "프로젝트 입금 / 출금 / 자금 잔액", vn: "Thu / Chi / Số dư tiền mặt của dự án" },
    menu: "Cash Flow > Report > Cash Flow Report",
    ui: "Income > month (1-12)Outcome > month (1-12)" },
  { screen: SCREEN.SVC_OVERVIEW, type: TYPE.MANUAL,
    indicator: { en: "Service Contract & Scope Details", kr: "용역 계약 및 범위 상세", vn: "Chi tiết hợp đồng & phạm vi dịch vụ" },
    menu: "", ui: "Data Entry Tab > Service Overview ( Client, Scope of Work, Payment Terms)" },
  { screen: SCREEN.SVC_SALES_COGS, type: TYPE.MANUAL,
    indicator: { en: "Service Monthly Accounting & Executed COGS", kr: "용역 월별 회계 및 집행 원가(COGS)", vn: "Kế toán hàng tháng dịch vụ & Giá vốn đã thực hiện" },
    menu: "", ui: "Data Entry Tab > 3. Monthly Cost of Revenue" },
  { screen: SCREEN.SYSADMIN, type: TYPE.MANUAL_ERP,
    indicator: { en: "Exchange Rate Maintenance (USD / VND / KRW)", kr: "환율 관리 (USD / VND / KRW)", vn: "Quản lý tỷ giá (USD / VND / KRW)" },
    menu: "1.Common > Construction Overview > Register Construction Overview2. Main Dashboard button Fx Rate Setting- Current rate- Monthly Revenue rate",
    ui: "1. Contract Exchange Rate2. Input save data" },
  { screen: SCREEN.SYSADMIN, type: TYPE.EXCEL,
    indicator: { en: "Management Report Excel Import & Rollback", kr: "경영보고서 엑셀 업로드 및 롤백", vn: "Nhập Excel báo cáo quản trị & Hoàn tác" },
    menu: "", ui: "Upload Modal (Management Report Excel Parsing)" },
  { screen: SCREEN.SYSADMIN, type: TYPE.ERP,
    indicator: { en: "Automated PIMSVINA Sync (Preview & Confirm)", kr: "PIMSVINA 자동 동기화 (미리보기 및 확정)", vn: "Đồng bộ tự động PIMSVINA (Xem trước & Xác nhận)" },
    menu: "ERP All Modules",
    ui: "Top 'PIMS Sync' button -> Preview Popup -> Confirm Apply" }
];

function buildLineageTableRows(lang) {
  const isEn = lang === 'EN';
  const isVn = lang === 'VN';
  const pick = (obj) => (isVn ? obj.vn : (isEn ? obj.en : obj.kr));

  const headerRow = new TableRow({
    children: [
      createCell(isVn ? "Màn Hình" : (isEn ? "Screen" : "화면"), true, false, 18),
      createCell(isVn ? "Tên Chỉ Tiêu" : (isEn ? "Indicator Name" : "지표명"), true, false, 20),
      createCell(isVn ? "Cơ Chế Nạp" : (isEn ? "Input Type" : "입력 구분"), true, false, 14),
      createCell(isVn ? "Menu PIMSVINA" : (isEn ? "PIMSVINA Menu" : "PIMSVINA 메뉴"), true, false, 24),
      createCell(isVn ? "Tên Màn Hình PIMSVINA (UI)" : (isEn ? "PIMSVINA name UI" : "PIMSVINA 화면명 (UI)"), true, false, 24)
    ]
  });

  const dataRows = LINEAGE_ROWS.map((row, i) => new TableRow({
    children: [
      createCell(pick(row.screen)),
      createCell(pick(row.indicator)),
      createCell(pick(row.type), false, false, null, true),
      createCell(row.menu, false, i % 2 === 1),
      createCell(row.ui, false, i % 2 === 1)
    ]
  }));

  return [headerRow, ...dataRows];
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
            rows: buildLineageTableRows(lang)
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

module.exports = { TYPE, SCREEN, LINEAGE_ROWS };

if (require.main === module) {
  main().catch(err => {
    console.error('Error generating Word docs:', err);
    process.exit(1);
  });
}
