import React from "react";
import { DashboardHeader } from "./DashboardHeader";
import { KPICards } from "./KPICards";
import { SalesChart } from "./SalesChart";
import { ProfitChart } from "./ProfitChart";
import { OrderStatus } from "./OrderStatus";
import { CashFlowChart } from "./CashFlowChart";
import { PerformanceTable } from "./PerformanceTable";
import { CommentPanel } from "./CommentPanel";

export function Dashboard() {
  return (
    <div style={{
      flex: 1,
      overflowY: "auto",
      backgroundColor: "#e8edf3",
      display: "flex",
      flexDirection: "column",
    }}>
      <div style={{ padding: "10px 10px 0", position: "relative", zIndex: 100 }}>
        <DashboardHeader />
      </div>

      {/* Capture area: everything below the filter box */}
      <div id="dashboard-capture" style={{ backgroundColor: "#e8edf3" }}>
        {/* KPI Cards */}
        <div style={{ padding: "8px 10px 4px", display: "flex", gap: "8px" }}>
          <KPICards />
          <OrderStatus />
        </div>

        {/* Row 2: 2 widgets */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "6px",
          padding: "4px 10px",
        }}>
          <SalesChart />
          <ProfitChart />
        </div>

        {/* Row 3: 2 widgets */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "6px",
          padding: "4px 10px",
        }}>
          <CashFlowChart />
          <PerformanceTable />
        </div>

        {/* Row 4: comment cards */}
        <div id="comment-cards-row" style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "6px",
          padding: "4px 10px 10px",
        }}>
          <CommentPanel title="실적" />
          <CommentPanel title="전망" />
        </div>
      </div>
    </div>
  );
}
