import { Router, type IRouter } from "express";
import {
  fetchPimsvinaApi,
  fetchPimsvinaOracleQueryResult,
} from "../lib/pimsvinaClient";
import {
  db,
  cfProjectsTable,
  cfMonthlyAmountsTable,
  scSitesTable,
  scMonthlyTable,
  mrProjectsTable,
  mrMonthlyTable,
  mrAnnualTable,
  mrPnlTable,
  pdOverviewTable,
  pdProgressMonthlyTable,
  pdOutsourcingTable,
  pdCashflowMonthlyTable,
  pdCogsMonthlyTable,
  pdCostBudgetTable,
  pdCostBudgetMonthlyTable,
  pdCostEstimationTable,
  pdSiteOverviewPhotoTable,
  pdSitePhotosMonthlyTable,
  fxRatesTable,
  companiesTable,
  divisionsTable,
} from "@workspace/db";
import { eq, and, isNull } from "drizzle-orm";
import { requireAdmin } from "../middlewares/adminAuth";
import {
  mapPimsvinaTradeItem,
  parsePimsvinaKusd,
  findStalePimsvinaTradeCosts,
  tradeCostKey,
  tradeCostScope,
  sumPimsvinaKusdValues,
} from "../lib/pimsvinaTradeCost";

/** SRS와 동일한 서비스 부문 키워드 — CATB_BUSILINE.CLASSIFICATION이 없거나 인식 불가할 때 부문명으로 추정 (프론트 classifyMrProject와 동일 기준) */
const SERVICE_DIVISION_KEYWORDS = ["용역", "프리콘", "인허가", "산출", "유지관리", "운영관리", "분양대행"];

function classifyBusinessType(rawClassification: unknown, divisionLabel: string): "시공" | "용역" {
  const v = String(rawClassification ?? "").trim();
  if (v === "용역" || v === "2" || /service/i.test(v)) return "용역";
  if (v === "시공" || v === "1" || /construction/i.test(v)) return "시공";
  return SERVICE_DIVISION_KEYWORDS.some((k) => divisionLabel.includes(k)) ? "용역" : "시공";
}

const router: IRouter = Router();

const MONTH_KEYS = Array.from({ length: 12 }, (_, i) => "m" + String(i + 1).padStart(2, "0"));

/** 1단계: PIMSVINA의 모든 dashboard API를 조회만 하고 DB에는 아무것도 쓰지 않는다 (미리보기 팝업용). */
export async function fetchAllPimsvinaData() {
  const [
    pdOverview,
    pdProgress,
    pdOutsourcing,
    pdTradeCostMonthlyResult,
    pdTradeCostScopesResult,
    pdCashflow,
    pdCogs,
    pdCostBudget,
    pdCostBudgetMonthlyResult,
    costRateSettleRows,
    pdSiteOverviewPhotoResult,
    pdSitePhotosMonthlyResult,
  ] = await Promise.all([
    fetchPimsvinaApi("dashboard_pd_overview_1q.jsp"),
    fetchPimsvinaApi("dashboard_pd_progress_1q.jsp"),
    fetchPimsvinaApi("dashboard_pd_outsourcing_1q.jsp"),
    fetchPimsvinaOracleQueryResult("dashboard_pd_trade_cost_monthly_1q.jsp"),
    fetchPimsvinaOracleQueryResult("dashboard_pd_trade_cost_scopes_1q.jsp"),
    fetchPimsvinaApi("dashboard_pd_cashflow_1q.jsp"),
    fetchPimsvinaApi("dashboard_pd_cogs_monthly_1q.jsp"),
    fetchPimsvinaApi("dashboard_pd_costbudget_1q.jsp"),
    fetchPimsvinaOracleQueryResult("dashboard_pd_costbudget_monthly_1q.jsp"),
    fetchPimsvinaApi("dashboard_pd_costrate_settle_1q.jsp"),
    fetchPimsvinaOracleQueryResult("cb_prjt_air_view_e_1q.jsp"),
    fetchPimsvinaOracleQueryResult("cb_prjt_picture_e_1q.jsp"),
  ]);
  // "4. Cost Rate (Cost tab)" — Execution Budget Setup.Cost/Contract Amount và Estimated Completion
  // Cost Rate.Ratio(%) không còn dùng giá trị Bold tĩnh (ZYA/ZZL, dashboard_pd_costestimation_1q.jsp —
  // đã xoá hẳn) nữa, mà tính lại theo tháng hiện tại từ ch_cost_settle_ratio_q_1q.jsp (REC7 Business
  // budget, REC9 Gross Profit ratio, REC13 Contract Amount) — phản ánh đúng tiến độ Cost Input thực tế
  // thay vì chỉ là số ngân sách tĩnh tại lần duyệt gần nhất. Query này TỰ lấy danh sách FLDCODE từ
  // CBTB_FLDSUMM (tất cả site, không giới hạn theo site đã có Execution Budget được duyệt như trước)
  // và tính cho tất cả trong 1 lần gọi.
  const pdCostEstimation = costRateSettleRows
    .map((row: any) => {
      const fldcode = String(row?.fldcode ?? "").trim();
      if (!fldcode) return null;
      // BUSINESS_BUDGET/CONTRACT_AMOUNT lưu ĐÚNG số VND gốc do query trả về, KHÔNG quy đổi qua RATE
      // nữa (đã verify khớp 100% màn hình "Settlement ratio cost" thật) — UI tự quy đổi khi hiển thị
      // (fmtVnd) và khi cần so sánh nội bộ với dữ liệu thiên USD khác (convertVndToKUsd). Gross Profit
      // ratio là % không thứ nguyên nên không quy đổi.
      return {
        fldcode,
        site_code: row.site_code ?? null,
        project_name: row.project_name ?? null,
        yymm: row.yymm ?? null,
        cost_amount: row.business_budget != null ? Number(row.business_budget) : null,
        contract_amount: row.contract_amount != null ? Number(row.contract_amount) : null,
        ratio_pct: row.gross_profit_ratio != null ? Number(row.gross_profit_ratio) : null,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row != null);
  const pdTradeCostMonthlyRaw = pdTradeCostMonthlyResult.data;
  const pdTradeCostScopesRaw = pdTradeCostScopesResult.data;
  const tradeCostSnapshotComplete =
    pdTradeCostMonthlyResult.ok && pdTradeCostScopesResult.ok;
  // "5. 예산 집행 현황" 월별 실적(Common/Expense 1/Expense 2/Contingency/Outsourcing) — trade cost
  // (외주 세부 공종, 예: "외주 건축"/"외주 기계")와 다른 item 네임스페이스를 쓰므로 서로 겹치지 않지만,
  // 같은 CHTB_PFMCOSTRMRK/BASEYYMM 스코프이므로 stale-row 판정에는 dashboard_pd_trade_cost_scopes_1q.jsp
  // 결과를 그대로 재사용한다.
  const pdCostBudgetMonthlyRaw = pdCostBudgetMonthlyResult.data;
  const costBudgetMonthlySnapshotComplete =
    pdCostBudgetMonthlyResult.ok && pdTradeCostScopesResult.ok;
  const projects = await db
    .select({
      name: mrProjectsTable.name,
      siteCode: mrProjectsTable.siteCode,
      fldCode: mrProjectsTable.fldCode,
    })
    .from(mrProjectsTable);
  const existingTradeCosts = await db.select().from(pdCostBudgetMonthlyTable);
  const projectBySiteCode = new Map(
    projects
      .filter((project) => project.siteCode)
      .map((project) => [project.siteCode!.trim().toUpperCase(), project.name]),
  );
  const projectByFldCode = new Map(
    projects
      .filter((project) => project.fldCode)
      .map((project) => [project.fldCode!.trim().toUpperCase(), project.name]),
  );
  const existingByKey = new Map(
    existingTradeCosts.map((row) => [
      `${row.projectName}|${row.item}|${row.year}|${row.month}`,
      row.actual == null ? null : Number(row.actual),
    ]),
  );
  const normalizedTradeCosts = pdTradeCostMonthlyRaw.map((row: any) => {
    const siteCode = String(row.site_code ?? "").trim().toUpperCase();
    const fldCode = String(row.fldcode ?? "").trim().toUpperCase();
    const projectName =
      projectBySiteCode.get(siteCode) ??
      projectByFldCode.get(fldCode) ??
      projectBySiteCode.get(fldCode) ??
      null;
    const mappedItem = mapPimsvinaTradeItem(row.trade);
    return {
      ...row,
      mapped_project_name: projectName,
      mapped_item: mappedItem,
    };
  });
  const aggregatedTradeCosts = new Map<string, any>();
  const unmappedTradeCosts: any[] = [];
  for (const row of normalizedTradeCosts) {
    if (!row.mapped_project_name || !row.mapped_item) {
      unmappedTradeCosts.push(row);
      continue;
    }
    const key = `${row.mapped_project_name}|${row.mapped_item}|${Number(row.year)}|${Number(row.month)}`;
    const existing = aggregatedTradeCosts.get(key);
    if (existing) {
      existing.actual_vnd = Number(existing.actual_vnd) + Number(row.actual_vnd);
      existing.actual_kusd_values.push(row.actual_kusd);
      existing.trade_code = [existing.trade_code, row.trade_code].filter(Boolean).join(", ");
      existing.trade = [existing.trade, row.trade].filter(Boolean).join(" / ");
    } else {
      aggregatedTradeCosts.set(key, {
        ...row,
        actual_vnd: Number(row.actual_vnd),
        actual_kusd_values: [row.actual_kusd],
      });
    }
  }
  for (const row of aggregatedTradeCosts.values()) {
    row.actual_kusd = sumPimsvinaKusdValues(row.actual_kusd_values);
    delete row.actual_kusd_values;
  }
  const incomingTradeCostKeys = new Set(aggregatedTradeCosts.keys());
  const pdTradeCostScopes = pdTradeCostScopesRaw.map((row: any) => {
    const siteCode = String(row.site_code ?? "").trim().toUpperCase();
    const fldCode = String(row.fldcode ?? "").trim().toUpperCase();
    return {
      ...row,
      mapped_project_name:
        projectBySiteCode.get(siteCode) ??
        projectByFldCode.get(fldCode) ??
        projectBySiteCode.get(fldCode) ??
        null,
    };
  });
  const incomingTradeCostScopes = new Set(
    pdTradeCostScopes
      .filter(
        (row: any) =>
          row.mapped_project_name && Number.isInteger(Number(row.year)),
      )
      .map((row: any) =>
        tradeCostScope({
          projectName: row.mapped_project_name,
          year: Number(row.year),
        }),
      ),
  );
  const staleTradeCosts = findStalePimsvinaTradeCosts(
    existingTradeCosts,
    incomingTradeCostKeys,
    incomingTradeCostScopes,
    tradeCostSnapshotComplete,
  );
  for (const row of staleTradeCosts) {
    const key = tradeCostKey(row);
    aggregatedTradeCosts.set(key, {
      fldcode: null,
      site_code: null,
      project_name: row.projectName,
      trade_group: null,
      trade_code: null,
      trade: row.item,
      year: row.year,
      month: row.month,
      source_currency: "VND",
      actual_vnd: null,
      actual_kusd: null,
      mapped_project_name: row.projectName,
      mapped_item: row.item,
      clear_actual: true,
    });
  }
  const pdTradeCostMonthly = [
    ...Array.from(aggregatedTradeCosts.values()),
    ...unmappedTradeCosts,
  ].map((row: any) => {
    const projectName = row.mapped_project_name as string | null;
    const mappedItem = row.mapped_item as string | null;
    const incomingActual = parsePimsvinaKusd(row.actual_vnd);
    const existingActual =
      projectName && mappedItem
        ? (existingByKey.get(
            `${projectName}|${mappedItem}|${Number(row.year)}|${Number(row.month)}`,
          ) ?? null)
        : null;
    return {
      ...row,
      existing_actual: existingActual,
      incoming_actual: incomingActual,
      change:
        !projectName || !mappedItem || incomingActual == null
          ? row.clear_actual
            ? "삭제"
            : "건너뜀"
          : existingActual == null
            ? "신규"
            : Math.abs(existingActual - incomingActual) > 0.00000001
              ? "변경"
              : "동일",
    };
  });

  return {
    pdOverview,
    pdProgress,
    pdOutsourcing,
    pdTradeCostMonthly,
    pdTradeCostScopes,
    pdTradeCostSyncStatus: [
      {
        complete: tradeCostSnapshotComplete,
        monthlyQueryOk: pdTradeCostMonthlyResult.ok,
        scopeQueryOk: pdTradeCostScopesResult.ok,
      },
    ],
    pdCashflow,
    pdCogs,
    pdCostBudget,
    pdCostBudgetMonthly: pdCostBudgetMonthlyRaw,
    pdCostBudgetMonthlySyncStatus: [{ complete: costBudgetMonthlySnapshotComplete }],
    pdCostEstimation,
    pdSiteOverviewPhoto: pdSiteOverviewPhotoResult.data,
    pdSitePhotosMonthly: pdSitePhotosMonthlyResult.data,
  };
}

export type PimsvinaData = Awaited<ReturnType<typeof fetchAllPimsvinaData>>;

/** 2단계: 미리보기 팝업에서 "확인"을 누른 뒤, 조회해둔(또는 사용자가 그대로 넘긴) 데이터를 실제 DB에 반영한다. */
export async function applyPimsvinaData(fetched: PimsvinaData) {
  const pdOverview = fetched.pdOverview ?? [];
  const pdProgress = fetched.pdProgress ?? [];
  const pdOutsourcing = fetched.pdOutsourcing ?? [];
  const pdTradeCostMonthly = fetched.pdTradeCostMonthly ?? [];
  const pdTradeCostScopes = fetched.pdTradeCostScopes ?? [];
  const tradeCostSnapshotComplete =
    fetched.pdTradeCostSyncStatus?.[0]?.complete === true &&
    fetched.pdTradeCostSyncStatus?.[0]?.monthlyQueryOk === true &&
    fetched.pdTradeCostSyncStatus?.[0]?.scopeQueryOk === true;
  const pdCashflow = fetched.pdCashflow ?? [];
  const pdCogs = fetched.pdCogs ?? [];
  const pdCostBudget = fetched.pdCostBudget ?? [];
  const costBudgetMonthlySnapshotComplete = fetched.pdCostBudgetMonthlySyncStatus?.[0]?.complete === true;
  const pdCostEstimation = fetched.pdCostEstimation ?? [];
  const pdSiteOverviewPhoto = fetched.pdSiteOverviewPhoto ?? [];
  const pdSitePhotosMonthly = fetched.pdSitePhotosMonthly ?? [];

  const counts = {
    pdOverview: 0,
    pdProgress: 0,
    pdOutsourcing: 0,
    pdTradeCostMonthly: 0,
    pdCashflow: 0,
    pdCogs: 0,
    pdCostBudget: 0,
    pdCostBudgetMonthly: 0,
    pdCostEstimation: 0,
    pdSiteOverviewPhoto: 0,
    pdSitePhotosMonthly: 0,
    skipped: 0,
  };
  const skippedProjects = new Set<string>();
  const MAX_SKIPPED_SAMPLES = 30;
  const trackSkipped = (item: any) => {
    counts.skipped++;
    if (skippedProjects.size >= MAX_SKIPPED_SAMPLES) return;
    const label = item.project_name || item.fldcode || item.site_code || "(unknown)";
    skippedProjects.add(String(label));
  };

  // PIMS-DASHBOARD thiết kế lưu trữ chuẩn theo đơn vị kUSD (1 kUSD = 25.400.000 VND).
  // Khi PIMSVINA trả về số tiền VND gốc (> 100M VND), chia cho 25.400.000 để lưu về kUSD chuẩn.
  const VND_PER_K_USD = 25_400_000;
  const toK = (v: any) => {
    if (v == null || v === "") return null;
    const n = Number(v);
    if (isNaN(n)) return null;
    if (n > 100000000) {
      return String(n / VND_PER_K_USD);
    }
    return String(n / 1000);
  };
  // Outsourcing/Materials: lưu ĐÚNG số VND gốc, KHÔNG quy đổi qua toK() — cùng nguyên tắc với
  // pd_cost_budget ("동기화 데이터는 VND 원본 저장, 화면에서만 통화 변환"). Trước đây quy đổi sang
  // kUSD bằng hằng số tỷ giá cố định chung cho mọi site, trong khi UI lại quy đổi ngược về VND bằng
  // tỷ giá hợp đồng RIÊNG của từng site (CBTB_CTRTSUMM.RATEUSD) — vòng đi-về 2 tỷ giá khác nhau nên
  // luôn lệch (sai ~1-2% tuỳ site) so với màn hình gốc PIMSVINA (Request Execution Resolution).
  // Lưu VND thẳng thì không còn tỷ giá nào để lệch nữa.
  const rawNum = (v: any) => (v == null || v === "" ? null : String(v));

  // PIMSVINA trả as_of_month dạng "YYYYMM" (VD "202608") nhưng PUT /projectdetail (Data Entry form)
  // validate nghiêm ngặt theo "YYYY-MM" — nếu ghi thẳng giá trị thô, form Data Entry sẽ báo lỗi
  // "작성 기준월은 YYYY-MM 형식이어야 합니다" và không Save được nữa cho tới khi sửa lại thủ công.
  const normalizeAsOfMonth = (v: any): string | null => {
    if (v == null) return null;
    const raw = String(v).trim();
    if (!raw) return null;
    if (/^\d{4}-(0[1-9]|1[0-2])$/.test(raw)) return raw;
    if (/^\d{4}(0[1-9]|1[0-2])$/.test(raw)) return `${raw.slice(0, 4)}-${raw.slice(4, 6)}`;
    return raw;
  };

  // PIMSVINA trả project_name bằng tên tiếng Anh (FUN_GET_FLDNAME) — KHÔNG khớp với mr_projects.name
  // (nhãn tiếng Hàn dùng cho Sidebar/màn chi tiết). Khóa nối đúng là fldcode/site_code (dạng "SITE28")
  // khớp với mr_projects.site_code. Dòng nào không tra được site_code/tên tương ứng sẽ được TỰ ĐỘNG
  // TẠO MỚI trong mr_projects (thay vì bỏ qua) để site mới xuất hiện ngay trên sidebar.
  const allProjects = await db
    .select({
      name: mrProjectsTable.name,
      siteCode: mrProjectsTable.siteCode,
      fldCode: mrProjectsTable.fldCode,
      sortOrder: mrProjectsTable.sortOrder,
    })
    .from(mrProjectsTable);
  const siteCodeToName = new Map<string, string>();
  const fldCodeToName = new Map<string, string>();
  const knownNames = new Set<string>();
  let nextSortOrder = 1;
  for (const p of allProjects) {
    if (p.siteCode) siteCodeToName.set(p.siteCode.trim().toUpperCase(), p.name);
    if (p.fldCode) fldCodeToName.set(p.fldCode.trim().toUpperCase(), p.name);
    knownNames.add(p.name);
    if (p.sortOrder >= nextSortOrder) nextSortOrder = p.sortOrder + 1;
  }
  // Một số bảng nguồn PIMSVINA (CBTB_FLDSUMM/CJTB_BUSPLAN_DETL/...) dùng FLDCODE làm mã công trình con
  // (VD "VH10TC6") và trả site_code (ACNT_FLDCODE, dạng "SITE30") riêng qua join CBTB_FLD_MAPPING.
  // Một số bảng khác (CETB_PFMCTRTHIST/CDTB_ORDCONTTYPE/CHTB_PFMCOSTRMRK) lại dùng FLDCODE làm CHÍNH mã
  // tài chính dạng "SITE28" luôn (site_code join ra null vì không cần dịch). Nên ưu tiên site_code, chỉ
  // fallback fldcode khi nó đã đúng định dạng SITE## để không lấy nhầm mã công trình con.
  const SITE_CODE_PATTERN = /^SITE\d+$/i;
  const newProjectNames = new Set<string>();
  const resolveProjectName = async (item: any): Promise<string | null> => {
    let code = String(item.site_code || "").trim().toUpperCase();
    if (!code) {
      const fld = String(item.fldcode || "").trim().toUpperCase();
      if (SITE_CODE_PATTERN.test(fld)) code = fld;
    }
    const rawFldCode = item.fldcode != null ? String(item.fldcode).trim() : "";
    if (code) {
      const existingName = siteCodeToName.get(code);
      if (existingName) return existingName;
    }
    const rawName = typeof item.project_name === "string" ? item.project_name.trim() : "";
    if (!code && !rawName) return null;
    const name = rawName || code;
    if (!code && knownNames.has(name)) return name;
    if (knownNames.has(name)) {
      // Tên đã tồn tại (VD do import Excel trước đó) nhưng chưa gắn site_code/fld_code -> gắn thêm vào DB, không tạo trùng
      if (code) siteCodeToName.set(code, name);
      if (code || rawFldCode) {
        await db
          .update(mrProjectsTable)
          .set({ ...(code ? { siteCode: code } : {}), ...(rawFldCode ? { fldCode: rawFldCode } : {}) })
          .where(eq(mrProjectsTable.name, name));
      }
      return name;
    }
    await db.insert(mrProjectsTable).values({
      name,
      siteCode: code || null,
      fldCode: rawFldCode || null,
      sortOrder: nextSortOrder++,
      status: "ongoing",
    });
    knownNames.add(name);
    newProjectNames.add(name);
    if (code) siteCodeToName.set(code, name);
    return name;
  };
  const resolveTradeProjectName = (item: any): string | null => {
    const siteCode = String(item.site_code ?? "").trim().toUpperCase();
    const fldCode = String(item.fldcode ?? "").trim().toUpperCase();
    return (
      siteCodeToName.get(siteCode) ??
      fldCodeToName.get(fldCode) ??
      siteCodeToName.get(fldCode) ??
      null
    );
  };

  // 1. Sync Project Detail Overview
  for (const item of pdOverview) {
    const projectName = await resolveProjectName(item);
    if (!projectName) {
      trackSkipped(item);
      continue;
    }
    const [existing] = await db
      .select()
      .from(pdOverviewTable)
      .where(eq(pdOverviewTable.projectName, projectName));

    if (existing) {
      await db
        .update(pdOverviewTable)
        .set({
          fldCode: item.fldcode || existing.fldCode,
          siteCode: item.site_code || existing.siteCode,
          // Contract Amount/Start/End Date: ghi đè trực tiếp giá trị PIMSVINA trả về (kể cả null),
          // không giữ lại giá trị cũ trong DB — theo yêu cầu bỏ hẳn phép tính dự phòng cho 3 trường này.
          // contractAmount lưu ĐÚNG số VND gốc (không quy đổi kUSD qua toK()) — UI tự quy đổi khi hiển
          // thị (fmtVnd) và khi cần so sánh nội bộ với các giá trị thiên USD khác (convertVndToKUsd).
          contractAmount: item.contract_amount != null ? String(item.contract_amount) : null,
          startDate: item.start_date ?? null,
          endDate: item.end_date ?? null,
          client: item.client || existing.client,
          scale: item.scale || existing.scale,
          asOfMonth: item.as_of_month != null ? normalizeAsOfMonth(item.as_of_month) : existing.asOfMonth,
          scope: item.scope || existing.scope,
          revenueAnnualTarget: item.revenue_annual_target != null ? toK(item.revenue_annual_target) : existing.revenueAnnualTarget,
          revenueTotal: item.revenue_total != null ? toK(item.revenue_total) : existing.revenueTotal,
          cashConfirmed: item.cash_confirmed != null ? toK(item.cash_confirmed) : existing.cashConfirmed,
          cashCollection: item.cash_collection != null ? toK(item.cash_collection) : existing.cashCollection,
        })
        .where(eq(pdOverviewTable.projectName, projectName));
    } else {
      await db.insert(pdOverviewTable).values({
        projectName,
        fldCode: item.fldcode || null,
        siteCode: item.site_code || null,
        contractAmount: item.contract_amount != null ? String(item.contract_amount) : null,
        startDate: item.start_date || null,
        endDate: item.end_date || null,
        client: item.client || null,
        scale: item.scale || null,
        asOfMonth: normalizeAsOfMonth(item.as_of_month),
        scope: item.scope || null,
        revenueAnnualTarget: item.revenue_annual_target != null ? toK(item.revenue_annual_target) : null,
        revenueTotal: item.revenue_total != null ? toK(item.revenue_total) : null,
        cashConfirmed: item.cash_confirmed != null ? toK(item.cash_confirmed) : null,
        cashCollection: item.cash_collection != null ? toK(item.cash_collection) : null,
      });
      counts.pdOverview++;
    }
  }

  // 10. Sync Project Detail Progress (keyed directly by project_name)
  for (const item of fetched.pdProgress) {
    const projectName = await resolveProjectName(item);
    const m = Number(item.month);
    if (!projectName || !item.year || !item.month || isNaN(m) || m < 1 || m > 12) {
      if (!projectName) trackSkipped(item);
      continue;
    }
    const sanitizeNumStr = (v: any) => {
      if (v == null || v === "") return null;
      const n = Number(v);
      if (isNaN(n)) return null;
      // Clamp to safe numeric(9,4) range [-99999.9999, 99999.9999]
      const clamped = Math.min(99999.9999, Math.max(-99999.9999, n));
      return String(clamped);
    };

    const actualPct = sanitizeNumStr(item.actual_pct);

    await db
      .insert(pdProgressMonthlyTable)
      .values({
        projectName,
        fldCode: item.fldcode || null,
        siteCode: item.site_code || null,
        year: Number(item.year),
        month: m,
        actualPct,
      })
      .onConflictDoUpdate({
        target: [pdProgressMonthlyTable.projectName, pdProgressMonthlyTable.year, pdProgressMonthlyTable.month],
        // Câu Oracle mới (pimsvinaOracleQueries.ts) chỉ trả FLDCODE/SITE_CODE/PROJECT_NAME/YEAR/MONTH/ACTUAL_PCT
        // — planPct/planCumPct/actualCumPct KHÔNG còn được PIMS đồng bộ nữa (giữ nguyên giá trị đã có trong DB,
        // dù là nhập tay hay do bản sync cũ trước đây ghi vào), sync chỉ cập nhật đúng actualPct.
        set: { fldCode: item.fldcode || null, siteCode: item.site_code || null, actualPct },
      });
    counts.pdProgress++;
  }

  // 11. Sync Project Detail Outsourcing (no natural unique key -> full replace per project)
  const pdOutsourcingByProject = new Map<string, any[]>();
  for (const item of fetched.pdOutsourcing) {
    const projectName = await resolveProjectName(item);
    if (!projectName || !item.trade) {
      if (!projectName) trackSkipped(item);
      continue;
    }
    if (!pdOutsourcingByProject.has(projectName)) pdOutsourcingByProject.set(projectName, []);
    pdOutsourcingByProject.get(projectName)!.push(item);
  }
  for (const [projectName, items] of pdOutsourcingByProject) {
    await db.delete(pdOutsourcingTable).where(eq(pdOutsourcingTable.projectName, projectName));
    for (const item of items) {
      await db.insert(pdOutsourcingTable).values({
        projectName,
        fldCode: item.fldcode || null,
        siteCode: item.site_code || null,
        tradeGroup: item.trade_group || null,
        trade: item.trade,
        vendor: item.vendor || null,
        category: item.category || null,
        contractDate: item.contract_date || null,
        changeNo: item.change_no != null ? String(item.change_no) : null,
        budget: rawNum(item.budget),
        executedBudget: rawNum(item.executed_budget),
        resolved: rawNum(item.resolved),
        thisMonth: rawNum(item.this_month),
        accum: rawNum(item.accum),
        sortOrder: Number(item.sort_order) || 0,
      });
      counts.pdOutsourcing++;
    }
  }

  // 11b. Sync monthly actual cost by explicit ERP trade. Plans stay manual.
  // Multiple ERP contract codes may map to the same standard trade/month, so
  // aggregate before upsert instead of allowing the last contract to win.
  // pdCostBudgetMonthlyTable.actual는 (11a와 마찬가지로) VND 원본으로 통일 저장한다 — ERP가 이미
  // actual_vnd 필드로 환산 없는 원본 VND를 내려주므로 그대로 쓴다(예전엔 actual_kusd를 썼으나, 화면
  // 표시가 항상 kUSD로 가정하던 시절의 잔재였고 "3. Cost Plan/Actual by Work Type" 표시 단위와 맞지 않았다).
  if (tradeCostSnapshotComplete) {
  const tradeCostUpdates = new Map<
    string,
    { projectName: string; item: NonNullable<ReturnType<typeof mapPimsvinaTradeItem>>; year: number; month: number; rawActual: number }
  >();
  const invalidIncomingTradeCostKeys = new Set<string>();
  for (const item of pdTradeCostMonthly) {
    const projectName = resolveTradeProjectName(item);
    const mappedItem = mapPimsvinaTradeItem(item.mapped_item ?? item.trade);
    const year = Number(item.year);
    const month = Number(item.month);
    const actualVnd = parsePimsvinaKusd(item.actual_vnd);
    const hasValidIdentity =
      projectName != null &&
      mappedItem != null &&
      Number.isInteger(year) &&
      Number.isInteger(month) &&
      month >= 1 &&
      month <= 12;
    if (hasValidIdentity && actualVnd == null) {
      invalidIncomingTradeCostKeys.add(
        tradeCostKey({ projectName, item: mappedItem, year, month }),
      );
    }
    if (
      !hasValidIdentity ||
      actualVnd == null
    ) {
      if (!projectName) trackSkipped(item);
      continue;
    }
    const key = `${projectName}|${mappedItem}|${year}|${month}`;
    const existing = tradeCostUpdates.get(key);
    if (existing) existing.rawActual += actualVnd;
    else tradeCostUpdates.set(key, { projectName, item: mappedItem, year, month, rawActual: actualVnd });
  }

  // Xoá sạch dữ liệu 외주 cũ (actualSource='pimsvina') của ĐÚNG (project, year, month) sắp đồng bộ
  // trước khi ghi lại, thay vì chỉ upsert theo (project, item, year, month) — vì nếu ERP đổi cách phân
  // loại trade giữa 2 lần sync (VD: 1 trade trước đó khớp "외주 건축" nay khớp "외주 기계"), upsert theo
  // item mới sẽ để sót dòng cũ dưới item cũ cho cùng tháng đó, gây trùng/lệch số liệu luỹ kế. Giá trị
  // "plan" (luôn nhập tay, sync không đụng tới) được snapshot lại trước khi xoá để không bị mất.
  const monthKeysToReplace = new Map<string, { projectName: string; year: number; month: number }>();
  for (const update of tradeCostUpdates.values()) {
    monthKeysToReplace.set(`${update.projectName}|${update.year}|${update.month}`, {
      projectName: update.projectName,
      year: update.year,
      month: update.month,
    });
  }
  const preservedPlanByKey = new Map<string, string | null>();
  for (const { projectName, year, month } of monthKeysToReplace.values()) {
    const existingRows = await db
      .select({ item: pdCostBudgetMonthlyTable.item, plan: pdCostBudgetMonthlyTable.plan })
      .from(pdCostBudgetMonthlyTable)
      .where(
        and(
          eq(pdCostBudgetMonthlyTable.projectName, projectName),
          eq(pdCostBudgetMonthlyTable.year, year),
          eq(pdCostBudgetMonthlyTable.month, month),
          eq(pdCostBudgetMonthlyTable.actualSource, "pimsvina"),
        ),
      );
    for (const row of existingRows) {
      preservedPlanByKey.set(`${projectName}|${row.item}|${year}|${month}`, row.plan);
    }
    await db
      .delete(pdCostBudgetMonthlyTable)
      .where(
        and(
          eq(pdCostBudgetMonthlyTable.projectName, projectName),
          eq(pdCostBudgetMonthlyTable.year, year),
          eq(pdCostBudgetMonthlyTable.month, month),
          eq(pdCostBudgetMonthlyTable.actualSource, "pimsvina"),
        ),
      );
  }

  for (const update of tradeCostUpdates.values()) {
    const actual = parsePimsvinaKusd(update.rawActual);
    if (actual == null) continue;
    const preservedPlan =
      preservedPlanByKey.get(`${update.projectName}|${update.item}|${update.year}|${update.month}`) ?? null;
    await db
      .insert(pdCostBudgetMonthlyTable)
      .values({
        projectName: update.projectName,
        item: update.item,
        year: update.year,
        month: update.month,
        plan: preservedPlan,
        actual: String(actual),
        actualSource: "pimsvina",
      })
      .onConflictDoUpdate({
        target: [
          pdCostBudgetMonthlyTable.projectName,
          pdCostBudgetMonthlyTable.item,
          pdCostBudgetMonthlyTable.year,
          pdCostBudgetMonthlyTable.month,
        ],
        set: { actual: String(actual), actualSource: "pimsvina" },
      });
    counts.pdTradeCostMonthly++;
  }
  const incomingKeys = new Set([
    ...tradeCostUpdates.keys(),
    ...invalidIncomingTradeCostKeys,
  ]);
  const incomingScopes = new Set(
    pdTradeCostScopes
      .map((row: any) => ({
        projectName: resolveTradeProjectName(row),
        year: Number(row.year),
      }))
      .filter(
        (row): row is { projectName: string; year: number } =>
          row.projectName != null && Number.isInteger(row.year),
      )
      .map((row) => tradeCostScope(row)),
  );
  const existingErpRows = await db
    .select()
    .from(pdCostBudgetMonthlyTable)
    .where(eq(pdCostBudgetMonthlyTable.actualSource, "pimsvina"));
  const staleErpRows = findStalePimsvinaTradeCosts(
    existingErpRows,
    incomingKeys,
    incomingScopes,
    tradeCostSnapshotComplete,
  );
  for (const row of staleErpRows) {
    await db
      .update(pdCostBudgetMonthlyTable)
      .set({ actual: null, actualSource: null })
      .where(eq(pdCostBudgetMonthlyTable.id, row.id));
  }
  }

  // 12. Sync Project Detail Cashflow Monthly (cash in/out per project per month)
  for (const item of fetched.pdCashflow) {
    const projectName = await resolveProjectName(item);
    const m = Number(item.month);
    if (!projectName || !item.year || !item.month || isNaN(m) || m < 1 || m > 12) {
      if (!projectName) trackSkipped(item);
      continue;
    }
    const cashIn = item.cash_in != null ? String(item.cash_in) : null;
    const cashOut = item.cash_out != null ? String(item.cash_out) : null;
    const equivalent = item.equivalent != null ? String(item.equivalent) : null;

    await db
      .insert(pdCashflowMonthlyTable)
      .values({
        projectName,
        fldCode: item.fldcode || null,
        siteCode: item.site_code || null,
        year: Number(item.year),
        month: m,
        cashIn,
        cashOut,
        equivalent,
      })
      .onConflictDoUpdate({
        target: [pdCashflowMonthlyTable.projectName, pdCashflowMonthlyTable.year, pdCashflowMonthlyTable.month],
        set: { fldCode: item.fldcode || null, siteCode: item.site_code || null, cashIn, cashOut, equivalent },
      });
    counts.pdCashflow++;
  }

  // 13. Sync Project Detail COGS Monthly (acct_cogs & wip_cogs per project per month)
  for (const item of fetched.pdCogs || []) {
    const projectName = await resolveProjectName(item);
    const m = Number(item.month);
    if (!projectName || !item.year || !item.month || isNaN(m) || m < 1 || m > 12) {
      if (!projectName) trackSkipped(item);
      continue;
    }
    const acctCogs = item.acct_cogs != null ? String(item.acct_cogs) : null;
    const wipCogs = item.wip_cogs != null ? String(item.wip_cogs) : null;

    await db
      .insert(pdCogsMonthlyTable)
      .values({
        projectName,
        fldCode: item.fldcode || null,
        siteCode: item.site_code || null,
        year: Number(item.year),
        month: m,
        acctCogs,
        wipCogs,
      })
      .onConflictDoUpdate({
        target: [pdCogsMonthlyTable.projectName, pdCogsMonthlyTable.year, pdCogsMonthlyTable.month],
        set: { fldCode: item.fldcode || null, siteCode: item.site_code || null, acctCogs, wipCogs },
      });
    counts.pdCogs++;
  }

  // Monthly Revenue(pd_sales_monthly)는 더 이상 PIMSVINA에서 동기화하지 않는다 - dashboard_pd_sales_1q.jsp가
  // 항상 0건을 반환했고(CJTB_BUSPLAN_DETL/CJTB_SALESAMTRST 매칭 불가), 실제 값은 메인 경영현황판 Excel
  // 업로드가 진짜 소스다. ProjectDataEntryTab의 salesMonthlyCard는 그 값을 그대로 쓴다.

  // 14. Sync Project Detail Cost Budget (no natural unique key -> full replace per project)
  const pdCostBudgetByProject = new Map<string, any[]>();
  for (const item of fetched.pdCostBudget) {
    const projectName = await resolveProjectName(item);
    if (!projectName || !item.item) {
      if (!projectName) trackSkipped(item);
      continue;
    }
    if (!pdCostBudgetByProject.has(projectName)) pdCostBudgetByProject.set(projectName, []);
    pdCostBudgetByProject.get(projectName)!.push(item);
  }
  for (const [projectName, items] of pdCostBudgetByProject) {
    // `plan` (Plan/B) chưa xác định nguồn PIMS (JSP luôn trả null - xem comment dashboard_pd_costbudget_1q.jsp)
    // nhưng CÓ thể được người dùng nhập tay qua Data Entry (ProjectDataEntryTab -> PUT /projectdetail). Vì bảng
    // này được xóa hết rồi insert lại mỗi lần sync, phải snapshot `plan` hiện có (match theo `item`) trước khi
    // xóa và ghép lại vào dòng mới tương ứng - tránh sync PIMSVINA xóa mất Plan đã nhập tay.
    const existingRows = await db
      .select({ item: pdCostBudgetTable.item, plan: pdCostBudgetTable.plan })
      .from(pdCostBudgetTable)
      .where(eq(pdCostBudgetTable.projectName, projectName));
    const existingPlanByItem = new Map<string, (typeof existingRows)[number]["plan"]>();
    for (const r of existingRows) {
      existingPlanByItem.set(r.item.trim().toLowerCase(), r.plan);
    }

    await db.delete(pdCostBudgetTable).where(eq(pdCostBudgetTable.projectName, projectName));
    for (const item of items) {
      // Lưu ĐÚNG giá trị đồng bộ về, KHÔNG quy đổi qua toK() (không có "kiểm tra thêm" gì cả) - budget/actual
      // của dashboard_pd_costbudget_1q.jsp (BDGTAMT/COSTAMT theo công thức mới) được lưu nguyên văn.
      const rawNum = (v: any) => (v == null || v === "" ? null : String(v));
      const preservedPlan = existingPlanByItem.get(String(item.item).trim().toLowerCase()) ?? null;
      await db.insert(pdCostBudgetTable).values({
        projectName,
        fldCode: item.fldcode || null,
        siteCode: item.site_code || null,
        category: item.category || null,
        item: item.item,
        budget: rawNum(item.budget),
        plan: rawNum(item.plan) ?? preservedPlan,
        actual: rawNum(item.actual),
        sortOrder: Number(item.sort_order) || 0,
      });
      counts.pdCostBudget++;
    }
  }

  // 14a. Sync Project Detail Cost Budget Monthly Actual (Common/Expense 1/Expense 2/Contingency/
  // Outsourcing) — dashboard_pd_costbudget_monthly_1q.jsp가 VND 원본 그대로 준 실적을
  // pdCostBudgetMonthlyTable.actual에 upsert한다(예전엔 kUSD로 환산했으나, "동기화 데이터는 VND 원본
  // 저장, 화면에서만 통화 변환" 원칙에 맞춰 통일 — dashboard_pd_costbudget_1q.jsp의 ACTUAL과 동일 단위).
  // Item 분류는 매 sync마다 고정이라 trade cost처럼 월 전체를 지웠다가 다시 넣을 필요가 없다 —
  // (project, item, year, month) upsert만으로 충분하고, Plan은 건드리지 않는다(여전히 수동 입력 전용,
  // 위 pdCostBudget 블록 주석 참고).
  const COST_BUDGET_MONTHLY_ITEMS = ["Common", "Expense 1", "Expense 2", "Contingency", "Outsourcing"];
  const costBudgetMonthlyUpdates = new Map<
    string,
    { projectName: string; item: string; year: number; month: number; actual: number }
  >();
  for (const item of fetched.pdCostBudgetMonthly) {
    const projectName = await resolveProjectName(item);
    const year = Number(item.year);
    const month = Number(item.month);
    const actualVnd = parsePimsvinaKusd(item.actual);
    if (
      !projectName ||
      !COST_BUDGET_MONTHLY_ITEMS.includes(item.item) ||
      !Number.isInteger(year) ||
      !Number.isInteger(month) ||
      month < 1 ||
      month > 12 ||
      actualVnd == null
    ) {
      if (!projectName) trackSkipped(item);
      continue;
    }
    costBudgetMonthlyUpdates.set(
      tradeCostKey({ projectName, item: item.item, year, month }),
      { projectName, item: item.item, year, month, actual: actualVnd },
    );
  }
  for (const update of costBudgetMonthlyUpdates.values()) {
    await db
      .insert(pdCostBudgetMonthlyTable)
      .values({
        projectName: update.projectName,
        item: update.item,
        year: update.year,
        month: update.month,
        actual: String(update.actual),
        actualSource: "pimsvina",
      })
      .onConflictDoUpdate({
        target: [
          pdCostBudgetMonthlyTable.projectName,
          pdCostBudgetMonthlyTable.item,
          pdCostBudgetMonthlyTable.year,
          pdCostBudgetMonthlyTable.month,
        ],
        set: { actual: String(update.actual), actualSource: "pimsvina" },
      });
    counts.pdCostBudgetMonthly++;
  }
  // dashboard_pd_trade_cost_scopes_1q.jsp를 그대로 재사용 (같은 CHTB_PFMCOSTRMRK/FLDCODE/YEAR 스코프) —
  // item 목록만 COST_BUDGET_MONTHLY_ITEMS로 필터링해서, trade cost(외주 세부 공종)가 쓰는 같은 테이블의
  // actualSource='pimsvina' 행을 잘못 지우지 않도록 한다.
  const incomingCostBudgetMonthlyScopes = new Set(
    pdTradeCostScopes
      .map((row: any) => ({
        projectName: resolveTradeProjectName(row),
        year: Number(row.year),
      }))
      .filter(
        (row): row is { projectName: string; year: number } =>
          row.projectName != null && Number.isInteger(row.year),
      )
      .map((row) => tradeCostScope(row)),
  );
  const existingCostBudgetMonthlyRows = (
    await db.select().from(pdCostBudgetMonthlyTable).where(eq(pdCostBudgetMonthlyTable.actualSource, "pimsvina"))
  ).filter((row) => COST_BUDGET_MONTHLY_ITEMS.includes(row.item));
  const staleCostBudgetMonthlyRows = findStalePimsvinaTradeCosts(
    existingCostBudgetMonthlyRows,
    new Set(costBudgetMonthlyUpdates.keys()),
    incomingCostBudgetMonthlyScopes,
    costBudgetMonthlySnapshotComplete,
  );
  for (const row of staleCostBudgetMonthlyRows) {
    await db
      .update(pdCostBudgetMonthlyTable)
      .set({ actual: null, actualSource: null })
      .where(eq(pdCostBudgetMonthlyTable.id, row.id));
  }

  // 14b. Sync Project Detail Cost Estimation — CHỈ kind='execution' (Execution Budget Cost Rate).
  // 'bidding' chưa có nguồn PIMS đã xác minh (xem MaTran_NguonDuLieu...v4.xlsx #12/#14), vẫn phải
  // nhập tay qua Data Entry (PUT /projectdetail) — TUYỆT ĐỐI không đụng tới kind đó ở đây.
  // 'execution' và 'completion' đều được upsert theo unique key (projectName, kind, year, month) —
  // mỗi tháng site có dữ liệu (target_mm_calc) tạo/ghi đè đúng 1 dòng lịch sử của tháng đó, KHÔNG xoá
  // các dòng tháng khác đã có — nhờ vậy UI (mục "4. Cost Rate") có thể cho chọn Base Month để xem lại
  // dữ liệu của từng tháng đã đồng bộ trước đó thay vì chỉ thấy tháng mới nhất.
  // Lưu ĐÚNG số VND gốc từ pdCostEstimation (không quy đổi kUSD/chia 1000) — UI tự quy đổi khi hiển thị.
  for (const item of pdCostEstimation) {
    const projectName = await resolveProjectName(item);
    if (!projectName || item.cost_amount == null || item.contract_amount == null) {
      if (!projectName) trackSkipped(item);
      continue;
    }
    const costAmountVnd = String(Number(item.cost_amount));
    const contractAmountVnd = String(Number(item.contract_amount));
    const fldCode = item.fldcode || null;
    const siteCode = item.site_code || null;
    // Base Month = tháng mà dashboard_pd_costrate_settle_1q.jsp thực sự tính ra cho site này
    // (target_mm_calc — tháng hiện tại, hoặc lùi về tháng gần nhất có dữ liệu Cost Input).
    const yymm = typeof item.yymm === "string" ? item.yymm.trim() : null;
    const execYear = yymm && /^\d{6}$/.test(yymm) ? Number(yymm.slice(0, 4)) : null;
    const execMonth = yymm && /^\d{6}$/.test(yymm) ? Number(yymm.slice(4, 6)) : null;
    await db
      .insert(pdCostEstimationTable)
      .values({
        projectName,
        kind: "execution",
        fldCode,
        siteCode,
        contractAmount: contractAmountVnd,
        costAmount: costAmountVnd,
        year: execYear,
        month: execMonth,
      })
      .onConflictDoUpdate({
        target: [
          pdCostEstimationTable.projectName,
          pdCostEstimationTable.kind,
          pdCostEstimationTable.year,
          pdCostEstimationTable.month,
        ],
        set: { fldCode, siteCode, contractAmount: contractAmountVnd, costAmount: costAmountVnd },
      });
    counts.pdCostEstimation++;

    // Estimated Completion Cost Rate: Contract Amount cố định = 100, Cost = REC9 (Gross Profit ratio,
    // vd 18.7) đồng bộ thẳng — UI tự tính Ratio(%) = Contract Amount - Cost (100 - REC9). Dùng chung
    // year/month với execution (cùng site, cùng target_mm_calc) để 2 dòng luôn khớp cùng 1 Base Month.
    if (item.ratio_pct != null) {
      const ratioPctStr = String(Number(item.ratio_pct));
      await db
        .insert(pdCostEstimationTable)
        .values({
          projectName,
          kind: "completion",
          fldCode,
          siteCode,
          contractAmount: "100",
          costAmount: ratioPctStr,
          year: execYear,
          month: execMonth,
          ratioPct: ratioPctStr,
        })
        .onConflictDoUpdate({
          target: [
            pdCostEstimationTable.projectName,
            pdCostEstimationTable.kind,
            pdCostEstimationTable.year,
            pdCostEstimationTable.month,
          ],
          set: { fldCode, siteCode, contractAmount: "100", costAmount: ratioPctStr, ratioPct: ratioPctStr },
        });
    }
  }

  // Milestones는 더 이상 PIMSVINA에서 동기화하지 않는다 - CBTB_CONSTHISTORY 기반 근사치였고
  // (Plan 없이 단일 이벤트 날짜만 제공) 신뢰할 수 있는 소스가 아니었다. 이제 ProjectDataEntryTab의
  // 마일스톤 전용 Excel 업로드/다운로드(downloadMilestonesTemplate/parseMilestonesWorkbook)로 대체.

  // 15. Sync Site Overview Photo (조감도, 개요 탭 사진) — 프로젝트당 1행, upsert.
  for (const item of pdSiteOverviewPhoto) {
    const projectName = resolveTradeProjectName(item);
    if (!projectName || !item.file_path || !item.file_name) {
      if (!projectName) trackSkipped(item);
      continue;
    }
    const filePath = String(item.file_path);
    const fileName = String(item.file_name);
    await db
      .insert(pdSiteOverviewPhotoTable)
      .values({ projectName, filePath, fileName })
      .onConflictDoUpdate({
        target: pdSiteOverviewPhotoTable.projectName,
        set: { filePath, fileName },
      });
    counts.pdSiteOverviewPhoto++;
  }

  // 16. Sync Site Photos Monthly (현장 사진, 공정 탭 슬라이더) — YYMM/SEQ가 매 동기화마다 바뀔 수 있어
  // upsert 대신 프로젝트 단위로 기존 행을 지우고 PIMSVINA가 준 전체 이력으로 다시 채운다.
  const sitePhotosByProject = new Map<string, { year: number; month: number; item: any }[]>();
  for (const item of pdSitePhotosMonthly) {
    const projectName = resolveTradeProjectName(item);
    if (!projectName) {
      trackSkipped(item);
      continue;
    }
    const yymm = typeof item.yymm === "string" ? item.yymm.trim() : "";
    if (!/^\d{6}$/.test(yymm)) continue;
    const list = sitePhotosByProject.get(projectName) ?? [];
    list.push({ year: Number(yymm.slice(0, 4)), month: Number(yymm.slice(4, 6)), item });
    sitePhotosByProject.set(projectName, list);
  }
  for (const [projectName, rows] of sitePhotosByProject) {
    await db.delete(pdSitePhotosMonthlyTable).where(eq(pdSitePhotosMonthlyTable.projectName, projectName));
    if (rows.length === 0) continue;
    await db.insert(pdSitePhotosMonthlyTable).values(
      rows.map(({ year, month, item }) => ({
        projectName,
        year,
        month,
        seq: Number(item.seq) || 0,
        location: item.location != null ? String(item.location) : null,
        contType: item.cont_type != null ? String(item.cont_type) : null,
        note: item.note != null ? String(item.note) : null,
        filePath: item.file_path != null ? String(item.file_path) : null,
        fileName: item.file_name != null ? String(item.file_name) : null,
      })),
    );
    counts.pdSitePhotosMonthly += rows.length;
  }

  return {
    ...counts,
    skippedProjects: Array.from(skippedProjects),
    newProjects: Array.from(newProjectNames),
  };
}

// 1단계: 미리보기 — PIMSVINA에서 데이터를 조회만 하고 DB에는 저장하지 않는다.
router.post("/sync-pimsvina/preview", requireAdmin, async (_req, res) => {
  try {
    const data = await fetchAllPimsvinaData();
    res.json({ success: true, data });
  } catch (err: any) {
    console.error("[PIMSVINA Sync Preview Error]:", err);
    res.status(500).json({
      success: false,
      error: "PIMSVINA 데이터 조회에 실패했습니다: " + err.message,
    });
  }
});

// 2단계: 확인 — 프리뷰에서 사용자가 검토한 화면과 같은 조회 로직을 서버에서 다시 실행해 DB에
// 반영한다. 예전엔 프리뷰에서 받은 전체 데이터(수천 행)를 프론트가 그대로 다시 요청 본문에 담아
// 보내야 했는데, 배포 환경(리버스 프록시 등)의 요청 본문 크기 제한에 걸려 실패하는 문제가 있었다 —
// 서버가 알아서 재조회하면 confirm 요청 자체는 본문이 필요 없어지므로 이 문제가 사라진다. PIMSVINA
// 데이터가 프리뷰 확인 시점과 confirm 클릭 시점 사이에 살짝 바뀔 수 있지만(수 분 내 변경은 드묾),
// 프리뷰는 애초에 "대략 맞는지 눈으로 확인"하는 용도이지 그 스냅샷을 그대로 고정 저장하는 게
// 목적이 아니므로 문제 없다.
router.post("/sync-pimsvina/confirm", requireAdmin, async (_req, res) => {
  try {
    const data = await fetchAllPimsvinaData();
    const counts = await applyPimsvinaData(data);
    res.json({
      success: true,
      message: "Đồng bộ dữ liệu PIMSVINA thành công!",
      counts,
    });
  } catch (err: any) {
    console.error("[PIMSVINA Sync Confirm Error]:", err);
    res.status(500).json({
      success: false,
      error: "Lỗi đồng bộ dữ liệu PIMSVINA: " + err.message,
    });
  }
});

export default router;
