import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
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
  LabelList,
} from "recharts";

import projectPhoto from "../assets/project-photo.png";
import { PhotoPager } from "./PhotoPager";
import {
  useProjectDetail,
  fmtPct,
  ymToIndex,
  indexToYmLabel,
  type ProjectDetail,
} from "../lib/projectDetailData";
import { chartTheme } from "../lib/chartTheme";
import { cardStyle, sectionTitle, emptyNote, INK_NAVY, INK_BODY, INK_SECONDARY, INK_MUTED, DIVIDER, MUTED_HINT, STATUS_POS_BG, STATUS_NEG_BG } from "../lib/uiTokens";
import { useMoney } from "../lib/displayUnit";

const emptyStyle = emptyNote;

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
          fill={INK_NAVY}
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

function dateDiffDays(plan: string | null | undefined, actual: string | null | undefined): number | null {
  if (!plan || !actual) return null;
  const planDate = new Date(`${plan.slice(0, 10)}T00:00:00Z`);
  const actualDate = new Date(`${actual.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(planDate.getTime()) || Number.isNaN(actualDate.getTime())) return null;
  return Math.round((actualDate.getTime() - planDate.getTime()) / 86_400_000);
}

function durationRateAtMonthEnd(
  startDate: string | null | undefined,
  endDate: string | null | undefined,
  year: number,
  month: number,
): number | null {
  if (!startDate || !endDate) return null;
  const start = Date.parse(startDate);
  const end = Date.parse(endDate);
  const monthEnd = Date.UTC(year, month, 0);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null;
  const elapsed = Math.min(Math.max(monthEnd - start, 0), end - start);
  return (elapsed / (end - start)) * 100;
}

function milestoneTooltip(m: ProjectDetail["milestones"][number]): string {
  const startDiff = dateDiffDays(m.planStart, m.actualStart);
  const endDiff = dateDiffDays(m.planEnd, m.actualEnd);
  const fmtDiff = (value: number | null) =>
    value == null ? "-" : value === 0 ? "차이 없음" : `${Math.abs(value)}일 ${value > 0 ? "지연" : "단축"}`;
  return [
    m.label,
    `계획: ${dateRange(m.planStart, m.planEnd) || "-"}`,
    `실적: ${dateRange(m.actualStart, m.actualEnd) || "-"}`,
    `착수 차이: ${fmtDiff(startDiff)}`,
    `완료 차이: ${fmtDiff(endDiff)}`,
  ].join("\n");
}

function MilestoneChart({ milestones }: { milestones: ProjectDetail["milestones"] }) {
  const { t } = useTranslation(["constructionProgressTab", "common"]);
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

  return (
    <div style={cardStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <span style={{ ...sectionTitle }}>{t("common:milestone")}</span>
        <div style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "11px", color: INK_BODY }}>
          <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ width: "26px", height: "5px", backgroundColor: chartTheme.outflowRed, display: "inline-block" }} />
            <u>{t("common:plan")}</u>
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ width: "26px", height: "5px", backgroundColor: chartTheme.planBlue, display: "inline-block" }} />
            {t("common:actual")}
          </span>
        </div>
      </div>
      {milestones.length === 0 ? (
        <div style={emptyStyle}>{t("constructionProgressTab:noMilestoneData")}</div>
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
          {milestones.map((m, mi) => {
            const plan = barPos(m.planStart, m.planEnd);
            const actual = barPos(m.actualStart, m.actualEnd);
            const planLabel = dateRange(m.planStart, m.planEnd);
            const actualLabel = dateRange(m.actualStart, m.actualEnd);
            const tooltip = milestoneTooltip(m);
            return (
              <div
                key={`${m.label}-${mi}`}
                title={tooltip}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  height: `${ROW_H}px`,
                  borderBottom: `1px solid ${DIVIDER}`,
                }}
              >
                <div
                  style={{
                    width: `${AXIS_LEFT}px`,
                    minWidth: `${AXIS_LEFT}px`,
                    fontSize: "11px",
                    fontWeight: 600,
                    color: INK_BODY,
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
                      title={tooltip}
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
                      title={tooltip}
                      style={{
                        position: "absolute",
                        top: "13px",
                        left: plan ? `${plan.left}%` : "0%",
                        fontSize: "9px",
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
                        fontSize: "9px",
                        color: chartTheme.planBlue,
                        whiteSpace: "nowrap",
                        lineHeight: 1,
                      }}
                    >
                      {actualLabel}
                    </div>
                  )}
                  {!plan && !actual && (
                    <span style={{ position: "absolute", top: "8px", fontSize: "11px", color: MUTED_HINT }}>-</span>
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
                      fontSize: "10px",
                      color: INK_MUTED,
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

export function ConstructionProgressTab({
  projectName,
  referenceYear,
  referenceMonth,
}: {
  projectName: string;
  referenceYear: number;
  referenceMonth: number;
}) {
  const { t } = useTranslation(["constructionProgressTab", "common"]);
  const { detail, isLoading } = useProjectDetail(projectName);
  const { fmtMoney, unitLabel } = useMoney();
  const [photoIdx, setPhotoIdx] = useState(0);
  useEffect(() => { setPhotoIdx(0); }, [projectName]);

  const progress = detail?.progress ?? [];
  const milestones = detail?.milestones ?? [];

  const referenceIndex = referenceYear * 12 + referenceMonth;
  const progressToReference = progress.filter((p) => p.year * 12 + p.month <= referenceIndex);
  const lifecycleData = progressToReference.map((p) => ({
    month: `${String(p.year).slice(-2)}/${String(p.month).padStart(2, "0")}`,
    plan: p.planPct,
    actual: p.actualPct,
    planAccum: p.planCumPct,
    actualAccum: p.actualCumPct,
  }));

  // 최신(마지막) 누계 공정률
  const latest =
    [...progressToReference]
      .sort((a, b) => b.year * 12 + b.month - (a.year * 12 + a.month))
      .find((p) => p.planCumPct != null || p.actualCumPct != null) ?? null;
  const planCum = latest?.planCumPct ?? null;
  const actualCum = latest?.actualCumPct ?? null;
  const durationRate = durationRateAtMonthEnd(
    detail?.overview?.startDate,
    detail?.overview?.endDate,
    referenceYear,
    referenceMonth,
  );

  // 기준월 당월 공정률
  const referenceProgress = progress.find(
    (p) => p.year === referenceYear && p.month === referenceMonth,
  );
  const planMonth = referenceProgress?.planPct ?? null;
  const actualMonth = referenceProgress?.actualPct ?? null;

  // 연간 공정률 합계 (기준월 연도)
  const annualRows = progressToReference.filter((p) => p.year === referenceYear);
  const planAnnual = annualRows.some((p) => p.planPct != null)
    ? Math.min(annualRows.reduce((s, p) => s + (p.planPct ?? 0), 0), 100)
    : null;
  const actualAnnual = annualRows.some((p) => p.actualPct != null)
    ? Math.min(annualRows.reduce((s, p) => s + (p.actualPct ?? 0), 0), 100)
    : null;

  const referenceCostRows = (detail?.costBudgetMonthly ?? []).filter(
    (row) => row.year === referenceYear && row.month === referenceMonth,
  );
  const costPlanAmount =
    referenceCostRows.some((row) => row.plan != null)
      ? referenceCostRows.reduce((sum, row) => sum + (row.plan ?? 0), 0)
      : null;
  const costActualAmount =
    referenceCostRows.some((row) => row.actual != null)
      ? referenceCostRows.reduce((sum, row) => sum + (row.actual ?? 0), 0)
      : null;
  const monthlyAchievement =
    planMonth != null && planMonth > 0 && actualMonth != null
      ? (actualMonth / planMonth) * 100
      : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      {/* Row 1: Construction site progress + Progress */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
        {/* Construction site progress */}
        <div style={{ ...cardStyle, display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
            <span style={sectionTitle}>{t("constructionProgressTab:siteProgressStatus")}</span>
          </div>
          <div style={{ flex: 1, minHeight: 0 }}>
            {(() => {
              const photos = detail?.photos ?? [];
              const hasPhotos = photos.length > 0;
              const safeIdx = Math.min(photoIdx, Math.max(photos.length - 1, 0));
              const src = hasPhotos ? `/api/storage${photos[safeIdx].objectPath}` : projectPhoto;
              return (
                <PhotoPager
                  src={src}
                  alt={t("constructionProgressTab:sitePhotoAlt", { projectName })}
                  total={hasPhotos ? photos.length : 1}
                  current={hasPhotos ? safeIdx : 0}
                  onChange={setPhotoIdx}
                  imgStyle={{ minHeight: "230px" }}
                  autoPlayIntervalSeconds={detail?.overview?.slideshowIntervalSeconds || 5}
                  loop
                />
              );
            })()}
          </div>
        </div>

        {/* Progress */}
        <div style={{ ...cardStyle, display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={sectionTitle}>{t("common:process")}</span>
            <span
              style={{
                fontSize: "11px",
                backgroundColor: STATUS_POS_BG,
                color: chartTheme.planBlue,
                borderRadius: "3px",
                padding: "2px 6px",
                height: "fit-content",
                fontWeight: 700,
              }}
            >
              공기율 {durationRate != null ? fmtPct(durationRate) : "-"}
            </span>
          </div>
          {/* 3-column: 월(막대) / 연(도넛) / 누계(도넛) */}
          <div style={{ display: "flex", flex: 1, gap: "0", marginTop: "8px", alignItems: "stretch" }}>

            {/* 월 막대 */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
              <div style={{ width: "120px", height: "140px" }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={[{ plan: planMonth ?? 0, actual: actualMonth ?? 0 }]}
                    margin={{ top: 24, right: 10, left: 10, bottom: 0 }}
                  >
                    <YAxis hide domain={[0, 100]} />
                    <Bar dataKey="plan" name={t("common:plan")} fill={chartTheme.planBlue} barSize={24} isAnimationActive={false}>
                      <LabelList
                        dataKey="plan"
                        position="top"
                        style={{ fontSize: "11px", fill: chartTheme.planBlue, fontWeight: 600 }}
                        formatter={(v: number) => planMonth != null ? `${v.toFixed(1)}%` : "-"}
                      />
                    </Bar>
                    <Bar dataKey="actual" name={t("common:actual")} fill={chartTheme.outflowRed} barSize={24} isAnimationActive={false}>
                      <LabelList
                        dataKey="actual"
                        position="top"
                        style={{ fontSize: "11px", fill: chartTheme.outflowRed, fontWeight: 600 }}
                        formatter={(v: number) => actualMonth != null ? `${v.toFixed(1)}%` : "-"}
                      />
                    </Bar>
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              <span style={{ fontSize: "13px", color: INK_SECONDARY, fontWeight: 700, marginTop: "4px" }}>
                {t("common:monthly").replace("별", "")}
              </span>
              <div style={{ fontSize: "11px", color: INK_SECONDARY, marginTop: "5px", textAlign: "center", lineHeight: 1.6 }}>
                <div>
                  <span style={{ color: chartTheme.planBlue, fontWeight: 700 }}>계획</span>{" "}
                  {fmtMoney(costPlanAmount)} {unitLabel}
                </div>
                <div>
                  <span style={{ color: chartTheme.outflowRed, fontWeight: 700 }}>실적</span>{" "}
                  {fmtMoney(costActualAmount)} {unitLabel}
                </div>
                <div style={{ fontWeight: 700, color: INK_NAVY }}>
                  달성률 {monthlyAchievement != null ? fmtPct(monthlyAchievement) : "-"}
                </div>
              </div>
            </div>

            <div style={{ width: "1px", backgroundColor: DIVIDER, alignSelf: "stretch", margin: "0 6px" }} />

            {/* 연 도넛 */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
              <Donut
                percent={actualAnnual ?? 0}
                color={chartTheme.outflowRed}
                extraArc={planAnnual != null ? { percent: planAnnual, color: chartTheme.planBlue } : undefined}
                label={actualAnnual != null ? fmtPct(actualAnnual) : "-"}
                size={120}
                stroke={15}
                labelSize={18}
              />
              <div style={{ display: "flex", gap: "6px", fontSize: "11px", marginTop: "6px" }}>
                <span style={{ color: chartTheme.planBlue, fontWeight: 600 }}>{t("common:plan")} {planAnnual != null ? fmtPct(planAnnual) : "-"}</span>
                <span style={{ color: chartTheme.outflowRed, fontWeight: 600 }}>{t("common:actual")} {actualAnnual != null ? fmtPct(actualAnnual) : "-"}</span>
              </div>
              <span style={{ fontSize: "13px", color: INK_SECONDARY, fontWeight: 700, marginTop: "4px" }}>연</span>
            </div>

            <div style={{ width: "1px", backgroundColor: DIVIDER, alignSelf: "stretch", margin: "0 6px" }} />

            {/* 누계 도넛 */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
              <Donut
                percent={actualCum ?? 0}
                color={chartTheme.outflowRed}
                extraArc={planCum != null ? { percent: planCum, color: chartTheme.planBlue } : undefined}
                label={actualCum != null ? fmtPct(actualCum) : "-"}
                size={120}
                stroke={15}
                labelSize={18}
              />
              <div style={{ display: "flex", gap: "6px", fontSize: "11px", marginTop: "6px" }}>
                <span style={{ color: chartTheme.planBlue, fontWeight: 600 }}>{t("common:plan")} {fmtPct(planCum)}</span>
                <span style={{ color: chartTheme.outflowRed, fontWeight: 600 }}>{t("common:actual")} {fmtPct(actualCum)}</span>
              </div>
              <span style={{ fontSize: "13px", color: INK_SECONDARY, fontWeight: 700, marginTop: "4px" }}>{t("common:cumulative")}</span>
            </div>
          </div>

          <div
            style={{
              textAlign: "center",
              fontSize: "12px",
              color: INK_BODY,
              fontWeight: 700,
              marginTop: "8px",
              borderTop: `1px solid ${DIVIDER}`,
              paddingTop: "6px",
            }}
          >
            {t("common:baseMonth")} : {latest ? t("constructionProgressTab:yearMonth", { year: latest.year, month: latest.month }) : "-"}
          </div>
        </div>
      </div>

      {/* Row 2: Project lifecycle progress */}
      <div style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
          <span style={sectionTitle}>{t("constructionProgressTab:projectLifecycleProcess")}</span>
        </div>
        {isLoading ? (
          <div style={emptyStyle}>{t("common:loading")}</div>
        ) : lifecycleData.length === 0 ? (
          <div style={emptyStyle}>{t("constructionProgressTab:noMonthlyProcessData")}</div>
        ) : (
          <div style={{ width: "100%", height: "320px" }}>
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
                <Tooltip contentStyle={{ fontSize: "13px" }} formatter={(v) => (v == null ? "-" : `${Number(v).toLocaleString()}%`)} />
                <Legend wrapperStyle={{ fontSize: "14px" }} iconSize={12} />
                <Bar yAxisId="left" dataKey="plan" name={t("constructionProgressTab:monthlyPlan")} fill={chartTheme.planBlue} barSize={12} isAnimationActive={false} />
                <Bar yAxisId="left" dataKey="actual" name={t("constructionProgressTab:monthlyActual")} fill={chartTheme.lightBlue} barSize={12} isAnimationActive={false} />
                <Line yAxisId="right" dataKey="planAccum" name={t("constructionProgressTab:cumulativePlan")} stroke={chartTheme.profitGreen} strokeWidth={2} dot={{ r: 2 }} isAnimationActive={false} connectNulls />
                <Line yAxisId="right" dataKey="actualAccum" name={t("constructionProgressTab:cumulativeActual")} stroke={chartTheme.sgaOrange} strokeWidth={2} dot={{ r: 2 }} isAnimationActive={false} connectNulls />
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
