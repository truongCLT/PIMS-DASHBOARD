import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { X, Check } from "lucide-react";
import { DetailDataTable, type DetailColumn } from "./DetailModal";
import { tokens as aquaTokens } from "@workspace/aqua-glass";
const AG = aquaTokens.color.light;

export type PimsvinaPreviewData = Record<string, Array<Record<string, unknown>>>;

export const PIMSVINA_TABLE_KEYS = [
  "pdOverview",
  "pdProgress",
  "pdMilestones",
  "pdSales",
  "pdCogs",
  "pdCostBudget",
  "pdOutsourcing",
  "pdCashflow",
] as const;

const MAX_ROWS = 300;

/**
 * Nhãn cột tra theo (bảng, tên cột thô từ Oracle/REST) → cùng key i18n đang dùng ở tab "Nhập liệu"
 * (ProjectDataEntryTab) để 2 màn hình hiển thị nhất quán tên trường, thay vì lộ tên cột DB (fldcode,
 * contract_amount, as_of_month...). Cột nào không có tương đương ở Nhập liệu (khoá kỹ thuật, giá trị
 * tính sẵn chỉ để đối chiếu) thì dùng các key "col*" riêng của namespace pimsvinaSyncPreview.
 */
const COMMON_COLUMN_LABELS: Record<string, [string, string]> = {
  fldcode: ["pimsvinaSyncPreview", "colFldcode"],
  site_code: ["pimsvinaSyncPreview", "colSiteCode"],
  project_name: ["pimsvinaSyncPreview", "colProjectName"],
  sort_order: ["pimsvinaSyncPreview", "colSortOrder"],
  year: ["common", "year"],
  month: ["projectDataEntryTab", "monthColumn"],
  as_of_month: ["projectDataEntryTab", "baseMonthOfRecord"],
};

const TABLE_COLUMN_LABELS: Partial<Record<(typeof PIMSVINA_TABLE_KEYS)[number], Record<string, [string, string]>>> = {
  pdOverview: {
    contract_amount: ["projectDataEntryTab", "contractAmountVnd"],
    start_date: ["projectDataEntryTab", "constructionStartDate"],
    end_date: ["projectDataEntryTab", "constructionEndDate"],
    client: ["projectDataEntryTab", "client"],
    scale: ["projectDataEntryTab", "scale"],
    scope: ["projectDataEntryTab", "scopeOfWork"],
    revenue_annual_target: ["projectDataEntryTab", "annualRevenueTargetVnd"],
    revenue_total: ["projectDataEntryTab", "cumulativeRevenueActualVnd"],
    cash_confirmed: ["pimsvinaSyncPreview", "colCashConfirmed"],
    cash_collection: ["pimsvinaSyncPreview", "colCashCollection"],
  },
  pdProgress: {
    plan_pct: ["projectDataEntryTab", "monthlyPlanPercent"],
    actual_pct: ["projectDataEntryTab", "monthlyActualPercent"],
    plan_cum_pct: ["projectDataEntryTab", "cumulativePlanPercent"],
    actual_cum_pct: ["projectDataEntryTab", "cumulativeActualPercent"],
  },
  pdMilestones: {
    label: ["projectDataEntryTab", "itemNameColumn"],
    plan_start: ["projectDataEntryTab", "planStartColumn"],
    plan_end: ["projectDataEntryTab", "planEndColumn"],
    actual_start: ["projectDataEntryTab", "actualStartColumn"],
    actual_end: ["projectDataEntryTab", "actualEndColumn"],
  },
  pdSales: {
    plan: ["projectDataEntryTab", "salesPlanVnd"],
    actual: ["projectDataEntryTab", "salesActualVnd"],
    monthly_achievement_pct: ["pimsvinaSyncPreview", "colMonthlyAchievementPct"],
    actual_ytd: ["pimsvinaSyncPreview", "colActualYtd"],
    annual_plan_target: ["pimsvinaSyncPreview", "colAnnualPlanTarget"],
    annual_target_achievement_pct: ["pimsvinaSyncPreview", "colAnnualTargetAchievementPct"],
  },
  pdCogs: {
    acct_cogs: ["projectDataEntryTab", "acctCogsVnd"],
    wip_cogs: ["projectDataEntryTab", "wipCogsVnd"],
    cumulative_acct_cogs: ["pimsvinaSyncPreview", "colCumulativeAcctCogs"],
    cumulative_wip_cogs: ["pimsvinaSyncPreview", "colCumulativeWipCogs"],
  },
  pdCostBudget: {
    category: ["projectDataEntryTab", "categoryColumn"],
    item: ["projectDataEntryTab", "itemColumn"],
    budget: ["projectDataEntryTab", "budgetVnd"],
    plan: ["projectDataEntryTab", "progressPaymentPlanVnd"],
    actual: ["projectDataEntryTab", "progressPaymentActualVnd"],
    execution_rate: ["pimsvinaSyncPreview", "colExecutionRate"],
  },
  pdOutsourcing: {
    trade_group: ["projectDataEntryTab", "tradeGroupColumn"],
    trade: ["projectDataEntryTab", "tradeColumn"],
    vendor: ["projectDataEntryTab", "vendorColumn"],
    category: ["projectDataEntryTab", "categoryColumn"],
    contract_date: ["projectDataEntryTab", "contractDateColumn"],
    change_no: ["projectDataEntryTab", "changeNoColumn"],
    budget: ["projectDataEntryTab", "budgetAVnd"],
    executed_budget: ["projectDataEntryTab", "executedBudgetVnd"],
    resolved: ["projectDataEntryTab", "resolvedBVnd"],
    this_month: ["projectDataEntryTab", "thisMonthVnd"],
    accum: ["projectDataEntryTab", "accumCVnd"],
  },
  pdCashflow: {
    cash_in: ["projectDataEntryTab", "cashInVnd"],
    cash_out: ["projectDataEntryTab", "cashOutVnd"],
    equivalent: ["projectDataEntryTab", "equivalentVnd"],
  },
};

export function PimsvinaSyncPreviewModal({
  data,
  confirming,
  onConfirm,
  onClose,
}: {
  data: PimsvinaPreviewData;
  confirming: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const { t } = useTranslation(["pimsvinaSyncPreview", "projectDataEntryTab", "common"]);
  const [activeKey, setActiveKey] = useState<string>(PIMSVINA_TABLE_KEYS[0]);
  const rows = data[activeKey] ?? [];
  const columns: DetailColumn<Record<string, unknown>>[] = useMemo(() => {
    const first = rows[0];
    if (!first) return [];
    const perTable = TABLE_COLUMN_LABELS[activeKey as (typeof PIMSVINA_TABLE_KEYS)[number]] ?? {};
    return Object.keys(first).map((k) => {
      const [ns, key] = perTable[k] ?? COMMON_COLUMN_LABELS[k] ?? [];
      const label = ns ? t(`${ns}:${key}`) : k;
      return { key: k, label, align: "left" as const };
    });
  }, [rows, activeKey, t]);
  const visibleRows = rows.slice(0, MAX_ROWS);
  const totalRows = PIMSVINA_TABLE_KEYS.reduce((sum, k) => sum + (data[k]?.length ?? 0), 0);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(20,35,60,0.5)",
        zIndex: 3000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: "#fff",
          borderRadius: "10px",
          boxShadow: "0 12px 40px rgba(10,25,50,0.3)",
          width: "min(1200px, 100%)",
          height: "min(88vh, 800px)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 18px",
            borderBottom: `1px solid ${AG.border}`,
            flexShrink: 0,
          }}
        >
          <div>
            <div style={{ fontSize: "15px", fontWeight: 700, color: AG.foreground }}>
              {t("pimsvinaSyncPreview:title")}
            </div>
            <div style={{ fontSize: "11px", color: AG.mutedForeground, marginTop: "2px" }}>
              {t("pimsvinaSyncPreview:subtitle", { count: totalRows })}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", color: AG.mutedForeground, padding: "4px", display: "flex" }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "4px",
            padding: "10px 14px",
            borderBottom: `1px solid ${AG.border}`,
            flexShrink: 0,
            overflowX: "auto",
          }}
        >
          {PIMSVINA_TABLE_KEYS.map((key) => {
            const count = data[key]?.length ?? 0;
            const active = key === activeKey;
            return (
              <button
                key={key}
                onClick={() => setActiveKey(key)}
                style={{
                  padding: "5px 10px",
                  fontSize: "11.5px",
                  fontWeight: active ? 700 : 500,
                  border: `1px solid ${active ? AG.primary : AG.input}`,
                  borderRadius: "6px",
                  backgroundColor: active ? "#eaf2fd" : "#fff",
                  color: active ? AG.secondary : "#556",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                {t(`pimsvinaSyncPreview:table_${key}`)} ({count})
              </button>
            );
          })}
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflow: "auto", padding: "12px 14px" }}>
          {rows.length === 0 ? (
            <div style={{ textAlign: "center", color: "#9aa5b3", fontSize: "13px", padding: "40px 0" }}>
              {t("pimsvinaSyncPreview:empty")}
            </div>
          ) : (
            <>
              <DetailDataTable columns={columns} rows={visibleRows} rowKey={(_, i) => String(i)} />
              {rows.length > MAX_ROWS && (
                <div style={{ fontSize: "11px", color: "#9aa5b3", marginTop: "8px", textAlign: "center" }}>
                  {t("pimsvinaSyncPreview:truncated", { shown: MAX_ROWS, total: rows.length })}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "8px",
            padding: "12px 18px",
            borderTop: `1px solid ${AG.border}`,
            flexShrink: 0,
          }}
        >
          <button
            onClick={onClose}
            disabled={confirming}
            style={{
              padding: "8px 16px",
              fontSize: "13px",
              fontWeight: 600,
              backgroundColor: "#fff",
              color: "#556",
              border: `1px solid ${AG.input}`,
              borderRadius: "6px",
              cursor: confirming ? "wait" : "pointer",
            }}
          >
            {t("common:cancel")}
          </button>
          <button
            onClick={onConfirm}
            disabled={confirming}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 16px",
              fontSize: "13px",
              fontWeight: 600,
              backgroundColor: AG.secondary,
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              cursor: confirming ? "wait" : "pointer",
              opacity: confirming ? 0.7 : 1,
            }}
          >
            <Check size={14} />
            {confirming ? t("pimsvinaSyncPreview:confirming") : t("pimsvinaSyncPreview:confirmButton")}
          </button>
        </div>
      </div>
    </div>
  );
}
