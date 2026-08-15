import React, { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  ComposedChart,
  Line,
  Bar,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LabelList,
  Cell,
} from "recharts";
import {
  useListSalescostSites,
  getListSalescostSitesQueryKey,
  useListMgmtreportProjects,
  getListMgmtreportProjectsQueryKey,
} from "@workspace/api-client-react";
import { useDashboardData, type SalesRow, REPORT_YEAR } from "../lib/mgmtreportData";
import { useDashboardFilters, makeConverter } from "../lib/dashboardFilters";
import { classifyMrProject } from "../data/projects";
import { chartTheme } from "../lib/chartTheme";
import { useTheme } from "../lib/theme";
import { DetailModal, DetailDataTable } from "./DetailModal";

const PLAN_COLOR = chartTheme.planBlue;
const ACTUAL_COLOR = chartTheme.actualGreen;
const RATE_COLOR = chartTheme.rateOrange;

/* Badge label above dot */
const BadgeLabel = (fill: string, compact = false, n = 12) => (props: any) => {
  const { x, y, value } = props;
  if (value == null || x == null || y == null) return null;
  const text = Number(value).toLocaleString("ko-KR");
  const colPitch = Math.max(20, 320 / Math.max(1, n));
  const maxFs = compact ? 9 : 11.5;
  const fontSize = Math.max(7.5, Math.min(maxFs, colPitch / (text.length * 0.62)));
  const charW = fontSize * 0.62;
  const h = fontSize + 7;
  const w = Math.max(20, text.length * charW + 8);
  const bx = x - w / 2;
  const by = y - h - 9;
  return (
    <g>
      <rect x={bx} y={by} width={w} height={h} rx={5} fill={fill} />
      <path d={`M ${x - 4} ${by + h - 0.5} L ${x + 4} ${by + h - 0.5} L ${x} ${by + h + 4.5} Z`} fill={fill} />
      <text
        x={x}
        y={by + h / 2 + 0.5}
        textAnchor="middle"
        dominantBaseline="central"
        fill="#fff"
        fontSize={fontSize}
        fontWeight={700}
      >
        {text}
      </text>
    </g>
  );
};

const makePlanRateLabel = (chartData: SalesRow[]) => (props: any) => {
  const { x, y, index } = props;
  if (x == null || y == null || index == null) return null;
  const d = chartData[index];
  if (!d || d.rate == null || d.plan == null || d.actual == null) return null;
  if (d.plan > d.actual) return null;
  return (
    <text x={x} y={y + 18} textAnchor="middle" fill={RATE_COLOR} fontSize={10} fontWeight={700}>
      {d.rate}%
    </text>
  );
};

const makeActualRateLabel = (chartData: SalesRow[]) => (props: any) => {
  const { x, y, index } = props;
  if (x == null || y == null || index == null) return null;
  const d = chartData[index];
  if (!d || d.rate == null || d.plan == null || d.actual == null) return null;
  if (d.actual >= d.plan) return null;
  return (
    <text x={x} y={y + 18} textAnchor="middle" fill={RATE_COLOR} fontSize={10} fontWeight={700}>
      {d.rate}%
    </text>
  );
};

/* Custom Tooltip */
const CustomTooltip = ({ active, payload, label, colors }: any) => {
  const { t } = useTranslation(["salesChart", "common"]);
  if (!active || !payload || !payload.length) return null;
  const c = colors ?? { plan: PLAN_COLOR, actual: ACTUAL_COLOR, rate: RATE_COLOR };
  const plan = payload.find((p: any) => p.dataKey === "plan");
  const actual = payload.find((p: any) => p.dataKey === "actual");
  const rate = plan?.payload?.rate ?? actual?.payload?.rate;
  return (
    <div style={{ backgroundColor: "#fff", border: "1px solid #e2e9f3", borderRadius: "4px", padding: "8px 10px", fontSize: "12px" }}>
      <div style={{ fontWeight: 700, marginBottom: "4px", color: "#16294a" }}>{label}</div>
      {plan && <div style={{ color: c.plan }}>{t("salesChart:salesPlan")}: {Number(plan.value).toLocaleString("ko-KR")}</div>}
      {actual && <div style={{ color: c.actual }}>{t("salesChart:salesActualForecast")}: {Number(actual.value).toLocaleString("ko-KR")}</div>}
      {rate != null && (
        <div style={{ color: c.rate, fontWeight: 700, marginTop: "4px" }}>{t("common:achievementRate")}: {rate}%</div>
      )}
    </div>
  );
};

/** "N월" 형식 → 0-based 월 인덱스 (0–11). 월 형식이 아니면 null. */
function extractMonthIdx(label: string): number | null {
  const m = /^(\d+)월$/.exec(label);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  return n >= 1 && n <= 12 ? n - 1 : null;
}

export function SalesChart() {
  const { t } = useTranslation(["salesChart", "common"]);
  const [detailOpen, setDetailOpen] = useState(false);
  const [drillRow, setDrillRow] = useState<SalesRow | null>(null);

  const { derived, isError } = useDashboardData();
  const filters = useDashboardFilters();
  const { unitIndex, currency, fxRates, project, division, statusFilter } = filters;
  const convert = makeConverter(currency, unitIndex, fxRates);

  const { theme } = useTheme();
  const variant = theme.charts?.salesVariant;
  const planColor = theme.charts?.planColor ?? PLAN_COLOR;
  const actualColor = theme.charts?.actualColor ?? ACTUAL_COLOR;
  const rateColor = theme.charts?.rateColor ?? RATE_COLOR;
  const compact = unitIndex === 1;
  const visibleData = derived?.salesData ?? [];
  const PlanRateLabel = makePlanRateLabel(visibleData);
  const ActualRateLabel = makeActualRateLabel(visibleData);

  /* ── 현장별 매출 데이터 — 항상 프리패치(드릴다운 클릭 즉시 표시) ── */
  const sitesParams = { year: REPORT_YEAR, metric: "revenue" as const };
  const sitesQuery = useListSalescostSites(sitesParams, {
    query: { queryKey: getListSalescostSitesQueryKey(sitesParams) },
  });

  /* ── 프로젝트/부문 스코프 결정 ── */
  const projectSelected = project !== "All";
  const divisionSelected = !projectSelected && division != null;
  const needProjectsList = projectSelected || divisionSelected;

  const projectsQuery = useListMgmtreportProjects(
    { year: REPORT_YEAR },
    {
      query: {
        queryKey: getListMgmtreportProjectsQueryKey({ year: REPORT_YEAR }),
        enabled: needProjectsList,
      },
    },
  );

  /**
   * 현재 필터 스코프에 해당하는 sc_sites.code 집합.
   * null = 전체 현장(필터 없음).
   * 빈 Set = 스코프 내 siteCode 매핑이 없음 → 현장 상세 없음.
   *
   * mr_projects.siteCode → sc_sites.code 로 연결하는 것이 올바른 방식.
   * (이름 기반 매칭은 별개 식별자이므로 사용하지 않음.)
   */
  const scopedSiteCodes = useMemo<Set<string> | null>(() => {
    if (!needProjectsList) return null; // 전체: 필터링 불필요
    const projects = projectsQuery.data?.projects ?? [];
    if (projectSelected) {
      // 단일 프로젝트: 해당 프로젝트의 siteCode 한 개
      const p = projects.find((x) => x.name === project);
      if (!p?.siteCode) return new Set(); // 매핑 없음 → 현장 데이터 없음
      return new Set([p.siteCode]);
    }
    if (divisionSelected && division) {
      const codes = projects
        .filter(
          (p) =>
            !p.isGroup &&
            classifyMrProject(p.name) === division &&
            (statusFilter == null || (p.status ?? "ongoing") === statusFilter) &&
            p.siteCode != null,
        )
        .map((p) => p.siteCode as string);
      return new Set(codes);
    }
    return null;
  }, [needProjectsList, projectSelected, divisionSelected, project, division, statusFilter, projectsQuery.data]);

  /* ── 클릭된 월의 현장별 rows 계산 ── */
  const drillMonthIdx = drillRow ? extractMonthIdx(drillRow.month) : null;

  const drillSiteRows = useMemo(() => {
    if (drillMonthIdx == null) return [];
    const allSites = sitesQuery.data?.sites ?? [];
    // 스코프 적용: 선택된 프로젝트/부문에 속한 현장만
    const scoped =
      scopedSiteCodes == null
        ? allSites
        : allSites.filter((s) => scopedSiteCodes.has(s.code));

    const mapped = scoped
      .map((s) => ({
        name: s.name,
        category: s.category ?? "-",
        bizType: s.bizType ?? "-",
        amount: Math.round(convert(s.months[drillMonthIdx] ?? 0)),
      }))
      // 0인 현장은 제외, 마이너스(조정 역분개 등)는 유지
      .filter((r) => r.amount !== 0)
      .sort((a, b) => b.amount - a.amount);

    const total = mapped.reduce((acc, r) => acc + r.amount, 0);
    return mapped.map((r) => ({
      ...r,
      share: total !== 0 ? `${((r.amount / total) * 100).toFixed(1)}%` : "-",
    }));
  }, [drillMonthIdx, sitesQuery.data, scopedSiteCodes, convert]);

  /* ── 드릴다운 로딩 상태 ──
   * 부문/프로젝트 스코프가 있는데 projects 목록이 아직 오는 중이면 "loading" 표시 */
  const drillIsLoading =
    sitesQuery.isLoading || (needProjectsList && projectsQuery.isLoading);

  /* month + 달성률 pill chip tick */
  const MonthRateTick = (props: any) => {
    const { x, y, payload } = props;
    const row = visibleData.find((r) => r.month === payload.value);
    const ok = row?.rate != null && row.rate >= 100;
    const chipText = row?.rate != null ? `${row.rate}%` : null;
    const chipW = chipText ? Math.max(34, chipText.length * 6.2 + 12) : 0;
    return (
      <g>
        <text x={x} y={y + 12} textAnchor="middle" fontSize={11} fill={chartTheme.axisText}>{payload.value}</text>
        {chipText && (
          <g>
            <rect x={x - chipW / 2} y={y + 19} width={chipW} height={16} rx={8}
              fill={ok ? "#e7f5ec" : "#fdecec"} />
            <text x={x} y={y + 30.5} textAnchor="middle" fontSize={10} fontWeight={700}
              fill={ok ? "#2e9e5b" : "#cf4d4d"}>{chipText}</text>
          </g>
        )}
      </g>
    );
  };

  const BarValueLabel = (props: any) => {
    const { x, y, width, height, index } = props;
    if (x == null || index == null) return null;
    const d = visibleData[index];
    if (!d || d.actual == null || !Number.isFinite(Number(d.actual))) return null;
    const text = Number(d.actual).toLocaleString("ko-KR");
    const fontSize = 12;
    let topY = y;
    if (
      d.plan != null && Number.isFinite(Number(d.plan)) && d.plan > 0 &&
      height > 0 && d.actual > 0
    ) {
      const actualY = y + height - d.actual * (height / d.plan);
      if (Number.isFinite(actualY)) topY = actualY;
    }
    return (
      <text x={x + width / 2} y={topY - 4} textAnchor="middle"
        fontSize={fontSize} fontWeight={700} fill="#1a2d4d">
        {text}
      </text>
    );
  };

  return (
    <div style={{
      backgroundColor: "#fff",
      border: "1px solid #e2e9f3",
      borderRadius: "6px",
      padding: "10px 12px",
      height: "100%",
      boxSizing: "border-box",
      display: "flex",
      flexDirection: "column",
    }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
          <span style={{ fontSize: "13px", fontWeight: "600", color: chartTheme.titleNavy }}>{t("salesChart:title")}</span>
          {derived && <span style={{ fontSize: "11px", color: "#7c8ba3" }}>{t("common:unit")}: {derived.unitLabel}</span>}
        </div>
        <button
          onClick={() => setDetailOpen(true)}
          style={{
            fontSize: "12px",
            color: "#2f7cf6",
            background: "none",
            border: "none",
            cursor: "pointer",
          }}>{t("salesChart:viewDetails")}</button>
      </div>

      {/* Legend */}
      <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "6px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          {variant === "bars" ? (
            <svg width="14" height="10"><rect x="1" y="1" width="12" height="8" rx="2" fill={planColor} /></svg>
          ) : (
            <svg width="26" height="8">
              <line x1="0" y1="4" x2="26" y2="4" stroke={planColor} strokeWidth="1.5" strokeDasharray={variant === "area" ? "4 3" : undefined} />
              <circle cx="6" cy="4" r="2.5" fill={planColor} />
              <circle cx="20" cy="4" r="2.5" fill={planColor} />
            </svg>
          )}
          <span style={{ fontSize: "12px", color: "#555" }}>{t("salesChart:salesPlan")}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          {variant === "bars" ? (
            <svg width="14" height="10"><rect x="1" y="1" width="12" height="8" rx="2" fill={actualColor} /></svg>
          ) : (
            <svg width="26" height="8">
              <line x1="0" y1="4" x2="26" y2="4" stroke={actualColor} strokeWidth="1.5" />
              <circle cx="6" cy="4" r="2.5" fill={actualColor} />
              <circle cx="20" cy="4" r="2.5" fill={actualColor} />
            </svg>
          )}
          <span style={{ fontSize: "12px", color: "#555" }}>{t("salesChart:salesActualForecast")}</span>
        </div>
        {variant === "bars" ? (
          <span style={{ fontSize: "11px", color: "#7c8ba3" }}>{t("salesChart:bottomChipRate")}</span>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <span style={{ fontSize: "12px", fontWeight: 700, color: rateColor }}>%</span>
            <span style={{ fontSize: "12px", color: "#555" }}>{t("common:achievementRate")}</span>
          </div>
        )}
      </div>

      {/* Chart */}
      <div style={{ flex: 1, minHeight: "160px" }}>
        {visibleData.length === 0 ? (
          <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", color: "#888" }}>
            {isError
              ? t("salesChart:errorLoadFailed")
              : derived?.emptyRange
                ? t("salesChart:noDataForPeriod")
                : t("salesChart:loadingData")}
          </div>
        ) : (
        <ResponsiveContainer width="100%" height="100%">
          {variant === "bars" ? (
            <ComposedChart data={visibleData} margin={{ top: 24, right: 18, left: -10, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.gridLine} vertical={false} />
              <XAxis
                dataKey="month"
                tick={<MonthRateTick />}
                axisLine={false}
                tickLine={false}
                height={44}
              />
              <XAxis dataKey="month" xAxisId="overlay" hide />
              <YAxis
                domain={[0, "auto"]}
                tick={{ fontSize: compact ? 9 : 11, fill: chartTheme.axisText }}
                width={compact ? 88 : 60}
                tickFormatter={(v: number) => v.toLocaleString("ko-KR")}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip colors={{ plan: planColor, actual: actualColor, rate: rateColor }} />} cursor={{ fill: "rgba(68,114,202,0.06)" }} />
              <Bar
                dataKey="plan"
                name={t("salesChart:salesPlan")}
                fill={planColor}
                barSize={28}
                maxBarSize={28}
                radius={[7, 7, 0, 0]}
                isAnimationActive={false}
              >
                <LabelList dataKey="plan" content={BarValueLabel} />
              </Bar>
              <Bar
                dataKey="actual"
                xAxisId="overlay"
                name={t("salesChart:salesActualForecast")}
                fill={actualColor}
                barSize={compact ? 12 : 16}
                radius={[6, 6, 0, 0]}
                isAnimationActive={false}
              >
                {visibleData.map((d, i) => (
                  <Cell
                    key={`actual-${i}`}
                    fill={d.isForecast ? "#ffffff" : actualColor}
                    fillOpacity={d.isForecast ? 0.55 : 1}
                    stroke={d.isForecast ? actualColor : undefined}
                    strokeWidth={d.isForecast ? 1.6 : 0}
                    strokeDasharray={d.isForecast ? "5 3" : undefined}
                  />
                ))}
              </Bar>
            </ComposedChart>
          ) : variant === "area" ? (
            <ComposedChart data={visibleData} margin={{ top: 30, right: 18, left: -10, bottom: 4 }}>
              <defs>
                <linearGradient id="salesAreaFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={actualColor} stopOpacity={0.22} />
                  <stop offset="100%" stopColor={actualColor} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.gridLine} vertical={false} />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: chartTheme.axisText }}
                axisLine={false}
                tickLine={false}
                padding={{ left: 18, right: 6 }}
              />
              <YAxis
                domain={[0, "auto"]}
                tick={{ fontSize: compact ? 9 : 11, fill: chartTheme.axisText }}
                width={compact ? 88 : 60}
                tickFormatter={(v: number) => v.toLocaleString("ko-KR")}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip colors={{ plan: planColor, actual: actualColor, rate: rateColor }} />} />
              <Line
                type="monotone"
                dataKey="plan"
                name={t("salesChart:salesPlan")}
                stroke={planColor}
                strokeWidth={1.5}
                strokeDasharray="5 4"
                dot={{ r: 2.5, fill: "#fff", stroke: planColor }}
                connectNulls
                isAnimationActive={false}
              />
              <Area
                type="monotone"
                dataKey="actual"
                name={t("salesChart:salesActualForecast")}
                stroke={actualColor}
                strokeWidth={2}
                fill="url(#salesAreaFill)"
                dot={{ r: 3, fill: actualColor, stroke: actualColor }}
                connectNulls
                isAnimationActive={false}
              >
                <LabelList
                  dataKey="actual"
                  position="top"
                  offset={10}
                  formatter={(v: number) => (v == null ? "" : v.toLocaleString("ko-KR"))}
                  style={{ fontSize: compact ? 9 : 10.5, fontWeight: 700, fill: actualColor }}
                />
              </Area>
            </ComposedChart>
          ) : (
          <ComposedChart data={visibleData} margin={{ top: 36, right: 18, left: -10, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.gridLine} vertical={false} />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11, fill: chartTheme.axisText }}
              axisLine={false}
              tickLine={false}
              padding={{ left: 18, right: 6 }}
            />
            <YAxis
              domain={["auto", "auto"]}
              tick={{ fontSize: compact ? 9 : 11, fill: chartTheme.axisText }}
              width={compact ? 88 : 60}
              tickFormatter={(v: number) => v.toLocaleString("ko-KR")}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="linear"
              dataKey="actual"
              name={t("salesChart:salesActualForecast")}
              stroke={ACTUAL_COLOR}
              strokeWidth={1.5}
              dot={{ r: 2.5, fill: ACTUAL_COLOR, stroke: ACTUAL_COLOR }}
              connectNulls
              isAnimationActive={false}
            >
              <LabelList dataKey="actual" content={BadgeLabel(ACTUAL_COLOR, compact, visibleData.length)} />
              <LabelList dataKey="actual" content={ActualRateLabel} />
            </Line>
            <Line
              type="linear"
              dataKey="plan"
              name={t("salesChart:salesPlan")}
              stroke={PLAN_COLOR}
              strokeWidth={1.5}
              dot={{ r: 2.5, fill: PLAN_COLOR, stroke: PLAN_COLOR }}
              connectNulls
              isAnimationActive={false}
            >
              <LabelList dataKey="plan" content={BadgeLabel(PLAN_COLOR, compact, visibleData.length)} />
              <LabelList dataKey="plan" content={PlanRateLabel} />
            </Line>
          </ComposedChart>
          )}
        </ResponsiveContainer>
        )}
      </div>

      {/* ── 1차 상세 모달: 월별 매출 요약 ── */}
      <DetailModal
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        title={t("salesChart:title")}
        subtitle={derived?.unitLabel}
      >
        <DetailDataTable
          rowKey={(row) => String(row.month)}
          columns={[
            { key: "month", label: t("salesChart:month"), align: "left" },
            { key: "plan", label: t("salesChart:salesPlan") },
            { key: "actual", label: t("salesChart:salesActualForecast") },
            { key: "rate", label: t("common:achievementRate"), format: (v) => (v == null ? "-" : `${v}%`) },
          ]}
          rows={visibleData}
          onRowClick={(row) => {
            if (extractMonthIdx(row.month) != null) setDrillRow(row);
          }}
          isRowClickable={(row) => extractMonthIdx(row.month) != null}
        />
      </DetailModal>

      {/* ── 2차 드릴다운 모달: 현장별 매출 상세 ── */}
      <DetailModal
        open={drillRow != null}
        onClose={() => setDrillRow(null)}
        title={drillRow ? t("salesChart:siteDetailTitle", { month: drillRow.month }) : ""}
        subtitle={derived?.unitLabel}
      >
        {drillIsLoading ? (
          <div style={{ padding: "28px 16px", textAlign: "center", fontSize: "13px", color: "#7c8ba3" }}>
            {t("salesChart:loadingSiteData")}
          </div>
        ) : sitesQuery.isError ? (
          <div style={{ padding: "28px 16px", textAlign: "center", fontSize: "13px", color: "#e0655c" }}>
            {t("salesChart:errorLoadFailed")}
          </div>
        ) : drillSiteRows.length === 0 ? (
          <div style={{ padding: "28px 16px", textAlign: "center", fontSize: "13px", color: "#7c8ba3" }}>
            {t("salesChart:noSiteData")}
          </div>
        ) : (
          <DetailDataTable
            rowKey={(row) => row.name}
            columns={[
              { key: "name", label: t("salesChart:colSiteName"), align: "left" },
              { key: "category", label: t("salesChart:colCategory"), align: "left" },
              { key: "bizType", label: t("salesChart:colBizType"), align: "left" },
              {
                key: "amount",
                label: t("salesChart:colAmount"),
                align: "right",
                format: (v) => typeof v === "number" ? v.toLocaleString("ko-KR") : "-",
              },
              { key: "share", label: t("salesChart:colShare"), align: "right" },
            ]}
            rows={drillSiteRows}
          />
        )}
      </DetailModal>
    </div>
  );
}
