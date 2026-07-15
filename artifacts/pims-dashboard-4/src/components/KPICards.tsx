import React from "react";

interface KPICardProps {
  title: string;
  plan: string | number;
  actual: string | number;
  achievement: string;
}

function KPICard({ title, plan, actual, achievement }: KPICardProps) {
  const positive = parseFloat(achievement) >= 100;

  return (
    <div style={{
      backgroundColor: "var(--color-card-bg)",
      borderRadius: "14px",
      padding: "16px 20px",
      flex: 1,
      minWidth: 0,
      boxShadow: "var(--shadow-card)",
    }}>
      <div style={{
        fontSize: "clamp(12px, 0.95vw, 16px)",
        fontWeight: "600",
        color: "var(--color-text-strong)",
        marginBottom: "10px",
      }}>
        {title}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        {/* Plan */}
        <div>
          <div style={{ fontSize: "clamp(10px, 0.8vw, 13px)", color: "var(--color-text-muted)", marginBottom: "4px" }}>계획</div>
          <div style={{ fontSize: "clamp(18px, 1.7vw, 30px)", fontWeight: "700", color: "var(--color-text-strong)" }}>
            {plan.toLocaleString()}
          </div>
        </div>
        {/* Actual */}
        <div>
          <div style={{ fontSize: "clamp(10px, 0.8vw, 13px)", color: "var(--color-text-muted)", marginBottom: "4px" }}>실적</div>
          <div style={{ fontSize: "clamp(18px, 1.7vw, 30px)", fontWeight: "700", color: "var(--color-primary-blue)" }}>
            {actual.toLocaleString()}
          </div>
        </div>
        {/* Achievement */}
        <div>
          <div style={{ fontSize: "clamp(10px, 0.8vw, 13px)", color: "var(--color-text-muted)", marginBottom: "4px" }}>달성률</div>
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "3px",
            fontSize: "clamp(13px, 1.1vw, 18px)",
            fontWeight: "700",
            color: positive ? "var(--color-success)" : "var(--color-danger)",
            backgroundColor: positive ? "var(--color-success-tint)" : "var(--color-danger-tint)",
            borderRadius: "999px",
            padding: "4px 10px",
          }}>
            <span style={{ fontSize: "0.85em" }}>{positive ? "▲" : "▼"}</span>
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
      {KPI_DATA.map((kpi) => (
        <KPICard
          key={kpi.title}
          title={kpi.title}
          plan={kpi.plan}
          actual={kpi.actual}
          achievement={kpi.achievement}
        />
      ))}
    </div>
  );
}
