import { useGetFxRatesHistory } from "@workspace/api-client-react";
import { DEFAULT_EXCHANGE_RATES } from "./displayUnit";

/**
 * "월별 매출 환율 설정"(fx_rates/history)으로 입력된 연·월별 환율을 Map으로 만들어, 매출 관련
 * 화면(여러 달을 한 번에 보여주는 차트·표)이 각 달의 값을 변환할 때 "현재/계약 환율" 1개를 전체에
 * 적용하는 대신 그 달에 실제로 입력된 환율을 쓸 수 있게 한다. 해당 달에 입력된 환율이 없으면 null을
 * 반환하므로, 호출하는 쪽에서 기존 환율(현재 환율/계약 환율)로 폴백한다.
 */
export function useMonthlyFxRates() {
  const historyQuery = useGetFxRatesHistory({
    query: { queryKey: ["monthlyFxRatesForRevenue"] },
  });
  const history = historyQuery.data ?? [];

  const getRatesForMonth = (year: number, month: number): Record<string, number> | null => {
    const krwRow = history.find((r) => r.currency === "KRW" && r.year === year && r.month === month);
    const vndRow = history.find((r) => r.currency === "VND" && r.year === year && r.month === month);
    if (!krwRow && !vndRow) return null;
    return {
      USD: 1,
      KRW: krwRow?.rate ?? DEFAULT_EXCHANGE_RATES.KRW,
      VND: vndRow?.rate ?? DEFAULT_EXCHANGE_RATES.VND,
    };
  };

  return { getRatesForMonth, isLoading: historyQuery.isLoading };
}
