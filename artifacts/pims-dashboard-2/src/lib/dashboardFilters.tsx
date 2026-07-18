import React, { createContext, useContext, useMemo, useState } from "react";
import { useGetFxRates } from "@workspace/api-client-react";
import { lastClosedMonth } from "./monthRange";

export const REPORT_YEAR = new Date().getFullYear();

export type PeriodMode = "Month" | "Quarter" | "Year";
export type CurrencyCode = "USD" | "VND" | "KRW";

/* 기본 환율 (저장된 환율이 없을 때 사용, 1 USD 기준) */
export const FX_RATES: Record<CurrencyCode, number> = {
  USD: 1,
  VND: 25450,
  KRW: 1380,
};

export type FxRateMap = Record<CurrencyCode, number>;

export const UNIT_OPTIONS: Record<CurrencyCode, [string, string]> = {
  USD: ["1K USD", "1 USD"],
  VND: ["1M VND", "1B VND"],
  KRW: ["1M KRW", "1B KRW"],
};

/* 단위 나누는 값 (원 단위 통화 금액 기준) */
const UNIT_DIVISORS: Record<CurrencyCode, [number, number]> = {
  USD: [1e3, 1],
  VND: [1e6, 1e9],
  KRW: [1e6, 1e9],
};

/** 기준 데이터(천 USD) → 선택된 통화·단위 값으로 변환하는 함수를 만든다. */
export function makeConverter(
  currency: CurrencyCode,
  unitIndex: 0 | 1,
  fxRates: FxRateMap = FX_RATES,
): (v: number) => number {
  const factor = (1000 * fxRates[currency]) / UNIT_DIVISORS[currency][unitIndex];
  return (v: number) => v * factor;
}

export function unitLabelOf(currency: CurrencyCode, unitIndex: 0 | 1): string {
  return UNIT_OPTIONS[currency][unitIndex];
}

/** 값 크기에 맞춰 반올림 (작은 값은 소수점 유지) */
export function roundSmart(v: number): number {
  if (!Number.isFinite(v)) return 0;
  if (Math.abs(v) >= 100) return Math.round(v);
  if (Math.abs(v) >= 1) return Math.round(v * 10) / 10;
  return Math.round(v * 100) / 100;
}

export interface DashboardFilterState {
  project: string; // "All" 또는 경영관리보고회 프로젝트명
  startYm: string; // "" 또는 "YYYY-MM"
  endYm: string;
  period: PeriodMode;
  currency: CurrencyCode;
  unitIndex: 0 | 1;
}

interface DashboardFilterContextValue extends DashboardFilterState {
  fxRates: FxRateMap;
  setProject: (v: string) => void;
  setStartYm: (v: string) => void;
  setEndYm: (v: string) => void;
  setPeriod: (v: PeriodMode) => void;
  setCurrency: (v: CurrencyCode) => void;
  setUnitIndex: (v: 0 | 1) => void;
}

export const DEFAULT_FILTERS: DashboardFilterState = {
  project: "All",
  startYm: "",
  endYm: "",
  period: "Month",
  currency: "USD",
  unitIndex: 0,
};

const FilterContext = createContext<DashboardFilterContextValue | null>(null);

export function DashboardFilterProvider({ children }: { children: React.ReactNode }) {
  const [project, setProject] = useState(DEFAULT_FILTERS.project);
  const [startYm, setStartYm] = useState(DEFAULT_FILTERS.startYm);
  const [endYm, setEndYm] = useState(DEFAULT_FILTERS.endYm);
  const [period, setPeriod] = useState<PeriodMode>(DEFAULT_FILTERS.period);
  const [currency, setCurrencyState] = useState<CurrencyCode>(DEFAULT_FILTERS.currency);
  const [unitIndex, setUnitIndex] = useState<0 | 1>(DEFAULT_FILTERS.unitIndex);

  const fxQuery = useGetFxRates();
  const fxRates = useMemo<FxRateMap>(
    () =>
      fxQuery.data
        ? { USD: fxQuery.data.usd, KRW: fxQuery.data.krw, VND: fxQuery.data.vnd }
        : FX_RATES,
    [fxQuery.data],
  );

  const value = useMemo<DashboardFilterContextValue>(
    () => ({
      project,
      fxRates,
      startYm,
      endYm,
      period,
      currency,
      unitIndex,
      setProject,
      setStartYm,
      setEndYm,
      setPeriod,
      setCurrency: (c: CurrencyCode) => {
        setCurrencyState(c);
        setUnitIndex(0);
      },
      setUnitIndex,
    }),
    [project, startYm, endYm, period, currency, unitIndex, fxRates],
  );

  return <FilterContext.Provider value={value}>{children}</FilterContext.Provider>;
}

export function useDashboardFilters(): DashboardFilterContextValue {
  const ctx = useContext(FilterContext);
  if (ctx) return ctx;
  // Provider 밖(다른 화면)에서도 안전하게 기본값으로 동작
  return {
    ...DEFAULT_FILTERS,
    fxRates: FX_RATES,
    setProject: () => {},
    setStartYm: () => {},
    setEndYm: () => {},
    setPeriod: () => {},
    setCurrency: () => {},
    setUnitIndex: () => {},
  };
}

/** "YYYY-MM" 문자열들을 REPORT_YEAR 내 월 범위 [from, to]로 변환. from > to 이면 데이터 없음. */
export function resolveMonthWindow(startYm: string, endYm: string): { from: number; to: number } {
  const parse = (ym: string): { y: number; m: number } | null => {
    const match = /^(\d{4})-(\d{2})$/.exec(ym);
    if (!match) return null;
    return { y: Number(match[1]), m: Number(match[2]) };
  };
  const s = parse(startYm);
  const e = parse(endYm);
  const defaultTo = Math.max(Math.min(lastClosedMonth(), 12), 1);

  let from = 1;
  if (s) {
    if (s.y > REPORT_YEAR) from = 13;
    else if (s.y === REPORT_YEAR) from = s.m;
  }
  let to = defaultTo;
  if (e) {
    if (e.y < REPORT_YEAR) to = 0;
    else if (e.y === REPORT_YEAR) to = e.m;
    else to = 12;
  }
  return { from, to };
}
