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
  pdSalesMonthlyTable,
  pdCostBudgetTable,
  pdCostBudgetMonthlyTable,
  pdCostEstimationTable,
  pdMilestonesTable,
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
async function fetchAllPimsvinaData() {
  const [
    pdOverview,
    pdProgress,
    pdOutsourcing,
    pdTradeCostMonthlyResult,
    pdTradeCostScopesResult,
    pdCashflow,
    pdCogs,
    pdSales,
    pdCostBudget,
    pdCostEstimation,
    pdMilestones,
  ] = await Promise.all([
    fetchPimsvinaApi("dashboard_pd_overview_1q.jsp"),
    fetchPimsvinaApi("dashboard_pd_progress_1q.jsp"),
    fetchPimsvinaApi("dashboard_pd_outsourcing_1q.jsp"),
    fetchPimsvinaOracleQueryResult("dashboard_pd_trade_cost_monthly_1q.jsp"),
    fetchPimsvinaOracleQueryResult("dashboard_pd_trade_cost_scopes_1q.jsp"),
    fetchPimsvinaApi("dashboard_pd_cashflow_1q.jsp"),
    fetchPimsvinaApi("dashboard_pd_cogs_monthly_1q.jsp"),
    fetchPimsvinaApi("dashboard_pd_sales_1q.jsp"),
    fetchPimsvinaApi("dashboard_pd_costbudget_1q.jsp"),
    fetchPimsvinaApi("dashboard_pd_costestimation_1q.jsp"),
    fetchPimsvinaApi("dashboard_pd_milestones_1q.jsp"),
  ]);
  const pdTradeCostMonthlyRaw = pdTradeCostMonthlyResult.data;
  const pdTradeCostScopesRaw = pdTradeCostScopesResult.data;
  const tradeCostSnapshotComplete =
    pdTradeCostMonthlyResult.ok && pdTradeCostScopesResult.ok;
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
    const incomingActual = parsePimsvinaKusd(row.actual_kusd);
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
    pdSales,
    pdCostBudget,
    pdCostEstimation,
    pdMilestones,
  };
}

type PimsvinaData = Awaited<ReturnType<typeof fetchAllPimsvinaData>>;

/** 2단계: 미리보기 팝업에서 "확인"을 누른 뒤, 조회해둔(또는 사용자가 그대로 넘긴) 데이터를 실제 DB에 반영한다. */
async function applyPimsvinaData(fetched: PimsvinaData) {
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
  const pdSales = fetched.pdSales ?? [];
  const pdCostBudget = fetched.pdCostBudget ?? [];
  const pdCostEstimation = fetched.pdCostEstimation ?? [];
  const pdMilestones = fetched.pdMilestones ?? [];

  const counts = {
    pdOverview: 0,
    pdProgress: 0,
    pdOutsourcing: 0,
    pdTradeCostMonthly: 0,
    pdCashflow: 0,
    pdCogs: 0,
    pdSales: 0,
    pdCostBudget: 0,
    pdCostEstimation: 0,
    pdMilestones: 0,
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
          contractAmount: item.contract_amount != null ? toK(item.contract_amount) : existing.contractAmount,
          startDate: item.start_date || existing.startDate,
          endDate: item.end_date || existing.endDate,
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
        contractAmount: item.contract_amount != null ? toK(item.contract_amount) : null,
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

    const planPct = sanitizeNumStr(item.plan_pct);
    const actualPct = sanitizeNumStr(item.actual_pct);
    const planCumPct = sanitizeNumStr(item.plan_cum_pct);
    const actualCumPct = sanitizeNumStr(item.actual_cum_pct);

    await db
      .insert(pdProgressMonthlyTable)
      .values({
        projectName,
        fldCode: item.fldcode || null,
        siteCode: item.site_code || null,
        year: Number(item.year),
        month: m,
        planPct,
        actualPct,
        planCumPct,
        actualCumPct,
      })
      .onConflictDoUpdate({
        target: [pdProgressMonthlyTable.projectName, pdProgressMonthlyTable.year, pdProgressMonthlyTable.month],
        // planPct/planCumPct KHÔNG có trong PIMS (GIỮ NHẬP TAY theo MaTran_NguonDuLieu_Dashboard_PIMS_DECV_v4.xlsx,
        // dòng #6) - JSP luôn trả null cho 2 trường này. Nếu đưa vào set ở đây, mỗi lần sync sẽ GHI ĐÈ/XÓA giá trị
        // Plan % người dùng đã nhập tay ở Data Entry (PUT /projectdetail) bằng null. Chỉ cập nhật actualPct/
        // actualCumPct (có nguồn PIMS thật) - planPct/planCumPct giữ nguyên giá trị đã có trong DB.
        set: { fldCode: item.fldcode || null, siteCode: item.site_code || null, actualPct, actualCumPct },
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
        budget: toK(item.budget),
        executedBudget: toK(item.executed_budget),
        resolved: toK(item.resolved),
        thisMonth: toK(item.this_month),
        accum: toK(item.accum),
        sortOrder: Number(item.sort_order) || 0,
      });
      counts.pdOutsourcing++;
    }
  }

  // 11b. Sync monthly actual cost by explicit ERP trade. Plans stay manual.
  // Multiple ERP contract codes may map to the same standard trade/month, so
  // aggregate before upsert instead of allowing the last contract to win.
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
    const actualKusd = parsePimsvinaKusd(item.actual_kusd);
    const hasValidIdentity =
      projectName != null &&
      mappedItem != null &&
      Number.isInteger(year) &&
      Number.isInteger(month) &&
      month >= 1 &&
      month <= 12;
    if (hasValidIdentity && actualKusd == null) {
      invalidIncomingTradeCostKeys.add(
        tradeCostKey({ projectName, item: mappedItem, year, month }),
      );
    }
    if (
      !hasValidIdentity ||
      actualKusd == null
    ) {
      if (!projectName) trackSkipped(item);
      continue;
    }
    const key = `${projectName}|${mappedItem}|${year}|${month}`;
    const existing = tradeCostUpdates.get(key);
    if (existing) existing.rawActual += actualKusd;
    else tradeCostUpdates.set(key, { projectName, item: mappedItem, year, month, rawActual: actualKusd });
  }
  for (const update of tradeCostUpdates.values()) {
    const actual = parsePimsvinaKusd(update.rawActual);
    if (actual == null) continue;
    await db
      .insert(pdCostBudgetMonthlyTable)
      .values({
        projectName: update.projectName,
        item: update.item,
        year: update.year,
        month: update.month,
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

  // 14. Sync Project Detail Sales Monthly (revenue plan/actual per project per month)
  for (const item of fetched.pdSales) {
    const projectName = await resolveProjectName(item);
    const m = Number(item.month);
    if (!projectName || !item.year || !item.month || isNaN(m) || m < 1 || m > 12) {
      if (!projectName) trackSkipped(item);
      continue;
    }
    const plan = item.plan != null ? String(item.plan) : null;
    const actual = item.actual != null ? String(item.actual) : null;

    await db
      .insert(pdSalesMonthlyTable)
      .values({
        projectName,
        fldCode: item.fldcode || null,
        siteCode: item.site_code || null,
        year: Number(item.year),
        month: m,
        plan,
        actual,
      })
      .onConflictDoUpdate({
        target: [pdSalesMonthlyTable.projectName, pdSalesMonthlyTable.year, pdSalesMonthlyTable.month],
        set: { fldCode: item.fldcode || null, siteCode: item.site_code || null, plan, actual },
      });
    counts.pdSales++;
  }

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
      const incomingPlan = toK(item.plan);
      const preservedPlan = existingPlanByItem.get(String(item.item).trim().toLowerCase()) ?? null;
      await db.insert(pdCostBudgetTable).values({
        projectName,
        fldCode: item.fldcode || null,
        siteCode: item.site_code || null,
        category: item.category || null,
        item: item.item,
        budget: toK(item.budget),
        plan: incomingPlan != null ? incomingPlan : preservedPlan,
        actual: toK(item.actual),
        sortOrder: Number(item.sort_order) || 0,
      });
      counts.pdCostBudget++;
    }
  }

  // 14b. Sync Project Detail Cost Estimation — CHỈ kind='execution' (Execution Budget Cost Rate).
  // 'bidding' và 'completion' chưa có nguồn PIMS đã xác minh (xem MaTran_NguonDuLieu...v4.xlsx #12/#14),
  // vẫn phải nhập tay qua Data Entry (PUT /projectdetail) — TUYỆT ĐỐI không đụng tới 2 kind đó ở đây,
  // chỉ upsert đúng 1 dòng kind='execution' theo unique key (projectName, kind, year, month).
  // BDGTAMT ở nguồn đã là USD gốc (không phải VND) nên quy đổi kUSD bằng cách chia 1000 trực tiếp,
  // KHÔNG dùng toK() chung (toK() sẽ hiểu nhầm số USD lớn > 100 triệu thành VND và chia nhầm cho tỷ giá).
  for (const item of pdCostEstimation) {
    const projectName = await resolveProjectName(item);
    if (!projectName || item.cost_amount == null || item.contract_amount == null) {
      if (!projectName) trackSkipped(item);
      continue;
    }
    const costAmountK = String(Number(item.cost_amount) / 1000);
    const contractAmountK = String(Number(item.contract_amount) / 1000);
    await db
      .insert(pdCostEstimationTable)
      .values({
        projectName,
        kind: "execution",
        contractAmount: contractAmountK,
        costAmount: costAmountK,
        year: null,
        month: null,
      })
      .onConflictDoUpdate({
        target: [
          pdCostEstimationTable.projectName,
          pdCostEstimationTable.kind,
          pdCostEstimationTable.year,
          pdCostEstimationTable.month,
        ],
        set: { contractAmount: contractAmountK, costAmount: costAmountK },
      });
    counts.pdCostEstimation++;
  }

  // 15. Sync Project Milestones — CBTB_CONSTHISTORY(공사이력) 기반 근사치. APQP_WBS로 시도했으나 실제 DB에
  // 없는 테이블로 확인되어 대체. 이 소스는 계획/실적 기간이 아니라 단일 이벤트 날짜라 planStart/planEnd는
  // 항상 null, actualStart=actualEnd=해당 이벤트월로 채워짐 - 완전한 마일스톤 트래커는 아님(근사치).
  // no natural unique key across syncs -> full replace per project (pd_outsourcing/pd_cost_budget와 동일 패턴)
  const pdMilestonesByProject = new Map<string, any[]>();
  for (const item of fetched.pdMilestones) {
    const projectName = await resolveProjectName(item);
    if (!projectName || !item.label) {
      if (!projectName) trackSkipped(item);
      continue;
    }
    if (!pdMilestonesByProject.has(projectName)) pdMilestonesByProject.set(projectName, []);
    pdMilestonesByProject.get(projectName)!.push(item);
  }
  for (const [projectName, items] of pdMilestonesByProject) {
    // planStart/planEnd KHÔNG có trong PIMS (JSP luôn trả null - xem comment dashboard_pd_milestones_1q.jsp)
    // nhưng CÓ thể được nhập tay qua Data Entry (ProjectDataEntryTab -> PUT /projectdetail), kể cả milestone
    // tự thêm hoàn toàn không khớp mốc nào trong Construction History PIMS. Vì bảng này bị xóa hết rồi insert
    // lại mỗi lần sync, phải: (1) snapshot planStart/planEnd hiện có theo `label` để ghép lại vào dòng mới
    // cùng label, và (2) giữ lại nguyên vẹn những dòng milestone nhập tay không có label nào khớp với dữ liệu
    // PIMSVINA lần này - tránh sync xóa mất milestone tự thêm.
    const existingRows = await db.select().from(pdMilestonesTable).where(eq(pdMilestonesTable.projectName, projectName));
    const existingByLabel = new Map<string, (typeof existingRows)[number]>();
    for (const r of existingRows) {
      existingByLabel.set(r.label.trim().toLowerCase(), r);
    }
    const incomingLabels = new Set(items.map((item) => String(item.label).trim().toLowerCase()));

    await db.delete(pdMilestonesTable).where(eq(pdMilestonesTable.projectName, projectName));
    let sortOrder = 0;
    for (const item of items) {
      const existing = existingByLabel.get(String(item.label).trim().toLowerCase());
      await db.insert(pdMilestonesTable).values({
        projectName,
        fldCode: item.fldcode || null,
        siteCode: item.site_code || null,
        label: item.label,
        planStart: item.plan_start || existing?.planStart || null,
        planEnd: item.plan_end || existing?.planEnd || null,
        actualStart: item.actual_start || null,
        actualEnd: item.actual_end || null,
        sortOrder: sortOrder++,
      });
      counts.pdMilestones++;
    }
    for (const r of existingRows) {
      if (incomingLabels.has(r.label.trim().toLowerCase())) continue;
      await db.insert(pdMilestonesTable).values({
        projectName,
        fldCode: r.fldCode,
        siteCode: r.siteCode,
        label: r.label,
        planStart: r.planStart,
        planEnd: r.planEnd,
        actualStart: r.actualStart,
        actualEnd: r.actualEnd,
        sortOrder: sortOrder++,
      });
      counts.pdMilestones++;
    }
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

// 2단계: 확인 — 미리보기 화면에서 사용자가 검토한 데이터를 그대로 받아 DB에 반영한다.
const PIMSVINA_DATA_KEYS = [
  "pdOverview",
  "pdProgress",
  "pdOutsourcing",
  "pdTradeCostMonthly",
  "pdTradeCostScopes",
  "pdTradeCostSyncStatus",
  "pdCashflow",
  "pdCogs",
  "pdSales",
  "pdCostBudget",
  "pdMilestones",
] as const;

function isPimsvinaData(value: unknown): value is PimsvinaData {
  if (value == null || typeof value !== "object") return false;
  return PIMSVINA_DATA_KEYS.every((k) => Array.isArray((value as Record<string, unknown>)[k]));
}

router.post("/sync-pimsvina/confirm", requireAdmin, async (req, res) => {
  const body = req.body as { data?: unknown } | null;
  if (!isPimsvinaData(body?.data)) {
    res.status(400).json({ success: false, error: "잘못된 요청 본문입니다." });
    return;
  }
  try {
    const counts = await applyPimsvinaData(body.data);
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
