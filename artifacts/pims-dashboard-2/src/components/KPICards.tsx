import React from "react";
import { useDashboardData } from "../lib/mgmtreportData";
import { useDashboardFilters } from "../lib/dashboardFilters";
import { useTheme } from "../lib/theme";

interface KPICardProps {
  title: string;
  plan: string | number;
  actual: string | number;
  achievement: string;
  achievementColor?: string;
  compact?: boolean;
}

function KPICard({ title, plan, actual, achievement, achievementColor = "#00bcd4", compact = false }: KPICardProps) {
  const { theme: T } = useTheme();
  const K = T.kpi;
  const numFont = compact ? "clamp(11px, 0.95vw, 16px)" : "clamp(18px, 1.7vw, 30px)";
  return (
    <div style={{
      backgroundColor: K.cardBg,
      borderRadius: "8px",
      padding: "12px 16px",
      flex: 1,
      minWidth: 0,
      boxShadow: K.boxShadow,
      border: K.cardBorder,
      borderTop: K.cardBorderTop ?? undefined,
      borderLeft: K.accentBorderLeft ? `4px solid ${K.accentBorderLeft}` : undefined,
    }}>
      <div style={{
        fontSize: "clamp(12px, 0.95vw, 16px)",
        fontWeight: "600",
        color: K.titleColor,
        marginBottom: "10px",
        lineHeight: 1.35,
      }}>
        {title.startsWith("연간 ") ? (
          <>
            <div>연간</div>
            <div>{title.slice(3)}</div>
          </>
        ) : title}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        {/* Plan */}
        <div>
          <div style={{ fontSize: "clamp(10px, 0.8vw, 13px)", color: K.labelColor, marginBottom: "4px" }}>계획</div>
          <div style={{ fontSize: numFont, fontWeight: "700", color: K.valueColor }}>
            {plan.toLocaleString()}
          </div>
        </div>
        {/* Actual */}
        <div>
          <div style={{ fontSize: "clamp(10px, 0.8vw, 13px)", color: K.labelColor, marginBottom: "4px" }}>실적</div>
          <div style={{ fontSize: numFont, fontWeight: "700", color: K.valueColor }}>
            {actual.toLocaleString()}
          </div>
        </div>
        {/* Achievement */}
        <div>
          <div style={{ fontSize: "clamp(10px, 0.8vw, 13px)", color: K.labelColor, marginBottom: "4px" }}>달성률</div>
          <div style={{ fontSize: compact ? "clamp(12px, 1.05vw, 18px)" : "clamp(18px, 1.7vw, 30px)", fontWeight: "700", color: achievementColor }}>
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
  const { unitIndex } = useDashboardFilters();

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
          compact={unitIndex === 1}
        />
      ))}
    </div>
  );
}
