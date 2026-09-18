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
  /** 천 USD 기준 값 → 포맷된 문자열 ("-" 처리 포함) */
  fmtMoney: (v: number | null | undefined, digits?: number) => string;
  /** 단위 라벨 (예: "1K USD", "KRW") */
  unitLabel: string;
  /** VND 원본 그대로 저장된 값 → 선택된 통화로 변환 (환율 없으면 VND 그대로 반환) */
  convertFromVnd: (v: number) => number;
  /** VND 원본 값 → 포맷된 문자열 ("-" 처리 포함, 단위 배율 없음) */
  fmtVnd: (v: number | null | undefined) => string;
};

const defaultUnit: DisplayUnit = {
  currency: "USD",
  unitOn: true,
  convert: (v) => v,
  fmtMoney: (v, digits = 0) =>
    v == null || Number.isNaN(v)
      ? "-"
      : v.toLocaleString("en-US", { maximumFractionDigits: digits, minimumFractionDigits: 0 }),
  unitLabel: "천 USD",
  convertFromVnd: (v) => v,
  fmtVnd: (v) =>
    v == null || Number.isNaN(v) ? "-" : v.toLocaleString("en-US", { maximumFractionDigits: 0 }),
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
      fmtMoney: (v, digits = 0) => formatMoney(v, currency, unitOn, digits, rates),
      unitLabel: moneyUnitLabel(currency, unitOn),
      convertFromVnd: (v) => convertFromVndAmount(v, currency, rates),
      fmtVnd: (v) =>
        v == null || Number.isNaN(v)
          ? "-"
          : convertFromVndAmount(v, currency, rates).toLocaleString("en-US", { maximumFractionDigits: 0 }),
    }),
    [currency, unitOn, rates],
  );
  return <DisplayUnitContext.Provider value={value}>{children}</DisplayUnitContext.Provider>;
}

export function useMoney(): DisplayUnit {
  return useContext(DisplayUnitContext);
}
