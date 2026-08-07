import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { X, Check } from "lucide-react";
import { DetailDataTable, type DetailColumn } from "./DetailModal";

export type PimsvinaPreviewData = Record<string, Array<Record<string, unknown>>>;

export const PIMSVINA_TABLE_KEYS = [
  "cfProjects",
  "cfMonthly",
  "scSites",
  "scMonthly",
  "mrProjects",
  "mrMonthly",
  "mrAnnual",
  "mrPnl",
  "pdOverview",
  "pdProgress",
  "pdOutsourcing",
  "pdCashflow",
  "pdSales",
  "pdCostBudget",
  "pdMilestones",
  "fxRates",
  "orgStructure",
  "orgProjectLinks",
] as const;

const MAX_ROWS = 300;

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
    return Object.keys(first).map((k) => ({ key: k, label: k, align: "left" as const }));
  }, [rows]);
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
            borderBottom: "1px solid #e2e9f3",
            flexShrink: 0,
          }}
        >
          <div>
            <div style={{ fontSize: "15px", fontWeight: 700, color: "#16294a" }}>
              {t("pimsvinaSyncPreview:title")}
            </div>
            <div style={{ fontSize: "11px", color: "#7c8ba3", marginTop: "2px" }}>
              {t("pimsvinaSyncPreview:subtitle", { count: totalRows })}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#7c8ba3", padding: "4px", display: "flex" }}
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
            borderBottom: "1px solid #e2e9f3",
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
                  border: `1px solid ${active ? "#2f7cf6" : "#dde6f1"}`,
                  borderRadius: "6px",
                  backgroundColor: active ? "#eaf2fd" : "#fff",
                  color: active ? "#1e3a6e" : "#556",
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
            borderTop: "1px solid #e2e9f3",
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
              border: "1px solid #dde6f1",
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
              backgroundColor: "#1e3a6e",
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
