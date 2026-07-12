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
      backgroundColor: "var(--color-background)",
      display: "flex",
      flexDirection: "column",
    }}>
      <div style={{ padding: "12px 12px 0", position: "relative", zIndex: 100 }}>
        <DashboardHeader />
      </div>

      {/* Capture area: everything below the filter box */}
      <div id="dashboard-capture" style={{ backgroundColor: "var(--color-background)" }}>
        {/* KPI Cards */}
        <div style={{ padding: "12px" }}>
          <KPICards />
        </div>

        {/* Row 2: 3 widgets */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 280px",
          gap: "12px",
          padding: "0 12px 12px",
        }}>
          <SalesChart />
          <ProfitChart />
          <OrderStatus />
        </div>

        {/* Row 3: 3 widgets */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 280px",
          gap: "12px",
          padding: "0 12px 12px",
        }}>
          <CashFlowChart />
          <PerformanceTable />
          <CommentPanel />
        </div>
      </div>
    </div>
  );
}
