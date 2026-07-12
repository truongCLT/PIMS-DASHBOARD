import React from "react";

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
      backgroundColor: "#ffffff",
      border: "1px solid #d0dce8",
      borderRadius: "6px",
      padding: "10px 14px",
      flex: 1,
      minWidth: 0,
    }}>
      <div style={{
        fontSize: "12px",
        fontWeight: "600",
        color: "#1a3a5c",
        marginBottom: "8px",
        borderBottom: "1px solid #e8f0f8",
        paddingBottom: "6px",
      }}>
        {title}
      </div>
      <div style={{ display: "flex", gap: "20px", alignItems: "flex-end" }}>
        {/* Plan */}
        <div>
          <div style={{ fontSize: "10px", color: "#888", marginBottom: "3px" }}>계획</div>
          <div style={{ fontSize: "18px", fontWeight: "700", color: "#1a3a5c" }}>
            {plan.toLocaleString()}
          </div>
        </div>
        {/* Actual */}
        <div>
          <div style={{ fontSize: "10px", color: "#888", marginBottom: "3px" }}>실적</div>
          <div style={{ fontSize: "18px", fontWeight: "700", color: "#1a3a5c" }}>
            {actual.toLocaleString()}
          </div>
        </div>
        {/* Achievement */}
        <div>
          <div style={{ fontSize: "10px", color: "#888", marginBottom: "3px" }}>달성률</div>
          <div style={{ fontSize: "18px", fontWeight: "700", color: achievementColor }}>
            {achievement}
          </div>
        </div>
      </div>
    </div>
  );
}

export function KPICards() {
  return (
    <div style={{ display: "flex", gap: "8px" }}>
      <KPICard
        title="당월 매출"
        plan={1297}
        actual={2360}
        achievement="313%"
        achievementColor="#00bcd4"
      />
      <KPICard
        title="당월 영업이익"
        plan={395}
        actual={127}
        achievement="31%"
        achievementColor="#ff5722"
      />
      <KPICard
        title="누적 매출"
        plan={1297}
        actual={2360}
        achievement="182%"
        achievementColor="#00bcd4"
      />
      <KPICard
        title="누적 영업이익"
        plan={1297}
        actual={2360}
        achievement="182%"
        achievementColor="#00bcd4"
      />
    </div>
  );
}
