import React from "react";
import { chartTheme } from "../lib/chartTheme";

/* ---------- small SVG donut ---------- */
export function Donut({
  percent,
  size = 110,
  stroke = 14,
  color = chartTheme.planBlue,
  track = chartTheme.trackGray,
  label,
  labelSize = 20,
  extraArc,
}: {
  percent: number;
  size?: number;
  stroke?: number;
  color?: string;
  track?: string;
  label?: string;
  labelSize?: number;
  extraArc?: { percent: number; color: string };
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const arc = (p: number) => (Math.min(Math.max(p, 0), 100) / 100) * c;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
      {extraArc && (
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={extraArc.color}
          strokeWidth={stroke}
          strokeDasharray={`${arc(extraArc.percent)} ${c}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      )}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeDasharray={`${arc(percent)} ${c}`}
        strokeLinecap="butt"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      {label && (
        <text
          x={size / 2}
          y={size / 2}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={labelSize}
          fontWeight={700}
          fill={chartTheme.headingNavy}
        >
          {label}
        </text>
      )}
    </svg>
  );
}

/* ---------- simple vertical bar ---------- */
export function MiniBar({
  value,
  max,
  color,
  label,
  height = 90,
  width = 18,
  valueLabel,
  valueOnTop = false,
}: {
  value: number;
  max: number;
  color: string;
  label: string;
  height?: number;
  width?: number;
  valueLabel?: string;
  valueOnTop?: boolean;
}) {
  const h = max > 0 ? Math.max((value / max) * height, 2) : 2;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "3px" }}>
      <div style={{ height: `${height}px`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end" }}>
        {valueOnTop && valueLabel != null && (
          <span style={{ fontSize: "11px", color: "#16294a", fontWeight: 700, whiteSpace: "nowrap", marginBottom: "3px" }}>
            {valueLabel}
          </span>
        )}
        <div style={{ width: `${width}px`, height: `${h}px`, backgroundColor: color, borderRadius: "2px 2px 0 0" }} />
      </div>
      <span style={{ fontSize: "9px", color: "#555", whiteSpace: "nowrap" }}>{label}</span>
      {!valueOnTop && valueLabel != null && <span style={{ fontSize: "9px", color: "#333", fontWeight: 600 }}>{valueLabel}</span>}
    </div>
  );
}
