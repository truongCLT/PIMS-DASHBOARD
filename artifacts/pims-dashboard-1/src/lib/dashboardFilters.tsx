import React, { createContext, useContext, useMemo, useState } from "react";
import { useGetFxRates, useGetFxRatesHistory } from "@workspace/api-client-react";
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

/** 통화별 월별 환율 이력 한 건 */
export interface FxRateHistoryEntry {
  currency: CurrencyCode;
  year: number;
  month: number; // 1..12
  rate: number;
}
export type FxRateHistory = FxRateHistoryEntry[];

/**
 * (currency, year, month)에 해당하는 환율을 찾는다.
 * 정확히 일치하는 값이 없으면, 해당 통화의 이력 중 target보다 이전(또는 같은) 가장 최근 월을 사용한다.
 * (SRS 공통 규칙: "해당 월 환율이 없으면 가장 최근 이전 월의 환율을 사용")
 * 이력이 전혀 없으면 정적 기본값(FX_RATES)으로 폴백한다.
 */
export function lookupFxRate(
  history: FxRateHistory,
  currency: CurrencyCode,
  year: number,
  month: number,
): number {
  if (!Array.isArray(history)) return FX_RATES[currency] ?? 1;
  let best: FxRateHistoryEntry | null = null;
  for (const e of history) {
    if (!e || e.currency !== currency) continue;
    if (e.year > year || (e.year === year && e.month > month)) continue; // target보다 미래는 후보 아님
    if (
      !best ||
      e.year > best.year ||
      (e.year === best.year && e.month > best.month)
    ) {
      best = e;
    }
  }
  return best?.rate ?? FX_RATES[currency] ?? 1;
}

export const UNIT_OPTIONS: Record<CurrencyCode, [string, string]> = {
  USD: ["K USD", "USD"],
  VND: ["M VND", "Bil. VND"],
  KRW: ["M KRW", "Bil. KRW"],
};

/* 단위 나누는 값 (원 단위 통화 금액 기준) */
const UNIT_DIVISORS: Record<CurrencyCode, [number, number]> = {
  USD: [1e3, 1],
  VND: [1e6, 1e9],
  KRW: [1e6, 1e9],
};

/**
 * 기준 데이터(천 USD) → 선택된 통화·단위 값으로 변환하는 함수를 만든다.
 * 반환 함수는 (value, year, month)를 받아 해당 월의 환율로 변환한다 — 월별 환율 이력을 반영.
 */
export function makeConverter(
  currency: CurrencyCode,
  unitIndex: 0 | 1,
  fxRateHistory: FxRateHistory = [],
): (v: number, year?: number, month?: number) => number {
  return (v: number, year?: number, month?: number) => {
    const y = year ?? REPORT_YEAR;
    const m = month ?? 1;
    const rate = lookupFxRate(fxRateHistory, currency, y, m);
    const divisor = UNIT_DIVISORS[currency]?.[unitIndex] ?? 1e3;
    const factor = (1000 * rate) / divisor;
    return v * factor;
  };
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

export type DashboardDivision = "시공" | "용역";
export type ProjectStatusFilter = "ongoing" | "closed";

export interface DashboardFilterState {
  project: string; // "All" 또는 경영관리보고회 프로젝트명
  startYm: string; // "" 또는 "YYYY-MM"
  endYm: string;
  period: PeriodMode;
  currency: CurrencyCode;
  unitIndex: 0 | 1;
}

interface DashboardFilterContextValue extends DashboardFilterState {
  /** 좌측 메뉴에서 선택된 부문 (시공/용역), 없으면 null */
  division: DashboardDivision | null;
  /** 좌측 메뉴에서 선택된 진행 상태 (진행중/종료), 없으면 null = 전체 */
  statusFilter: ProjectStatusFilter | null;
  /** 당월 환율 (빠른 조회용 스냅샷) */
  fxRates: FxRateMap;
  /** 월별 환율 이력 (makeConverter에 전달) */
  fxRateHistory: FxRateHistory;
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

export function DashboardFilterProvider({
  children,
  division = null,
  statusFilter = null,
}: {
  children: React.ReactNode;
  division?: DashboardDivision | null;
  statusFilter?: ProjectStatusFilter | null;
}) {
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

  const fxHistoryQuery = useGetFxRatesHistory();
  const fxRateHistory = useMemo<FxRateHistory>(
    () => fxHistoryQuery.data ?? [],
    [fxHistoryQuery.data],
  );

  const value = useMemo<DashboardFilterContextValue>(
    () => ({
      project,
      division,
      statusFilter,
      fxRates,
      fxRateHistory,
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
    [project, division, statusFilter, startYm, endYm, period, currency, unitIndex, fxRates, fxRateHistory],
  );

  return <FilterContext.Provider value={value}>{children}</FilterContext.Provider>;
}

export function useDashboardFilters(): DashboardFilterContextValue {
  const ctx = useContext(FilterContext);
  if (ctx) return ctx;
  // Provider 밖(다른 화면)에서도 안전하게 기본값으로 동작
  return {
    ...DEFAULT_FILTERS,
    division: null,
    statusFilter: null,
    fxRates: FX_RATES,
    fxRateHistory: [],
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
