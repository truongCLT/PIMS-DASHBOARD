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
import { DashboardFilterProvider, type DashboardDivision } from "../lib/dashboardFilters";

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
  return (
    <DashboardFilterProvider division={division}>
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

        {/* Row 2: 2 charts + right column (order status + drilldown) */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 220px",
          gap: "6px",
          padding: "4px 10px",
        }}>
          <SalesChart />
          <ProfitChart />
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <OrderStatus />
            <DrilldownCard />
          </div>
        </div>

        {/* Row 3: 2 widgets */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "6px",
          padding: "4px 10px",
        }}>
          <CashFlowChart scope={scope} />
          <PerformanceTable />
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
