import React, { createContext, useContext, useMemo } from "react";

/**
 * 프로젝트 대시보드 표시 통화/단위 컨텍스트.
 * 기준 데이터 단위: 천 USD (1K USD).
 * 기본 환율 (1 USD 기준) — PIMSVINA에서 값을 가져오지 못했을 때의 최종 대체값.
 */
export const DEFAULT_EXCHANGE_RATES: Record<string, number> = {
  USD: 1,
  KRW: 1350,
  VND: 25400,
};

export type DisplayUnit = {
  currency: string;
  unitOn: boolean;
  /** 천 USD 기준 값 → 표시 통화/단위 값으로 변환 */
  convert: (v: number) => number;
  /** 표시 통화/단위로 입력된 값 → 천 USD 기준 값 (convert()의 역변환, 입력 필드 저장용) */
  convertToKUsd: (v: number) => number;
  /** 천 USD 기준 값 → 포맷된 문자열 ("-" 처리 포함) */
  fmtMoney: (v: number | null | undefined, digits?: number) => string;
  /** 천 USD 기준 값 → 포맷된 문자열, unitOn 배율 무시하고 항상 전체 금액 반환 (fmtVnd()와 동일한
   * "항상 전체 금액" 성격 — VND 원본 필드와 나란히 비교 표시할 때 자릿수를 맞추기 위해 사용) */
  fmtMoneyFull: (v: number | null | undefined) => string;
  /** 단위 라벨 (예: "1K USD", "KRW") */
  unitLabel: string;
  /** VND 원본 그대로 저장된 값 → 선택된 통화로 변환 (환율 없으면 VND 그대로 반환) */
  convertFromVnd: (v: number) => number;
  /** VND 원본 값 → 포맷된 문자열 ("-" 처리 포함, 단위 배율 없음) */
  fmtVnd: (v: number | null | undefined) => string;
  /** VND 원본 값 → 천 USD 기준 값 (다른 천 USD 기준 값과 내부 계산/비교할 때 사용, 표시 통화와 무관) */
  convertVndToKUsd: (v: number) => number;
};

const defaultUnit: DisplayUnit = {
  currency: "USD",
  unitOn: true,
  convert: (v) => v,
  convertToKUsd: (v) => v,
  fmtMoney: (v, digits = 0) =>
    v == null || Number.isNaN(v)
      ? "-"
      : v.toLocaleString("en-US", { maximumFractionDigits: digits, minimumFractionDigits: 0 }),
  fmtMoneyFull: (v) =>
    v == null || Number.isNaN(v) ? "-" : v.toLocaleString("en-US", { maximumFractionDigits: 0 }),
  unitLabel: "천 USD",
  convertFromVnd: (v) => v,
  fmtVnd: (v) =>
    v == null || Number.isNaN(v) ? "-" : v.toLocaleString("en-US", { maximumFractionDigits: 0 }),
  convertVndToKUsd: (v) => v,
};

/** VND 원본 값(그대로 저장된 값) → 선택된 통화로 변환 (순수 함수)
 * 환율(VND)이 없으면 변환하지 않고 VND 그대로 반환 - "check 없이 그대로 저장" 데이터용. */
export function convertFromVndAmount(
  v: number,
  currency: string,
  rates: Record<string, number> = DEFAULT_EXCHANGE_RATES,
): number {
  const vndRate = rates.VND;
  if (!vndRate || currency === "VND") return v;
  return (v / vndRate) * (rates[currency] ?? 1);
}

/** VND 원본 값 → 포맷 문자열 (순수 함수, null → "-", 단위 배율 없음 — formatMoney()와 달리 항상 전체
 * 금액을 반환). useMoney() 훅 없이 순수 함수만 쓰는 곳(예: ProjectDashboard 헤더)에서 사용. */
export function formatVnd(
  v: number | null | undefined,
  currency: string,
  rates: Record<string, number> = DEFAULT_EXCHANGE_RATES,
): string {
  if (v == null || Number.isNaN(v)) return "-";
  return convertFromVndAmount(v, currency, rates).toLocaleString("en-US", { maximumFractionDigits: 0 });
}

/** VND 원본 값 → 천 USD 기준 값 (순수 함수). 표시 통화와 무관하게, 이미 천 USD 기준으로 저장된 다른
 * 값들과 내부적으로 비교/합산해야 할 때(비율 계산, 차트 축 등) 사용한다 — 환율이 없으면 변환하지 않고
 * 그대로 반환("check 없이 그대로 저장" 데이터용, VND 원본이 아니라면 잘못된 값이 나올 수 있음에 주의). */
export function convertVndToKUsdAmount(
  v: number,
  rates: Record<string, number> = DEFAULT_EXCHANGE_RATES,
): number {
  const vndRate = rates.VND;
  if (!vndRate) return v;
  return v / vndRate / 1000;
}

const DisplayUnitContext = createContext<DisplayUnit>(defaultUnit);

/** 천 USD 기준 값 → 표시 통화/단위 값 (순수 함수)
 *
 * unitOn=true 기준 단위:
 *   USD → 천 USD  (× rate × 1)
 *   KRW → 백만원  (× rate × 1)   [레이블만 변경, 배수 동일]
 *   VND → Bil. VND (× rate × 1000 / 1e9 = × rate / 1e6)
 *
 * unitOn=false: 원 단위 (× rate × 1000)
 */
export function convertMoney(
  v: number,
  currency: string,
  unitOn: boolean,
  rates: Record<string, number> = DEFAULT_EXCHANGE_RATES,
): number {
  const rate = rates[currency] ?? 1;
  if (currency === "VND" && unitOn) {
    return v * rate * 1000 / 1_000_000_000;
  }
  return unitOn ? v * rate : v * rate * 1000;
}

/** 천 USD 기준 값 → 포맷 문자열 (순수 함수, null → "-") */
export function formatMoney(
  v: number | null | undefined,
  currency: string,
  unitOn: boolean,
  digits = 0,
  rates: Record<string, number> = DEFAULT_EXCHANGE_RATES,
): string {
  if (v == null || Number.isNaN(v)) return "-";
  const c = convertMoney(v, currency, unitOn, rates);
  // Bil. VND는 값이 작아질 수 있으므로 최대 2자리 소수 허용
  const maxD = currency === "VND" && unitOn ? 2 : currency === "USD" ? digits : 0;
  return c.toLocaleString("en-US", { maximumFractionDigits: maxD, minimumFractionDigits: 0 });
}

/** 표시 통화/단위 값 → 천 USD 기준 값 (순수 함수, convertMoney()의 정확한 역변환)
 * 입력 필드에서 사용자가 표시 통화로 입력한 값을 저장 단위(천 USD)로 되돌릴 때 사용한다. */
export function convertToKUsdAmount(
  v: number,
  currency: string,
  unitOn: boolean,
  rates: Record<string, number> = DEFAULT_EXCHANGE_RATES,
): number {
  const rate = rates[currency] ?? 1;
  if (!rate) return v;
  if (currency === "VND" && unitOn) {
    return (v * 1_000_000_000) / (rate * 1000);
  }
  return unitOn ? v / rate : v / (rate * 1000);
}

/** 단위 라벨 (순수 함수) */
export function moneyUnitLabel(currency: string, unitOn: boolean): string {
  if (!unitOn) return currency;
  if (currency === "KRW") return "백만원";
  if (currency === "VND") return "Bil. VND";
  return `천 ${currency}`;
}

export function DisplayUnitProvider({
  currency,
  unitOn,
  rates = DEFAULT_EXCHANGE_RATES,
  children,
}: {
  currency: string;
  unitOn: boolean;
  rates?: Record<string, number>;
  children: React.ReactNode;
}) {
  const value = useMemo<DisplayUnit>(
    () => ({
      currency,
      unitOn,
      convert: (v) => convertMoney(v, currency, unitOn, rates),
      convertToKUsd: (v) => convertToKUsdAmount(v, currency, unitOn, rates),
      fmtMoney: (v, digits = 0) => formatMoney(v, currency, unitOn, digits, rates),
      fmtMoneyFull: (v) => formatMoney(v, currency, false, 0, rates),
      unitLabel: moneyUnitLabel(currency, unitOn),
      convertFromVnd: (v) => convertFromVndAmount(v, currency, rates),
      fmtVnd: (v) =>
        v == null || Number.isNaN(v)
          ? "-"
          : convertFromVndAmount(v, currency, rates).toLocaleString("en-US", { maximumFractionDigits: 0 }),
      convertVndToKUsd: (v) => convertVndToKUsdAmount(v, rates),
    }),
    [currency, unitOn, rates],
  );
  return <DisplayUnitContext.Provider value={value}>{children}</DisplayUnitContext.Provider>;
}

export function useMoney(): DisplayUnit {
  return useContext(DisplayUnitContext);
}
