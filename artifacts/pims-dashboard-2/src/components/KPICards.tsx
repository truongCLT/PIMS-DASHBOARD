import React from "react";
import { TrendingUp, DollarSign, BarChart2, Activity } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useDashboardData } from "../lib/mgmtreportData";
import { useDashboardFilters } from "../lib/dashboardFilters";
import { useTheme } from "../lib/theme";

/* ── Strip-style icons per card position ────────────────────── */
const STRIP_ICONS = [TrendingUp, DollarSign, BarChart2, Activity];

/** raw Korean title (fixed set produced by mgmtreportData.ts) → translation key */
const KPI_TITLE_KEY: Record<string, string> = {
  "당월 매출": "currentMonthRevenue",
  "당월 영업이익": "currentMonthOperatingProfit",
  "연간 누적 매출": "annualCumulativeRevenue",
  "연간 누적 영업이익": "annualCumulativeOperatingProfit",
};

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
  achievementColor = "#35c7c0", compact = false,
  cardIndex = 0, stripColor,
}: KPICardProps) {
  const { theme: T } = useTheme();
  const { t, i18n } = useTranslation(["kpiCards", "common"]);
  const K = T.kpi;
  const isStrip = K.cardStyle === "strip" && !!stripColor;
  const numFont = compact ? "clamp(10px, 0.85vw, 13px)" : "clamp(13px, 1.2vw, 19px)";
  const titleKey = KPI_TITLE_KEY[title];
  const label = titleKey ? t(`kpiCards:${titleKey}`) : title;
  const showAnnualSplit = i18n.language === "ko" && title.startsWith("연간 ");

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
            {showAnnualSplit ? (
              <><span style={{ opacity: 0.7 }}>연간 </span>{label.slice(3)}</>
            ) : label}
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
            gap: "6px",
            marginBottom: "8px",
          }}>
            {/* Plan */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: "clamp(9px, 0.7vw, 11px)", color: K.labelColor, marginBottom: "2px" }}>{t("common:plan")}</div>
              <div style={{ fontSize: numFont, fontWeight: "700", color: K.valueColor, overflowWrap: "anywhere" }}>
                {plan.toLocaleString()}
              </div>
            </div>
            {/* Actual */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: "clamp(9px, 0.7vw, 11px)", color: K.labelColor, marginBottom: "2px" }}>{t("common:actual")}</div>
              <div style={{ fontSize: numFont, fontWeight: "700", color: K.valueColor, overflowWrap: "anywhere" }}>
                {actual.toLocaleString()}
              </div>
            </div>
            {/* Achievement */}
            <div style={{ flex: "0 0 auto", textAlign: "right" }}>
              <div style={{ fontSize: "clamp(9px, 0.7vw, 11px)", color: K.labelColor, marginBottom: "2px" }}>{t("common:achievementRate")}</div>
              <div style={{ fontSize: numFont, fontWeight: "800", color: achievementColor, overflowWrap: "anywhere" }}>
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
        {showAnnualSplit ? (
          <>
            <div>연간</div>
            <div>{label.slice(3)}</div>
          </>
        ) : label}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: "8px" }}>
        {/* Plan */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: "clamp(10px, 0.8vw, 13px)", color: K.labelColor, marginBottom: "4px" }}>{t("common:plan")}</div>
          <div style={{ fontSize: numFont, fontWeight: "700", color: K.valueColor, overflowWrap: "anywhere" }}>
            {plan.toLocaleString()}
          </div>
        </div>
        {/* Actual */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: "clamp(10px, 0.8vw, 13px)", color: K.labelColor, marginBottom: "4px" }}>{t("common:actual")}</div>
          <div style={{ fontSize: numFont, fontWeight: "700", color: K.valueColor, overflowWrap: "anywhere" }}>
            {actual.toLocaleString()}
          </div>
        </div>
        {/* Achievement */}
        <div style={{ flex: "0 0 auto", textAlign: "right" }}>
          <div style={{ fontSize: "clamp(10px, 0.8vw, 13px)", color: K.labelColor, marginBottom: "4px" }}>{t("common:achievementRate")}</div>
          <div style={{
            fontSize: compact ? "clamp(11px, 0.95vw, 15px)" : "clamp(14px, 1.25vw, 20px)",
            fontWeight: "700",
            color: achievementColor,
            overflowWrap: "anywhere",
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
  const { t } = useTranslation("kpiCards");
  const { derived, isError } = useDashboardData();
  const { unitIndex } = useDashboardFilters();
  const { theme: T } = useTheme();

  const isStrip = T.kpi.cardStyle === "strip";
  const stripColors = T.kpi.stripColors ?? ["#2f7cf6", "#e67e22", "#35c7c0", "#1c7a5a"];

  const cards = derived?.kpi ?? PLACEHOLDER_TITLES.map((title) => ({
    title,
    plan: "-" as const,
    actual: "-" as const,
    achievement: isError ? t("errorShort") : "…",
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
