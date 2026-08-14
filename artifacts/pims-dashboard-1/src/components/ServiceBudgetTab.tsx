import React from "react";
import { useTranslation } from "react-i18next";
import { ProjectCommentPanel } from "./ProjectCommentPanel";

import { useProjectDetail, fmtPct, ratioPct } from "../lib/projectDetailData";
import { useMoney } from "../lib/displayUnit";
import { chartTheme } from "../lib/chartTheme";
import { cardStyle } from "../lib/uiTokens";

const LABEL_W = 120; // px — label column width (same for every row)
const TRACK_MAX_PCT = 88; // max track width as % of flex container
const BAR_H = 22;

/** Single horizontal bar row — plan (red) over actual (blue) */
function DualBar({
  label,
  labelBold = false,
  budget,
  plan,
  actual,
  maxBudget,
  fmtMoney,
}: {
  label: string;
  labelBold?: boolean;
  budget: number | null;
  plan: number | null;
  actual: number | null;
  maxBudget: number;
  fmtMoney: (v: number | null) => string;
}) {
  const trackW =
    maxBudget > 0 && budget != null && budget > 0
      ? Math.max((budget / maxBudget) * TRACK_MAX_PCT, 4)
      : TRACK_MAX_PCT * 0.15;

  const planRatio =
    budget != null && budget > 0 && plan != null ? Math.min(plan / budget, 1) : 0;
  const actualRatio =
    budget != null && budget > 0 && actual != null ? Math.min(actual / budget, 1) : 0;

  const planPct = fmtPct(ratioPct(plan, budget));
  const actualPct = fmtPct(ratioPct(actual, budget));

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        minHeight: "60px",
      }}
    >
      {/* Label — fixed width, same for every row */}
      <div
        style={{
          width: `${LABEL_W}px`,
          flexShrink: 0,
          fontSize: "13px",
          color: "#16294a",
          fontWeight: labelBold ? 700 : 400,
          paddingRight: "8px",
        }}
      >
        {label}
      </div>

      {/* Bars */}
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

  // Group by category; preserve insertion order
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

  // 외주 행 — Direct Cost 내 Common 앞에 삽입
  const outsourcingRows = detail?.outsourcing ?? [];
  const outsourcingBudget = outsourcingRows.reduce((a, o) => a + (o.budget ?? 0), 0);
  const outsourcingPlan   = outsourcingRows.reduce((a, o) => a + (o.executedBudget ?? 0), 0);
  const outsourcingActual = outsourcingRows.reduce((a, o) => a + (o.accum ?? 0), 0);
  if (outsourcingRows.length > 0) {
    if (!grouped["Direct Cost"]) {
      grouped["Direct Cost"] = [];
      categories.unshift("Direct Cost");
    }
    const commonIdx = grouped["Direct Cost"].findIndex((r) => r.item === "Common");
    const insertIdx = commonIdx >= 0 ? commonIdx : 0;
    grouped["Direct Cost"].splice(insertIdx, 0, {
      category: "Direct Cost",
      item: t("serviceBudgetTab:outsourcingItem"),
      budget: outsourcingBudget > 0 ? outsourcingBudget : null,
      plan: outsourcingPlan > 0 ? outsourcingPlan : null,
      actual: outsourcingActual > 0 ? outsourcingActual : null,
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      {/* Budget Execution Status */}
      <div style={{ ...cardStyle, padding: "14px 18px 24px" }}>
        <span style={{ fontSize: "13px", fontWeight: 600, color: "#2f7cf6" }}>
          {t("common:budget")} {t("serviceBudgetTab:executionStatusLabel")}
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
          <div style={{ marginTop: "16px", display: "flex", flexDirection: "column" }}>
            {categories.map((cat) => {
              const items = grouped[cat];
              // If category name matches exactly one item name, treat as standalone bold row
              const isStandalone = items.length === 1 && items[0].item === cat;

              return (
                <div key={cat}>
                  {/* Category header — bold label only, no underline */}
                  {cat && !isStandalone && (
                    <div
                      style={{
                        fontSize: "13px",
                        fontWeight: 700,
                        color: "#16294a",
                        padding: "10px 0 2px",
                      }}
                    >
                      {cat}
                    </div>
                  )}

                  {isStandalone ? (
                    /* Standalone (e.g. Contingency): bold header-level label + same top gap as category headers */
                    <div key={`${items[0].item}-0`} style={{ paddingTop: "10px" }}>
                      <DualBar
                        label={items[0].item ?? ""}
                        labelBold
                        budget={items[0].budget ?? null}
                        plan={items[0].plan ?? null}
                        actual={items[0].actual ?? null}
                        maxBudget={maxBudget}
                        fmtMoney={fmtMoney}
                      />
                    </div>
                  ) : (
                    items.map((c, i) => (
                      <DualBar
                        key={`${c.item}-${i}`}
                        label={c.item ?? ""}
                        labelBold={/contingency/i.test(c.item ?? "")}
                        budget={c.budget ?? null}
                        plan={c.plan ?? null}
                        actual={c.actual ?? null}
                        maxBudget={maxBudget}
                        fmtMoney={fmtMoney}
                      />
                    ))
                  )}
                </div>
              );
            })}

            {/* Total row — same alignment as every other DualBar */}
            <div style={{ paddingTop: "10px" }}>
              <DualBar
                label={t("common:total")}
                labelBold
                budget={totalBudget}
                plan={totalPlan}
                actual={totalActual}
                maxBudget={maxBudget}
                fmtMoney={fmtMoney}
              />
            </div>

            {/* Legend */}
            <div style={{ display: "flex", gap: "16px", justifyContent: "flex-end", marginTop: "4px" }}>
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
