import React, { useEffect, useMemo, useState } from "react";
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

// 출금(음수) 막대 라벨 — Recharts의 position="bottom"은 음수 막대에서 height가 음수로 들어와
// 막대 "아래 끝"이 아니라 0 기준선(입금 막대 바로 밑)에 라벨이 찍혀 입금 숫자와 겹친다(실사용자 요청).
// 막대의 실제 아래 끝(y, y+height 중 큰 값) 기준으로 직접 그린다.
function cashOutLabel(fill: string) {
  return (props: any) => {
    const { x, y, width, height, value } = props;
    const v = Number(value);
    if (!v) return null;
    const bottom = Math.max(Number(y), Number(y) + Number(height));
    return (
      <text
        x={Number(x) + Number(width) / 2}
        y={bottom + 6}
        dy="0.71em"
        textAnchor="middle"
        fontSize={12}
        fontWeight={700}
        fill={fill}
      >
        {Math.abs(v).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
      </text>
    );
  };
}

const fmtFull = (v: number) =>
  v.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });

// 축 눈금 라벨 — VND 원 단위처럼 자릿수가 큰 값은 그대로 찍으면(예: "3.000.000.000") 축 영역을 넘어
// 잘린다(실사용자 보고). 백만 이상이면 B/M 축약 표기로 바꾼다(천 USD처럼 작은 값은 그대로).
function fmtAxis(v: number): string {
  const abs = Math.abs(v);
  const trim = (n: number) => Number(n.toFixed(1)).toLocaleString(undefined, { maximumFractionDigits: 1 });
  if (abs >= 1e9) return `${trim(v / 1e9)}B`;
  if (abs >= 1e6) return `${trim(v / 1e6)}M`;
  return fmtFull(v);
}

// 텍스트 길이 기반 대략적 픽셀 폭(11~12px 굵은 숫자 기준) — 축 폭/컬럼 폭 계산용.
const textWidth = (s: string, px = 7.2) => Math.ceil(s.length * px);

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
  // 공식 월별 환율(dashboard_common_exchangerate_1q.jsp) 실데이터가 없으면 DEFAULT_EXCHANGE_RATES 같은
  // 가짜 환율로 대체하지 않는다 — VND: 0으로 두면 convertMoney()가 변환 없이 원본 그대로 반환하므로,
  // 실제 환율이 없을 때는 항상 VND로 보여준다(잘못된 환율로 계산된 숫자를 보여주는 것보다 안전).
  const usdRow = officialRateQuery.data?.find((r) => r.currency === "USD");
  const officialRates = useMemo(() => {
    if (!usdRow) return { USD: 1, VND: 0, KRW: 0 };
    const krwRow = officialRateQuery.data?.find((r) => r.currency === "KRW");
    return {
      USD: 1,
      VND: usdRow.rate,
      KRW: krwRow ? krwRow.rate : DEFAULT_EXCHANGE_RATES.KRW,
    };
  }, [officialRateQuery.data, usdRow]);
  const effectiveCurrency = usdRow != null ? currency : "VND";
  const convert = (v: number) => convertMoney(v, effectiveCurrency, unitOn, officialRates);
  const unitLabel = moneyUnitLabel(effectiveCurrency, unitOn);

  // 보조: 데이터 입력 탭에서 저장한 프로젝트별 자금 데이터 (pd_cashflow_monthly)
  const { detail, isLoading: pdLoading } = useProjectDetail(projectName);
  const parseYm = (value: string | null | undefined) => {
    const match = /^(\d{4})-(\d{1,2})/.exec(value ?? "");
    return match ? { year: Number(match[1]), month: Number(match[2]) } : null;
  };
  const siteStart = parseYm(detail?.overview?.startDate);
  const siteEnd = parseYm(detail?.overview?.endDate);
  // 데이터 입력 탭 "6. Monthly Cash Flow"는 프로젝트 기간(overview.startDate~endDate)과 무관하게 어느
  // 연/월이든 자유롭게 행을 추가할 수 있다(다음 달 추가 버튼은 마지막 행 다음 달, 행이 없으면 그냥
  // "올해"부터 시작) — 계약 기간이 끝난 뒤에도 실제 정산이 이어지거나, overview 종료일이 아직
  // 갱신되지 않은 경우가 흔하다. 그런데 예전엔 이 컴포넌트가 pd_cashflow_monthly(이미 이 프로젝트로
  // 필터링되어 내려온 데이터)까지 overview 기간으로 다시 한번 걸러서, 그 기간 밖에 입력된 행이
  // 전부 조용히 사라지고(달력엔 데이터가 뻔히 보이는데 차트/연도 선택은 완전히 빈 상태) "No cash
  // flow data for the selected period."가 표시되는 버그가 있었다(실제 발견됨: K2CT1 프리콘 —
  // 프로젝트 기간은 '23.05~'25.12인데 자금 데이터는 '26.01~'26.08에 입력됨). 실제 입력된 데이터의
  // 연/월 범위와 overview 기간을 합집합으로 잡아서, 입력된 행은 하나도 누락되지 않게 한다.
  const cashflowRowsRaw = detail?.cashflow ?? [];
  const rowIdx = (c: { year: number; month: number }) => c.year * 12 + (c.month - 1);
  const rowIdxs = cashflowRowsRaw.map(rowIdx);
  const siteStartIdx = siteStart ? siteStart.year * 12 + (siteStart.month - 1) : null;
  const siteEndIdx = siteEnd ? siteEnd.year * 12 + (siteEnd.month - 1) : null;
  const fallbackStartIdx = fromYear * 12 + (fromMonth - 1);
  const rangeBoundsStart = [siteStartIdx, ...rowIdxs].filter((v): v is number => v != null);
  const rangeBoundsEnd = [siteEndIdx, ...rowIdxs].filter((v): v is number => v != null);
  const rangeStartIdx = rangeBoundsStart.length ? Math.min(...rangeBoundsStart) : fallbackStartIdx;
  const rangeEndIdx = rangeBoundsEnd.length ? Math.max(...rangeBoundsEnd) : fallbackStartIdx + months - 1;
  const effectiveFromYear = Math.floor(rangeStartIdx / 12);
  const effectiveFromMonth = (rangeStartIdx % 12) + 1;
  const effectiveMonths = Math.min(Math.max(rangeEndIdx - rangeStartIdx + 1, 1), 120);
  const startIdx = rangeStartIdx;
  const pdPoints = cashflowRowsRaw
    .filter((c: any) => {
      const idx = rowIdx(c);
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
  // 전체 기간(여러 해)을 한 화면에 다 그리면 개월 수가 너무 많아 막대가 안 보이고, 다른 해에 있는
  // 특이값 하나 때문에 Y축 스케일이 늘어나 나머지 달이 다 눌려 보인다 — 연도 선택 추가, 기본값은
  // 오늘 날짜 기준 올해(미래 전망 연도가 아니라 실제 현재 연도) — 데이터에 올해가 없으면 가장
  // 가까운 해로 대체한다.
  const availableCfYears = Array.from(new Set(points.map((p: any) => Number(p.month.slice(0, 4))))).sort(
    (a, b) => a - b,
  );
  const [selectedCfYear, setSelectedCfYear] = useState(() => new Date().getFullYear());
  // 최초 렌더링 시점엔 쿼리가 아직 로딩 중이라 points/availableCfYears가 비어 있어(위 useState
  // 초기화 함수는 딱 한 번만 실행됨), 프로젝트 기간이 이미 종료돼 "올해"가 데이터 범위 밖인 용역
  // 현장(예: 계약기간이 2025.12에 끝났는데 오늘이 2026년)에서는 selectedCfYear가 존재하지 않는
  // 연도(2026)에 영구히 고정되어, 실제로는 데이터가 있는데도 "No cash flow data for the selected
  // period."로 잘못 표시되는 문제가 있었다(실제 발견됨). 데이터가 로드된 뒤 선택된 연도가 목록에
  // 없으면 가장 가까운 연도로 보정한다.
  useEffect(() => {
    if (availableCfYears.length === 0 || availableCfYears.includes(selectedCfYear)) return;
    const currentYear = new Date().getFullYear();
    const closest = availableCfYears.reduce((closestYear, y) =>
      Math.abs(y - currentYear) < Math.abs(closestYear - currentYear) ? y : closestYear,
    );
    setSelectedCfYear(closest);
  }, [availableCfYears.join(","), selectedCfYear]);
  const yearPoints = points.filter((p: any) => Number(p.month.slice(0, 4)) === selectedCfYear);
  const chartData = yearPoints.map((p: any) => ({
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

  // 입금/출금 막대와 잔액(equivalent) 선은 값 크기가 크게 달라(잔액이 훨씬 큼) 같은 축을 쓰면 막대가
  // 0 근처에 짓눌려 거의 안 보인다 — 막대는 왼쪽 축(자기 값 범위), 잔액 선은 오른쪽 보조축(자기 값
  // 범위)으로 분리해서 둘 다 잘 보이게 한다.
  const maxVal = Math.max(...chartData.map((d: any) => Math.max(d.cashIn, 0)), 0);
  const minVal = Math.min(...chartData.map((d: any) => Math.min(d.cashOut, 0)), 0);
  // 막대는 플롯 아래쪽 밴드(CASH_BAND)만 쓰므로 눈금 수를 줄인다(약 5칸).
  const step = niceStep(((maxVal - minVal) || 10) * 8 / 5);
  // +1 step 여유를 둬서 막대 꼭대기와 차트 맨 위 사이에 빈 공간을 만든다 - 그래야 그 위 공간을
  // 지나가는 잔액(오른쪽 축) 선과 막대 위 숫자 라벨이 서로 붙지 않고 뚜렷하게 분리되어 보인다.
  const top = (Math.ceil(maxVal / step) + 1) * step || step;
  // 출금 라벨을 막대 아래 끝에 그리므로(cashOutLabel) 아래쪽도 -1 step 여유를 둬서 라벨이 X축
  // 월 라벨과 겹치거나 잘리지 않게 한다.
  const bottom = (Math.floor(minVal / step) - (minVal < 0 ? 1 : 0)) * step;
  const ticks: number[] = [];
  for (let t = bottom; t <= top; t += step) ticks.push(t);

  const balanceMax = Math.max(...chartData.map((d: any) => d.equivalent), 0);
  const balanceMin = Math.min(...chartData.map((d: any) => d.equivalent), 0);
  // 잔액 선은 위쪽 밴드만 쓰므로 눈금은 3칸 정도로 둔다.
  const balanceStep = niceStep(((balanceMax - balanceMin) || 10) * 8 / 3);
  const balanceTop = Math.ceil(balanceMax / balanceStep) * balanceStep || balanceStep;
  const balanceBottom = Math.floor(balanceMin / balanceStep) * balanceStep;
  const balanceTicks: number[] = [];
  for (let v = balanceBottom; v <= balanceTop; v += balanceStep) balanceTicks.push(v);

  // 잔액 선과 입금/출금 막대가 같은 플롯 영역에 겹쳐 그려져 선/라벨이 막대·막대 숫자와 뒤엉켜 읽기
  // 어렵다는 요청(잔액이 음수로 내려가면 특히 심함) — 세로로 두 밴드로 분리한다: 잔액 선은 위쪽
  // BALANCE_BAND, 막대는 아래쪽 CASH_BAND(비율 = 플롯 높이 기준). 각 축의 domain을 늘려 자기 밴드에만
  // 그려지게 하고, 눈금(ticks)은 자기 값 범위에만 찍는다.
  const CASH_BAND = 0.58; // 아래 0% ~ 58%
  const BALANCE_BAND = { from: 0.7, to: 0.96 }; // 위 70% ~ 96%
  const cashDomain: [number, number] = [bottom, bottom + (top - bottom) / CASH_BAND];
  const balanceRange = balanceTop - balanceBottom || 1;
  const balanceBandHeight = BALANCE_BAND.to - BALANCE_BAND.from;
  const balanceDomain: [number, number] = [
    balanceBottom - (balanceRange * BALANCE_BAND.from) / balanceBandHeight,
    balanceTop + (balanceRange * (1 - BALANCE_BAND.to)) / balanceBandHeight,
  ];

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
    // 컬럼 폭 — 기본 90px, 막대/잔액 숫자 라벨(VND는 15자 이상)이 옆 컬럼 라벨과 겹치지 않게 가장 긴
    // 라벨 폭 + 여백 이상으로 넓힌다. 좌/우 축 폭도 가장 긴 눈금 라벨에 맞춘다(잘림 방지).
    const longestValueLabel = Math.max(
      ...chartData.flatMap((d: any) => [d.cashIn, d.cashOut, d.equivalent].map((v: number) => fmtFull(Math.abs(v ?? 0)).length + (v < 0 ? 1 : 0))),
      1,
    );
    const columnWidth = Math.max(90, textWidth("x".repeat(longestValueLabel)) + 24);
    const cashAxisWidth = Math.max(40, ...ticks.map((v) => textWidth(fmtAxis(v), 7) + 12));
    const balanceAxisWidth = Math.max(40, ...balanceTicks.map((v) => textWidth(fmtAxis(v), 7) + 12));
    const minChartWidth = Math.max(640, chartData.length * columnWidth + cashAxisWidth + balanceAxisWidth);
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
          <ComposedChart data={chartData} stackOffset="sign" margin={{ top: 36, right: 16, left: 10, bottom: 0 }}>
            <XAxis
              dataKey="month"
              tick={{ fontSize: 12, fill: INK_BODY, fontWeight: 600 }}
              tickLine={false}
              axisLine={{ stroke: chartTheme.axisLine }}
            />
            <YAxis
              yAxisId="cash"
              width={cashAxisWidth}
              tick={{ fontSize: 11, fill: INK_BODY, fontWeight: 600 }}
              tickLine={false}
              axisLine={false}
              domain={cashDomain}
              ticks={ticks}
              tickFormatter={fmtAxis}
            />
            <YAxis
              yAxisId="balance"
              width={balanceAxisWidth}
              orientation="right"
              tick={{ fontSize: 11, fill: chartTheme.actualGreen, fontWeight: 600 }}
              tickLine={false}
              axisLine={false}
              domain={balanceDomain}
              ticks={balanceTicks}
              tickFormatter={fmtAxis}
            />
            <Legend wrapperStyle={{ fontSize: "14px", fontWeight: 600 }} iconSize={14} />
            <ReferenceLine yAxisId="cash" y={0} stroke={chartTheme.sgaOrange} strokeDasharray="3 3" />
            {chartData.some((point) => point.month === referenceLabel) && (
              <ReferenceLine
                yAxisId="cash"
                x={referenceLabel}
                stroke={chartTheme.outflowRed}
                strokeDasharray="4 4"
                label={{
                  value: t("serviceCashflowTab:referenceMonth"),
                  position: "top",
                  fontSize: 11,
                  fill: INK_MUTED,
                }}
              />
            )}
            <Line
              yAxisId="balance"
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
                content={(props: any) => {
                  const { x, y, value } = props;
                  if (value === 0 || value == null) return null;
                  // 잔액 선은 막대와 분리된 위쪽 밴드에만 그려지므로(BALANCE_BAND) 막대 숫자와 겹칠
                  // 일이 없다 — 점 바로 위에 고정 배치한다.
                  const dy = -10;
                  const text = value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
                  // Nhãn này hay rơi trúng vùng đông chữ (đường kẻ "Reference month", nhãn cột bar
                  // bên dưới) khiến số bị chồng lên nhau và không đọc được - vẽ thêm nền trắng bo góc
                  // phía sau chữ để dù có chồng lên vẫn nổi bật và đọc rõ. Line/label này được vẽ
                  // TRƯỚC các Bar bên dưới trong JSX để nhãn số của cột (vẽ sau) luôn nổi lên trên,
                  // không bị khung nền trắng này che mất.
                  const boxWidth = text.length * 7 + 8;
                  return (
                    <g>
                      <rect
                        x={x - boxWidth / 2}
                        y={y + dy - 12}
                        width={boxWidth}
                        height={16}
                        rx={3}
                        fill="#fff"
                        fillOpacity={0.9}
                        stroke={chartTheme.actualGreen}
                        strokeOpacity={0.25}
                      />
                      <text
                        x={x}
                        y={y + dy}
                        textAnchor="middle"
                        fontSize={12}
                        fontWeight={700}
                        fill={chartTheme.actualGreen}
                      >
                        {text}
                      </text>
                    </g>
                  );
                }}
              />
            </Line>
            <Bar
              yAxisId="cash"
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
                position="top"
                offset={6}
                style={{ fontSize: "12px", fill: chartTheme.inflowBlue, fontWeight: 700 }}
                formatter={(v: number) => (v !== 0 ? v.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : "")}
              />
            </Bar>
            <Bar
              yAxisId="cash"
              dataKey="cashOutActual"
              name={t("serviceCashflowTab:actualCashOut")}
              fill={chartTheme.actualGreen}
              barSize={barSize}
              stackId="cash"
              isAnimationActive={false}
              radius={[0, 0, 4, 4]}
            >
              <LabelList dataKey="cashOutActual" content={cashOutLabel(chartTheme.actualGreen)} />
            </Bar>
            <Bar
              yAxisId="cash"
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
                position="top"
                offset={6}
                style={{ fontSize: "12px", fill: chartTheme.inflowBlue, fontWeight: 700 }}
                formatter={(v: number) => (v !== 0 ? v.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : "")}
              />
            </Bar>
            <Bar
              yAxisId="cash"
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
              <LabelList dataKey="cashOutForecast" content={cashOutLabel(chartTheme.actualGreen)} />
            </Bar>
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
              {/* 표시 기간은 실제로 차트에 반영되는 effectiveFromYear/effectiveMonths(overview 기간과
                  입력된 자금 데이터의 합집합) 기준으로 보여준다 — siteStart~siteEnd만 쓰면, 계약 기간
                  밖에 입력된 달(위 rangeStartIdx/rangeEndIdx 계산 참고)이 차트엔 나오는데 헤더 라벨은
                  그 달을 포함하지 않는 것처럼 보여 혼란을 준다. */}
              ({`${effectiveFromYear}.${String(effectiveFromMonth).padStart(2, "0")} ~ ${Math.floor((rangeEndIdx) / 12)}.${String((rangeEndIdx % 12) + 1).padStart(2, "0")}`} · {t("serviceCashflowTab:outlookAfterReference")})
            </span>
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
            <select
              value={selectedCfYear}
              onChange={(event) => setSelectedCfYear(Number(event.target.value))}
              aria-label={t("common:year")}
              style={{
                padding: "4px 22px 4px 8px",
                border: "1px solid #dbe2ea",
                borderRadius: "3px",
                backgroundColor: "#fff",
                color: INK_BODY,
                fontFamily: "inherit",
                fontSize: "12px",
                fontWeight: 600,
                lineHeight: 1.4,
              }}
            >
              {availableCfYears.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <span style={{ fontSize: "11px", color: INK_MUTED }}>
              {useCf && query.data
                ? `${t("common:unit")}: ${cfConvertible ? unitLabel : query.data.unit}`
                : hasPdData
                  ? `${t("common:unit")}: ${unitLabel}`
                  : ""}
            </span>
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
