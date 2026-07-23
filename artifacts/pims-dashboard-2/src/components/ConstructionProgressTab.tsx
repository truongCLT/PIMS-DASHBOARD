import React from "react";
import { ProjectCommentPanel } from "./ProjectCommentPanel";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

import projectPhoto from "../assets/project-photo.png";
import {
  useProjectDetail,
  fmtPct,
  ymToIndex,
  indexToYmLabel,
  type ProjectDetail,
} from "../lib/projectDetailData";
import { chartTheme } from "../lib/chartTheme";

const cardStyle: React.CSSProperties = {
  backgroundColor: "#fff",
  border: "1px solid #d0dce8",
  borderRadius: "6px",
  padding: "10px 12px",
};

const sectionTitle: React.CSSProperties = {
  fontSize: "11px",
  fontWeight: 600,
  color: "#4472c4",
};

const emptyStyle: React.CSSProperties = {
  padding: "24px 0",
  textAlign: "center",
  fontSize: "11px",
  color: "#8a97a8",
};

function Donut({
  percent,
  size = 130,
  stroke = 16,
  color = chartTheme.outflowRed,
  track = chartTheme.trackGray,
  extraArc,
  label,
  labelSize = 22,
}: {
  percent: number;
  size?: number;
  stroke?: number;
  color?: string;
  track?: string;
  extraArc?: { percent: number; color: string };
  label?: string;
  labelSize?: number;
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
          fill="#1a2d4d"
        >
          {label}
        </text>
      )}
    </svg>
  );
}

const MONTH_ABBR = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** YYYY-MM 또는 YYYY-MM-DD → 표시용 문자열 (원본 그대로, 단 null이면 "-") */
function fmtDate(d: string | null | undefined): string {
  if (!d) return "-";
  return d.slice(0, 10);
}

/** 시작~종료 날짜 범위 문자열 */
function dateRange(s: string | null | undefined, e: string | null | undefined): string {
  const sf = fmtDate(s);
  const ef = fmtDate(e);
  if (sf === "-" && ef === "-") return "";
  if (sf === ef || ef === "-") return sf;
  if (sf === "-") return ef;
  return `${sf} ~ ${ef}`;
}

function MilestoneChart({ milestones }: { milestones: ProjectDetail["milestones"] }) {
  // 축 범위 계산 (계획/실적 시작~종료 월 전체)
  const idxs: number[] = [];
  for (const m of milestones) {
    for (const ym of [m.planStart, m.planEnd, m.actualStart, m.actualEnd]) {
      const i = ymToIndex(ym ?? null);
      if (i != null) idxs.push(i);
    }
  }
  const hasBars = idxs.length > 0;
  const minIdx = hasBars ? Math.min(...idxs) : 0;
  const maxIdx = hasBars ? Math.max(...idxs) : 0;
  const total = hasBars ? maxIdx - minIdx + 1 : 1;
  const months = hasBars
    ? Array.from({ length: total }, (_, i) => indexToYmLabel(minIdx + i))
    : [];
  const now = new Date();
  const todayIdx = now.getFullYear() * 12 + now.getMonth();
  const todayPos = hasBars && todayIdx >= minIdx && todayIdx <= maxIdx + 1 ? (todayIdx - minIdx + 0.5) / total : null;

  const AXIS_LEFT = 150;
  const ROW_H = 36; // 높이 늘려서 날짜 라벨 공간 확보

  const barPos = (start: string | null | undefined, end: string | null | undefined) => {
    const s = ymToIndex(start ?? null);
    const e = ymToIndex(end ?? null);
    if (s == null && e == null) return null;
    const s2 = s ?? e!;
    const e2 = e ?? s!;
    const left = ((s2 - minIdx) / total) * 100;
    const width = Math.max(((e2 - s2 + 1) / total) * 100, 100 / total / 2);
    return { left, width };
  };

  // 각 마일스톤 planStart 위치에 수직 구분선
  const vertLines: number[] = [];
  for (const m of milestones) {
    const idx = ymToIndex(m.planStart ?? null);
    if (idx != null) {
      const pct = ((idx - minIdx) / total) * 100;
      if (!vertLines.includes(pct)) vertLines.push(pct);
    }
  }

  return (
    <div style={cardStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <span style={{ ...sectionTitle }}>Mile Stone</span>
        <div style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "9px", color: "#333" }}>
          <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ width: "26px", height: "5px", backgroundColor: chartTheme.outflowRed, display: "inline-block" }} />
            <u>Plan</u>
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ width: "26px", height: "5px", backgroundColor: chartTheme.planBlue, display: "inline-block" }} />
            Actual
          </span>
        </div>
      </div>
      {milestones.length === 0 ? (
        <div style={emptyStyle}>마일스톤 데이터가 없습니다. ( - )</div>
      ) : (
        <div style={{ position: "relative", marginTop: "8px" }}>
          {/* 오늘 날짜 기준선 */}
          {todayPos != null && (
            <div
              style={{
                position: "absolute",
                top: 0,
                bottom: "18px",
                left: `calc(${AXIS_LEFT}px + (100% - ${AXIS_LEFT}px) * ${todayPos})`,
                borderLeft: "2px dashed #f0b429",
                zIndex: 2,
              }}
            />
          )}
          {/* 마일스톤 planStart 위치 수직 구분선 */}
          {hasBars && vertLines.map((pct, vi) => (
            <div
              key={vi}
              style={{
                position: "absolute",
                top: 0,
                bottom: "18px",
                left: `calc(${AXIS_LEFT}px + (100% - ${AXIS_LEFT}px) * ${pct / 100})`,
                borderLeft: "1px solid #dde6f0",
                zIndex: 1,
                pointerEvents: "none",
              }}
            />
          ))}
          {milestones.map((m, mi) => {
            const plan = barPos(m.planStart, m.planEnd);
            const actual = barPos(m.actualStart, m.actualEnd);
            const planLabel = dateRange(m.planStart, m.planEnd);
            const actualLabel = dateRange(m.actualStart, m.actualEnd);
            return (
              <div
                key={`${m.label}-${mi}`}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  height: `${ROW_H}px`,
                  borderBottom: "1px solid #eef1f5",
                }}
              >
                <div
                  style={{
                    width: `${AXIS_LEFT}px`,
                    minWidth: `${AXIS_LEFT}px`,
                    fontSize: "9px",
                    fontWeight: 600,
                    color: "#333",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    paddingRight: "8px",
                    paddingTop: "6px",
                  }}
                >
                  {m.label}
                </div>
                <div style={{ flex: 1, position: "relative", height: "100%" }}>
                  {/* Plan bar */}
                  {plan && (
                    <div
                      style={{
                        position: "absolute",
                        top: "5px",
                        left: `${plan.left}%`,
                        width: `${plan.width}%`,
                        height: "6px",
                        backgroundColor: chartTheme.outflowRed,
                        borderRadius: "2px",
                      }}
                    />
                  )}
                  {/* Plan date label */}
                  {planLabel && (
                    <div
                      style={{
                        position: "absolute",
                        top: "13px",
                        left: plan ? `${plan.left}%` : "0%",
                        fontSize: "7px",
                        color: chartTheme.outflowRed,
                        whiteSpace: "nowrap",
                        lineHeight: 1,
                      }}
                    >
                      {planLabel}
                    </div>
                  )}
                  {/* Actual bar */}
                  {actual && (
                    <div
                      style={{
                        position: "absolute",
                        top: "22px",
                        left: `${actual.left}%`,
                        width: `${actual.width}%`,
                        height: "6px",
                        backgroundColor: chartTheme.planBlue,
                        borderRadius: "2px",
                      }}
                    />
                  )}
                  {/* Actual date label */}
                  {actualLabel && (
                    <div
                      style={{
                        position: "absolute",
                        top: "29px",
                        left: actual ? `${actual.left}%` : "0%",
                        fontSize: "7px",
                        color: chartTheme.planBlue,
                        whiteSpace: "nowrap",
                        lineHeight: 1,
                      }}
                    >
                      {actualLabel}
                    </div>
                  )}
                  {!plan && !actual && (
                    <span style={{ position: "absolute", top: "8px", fontSize: "9px", color: "#aab2bc" }}>-</span>
                  )}
                </div>
              </div>
            );
          })}
          {hasBars && (
            <div style={{ display: "flex", marginTop: "4px" }}>
              <div style={{ width: `${AXIS_LEFT}px`, minWidth: `${AXIS_LEFT}px` }} />
              <div style={{ flex: 1, display: "flex" }}>
                {months.map((mo, i) => (
                  <span
                    key={mo}
                    style={{
                      flex: 1,
                      fontSize: "8px",
                      color: "#777",
                      textAlign: "left",
                      visibility: total > 18 && i % 2 === 1 ? "hidden" : "visible",
                    }}
                  >
                    {mo}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function ConstructionProgressTab({ projectName }: { projectName: string }) {
  const { detail, isLoading } = useProjectDetail(projectName);

  const progress = detail?.progress ?? [];
  const milestones = detail?.milestones ?? [];

  const lifecycleData = progress.map((p) => ({
    month: `${p.year}-${MONTH_ABBR[p.month - 1]}`,
    plan: p.planPct,
    actual: p.actualPct,
    planAccum: p.planCumPct,
    actualAccum: p.actualCumPct,
  }));

  // 최신(마지막) 누계 공정률
  const latest = [...progress].reverse().find((p) => p.planCumPct != null || p.actualCumPct != null) ?? null;
  const planCum = latest?.planCumPct ?? null;
  const actualCum = latest?.actualCumPct ?? null;
  const diff = planCum != null && actualCum != null ? actualCum - planCum : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      {/* Row 1: Construction site progress + Progress */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "8px" }}>
        {/* Construction site progress */}
        <div style={{ ...cardStyle, display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
            <span style={{ ...sectionTitle, color: "#1a2d4d" }}>Construction site progress</span>
          </div>
          <div style={{ position: "relative", flex: 1 }}>
            <img
              src={projectPhoto}
              alt={`${projectName} 공사 현장`}
              style={{ width: "100%", height: "100%", minHeight: "230px", objectFit: "cover", borderRadius: "4px", display: "block" }}
            />
          </div>
        </div>

        {/* Progress */}
        <div style={cardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ ...sectionTitle, color: chartTheme.profitGreen }}>Progress</span>
            <span
              style={{
                fontSize: "9px",
                backgroundColor: diff != null && diff < 0 ? "#fdecea" : "#dff2e3",
                color: diff != null && diff < 0 ? chartTheme.outflowRed : chartTheme.profitGreen,
                borderRadius: "3px",
                padding: "2px 6px",
                height: "fit-content",
                fontWeight: 700,
              }}
            >
              (B-A) {diff != null ? `${diff >= 0 ? "+" : ""}${diff.toFixed(1)}%` : "-"}
            </span>
          </div>
          <div style={{ textAlign: "center", fontSize: "10px", color: "#333", marginTop: "4px" }}>
            Planned Progress (A)
          </div>
          <div style={{ display: "flex", justifyContent: "center", margin: "4px 0 2px", position: "relative" }}>
            <Donut
              percent={actualCum ?? 0}
              color={chartTheme.outflowRed}
              extraArc={planCum != null ? { percent: planCum, color: chartTheme.planBlue } : undefined}
              label={fmtPct(actualCum)}
              size={170}
              stroke={20}
              labelSize={28}
            />
            <span style={{ position: "absolute", right: "6px", bottom: "10px", fontSize: "10px", color: chartTheme.planBlue, fontWeight: 700 }}>
              {fmtPct(planCum)}
            </span>
          </div>
          <div style={{ textAlign: "center", fontSize: "10px", color: "#1a2d4d", fontWeight: 600 }}>
            Actual Progress (B)
          </div>
          <div
            style={{
              textAlign: "center",
              fontSize: "11px",
              color: "#333",
              fontWeight: 700,
              marginTop: "8px",
              borderTop: "1px solid #eef1f5",
              paddingTop: "6px",
            }}
          >
            기준월 : {latest ? `${latest.year}년 ${latest.month}월` : "-"}
          </div>
        </div>
      </div>

      {/* Row 2: Project lifecycle progress */}
      <div style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
          <span style={{ ...sectionTitle, color: "#1a2d4d" }}>Project lifecycle progress</span>
        </div>
        {isLoading ? (
          <div style={emptyStyle}>불러오는 중…</div>
        ) : lifecycleData.length === 0 ? (
          <div style={emptyStyle}>월별 공정 데이터가 없습니다. ( - )</div>
        ) : (
          <div style={{ width: "100%", height: "240px" }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={lifecycleData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid stroke={chartTheme.gridLine} vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 9, fill: chartTheme.axisText }} tickLine={false} axisLine={{ stroke: chartTheme.axisLine }} />
                <YAxis
                  yAxisId="left"
                  tick={{ fontSize: 9, fill: chartTheme.axisText }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${v}%`}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fontSize: 9, fill: chartTheme.axisText }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip contentStyle={{ fontSize: "11px" }} formatter={(v) => (v == null ? "-" : `${Number(v).toLocaleString()}%`)} />
                <Legend wrapperStyle={{ fontSize: "12px" }} iconSize={12} />
                <Bar yAxisId="left" dataKey="plan" name="Plan Monthly" fill={chartTheme.planBlue} barSize={12} isAnimationActive={false} />
                <Bar yAxisId="left" dataKey="actual" name="Actual Monthly" fill={chartTheme.lightBlue} barSize={12} isAnimationActive={false} />
                <Line yAxisId="right" dataKey="planAccum" name="Plan Accum" stroke={chartTheme.profitGreen} strokeWidth={2} dot={{ r: 2 }} isAnimationActive={false} connectNulls />
                <Line yAxisId="right" dataKey="actualAccum" name="Actual Accum" stroke={chartTheme.sgaOrange} strokeWidth={2} dot={{ r: 2 }} isAnimationActive={false} connectNulls />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Row 3: Mile Stone */}
      <MilestoneChart milestones={milestones} />

      {/* Row 4: Comment */}
      <div style={cardStyle}>
        <ProjectCommentPanel projectName={projectName} tab="progress" />
      </div>
    </div>
  );
}
