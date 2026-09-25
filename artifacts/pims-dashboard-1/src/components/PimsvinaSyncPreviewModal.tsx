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
  "pdCogs",
  "pdCostBudget",
  "pdCostBudgetMonthly",
  "pdCostEstimation",
  "pdOutsourcing",
  "pdTradeCostMonthly",
  "pdCashflow",
  "pdSiteOverviewPhoto",
  "pdSitePhotosMonthly",
] as const;

const MAX_ROWS = 300;

/** DetailDataTable mặc định hiển thị số với tối đa 8 chữ số thập phân — quá dài để review nhanh
 * (VD "0,8383"). Bảng preview này gộp chung nhiều bảng PIMSVINA khác nhau (금액/%/비율 lẫn lộn) nên
 * không thể luôn làm tròn về số nguyên như tiền tệ — cột nào là %/tỷ lệ (tên trường có "pct"/"ratio",
 * VD actual_pct, ratio_pct, initial_gross_profit_ratio) vẫn giữ 1 chữ số thập phân; còn lại (tiền,
 * số lượng) làm tròn số nguyên cho gọn. */
const PERCENT_LIKE_KEY = /pct|ratio/i;
function formatPreviewValue(value: unknown, key?: string): React.ReactNode {
  if (typeof value !== "number") return (value as React.ReactNode) ?? "-";
  const digits = key != null && PERCENT_LIKE_KEY.test(key) ? 1 : 0;
  return value.toLocaleString(undefined, { maximumFractionDigits: digits });
}

/** Some raw PIMSVINA payloads carry far more fields than are useful to review in this
 * preview table. Tables listed here show ONLY the given raw keys (in this order);
 * tables not listed fall back to showing every key present on the first row. */
const VISIBLE_COLUMNS: Partial<Record<string, string[]>> = {
  pdOverview: ["fldcode", "site_code", "project_name", "contract_amount", "start_date", "end_date"],
  pdProgress: ["fldcode", "site_code", "project_name", "year", "month", "actual_pct"],
  pdCostBudget: ["fldcode", "site_code", "project_name", "category", "item", "budget", "actual"],
  pdCostBudgetMonthly: ["fldcode", "site_code", "project_name", "year", "month", "item", "actual"],
  pdCostEstimation: [
    "fldcode",
    "site_code",
    "project_name",
    "yymm",
    "contract_amount",
    "cost_amount",
    "ratio_pct",
    "initial_business_budget",
    "initial_contract_amount",
    "initial_gross_profit_ratio",
  ],
  pdSiteOverviewPhoto: ["fldcode", "site_code", "file_path", "file_name"],
  pdSitePhotosMonthly: ["fldcode", "site_code", "yymm", "seq", "location", "cont_type", "note", "file_path", "file_name"],
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
  const { t } = useTranslation(["pimsvinaSyncPreview", "common"]);
  const [activeKey, setActiveKey] = useState<string>(PIMSVINA_TABLE_KEYS[0]);
  const rows = data[activeKey] ?? [];
  const columns: DetailColumn<Record<string, unknown>>[] = useMemo(() => {
    const first = rows[0];
    if (!first) return [];
    const keys = VISIBLE_COLUMNS[activeKey] ?? Object.keys(first);
    return keys.map((k) => {
      // Table-specific label first (same raw field name can mean different things
      // across PIMSVINA tables, e.g. "plan"/"budget"/"category"), then a shared
      // generic label, then a formatted fallback for unmapped raw database keys.
      const specific = t(`pimsvinaSyncPreview:col_${activeKey}_${k}`, { defaultValue: "" });
      const translated = specific || t(`pimsvinaSyncPreview:col_${k}`, { defaultValue: "" });
      const format = (v: unknown) => formatPreviewValue(v, k);
      if (translated) {
        return { key: k, label: translated, align: "left" as const, format };
      }
      const formattedLabel = k
        .replace(/_/g, " ")
        .replace(/\b\w/g, (char) => char.toUpperCase());
      return { key: k, label: formattedLabel, align: "left" as const, format };
    });
  }, [rows, t, activeKey]);
  // Monthly Progress: 실적 없는(0 이하) 달은 검토할 게 없어 소음만 되므로 제외하고 보여준다.
  const filteredRows =
    activeKey === "pdProgress"
      ? rows.filter((row) => Number(row.actual_pct) > 0)
      : rows;
  const visibleRows = filteredRows.slice(0, MAX_ROWS);
  const totalRows = PIMSVINA_TABLE_KEYS.reduce((sum, k) => sum + (data[k]?.length ?? 0), 0);
  const tradeCostStatus = data.pdTradeCostSyncStatus?.[0];
  const tradeCostUnavailable = tradeCostStatus?.complete === false;

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
          {tradeCostUnavailable && (
            <div
              style={{
                marginBottom: "10px",
                padding: "10px 12px",
                border: `1px solid ${AG.destructive}`,
                borderRadius: "6px",
                color: AG.destructive,
                fontSize: "12px",
                fontWeight: 600,
              }}
            >
              {t("pimsvinaSyncPreview:tradeCostUnavailable")}
            </div>
          )}
          {filteredRows.length === 0 ? (
            <div style={{ textAlign: "center", color: "#9aa5b3", fontSize: "13px", padding: "40px 0" }}>
              {t("pimsvinaSyncPreview:empty")}
            </div>
          ) : (
            <>
              <DetailDataTable columns={columns} rows={visibleRows} rowKey={(_, i) => String(i)} />
              {filteredRows.length > MAX_ROWS && (
                <div style={{ fontSize: "11px", color: "#9aa5b3", marginTop: "8px", textAlign: "center" }}>
                  {t("pimsvinaSyncPreview:truncated", { shown: MAX_ROWS, total: filteredRows.length })}
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
