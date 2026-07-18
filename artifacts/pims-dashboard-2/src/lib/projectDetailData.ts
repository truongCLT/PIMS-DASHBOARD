import { useGetProjectdetail, getGetProjectdetailQueryKey } from "@workspace/api-client-react";
import type { ProjectDetail } from "@workspace/api-client-react";

export type { ProjectDetail };
export { getGetProjectdetailQueryKey };

export function useProjectDetail(projectName: string) {
  const query = useGetProjectdetail(
    { projectName },
    {
      query: {
        queryKey: getGetProjectdetailQueryKey({ projectName }),
        enabled: projectName.trim().length > 0,
        staleTime: 60_000,
      },
    },
  );
  return {
    detail: query.data ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
  };
}

/** 숫자 → "1,234" / null·undefined → "-" */
export function fmtNum(v: number | null | undefined, digits = 0): string {
  if (v == null || Number.isNaN(v)) return "-";
  return v.toLocaleString("en-US", { maximumFractionDigits: digits, minimumFractionDigits: 0 });
}

/** 숫자(%) → "12.3%" / null → "-" */
export function fmtPct(v: number | null | undefined, digits = 1): string {
  if (v == null || Number.isNaN(v) || !Number.isFinite(v)) return "-";
  return `${v.toFixed(digits)}%`;
}

/** 비율 계산 (분모 0/null 방어) — % 값 반환, 불가 시 null */
export function ratioPct(numer: number | null | undefined, denom: number | null | undefined): number | null {
  if (numer == null || denom == null || denom === 0) return null;
  return (numer / denom) * 100;
}

/** 'YYYY-MM' → 절대 월 인덱스 (year*12 + month-1), 형식 오류 시 null */
export function ymToIndex(ym: string | null | undefined): number | null {
  if (!ym) return null;
  const m = /^(\d{4})-(\d{1,2})$/.exec(ym.trim());
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  if (month < 1 || month > 12) return null;
  return year * 12 + (month - 1);
}

/** 절대 월 인덱스 → 'YY-MM' 라벨 */
export function indexToYmLabel(idx: number): string {
  const year = Math.floor(idx / 12);
  const month = (idx % 12) + 1;
  return `${String(year).slice(2)}-${String(month).padStart(2, "0")}`;
}
