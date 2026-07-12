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
      <div style={{ padding: "10px 10px 0" }}>
        <DashboardHeader />
      </div>

      {/* Capture area: everything below the filter box */}
      <div id="dashboard-capture" style={{ backgroundColor: "#e8edf3" }}>
        {/* KPI Cards */}
        <div style={{ padding: "8px 10px 4px" }}>
          <KPICards />
        </div>

        {/* Row 2: 3 widgets */}
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

        {/* Row 3: 3 widgets */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 220px",
          gap: "6px",
          padding: "4px 10px 10px",
        }}>
          <CashFlowChart />
          <PerformanceTable />
          <CommentPanel />
        </div>
      </div>
    </div>
  );
}
