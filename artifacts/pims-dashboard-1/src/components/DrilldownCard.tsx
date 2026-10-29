import React from "react";
import { useTranslation } from "react-i18next";
import {
  getGetOrderDetailsQueryKey,
  getListMgmtreportProjectsQueryKey,
  useGetOrderDetails,
  useListMgmtreportProjects,
} from "@workspace/api-client-react";
import { useDashboardData, REPORT_YEAR } from "../lib/mgmtreportData";
import { maxSelectableMonth } from "../lib/monthRange";
import { useDashboardFilters, makeConverter, roundSmart } from "../lib/dashboardFilters";

const NAVY = "#1a3a6b";

function NumBadge({ n }: { n: number }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: "18px",
        height: "18px",
        borderRadius: "50%",
        backgroundColor: NAVY,
        color: "#fff",
        fontSize: "12px",
        fontWeight: 700,
        flexShrink: 0,
      }}
    >
      {n}
    </span>
  );
}

export function DrilldownCard() {
  const { t } = useTranslation(["drilldownCard", "common"]);
  const { derived, isError } = useDashboardData();
  const { currency, unitIndex, fxRateHistory } = useDashboardFilters();
  const reportYear = derived?.year ?? REPORT_YEAR;
  const projectsQuery = useListMgmtreportProjects(
    { year: reportYear },
    {
      query: {
        queryKey: getListMgmtreportProjectsQueryKey({ year: reportYear }),
        enabled: derived != null,
        staleTime: 0,
        refetchOnMount: "always",
      },
    },
  );

  const unitLabel = derived?.unitLabel ?? "천 USD";
  const convert = makeConverter(currency, unitIndex, fxRateHistory);
  const fmtK = (v: number): string =>
    `${roundSmart(v).toLocaleString("ko-KR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} ${unitLabel}`;

  const month = derived?.month ?? maxSelectableMonth();

  // 1. 수주 실적: 제목이 "Order Result (Month N)"이므로 그 달 단일 값을 보여준다 — OrderStatus 카드의
  // "Orders received"(연초~기준월 누계)와는 다른 값이니 섞지 않는다.
  // (derived 값은 이미 선택된 통화·단위로 변환되어 있음)
  const orderMonthActualValue = derived?.orderMonthActual ?? null;

  // 그 달 수주 프로젝트명: 경영현황판 Excel에는 프로젝트명이 없어서, "수주 계획 및 실적" 업로드
  // (order_entries)에 그 달 실적일자로 들어온 프로젝트를 보여준다. 업로드가 없으면(fallback = 경영보고
  // 월 합계) 프로젝트 단위가 아니므로 금액만 보여준다.
  const orderParams = { year: reportYear, referenceMonth: month || 1 };
  const orderQuery = useGetOrderDetails(orderParams, {
    query: { queryKey: getGetOrderDetailsQueryKey(orderParams), enabled: derived != null && month > 0 },
  });
  const monthPrefix = `${reportYear}-${String(month).padStart(2, "0")}`;
  const orderProjects = orderQuery.data?.fallback
    ? []
    : (orderQuery.data?.entries ?? [])
        .filter((e) => e.actualKind === "actual" && e.actualAmount && e.actualDate?.startsWith(monthPrefix))
        .map((e) => ({ name: e.projectName, value: convert(e.actualAmount ?? 0, reportYear, month) }))
        .sort((a, b) => b.value - a.value);
  const shownOrderProjects = orderProjects.slice(0, 3);

  // 2. 금월 주요 매출: top-3 projects by current-month actual revenue (groups excluded server-side)
  const topRevenue = (projectsQuery.data?.projects ?? [])
    .filter((p) => !p.isGroup)
    .map((p) => ({
      name: p.name,
      value: month > 0
        ? convert(p.revenueActual[month - 1] ?? 0, reportYear, month)
        : 0,
    }))
    .filter((p) => p.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 3);

  const loading = !derived || projectsQuery.isLoading;
  const error = isError || projectsQuery.isError;

  return (
    <div
      style={{
        backgroundColor: "#fff",
        border: "1px solid #e2e9f3",
        borderRadius: "6px",
        flex: "1 1 auto",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          backgroundColor: NAVY,
          color: "#fff",
          textAlign: "center",
          fontSize: "13px",
          fontWeight: 700,
          padding: "7px 8px",
        }}
      >
        {t("drilldownCard:header")}
      </div>

      {/* 카드가 늘어나면 각 섹션의 내용 박스가 남는 높이를 나눠 채움(빈 틈 없이) */}
      <div style={{ padding: "10px 12px", flex: 1, display: "flex", flexDirection: "column", gap: "12px" }}>
        {/* 1. 수주 실적 */}
        <div style={{ flex: "1 1 auto", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
          <NumBadge n={1} />
          <span style={{ fontSize: "13px", fontWeight: 700, color: NAVY }}>
            {t("drilldownCard:orderResultTitle")}{month ? t("drilldownCard:orderResultMonthSuffix", { month }) : ""}
          </span>
        </div>
        <div
          style={{
            backgroundColor: "#f4f7fb",
            borderRadius: "4px",
            padding: "8px 10px",
            fontSize: "15px",
            color: "#16294a",
            fontWeight: 700,
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {error ? (
            t("drilldownCard:error")
          ) : loading ? (
            "-"
          ) : orderMonthActualValue != null && orderMonthActualValue !== 0 ? (
            <div style={{ width: "100%", textAlign: "center" }}>
              <div>{fmtK(orderMonthActualValue)}</div>
              {shownOrderProjects.length > 0 && (
                <div style={{ marginTop: "6px", display: "flex", flexDirection: "column", gap: "3px", textAlign: "left" }}>
                  {shownOrderProjects.map((p) => (
                    <div key={p.name} style={{ display: "flex", gap: "6px", fontSize: "12px", fontWeight: 600 }}>
                      <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        · {p.name}
                      </span>
                      <span style={{ flexShrink: 0 }}>{fmtK(p.value)}</span>
                    </div>
                  ))}
                  {orderProjects.length > shownOrderProjects.length && (
                    <div style={{ fontSize: "11px", color: "#6b7c94", fontWeight: 500 }}>
                      {t("drilldownCard:moreProjects", { count: orderProjects.length - shownOrderProjects.length })}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div style={{ color: "#6b7c94", fontWeight: 500 }}>{t("drilldownCard:noCurrentMonthOrder")}</div>
          )}
        </div>
        </div>

        {/* 2. 금월 주요 매출 — 항목이 더 많으므로 남는 높이를 더 많이 배분 */}
        <div style={{ flex: "2 1 auto", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
          <NumBadge n={2} />
          <span style={{ fontSize: "13px", fontWeight: 700, color: NAVY }}>{t("drilldownCard:topRevenueTitle")}</span>
        </div>
        <div
          style={{
            backgroundColor: "#f4f7fb",
            borderRadius: "4px",
            padding: "8px 10px",
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-evenly",
            gap: "6px",
          }}
        >
          {error ? (
            <span style={{ fontSize: "13px", color: "#16294a", fontWeight: 600 }}>{t("drilldownCard:error")}</span>
          ) : loading ? (
            <span style={{ fontSize: "13px", color: "#16294a", fontWeight: 600 }}>-</span>
          ) : topRevenue.length === 0 ? (
            <span style={{ fontSize: "13px", color: "#6b7c94", fontWeight: 500 }}>{t("drilldownCard:noCurrentMonthRevenue")}</span>
          ) : (
            topRevenue.map((p) => (
              <div
                key={p.name}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "13px",
                  color: "#16294a",
                  fontWeight: 600,
                }}
              >
                <span
                  style={{
                    width: "4px",
                    height: "4px",
                    borderRadius: "50%",
                    backgroundColor: "#16294a",
                    flexShrink: 0,
                  }}
                />
                <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {p.name}
                </span>
                <span style={{ flexShrink: 0 }}>{fmtK(p.value)}</span>
              </div>
            ))
          )}
        </div>
        </div>
      </div>
    </div>
  );
}
