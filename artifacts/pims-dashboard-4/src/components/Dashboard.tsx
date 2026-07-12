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
      backgroundColor: "var(--color-bg-main)",
      display: "flex",
      flexDirection: "column",
    }}>
      <div style={{ padding: "10px 10px 0", position: "relative", zIndex: 100 }}>
        <DashboardHeader />
      </div>

      {/* Capture area: everything below the filter box */}
      <div id="dashboard-capture" style={{ backgroundColor: "var(--color-bg-main)" }}>
        {/* KPI Cards */}
        <div style={{ padding: "10px 10px 5px" }}>
          <KPICards />
        </div>

        {/* Row 2: 3 widgets */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 220px",
          gap: "10px",
          padding: "5px 10px",
        }}>
          <SalesChart />
          <ProfitChart />
          <OrderStatus />
        </div>

        {/* Row 3: 3 widgets */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 220px",
          gap: "10px",
          padding: "5px 10px 12px",
        }}>
          <CashFlowChart />
          <PerformanceTable />
          <CommentPanel />
        </div>
      </div>
    </div>
  );
}
