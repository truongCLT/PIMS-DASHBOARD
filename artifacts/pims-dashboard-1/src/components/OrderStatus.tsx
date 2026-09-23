import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import {
  getGetOrderDetailsQueryKey,
  type OrderDetailEntry,
  useGetOrderDetails,
} from "@workspace/api-client-react";
import { Button } from "@workspace/aqua-glass/components/ui/button";
import {
  DetailDataTable,
  DetailModal,
  type DetailColumn,
} from "./DetailModal";
import { useDashboardData } from "../lib/mgmtreportData";
import {
  makeConverter,
  roundSmart,
  unitLabelOf,
  useDashboardFilters,
} from "../lib/dashboardFilters";

export function OrderStatus() {
  const { t } = useTranslation(["orderStatus", "common"]);
  const { derived } = useDashboardData();
  const { unitIndex, currency, fxRateHistory } = useDashboardFilters();
  const [detailOpen, setDetailOpen] = useState(false);
  const statFont = unitIndex === 1 ? "12px" : "20px";
  const unavailable = derived != null && derived.orderStatus == null;
  const planTotal = derived?.orderStatus?.planTotal ?? 0;
  const ordered = derived?.orderStatus?.ordered ?? 0;
  const remaining = derived?.orderStatus?.remaining ?? 0;
  const annualForecast = derived?.orderStatus?.annualForecast ?? 0;
  const pct = planTotal ? Math.round((ordered / planTotal) * 1000) / 10 : 0;
  const forecastPct = planTotal ? Math.round((annualForecast / planTotal) * 1000) / 10 : 0;
  const detailParams = {
    year: derived?.year ?? new Date().getFullYear(),
    referenceMonth: derived?.month ?? new Date().getMonth() + 1,
  };
  const detailQuery = useGetOrderDetails(detailParams, {
    query: {
      queryKey: getGetOrderDetailsQueryKey(detailParams),
      enabled: detailOpen && derived != null,
    },
  });
  const convert = useMemo(
    () => makeConverter(currency, unitIndex, fxRateHistory),
    [currency, unitIndex, fxRateHistory],
  );
  const formatDate = (date: string | null) =>
    date ? date.slice(0, 7).replace("-", ".") : "-";
  const formatAmount = (amount: number | null) => {
    if (amount == null) return "-";
    const converted = convert(
      amount,
      derived?.year,
      derived?.month,
    );
    return roundSmart(converted).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 1 });
  };
  const detailEntries = detailQuery.data?.entries ?? [];
  const detailTotals = detailEntries.reduce(
    (totals, row) => ({
      plan: totals.plan + (row.planAmount ?? 0),
      actual: totals.actual + (row.actualAmount ?? 0),
    }),
    { plan: 0, actual: 0 },
  );
  const detailColumns: DetailColumn<OrderDetailEntry>[] = [
    {
      key: "projectName",
      label: t("orderStatus:projectName"),
      align: "left",
    },
    {
      key: "planAmount",
      label: t("orderStatus:planAmount"),
      format: (value) => formatAmount(typeof value === "number" ? value : null),
    },
    {
      key: "planDate",
      label: t("orderStatus:planDate"),
      align: "center",
      format: (value) => formatDate(typeof value === "string" ? value : null),
    },
    {
      key: "actualAmount",
      label: t("orderStatus:actualForecastAmount"),
      format: (value) => formatAmount(typeof value === "number" ? value : null),
    },
    {
      key: "actualDate",
      label: t("orderStatus:actualForecastDate"),
      align: "center",
      format: (value) => formatDate(typeof value === "string" ? value : null),
    },
    {
      key: "actualKind",
      label: t("orderStatus:status"),
      align: "center",
      format: (value) =>
        value === "actual"
          ? t("orderStatus:actual")
          : value === "forecast"
            ? t("orderStatus:forecast")
            : "-",
    },
  ];

  if (unavailable) {
    return (
      <div style={{
        backgroundColor: "#fff",
        border: "1px solid #e2e9f3",
        borderRadius: "6px",
        padding: "10px 12px",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
          <span style={{ fontSize: "13px", fontWeight: "600", color: "#16294a" }}>{t("orderStatus:title")}</span>
        </div>
        <div style={{
          height: "150px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "12px",
          color: "#888",
          textAlign: "center",
          padding: "0 10px",
        }}>
          {derived?.emptyRange
            ? t("orderStatus:noDataForPeriod")
            : t("orderStatus:noProjectOrderData")}
        </div>
      </div>
    );
  }

  const donutData = [
    { name: t("orderStatus:orderActual"), value: ordered, color: "#3d6fdc" },
    { name: t("orderStatus:remainingUnordered"), value: remaining, color: "#eef1f6" },
  ];
  const pctColor = pct >= 100 ? "#2e9e5b" : "#c0392b";
  const unit = derived?.unitLabel;

  const rows: Array<{ dot: string; label: string; value: number; detail?: string }> = [
    { dot: "#3d6fdc", label: t("orderStatus:orderActual"), value: ordered },
    { dot: "#e3e7ee", label: t("orderStatus:remainingUnordered"), value: remaining },
    { dot: "#1a2233", label: t("orderStatus:annualOrderPlan"), value: planTotal },
    {
      dot: "#2e9e5b",
      label: t("orderStatus:annualOrderForecast"),
      value: annualForecast,
      detail: t("orderStatus:forecastVsPlan", { percent: forecastPct }),
    },
  ];

  return (
    <div style={{
      backgroundColor: "#fff",
      border: "1px solid #e2e9f3",
      borderRadius: "6px",
      padding: "10px 12px",
      display: "flex",
      flexDirection: "column",
    }}>
      {/* Header: title · unit · 상세보기 */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "baseline",
        paddingBottom: "8px", borderBottom: "1px solid #eef1f6", marginBottom: "6px",
      }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
          <span style={{ fontSize: "13px", fontWeight: "600", color: "#16294a" }}>{t("orderStatus:title")}</span>
          {unit && <span style={{ fontSize: "11px", color: "#7c8ba3" }}>{unit}</span>}
        </div>
        <Button
          type="button"
          variant="link"
          size="sm"
          onClick={() => setDetailOpen(true)}
          aria-haspopup="dialog"
          className="h-auto min-h-0 p-0 text-xs"
        >
          {t("orderStatus:viewDetails")}
        </Button>
      </div>

      {/* Donut chart with center label */}
      <div style={{ height: "148px", position: "relative", marginBottom: "6px" }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={donutData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={52}
              outerRadius={68}
              startAngle={90}
              endAngle={-270}
              cornerRadius={8}
              strokeWidth={0}
              isAnimationActive={false}
            >
              {donutData.map((row) => (
                <Cell key={row.name} fill={row.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ fontSize: "12px" }}
              formatter={(v: any) => Number(v).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 1 })}
            />
          </PieChart>
        </ResponsiveContainer>
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            textAlign: "center",
            pointerEvents: "none",
          }}
        >
          <div style={{ fontSize: "24px", fontWeight: 800, color: pctColor }}>{pct}%</div>
          <div style={{ fontSize: "10px", color: "#8a99b5" }}>{t("orderStatus:vsAnnualPlan")}</div>
        </div>
      </div>

      {/* Stats list */}
      <div style={{ borderTop: "1px solid #eef1f6" }}>
        {rows.map((r, i) => (
          <div key={r.label} style={{
            display: "flex", alignItems: "center", gap: "8px",
            padding: "8px 2px",
            borderBottom: i < rows.length - 1 ? "1px solid #f2f4f8" : "none",
          }}>
            <span style={{ width: "9px", height: "9px", borderRadius: "3px", backgroundColor: r.dot, flexShrink: 0 }} />
            <span style={{ fontSize: "12px", color: "#333", flex: 1, minWidth: 0 }}>
              {r.label}
            </span>
            <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", flexShrink: 0 }}>
              <span style={{ display: "flex", alignItems: "baseline", gap: "4px" }}>
                <span style={{ fontSize: statFont === "12px" ? "12px" : "15px", fontWeight: 700, color: "#1a2d4d" }}>
                  {r.value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 1 })}
                </span>
                {unit && <span style={{ fontSize: "10px", color: "#8a99b5" }}>{unit}</span>}
              </span>
              {r.detail && (
                <span style={{ marginTop: "2px", fontSize: "10px", color: "#2e9e5b", fontWeight: 600 }}>
                  {r.detail}
                </span>
              )}
            </span>
          </div>
        ))}
      </div>

      <DetailModal
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        title={t("orderStatus:detailTitle")}
        subtitle={t("orderStatus:detailSubtitle", {
          year: derived?.year,
          month: derived?.month,
          unit: unitLabelOf(currency, unitIndex),
        })}
      >
        {detailQuery.isLoading ? (
          <div style={{ padding: "32px", textAlign: "center", color: "#7c8ba3", fontSize: "12px" }}>
            {t("orderStatus:detailLoading")}
          </div>
        ) : detailQuery.isError ? (
          <div role="alert" style={{ padding: "32px", textAlign: "center", color: "#c0392b", fontSize: "12px" }}>
            {t("orderStatus:detailError")}
          </div>
        ) : detailEntries.length === 0 ? (
          <div style={{ padding: "32px", textAlign: "center", color: "#7c8ba3", fontSize: "12px" }}>
            {t("orderStatus:detailEmpty")}
          </div>
        ) : (
          <DetailDataTable
            columns={detailColumns}
            rows={detailEntries}
            rowKey={(row) => row.projectName}
            totalLabel={t("orderStatus:total")}
            totalRow={{
              planAmount: detailTotals.plan,
              actualAmount: detailTotals.actual,
            }}
          />
        )}
      </DetailModal>
    </div>
  );
}
