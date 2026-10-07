import type {
  ProjectDetail,
  ProjectDetailProgressPoint,
  ProjectDetailMilestone,
  ProjectDetailCostEstimation,
  ProjectDetailCostBudget,
  ProjectDetailCostBudgetMonthly,
  ProjectDetailOutsourcing,
  ProjectDetailCashflowPoint,
  ProjectDetailCogsPoint,
  ProjectDetailSalesPoint,
} from "@workspace/api-client-react";

export type ProjectBusinessType = "시공" | "용역";
export type ExcelLang = "ko" | "en" | "vi";

type NumberedSheetKey =
  | "overview"
  | "progress"
  | "milestones"
  | "costEstimation"
  | "costBudget"
  | "costBudgetMonthly"
  | "outsourcing"
  | "cashflow"
  | "cogsMonthly"
  | "salesMonthly";
type SheetKey = NumberedSheetKey | "guide";

// 시트 번호는 "데이터 입력" 탭 화면에 실제로 찍히는 번호와 100% 일치시킨다(요청) — 이 번호는
// 사업 유형(시공/용역)마다 다르다(화면 자체가 그렇게 되어 있음: 예) 용역은 Budget Execution이 4번,
// 시공은 6번). 업로드 시에도 이 번호로 시트를 찾으므로 언어가 달라도 항상 동일하게 인식된다.
const SHEET_PREFIX_BY_TYPE: Record<ProjectBusinessType, Partial<Record<NumberedSheetKey, string>>> = {
  시공: {
    overview: "0",
    progress: "1",
    salesMonthly: "2",
    milestones: "3",
    costBudgetMonthly: "4",
    costEstimation: "5",
    costBudget: "6",
    outsourcing: "7",
    cashflow: "8",
  },
  용역: {
    overview: "0",
    costEstimation: "1",
    salesMonthly: "2",
    cogsMonthly: "3",
    costBudget: "4",
    outsourcing: "5",
    cashflow: "6",
  },
};

/** 시트 탭 이름(언어별 명칭). "작성 안내"는 화면에 없는 순수 안내용이라 번호를 붙이지 않는다. */
const SHEET_NAME_I18N: Record<SheetKey, Record<ExcelLang, string>> = {
  guide: { ko: "작성 안내", en: "Guide", vi: "Hướng dẫn" },
  overview: { ko: "개요", en: "Overview", vi: "Tổng quan" },
  progress: { ko: "공정률", en: "Progress", vi: "Tiến độ" },
  milestones: { ko: "마일스톤", en: "Milestones", vi: "Mốc tiến độ" },
  costEstimation: { ko: "원가율", en: "Cost Rate", vi: "Tỷ lệ chi phí" },
  costBudget: { ko: "예산집행", en: "Budget Execution", vi: "Thực hiện ngân sách" },
  costBudgetMonthly: { ko: "공정별월간원가", en: "Monthly Cost by Process", vi: "Chi phí hàng tháng theo công tác" },
  outsourcing: { ko: "외주자재", en: "Outsourcing & Material", vi: "Thầu phụ & Vật tư" },
  cashflow: { ko: "월별자금", en: "Monthly Cashflow", vi: "Dòng tiền hàng tháng" },
  cogsMonthly: { ko: "월별매출원가", en: "Monthly COGS", vi: "Giá vốn hàng tháng" },
  salesMonthly: { ko: "월별매출", en: "Monthly Revenue", vi: "Doanh thu hàng tháng" },
};

function sheetTabName(key: SheetKey, lang: ExcelLang, businessType: ProjectBusinessType): string {
  const label = SHEET_NAME_I18N[key][lang];
  const prefix = key === "guide" ? undefined : SHEET_PREFIX_BY_TYPE[businessType][key as NumberedSheetKey];
  return prefix ? `${prefix}.${label}` : label;
}

const HEADERS_I18N: Record<Exclude<SheetKey, "guide" | "overview">, Record<ExcelLang, string[]>> = {
  progress: {
    ko: ["연도", "월", "월간 계획(%)", "월간 실적(%)", "누계 계획(%)", "누계 실적(%)"],
    en: ["Year", "Month", "Monthly Plan(%)", "Monthly Actual(%)", "Cumulative Plan(%)", "Cumulative Actual(%)"],
    vi: ["Năm", "Tháng", "KH tháng(%)", "TH tháng(%)", "KH lũy kế(%)", "TH lũy kế(%)"],
  },
  milestones: {
    ko: ["구분", "계획 시작(YYYY-MM-DD)", "계획 종료(YYYY-MM-DD)", "실제 시작(YYYY-MM-DD)", "실제 종료(YYYY-MM-DD)"],
    en: ["Name", "Plan Start(YYYY-MM-DD)", "Plan End(YYYY-MM-DD)", "Actual Start(YYYY-MM-DD)", "Actual End(YYYY-MM-DD)"],
    vi: ["Tên mốc", "KH bắt đầu(YYYY-MM-DD)", "KH kết thúc(YYYY-MM-DD)", "TH bắt đầu(YYYY-MM-DD)", "TH kết thúc(YYYY-MM-DD)"],
  },
  costEstimation: {
    ko: ["구분(bidding/execution/completion)", "기준연도", "기준월", "도급액(Bil.VND)", "원가(Bil.VND)"],
    en: ["Kind(bidding/execution/completion)", "Base Year", "Base Month", "Contract Amount(Bil.VND)", "Cost(Bil.VND)"],
    vi: ["Loại(bidding/execution/completion)", "Năm cơ sở", "Tháng cơ sở", "Giá trị HĐ(Bil.VND)", "Chi phí(Bil.VND)"],
  },
  costBudget: {
    ko: ["Level 1", "Level 2", "비고", "예산(Bil.VND)", "누계 계획(Bil.VND)", "누계 실적(Bil.VND)"],
    en: ["Level 1", "Level 2", "Note", "Budget(Bil.VND)", "Cumulative Plan(Bil.VND)", "Cumulative Actual(Bil.VND)"],
    vi: ["Level 1", "Level 2", "Ghi chú", "Ngân sách(Bil.VND)", "KH lũy kế(Bil.VND)", "TH lũy kế(Bil.VND)"],
  },
  costBudgetMonthly: {
    ko: ["항목", "연도", "월", "계획(Bil.VND)", "실적(Bil.VND)"],
    en: ["Item", "Year", "Month", "Plan(Bil.VND)", "Actual(Bil.VND)"],
    vi: ["Hạng mục", "Năm", "Tháng", "KH(Bil.VND)", "TH(Bil.VND)"],
  },
  outsourcing: {
    ko: ["대공종", "세부공종", "업체", "구분", "계약일", "차수", "예산(Bil.VND)", "실행예산(Bil.VND)", "기성확정(Bil.VND)", "당월(Bil.VND)", "누계(Bil.VND)"],
    en: ["Trade Group", "Trade", "Vendor", "Category", "Contract Date", "Change No.", "Budget(Bil.VND)", "Executed Budget(Bil.VND)", "Resolved(Bil.VND)", "This Month(Bil.VND)", "Cumulative(Bil.VND)"],
    vi: ["Đại công tác", "Công tác chi tiết", "Nhà thầu", "Phân loại", "Ngày HĐ", "Lần thay đổi", "Ngân sách(Bil.VND)", "NS thực hiện(Bil.VND)", "Xác nhận(Bil.VND)", "Tháng này(Bil.VND)", "Lũy kế(Bil.VND)"],
  },
  cashflow: {
    ko: ["연도", "월", "수입(Bil.VND)", "지출(Bil.VND)", "보유현금(Bil.VND)", "기성 확정(Bil.VND)"],
    en: ["Year", "Month", "Cash In(Bil.VND)", "Cash Out(Bil.VND)", "Cash Equivalent(Bil.VND)", "Confirmed Progress(Bil.VND)"],
    vi: ["Năm", "Tháng", "Thu(Bil.VND)", "Chi(Bil.VND)", "Tiền mặt tồn(Bil.VND)", "Xác nhận(Bil.VND)"],
  },
  cogsMonthly: {
    ko: ["연도", "월", "회계 매출원가(Bil.VND)", "집행 매출원가 WIP(Bil.VND)"],
    en: ["Year", "Month", "Accounting COGS(Bil.VND)", "Executed COGS WIP(Bil.VND)"],
    vi: ["Năm", "Tháng", "Giá vốn kế toán(Bil.VND)", "Giá vốn thực hiện WIP(Bil.VND)"],
  },
  salesMonthly: {
    ko: ["연도", "월", "매출 계획(Bil.VND)", "매출 실적(Bil.VND)"],
    en: ["Year", "Month", "Sales Plan(Bil.VND)", "Sales Actual(Bil.VND)"],
    vi: ["Năm", "Tháng", "DT kế hoạch(Bil.VND)", "DT thực hiện(Bil.VND)"],
  },
};

type Cell = string | number | null;

/** (year,month)별 환율 조회 함수 — "월별 매출 환율 설정"(fx_rates/history)에서 그 달 환율을 찾고,
 * 없으면 null을 반환해 호출하는 쪽이 fxRateVnd(현재/계약 환율)로 폴백하게 한다. */
export type MonthlyVndRateLookup = (year: number, month: number) => number | null;

/** 천USD → Bil.VND 변환 (Excel 출력용). year/month와 monthlyRate가 있으면 그 달 환율을 우선 쓴다
 * (월별 매출/매출원가 시트 전용 — 다른 시트는 기존처럼 year/month 없이 현재/계약 환율만 쓴다). */
function toVnd(
  v: number | null | undefined,
  fxRateVnd: number,
  year?: number,
  month?: number,
  monthlyRate?: MonthlyVndRateLookup,
): number | null {
  if (v == null) return null;
  const rate = (year != null && month != null ? monthlyRate?.(year, month) : null) ?? fxRateVnd;
  return v * rate / 1_000_000;
}

/** VND 원본 값 → Bil.VND 변환 (환율 곱하지 않음 — 이미 VND이므로 1e9로만 나눔).
 * pd_overview.contractAmount, pd_cost_estimation의 execution/completion.contractAmount처럼
 * "천 USD"가 아니라 VND 원본 그대로 저장되는 필드용. */
function toVndRaw(v: number | null | undefined): number | null {
  if (v == null) return null;
  return v / 1_000_000_000;
}

/** Bil.VND → VND 원본 값 역변환 (toVndRaw()의 반대) */
function fromVndRaw(v: number | null): number | null {
  if (v == null) return null;
  return v * 1_000_000_000;
}

const THIN_BORDER = { style: "thin" as const, color: { argb: "FFC9D3E0" } };
const ALL_BORDERS = { top: THIN_BORDER, left: THIN_BORDER, bottom: THIN_BORDER, right: THIN_BORDER };
/** 천 단위 구분 + 소수점 2자리(금액용) */
const NUMFMT_MONEY = "#,##0.00";
/** 천 단위 구분, 소수점 없음(연도/월 등 순수 정수용 — 연도에 "2,026"처럼 쉼표 안 붙게 별도 처리) */
const NUMFMT_INT = "0";
/** 소수점 1자리(공정률 % 등) */
const NUMFMT_PERCENT = "0.0";

/** 번역된 가이드 문구(언어별) — 안내 시트 본문. */
const GUIDE_TEXT: Record<ExcelLang, {
  title: (bt: ProjectBusinessType) => string;
  rows: (projectName: string, bt: ProjectBusinessType, flow: string) => [string, string][];
}> = {
  ko: {
    title: (bt) => `${bt} 프로젝트 데이터 입력 안내`,
    rows: (projectName, bt, flow) => [
      ["양식 버전", new Date().toISOString().slice(0, 7)],
      ["프로젝트", projectName],
      ["사업 유형", bt],
      ["금액 단위", "Bil. VND (입력값은 저장 시 천 USD로 환산됩니다)"],
      ["권장 입력 순서", flow],
      ["작성 기준", "빈 셀은 미입력으로 처리됩니다. 월별 표는 연도·월 중복 없이 입력해 주세요."],
      ["예산 집행", "Level 1·Level 2 구조로 입력하며, 월별 계획·실적은 4-1 시트에서 항목·연도·월별로 관리합니다."],
      ["선택 항목", "월별 예산 항목: Common, Expense 1, Expense 2, Contingency, Outsourcing / 외주 대공종: 대공종, 건축, 기계, 전기, 토목, 조경, 경비"],
      ["사진", "현장 사진은 웹 화면의 데이터 입력 탭에서 별도로 업로드합니다."],
    ],
  },
  en: {
    title: (bt) => `${bt === "시공" ? "Construction" : "Service"} Project Data Entry Guide`,
    rows: (projectName, bt, flow) => [
      ["Template Version", new Date().toISOString().slice(0, 7)],
      ["Project", projectName],
      ["Business Type", bt === "시공" ? "Construction" : "Service"],
      ["Amount Unit", "Bil. VND (converted to thousand USD on save)"],
      ["Recommended Order", flow],
      ["Rules", "Blank cells are treated as not entered. Monthly tables must not have duplicate year/month rows."],
      ["Budget Execution", "Enter as Level 1/Level 2; monthly plan/actual are managed by item/year/month in sheet 4-1."],
      ["Allowed Values", "Monthly budget items: Common, Expense 1, Expense 2, Contingency, Outsourcing / Outsourcing trade groups: 대공종, 건축, 기계, 전기, 토목, 조경, 경비"],
      ["Photos", "Site photos are uploaded separately in the web Data Entry tab."],
    ],
  },
  vi: {
    title: (bt) => `Hướng dẫn nhập liệu dự án ${bt === "시공" ? "Thi công" : "Dịch vụ"}`,
    rows: (projectName, bt, flow) => [
      ["Phiên bản mẫu", new Date().toISOString().slice(0, 7)],
      ["Dự án", projectName],
      ["Loại hình", bt === "시공" ? "Thi công" : "Dịch vụ"],
      ["Đơn vị tiền tệ", "Bil. VND (tự động quy đổi sang nghìn USD khi lưu)"],
      ["Thứ tự nhập khuyến nghị", flow],
      ["Quy tắc nhập", "Ô trống coi như chưa nhập. Bảng theo tháng không được trùng năm/tháng."],
      ["Thực hiện ngân sách", "Nhập theo cấu trúc Level 1/Level 2; kế hoạch/thực hiện theo tháng quản lý theo hạng mục/năm/tháng ở sheet 4-1."],
      ["Giá trị cho phép", "Hạng mục ngân sách theo tháng: Common, Expense 1, Expense 2, Contingency, Outsourcing / Đại công tác thầu phụ: 대공종, 건축, 기계, 전기, 토목, 조경, 경비"],
      ["Hình ảnh", "Ảnh hiện trường được tải lên riêng ở tab Data Entry trên web."],
    ],
  },
};

/** 데이터 입력용 Excel 양식 다운로드 (Bil.VND 단위, 현재 환율 적용) */
export async function downloadProjectDetailTemplate(
  projectName: string,
  detail: ProjectDetail,
  fxRateVnd: number,
  businessType: ProjectBusinessType = "시공",
  monthlyVndRate?: MonthlyVndRateLookup,
  lang: ExcelLang = "ko",
  /** 웹 화면 "데이터 입력" 탭의 각 섹션 제목을 그대로 받는다(예: "0. Overview (Overview tab)",
   * "1. Monthly Progress (Progress tab)") — 호출 측이 t()로 번역해 넘긴다(요청: 엑셀 시트가 데이터
   * 입력 탭과 똑같은 제목을 보여줘야 함). 안 넘기면 시트 탭 이름만 쓰고 배너는 생략한다. */
  sectionTitles: Partial<Record<SheetKey, string>> = {},
  /** "월별 매출/매출원가" 시트의 계획(Plan) 열 전용 환율 조회 — purpose="plan" 트랙을 쓴다.
   * 생략하면 monthlyVndRate(실적, purpose="actual_forecast")로 대체한다(버그 수정: 예전에는 Plan도
   * 실적 환율로 변환해서, 계획 수립 시 고정 환율과 실적 월별 환율이 다를 때 Excel에 찍히는 Bil.VND
   * 금액이 화면 대시보드와 달라졌었다). */
  monthlyVndRatePlan?: MonthlyVndRateLookup,
): Promise<void> {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  wb.created = new Date();

  /** moneyCols/intCols/percentCols는 1-indexed 컬럼 번호 — 헤더 다음부터 쌓이는 본문 셀에만 서식 적용.
   * sectionTitles[key]가 있으면 헤더 위에 "데이터 입력" 탭과 동일한 제목 배너를 한 줄 추가한다
   * (업로드 시 parseProjectDetailWorkbook이 배너 유무를 자동 감지해 건너뛴다 — findSheet 참고). */
  const addSheet = (
    key: Exclude<SheetKey, "guide" | "overview">,
    rows: Cell[][],
    fmt?: { moneyCols?: number[]; intCols?: number[]; percentCols?: number[] },
  ) => {
    const ws = wb.addWorksheet(sheetTabName(key, lang, businessType));
    const header = HEADERS_I18N[key][lang];
    const title = sectionTitles[key];
    if (title) {
      ws.mergeCells(1, 1, 1, header.length);
      const banner = ws.getCell(1, 1);
      banner.value = title;
      banner.font = { bold: true, size: 12, color: { argb: "FFFFFFFF" } };
      banner.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A6E" } };
      banner.alignment = { horizontal: "left", vertical: "middle" };
      ws.getRow(1).height = 22;
    }
    const hr = ws.addRow(header);
    hr.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2E3C50" } };
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border = ALL_BORDERS;
    });
    for (const r of rows) {
      const row = ws.addRow(r);
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        cell.border = ALL_BORDERS;
        if (typeof cell.value === "number") {
          if (fmt?.moneyCols?.includes(colNumber)) {
            cell.numFmt = NUMFMT_MONEY;
            cell.alignment = { horizontal: "right" };
          } else if (fmt?.percentCols?.includes(colNumber)) {
            cell.numFmt = NUMFMT_PERCENT;
            cell.alignment = { horizontal: "right" };
          } else if (fmt?.intCols?.includes(colNumber)) {
            cell.numFmt = NUMFMT_INT;
            cell.alignment = { horizontal: "right" };
          } else {
            cell.alignment = { horizontal: "right" };
          }
        }
      });
    }
    ws.columns.forEach((col) => {
      col.width = 16;
    });
    return ws;
  };

  const tv = (v: number | null | undefined) => toVnd(v, fxRateVnd);
  // 월별 매출/매출원가 시트 전용 — 그 달에 "월별 매출 환율 설정"이 있으면 우선 적용한다.
  // 실적(Actual)은 purpose="actual_forecast" 트랙, 계획(Plan)은 purpose="plan" 트랙을 쓴다 — 서로
  // 다른 환율이므로 반드시 구분해야 한다(위 monthlyVndRatePlan 파라미터 주석 참고).
  const tvm = (v: number | null | undefined, year: number, month: number) =>
    toVnd(v, fxRateVnd, year, month, monthlyVndRate);
  const tvmPlan = (v: number | null | undefined, year: number, month: number) =>
    toVnd(v, fxRateVnd, year, month, monthlyVndRatePlan ?? monthlyVndRate);

  // 사업 유형에 맞는 작성 순서와 단위를 양식 안에서 바로 확인할 수 있게 한다 — 실제 시트 생성 순서와
  // 100% 일치시킨다 — 데이터 입력 탭 화면에 실제로 찍히는 번호 순서(SHEET_PREFIX_BY_TYPE)를 그대로
  // 따른다. 시공: 0개요→1공정률→2월별매출→3마일스톤→4공정별월간원가→5원가율→6예산집행→7외주자재→
  // 8월별자금. 용역: 0개요→1원가율(계약금액·원가)→2월별매출→3월별매출원가→4예산집행→5외주자재→
  // 6월별자금. (costBudgetMonthly는 용역 화면엔 별도 번호 섹션이 없어 안내 순서에서는 뺀다.)
  {
    const ws = wb.addWorksheet(sheetTabName("guide", lang, businessType));
    const flowKeys: SheetKey[] =
      businessType === "시공"
        ? ["overview", "progress", "salesMonthly", "milestones", "costBudgetMonthly", "costEstimation", "costBudget", "outsourcing", "cashflow"]
        : ["overview", "costEstimation", "salesMonthly", "cogsMonthly", "costBudget", "outsourcing", "cashflow"];
    const flow = flowKeys.map((k) => sheetTabName(k, lang, businessType)).join("  →  ");
    ws.mergeCells("A1:D1");
    const title = ws.getCell("A1");
    title.value = GUIDE_TEXT[lang].title(businessType);
    title.font = { bold: true, size: 15, color: { argb: "FFFFFFFF" } };
    title.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A6E" } };
    title.alignment = { horizontal: "center", vertical: "middle" };
    ws.getRow(1).height = 26;
    GUIDE_TEXT[lang].rows(projectName, businessType, flow).forEach(([label, value]) => {
      const row = ws.addRow([label, value]);
      row.getCell(1).font = { bold: true, size: 10, color: { argb: "FF16294A" } };
      row.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEEF2F7" } };
      row.getCell(1).border = ALL_BORDERS;
      row.getCell(2).alignment = { wrapText: true, vertical: "top" };
      row.getCell(2).border = ALL_BORDERS;
    });
    ws.getColumn(1).width = 18;
    ws.getColumn(2).width = 100;
  }

  // 개요 (key/value) — 업로드 시 라벨 문자열로 역매칭하므로(parseProjectDetailWorkbook의
  // overviewTextFields) 라벨은 언어와 무관하게 항상 한국어로 고정한다(번역하면 업로드가 깨짐).
  // 숫자값(도급액 등)에는 Bil.VND 포맷 + 테두리를 적용한다.
  {
    const ov = detail.overview;
    const ws = wb.addWorksheet(sheetTabName("overview", lang, businessType));
    const overviewTitle = sectionTitles.overview;
    if (overviewTitle) {
      ws.mergeCells("A1:B1");
      const banner = ws.getCell("A1");
      banner.value = overviewTitle;
      banner.font = { bold: true, size: 12, color: { argb: "FFFFFFFF" } };
      banner.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A6E" } };
      banner.alignment = { horizontal: "left", vertical: "middle" };
      ws.getRow(1).height = 22;
    }
    const rows: [string, Cell][] = [
      ["현장코드", ov.siteCode ?? null],
      ["발주처", ov.client ?? null],
      ["착공일(YYYY-MM-DD)", ov.startDate ?? null],
      ["준공일(YYYY-MM-DD)", ov.endDate ?? null],
      // 도급액은 VND 원본 그대로 저장되는 필드라서 tv()(천USD→BilVND, 환율 곱함)가 아니라
      // toVndRaw()(이미 VND이므로 1e9로만 나눔)를 써야 한다 — tv()를 쓰면 환율을 한 번 더 곱해
      // 값이 수만 배 부풀려진다.
      ["도급액(Bil.VND)", toVndRaw(ov.contractAmount)],
      ["공사규모", ov.scale ?? null],
      ["위치", ov.location ?? null],
      ["대지면적", ov.siteArea ?? null],
      ["연면적", ov.grossFloorArea ?? null],
      ["용도", ov.purpose ?? null],
      ["지분", ov.ownershipStake ?? null],
      ["파트너사", ov.partnerCompany ?? null],
      ["계약방식", ov.contractMethod ?? null],
      ["수금조건", ov.paymentTerms ?? null],
      ["하자보증기간", ov.defectWarrantyPeriod ?? null],
      ["하자보증증권", ov.defectWarrantyBond ?? null],
      ["선급금", ov.advancePayment ?? null],
      ["유보금", ov.retention ?? null],
      ["VE 조건", ov.veTerms ?? null],
      ["작성 기준월(YYYY-MM)", ov.asOfMonth ?? null],
      ["수행내용", ov.scope ?? null],
      ["연간 매출 목표(Bil.VND)", tv(ov.revenueAnnualTarget)],
      ["누계 매출 실적(Bil.VND)", tv(ov.revenueTotal)],
      ["Cash Confirmed(Bil.VND)", tv(ov.cashConfirmed)],
      ["Cash Collection(Bil.VND)", tv(ov.cashCollection)],
    ];
    for (const [k, v] of rows) {
      const r = ws.addRow([k, v]);
      r.getCell(1).font = { bold: true, size: 10 };
      r.getCell(1).border = ALL_BORDERS;
      r.getCell(2).border = ALL_BORDERS;
      if (typeof v === "number") {
        r.getCell(2).numFmt = NUMFMT_MONEY;
        r.getCell(2).alignment = { horizontal: "right" };
      }
    }
    ws.getColumn(1).width = 22;
    ws.getColumn(2).width = 30;
  }

  if (businessType === "시공") {
    addSheet(
      "progress",
      detail.progress.map((p) => [p.year, p.month, p.planPct ?? null, p.actualPct ?? null, p.planCumPct ?? null, p.actualCumPct ?? null]),
      { intCols: [1, 2], percentCols: [3, 4, 5, 6] },
    );
    addSheet(
      "milestones",
      detail.milestones.map((m) => [m.label, m.planStart ?? null, m.planEnd ?? null, m.actualStart ?? null, m.actualEnd ?? null]),
    );
  }
  addSheet(
    "costEstimation",
    detail.costEstimation.map((e) => {
      // bidding은 수동 입력(천 USD 저장)이라 tv() 그대로. execution/completion은 PIMSVINA 동기화
      // 전용 값 — contractAmount/costAmount가 VND 원본(또는 completion의 경우 REC9 원본 숫자)이라
      // tv()를 쓰면 환율을 잘못 곱하게 된다. 두 kind 모두 동기화로만 갱신되므로 이 시트에는 참고용
      // 스냅샷으로만 내보내고(단위 변환 없이 원본 숫자 그대로), 업로드로 되돌아와도 무시한다.
      if (e.kind === "bidding") {
        return [e.kind, e.year ?? null, e.month ?? null, tv(e.contractAmount), tv(e.costAmount)];
      }
      return [e.kind, e.year ?? null, e.month ?? null, e.contractAmount ?? null, e.costAmount ?? null];
    }),
    { intCols: [2, 3], moneyCols: [4, 5] },
  );
  // budget/actual은 PIMSVINA 동기화 값(VND 원본, toVndRaw())이고 plan은 수기 입력(천 USD, tv()) —
  // 서로 다른 단위가 한 행에 섞여 있는 costBudgetMonthly와 동일한 이유(위 주석 참고).
  const costBudgetSheet = addSheet(
    "costBudget",
    detail.costBudget.map((b) => [b.category ?? null, b.item, null, toVndRaw(b.budget), tv(b.plan), toVndRaw(b.actual)]),
    { moneyCols: [4, 5, 6] },
  );
  costBudgetSheet.dataValidations.add("A2:A1000", {
    type: "list",
    allowBlank: true,
    formulae: ['"Direct Cost,Indirect Cost"'],
  });
  // plan là nhập tay (천 USD, dùng tv()) nhưng actual từ PIMSVINA sync là VND gốc (dùng toVndRaw()) —
  // hai đơn vị khác nhau trong cùng 1 dòng, xem comment ở costEstimation sheet phía trên.
  const costBudgetMonthlySheet = addSheet(
    "costBudgetMonthly",
    (detail.costBudgetMonthly ?? []).map((b) => [b.item, b.year, b.month, tv(b.plan), toVndRaw(b.actual)]),
    { intCols: [2, 3], moneyCols: [4, 5] },
  );
  costBudgetMonthlySheet.dataValidations.add("A2:A1000", {
    type: "list",
    allowBlank: false,
    formulae: ['"Common,Expense 1,Expense 2,Contingency,Outsourcing"'],
  });
  // budget/executedBudget/resolved/thisMonth/accum của pd_outsourcing lưu VND gốc (PIMSVINA sync,
  // không quy đổi kUSD) — dùng toVndRaw() thay vì tv().
  const outsourcingSheet = addSheet(
    "outsourcing",
    detail.outsourcing.map((o) => [
      o.tradeGroup ?? null,
      o.trade,
      o.vendor ?? null,
      o.category ?? null,
      o.contractDate ?? null,
      o.changeNo ?? null,
      toVndRaw(o.budget),
      toVndRaw(o.executedBudget),
      toVndRaw(o.resolved),
      toVndRaw(o.thisMonth),
      toVndRaw(o.accum),
    ]),
    { moneyCols: [7, 8, 9, 10, 11] },
  );
  outsourcingSheet.dataValidations.add("A2:A1000", {
    type: "list",
    allowBlank: true,
    formulae: ['"대공종,건축,기계,전기,토목,조경,경비"'],
  });
  addSheet(
    "cashflow",
    detail.cashflow.map((c) => [c.year, c.month, tv(c.cashIn), tv(c.cashOut), tv(c.equivalent), tv(c.confirmedProgress)]),
    { intCols: [1, 2], moneyCols: [3, 4, 5, 6] },
  );
  if (businessType === "용역") {
    addSheet(
      "cogsMonthly",
      (detail.cogsMonthly ?? []).map((c) => [c.year, c.month, tvm(c.acctCogs, c.year, c.month), tvm(c.wipCogs, c.year, c.month)]),
      { intCols: [1, 2], moneyCols: [3, 4] },
    );
  }
  addSheet(
    "salesMonthly",
    (detail.salesMonthly ?? []).map((s) => [s.year, s.month, tvmPlan(s.plan, s.year, s.month), tvm(s.actual, s.year, s.month)]),
    { intCols: [1, 2], moneyCols: [3, 4] },
  );

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${projectName}_${businessType}_데이터입력_${new Date().toISOString().slice(0, 10)}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}

// ---------- 업로드(파싱) ----------

function cellStr(v: unknown): string | null {
  if (v == null) return null;
  if (v instanceof Date) {
    const y = v.getFullYear();
    const m = String(v.getMonth() + 1).padStart(2, "0");
    const d = String(v.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  if (typeof v === "object") {
    const o = v as { text?: unknown; result?: unknown; richText?: Array<{ text: string }> };
    if (Array.isArray(o.richText)) return o.richText.map((t) => t.text).join("").trim() || null;
    if (o.text != null) return String(o.text).trim() || null;
    if (o.result != null) return cellStr(o.result);
    return null;
  }
  const s = String(v).trim();
  return s.length > 0 ? s : null;
}

function cellNum(v: unknown): number | null {
  if (v == null) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "object") {
    const o = v as { result?: unknown };
    if (o.result != null) return cellNum(o.result);
  }
  const s = String(v).replace(/,/g, "").trim();
  if (s.length === 0) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function cellInt(v: unknown): number | null {
  const n = cellNum(v);
  return n == null ? null : Math.round(n);
}

/** 'YYYY-MM' 정규화 (Date/문자열 허용) */
function cellYm(v: unknown): string | null {
  const s = cellStr(v);
  if (!s) return null;
  // 전체 문자열이 YYYY-MM 또는 YYYY-MM-DD 형태여야 하고, 월은 1~12만 허용
  const m = /^(\d{4})[-./](\d{1,2})(?:[-./]\d{1,2})?$/.exec(s);
  if (!m) return null;
  const month = Number(m[2]);
  if (month < 1 || month > 12) return null;
  return `${m[1]}-${m[2].padStart(2, "0")}`;
}

/** 'YYYY-MM-DD' 정규화 (Date/문자열/YYYY-MM 허용; YYYY-MM 입력 시 01일로 보완) */
function cellYmd(v: unknown): string | null {
  if (v instanceof Date || (typeof v === "object" && v != null)) {
    // ExcelJS Date 객체: cellStr이 YYYY-MM-DD로 변환
  }
  const s = cellStr(v);
  if (!s) return null;
  // YYYY-MM-DD
  const full = /^(\d{4})[-./](\d{1,2})[-./](\d{1,2})$/.exec(s);
  if (full) {
    const mo = Number(full[2]), dd = Number(full[3]);
    if (mo < 1 || mo > 12 || dd < 1 || dd > 31) return null;
    return `${full[1]}-${full[2].padStart(2, "0")}-${full[3].padStart(2, "0")}`;
  }
  // YYYY-MM → 1일로 보완
  const ym = /^(\d{4})[-./](\d{1,2})$/.exec(s);
  if (ym) {
    const mo = Number(ym[2]);
    if (mo < 1 || mo > 12) return null;
    return `${ym[1]}-${ym[2].padStart(2, "0")}-01`;
  }
  return null;
}

export class ExcelParseError extends Error {}

/** Bil.VND → 천USD 역변환 (Excel 업로드용). year/month와 monthlyRate가 있으면 그 달 환율을 우선 쓴다
 * (toVnd()의 정확한 역변환 — 내보낼 때 쓴 환율 그대로 되돌려야 왕복(다운로드→업로드)이 어긋나지 않는다). */
function fromVnd(
  v: number | null,
  fxRateVnd: number,
  year?: number,
  month?: number,
  monthlyRate?: MonthlyVndRateLookup,
): number | null {
  if (v == null) return null;
  const rate = (year != null && month != null ? monthlyRate?.(year, month) : null) ?? fxRateVnd;
  return v * 1_000_000 / rate;
}

/**
 * 업로드된 양식을 파싱해 ProjectDetail 본문을 만든다.
 * 시트가 없는 항목은 기존(existing) 값을 유지하고, 사진(photos)은 항상 기존 값을 유지한다.
 */
export async function parseProjectDetailWorkbook(
  file: File,
  existing: ProjectDetail,
  fxRateVnd: number,
  monthlyVndRate?: MonthlyVndRateLookup,
  businessType: ProjectBusinessType = "시공",
  /** downloadProjectDetailTemplate()의 monthlyVndRatePlan과 동일 — Plan 열은 purpose="plan" 환율로
   * 되돌려야 다운로드 때 쓴 환율과 정확히 역변환된다(왕복 불일치 버그 방지). */
  monthlyVndRatePlan?: MonthlyVndRateLookup,
): Promise<ProjectDetail> {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await file.arrayBuffer());

  // 번호가 붙은 시트(사업 유형마다 번호가 다르다 — SHEET_PREFIX_BY_TYPE 참고)는 그 번호로 찾는다 —
  // 다운로드를 어느 언어로 받았든(한국어/영어/베트남어) 번호는 항상 같아서 언어와 무관하게 인식된다.
  // "작성 안내"는 화면에 없는 시트라 3개 언어 이름 중 하나와 일치하는지로 찾는다.
  const findSheet = (key: SheetKey) => {
    const prefix = key === "guide" ? undefined : SHEET_PREFIX_BY_TYPE[businessType][key as NumberedSheetKey];
    if (prefix) {
      return wb.worksheets.find((ws) => new RegExp(`^${prefix}\\.`).test(ws.name.trim()));
    }
    const variants = new Set(Object.values(SHEET_NAME_I18N[key]).map((v) => v.trim()));
    return wb.worksheets.find((ws) => variants.has(ws.name.trim()));
  };

  const rowsOf = (key: SheetKey, skipHeader: boolean): unknown[][] | null => {
    const ws = findSheet(key);
    if (!ws) return null;
    // 다운로드 시 "데이터 입력" 탭과 같은 제목 배너를 1행에 넣었으면(sectionTitles), 그 배너 행은
    // 병합 셀이라 값이 1칸에만 들어있다 — 실제 헤더는 1칸 그대로인 일반 행과 구분해서 2행부터로
    // 밀어준다. 배너가 없는(예전) 양식은 1행이 그대로 헤더라 동작이 바뀌지 않는다.
    const row1 = ws.getRow(1);
    let row1FilledCols = 0;
    for (let c = 1; c <= 11; c++) if (row1.getCell(c).value != null) row1FilledCols++;
    const hasBanner = row1FilledCols === 1 && skipHeader;
    const headerRowIdx = hasBanner ? 2 : 1;
    const rows: unknown[][] = [];
    ws.eachRow({ includeEmpty: false }, (row, idx) => {
      if (idx <= (skipHeader ? headerRowIdx : headerRowIdx - 1)) return;
      const vals: unknown[] = [];
      for (let c = 1; c <= 11; c++) vals.push(row.getCell(c).value);
      if (vals.some((v) => cellStr(v) != null || cellNum(v) != null)) rows.push(vals);
    });
    return rows;
  };

  const fv = (v: unknown) => fromVnd(cellNum(v), fxRateVnd);
  // 월별 매출/매출원가 시트 전용 — 그 달 "월별 매출 환율 설정"이 있으면 우선 적용한다. Plan 열은
  // purpose="plan" 트랙(fvmPlan), Actual 열은 purpose="actual_forecast" 트랙(fvm)을 쓴다.
  const fvm = (v: unknown, year: number, month: number) =>
    fromVnd(cellNum(v), fxRateVnd, year, month, monthlyVndRate);
  const fvmPlan = (v: unknown, year: number, month: number) =>
    fromVnd(cellNum(v), fxRateVnd, year, month, monthlyVndRatePlan ?? monthlyVndRate);

  const result: ProjectDetail = { ...existing, photos: existing.photos };

  // 개요
  {
    const rows = rowsOf("overview", false);
    if (rows) {
      const map = new Map<string, unknown>();
      for (const r of rows) {
        const k = cellStr(r[0]);
        if (k) map.set(k.replace(/\(.*\)$/, "").trim(), r[1]);
      }
      result.overview = {
        ...existing.overview,
        siteCode: cellStr(map.get("현장코드")) ?? existing.overview.siteCode ?? null,
        client: cellStr(map.get("발주처")) ?? null,
        startDate: cellYmd(map.get("착공일")) ?? null,
        endDate: cellYmd(map.get("준공일")) ?? null,
        // 도급액은 VND 원본 그대로 저장되므로 fv()(BilVND→천USD, 환율로 나눔)가 아니라
        // fromVndRaw()(BilVND→VND, 1e9만 곱함)를 써야 한다.
        contractAmount: fromVndRaw(cellNum(map.get("도급액"))) ?? null,
        scale: cellStr(map.get("공사규모")) ?? null,
      };
      const overviewTextFields = [
        ["위치", "location"],
        ["대지면적", "siteArea"],
        ["연면적", "grossFloorArea"],
        ["용도", "purpose"],
        ["지분", "ownershipStake"],
        ["파트너사", "partnerCompany"],
        ["계약방식", "contractMethod"],
        ["수금조건", "paymentTerms"],
        ["하자보증기간", "defectWarrantyPeriod"],
        ["하자보증증권", "defectWarrantyBond"],
        ["선급금", "advancePayment"],
        ["유보금", "retention"],
        ["VE 조건", "veTerms"],
      ] as const;
      for (const [label, field] of overviewTextFields) {
        if (map.has(label)) result.overview[field] = cellStr(map.get(label));
      }
      // 신규 항목: 해당 행이 양식에 존재할 때만 반영(구버전 양식은 기존 값 유지)
      if (map.has("작성 기준월")) {
        const ym = cellYm(map.get("작성 기준월"));
        if (map.get("작성 기준월") != null && cellStr(map.get("작성 기준월")) != null && ym == null) {
          throw new ExcelParseError(`[${SHEET_NAME_I18N.overview.ko}] 작성 기준월은 YYYY-MM 형식으로 입력해 주세요.`);
        }
        result.overview.asOfMonth = ym;
      }
      if (map.has("수행내용")) result.overview.scope = cellStr(map.get("수행내용"));
      if (map.has("연간 매출 목표")) result.overview.revenueAnnualTarget = fv(map.get("연간 매출 목표"));
      if (map.has("누계 매출 실적")) result.overview.revenueTotal = fv(map.get("누계 매출 실적"));
      if (map.has("Cash Confirmed")) result.overview.cashConfirmed = fv(map.get("Cash Confirmed"));
      if (map.has("Cash Collection")) result.overview.cashCollection = fv(map.get("Cash Collection"));
    }
  }

  // 공정률
  {
    const rows = rowsOf("progress", true);
    if (rows) {
      const out: ProjectDetailProgressPoint[] = [];
      rows.forEach((r, i) => {
        const year = cellInt(r[0]);
        const month = cellInt(r[1]);
        if (year == null || month == null) throw new ExcelParseError(`[${SHEET_NAME_I18N.progress.ko}] ${i + 2}행: 연도/월이 비어 있습니다.`);
        if (month < 1 || month > 12) throw new ExcelParseError(`[${SHEET_NAME_I18N.progress.ko}] ${i + 2}행: 월(${month})이 올바르지 않습니다.`);
        out.push({
          year,
          month,
          planPct: cellNum(r[2]),
          actualPct: cellNum(r[3]),
          planCumPct: cellNum(r[4]),
          actualCumPct: cellNum(r[5]),
        });
      });
      result.progress = out;
    }
  }

  // 마일스톤
  {
    const rows = rowsOf("milestones", true);
    if (rows) {
      const out: ProjectDetailMilestone[] = [];
      rows.forEach((r, i) => {
        const label = cellStr(r[0]);
        if (!label) throw new ExcelParseError(`[${SHEET_NAME_I18N.milestones.ko}] ${i + 2}행: 구분(이름)이 비어 있습니다.`);
        out.push({
          label,
          planStart: cellYmd(r[1]),
          planEnd: cellYmd(r[2]),
          actualStart: cellYmd(r[3]),
          actualEnd: cellYmd(r[4]),
        });
      });
      result.milestones = out;
    }
  }

  // 원가율
  {
    const rows = rowsOf("costEstimation", true);
    if (rows) {
      const out: ProjectDetailCostEstimation[] = [];
      rows.forEach((r, i) => {
        const kindRaw = (cellStr(r[0]) ?? "").toLowerCase();
        const kind = kindRaw.includes("bid") ? "bidding" : kindRaw.includes("exec") ? "execution" : kindRaw.includes("comp") ? "completion" : null;
        if (!kind) throw new ExcelParseError(`[${SHEET_NAME_I18N.costEstimation.ko}] ${i + 2}행: 구분은 bidding/execution/completion 중 하나여야 합니다.`);
        // bidding만 수동 입력(천 USD 저장) — fv()로 BilVND→천USD 변환. execution/completion은
        // PIMSVINA 동기화 전용 값(VND 원본/REC9 원본)이라 원본 숫자 그대로 읽는다(fv()를 쓰면 환율을
        // 잘못 곱하게 됨). 이 시트에서 입력해도 다음 동기화 때 다시 덮어써진다.
        out.push({
          kind,
          year: cellInt(r[1]),
          month: cellInt(r[2]),
          contractAmount: kind === "bidding" ? fv(r[3]) : cellNum(r[3]),
          costAmount: kind === "bidding" ? fv(r[4]) : cellNum(r[4]),
        });
      });
      // 준공 전망(completion) 검증: 기준월 중복 / 기준월 없는 행 다중 입력 방지 (데이터 입력 화면과 동일 규칙)
      const completions = out.filter((e) => e.kind === "completion" && (e.contractAmount != null || e.costAmount != null));
      if (completions.filter((e) => e.year == null || e.month == null).length > 1) {
        throw new ExcelParseError(`[${SHEET_NAME_I18N.costEstimation.ko}] 준공 전망(completion)에서 기준연도/월이 없는 행은 1건만 입력할 수 있습니다.`);
      }
      const seen = new Set<string>();
      for (const c of completions) {
        if (c.year == null || c.month == null) continue;
        if (c.month < 1 || c.month > 12) {
          throw new ExcelParseError(`[${SHEET_NAME_I18N.costEstimation.ko}] 준공 전망의 기준월(${c.month})이 올바르지 않습니다.`);
        }
        const key = `${c.year}-${c.month}`;
        if (seen.has(key)) {
          throw new ExcelParseError(`[${SHEET_NAME_I18N.costEstimation.ko}] 준공 전망에 같은 기준월(${c.year}.${String(c.month).padStart(2, "0")})이 중복 입력되었습니다.`);
        }
        seen.add(key);
      }
      result.costEstimation = out;
    }
  }

  // 예산 집행
  {
    const rows = rowsOf("costBudget", true);
    if (rows) {
      const out: ProjectDetailCostBudget[] = [];
      const ws = findSheet("costBudget");
      // 제목 배너가 있으면(sectionTitles로 내보낸 새 양식) 헤더가 2행으로 밀린다 — 1행/2행 둘 다
      // 확인해서 "Level 1"(3개 언어 공통 표기) 헤더를 찾는다.
      const hierarchyLayout =
        cellStr(ws?.getRow(1).getCell(1).value) === "Level 1" ||
        cellStr(ws?.getRow(2).getCell(1).value) === "Level 1";
      rows.forEach((r, i) => {
        const item = cellStr(r[1]);
        if (!item) throw new ExcelParseError(`[${SHEET_NAME_I18N.costBudget.ko}] ${i + 2}행: 항목이 비어 있습니다.`);
        const previous = existing.costBudget.find(
          (entry) => entry.item.trim().toLowerCase() === item.trim().toLowerCase(),
        );
        out.push({
          category: cellStr(r[0]),
          item,
          // budget은 VND 원본(toVndRaw() 반대인 fromVndRaw()) — export와 동일 단위(위 costBudgetSheet
          // 주석 참고). "누계 계획/실적" 두 컬럼은 확인용으로만 내보내며(다른 화면에서 자동 계산되거나
          // 동기화로 갱신되는 값이라), 기존과 동일하게 업로드 시에는 무시하고 기존 값을 보존한다.
          budget: hierarchyLayout ? fromVndRaw(cellNum(r[3])) : fv(r[2]),
          plan: hierarchyLayout ? previous?.plan ?? null : fv(r[3]),
          actual: hierarchyLayout ? previous?.actual ?? null : fv(r[4]),
        });
      });
      result.costBudget = out;
    }
  }

  // 공정별 월간 원가 계획/실적
  {
    const rows = rowsOf("costBudgetMonthly", true);
    if (rows) {
      const out: ProjectDetailCostBudgetMonthly[] = [];
      const seen = new Set<string>();
      rows.forEach((r, i) => {
        const item = cellStr(r[0]);
        const yearRaw = cellNum(r[1]);
        const monthRaw = cellNum(r[2]);
        if (!item) {
          throw new ExcelParseError(`[${SHEET_NAME_I18N.costBudgetMonthly.ko}] ${i + 2}행: 항목이 비어 있습니다.`);
        }
        if (yearRaw == null || monthRaw == null) {
          throw new ExcelParseError(`[${SHEET_NAME_I18N.costBudgetMonthly.ko}] ${i + 2}행: 연도/월이 비어 있습니다.`);
        }
        if (!Number.isInteger(yearRaw) || !Number.isInteger(monthRaw)) {
          throw new ExcelParseError(`[${SHEET_NAME_I18N.costBudgetMonthly.ko}] ${i + 2}행: 연도/월은 정수여야 합니다. (${yearRaw}/${monthRaw})`);
        }
        if (monthRaw < 1 || monthRaw > 12) {
          throw new ExcelParseError(`[${SHEET_NAME_I18N.costBudgetMonthly.ko}] ${i + 2}행: 월(${monthRaw})이 올바르지 않습니다.`);
        }
        const key = `${item.trim().toLowerCase()}:${yearRaw}-${monthRaw}`;
        if (seen.has(key)) {
          throw new ExcelParseError(
            `[${SHEET_NAME_I18N.costBudgetMonthly.ko}] 같은 항목과 월(${item}, ${yearRaw}.${String(monthRaw).padStart(2, "0")})이 중복 입력되었습니다.`,
          );
        }
        seen.add(key);
        out.push({
          item,
          year: yearRaw,
          month: monthRaw,
          plan: fv(r[3]),
          actual: fromVndRaw(cellNum(r[4])),
        });
      });
      result.costBudgetMonthly = out;
    }
  }

  // 외주/자재
  {
    const rows = rowsOf("outsourcing", true);
    if (rows) {
      const out: ProjectDetailOutsourcing[] = [];
      rows.forEach((r, i) => {
        const trade = cellStr(r[1]);
        if (!trade) throw new ExcelParseError(`[${SHEET_NAME_I18N.outsourcing.ko}] ${i + 2}행: 세부공종이 비어 있습니다.`);
        out.push({
          tradeGroup: cellStr(r[0]),
          trade,
          vendor: cellStr(r[2]),
          category: cellStr(r[3]),
          contractDate: cellStr(r[4]),
          changeNo: cellStr(r[5]),
          budget: fromVndRaw(cellNum(r[6])),
          executedBudget: fromVndRaw(cellNum(r[7])),
          resolved: fromVndRaw(cellNum(r[8])),
          thisMonth: fromVndRaw(cellNum(r[9])),
          accum: fromVndRaw(cellNum(r[10])),
          // Excel 시트에는 fldCode/ordContTypeCode(계약 식별자)가 없다 — pd_outsourcing이 월별 이력
          // 테이블로 바뀐 뒤로는 서버 PUT 핸들러가 이 두 필드로만 계약을 찾아 tradeGroup을 갱신하므로,
          // 이 시트로 업로드한 행은 실제로 반영되지 않는다(타입 요구사항만 맞추는 값 — 의미 없음).
          year: new Date().getFullYear(),
          month: new Date().getMonth() + 1,
        });
      });
      result.outsourcing = out;
    }
  }

  // 월별 자금
  {
    const rows = rowsOf("cashflow", true);
    if (rows) {
      const out: ProjectDetailCashflowPoint[] = [];
      rows.forEach((r, i) => {
        const year = cellInt(r[0]);
        const month = cellInt(r[1]);
        if (year == null || month == null) throw new ExcelParseError(`[${SHEET_NAME_I18N.cashflow.ko}] ${i + 2}행: 연도/월이 비어 있습니다.`);
        if (month < 1 || month > 12) throw new ExcelParseError(`[${SHEET_NAME_I18N.cashflow.ko}] ${i + 2}행: 월(${month})이 올바르지 않습니다.`);
        out.push({
          year,
          month,
          cashIn: fv(r[2]),
          cashOut: fv(r[3]),
          equivalent: fv(r[4]),
          confirmedProgress: fv(r[5]),
        });
      });
      result.cashflow = out;
    }
  }

  // 월별 매출원가
  {
    const rows = rowsOf("cogsMonthly", true);
    if (rows) {
      const out: ProjectDetailCogsPoint[] = [];
      const seen = new Set<string>();
      rows.forEach((r, i) => {
        const year = cellInt(r[0]);
        const month = cellInt(r[1]);
        if (year == null || month == null) throw new ExcelParseError(`[${SHEET_NAME_I18N.cogsMonthly.ko}] ${i + 2}행: 연도/월이 비어 있습니다.`);
        if (month < 1 || month > 12) throw new ExcelParseError(`[${SHEET_NAME_I18N.cogsMonthly.ko}] ${i + 2}행: 월(${month})이 올바르지 않습니다.`);
        const key = `${year}-${month}`;
        if (seen.has(key)) {
          throw new ExcelParseError(`[${SHEET_NAME_I18N.cogsMonthly.ko}] 같은 월(${year}.${String(month).padStart(2, "0")})이 중복 입력되었습니다.`);
        }
        seen.add(key);
        out.push({ year, month, acctCogs: fvm(r[2], year, month), wipCogs: fvm(r[3], year, month) });
      });
      result.cogsMonthly = out;
    }
  }

  // 월별 매출 (계획/실적)
  {
    const rows = rowsOf("salesMonthly", true);
    if (rows) {
      const out: ProjectDetailSalesPoint[] = [];
      const seen = new Set<string>();
      rows.forEach((r, i) => {
        const yearRaw = cellNum(r[0]);
        const monthRaw = cellNum(r[1]);
        if (yearRaw == null || monthRaw == null) throw new ExcelParseError(`[${SHEET_NAME_I18N.salesMonthly.ko}] ${i + 2}행: 연도/월이 비어 있습니다.`);
        if (!Number.isInteger(yearRaw) || !Number.isInteger(monthRaw)) {
          throw new ExcelParseError(`[${SHEET_NAME_I18N.salesMonthly.ko}] ${i + 2}행: 연도/월은 정수여야 합니다. (${yearRaw}/${monthRaw})`);
        }
        const year = yearRaw;
        const month = monthRaw;
        if (month < 1 || month > 12) throw new ExcelParseError(`[${SHEET_NAME_I18N.salesMonthly.ko}] ${i + 2}행: 월(${month})이 올바르지 않습니다.`);
        const key = `${year}-${month}`;
        if (seen.has(key)) {
          throw new ExcelParseError(`[${SHEET_NAME_I18N.salesMonthly.ko}] 같은 월(${year}.${String(month).padStart(2, "0")})이 중복 입력되었습니다.`);
        }
        seen.add(key);
        out.push({ year, month, plan: fvmPlan(r[2], year, month), actual: fvm(r[3], year, month) });
      });
      result.salesMonthly = out;
    }
  }

  return result;
}

// ---------- 마일스톤 전용 (섹션 단위 다운로드/업로드) ----------
// PIMSVINA 동기화가 제공하던 근사치(CBTB_CONSTHISTORY 기반, Plan 없이 단일 이벤트 날짜만 존재)를
// 대체한다 - 사용자가 직접 계획/실적 마일스톤을 Excel로 일괄 입력할 수 있도록, 전체 프로젝트
// 데이터 입력 양식(downloadProjectDetailTemplate)과 별도로 마일스톤 시트 하나만 다루는 경량 버전.

/** 마일스톤 전용 Excel 양식 다운로드 (날짜만 다루므로 환율 변환 불필요) */
export async function downloadMilestonesTemplate(
  projectName: string,
  milestones: ProjectDetailMilestone[],
  lang: ExcelLang = "ko",
): Promise<void> {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  wb.created = new Date();

  const ws = wb.addWorksheet(sheetTabName("milestones", lang, "시공"));
  const header = HEADERS_I18N.milestones[lang];
  const hr = ws.addRow(header);
  hr.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2E3C50" } };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = ALL_BORDERS;
  });
  for (const m of milestones) {
    const row = ws.addRow([m.label, m.planStart ?? null, m.planEnd ?? null, m.actualStart ?? null, m.actualEnd ?? null]);
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.border = ALL_BORDERS;
    });
  }
  ws.columns.forEach((col) => {
    col.width = 20;
  });

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${projectName}_마일스톤_양식_${new Date().toISOString().slice(0, 10)}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}

/** 마일스톤 전용 Excel 업로드 파싱 - 시트 하나만 읽으므로 첫 번째 워크시트를 그대로 사용한다. */
export async function parseMilestonesWorkbook(file: File): Promise<ProjectDetailMilestone[]> {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await file.arrayBuffer());

  const ws = wb.worksheets[0];
  if (!ws) throw new ExcelParseError(`[${SHEET_NAME_I18N.milestones.ko}] 워크시트를 찾을 수 없습니다.`);

  const out: ProjectDetailMilestone[] = [];
  let rowIdx = 0;
  ws.eachRow({ includeEmpty: false }, (row, idx) => {
    if (idx === 1) return; // header
    rowIdx++;
    const vals: unknown[] = [];
    for (let c = 1; c <= 5; c++) vals.push(row.getCell(c).value);
    if (!vals.some((v) => cellStr(v) != null || cellNum(v) != null)) return;
    const label = cellStr(vals[0]);
    if (!label) throw new ExcelParseError(`[${SHEET_NAME_I18N.milestones.ko}] ${idx}행: 구분(이름)이 비어 있습니다.`);
    out.push({
      label,
      planStart: cellYmd(vals[1]),
      planEnd: cellYmd(vals[2]),
      actualStart: cellYmd(vals[3]),
      actualEnd: cellYmd(vals[4]),
    });
  });
  if (rowIdx === 0) throw new ExcelParseError(`[${SHEET_NAME_I18N.milestones.ko}] 입력된 행이 없습니다.`);

  return out;
}
