import React from "react";
import { useTranslation } from "react-i18next";
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
import { useTheme } from "../lib/theme";

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
  const { theme: T } = useTheme();
  const { t } = useTranslation(["dashboard", "common"]);
  return (
    <DashboardFilterProvider division={division} statusFilter={statusFilter}>
    <div style={{
      flex: 1,
      overflowY: "auto",
      backgroundColor: T.dashboard.bg,
      display: "flex",
      flexDirection: "column",
    }}>
      <div style={{ padding: "10px 10px 0", position: "relative", zIndex: 100 }}>
        <DashboardHeader onSelectProject={onSelectProject} />
      </div>

      {/* Capture area: everything below the filter box */}
      <div id="dashboard-capture" style={{ backgroundColor: T.dashboard.bg }}>
        {/* KPI Cards */}
        <div data-export-row="kpi" style={{ padding: "8px 10px 4px" }}>
          <KPICards />
        </div>

        {/* Rows 2+3 combined: 매출/손익/수주 차트 + 자금 수지/경영실적/드릴다운, 하나의
            그리드로 묶어 반응형 줄바꿈과 PDF 페이지 분할이 일관되게 동작하도록 함 */}
        {/* 화면에서는 3열 고정(2행 × 3카드), 파일 내보내기 시에만 data-export-cols 로 반응형 전환 */}
        <div data-export-row="charts-cashflow" data-export-cols="repeat(auto-fit, minmax(440px, 1fr))" style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: "6px",
          padding: "4px 10px",
        }}>
          <div data-export-block style={{ minWidth: 0, width: "100%", boxSizing: "border-box" }}><SalesChart /></div>
          <div data-export-block style={{ minWidth: 0, width: "100%", boxSizing: "border-box" }}><ProfitChart /></div>
          <div data-export-block style={{ minWidth: 0, width: "100%", boxSizing: "border-box" }}><OrderStatus /></div>
          <div data-export-block style={{ minWidth: 0, width: "100%", boxSizing: "border-box" }}><CashFlowChart scope={scope} /></div>
          <div data-export-block style={{ minWidth: 0, width: "100%", boxSizing: "border-box" }}><PerformanceTable /></div>
          <div data-export-block style={{ minWidth: 0, width: "100%", boxSizing: "border-box" }}><DrilldownCard /></div>
        </div>

        {/* Row 4: comment cards */}
        <div id="comment-cards-row" data-export-row="comments" data-export-cols="repeat(auto-fit, minmax(280px, 1fr))" style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          gap: "6px",
          padding: "4px 10px 10px",
        }}>
          <CommentPanel title={t("common:actual")} section="analysis" />
          <CommentPanel title={t("common:forecast")} section="outlook" />
        </div>
      </div>
    </div>
    </DashboardFilterProvider>
  );
}
