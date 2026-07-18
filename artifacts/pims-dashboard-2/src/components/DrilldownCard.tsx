import React from "react";
import { useListMgmtreportProjects } from "@workspace/api-client-react";
import { useDashboardData, REPORT_YEAR } from "../lib/mgmtreportData";
import { lastClosedMonth } from "../lib/monthRange";
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
        fontSize: "11px",
        fontWeight: 700,
        flexShrink: 0,
      }}
    >
      {n}
    </span>
  );
}

export function DrilldownCard() {
  const { derived, isError } = useDashboardData();
  const { currency, unitIndex } = useDashboardFilters();
  const projectsQuery = useListMgmtreportProjects({ year: REPORT_YEAR });

  const unitLabel = derived?.unitLabel ?? "천 USD";
  const convert = makeConverter(currency, unitIndex);
  const fmtK = (v: number): string => `${roundSmart(v).toLocaleString("ko-KR")} ${unitLabel}`;

  const month = derived?.month ?? Math.max(lastClosedMonth(), 1);

  // 1. 수주 실적: corporate new_orders for the current month (fallback: cumulative)
  // (derived 값은 이미 선택된 통화·단위로 변환되어 있음)
  const orderMonthActual = derived?.orderMonthActual ?? null;
  const orderCumActual = derived?.orderStatus?.ordered ?? null;

  // 2. 금월 주요 매출: top-3 projects by current-month actual revenue (groups excluded server-side)
  const topRevenue = (projectsQuery.data?.projects ?? [])
    .filter((p) => !p.isGroup)
    .map((p) => ({ name: p.name, value: month > 0 ? convert(p.revenueActual[month - 1] ?? 0) : 0 }))
    .filter((p) => p.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 3);

  const loading = !derived || projectsQuery.isLoading;
  const error = isError || projectsQuery.isError;

  return (
    <div
      style={{
        backgroundColor: "#fff",
        border: "1px solid #d0dce8",
        borderRadius: "6px",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          backgroundColor: NAVY,
          color: "#fff",
          textAlign: "center",
          fontSize: "12px",
          fontWeight: 700,
          padding: "7px 8px",
        }}
      >
        상세 정보 (드릴다운)
      </div>

      <div style={{ padding: "10px 12px" }}>
        {/* 1. 수주 실적 */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
          <NumBadge n={1} />
          <span style={{ fontSize: "12px", fontWeight: 700, color: NAVY }}>
            수주 실적{month ? ` (${month}월)` : ""}
          </span>
        </div>
        <div
          style={{
            backgroundColor: "#f4f7fb",
            borderRadius: "4px",
            padding: "8px 10px",
            fontSize: "12px",
            color: "#1a2d4d",
            fontWeight: 600,
          }}
        >
          {error ? (
            "오류"
          ) : loading ? (
            "-"
          ) : orderMonthActual != null && orderMonthActual !== 0 ? (
            `당월 수주  ${fmtK(orderMonthActual)}`
          ) : (
            <>
              <div style={{ color: "#6b7c94", fontWeight: 500, marginBottom: "3px" }}>당월 수주 없음</div>
              <div>누적 수주  {orderCumActual != null ? fmtK(orderCumActual) : "-"}</div>
            </>
          )}
        </div>

        <div style={{ borderTop: "1px dotted #a9b8cc", margin: "10px 0" }} />

        {/* 2. 금월 주요 매출 */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
          <NumBadge n={2} />
          <span style={{ fontSize: "12px", fontWeight: 700, color: NAVY }}>금월 주요 매출</span>
        </div>
        <div
          style={{
            backgroundColor: "#f4f7fb",
            borderRadius: "4px",
            padding: "8px 10px",
            display: "flex",
            flexDirection: "column",
            gap: "6px",
          }}
        >
          {error ? (
            <span style={{ fontSize: "12px", color: "#1a2d4d", fontWeight: 600 }}>오류</span>
          ) : loading ? (
            <span style={{ fontSize: "12px", color: "#1a2d4d", fontWeight: 600 }}>-</span>
          ) : topRevenue.length === 0 ? (
            <span style={{ fontSize: "12px", color: "#6b7c94", fontWeight: 500 }}>당월 매출 없음</span>
          ) : (
            topRevenue.map((p) => (
              <div
                key={p.name}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "12px",
                  color: "#1a2d4d",
                  fontWeight: 600,
                }}
              >
                <span
                  style={{
                    width: "4px",
                    height: "4px",
                    borderRadius: "50%",
                    backgroundColor: "#1a2d4d",
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
  );
}
