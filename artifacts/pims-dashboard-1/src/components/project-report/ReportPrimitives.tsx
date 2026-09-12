/**
 * Low-level visual primitives shared across report sections:
 *   StatusBadge, ProgressBar, DataKV, DenseRow
 *
 * All styling comes from uiTokens and chartTheme — no invented values.
 */
import React from "react";
import { fmtPct, ratioPct } from "../../lib/projectDetailData";
import { chartTheme } from "../../lib/chartTheme";
import {
  INK_NAVY,
  INK_BODY,
  INK_MUTED,
  DIVIDER,
  PROGRESS_TRACK,
  ACHIEVE_GREEN,
  ACHIEVE_RED,
} from "../../lib/uiTokens";

export const DASH = "-";

/** Achievement badge — green ≥ 100 %, red below. */
export function StatusBadge({ value }: { value: number | null }) {
  if (value == null) return <span style={{ color: INK_MUTED, fontSize: "11px" }}>{DASH}</span>;
  const ok = value >= 100;
  return (
    <span
      style={{
        display: "inline-block",
        padding: "1px 6px",
        borderRadius: "10px",
        fontSize: "11px",
        fontWeight: 700,
        backgroundColor: ok ? `${ACHIEVE_GREEN}18` : `${ACHIEVE_RED}18`,
        color: ok ? ACHIEVE_GREEN : ACHIEVE_RED,
        border: `1px solid ${ok ? ACHIEVE_GREEN : ACHIEVE_RED}33`,
        whiteSpace: "nowrap",
      }}
    >
      {fmtPct(value)}
    </span>
  );
}

/**
 * Horizontal progress bar.
 * Renders a plan-position marker (vertical tick) and an actual-fill bar
 * overlaid on a neutral track.
 */
export function ProgressBar({
  plan,
  actual,
  max,
  color = chartTheme.planBlue,
}: {
  plan: number | null;
  actual: number | null;
  max: number;
  color?: string;
}) {
  const safeMax = Math.max(max, 1);
  const planW = plan != null ? Math.min((plan / safeMax) * 100, 100) : 0;
  const actualW = actual != null ? Math.min((actual / safeMax) * 100, 100) : 0;
  return (
    <div
      style={{
        position: "relative",
        height: "8px",
        backgroundColor: PROGRESS_TRACK,
        borderRadius: "4px",
        overflow: "visible",
      }}
    >
      {plan != null && planW > 0 && (
        <div
          style={{
            position: "absolute",
            top: "-2px",
            left: `${planW}%`,
            width: "2px",
            height: "12px",
            backgroundColor: chartTheme.outflowRed,
            borderRadius: "1px",
            zIndex: 2,
          }}
        />
      )}
      {actual != null && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: `${actualW}%`,
            height: "100%",
            backgroundColor: color,
            borderRadius: "4px",
          }}
        />
      )}
    </div>
  );
}

/** Small label + large value pair used in summary footers. */
export function DataKV({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
      <span style={{ fontSize: "10px", color: INK_MUTED }}>{label}</span>
      <span style={{ fontSize: "13px", fontWeight: 700, color: valueColor ?? INK_NAVY }}>
        {value}
      </span>
    </div>
  );
}

/** One label / value row separated by a bottom divider. */
export function DenseRow({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        padding: "2px 0",
        borderBottom: `1px solid ${DIVIDER}`,
      }}
    >
      <span style={{ fontSize: "11px", color: INK_MUTED }}>{label}</span>
      <span style={{ fontSize: "12px", fontWeight: 600, color: valueColor ?? INK_BODY }}>
        {value}
      </span>
    </div>
  );
}

/** Rate between two nullable numbers — thin wrapper exported for section use. */
export { ratioPct };
