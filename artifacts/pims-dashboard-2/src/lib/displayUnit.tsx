import React, { createContext, useContext, useMemo } from "react";

/**
 * 프로젝트 대시보드 표시 통화/단위 컨텍스트.
 * 기준 데이터 단위: 천 USD (1K USD).
 * 고정 환율 (1 USD 기준) — 필요 시 아래 상수만 수정.
 */
export const EXCHANGE_RATES: Record<string, number> = {
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
};

const DisplayUnitContext = createContext<DisplayUnit>(defaultUnit);

/** 천 USD 기준 값 → 표시 통화/단위 값 (순수 함수) */
export function convertMoney(v: number, currency: string, unitOn: boolean): number {
  const rate = EXCHANGE_RATES[currency] ?? 1;
  return unitOn ? v * rate : v * rate * 1000;
}

/** 천 USD 기준 값 → 포맷 문자열 (순수 함수, null → "-") */
export function formatMoney(
  v: number | null | undefined,
  currency: string,
  unitOn: boolean,
  digits = 0,
): string {
  if (v == null || Number.isNaN(v)) return "-";
  const c = convertMoney(v, currency, unitOn);
  const d = currency === "USD" ? digits : 0;
  return c.toLocaleString("en-US", { maximumFractionDigits: d, minimumFractionDigits: 0 });
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
  children,
}: {
  currency: string;
  unitOn: boolean;
  children: React.ReactNode;
}) {
  const value = useMemo<DisplayUnit>(
    () => ({
      currency,
      unitOn,
      convert: (v) => convertMoney(v, currency, unitOn),
      fmtMoney: (v, digits = 0) => formatMoney(v, currency, unitOn, digits),
      unitLabel: moneyUnitLabel(currency, unitOn),
    }),
    [currency, unitOn],
  );
  return <DisplayUnitContext.Provider value={value}>{children}</DisplayUnitContext.Provider>;
}

export function useMoney(): DisplayUnit {
  return useContext(DisplayUnitContext);
}
