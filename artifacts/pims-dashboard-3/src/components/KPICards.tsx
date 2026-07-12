import React from "react";

interface KPICardProps {
  title: string;
  plan: string | number;
  actual: string | number;
  achievement: string;
  achievementColor?: string;
  isEmphasized?: boolean;
}

function KPICard({ title, plan, actual, achievement, isEmphasized = false }: KPICardProps) {
  const isPositive = parseFloat(achievement.replace(/[^0-9.-]+/g, "")) >= 100;
  
  return (
    <div style={{
      backgroundColor: isEmphasized ? "var(--color-primary-navy)" : "var(--color-card-bg)",
      borderRadius: "14px",
      padding: "20px 24px",
      flex: 1,
      minWidth: 0,
      boxShadow: "0 2px 12px var(--color-border)",
      display: "flex",
      flexDirection: "column",
      gap: "16px",
    }}>
      <div style={{
        fontSize: "14px",
        fontWeight: "600",
        color: isEmphasized ? "#ffffff" : "var(--color-text-primary)",
      }}>
        {title}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "8px" }}>
        {/* Plan */}
        <div>
          <div style={{ fontSize: "12px", color: isEmphasized ? "rgba(255,255,255,0.7)" : "var(--color-text-secondary)", marginBottom: "4px" }}>계획</div>
          <div style={{ fontSize: "20px", fontWeight: "600", color: isEmphasized ? "rgba(255,255,255,0.9)" : "var(--color-text-primary)", lineHeight: "1" }}>
            {plan.toLocaleString()}
          </div>
        </div>
        {/* Actual */}
        <div>
          <div style={{ fontSize: "12px", color: isEmphasized ? "rgba(255,255,255,0.7)" : "var(--color-text-secondary)", marginBottom: "4px" }}>실적</div>
          <div style={{ fontSize: "36px", fontWeight: "700", color: isEmphasized ? "#ffffff" : "var(--color-text-primary)", lineHeight: "1" }}>
            {actual.toLocaleString()}
          </div>
        </div>
        {/* Achievement */}
        <div>
          <div style={{ fontSize: "12px", color: isEmphasized ? "rgba(255,255,255,0.7)" : "var(--color-text-secondary)", marginBottom: "4px" }}>달성률</div>
          <div style={{ 
            fontSize: "13px", 
            fontWeight: "700", 
            color: isPositive ? "var(--color-success-green)" : "var(--color-accent-coral)",
            backgroundColor: isPositive ? "rgba(76, 175, 130, 0.12)" : "rgba(240, 135, 107, 0.12)",
            padding: "4px 10px",
            borderRadius: "20px",
            display: "inline-block",
            lineHeight: "1"
          }}>
            {achievement}
          </div>
        </div>
      </div>
    </div>
  );
}

export const KPI_DATA = [
  { title: "당월 매출", plan: 1297, actual: 2360, achievement: "313%" },
  { title: "당월 영업이익", plan: 395, actual: 127, achievement: "31%" },
  { title: "누적 매출", plan: 1297, actual: 2360, achievement: "182%" },
  { title: "누적 영업이익", plan: 1297, actual: 2360, achievement: "182%" },
];

export function KPICards() {
  return (
    <div style={{ display: "flex", gap: "12px" }}>
      {KPI_DATA.map((kpi, index) => (
        <KPICard
          key={kpi.title}
          title={kpi.title}
          plan={kpi.plan}
          actual={kpi.actual}
          achievement={kpi.achievement}
          isEmphasized={index === 0}
        />
      ))}
    </div>
  );
}
