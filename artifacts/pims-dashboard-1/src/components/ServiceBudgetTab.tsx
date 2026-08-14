import React from "react";
import { useTranslation } from "react-i18next";
import { ProjectCommentPanel } from "./ProjectCommentPanel";

import { useProjectDetail, fmtPct, ratioPct } from "../lib/projectDetailData";
import { useMoney } from "../lib/displayUnit";
import { chartTheme } from "../lib/chartTheme";
import { cardStyle } from "../lib/uiTokens";

/** Single horizontal bar row — plan (red) over actual (blue) */
function DualBar({
  label,
  budget,
  plan,
  actual,
  maxBudget,
  fmtMoney,
  indent = false,
}: {
  label: string;
  budget: number | null;
  plan: number | null;
  actual: number | null;
  maxBudget: number;
  fmtMoney: (v: number | null) => string;
  indent?: boolean;
}) {
  const TRACK_MAX_PCT = 90; // max track width as % of container
  const BAR_H = 22;
  const trackW = maxBudget > 0 && budget != null && budget > 0
    ? Math.max((budget / maxBudget) * TRACK_MAX_PCT, 4)
    : TRACK_MAX_PCT * 0.2;

  const planRatio = budget != null && budget > 0 && plan != null ? Math.min(plan / budget, 1) : 0;
  const actualRatio = budget != null && budget > 0 && actual != null ? Math.min(actual / budget, 1) : 0;

  const planPct = fmtPct(ratioPct(plan, budget));
  const actualPct = fmtPct(ratioPct(actual, budget));

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0",
        minHeight: "58px",
        paddingLeft: indent ? "20px" : "0",
      }}
    >
      {/* Item label */}
      <div
        style={{
          width: "120px",
          flexShrink: 0,
          fontSize: "13px",
          color: "#333",
          fontWeight: 500,
          paddingRight: "8px",
        }}
      >
        {label}
      </div>

      {/* Two bars */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "3px", justifyContent: "center" }}>
        {/* Plan bar (red) */}
        <div style={{ display: "flex", alignItems: "center" }}>
          <div
            style={{
              width: `${trackW}%`,
              height: `${BAR_H}px`,
              backgroundColor: "#e8eaf0",
              position: "relative",
              flexShrink: 0,
            }}
          >
            {planRatio > 0 && (
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  width: `${planRatio * 100}%`,
                  height: "100%",
                  backgroundColor: chartTheme.outflowRed,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {plan != null && (
                  <span style={{ fontSize: "11px", color: "#fff", fontWeight: 700, whiteSpace: "nowrap", paddingInline: "4px" }}>
                    {fmtMoney(plan)}
                  </span>
                )}
              </div>
            )}
          </div>
          {planPct !== "-" && (
            <span style={{ marginLeft: "8px", fontSize: "12px", color: chartTheme.outflowRed, fontWeight: 600, whiteSpace: "nowrap" }}>
              {planPct}
            </span>
          )}
        </div>

        {/* Actual bar (blue) */}
        <div style={{ display: "flex", alignItems: "center" }}>
          <div
            style={{
              width: `${trackW}%`,
              height: `${BAR_H}px`,
              backgroundColor: "#e8eaf0",
              position: "relative",
              flexShrink: 0,
            }}
          >
            {actualRatio > 0 && (
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  width: `${actualRatio * 100}%`,
                  height: "100%",
                  backgroundColor: chartTheme.planBlue,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {actual != null && (
                  <span style={{ fontSize: "11px", color: "#fff", fontWeight: 700, whiteSpace: "nowrap", paddingInline: "4px" }}>
                    {fmtMoney(actual)}
                  </span>
                )}
              </div>
            )}
          </div>
          {actualPct !== "-" && (
            <span style={{ marginLeft: "8px", fontSize: "12px", color: chartTheme.planBlue, fontWeight: 600, whiteSpace: "nowrap" }}>
              {actualPct}
            </span>
          )}
        </div>
      </div>

      {/* Budget (right) */}
      <div style={{ width: "80px", textAlign: "right", fontSize: "12px", color: "#555", flexShrink: 0, paddingLeft: "8px" }}>
        {budget != null ? fmtMoney(budget) : "—"}
      </div>
    </div>
  );
}

export function ServiceBudgetTab({ projectName }: { projectName: string }) {
  const { t } = useTranslation(["serviceBudgetTab", "common"]);
  const { detail, isLoading } = useProjectDetail(projectName);
  const { fmtMoney, unitLabel } = useMoney();

  const rows = (detail?.costBudget ?? []).filter(
    (c) => c.budget != null || c.plan != null || c.actual != null,
  );

  const totalBudget = rows.some((c) => c.budget != null)
    ? rows.reduce((a, c) => a + (c.budget ?? 0), 0)
    : null;
  const totalPlan = rows.some((c) => c.plan != null)
    ? rows.reduce((a, c) => a + (c.plan ?? 0), 0)
    : null;
  const totalActual = rows.some((c) => c.actual != null)
    ? rows.reduce((a, c) => a + (c.actual ?? 0), 0)
    : null;

  const maxBudget = Math.max(
    rows.reduce((a, c) => Math.max(a, c.budget ?? 0), 0),
    totalBudget ?? 0,
    1,
  );

  // Group by category
  const categories: string[] = [];
  const grouped: Record<string, typeof rows> = {};
  for (const r of rows) {
    const cat = r.category ?? "";
    if (!grouped[cat]) {
      grouped[cat] = [];
      categories.push(cat);
    }
    grouped[cat].push(r);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      {/* Budget Execution Status */}
      <div style={{ ...cardStyle, padding: "14px 18px 24px" }}>
        <span style={{ fontSize: "13px", fontWeight: 600, color: "#2f7cf6" }}>
          {t("common:budget")} <u>{t("serviceBudgetTab:executionStatusLabel")}</u>
          <span style={{ marginLeft: "8px", fontSize: "12px", fontWeight: 500, color: "#7c8ba3" }}>
            {t("common:unit")}: {unitLabel}
          </span>
        </span>

        {isLoading ? (
          <div style={{ padding: "50px 20px", textAlign: "center", fontSize: "14px", color: "#7c8ba3" }}>
            {t("common:loading")}
          </div>
        ) : rows.length === 0 ? (
          <div style={{ padding: "50px 20px", textAlign: "center", fontSize: "14px", color: "#7c8ba3" }}>
            {t("serviceBudgetTab:noBudgetDataNotice")}
          </div>
        ) : (
          <div style={{ marginTop: "16px", display: "flex", flexDirection: "column", gap: "0" }}>
            {categories.map((cat) => (
              <div key={cat}>
                {/* Category header */}
                {cat && (
                  <div
                    style={{
                      fontSize: "13px",
                      fontWeight: 700,
                      color: "#16294a",
                      padding: "10px 0 4px",
                      borderBottom: "1px solid #e8eaf0",
                      marginBottom: "2px",
                    }}
                  >
                    {cat}
                  </div>
                )}
                {grouped[cat].map((c, i) => (
                  <DualBar
                    key={`${c.item}-${i}`}
                    label={c.item ?? ""}
                    budget={c.budget ?? null}
                    plan={c.plan ?? null}
                    actual={c.actual ?? null}
                    maxBudget={maxBudget}
                    fmtMoney={fmtMoney}
                    indent={!!cat}
                  />
                ))}
              </div>
            ))}

            {/* Total row */}
            <div style={{ borderTop: "2px solid #c8d0e0", marginTop: "6px", paddingTop: "2px" }}>
              <DualBar
                label={t("common:total")}
                budget={totalBudget}
                plan={totalPlan}
                actual={totalActual}
                maxBudget={maxBudget}
                fmtMoney={fmtMoney}
                indent={false}
              />
            </div>

            {/* Legend */}
            <div style={{ display: "flex", gap: "16px", justifyContent: "flex-end", marginTop: "8px" }}>
              {[
                { label: t("serviceBudgetTab:planLabel"), color: chartTheme.outflowRed },
                { label: t("serviceBudgetTab:actualLabel"), color: chartTheme.planBlue },
              ].map(({ label, color }) => (
                <div key={label} style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                  <div style={{ width: "12px", height: "12px", backgroundColor: color, borderRadius: "2px" }} />
                  <span style={{ fontSize: "12px", color: "#555" }}>{label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Comment */}
      <div style={cardStyle}>
        <ProjectCommentPanel projectName={projectName} tab="budget" />
      </div>
    </div>
  );
}
