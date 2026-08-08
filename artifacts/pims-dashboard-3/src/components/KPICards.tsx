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
  /** Gauge-style: period badge text, e.g. "2026.07" or "1~7월" */
  periodLabel?: string;
  /** Gauge-style: unit label, e.g. "천 USD" */
  unitLabel?: string;
}

/** parse "9,898" | 9898 | "-" → number or null */
function toNum(v: string | number): number | null {
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

/* ── Gauge helpers (대우 예시 themes) ────────────────────────── */
function RingGauge({ pct, color, size = 52, subLabel }: { pct: number; color: string; size?: number; subLabel?: string }) {
  const r = (size - 8) / 2;
  const c = 2 * Math.PI * r;
  const filled = Math.min(100, Math.max(0, pct)) / 100;
  return (
    <svg width={size} height={size} style={{ flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e8ecf3" strokeWidth={5} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={5} strokeLinecap="round"
        strokeDasharray={`${c * filled} ${c}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text x="50%" y={subLabel ? "44%" : "50%"} textAnchor="middle" dominantBaseline="central" fontSize={size * 0.23} fontWeight={800} fill={color}>
        {Math.round(pct)}%
      </text>
      {subLabel && (
        <text x="50%" y="62%" textAnchor="middle" dominantBaseline="central" fontSize={size * 0.135} fill={color}>
          {subLabel}
        </text>
      )}
    </svg>
  );
}

function SemiGauge({ pct, color, width = 108, subLabel }: { pct: number; color: string; width?: number; subLabel?: string }) {
  const h = width / 2;
  const sw = Math.max(8, Math.round(width * 0.09));
  const r = h - sw / 2 - 2;
  const cx = width / 2;
  const cy = h;
  const semiLen = Math.PI * r;
  const filled = Math.min(100, Math.max(0, pct)) / 100;
  const d = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`;
  const gradId = React.useId();
  return (
    <svg width={width} height={h + 6} style={{ display: "block", overflow: "visible" }}>
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#1e3a8a" />
          <stop offset="65%" stopColor="#2e5bdb" />
          <stop offset="100%" stopColor={color} />
        </linearGradient>
      </defs>
      <path d={d} fill="none" stroke="#e8ecf3" strokeWidth={sw} strokeLinecap="round" />
      <path
        d={d} fill="none" stroke={`url(#${gradId})`} strokeWidth={sw} strokeLinecap="round"
        strokeDasharray={`${semiLen * filled} ${semiLen}`}
      />
      <text x={cx} y={cy - (subLabel ? width * 0.13 : 4)} textAnchor="middle" fontSize={width * 0.17} fontWeight={800} fill={color}>
        {Math.round(pct)}%
      </text>
      {subLabel && (
        <text x={cx} y={cy - 2} textAnchor="middle" fontSize={width * 0.085} fill="#8a99b5">
          {subLabel}
        </text>
      )}
    </svg>
  );
}

function KPICard({
  title, plan, actual, achievement,
  achievementColor = "#35c7c0", compact = false,
  cardIndex = 0, stripColor, periodLabel, unitLabel,
}: KPICardProps) {
  const { theme: T } = useTheme();
  const { t, i18n } = useTranslation(["kpiCards", "common"]);
  const K = T.kpi;
  const isStrip = K.cardStyle === "strip" && !!stripColor;
  const isGaugeRing = K.cardStyle === "gauge-ring";
  const isGaugeSemi = K.cardStyle === "gauge-semi";
  const numFont = compact ? "clamp(10px, 0.85vw, 13px)" : "clamp(13px, 1.2vw, 19px)";
  const titleKey = KPI_TITLE_KEY[title];
  const label = titleKey ? t(`kpiCards:${titleKey}`) : title;
  const showAnnualSplit = i18n.language === "ko" && title.startsWith("연간 ");

  /* ── Gauge layouts (대우 예시1 · 예시2) ───────────────────── */
  if (isGaugeRing || isGaugeSemi) {
    const pctNum = parseFloat(String(achievement).replace(/[,%\s]/g, ""));
    const hasPct = Number.isFinite(pctNum);
    const over = hasPct && pctNum >= 100;
    const gaugeColor = over ? "#2e9e5b" : "#e05252";
    const planN = toNum(plan);
    const actualN = toNum(actual);
    const diff = planN != null && actualN != null ? actualN - planN : null;
    const diffText = diff != null ? `${diff > 0 ? "+" : diff < 0 ? "-" : ""}${Math.abs(diff).toLocaleString()}` : "-";
    const diffColor = diff != null && diff >= 0 ? "#2e9e5b" : "#e05252";
    const isMonthly = title.startsWith("당월");

    /* 예시1 (첨부 이미지와 동일): 제목+기간 배지 · 링 게이지+값 · 계획 대비/진척 상태 */
    if (isGaugeRing) {
      return (
        <div style={{
          flex: 1, minWidth: 0,
          backgroundColor: K.cardBg,
          border: K.cardBorder,
          borderRadius: "10px",
          boxShadow: K.boxShadow,
          padding: "10px 14px",
          display: "flex", flexDirection: "column", gap: "7px",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "6px" }}>
            <span style={{ fontSize: "clamp(10px, 0.8vw, 13px)", fontWeight: 600, color: K.titleColor, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {label}
            </span>
            {periodLabel && (
              <span style={{
                fontSize: "clamp(8px, 0.65vw, 10px)", fontWeight: 600, color: K.labelColor,
                backgroundColor: "#f1f4f9", borderRadius: "4px", padding: "2px 7px",
                whiteSpace: "nowrap", flexShrink: 0,
              }}>
                {periodLabel}
              </span>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
            {hasPct
              ? <RingGauge pct={pctNum} color={gaugeColor} size={compact ? 72 : 84} subLabel={t("common:achievementRate")} />
              : <div style={{ width: 56, textAlign: "center", fontSize: 12, color: K.labelColor, flexShrink: 0 }}>{achievement}</div>}
            <div style={{ minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: "5px", minWidth: 0 }}>
                <span style={{ fontSize: compact ? "clamp(13px, 1.1vw, 18px)" : "clamp(16px, 1.5vw, 24px)", fontWeight: 800, color: K.valueColor, overflowWrap: "anywhere" }}>
                  {actual.toLocaleString()}
                </span>
                {unitLabel && (
                  <span style={{ fontSize: "clamp(8px, 0.65vw, 10px)", color: K.labelColor, whiteSpace: "nowrap" }}>
                    {unitLabel}
                  </span>
                )}
              </div>
              <div style={{ fontSize: "clamp(9px, 0.7vw, 11px)", color: K.labelColor }}>
                {t("common:plan")} {plan.toLocaleString()}
              </div>
            </div>
          </div>
          <div style={{
            display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px",
            borderTop: "1px solid #eef1f6", paddingTop: "6px",
          }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: "clamp(8px, 0.65vw, 10px)", color: K.labelColor, marginBottom: "2px" }}>{t("common:vsPlan")}</div>
              <div style={{ fontSize: "clamp(10px, 0.8vw, 12px)", fontWeight: 700, color: diff != null ? diffColor : K.labelColor, overflowWrap: "anywhere" }}>
                {diff != null ? diffText : "-"}
              </div>
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: "clamp(8px, 0.65vw, 10px)", color: K.labelColor, marginBottom: "2px" }}>{t("common:progressStatus")}</div>
              {diff != null ? (
                <span style={{
                  display: "inline-block",
                  fontSize: "clamp(9px, 0.72vw, 11px)", fontWeight: 700,
                  color: diffColor, backgroundColor: diffColor + "14",
                  borderRadius: "4px", padding: "2px 8px", whiteSpace: "nowrap",
                }}>
                  {diff >= 0 ? t("common:overPlan") : t("common:underPlan")}
                </span>
              ) : (
                <span style={{ fontSize: "clamp(9px, 0.72vw, 11px)", color: K.labelColor }}>-</span>
              )}
            </div>
          </div>
        </div>
      );
    }

    /* 예시2: semicircular gauge · big value · 계획/계획 대비 footer */
    return (
      <div style={{
        flex: 1, minWidth: 0,
        backgroundColor: K.cardBg,
        border: K.cardBorder,
        borderRadius: "12px",
        boxShadow: K.boxShadow,
        padding: "10px 14px 12px",
        display: "flex", flexDirection: "column",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "6px", marginBottom: "4px" }}>
          <span style={{ fontSize: "clamp(10px, 0.8vw, 13px)", fontWeight: 600, color: K.valueColor, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {label}
          </span>
          <span style={{
            fontSize: "clamp(8px, 0.65vw, 10px)", fontWeight: 600, color: "#2e5bdb",
            backgroundColor: "#e8edf7", borderRadius: "9px", padding: "2px 8px", whiteSpace: "nowrap", flexShrink: 0,
          }}>
            {periodLabel ?? (isMonthly ? t("common:currentMonth", { defaultValue: "당월" }) : t("common:annual", { defaultValue: "연간" }))}
          </span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2px", flex: 1, justifyContent: "center" }}>
          {hasPct
            ? <SemiGauge pct={pctNum} color={gaugeColor} width={compact ? 104 : 124} subLabel={t("common:achievementRate")} />
            : <div style={{ fontSize: 12, color: K.labelColor, padding: "10px 0" }}>{achievement}</div>}
          <div style={{ display: "flex", alignItems: "baseline", gap: "5px", marginTop: "2px" }}>
            <span style={{ fontSize: compact ? "clamp(13px, 1.1vw, 18px)" : "clamp(16px, 1.5vw, 24px)", fontWeight: 800, color: K.valueColor, overflowWrap: "anywhere", textAlign: "center" }}>
              {actual.toLocaleString()}
            </span>
            {unitLabel && (
              <span style={{ fontSize: "clamp(8px, 0.65vw, 10px)", color: K.labelColor, whiteSpace: "nowrap" }}>
                {unitLabel}
              </span>
            )}
          </div>
        </div>
        <div style={{
          display: "grid", gridTemplateColumns: "1fr 1fr",
          backgroundColor: "#f4f7fc", borderRadius: "8px",
          marginTop: "8px", padding: "6px 0",
        }}>
          <div style={{ textAlign: "center", borderRight: "1px solid #e2e8f0" }}>
            <div style={{ fontSize: "clamp(8px, 0.65vw, 10px)", color: K.labelColor }}>{t("common:plan")}</div>
            <div style={{ fontSize: "clamp(10px, 0.85vw, 13px)", fontWeight: 700, color: K.valueColor, overflowWrap: "anywhere" }}>{plan.toLocaleString()}</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "clamp(8px, 0.65vw, 10px)", color: K.labelColor }}>{t("common:vsPlan")}</div>
            <div style={{ fontSize: "clamp(10px, 0.85vw, 13px)", fontWeight: 700, color: diff != null ? diffColor : K.labelColor, overflowWrap: "anywhere" }}>
              {diff != null ? diffText : "-"}
            </div>
          </div>
        </div>
      </div>
    );
  }

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

  const { t: tc } = useTranslation("common");
  const monthlyPeriod = derived ? `${derived.year}.${String(derived.month).padStart(2, "0")}` : undefined;
  const annualPeriod = derived
    ? derived.fromMonth < derived.month
      ? tc("periodRange", { from: derived.fromMonth, to: derived.month })
      : tc("periodSingle", { month: derived.month })
    : undefined;

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
          periodLabel={kpi.title.startsWith("당월") ? monthlyPeriod : annualPeriod}
          unitLabel={derived?.unitLabel}
        />
      ))}
    </div>
  );
}
