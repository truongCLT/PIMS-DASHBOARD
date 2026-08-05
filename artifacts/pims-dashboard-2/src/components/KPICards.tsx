import React from "react";
import { TrendingUp, DollarSign, BarChart2, Activity } from "lucide-react";
import { useDashboardData } from "../lib/mgmtreportData";
import { useDashboardFilters } from "../lib/dashboardFilters";
import { useTheme } from "../lib/theme";

/* ── Strip-style icons per card position ────────────────────── */
const STRIP_ICONS = [TrendingUp, DollarSign, BarChart2, Activity];

interface KPICardProps {
  title: string;
  plan: string | number;
  actual: string | number;
  achievement: string;
  achievementColor?: string;
  compact?: boolean;
  /** Strip-style only: card position index (0-3) */
  cardIndex?: number;
  /** Strip-style only: accent colour for this card */
  stripColor?: string;
}

function KPICard({
  title, plan, actual, achievement,
  achievementColor = "#00bcd4", compact = false,
  cardIndex = 0, stripColor,
}: KPICardProps) {
  const { theme: T } = useTheme();
  const K = T.kpi;
  const isStrip = K.cardStyle === "strip" && !!stripColor;
  const numFont = compact ? "clamp(11px, 0.95vw, 16px)" : "clamp(18px, 1.7vw, 30px)";

  /* ── Strip layout ─────────────────────────────────────────── */
  if (isStrip) {
    const Icon = STRIP_ICONS[cardIndex % 4];
    const pct = Math.min(100, Math.max(0, parseFloat(achievement) || 0));
    const over100 = parseFloat(achievement) > 100;

    return (
      <div style={{
        flex: 1, minWidth: 0,
        backgroundColor: K.cardBg,
        border: K.cardBorder,
        borderRadius: "10px",
        overflow: "hidden",
        boxShadow: K.boxShadow,
        display: "flex",
        flexDirection: "column",
      }}>
        {/* Coloured header strip */}
        <div style={{
          backgroundColor: stripColor + "14",
          borderBottom: `1px solid ${stripColor}22`,
          padding: "7px 14px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}>
          <span style={{
            fontSize: "clamp(10px, 0.8vw, 13px)",
            fontWeight: "600",
            color: K.titleColor,
            lineHeight: 1.3,
          }}>
            {title.startsWith("연간 ") ? (
              <><span style={{ opacity: 0.7 }}>연간 </span>{title.slice(3)}</>
            ) : title}
          </span>
          <div style={{
            width: "22px", height: "22px", borderRadius: "6px",
            backgroundColor: stripColor + "20",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}>
            <Icon size={12} color={stripColor} />
          </div>
        </div>

        {/* Numbers */}
        <div style={{ padding: "9px 14px 10px", flex: 1 }}>
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            marginBottom: "8px",
          }}>
            {/* Plan */}
            <div>
              <div style={{ fontSize: "clamp(9px, 0.7vw, 11px)", color: K.labelColor, marginBottom: "2px" }}>계획</div>
              <div style={{ fontSize: numFont, fontWeight: "700", color: K.valueColor }}>
                {plan.toLocaleString()}
              </div>
            </div>
            {/* Actual */}
            <div>
              <div style={{ fontSize: "clamp(9px, 0.7vw, 11px)", color: K.labelColor, marginBottom: "2px" }}>실적</div>
              <div style={{ fontSize: numFont, fontWeight: "700", color: K.valueColor }}>
                {actual.toLocaleString()}
              </div>
            </div>
            {/* Achievement */}
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "clamp(9px, 0.7vw, 11px)", color: K.labelColor, marginBottom: "2px" }}>달성률</div>
              <div style={{ fontSize: numFont, fontWeight: "800", color: achievementColor }}>
                {achievement}
              </div>
            </div>
          </div>

          {/* Mini progress bar */}
          <div style={{ height: "3px", borderRadius: "2px", backgroundColor: stripColor + "20" }}>
            <div style={{
              height: "100%",
              borderRadius: "2px",
              width: `${pct}%`,
              backgroundColor: over100 ? achievementColor : stripColor,
              transition: "width 0.4s ease",
            }} />
          </div>
        </div>
      </div>
    );
  }

  /* ── Solid layout (existing style) ───────────────────────── */
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
          <div style={{
            fontSize: compact ? "clamp(12px, 1.05vw, 18px)" : "clamp(18px, 1.7vw, 30px)",
            fontWeight: "700",
            color: achievementColor,
          }}>
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
  const { theme: T } = useTheme();

  const isStrip = T.kpi.cardStyle === "strip";
  const stripColors = T.kpi.stripColors ?? ["#4472ca", "#e67e22", "#0891b2", "#059669"];

  const cards = derived?.kpi ?? PLACEHOLDER_TITLES.map((title) => ({
    title,
    plan: "-" as const,
    actual: "-" as const,
    achievement: isError ? "오류" : "…",
    achievementColor: "#9fb0cc",
  }));

  return (
    <div style={{ display: "flex", gap: "8px", flex: 4, minWidth: 0 }}>
      {cards.map((kpi, i) => (
        <KPICard
          key={kpi.title}
          title={kpi.title}
          plan={kpi.plan}
          actual={kpi.actual}
          achievement={kpi.achievement}
          achievementColor={kpi.achievementColor}
          compact={unitIndex === 1}
          cardIndex={i}
          stripColor={isStrip ? stripColors[i % 4] : undefined}
        />
      ))}
    </div>
  );
}
