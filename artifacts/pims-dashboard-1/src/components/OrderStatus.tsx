import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import {
  getGetOrderDetailsQueryKey,
  useGetOrderDetails,
} from "@workspace/api-client-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/aqua-glass/components/ui/dialog";
import { Button } from "@workspace/aqua-glass/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/aqua-glass/components/ui/table";
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
  const pct = planTotal ? Math.round((ordered / planTotal) * 100) : 0;
  const forecastPct = planTotal ? Math.round((annualForecast / planTotal) * 100) : 0;
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
    return roundSmart(converted).toLocaleString();
  };
  const detailEntries = detailQuery.data?.entries ?? [];
  const detailTotals = detailEntries.reduce(
    (totals, row) => ({
      plan:
        totals.plan +
        (row.planAmount == null
          ? 0
          : convert(row.planAmount, derived?.year, derived?.month)),
      actual:
        totals.actual +
        (row.actualAmount == null
          ? 0
          : convert(row.actualAmount, derived?.year, derived?.month)),
    }),
    { plan: 0, actual: 0 },
  );

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
              formatter={(v: any) => Number(v).toLocaleString()}
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
              {r.detail && (
                <span style={{ display: "block", marginTop: "2px", fontSize: "10px", color: "#2e9e5b", fontWeight: 600 }}>
                  {r.detail}
                </span>
              )}
            </span>
            <span style={{ fontSize: statFont === "12px" ? "12px" : "15px", fontWeight: 700, color: "#1a2d4d" }}>
              {r.value.toLocaleString()}
            </span>
            {unit && <span style={{ fontSize: "10px", color: "#8a99b5" }}>{unit}</span>}
          </div>
        ))}
      </div>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-h-[88vh] max-w-5xl overflow-hidden p-0">
          <DialogHeader className="border-b px-6 py-4 pr-12">
            <DialogTitle>{t("orderStatus:detailTitle")}</DialogTitle>
            <DialogDescription>
              {t("orderStatus:detailSubtitle", {
                year: derived?.year,
                month: derived?.month,
                unit: unitLabelOf(currency, unitIndex),
              })}
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-auto px-6 pb-6">
            {detailQuery.isLoading ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                {t("orderStatus:detailLoading")}
              </div>
            ) : detailQuery.isError ? (
              <div role="alert" className="py-12 text-center text-sm text-destructive">
                {t("orderStatus:detailError")}
              </div>
            ) : detailEntries.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                {t("orderStatus:detailEmpty")}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("orderStatus:projectName")}</TableHead>
                    <TableHead className="text-right">{t("orderStatus:planAmount")}</TableHead>
                    <TableHead className="text-center">{t("orderStatus:planDate")}</TableHead>
                    <TableHead className="text-right">{t("orderStatus:actualForecastAmount")}</TableHead>
                    <TableHead className="text-center">{t("orderStatus:actualForecastDate")}</TableHead>
                    <TableHead className="text-center">{t("orderStatus:status")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detailEntries.map((row) => (
                    <TableRow key={row.projectName}>
                      <TableCell className="font-medium">{row.projectName}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatAmount(row.planAmount)}
                      </TableCell>
                      <TableCell className="text-center">{formatDate(row.planDate)}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatAmount(row.actualAmount)}
                      </TableCell>
                      <TableCell className="text-center">{formatDate(row.actualDate)}</TableCell>
                      <TableCell className="text-center font-medium">
                        {row.actualKind === "actual"
                          ? t("orderStatus:actual")
                          : row.actualKind === "forecast"
                            ? t("orderStatus:forecast")
                            : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell>{t("orderStatus:total")}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {roundSmart(detailTotals.plan).toLocaleString()}
                    </TableCell>
                    <TableCell />
                    <TableCell className="text-right tabular-nums">
                      {roundSmart(detailTotals.actual).toLocaleString()}
                    </TableCell>
                    <TableCell />
                    <TableCell />
                  </TableRow>
                </TableFooter>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
