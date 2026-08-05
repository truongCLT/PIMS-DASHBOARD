import React, { useState } from "react";
import { ProjectCommentPanel } from "./ProjectCommentPanel";

import { useProjectDetail, fmtPct, ratioPct } from "../lib/projectDetailData";
import { useMoney } from "../lib/displayUnit";
import { chartTheme } from "../lib/chartTheme";

const cardStyle: React.CSSProperties = {
  backgroundColor: "#fff",
  border: "1px solid #e2e9f3",
  borderRadius: "8px",
  padding: "10px 12px",
};

function HBar({
  label,
  totalWidth,
  execRatio,
  execLabel,
  pctLabel,
  totalLabel,
  execColor,
  tone = "plan",
  trackColor = "#d5d7e2",
  height = 46,
  sub = false,
}: {
  label: string;
  totalWidth: number; // % of container
  execRatio: number; // 0~1 of total bar
  execLabel?: string;
  pctLabel?: string;
  totalLabel?: string;
  execColor?: string;
  tone?: "plan" | "warn";
  trackColor?: string;
  height?: number;
  sub?: boolean;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", marginBottom: sub ? "10px" : "0" }}>
      <div
        style={{
          width: sub ? "160px" : "130px",
          paddingLeft: sub ? "60px" : "0",
          fontSize: "13px",
          color: "#333",
          fontWeight: 600,
          flexShrink: 0,
        }}
      >
        {label}
      </div>
      <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "8px" }}>
        <div style={{ width: `${totalWidth}%`, height: `${height}px`, backgroundColor: trackColor, display: "flex" }}>
          {execRatio > 0 && execColor && (
            <div
              style={{
                width: `${Math.min(execRatio, 1) * 100}%`,
                height: "100%",
                backgroundColor: execColor,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
              }}
            >
              {execLabel && (
                <span style={{ fontSize: "12px", color: "#fff", fontWeight: 700 }}>{execLabel}</span>
              )}
              {pctLabel && (
                <span
                  style={{
                    position: "absolute",
                    left: "100%",
                    marginLeft: "8px",
                    fontSize: "12px",
                    color: tone === "warn" ? chartTheme.sgaOrange : chartTheme.planBlue,
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                  }}
                >
                  {pctLabel}
                </span>
              )}
            </div>
          )}
        </div>
        {totalLabel && <span style={{ fontSize: "12px", color: "#333", whiteSpace: "nowrap" }}>{totalLabel}</span>}
      </div>
    </div>
  );
}

export function ServiceBudgetTab({ projectName }: { projectName: string }) {
  const { detail, isLoading } = useProjectDetail(projectName);
  const { fmtMoney, unitLabel } = useMoney();

  const rows = (detail?.costBudget ?? []).filter((c) => c.budget != null || c.actual != null);
  const totalBudget = rows.some((c) => c.budget != null) ? rows.reduce((a, c) => a + (c.budget ?? 0), 0) : null;
  const totalActual = rows.some((c) => c.actual != null) ? rows.reduce((a, c) => a + (c.actual ?? 0), 0) : null;
  const maxBudget = Math.max(rows.reduce((a, c) => Math.max(a, c.budget ?? 0), 0), totalBudget ?? 0);

  const widthPct = (v: number | null | undefined) =>
    maxBudget > 0 && v != null ? Math.max((v / maxBudget) * 82, 3) : 3;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      {/* Budget Execution Status */}
      <div style={{ ...cardStyle, padding: "14px 18px 24px" }}>
        <span style={{ fontSize: "13px", fontWeight: 600, color: "#2f7cf6" }}>
          예산 <u>집행 현황</u>
          <span style={{ marginLeft: "8px", fontSize: "12px", fontWeight: 500, color: "#7c8ba3" }}>단위: {unitLabel}</span>
        </span>

        {isLoading ? (
          <div style={{ padding: "50px 20px", textAlign: "center", fontSize: "14px", color: "#7c8ba3" }}>불러오는 중…</div>
        ) : rows.length === 0 ? (
          <div style={{ padding: "50px 20px", textAlign: "center", fontSize: "14px", color: "#7c8ba3" }}>
            예산 집행 데이터가 없습니다. "데이터 입력" 탭에서 예산 집행 현황을 입력해 주세요.
          </div>
        ) : (
          <div style={{ marginTop: "18px", display: "flex", flexDirection: "column", gap: "26px" }}>
            {rows.map((c, i) => {
              const ratio = c.budget != null && c.budget > 0 && c.actual != null ? c.actual / c.budget : 0;
              return (
                <HBar
                  key={`${c.item}-${i}`}
                  label={c.category ? `${c.category} · ${c.item}` : c.item}
                  totalWidth={widthPct(c.budget)}
                  execRatio={ratio}
                  execLabel={c.actual != null ? fmtMoney(c.actual) : undefined}
                  pctLabel={fmtPct(ratioPct(c.actual, c.budget)) === "-" ? undefined : fmtPct(ratioPct(c.actual, c.budget))}
                  totalLabel={fmtMoney(c.budget)}
                  execColor={chartTheme.planBlue}
                />
              );
            })}
            <HBar
              label="합계"
              totalWidth={widthPct(totalBudget)}
              execRatio={totalBudget != null && totalBudget > 0 && totalActual != null ? totalActual / totalBudget : 0}
              execLabel={totalActual != null ? fmtMoney(totalActual) : undefined}
              pctLabel={fmtPct(ratioPct(totalActual, totalBudget)) === "-" ? undefined : fmtPct(ratioPct(totalActual, totalBudget))}
              totalLabel={fmtMoney(totalBudget)}
              execColor={chartTheme.planBlue}
            />
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
