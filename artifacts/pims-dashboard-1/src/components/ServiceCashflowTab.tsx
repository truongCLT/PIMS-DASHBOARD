import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ProjectCommentPanel } from "./ProjectCommentPanel";

import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  ReferenceLine,
  ResponsiveContainer,
  Legend,
  LabelList,
} from "recharts";
import {
  useGetCashflowMonthly,
  getGetCashflowMonthlyQueryKey,
  useGetPimsvinaExchangerate,
} from "@workspace/api-client-react";
import { getMrCashflowRef } from "../data/mrProjectLinks";
import { useProjectDetail } from "../lib/projectDetailData";
import { chartTheme } from "../lib/chartTheme";
import { useMoney, convertMoney, moneyUnitLabel, DEFAULT_EXCHANGE_RATES } from "../lib/displayUnit";
import { cardStyle, sectionTitle, emptyNote, INK_MUTED, INK_BODY } from "../lib/uiTokens";

type TFn = ReturnType<typeof useTranslation>["t"];

function monthLabel(ym: string, t: TFn): string {
  const m = Number(ym.slice(5, 7));
  const year = ym.slice(0, 4);
  return t("serviceCashflowTab:monthLabel", { month: m, yy: ym.slice(2, 4), year });
}

function niceStep(range: number): number {
  const raw = range / 8;
  const pow = Math.pow(10, Math.floor(Math.log10(Math.max(raw, 1))));
  for (const mult of [1, 2, 5, 10]) {
    if (raw <= mult * pow) return mult * pow;
  }
  return 10 * pow;
}

export function ServiceCashflowTab({
  projectName,
  fromYear,
  fromMonth,
  months,
  toYear,
  toMonth,
}: {
  projectName: string;
  fromYear: number;
  fromMonth: number;
  months: number;
  toYear: number;
  toMonth: number;
}) {
  const { t } = useTranslation(["serviceCashflowTab", "common"]);
  // Cashflow 탭은 (사이트별 계약 환율이 아닌) PIMSVINA의 공식 월별 환율(최신월)을 사용한다.
  const { currency, unitOn } = useMoney();
  const officialRateQuery = useGetPimsvinaExchangerate({ query: { staleTime: 5 * 60_000 } });
  const officialRates = useMemo(() => {
    const usdRow = officialRateQuery.data?.find((r) => r.currency === "USD");
    if (!usdRow) return DEFAULT_EXCHANGE_RATES;
    const krwRow = officialRateQuery.data?.find((r) => r.currency === "KRW");
    return {
      USD: 1,
      VND: usdRow.rate,
      KRW: krwRow ? krwRow.rate : DEFAULT_EXCHANGE_RATES.KRW,
    };
  }, [officialRateQuery.data]);
  const convert = (v: number) => convertMoney(v, currency, unitOn, officialRates);
  const unitLabel = moneyUnitLabel(currency, unitOn);

  // 보조: 데이터 입력 탭에서 저장한 프로젝트별 자금 데이터 (pd_cashflow_monthly)
  const { detail, isLoading: pdLoading } = useProjectDetail(projectName);
  const parseYm = (value: string | null | undefined) => {
    const match = /^(\d{4})-(\d{1,2})/.exec(value ?? "");
    return match ? { year: Number(match[1]), month: Number(match[2]) } : null;
  };
  const siteStart = parseYm(detail?.overview?.startDate);
  const siteEnd = parseYm(detail?.overview?.endDate);
  const effectiveFromYear = siteStart?.year ?? fromYear;
  const effectiveFromMonth = siteStart?.month ?? fromMonth;
  const siteRangeMonths =
    siteStart && siteEnd
      ? Math.max(
          1,
          (siteEnd.year - siteStart.year) * 12 + (siteEnd.month - siteStart.month) + 1,
        )
      : months;
  const effectiveMonths = Math.min(siteRangeMonths, 120);
  const startIdx = effectiveFromYear * 12 + (effectiveFromMonth - 1);
  const pdPoints = (detail?.cashflow ?? [])
    .filter((c: any) => {
      const idx = c.year * 12 + (c.month - 1);
      return idx >= startIdx && idx < startIdx + effectiveMonths;
    })
    .map((c: any) => ({
      month: `${c.year}-${String(c.month).padStart(2, "0")}`,
      cashIn: c.cashIn ?? 0,
      cashOut: c.cashOut ?? 0,
      equivalent: c.equivalent ?? 0,
    }));
  const hasPdData = pdPoints.some((p: any) => p.cashIn !== 0 || p.cashOut !== 0 || p.equivalent !== 0);
  // 저장된 pd 행이 존재하면(값이 모두 0이어도) pd 데이터를 우선 사용
  const hasPdRows = (detail?.cashflow ?? []).length > 0;

  // 자금수지 Excel(cf_*) DB 데이터 — 저장된 pd 데이터가 없을 때 사용
  const cfRef = getMrCashflowRef(projectName);
  const params = {
    projectName: cfRef?.name ?? "",
    division: cfRef?.division,
    fromYear: effectiveFromYear,
    fromMonth: effectiveFromMonth,
    months: effectiveMonths,
  };
  const query = useGetCashflowMonthly(params, {
    query: {
      enabled: cfRef != null,
      queryKey: getGetCashflowMonthlyQueryKey(params),
    },
  });
  const cfPoints = query.data?.points ?? [];
  const hasCfData = cfPoints.some((p: any) => p.cashIn !== 0 || p.cashOut !== 0 || p.equivalent !== 0);

  // 우선순위: 데이터 입력 탭에서 저장한 행(pd_*)이 있으면 그 값을, 없으면 자금수지 Excel(cf_*) 값을 표시
  const useCf = cfRef != null && hasCfData && !hasPdRows;
  const points = hasPdRows ? pdPoints : cfPoints;
  // cf_* 데이터는 자체 단위 문자열을 갖고 있어 "천 USD" 기반일 때만 통화/단위 변환 적용
  const cfConvertible = (query.data?.unit ?? "").includes("USD");
  const applyConvert = hasPdRows || cfConvertible;
  const cv = (v: number) => (applyConvert ? convert(v) : v);
  const chartData = points.map((p: any) => ({
    month: monthLabel(p.month, t),
    cashIn: cv(p.cashIn),
    cashOut: -cv(p.cashOut),
    cashInActual: Number(p.month.slice(0, 4)) * 12 + Number(p.month.slice(5, 7)) - 1 <= toYear * 12 + toMonth - 1 ? cv(p.cashIn) : 0,
    cashOutActual: Number(p.month.slice(0, 4)) * 12 + Number(p.month.slice(5, 7)) - 1 <= toYear * 12 + toMonth - 1 ? -cv(p.cashOut) : 0,
    cashInForecast: Number(p.month.slice(0, 4)) * 12 + Number(p.month.slice(5, 7)) - 1 > toYear * 12 + toMonth - 1 ? cv(p.cashIn) : 0,
    cashOutForecast: Number(p.month.slice(0, 4)) * 12 + Number(p.month.slice(5, 7)) - 1 > toYear * 12 + toMonth - 1 ? -cv(p.cashOut) : 0,
    equivalent: cv(p.equivalent),
    different: cv(p.cashIn) - cv(p.cashOut),
  }));
  const referenceLabel = monthLabel(
    `${toYear}-${String(toMonth).padStart(2, "0")}`,
    t,
  );

  const maxVal = Math.max(...chartData.map((d: any) => Math.max(d.cashIn, d.equivalent, 0)), 0);
  const minVal = Math.min(...chartData.map((d: any) => Math.min(d.cashOut, d.equivalent, 0)), 0);
  const step = niceStep(maxVal - minVal || 10);
  const top = Math.ceil(maxVal / step) * step || step;
  const bottom = Math.floor(minVal / step) * step;
  const ticks: number[] = [];
  for (let t = bottom; t <= top; t += step) ticks.push(t);

  const hasData = chartData.some((d: any) => d.cashIn !== 0 || d.cashOut !== 0 || d.equivalent !== 0);

  const entryGuide = (
    <div style={{ fontSize: "14px", color: INK_MUTED, marginTop: "8px" }}>
      {t("serviceCashflowTab:entryGuide")}
    </div>
  );

  let body: React.ReactNode;
  if (pdLoading || (cfRef != null && query.isLoading)) {
    body = (
      <div style={emptyNote}>
        {t("serviceCashflowTab:loadingCashflow")}
      </div>
    );
  } else if (cfRef == null && !hasPdData) {
    body = (
      <div style={emptyNote}>
        {t("serviceCashflowTab:noCashflowDataYet")}
        {entryGuide}
      </div>
    );
  } else if (!useCf && !hasPdData && query.isError) {
    const status = (query.error as { status?: number } | null)?.status;
    body = (
      <div style={{ ...emptyNote, color: status === 404 ? INK_MUTED : chartTheme.outflowRed }}>
        {status === 404 ? (
          <>
            {t("serviceCashflowTab:noProjectCashflowData")}
            {entryGuide}
          </>
        ) : (
          t("serviceCashflowTab:fetchFailed")
        )}
      </div>
    );
  } else if (!hasData) {
    body = (
      <div style={emptyNote}>
        {t("serviceCashflowTab:noDataInPeriod")}
        {entryGuide}
      </div>
    );
  } else {
    // 월 수에 따라 최소 컬럼 너비 90px 보장 → 막대가 충분히 넓게 표시됨
    const minChartWidth = Math.max(640, chartData.length * 90);
    const barSize = Math.max(32, Math.min(80, Math.floor((minChartWidth / chartData.length) * 0.5)));
    body = (
      // 가로 스크롤: 월 수가 많아도 막대 너비 유지
      <div style={{ overflowX: "auto", marginTop: "10px" }}>
        <div style={{
          minWidth: `${minChartWidth}px`,
          // 뷰포트 높이에서 고정 UI 영역(헤더·탭·카드 헤더·범례·코멘트·패딩) 제외
          height: "calc(100vh - 390px)",
          minHeight: "260px",
          maxHeight: "540px",
        }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} stackOffset="sign" margin={{ top: 10, right: 16, left: 10, bottom: 0 }}>
            <XAxis
              dataKey="month"
              tick={{ fontSize: 12, fill: INK_BODY, fontWeight: 600 }}
              tickLine={false}
              axisLine={{ stroke: chartTheme.axisLine }}
            />
            <YAxis
              tick={{ fontSize: 11, fill: INK_BODY, fontWeight: 600 }}
              tickLine={false}
              axisLine={false}
              domain={[bottom, top]}
              ticks={ticks}
              tickFormatter={(v: number) => v.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 1 })}
            />
            <Legend wrapperStyle={{ fontSize: "14px", fontWeight: 600 }} iconSize={14} />
            <ReferenceLine y={0} stroke={chartTheme.sgaOrange} strokeDasharray="3 3" />
            {chartData.some((point) => point.month === referenceLabel) && (
              <ReferenceLine
                x={referenceLabel}
                stroke={chartTheme.outflowRed}
                strokeDasharray="4 4"
                label={{
                  value: t("serviceCashflowTab:referenceMonth"),
                  position: "insideTopRight",
                  fontSize: 11,
                  fill: INK_MUTED,
                }}
              />
            )}
            <Bar
              dataKey="cashInActual"
              name={t("serviceCashflowTab:actualCashIn")}
              fill={chartTheme.inflowBlue}
              barSize={barSize}
              stackId="cash"
              isAnimationActive={false}
              radius={[4, 4, 0, 0]}
            >
              <LabelList
                dataKey="cashInActual"
                position="center"
                style={{ fontSize: "13px", fill: "#fff", fontWeight: 700 }}
                formatter={(v: number) => (v !== 0 ? v.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 1 }) : "")}
              />
            </Bar>
            <Bar
              dataKey="cashOutActual"
              name={t("serviceCashflowTab:actualCashOut")}
              fill={chartTheme.actualGreen}
              barSize={barSize}
              stackId="cash"
              isAnimationActive={false}
              radius={[0, 0, 4, 4]}
            >
              <LabelList
                dataKey="cashOutActual"
                position="center"
                style={{ fontSize: "13px", fill: "#fff", fontWeight: 700 }}
                formatter={(v: number) => (v !== 0 ? v.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 1 }) : "")}
              />
            </Bar>
            <Bar
              dataKey="cashInForecast"
              name={t("serviceCashflowTab:forecastCashIn")}
              fill="#fff"
              stroke={chartTheme.inflowBlue}
              strokeWidth={1.5}
              strokeDasharray="4 3"
              barSize={barSize}
              stackId="cash"
              isAnimationActive={false}
            >
              <LabelList
                dataKey="cashInForecast"
                position="center"
                style={{ fontSize: "13px", fill: chartTheme.inflowBlue, fontWeight: 700 }}
                formatter={(v: number) => (v !== 0 ? v.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 1 }) : "")}
              />
            </Bar>
            <Bar
              dataKey="cashOutForecast"
              name={t("serviceCashflowTab:forecastCashOut")}
              fill="#fff"
              stroke={chartTheme.actualGreen}
              strokeWidth={1.5}
              strokeDasharray="4 3"
              barSize={barSize}
              stackId="cash"
              isAnimationActive={false}
            >
              <LabelList
                dataKey="cashOutForecast"
                position="center"
                style={{ fontSize: "13px", fill: chartTheme.actualGreen, fontWeight: 700 }}
                formatter={(v: number) => (v !== 0 ? v.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 1 }) : "")}
              />
            </Bar>
            <Line
              dataKey="equivalent"
              name={t("serviceCashflowTab:balance")}
              type="linear"
              stroke={chartTheme.actualGreen}
              strokeWidth={2}
              dot={{ r: 3, fill: "#fff", stroke: chartTheme.actualGreen }}
              isAnimationActive={false}
            >
              <LabelList
                dataKey="equivalent"
                position="top"
                style={{ fontSize: "12px", fill: chartTheme.actualGreen, fontWeight: 700 }}
                formatter={(v: number) =>
                  v !== 0 ? v.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 1 }) : ""
                }
              />
            </Line>
          </ComposedChart>
        </ResponsiveContainer>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      {/* Cashflow */}
      <div style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={sectionTitle}>
            {t("common:cashFlow")}
            <span style={{ fontSize: "11px", fontWeight: 400, color: INK_MUTED, marginLeft: "6px" }}>
              ({siteStart && siteEnd
                ? `${siteStart.year}.${String(siteStart.month).padStart(2, "0")} ~ ${siteEnd.year}.${String(siteEnd.month).padStart(2, "0")}`
                : t("serviceCashflowTab:fromMonth", {
                    year: effectiveFromYear,
                    month: String(effectiveFromMonth).padStart(2, "0"),
                  })} · {t("serviceCashflowTab:outlookAfterReference")})
            </span>
          </span>
          <span style={{ fontSize: "11px", color: INK_MUTED }}>
            {useCf && query.data
              ? `${t("common:unit")}: ${cfConvertible ? unitLabel : query.data.unit}`
              : hasPdData
                ? `${t("common:unit")}: ${unitLabel}`
                : ""}
          </span>
        </div>
        {body}
      </div>

      {/* Comment */}
      <div style={cardStyle}>
        <ProjectCommentPanel projectName={projectName} tab="cashflow" />
      </div>
    </div>
  );
}
