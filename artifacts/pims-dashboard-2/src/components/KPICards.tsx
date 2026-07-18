import React from "react";
import { useDashboardData } from "../lib/mgmtreportData";

interface KPICardProps {
  title: string;
  plan: string | number;
  actual: string | number;
  achievement: string;
  achievementColor?: string;
}

function KPICard({ title, plan, actual, achievement, achievementColor = "#00bcd4" }: KPICardProps) {
  return (
    <div style={{
      backgroundColor: "#33415f",
      borderRadius: "8px",
      padding: "12px 16px",
      flex: 1,
      minWidth: 0,
      boxShadow: "0 1px 4px rgba(20,35,70,0.15)",
    }}>
      <div style={{
        fontSize: "clamp(12px, 0.95vw, 16px)",
        fontWeight: "600",
        color: "#ffffff",
        marginBottom: "10px",
      }}>
        {title}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        {/* Plan */}
        <div>
          <div style={{ fontSize: "clamp(10px, 0.8vw, 13px)", color: "#9fb0cc", marginBottom: "4px" }}>계획</div>
          <div style={{ fontSize: "clamp(18px, 1.7vw, 30px)", fontWeight: "700", color: "#ffffff" }}>
            {plan.toLocaleString()}
          </div>
        </div>
        {/* Actual */}
        <div>
          <div style={{ fontSize: "clamp(10px, 0.8vw, 13px)", color: "#9fb0cc", marginBottom: "4px" }}>실적</div>
          <div style={{ fontSize: "clamp(18px, 1.7vw, 30px)", fontWeight: "700", color: "#ffffff" }}>
            {actual.toLocaleString()}
          </div>
        </div>
        {/* Achievement */}
        <div>
          <div style={{ fontSize: "clamp(10px, 0.8vw, 13px)", color: "#9fb0cc", marginBottom: "4px" }}>달성률</div>
          <div style={{ fontSize: "clamp(18px, 1.7vw, 30px)", fontWeight: "700", color: achievementColor }}>
            {achievement}
          </div>
        </div>
      </div>
    </div>
  );
}

const PLACEHOLDER_TITLES = ["당월 매출", "당월 영업이익", "연간 누적 매출", "연간 누적 영업이익"];

export function KPICards() {
  const { derived, isError } = useDashboardData();

  const cards = derived?.kpi ?? PLACEHOLDER_TITLES.map((title) => ({
    title,
    plan: "-" as const,
    actual: "-" as const,
    achievement: isError ? "오류" : "…",
    achievementColor: "#9fb0cc",
  }));

  return (
    <div style={{ display: "flex", gap: "8px", flex: 4, minWidth: 0 }}>
      {cards.map((kpi) => (
        <KPICard
          key={kpi.title}
          title={kpi.title}
          plan={kpi.plan}
          actual={kpi.actual}
          achievement={kpi.achievement}
          achievementColor={kpi.achievementColor}
        />
      ))}
    </div>
  );
}
