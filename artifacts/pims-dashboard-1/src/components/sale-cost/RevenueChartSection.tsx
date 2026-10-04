/**
 * 매출 차트 섹션 — 월별 계획·매출(막대 2개, 나란히 비교) + 누계 원가율 라인 차트.
 * 누계(계획/실적)는 그래프로 그리면 항상 우상향해 막대가 작아 보이므로 그래프 없이
 * 커스텀 툴팁에서 숫자로만 표시한다.
 */
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LabelList,
  Legend,
} from "recharts";
import { chartTheme } from "../../lib/chartTheme";
import { useMoney } from "../../lib/displayUnit";
import { cardStyle, sectionTitle, INK_NAVY } from "../../lib/uiTokens";
import type { RevenuePoint } from "./types";

// ---------------------------------------------------------------------------
// 커스텀 툴팁 — 누계 실적/계획 포함
// ---------------------------------------------------------------------------

function RevenueTooltip({
  active,
  payload,
  label,
  chartData,
  unitLabel,
  referenceIndex,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
  chartData: RevenuePoint[];
  unitLabel: string;
  referenceIndex: number;
}) {
  const { t } = useTranslation(["common", "saleCostTab"]);
  if (!active || !payload || payload.length === 0) return null;
  const idx = chartData.findIndex((d) => d.label === label);
  const cum     = idx >= 0 ? chartData[idx].cumulative : null;
  const planCum = idx >= 0 ? chartData[idx].planCum    : null;
  // 기준월(referenceIndex)까지는 "Cumulative (Actual)", 그 다음 달(Forecast 구간)부터만
  // "Cumulative (Actual / Forecast)"로 구분해 보여준다(요청: 8월 이전엔 Forecast 문구 불필요).
  const isForecastPoint = idx >= 0 && chartData[idx].year * 12 + chartData[idx].month - 1 > referenceIndex;
  const cumLabel = isForecastPoint
    ? t("saleCostTab:cumulativeActualForecastLabel")
    : `${t("common:cumulative")} (${t("common:actual")})`;
  // 월 계획 → 월 매출 → 누계(계획) → 누계(실적) 순서로 고정 표시한다(요청) — payload는 월별
  // 항목(계획/매출)만 담고, 누계 계획/실적은 중복 없이 이 컴포넌트에서 직접 이어 붙인다.
  return (
    <div
      style={{
        backgroundColor: "#fff",
        border: "1px solid #e2e9f3",
        borderRadius: "6px",
        padding: "8px 12px",
        fontSize: "12px",
        lineHeight: "1.8",
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: "4px", color: INK_NAVY }}>{label}</div>
      {payload.map((p, i) => {
        // Forecast 막대(dataKey="forecastRevenue")는 모든 달에 항상 존재하고 값만 0/실값으로
        // 갈린다 — Forecast 구간이 아닌 달(기준월 이전)에서는 "Actual (Forecast): 0" 줄 자체를
        // 아예 숨긴다(요청: 8월 이전엔 Forecast 문구 불필요).
        if (!isForecastPoint && p.name === t("saleCostTab:monthlyForecastLabel")) return null;
        // Forecast 막대는 fill="#fff"(흰색)으로 그려서 테두리만 보이게 하는데, Recharts가 이 fill을
        // 그대로 payload.color로 넘겨주는 바람에 흰 배경 툴팁 위에 흰 글씨가 찍혀 안 보였다(요청:
        // hover 시 forecast 안 보임 — 데이터 누락이 아니라 흰색 텍스트 때문).
        const isWhiteText = p.color === "#fff" || p.color?.toLowerCase() === "#ffffff";
        return (
          <div key={i} style={{ color: isWhiteText ? chartTheme.planBlue : p.color }}>
            {p.name}: {p.value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} {unitLabel}
          </div>
        );
      })}
      {planCum != null && planCum > 0 && (
        <div
          style={{
            color: chartTheme.planGray,
            borderTop: "1px solid #eef2f7",
            marginTop: "4px",
            paddingTop: "4px",
          }}
        >
          {t("common:cumulative")} ({t("common:plan")}): {planCum.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} {unitLabel}
        </div>
      )}
      {cum != null && (
        <div style={{ color: chartTheme.outflowRed }}>
          {cumLabel}: {cum.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} {unitLabel}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 매출 차트
// ---------------------------------------------------------------------------

export function RevenueChartCard({
  chartData,
  pdSalesHasAny,
  splitForecast = false,
  referenceYear,
  referenceMonth,
}: {
  chartData: RevenuePoint[];
  pdSalesHasAny: boolean;
  splitForecast?: boolean;
  referenceYear?: number;
  referenceMonth?: number;
}) {
  const { t } = useTranslation(["saleCostTab", "common"]);
  const { unitLabel } = useMoney();

  // 프로젝트 전체 기간(여러 해)이 한 화면에 다 나오면 개월 수가 너무 많아 막대/라벨이 겹친다 — 연도
  // 선택을 추가해 기본은 기준월(또는 최신)이 속한 해만 보여주고, 필요하면 다른 해로 바꿔볼 수 있게
  // 한다. 누계 실적/계획은 label이 연도까지 포함돼 전역에서 유일하므로 필터 전 전체 chartData를 그대로
  // 툴팁에 넘겨도 문제없다.
  const availableYears = Array.from(new Set(chartData.map((d) => d.year))).sort((a, b) => a - b);
  const defaultYear = referenceYear ?? availableYears[availableYears.length - 1] ?? new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(defaultYear);
  const yearData = chartData.filter((d) => d.year === selectedYear);

  const maxRevenue = Math.max(...yearData.map((d) => Math.max(d.revenue, d.plan)), 0);
  const referenceIndex =
    referenceYear != null && referenceMonth != null
      ? referenceYear * 12 + referenceMonth - 1
      : Number.POSITIVE_INFINITY;
  const displayData = yearData.map((point) => {
    // 다른 화면(보고서 탭 원가 카드 등)과 동일한 공통 규칙: 기준월(referenceIndex)까지는 Actual,
    // 그 다음 달부터는 전부 Forecast로 그린다 — hasActual로 나누면 경영보고 Excel이 연간 전체를
    // 미리 채워둔 프로젝트는 9월 이후도 전부 Actual로 보여 기준월 구분이 무의미해졌다(요청: 다시
    // 기준월 기준으로 통일, 1~8월은 Actual, 9월부터는 Forecast).
    const isForecast = point.year * 12 + point.month - 1 > referenceIndex;
    return {
      ...point,
      actualRevenue: !splitForecast || !isForecast ? point.revenue : 0,
      forecastRevenue: splitForecast && isForecast ? point.revenue : 0,
    };
  });
  // 개월 수가 많으면(전체 기간 보기 등) 고정 너비 안에 막대가 다 들어가면서 라벨 숫자가 서로
  // 겹쳐 안 보이게 된다 — 개월당 최소 폭을 확보해 가로 스크롤되게 하고, 너무 많을 땐 막대 위 숫자
  // 라벨을 아예 생략해(툴팁으로 대신 확인) 겹침을 원천 차단한다. (연도 선택으로 보통 12개월 이하가
  // 되지만, 안전장치로 남겨둔다.)
  //
  // 계획/매출 막대가 14px로 바짝 붙어 있어 각 막대 위 숫자를 따로 찍으면, VND 원 단위처럼 긴 숫자
  // ("190.478.300.000")는 좌우로 서로 겹쳐 읽을 수 없다(실사용자 보고). 그래서 한 달의 숫자를 "더 높은
  // 막대" 하나가 대표로 위아래 2줄(위: 계획 회색, 아래: 매출 파랑)로 쌓아 그리고, 개월당 폭도 가장 긴
  // 숫자 폭에 맞춰 넓힌다.
  const fmtNum = (v: number) => v.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  const revenueOf = (d: (typeof displayData)[number]) => (d.actualRevenue || d.forecastRevenue || 0);
  const longestLabel = Math.max(
    ...displayData.flatMap((d) => [fmtNum(d.plan ?? 0).length, fmtNum(revenueOf(d)).length]),
    1,
  );
  const labelPx = Math.ceil(longestLabel * 6.2);
  const PX_PER_MONTH = Math.max(56, labelPx + 16);
  const sideMargin = Math.max(40, Math.ceil(labelPx / 2) + 4);
  const chartWidth = Math.max(displayData.length * PX_PER_MONTH + sideMargin * 2, 100);
  const showBarLabels = displayData.length <= 15;
  // owner = 이 LabelList가 붙은 막대 종류. 그 달에서 가장 높은 막대(동점이면 plan → actual → forecast
  // 순)만 라벨을 그린다. 같은 축(0 기준)이라 그 막대 꼭대기가 곧 그 달의 최고점이다.
  const stackedLabel = (owner: "plan" | "actualRevenue" | "forecastRevenue") => (props: any) => {
    const { x, y, width, index } = props;
    const d = displayData[index];
    if (!d) return null;
    const plan = pdSalesHasAny ? (d.plan ?? 0) : 0;
    const values = { plan, actualRevenue: d.actualRevenue ?? 0, forecastRevenue: d.forecastRevenue ?? 0 };
    const order = ["plan", "actualRevenue", "forecastRevenue"] as const;
    const maxValue = Math.max(values.plan, values.actualRevenue, values.forecastRevenue);
    if (maxValue === 0) return null;
    const drawer = order.find((k) => values[k] === maxValue);
    if (drawer !== owner) return null;
    // 그룹(계획+매출 막대 2개)의 가운데 — 계획 막대가 왼쪽, 매출 막대가 오른쪽에 있다.
    const groupCenter = pdSalesHasAny
      ? owner === "plan" ? Number(x) + Number(width) : Number(x)
      : Number(x) + Number(width) / 2;
    const revenue = revenueOf(d);
    const lines: Array<{ text: string; color: string }> = [];
    if (plan !== 0) lines.push({ text: fmtNum(plan), color: chartTheme.axisText });
    if (revenue !== 0) lines.push({ text: fmtNum(revenue), color: chartTheme.planBlue });
    return (
      <g>
        {lines.map((line, i) => (
          <text
            key={i}
            x={groupCenter}
            y={Number(y) - 6 - (lines.length - 1 - i) * 13}
            textAnchor="middle"
            fontSize={11}
            fontWeight={i === lines.length - 1 && revenue !== 0 ? 600 : 400}
            fill={line.color}
          >
            {line.text}
          </text>
        ))}
      </g>
    );
  };

  return (
    <div style={cardStyle}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
        <span style={sectionTitle}>
          {t("saleCostTab:monthlyRevenueTitle", { unit: unitLabel })}
        </span>
        <select
          value={selectedYear}
          onChange={(event) => setSelectedYear(Number(event.target.value))}
          aria-label={t("common:year")}
          style={{
            padding: "4px 22px 4px 8px",
            border: "1px solid #dbe2ea",
            borderRadius: "3px",
            backgroundColor: "#fff",
            color: INK_NAVY,
            fontFamily: "inherit",
            fontSize: "12px",
            fontWeight: 600,
            lineHeight: 1.4,
          }}
        >
          {availableYears.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>
      <div style={{ width: "100%", height: "260px", marginTop: "8px", overflowX: "auto" }}>
        <div style={{ width: `${chartWidth}px`, height: "100%", minWidth: "100%" }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={displayData} margin={{ top: 30, right: sideMargin, left: sideMargin, bottom: 0 }}>
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: chartTheme.axisText }}
                tickLine={false}
                axisLine={{ stroke: chartTheme.axisLine }}
              />
              <YAxis hide domain={[0, Math.max(maxRevenue * 2.4, 1)]} />
              <Tooltip
                content={
                  <RevenueTooltip
                    chartData={chartData}
                    unitLabel={unitLabel}
                    referenceIndex={referenceIndex}
                  />
                }
              />
              <Legend wrapperStyle={{ fontSize: "12px" }} />
              {pdSalesHasAny && (
                <Bar
                  dataKey="plan"
                  name={t("saleCostTab:monthlyPlan")}
                  fill={chartTheme.planGray}
                  barSize={14}
                  isAnimationActive={false}
                >
                  {showBarLabels && <LabelList dataKey="plan" content={stackedLabel("plan")} />}
                </Bar>
              )}
              <Bar
                dataKey="actualRevenue"
                name={splitForecast ? t("common:actual") : t("saleCostTab:monthlyRevenue")}
                fill={chartTheme.planBlue}
                barSize={pdSalesHasAny ? 14 : 22}
                isAnimationActive={false}
              >
                {showBarLabels && <LabelList dataKey="actualRevenue" content={stackedLabel("actualRevenue")} />}
              </Bar>
              {splitForecast && (
                <Bar
                  dataKey="forecastRevenue"
                  name={t("saleCostTab:monthlyForecastLabel")}
                  fill="#fff"
                  stroke={chartTheme.planBlue}
                  strokeWidth={1.5}
                  strokeDasharray="4 3"
                  barSize={14}
                  isAnimationActive={false}
                >
                  {showBarLabels && <LabelList dataKey="forecastRevenue" content={stackedLabel("forecastRevenue")} />}
                </Bar>
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 누계 원가율 라인 차트
// ---------------------------------------------------------------------------

export function CostRatioLineCard({
  chartData,
}: {
  chartData: RevenuePoint[];
}) {
  const { t } = useTranslation(["saleCostTab", "common"]);
  // 전체 기간(여러 해)을 한 번에 그리면 개월 수가 너무 많아 안 보인다 — 연도 선택 추가, 기본값은
  // 오늘 날짜 기준 올해(미래 전망 연도가 아니라 실제 현재 연도) — 데이터에 올해가 없으면 가장
  // 가까운 해로 대체한다.
  const availableYears = Array.from(new Set(chartData.map((d) => d.year))).sort((a, b) => a - b);
  const [selectedYear, setSelectedYear] = useState(() => {
    const currentYear = new Date().getFullYear();
    if (availableYears.includes(currentYear)) return currentYear;
    if (availableYears.length === 0) return currentYear;
    return availableYears.reduce((closest, y) =>
      Math.abs(y - currentYear) < Math.abs(closest - currentYear) ? y : closest,
    );
  });
  const yearData = chartData.filter((d) => d.year === selectedYear);
  const ratios  = yearData.filter((d) => d.ratio != null).map((d) => d.ratio as number);
  const ratioMax = ratios.length > 0 ? Math.max(...ratios) : 100;
  // 0부터 시작하는 고정 축이면 원가율이 항상 80~90%대에 몰려 있어 0.1%p 변화도 안 보인다 — 실제 값
  // 범위(min~max)에 여유만 살짝 두어 작은 변동도 눈에 띄게 한다.
  const ratioMin = ratios.length > 0 ? Math.min(...ratios) : 0;
  const ratioPadding = Math.max((ratioMax - ratioMin) * 0.4, 0.5);
  const yDomain: [number, number] = [Math.max(ratioMin - ratioPadding, 0), ratioMax + ratioPadding];
  let lastRatioIdx = -1;
  yearData.forEach((d, i) => { if (d.ratio != null) lastRatioIdx = i; });

  return (
    <div style={cardStyle}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
        <span style={sectionTitle}>{t("saleCostTab:costRatioLineTitle")}</span>
        <select
          value={selectedYear}
          onChange={(event) => setSelectedYear(Number(event.target.value))}
          aria-label={t("common:year")}
          style={{
            padding: "4px 22px 4px 8px",
            border: "1px solid #dbe2ea",
            borderRadius: "3px",
            backgroundColor: "#fff",
            color: INK_NAVY,
            fontFamily: "inherit",
            fontSize: "12px",
            fontWeight: 600,
            lineHeight: 1.4,
          }}
        >
          {availableYears.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>
      <div style={{ width: "100%", height: "220px", marginTop: "8px" }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={yearData} margin={{ top: 30, right: 40, left: 40, bottom: 0 }}>
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: chartTheme.axisText }}
              tickLine={false}
              axisLine={{ stroke: chartTheme.axisLine }}
            />
            <YAxis hide domain={yDomain} />
            <Tooltip
              contentStyle={{ fontSize: "13px" }}
              formatter={(v) =>
                `${Number(v).toLocaleString("en-US", {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 1,
                })}%`
              }
            />
            <Line
              dataKey="ratio"
              name={t("saleCostTab:cumulativeCostRatio")}
              type="monotone"
              stroke={chartTheme.profitGreen}
              strokeWidth={2}
              dot={(props: { cx?: number; cy?: number; index?: number; key?: string }) => {
                const { cx, cy, index, key } = props;
                if (cx == null || cy == null) return <g key={key} />;
                const isLast = index === lastRatioIdx;
                return (
                  <circle
                    key={key}
                    cx={cx}
                    cy={cy}
                    r={isLast ? 6 : 3}
                    fill={isLast ? chartTheme.sgaOrange : chartTheme.profitGreen}
                    stroke="#fff"
                    strokeWidth={isLast ? 2 : 0}
                  />
                );
              }}
              connectNulls
              isAnimationActive={false}
            >
              <LabelList
                dataKey="ratio"
                content={(props) => {
                  const { x, y, value, index } = props as {
                    x?: number;
                    y?: number;
                    value?: number | null;
                    index?: number;
                  };
                  if (value == null || x == null || y == null) return null;
                  const isLast = index === lastRatioIdx;
                  return (
                    <text
                      x={x}
                      y={y - (isLast ? 14 : 10)}
                      textAnchor="middle"
                      fontSize={isLast ? 14 : 9}
                      fontWeight={isLast ? 700 : 400}
                      fill={isLast ? chartTheme.sgaOrange : chartTheme.profitGreen}
                    >
                      {Number(value).toLocaleString("en-US", {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 1,
                      })}%
                    </text>
                  );
                }}
              />
            </Line>
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
