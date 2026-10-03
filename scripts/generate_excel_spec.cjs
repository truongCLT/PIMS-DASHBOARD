/**
 * Generator script to create comprehensive Excel Data Mapping Specifications:
 * - docs/PIMS_DASHBOARD_System_Specification_EN.xlsx
 * - docs/PIMS_DASHBOARD_System_Specification_KR.xlsx
 */

const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

// Data dictionary definitions with complete mapping
const FIELD_DEFINITIONS = [
  // 1. Company Dashboard (전체 관리 대시보드) - KPI Cards
  {
    module_en: "Company Dashboard",
    module_kr: "전체 관리 대시보드",
    tab_en: "Main Overview",
    tab_kr: "종합 현황",
    field_en: "YTD Revenue (Plan / Actual / Achv Rate)",
    field_kr: "당월 누적 매출 (계획 / 실적 / 달성률)",
    origin_type: "UPLOAD",
    erp_menu_kr: "월별경영실적등록",
    erp_menu_en: "Monthly Management Performance Registration",
    erp_ui_kr: "경영보고서 엑셀 (매출 라인 누적)",
    erp_ui_en: "Management Report Excel (Revenue line cumulative)",
    db_source: "POST /api/mgmtreport/upload -> mr_monthly_amounts, mr_annual_amounts",
    description_en: "Cumulative revenue up to reference month M. Uploaded monthly via Excel template by Admin.",
    description_kr: "기준월 M까지의 누적 매출액. 관리자가 매월 경영보고 Excel을 업로드하여 반영."
  },
  {
    module_en: "Company Dashboard",
    module_kr: "전체 관리 대시보드",
    tab_en: "Main Overview",
    tab_kr: "종합 현황",
    field_en: "YTD Operating Profit (Plan / Actual / Achv Rate)",
    field_kr: "당월 누적 영업이익 (계획 / 실적 / 달성률)",
    origin_type: "UPLOAD",
    erp_menu_kr: "월별경영실적등록",
    erp_menu_en: "Monthly Management Performance Registration",
    erp_ui_kr: "경영보고서 엑셀 (영업이익 라인 누적)",
    erp_ui_en: "Management Report Excel (Operating Profit line cumulative)",
    db_source: "POST /api/mgmtreport/upload -> mr_monthly_amounts",
    description_en: "Cumulative operating profit up to reference month M (Operating profit 1 or Gross profit).",
    description_kr: "기준월 M까지의 누적 영업이익 (영업이익1 또는 매출총이익)."
  },
  {
    module_en: "Company Dashboard",
    module_kr: "전체 관리 대시보드",
    tab_en: "Main Overview",
    tab_kr: "종합 현황",
    field_en: "Annual Revenue (Plan / Forecast / Achv Rate)",
    field_kr: "연간 매출 (계획 / 전망 / 달성률)",
    origin_type: "UPLOAD",
    erp_menu_kr: "월별경영실적등록",
    erp_menu_en: "Monthly Management Performance Registration",
    erp_ui_kr: "경영보고서 엑셀 (연간 합계)",
    erp_ui_en: "Management Report Excel (Full-Year Total)",
    db_source: "mr_annual_amounts.plan_total, mr_annual_amounts.actual_total",
    description_en: "Full year target and forecast total revenue.",
    description_kr: "연간 총 매출 목표 및 전망 합계."
  },
  {
    module_en: "Company Dashboard",
    module_kr: "전체 관리 대시보드",
    tab_en: "Main Overview",
    tab_kr: "종합 현황",
    field_en: "Annual Operating Profit (Plan / Forecast / Achv Rate)",
    field_kr: "연간 영업이익 (계획 / 전망 / 달성률)",
    origin_type: "UPLOAD",
    erp_menu_kr: "월별경영실적등록",
    erp_menu_en: "Monthly Management Performance Registration",
    erp_ui_kr: "경영보고서 엑셀 (연간 합계)",
    erp_ui_en: "Management Report Excel (Full-Year Total)",
    db_source: "mr_annual_amounts.plan_total, mr_annual_amounts.actual_total",
    description_en: "Full year operating profit target and forecast total.",
    description_kr: "연간 총 영업이익 목표 및 전망 합계."
  },
  // Company Dashboard - Charts & Widgets
  {
    module_en: "Company Dashboard",
    module_kr: "전체 관리 대시보드",
    tab_en: "Charts",
    tab_kr: "차트 영역",
    field_en: "Monthly Sales Trend (Plan vs Actual/Forecast)",
    field_kr: "월별 매출 실적 및 전망 (계획 vs 실적/전망)",
    origin_type: "UPLOAD",
    erp_menu_kr: "월별경영실적등록",
    erp_menu_en: "Monthly Management Performance Registration",
    erp_ui_kr: "경영보고서 엑셀 (월별 매출)",
    erp_ui_en: "Management Report Excel (Monthly Revenue)",
    db_source: "mr_monthly_amounts (m01~m12)",
    description_en: "Monthly trend chart comparing monthly plan and actual up to current closed month, forecast beyond.",
    description_kr: "마감월 이전은 실적, 마감월 이후는 전망으로 월별 추이 비교 표시."
  },
  {
    module_en: "Company Dashboard",
    module_kr: "전체 관리 대시보드",
    tab_en: "Charts",
    tab_kr: "차트 영역",
    field_en: "Monthly P&L Status (Gross Profit, SG&A, Op Profit)",
    field_kr: "월별 손익현황 (매출총이익, 판관비, 영업손익)",
    origin_type: "UPLOAD",
    erp_menu_kr: "월별경영실적등록",
    erp_menu_en: "Monthly Management Performance Registration",
    erp_ui_kr: "경영보고서 엑셀 (손익계산서 부문)",
    erp_ui_en: "Management Report Excel (P&L lines)",
    db_source: "mr_monthly_amounts (gross_profit, sga, op_profit1)",
    description_en: "Stacked bar breakdown of profit elements per month.",
    description_kr: "월별 매출총이익, 일반관리비, 영업이익 구성 스택 바 차트."
  },
  {
    module_en: "Company Dashboard",
    module_kr: "전체 관리 대시보드",
    tab_en: "Charts",
    tab_kr: "차트 영역",
    field_en: "Order Status (Contract Target, Incurred Orders, Balance)",
    field_kr: "수주 실적 현황 (목표, 수주실적, 잔여)",
    origin_type: "UPLOAD",
    erp_menu_kr: "월별경영실적등록",
    erp_menu_en: "Monthly Management Performance Registration",
    erp_ui_kr: "경영보고서 엑셀 (수주/계약)",
    erp_ui_en: "Management Report Excel (Orders/Contracts)",
    db_source: "mr_annual_amounts (new_orders)",
    description_en: "Donut chart and progress metrics for annual order targets.",
    description_kr: "연간 수주 목표 달성률 도넛 차트 및 계획/실적/잔여 수주액."
  },
  {
    module_en: "Company Dashboard",
    module_kr: "전체 관리 대시보드",
    tab_en: "Charts",
    tab_kr: "차트 영역",
    field_en: "Company Cash Flow (Inflow, Outflow, Net Balance)",
    field_kr: "자금수지 현황 (자금유입, 유출, 누적잔액)",
    origin_type: "UPLOAD",
    erp_menu_kr: "1.현장자금변동(현금/예금) / 자금수지표",
    erp_menu_en: "1. Site Fund Movement (Cash / Bank) / Cash Flow Sheet",
    erp_ui_kr: "자금수지 엑셀 업로드",
    erp_ui_en: "Cash Flow Excel Upload",
    db_source: "POST /api/cashflow/upload -> cf_projects, cf_monthly_amounts",
    description_en: "Monthly cash inflow, outflow, and cumulative cash equivalent balance.",
    description_kr: "월별 현금 유입/유출 및 누적 현금 잔액 복합 차트."
  },
  {
    module_en: "Company Dashboard",
    module_kr: "전체 관리 대시보드",
    tab_en: "Table & Summary",
    tab_kr: "표 및 요약",
    field_en: "Business Performance Summary Table",
    field_kr: "경영실적 현황 표 (수주, 매출, 이익, 판관비)",
    origin_type: "UPLOAD",
    erp_menu_kr: "월별경영실적등록",
    erp_menu_en: "Monthly Management Performance Registration",
    erp_ui_kr: "경영보고서 엑셀 시트",
    erp_ui_en: "Management Report Excel Sheet",
    db_source: "mr_pnl_items, mr_monthly_amounts",
    description_en: "Tabular representation of all management items with monthly & annual performance.",
    description_kr: "당월 누계 및 연간 기준 수주, 매출, 매출이익, 판관비, 영업이익, 경상이익 집계표."
  },
  {
    module_en: "Company Dashboard",
    module_kr: "전체 관리 대시보드",
    tab_en: "Comments",
    tab_kr: "코멘트",
    field_en: "Executive Comments (Performance Analysis & Outlook)",
    field_kr: "경영 코멘트 (실적 분석 및 향후 전망)",
    origin_type: "MANUAL",
    erp_menu_kr: "N/A (대시보드 전용 기능)",
    erp_menu_en: "N/A (Dashboard Exclusive)",
    erp_ui_kr: "대시보드 하단 실적/전망 코멘트 패널 (편집/저장)",
    erp_ui_en: "Bottom Comment Panel (Edit & Save)",
    db_source: "PUT /api/mgmtreport/comments -> mr_comments",
    description_en: "Direct manual text entered by authorized management to explain figures.",
    description_kr: "관리자가 실적 분석 및 향후 전망을 직접 입력/저장."
  },

  // 2. Project Detail (Construction) - Overview Tab
  {
    module_en: "Project Detail (Construction)",
    module_kr: "시공 프로젝트 상세",
    tab_en: "Overview Tab",
    tab_kr: "개요 탭",
    field_en: "Contract Amount (VND)",
    field_kr: "도급액 (VND)",
    origin_type: "SYNC",
    erp_menu_kr: "공사개요등록 / 도급계약관리",
    erp_menu_en: "Construction Overview Registration / Contract Summary",
    erp_ui_kr: "도급합계금액 (TOTALCTRTWONAMT)",
    erp_ui_en: "Total Contract Won Amount (TOTALCTRTWONAMT)",
    db_source: "CBTB_CTRTSUMM.TOTALCTRTWONAMT via dashboard_pd_overview_1q.jsp -> pd_overview.contract_amount",
    description_en: "Total awarded contract amount from ERP contract master.",
    description_kr: "ERP CBTB_CTRTSUMM 테이블에서 자동 동기화되는 총 도급금액 (VND)."
  },
  {
    module_en: "Project Detail (Construction)",
    module_kr: "시공 프로젝트 상세",
    tab_en: "Overview Tab",
    tab_kr: "개요 탭",
    field_en: "Construction Period (Start & End Date)",
    field_kr: "공사기간 (착공일 ~ 준공예정일)",
    origin_type: "SYNC",
    erp_menu_kr: "공사개요등록 > 공사기간",
    erp_menu_en: "Construction Overview Registration > Period",
    erp_ui_kr: "실착공일(STCONSTDATE) ~ 실준공예정일(CMPLSCHDDATE)",
    erp_ui_en: "Actual Start (STCONSTDATE) ~ Sched. Completion (CMPLSCHDDATE)",
    db_source: "CBTB_CONSTPERIOD (latest CHGSEQ) -> pd_overview.start_date, pd_overview.end_date",
    description_en: "Project period prioritized by actual start and completion dates from period change history.",
    description_kr: "CBTB_CONSTPERIOD 최종 차수 기준 실착공일 및 실준공예정일 자동 동기화."
  },
  {
    module_en: "Project Detail (Construction)",
    module_kr: "시공 프로젝트 상세",
    tab_en: "Overview Tab",
    tab_kr: "개요 탭",
    field_en: "Project Specifications (Client, Scale, Area, Location, Purpose, Warranty, Advance)",
    field_kr: "프로젝트 일반제원 (발주처, 공사규모, 연면적, 위치, 용도, 하자보증, 선급금 등)",
    origin_type: "MANUAL",
    erp_menu_kr: "공사개요등록 (일부 미등록 항목)",
    erp_menu_en: "Construction Overview Registration (Unregistered items)",
    erp_ui_kr: "데이터 입력 탭 > 0. 개요 정보",
    erp_ui_en: "Data Entry Tab > 0. Overview Information",
    db_source: "PUT /api/projectdetail -> pd_overview (client, scale, location, gross_floor_area, etc.)",
    description_en: "Project qualitative metadata manually input by manager via Data Entry tab.",
    description_kr: "관리자가 데이터 입력 탭에서 직접 입력/수정하는 현장 개요 제원."
  },
  {
    module_en: "Project Detail (Construction)",
    module_kr: "시공 프로젝트 상세",
    tab_en: "Overview Tab",
    tab_kr: "개요 탭",
    field_en: "Aerial View Photo",
    field_kr: "조감도 사진",
    origin_type: "SYNC",
    erp_menu_kr: "공사개요등록 > 조감도",
    erp_menu_en: "Construction Overview Registration > Aerial View",
    erp_ui_kr: "조감도 사진 파일 (AIRVIEWPICPATH)",
    erp_ui_en: "Aerial View Picture File (AIRVIEWPICPATH)",
    db_source: "CBTB_CONSTPIC.AIRVIEWPICPATH -> PZTB_FILEUPLOAD via cb_prjt_air_view_e_1q.jsp",
    description_en: "Synchronized high-resolution aerial view photo registered in ERP.",
    description_kr: "ERP CBTB_CONSTPIC 및 PZTB_FILEUPLOAD에서 자동 동기화되는 대표 조감도."
  },

  // 3. Project Detail (Construction) - Construction Progress Tab
  {
    module_en: "Project Detail (Construction)",
    module_kr: "시공 프로젝트 상세",
    tab_en: "Progress Tab",
    tab_kr: "공정 탭",
    field_en: "Monthly Actual Progress (%)",
    field_kr: "월별 실적 공정률 (%)",
    origin_type: "SYNC",
    erp_menu_kr: "원가공정율(%) / 시행기성(현장)",
    erp_menu_en: "Cost Progress Rate (%) / Execution Progress (Site)",
    erp_ui_kr: "월간 원가 투입 실적 기반 계산 공정률",
    erp_ui_en: "Calculated progress rate based on monthly cost input",
    db_source: "CHTB_PFMCOSTRMRK & CETB_PFMCTRTHIST via dashboard_pd_progress_1q.jsp -> pd_progress_monthly.actual_pct",
    description_en: "Formula: SUM_COSTAMT / (SUM_BDGTAMT - DIFF_BUDGET_VS_IMPLEMENTATION) * 100.",
    description_kr: "투입 원가 실적 및 실행예산 집행 차이를 반영하여 자동 계산 동기화."
  },
  {
    module_en: "Project Detail (Construction)",
    module_kr: "시공 프로젝트 상세",
    tab_en: "Progress Tab",
    tab_kr: "공정 탭",
    field_en: "Monthly Plan Progress (%) & Milestones",
    field_kr: "월별 계획 공정률 (%) 및 마일스톤",
    origin_type: "MANUAL",
    erp_menu_kr: "N/A (현장 수립 공정표)",
    erp_menu_en: "N/A (Site Schedule Table)",
    erp_ui_kr: "데이터 입력 탭 > 1. 월별 공정률 / 2. 마일스톤 (Excel 업로드 가능)",
    erp_ui_en: "Data Entry Tab > 1. Monthly Progress / 2. Milestones (Excel Upload supported)",
    db_source: "PUT /api/projectdetail -> pd_progress_monthly.plan_pct, pd_milestones",
    description_en: "Entered manually or uploaded via Excel template to compare planned vs actual progress.",
    description_kr: "관리자가 공정표를 수동 입력하거나 마일스톤 엑셀 템플릿으로 일괄 업로드."
  },
  {
    module_en: "Project Detail (Construction)",
    module_kr: "시공 프로젝트 상세",
    tab_en: "Progress Tab",
    tab_kr: "공정 탭",
    field_en: "Monthly Site Progress Photos",
    field_kr: "월별 현장 사진 (슬라이더)",
    origin_type: "SYNC",
    erp_menu_kr: "공사사진등록(월별)",
    erp_menu_en: "Monthly Construction Photo Registration",
    erp_ui_kr: "월별 사진 목록 및 부위/공종 설명",
    erp_ui_en: "Monthly Photo List with Location/Trade Notes",
    db_source: "CBTB_CONSTMONTHPIC -> PZTB_FILEUPLOAD via cb_prjt_picture_e_1q.jsp",
    description_en: "Synchronized site monthly inspection pictures with sequence and trade remarks.",
    description_kr: "ERP CBTB_CONSTMONTHPIC 테이블에서 연월별로 등록된 현장 사진 자동 동기화."
  },

  // 4. Project Detail (Construction) - Sales & Profit Tab
  {
    module_en: "Project Detail (Construction)",
    module_kr: "시공 프로젝트 상세",
    tab_en: "Sale/Profit Tab",
    tab_kr: "매출/원가 탭",
    field_en: "Site Monthly Revenue (Plan / Actual / Forecast)",
    field_kr: "현장 월별 매출 (계획 / 실적 / 전망)",
    origin_type: "UPLOAD",
    erp_menu_kr: "월별경영실적등록 / 경영보고서 엑셀",
    erp_menu_en: "Monthly Management Performance Registration / Excel",
    erp_ui_kr: "Site별 월간 매출액 열",
    erp_ui_en: "Site Monthly Revenue Column",
    db_source: "mr_projects.revenue_plan, revenue_actual (fallback to pd_sales_monthly)",
    description_en: "Prefilled from company management report upload, adjustable via Data Entry tab.",
    description_kr: "전사 경영보고서 엑셀 업로드 시 사이트별로 자동 반영되며 데이터 입력 탭에서 보정 가능."
  },
  {
    module_en: "Project Detail (Construction)",
    module_kr: "시공 프로젝트 상세",
    tab_en: "Sale/Profit Tab",
    tab_kr: "매출/원가 탭",
    field_en: "Cost Rate Setup (Bidding, Execution, Completion)",
    field_kr: "원가율 설정 (입찰 / 실행예산 / 준공추정)",
    origin_type: "SYNC",
    erp_menu_kr: "실행예산(공사)품의서 / 원가확정 / 정산원가율",
    erp_menu_en: "Execution Budget Proposal / Settlement Cost Ratio",
    erp_ui_kr: "사업예산(Business budget), 도급액(Contract Amount), 원가율(Gross Profit Ratio)",
    erp_ui_en: "Business Budget, Contract Amount, Gross Profit Ratio",
    db_source: "ch_cost_settle_ratio_q_1q.jsp (CDTB_PFMSUM_VINA, CHTB_PFMCOSTRMRK) -> pd_cost_estimation",
    description_en: "Execution and Completion cost ratios synchronized from ERP cost settlement query across all months. Bidding is manually entered.",
    description_kr: "실행예산 및 준공추정 원가율은 ERP 정산원가율 쿼리에서 자동 동기화. 입찰(Bidding)은 수기 입력."
  },

  // 5. Project Detail (Construction) - Outsourcing Tab
  {
    module_en: "Project Detail (Construction)",
    module_kr: "시공 프로젝트 상세",
    tab_en: "Outsourcing Tab",
    tab_kr: "외주 탭",
    field_en: "Subcontract List & Amounts (Budget, Executed Budget, Resolved Contract, Progress Payment)",
    field_kr: "외주 계약 목록 및 금액 (예산, 실행예산, 계약결의, 당월기성, 누계기성)",
    origin_type: "SYNC",
    erp_menu_kr: "시행기성(현장) / (외주)내역입찰등록 / 계약결의",
    erp_menu_en: "Execution Progress (Site) / Sub-Contract Detailed Bid / Resolution",
    erp_ui_kr: "도급예산(A), 실행예산, 결의금액(B), 당월기성, 누계기성(C), 집행율",
    erp_ui_en: "Budget (A), Executed Budget, Resolved (B), Current Month, Cumulative (C), Exec Rate",
    db_source: "CDTB_ORDCONTTYPE, CETB_PFMCTRTHIST, CETB_PFMSCHDHIST via dashboard_pd_outsourcing_1q.jsp",
    description_en: "Raw VND contract and progress amounts stored exactly as in ERP to prevent currency discrepancy. Trade group mapping editable in Data Entry.",
    description_kr: "ERP 계약결의 및 기성실적에서 VND 원본 그대로 자동 동기화. 대공종 분류(Trade Group)는 수동 매핑 가능."
  },

  // 6. Project Detail (Construction) - Costing Tab (Budget Execution)
  {
    module_en: "Project Detail (Construction)",
    module_kr: "시공 프로젝트 상세",
    tab_en: "Costing Tab",
    tab_kr: "비용 탭 (예산집행)",
    field_en: "Budget Execution by CBS (Direct Cost, Indirect Cost, Contingency)",
    field_kr: "CBS 비목별 예산 집행 현황 (직접비, 간접비, 예비비)",
    origin_type: "SYNC",
    erp_menu_kr: "실행예산(공사)품의서 > 원가내역서",
    erp_menu_en: "Execution Budget Proposal > Cost Breakdown",
    erp_ui_kr: "표준 CBS 분류별 예산 및 실적 투입액",
    erp_ui_en: "Budget & Incurred Cost by Standard CBS",
    db_source: "CATB_STNDCBS, CHTB_PFMCOSTRMRK via dashboard_pd_costbudget_1q.jsp -> pd_cost_budget",
    description_en: "Standard CBS level classification: Direct (Outsourcing, Common, Expense 1), Indirect (Expense 2), Contingency.",
    description_kr: "표준 CBS 트리 기반으로 직접비(외주, 공통가설, 현장경비1), 간접비(경비2), 예비비로 자동 분류 동기화."
  },
  {
    module_en: "Project Detail (Construction)",
    module_kr: "시공 프로젝트 상세",
    tab_en: "Costing Tab",
    tab_kr: "비용 탭 (예산집행)",
    field_en: "Monthly Cost Plan & Work Type Breakdown",
    field_kr: "월별 공종별 원가 계획 및 실적",
    origin_type: "MANUAL",
    erp_menu_kr: "N/A (현장 수립 원가 투입계획)",
    erp_menu_en: "N/A (Site Cost Incurrence Plan)",
    erp_ui_kr: "데이터 입력 탭 > 4. 공정별 원가 계획/실적 (건축, 기계, 전기, 토목, 조경 등)",
    erp_ui_en: "Data Entry Tab > 4. Cost Plan/Actual by Work Type",
    db_source: "PUT /api/projectdetail -> pd_cost_budget_monthly",
    description_en: "Monthly work-type plan entered manually; actuals for major trades auto-filled from outsourcing monthly progress.",
    description_kr: "공종별 원가 계획은 수기 입력하며, 주요 공종 실적은 외주 기성 실적에서 자동 합산 반영."
  },

  // 7. Project Detail (Construction) - Cash Flow Tab
  {
    module_en: "Project Detail (Construction)",
    module_kr: "시공 프로젝트 상세",
    tab_en: "Cash Flow Tab",
    tab_kr: "자금수지 탭",
    field_en: "Project Cash Inflow / Cash Outflow / Cash Balance",
    field_kr: "프로젝트 자금유입 / 자금유출 / 자금잔액",
    origin_type: "SYNC",
    erp_menu_kr: "1.현장자금변동(현금/예금) / 현장자금수불",
    erp_menu_en: "1. Site Fund Movement (Cash / Bank) / Transactions",
    erp_ui_kr: "수입(Income) / 지출(Withdrawal) / 기초잔액",
    erp_ui_en: "Income / Withdrawal / Opening Balance",
    db_source: "CFTB_CFTRANSACTION, CFTB_OPENINGBALANCE via dashboard_pd_cashflow_1q.jsp -> pd_cashflow_monthly",
    description_en: "Direct transaction sync from ERP cash flow module, with fallback prefill from uploaded cash flow excel if ERP records are missing.",
    description_kr: "ERP 자금 거래 내역에서 월별 입출금 및 잔액 자동 동기화 (미등록 현장은 자금수지 엑셀 데이터로 사전 채움)."
  },

  // 8. Service Projects (용역 프로젝트)
  {
    module_en: "Service Project Detail",
    module_kr: "용역 프로젝트 상세",
    tab_en: "Overview & Sales",
    tab_kr: "개요 및 매출",
    field_en: "Service Contract & Scope Details",
    field_kr: "용역 도급액 및 과업 범위",
    origin_type: "MANUAL",
    erp_menu_kr: "용역계약 / 수주관리",
    erp_menu_en: "Service Contract / Order Management",
    erp_ui_kr: "데이터 입력 탭 > 용역 개요 정보 (수행기간, 발주처, 수행내용, 수금조건)",
    erp_ui_en: "Data Entry Tab > Service Overview (Period, Client, Scope, Payment Terms)",
    db_source: "pd_overview (contract_amount, start_date, end_date, scope, payment_terms)",
    description_en: "Configured manually or synchronized when ERP service site code is mapped.",
    description_kr: "용역 현장 특성에 맞게 수행기간, 발주처, 과업내용, 수금조건을 데이터 입력 탭에서 관리."
  },
  {
    module_en: "Service Project Detail",
    module_kr: "용역 프로젝트 상세",
    tab_en: "Sales & COGS Tab",
    tab_kr: "매출 및 원가 탭",
    field_en: "Service Monthly Accounting & Executed COGS",
    field_kr: "용역 월별 회계 매출원가 및 집행 매출원가 (WIP)",
    origin_type: "MANUAL",
    erp_menu_kr: "월별경영실적등록 / 용역원가",
    erp_menu_en: "Monthly Management Performance / Service Cost",
    erp_ui_kr: "데이터 입력 탭 > 3. 월별 매출원가",
    erp_ui_en: "Data Entry Tab > 3. Monthly Cost of Revenue",
    db_source: "PUT /api/projectdetail -> pd_cogs_monthly (acct_cogs, wip_cogs)",
    description_en: "Manual entry of accounting and executed WIP cost of goods sold for consulting/precon services.",
    description_kr: "용역 프로젝트의 회계 매출원가 및 집행(WIP) 매출원가를 수기 입력하여 Cost 차트에 반영."
  },

  // 9. Admin Operations
  {
    module_en: "System Administration",
    module_kr: "시스템 관리",
    tab_en: "Data Sync & Imports",
    tab_kr: "데이터 연동 및 업로드",
    field_en: "Exchange Rate Maintenance (USD / VND / KRW)",
    field_kr: "기준 환율 관리 (USD / VND / KRW)",
    origin_type: "MANUAL",
    erp_menu_kr: "계약환율 / CHTB_EXCHANGE_RATIO",
    erp_menu_en: "Contract Exchange Rate / CHTB_EXCHANGE_RATIO",
    erp_ui_kr: "대시보드 상단 환율 편집기 모달",
    erp_ui_en: "Dashboard Top FX Rate Editor Modal",
    db_source: "PUT /api/fxrates -> fx_rates",
    description_en: "System-wide exchange rates for currency toggles (USD, VND, KRW). Auto-queried from ERP and editable by Admin.",
    description_kr: "대시보드 전 통화 환산의 기준이 되는 환율 관리. ERP에서 자동 조회 및 관리자 수동 재정의 가능."
  },
  {
    module_en: "System Administration",
    module_kr: "시스템 관리",
    tab_en: "Data Sync & Imports",
    tab_kr: "데이터 연동 및 업로드",
    field_en: "Management Report Excel Import & Rollback",
    field_kr: "경영보고 Excel 업로드 및 반영 이력 롤백",
    origin_type: "UPLOAD",
    erp_menu_kr: "월별경영실적등록",
    erp_menu_en: "Monthly Management Performance Registration",
    erp_ui_kr: "업로드 모달 (경영보고 엑셀 파싱)",
    erp_ui_en: "Upload Modal (Management Report Excel Parsing)",
    db_source: "POST /api/mgmtreport/upload -> mr_monthly_amounts, mr_annual_amounts, mr_pnl_items",
    description_en: "Parses corporate P&L and project sales workbook. Preserves snapshots for 1-click rollback.",
    description_kr: "경영현황판 엑셀 파일을 업로드하여 DB에 일괄 저장하고 이전 버전으로 되돌리기(Rollback) 기능 제공."
  },
  {
    module_en: "System Administration",
    module_kr: "시스템 관리",
    tab_en: "Data Sync & Imports",
    tab_kr: "데이터 연동 및 업로드",
    field_en: "Automated PIMSVINA Sync (Preview & Confirm)",
    field_kr: "PIMSVINA 자동 동기화 (미리보기 및 반영)",
    origin_type: "SYNC",
    erp_menu_kr: "ERP 전 모듈 데이터",
    erp_menu_en: "ERP All Modules",
    erp_ui_kr: "상단 'PIMS 동기화' 버튼 -> 미리보기 팝업 -> 반영 확인",
    erp_ui_en: "Top 'PIMS Sync' button -> Preview Popup -> Confirm Apply",
    db_source: "GET /api/sync-pimsvina/preview & POST /api/sync-pimsvina/confirm",
    description_en: "Two-step safe synchronization executing read-only Oracle queries and inspecting changes before DB write.",
    description_kr: "Oracle DB를 읽기 전용으로 안전하게 조회하고 변경 사항 미리보기 검토 후 확정 반영하는 2단계 동기화."
  }
];

async function generateExcel(lang) {
  const isEn = lang === 'EN';
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "PIMS-DASHBOARD System";
  workbook.created = new Date();

  // Colors
  const NAVY = "1A365D";
  const BLUE_HEADER = "2B6CB0";
  const LIGHT_BLUE = "EBF8FF";
  const GRAY_BORDER = "CBD5E0";
  const WHITE = "FFFFFF";

  // 1. Sheet: Master Specification (전체 필드 및 연동 매트릭스)
  const sheet1 = workbook.addWorksheet(isEn ? "Data Lineage Matrix" : "데이터 연동 명세서", {
    views: [{ state: 'frozen', ySplit: 2 }]
  });

  sheet1.columns = [
    { header: isEn ? "Module" : "모듈 구분", key: "module", width: 26 },
    { header: isEn ? "Tab / Screen" : "화면 / 탭", key: "tab", width: 22 },
    { header: isEn ? "Indicator / Field Name" : "지표 및 필드명", key: "field", width: 34 },
    { header: isEn ? "Input Type" : "입력 구분", key: "origin_type", width: 16 },
    { header: isEn ? "PIMSVINA ERP Menu" : "PIMSVINA 연동 메뉴", key: "erp_menu", width: 32 },
    { header: isEn ? "PIMSVINA ERP UI Screen / Field" : "PIMSVINA 화면 / 필드명", key: "erp_ui", width: 36 },
    { header: isEn ? "Database Table / API Endpoint" : "연동 DB 테이블 / API", key: "db_source", width: 42 },
    { header: isEn ? "Description & Business Logic" : "지표 설명 및 산출 공식", key: "description", width: 48 },
  ];

  // Title row
  sheet1.spliceRows(1, 0, [isEn ? "PIMS-DASHBOARD System Data Origin & Integration Matrix" : "PIMS-DASHBOARD 시스템 지표별 데이터 연동 및 입력 출처 명세서"]);
  sheet1.mergeCells('A1:H1');
  const titleCell = sheet1.getCell('A1');
  titleCell.font = { name: 'Malgun Gothic', size: 14, bold: true, color: { argb: WHITE } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  sheet1.getRow(1).height = 36;

  // Header row styling
  const headerRow = sheet1.getRow(2);
  headerRow.height = 28;
  headerRow.eachCell((cell) => {
    cell.font = { name: 'Malgun Gothic', size: 10, bold: true, color: { argb: WHITE } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BLUE_HEADER } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: GRAY_BORDER } },
      bottom: { style: 'medium', color: { argb: NAVY } },
      left: { style: 'thin', color: { argb: GRAY_BORDER } },
      right: { style: 'thin', color: { argb: GRAY_BORDER } }
    };
  });

  // Populate data
  FIELD_DEFINITIONS.forEach((item) => {
    const originLabel = isEn
      ? (item.origin_type === "SYNC" ? "🔄 Sync (ERP)" : item.origin_type === "UPLOAD" ? "📤 Excel Upload" : "✍️ Manual Entry")
      : (item.origin_type === "SYNC" ? "🔄 ERP 자동동기화" : item.origin_type === "UPLOAD" ? "📤 엑셀 업로드" : "✍️ 수기 직접입력");

    const row = sheet1.addRow({
      module: isEn ? item.module_en : item.module_kr,
      tab: isEn ? item.tab_en : item.tab_kr,
      field: isEn ? item.field_en : item.field_kr,
      origin_type: originLabel,
      erp_menu: isEn ? item.erp_menu_en : item.erp_menu_kr,
      erp_ui: isEn ? item.erp_ui_en : item.erp_ui_kr,
      db_source: item.db_source,
      description: isEn ? item.description_en : item.description_kr,
    });

    row.height = 24;
    row.eachCell((cell, colNumber) => {
      cell.font = { name: 'Malgun Gothic', size: 9.5 };
      cell.alignment = { vertical: 'middle', wrapText: true };
      cell.border = {
        top: { style: 'thin', color: { argb: GRAY_BORDER } },
        bottom: { style: 'thin', color: { argb: GRAY_BORDER } },
        left: { style: 'thin', color: { argb: GRAY_BORDER } },
        right: { style: 'thin', color: { argb: GRAY_BORDER } }
      };

      // Highlight input types
      if (colNumber === 4) {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        if (item.origin_type === "SYNC") {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: "E6FFFA" } }; // Light Teal
          cell.font = { name: 'Malgun Gothic', size: 9.5, bold: true, color: { argb: "234E52" } };
        } else if (item.origin_type === "UPLOAD") {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: "EBF8FF" } }; // Light Blue
          cell.font = { name: 'Malgun Gothic', size: 9.5, bold: true, color: { argb: "2A4365" } };
        } else {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: "FFFAF0" } }; // Light Amber
          cell.font = { name: 'Malgun Gothic', size: 9.5, bold: true, color: { argb: "744210" } };
        }
      }
    });
  });

  // 2. Sheet: Classification Summary (입력 방식별 요약)
  const sheet2 = workbook.addWorksheet(isEn ? "Input Classification Summary" : "입력방식별 분류 요약");
  sheet2.columns = [
    { header: isEn ? "Data Source Category" : "데이터 수집 방식", key: "category", width: 28 },
    { header: isEn ? "Characteristics & Update Cycle" : "특징 및 갱신 주기", key: "traits", width: 38 },
    { header: isEn ? "Responsible Role" : "담당 주체", key: "role", width: 22 },
    { header: isEn ? "Applied Metrics & Screens" : "해당 지표 및 화면", key: "targets", width: 55 }
  ];

  sheet2.spliceRows(1, 0, [isEn ? "Summary of Data Entry Methods (Sync / Upload / Manual)" : "데이터 수집 및 입력 방식별 요약 분류"]);
  sheet2.mergeCells('A1:D1');
  const titleCell2 = sheet2.getCell('A1');
  titleCell2.font = { name: 'Malgun Gothic', size: 14, bold: true, color: { argb: WHITE } };
  titleCell2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
  titleCell2.alignment = { vertical: 'middle', horizontal: 'center' };
  sheet2.getRow(1).height = 36;

  sheet2.getRow(2).height = 26;
  sheet2.getRow(2).eachCell((c) => {
    c.font = { name: 'Malgun Gothic', size: 10, bold: true, color: { argb: WHITE } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BLUE_HEADER } };
    c.alignment = { vertical: 'middle', horizontal: 'center' };
    c.border = {
      top: { style: 'thin', color: { argb: GRAY_BORDER } },
      bottom: { style: 'medium', color: { argb: NAVY } },
      left: { style: 'thin', color: { argb: GRAY_BORDER } },
      right: { style: 'thin', color: { argb: GRAY_BORDER } }
    };
  });

  const summaryData = isEn ? [
    {
      category: "🔄 Automated Sync (PIMSVINA ERP)",
      traits: "Safe read-only Oracle DB extraction. Preview inspection before apply.",
      role: "System Admin (1-Click trigger)",
      targets: "Contract Amount, Actual Construction Progress (%), CBS Budget vs Actuals, Subcontract List & Monthly/Accum Progress, Site Cash Flow, Aerial & Monthly Photos, Cost Rates (Execution & Completion)."
    },
    {
      category: "📤 Excel File Upload",
      traits: "Bulk workbook upload via Admin modal with 1-click rollback history.",
      role: "Finance & Accounting / Admin",
      targets: "Corporate Management Report (Sales, Gross Profit, SG&A, Operating Profit, Orders), Cash Flow Workbook, Milestones Excel Template."
    },
    {
      category: "✍️ Direct Manual Entry",
      traits: "Web UI inputs in Project Data Entry Tab and Header Modals with auto-save & section locks.",
      role: "Project Managers & System Admin",
      targets: "Exchange Rates (USD/VND/KRW), Project General Metadata (Scale, Client, Area, Terms), Monthly Cost Plans by Trade, Planned Progress Rate (%), Bidding Cost Rate, Executive Comments."
    }
  ] : [
    {
      category: "🔄 ERP 자동 동기화 (PIMSVINA)",
      traits: "Oracle DB 안전 읽기전용 조회. 변경 사항 사전 검토(Preview) 후 1클릭 확정 반영.",
      role: "시스템 관리자 (버튼 실행)",
      targets: "도급액, 월별 실적 공정률(%), CBS 비목별 예산 및 실적, 외주 계약/기성 목록 및 당월/누계 기성, 현장 자금수지, 조감도 및 현장 월별 사진, 원가율(실행예산/준공추정)."
    },
    {
      category: "📤 엑셀 파일 일괄 업로드",
      traits: "관리자 업로드 모달을 통한 대용량 엑셀 파싱 및 이전 상태 되돌리기(Rollback) 이력 관리.",
      role: "경영기획 / 재무팀 / 관리자",
      targets: "전사 경영보고서(월별 매출, 매출이익, 판관비, 영업이익, 신규수주), 전사 자금수지 엑셀, 마일스톤 공정 엑셀 서식."
    },
    {
      category: "✍️ 화면 직접 수기 입력",
      traits: "프로젝트 데이터 입력 탭 및 헤더 모달을 통한 실시간 웹 입력 (자동 저장 및 마감 잠금 지원).",
      role: "현장 관리자 / 시스템 관리자",
      targets: "기준 환율(USD/VND/KRW), 프로젝트 일반제원(규모, 발주처, 연면적, 계약조건), 공종별 원가 투입 계획, 월간 계획 공정률(%), 입찰(Bidding) 원가율, 경영 실적/전망 코멘트."
    }
  ];

  summaryData.forEach((s) => {
    const row = sheet2.addRow(s);
    row.height = 36;
    row.eachCell((cell) => {
      cell.font = { name: 'Malgun Gothic', size: 9.5 };
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
  console.log('Excel generation completed successfully!');
}

main().catch(err => {
  console.error('Error generating Excel:', err);
  process.exit(1);
});
