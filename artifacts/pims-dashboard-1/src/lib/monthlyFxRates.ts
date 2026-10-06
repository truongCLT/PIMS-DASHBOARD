import { useGetFxRatesHistory, getGetFxRatesHistoryQueryKey } from "@workspace/api-client-react";
import { DEFAULT_EXCHANGE_RATES } from "./displayUnit";

/**
 * "월별 매출 환율 설정"(fx_rates/history)으로 입력된 연·월별 환율을 Map으로 만들어, 매출 관련
 * 화면(여러 달을 한 번에 보여주는 차트·표)이 각 달의 값을 변환할 때 "현재/계약 환율" 1개를 전체에
 * 적용하는 대신 그 달에 실제로 입력된 환율을 쓸 수 있게 한다. 해당 달에 입력된 환율이 없으면 null을
 * 반환하므로, 호출하는 쪽에서 기존 환율(현재 환율/계약 환율)로 폴백한다.
 */
export type FxRatePurpose = "actual_forecast" | "plan";

export function useMonthlyFxRates() {
  // FxRateMonthlyEditor가 저장 후 getGetFxRatesHistoryQueryKey()로 무효화하므로, 여기서도
  // 같은 queryKey를 써야 저장 직후 이 화면들(매출 Plan/Actual/Forecast)이 즉시 갱신된다.
  // 별도의 커스텀 key("monthlyFxRatesForRevenue")를 쓰면 그 무효화가 여기엔 적용되지 않아
  // 새로고침 전까지 옛 값을 계속 보여주는 버그가 있었다.
  const historyQuery = useGetFxRatesHistory(undefined, {
    query: { queryKey: getGetFxRatesHistoryQueryKey() },
  });
  const history = historyQuery.data ?? [];

  // purpose 기본값은 "actual_forecast"(실적/전망). 계획 매출 환산 쪽만 "plan"을 넘겨서 쓴다.
  const getRatesForMonth = (
    year: number,
    month: number,
    purpose: FxRatePurpose = "actual_forecast",
  ): Record<string, number> | null => {
    const krwRow = history.find(
      (r) => r.currency === "KRW" && r.year === year && r.month === month && (r.purpose ?? "actual_forecast") === purpose,
    );
    const vndRow = history.find(
      (r) => r.currency === "VND" && r.year === year && r.month === month && (r.purpose ?? "actual_forecast") === purpose,
    );
    if (!krwRow && !vndRow) return null;
    return {
      USD: 1,
      KRW: krwRow?.rate ?? DEFAULT_EXCHANGE_RATES.KRW,
      VND: vndRow?.rate ?? DEFAULT_EXCHANGE_RATES.VND,
    };
  };

  return { getRatesForMonth, isLoading: historyQuery.isLoading };
}
