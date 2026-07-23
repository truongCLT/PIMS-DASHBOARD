import React from "react";
import { DashboardHeader } from "./DashboardHeader";
import { KPICards } from "./KPICards";
import { SalesChart } from "./SalesChart";
import { ProfitChart } from "./ProfitChart";
import { OrderStatus } from "./OrderStatus";
import { CashFlowChart } from "./CashFlowChart";
import { PerformanceTable } from "./PerformanceTable";
import { CommentPanel } from "./CommentPanel";
import { DrilldownCard } from "./DrilldownCard";
import type { DashboardScope } from "./Sidebar";
import {
  DashboardFilterProvider,
  type DashboardDivision,
  type ProjectStatusFilter,
} from "../lib/dashboardFilters";

export function Dashboard({
  scope = "전체",
  onSelectProject,
}: {
  scope?: DashboardScope;
  onSelectProject?: (name: string) => void;
}) {
  const division: DashboardDivision | null = scope.startsWith("시공")
    ? "시공"
    : scope.startsWith("용역")
      ? "용역"
      : null;
  const statusFilter: ProjectStatusFilter | null = scope.endsWith("-진행중")
    ? "ongoing"
    : scope.endsWith("-종료")
      ? "closed"
      : null;
  return (
    <DashboardFilterProvider division={division} statusFilter={statusFilter}>
    <div style={{
      flex: 1,
      overflowY: "auto",
      backgroundColor: "#e8edf3",
      display: "flex",
      flexDirection: "column",
    }}>
      <div style={{ padding: "10px 10px 0", position: "relative", zIndex: 100 }}>
        <DashboardHeader onSelectProject={onSelectProject} />
      </div>

      {/* Capture area: everything below the filter box */}
      <div id="dashboard-capture" style={{ backgroundColor: "#e8edf3" }}>
        {/* KPI Cards */}
        <div style={{ padding: "8px 10px 4px" }}>
          <KPICards />
        </div>

        {/* Row 2: 매출 차트 — 손익 차트 — 수주 실적 현황(맨 오른쪽 단독) */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 220px",
          gap: "6px",
          padding: "4px 10px",
        }}>
          <SalesChart />
          <ProfitChart />
          <OrderStatus />
        </div>

        {/* Row 3: 자금 수지 — 경영실적 현황 — 상세정보(드릴다운, 단독) */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 220px",
          gap: "6px",
          padding: "4px 10px",
        }}>
          <CashFlowChart scope={scope} />
          <PerformanceTable />
          <DrilldownCard />
        </div>

        {/* Row 4: comment cards */}
        <div id="comment-cards-row" style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "6px",
          padding: "4px 10px 10px",
        }}>
          <CommentPanel title="실적" section="analysis" />
          <CommentPanel title="전망" section="outlook" />
        </div>
      </div>
    </div>
    </DashboardFilterProvider>
  );
}
