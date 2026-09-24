import React from "react";
import { useTranslation } from "react-i18next";
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ProjectDetailSalesPoint } from "@workspace/api-client-react";
import { chartTheme } from "../../lib/chartTheme";
import { useMoney } from "../../lib/displayUnit";
import { REPORT_YEAR } from "../../lib/mgmtreportData";
import { ratioPct } from "../../lib/projectDetailData";
import { cardStyle, INK_MUTED, sectionTitle } from "../../lib/uiTokens";

interface Props {
  planMonths: (number | null)[];
  actualMonths: (number | null)[];
  resolvedMonth: number | null;
  allSalesMonths: ProjectDetailSalesPoint[];
  contractAmount: number | null;
}

interface SalesChartRow {
  month: string;
  plan: number | null;
  actual: number | null;
  rate: number | null;
  isForecast: boolean;
}

const PLAN_COLOR = chartTheme.planBlue;
const ACTUAL_COLOR = chartTheme.actualGreen;

function LegendItem({
  label,
  color,
  forecast = false,
}: {
  label: string;
  color: string;
  forecast?: boolean;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
      <svg width="12" height="9" aria-hidden="true">
        <rect
          x="1"
          y="1"
          width="10"
          height="7"
          rx="2"
          fill={forecast ? "#fff" : color}
          stroke={forecast ? color : undefined}
          strokeWidth={forecast ? 1.3 : 0}
          strokeDasharray={forecast ? "3 2" : undefined}
        />
      </svg>
      <span style={{ fontSize: "10px", color: "#555" }}>{label}</span>
    </div>
  );
}

function SalesTooltip({
  active,
  payload,
  label,
  fmtMoney,
}: {
  active?: boolean;
  payload?: Array<{ dataKey?: string; value?: number; payload?: SalesChartRow }>;
  label?: string;
  fmtMoney: (value: number | null | undefined) => string;
}) {
  const { t } = useTranslation(["projectReportTab", "common"]);
  if (!active || !payload?.length) return null;
  const plan = payload.find((item) => item.dataKey === "plan");
  const actual = payload.find((item) => item.dataKey === "actual");
  const row = actual?.payload ?? plan?.payload;
  return (
    <div
      style={{
        backgroundColor: "#fff",
        border: "1px solid #e2e9f3",
        borderRadius: "4px",
        padding: "7px 9px",
        fontSize: "11px",
      }}
    >
      <div style={{ fontWeight: 700, color: "#16294a", marginBottom: "3px" }}>{label}</div>
      {plan && (
        <div style={{ color: PLAN_COLOR }}>
          {t("projectReportTab:salesTooltipLine", { label: t("common:plan"), value: fmtMoney(plan.value) })}
        </div>
      )}
      {actual && (
        <div style={{ color: ACTUAL_COLOR }}>
          {t("projectReportTab:salesTooltipLine", {
            label: row?.isForecast ? t("common:forecast") : t("common:actual"),
            value: fmtMoney(actual.value),
          })}
        </div>
      )}
      {!row?.isForecast && row?.rate != null && (
        <div style={{ color: chartTheme.rateOrange, fontWeight: 700 }}>
          {t("common:achievementRate")}: {row.rate}%
        </div>
      )}
    </div>
  );
}

export function SalesSection({
  planMonths,
  actualMonths,
  resolvedMonth,
  allSalesMonths,
  contractAmount,
}: Props) {
  const { t } = useTranslation(["projectReportTab", "common"]);
  const { fmtMoney, unitLabel, convertVndToKUsd } = useMoney();
  // contractAmount đến từ pd_overview, lưu VND gốc — actualMonths/allSalesMonths đều ở đơn vị 천 USD,
  // phải quy đổi trước khi so sánh/hiển thị chung (nếu không sẽ lệch đơn vị và tỷ lệ % sai hoàn toàn).
  const contractAmountKUsd = contractAmount != null ? convertVndToKUsd(contractAmount) : null;
  const latestActualIdx = actualMonths.reduce<number>(
    (latest, value, index) => ((value ?? 0) !== 0 ? index : latest),
    -1,
  );
  const actualThroughIdx = Math.max(
    -1,
    Math.min((resolvedMonth ?? latestActualIdx + 1) - 1, 11),
  );
  const chartData: SalesChartRow[] = Array.from({ length: 12 }, (_, index) => {
    const plan = planMonths[index] ?? null;
    const isForecast = index > actualThroughIdx;
    const actual = actualMonths[index] ?? null;
    const rawRate = isForecast ? null : ratioPct(actual, plan);
    return {
      month: `${index + 1}월`,
      plan,
      actual,
      rate: rawRate == null ? null : Math.round(rawRate * 10) / 10,
      isForecast,
    };
  });
  const hasData = chartData.some(
    (row) => (row.plan ?? 0) !== 0 || (row.actual ?? 0) !== 0,
  );
  const refMonth = Math.max(1, Math.min(resolvedMonth ?? latestActualIdx + 1, 12));
  const hasAllPeriodData = allSalesMonths.some(
    (row) => row.plan != null || row.actual != null,
  );
  const annualPlanRows = hasAllPeriodData
    ? allSalesMonths.filter((row) => row.year === REPORT_YEAR)
    : chartData;
  const annualActualRows = hasAllPeriodData
    ? allSalesMonths.filter(
        (row) => row.year === REPORT_YEAR && row.month <= refMonth,
      )
    : chartData.slice(0, refMonth);
  const overallActualRows = hasAllPeriodData
    ? allSalesMonths.filter(
        (row) =>
          row.year < REPORT_YEAR ||
          (row.year === REPORT_YEAR && row.month <= refMonth),
      )
    : annualActualRows;
  const sumValues = (
    rows: Array<{ plan?: number | null; actual?: number | null }>,
    key: "plan" | "actual",
  ): number | null => {
    const values = rows
      .map((row) => row[key])
      .filter((value): value is number => value != null);
    return values.length > 0 ? values.reduce((sum, value) => sum + value, 0) : null;
  };
  const makeSummary = (plan: number | null, actual: number | null) => {
    const rate = ratioPct(actual, plan);
    return {
      plan,
      actual,
      rate: rate == null ? null : Math.round(rate * 10) / 10,
    };
  };
  const annualSummary = makeSummary(
    sumValues(annualPlanRows, "plan"),
    sumValues(annualActualRows, "actual"),
  );
  const overallSummary = makeSummary(
    contractAmountKUsd,
    sumValues(overallActualRows, "actual"),
  );

  const MonthRateTick = ({
    x,
    y,
    payload,
  }: {
    x?: number;
    y?: number;
    payload?: { value?: string };
  }) => {
    if (x == null || y == null || !payload?.value) return null;
    const row = chartData.find((item) => item.month === payload.value);
    const rowIndex = chartData.findIndex((item) => item.month === payload.value);
    const chipText = row?.rate != null ? `${row.rate}%` : null;
    const chipWidth = chipText
      ? Math.max(14, Math.min(17, chipText.length * 2.2 + 5))
      : 0;
    const chipY = y + 14 + (rowIndex % 2) * 11;
    const achieved = (row?.rate ?? 0) >= 100;
    return (
      <g>
        <text x={x} y={y + 10} textAnchor="middle" fontSize={8} fill={chartTheme.axisText}>
          {payload.value.replace("월", "")}
        </text>
        {chipText && (
          <g>
            <rect
              x={x - chipWidth / 2}
              y={chipY}
              width={chipWidth}
              height={8}
              rx={4}
              fill={achieved ? "#e7f5ec" : "#fdecec"}
            />
            <text
              x={x}
              y={chipY + 5.7}
              textAnchor="middle"
              fontSize={3.7}
              fontWeight={700}
              fill={achieved ? "#2e9e5b" : "#cf4d4d"}
            >
              {chipText}
            </text>
          </g>
        )}
      </g>
    );
  };

  const ActualValueLabel = ({
    x,
    y,
    width,
    value,
  }: {
    x?: number;
    y?: number;
    width?: number;
    value?: number;
  }) => {
    if (x == null || y == null || width == null || value == null) return null;
    const text = Number(value).toLocaleString("ko-KR", { minimumFractionDigits: 0, maximumFractionDigits: 1 });
    return (
      <text
        x={x + width / 2}
        y={y - 3}
        textAnchor="middle"
        fontSize={text.length > 5 ? 6.5 : 7.5}
        fontWeight={700}
        fill="#1a2d4d"
      >
        {text}
      </text>
    );
  };

  return (
    <div style={{ ...cardStyle, display: "flex", flexDirection: "column" }}>
      <div style={{ ...sectionTitle, marginBottom: "5px" }}>
        {t("projectReportTab:salesTitle")}
        <span style={{ fontSize: "10px", fontWeight: 400, color: INK_MUTED, marginLeft: "5px" }}>
          {t("common:unit")}: {unitLabel}
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "9px", marginBottom: "3px" }}>
        <LegendItem label={t("projectReportTab:salesLegendPlan")} color={PLAN_COLOR} />
        <LegendItem label={t("projectReportTab:salesLegendActual")} color={ACTUAL_COLOR} />
        <LegendItem label={t("projectReportTab:salesLegendForecast")} color={ACTUAL_COLOR} forecast />
      </div>

      {!hasData ? (
        <div
          style={{
            minHeight: "190px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "12px",
            color: INK_MUTED,
          }}
        >
          -
        </div>
      ) : (
        <div style={{ flex: 1, minHeight: "180px" }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartData}
              margin={{ top: 20, right: 4, left: -24, bottom: 2 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.gridLine} vertical={false} />
              <XAxis
                dataKey="month"
                tick={<MonthRateTick />}
                axisLine={false}
                tickLine={false}
                height={42}
                interval={0}
              />
              <XAxis dataKey="month" xAxisId="overlay" hide />
              <YAxis
                domain={[0, "auto"]}
                tick={{ fontSize: 7.5, fill: chartTheme.axisText }}
                width={42}
                tickFormatter={(value: number) => value.toLocaleString("ko-KR", { minimumFractionDigits: 0, maximumFractionDigits: 1 })}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<SalesTooltip fmtMoney={fmtMoney} />} />
              <Bar
                dataKey="plan"
                name={t("projectReportTab:salesLegendPlan")}
                fill={PLAN_COLOR}
                barSize={18}
                maxBarSize={18}
                radius={[4, 4, 0, 0]}
                isAnimationActive={false}
              />
              <Bar
                dataKey="actual"
                xAxisId="overlay"
                name={`${t("common:revenue")}(${t("common:actual")}/${t("common:forecast")})`}
                fill={ACTUAL_COLOR}
                barSize={9}
                maxBarSize={9}
                radius={[3, 3, 0, 0]}
                isAnimationActive={false}
              >
                {chartData.map((row, index) => (
                  <Cell
                    key={`${row.month}-${index}`}
                    fill={row.isForecast ? "transparent" : ACTUAL_COLOR}
                    stroke={row.isForecast ? ACTUAL_COLOR : undefined}
                    strokeWidth={row.isForecast ? 2 : 0}
                    strokeDasharray={row.isForecast ? "2 2" : undefined}
                  />
                ))}
                <LabelList dataKey="actual" content={<ActualValueLabel />} />
              </Bar>
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
      <div
        style={{
          borderTop: "1px solid #dfe6ef",
          marginTop: "4px",
          paddingTop: "6px",
          display: "flex",
          flexDirection: "column",
          gap: "4px",
        }}
      >
        <SalesSummaryRow label={t("projectReportTab:annualCumulativeShort")} summary={annualSummary} fmtMoney={fmtMoney} />
        <SalesSummaryRow label={t("projectReportTab:overallCumulativeLabel")} summary={overallSummary} fmtMoney={fmtMoney} />
        {/* Overall Cumulative Actual이 Annual Cumulative Actual과 같아 보이는 것은 버그가 아니라, 현장 시작부터
            올해 이전 실적(전년 누계)을 아직 입력하지 않았을 때 나타나는 정상적인 결과다 — Data Entry 탭
            "2. Monthly Revenue"의 "+ Add Prior-Year Cumulative"로 입력하면 이 값이 달라진다. */}
        <div style={{ fontSize: "9px", color: INK_MUTED, marginTop: "1px" }}>
          {t("projectReportTab:overallCumulativeNote")}
        </div>
      </div>
    </div>
  );
}

function SalesSummaryRow({
  label,
  summary,
  fmtMoney,
}: {
  label: string;
  summary: { plan: number | null; actual: number | null; rate: number | null };
  fmtMoney: (value: number | null | undefined) => string;
}) {
  const { t } = useTranslation(["common"]);
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "92px minmax(0, 1fr) 1px minmax(0, 1fr) 1px minmax(0, 1fr)",
        alignItems: "center",
        columnGap: "7px",
        width: "100%",
        fontSize: "10px",
        color: "#52627a",
      }}
    >
      <span
        style={{
          fontWeight: 700,
          color: "#1a2d4d",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {label}
      </span>
      <span style={{ textAlign: "center", whiteSpace: "nowrap" }}>
        {t("common:plan")} <strong style={{ color: "#1a2d4d" }}>{fmtMoney(summary.plan)}</strong>
      </span>
      <span style={{ color: "#aab5c4" }}>|</span>
      <span style={{ textAlign: "center", whiteSpace: "nowrap" }}>
        {t("common:actual")} <strong style={{ color: "#1a2d4d" }}>{fmtMoney(summary.actual)}</strong>
      </span>
      <span style={{ color: "#aab5c4" }}>|</span>
      <span style={{ textAlign: "right", whiteSpace: "nowrap" }}>
        {t("common:achievementRate")}{" "}
        <strong style={{ color: chartTheme.rateOrange }}>
          {summary.rate == null ? "-" : `${summary.rate}%`}
        </strong>
      </span>
    </div>
  );
}