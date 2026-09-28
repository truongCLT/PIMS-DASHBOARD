import { useGetProjectdetail, getGetProjectdetailQueryKey } from "@workspace/api-client-react";
import type { ProjectDetail, ProjectDetailOutsourcing } from "@workspace/api-client-react";

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

/** 숫자(%) → "12.3%" / null → "-" (천 단위 구분자 포함) */
export function fmtPct(v: number | null | undefined, digits = 1): string {
  if (v == null || Number.isNaN(v) || !Number.isFinite(v)) return "-";
  return `${v.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: digits })}%`;
}

/** 비율 계산 (분모 0/null 방어) — % 값 반환, 불가 시 null */
export function ratioPct(numer: number | null | undefined, denom: number | null | undefined): number | null {
  if (numer == null || denom == null || denom === 0) return null;
  return (numer / denom) * 100;
}

/** 'YYYY-MM' 또는 'YYYY-MM-DD' → 절대 월 인덱스 (year*12 + month-1), 형식 오류 시 null */
export function ymToIndex(ym: string | null | undefined): number | null {
  if (!ym) return null;
  const str = ym.trim().slice(0, 7); // YYYY-MM-DD도 앞 7자만 사용
  const m = /^(\d{4})-(\d{1,2})$/.exec(str);
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

/** pd_outsourcing 전체 이력(계약당 여러 달)에서 계약(fldCode+ordContTypeCode)별로 기준월 시점의
 * 대표 행 1개씩만 뽑는다 — 기준월(year/month) 이전(포함) 중 가장 최근 행을 고른다(다른 화면들의
 * "latest up to reference month" 규칙과 동일). month가 null이면 계약별 "전체 중 가장 최근" 행을
 * 반환한다(월 필터 없음 — Data Entry 입력 표처럼 아직 기준월 개념이 없는 곳에서 사용). */
export function selectOutsourcingForMonth(
  rows: ProjectDetailOutsourcing[],
  year: number,
  month: number | null,
): ProjectDetailOutsourcing[] {
  const byContract = new Map<string, ProjectDetailOutsourcing[]>();
  for (const r of rows) {
    const key = `${r.fldCode ?? ""}|${r.ordContTypeCode ?? r.trade}`;
    const group = byContract.get(key);
    if (group) group.push(r);
    else byContract.set(key, [r]);
  }
  const result: ProjectDetailOutsourcing[] = [];
  for (const contractRows of byContract.values()) {
    const sorted = [...contractRows].sort((a, b) => a.year * 12 + a.month - (b.year * 12 + b.month));
    const picked =
      month == null
        ? sorted[sorted.length - 1]
        : [...sorted].reverse().find((r) => r.year * 12 + r.month <= year * 12 + month);
    if (picked) result.push(picked);
  }
  return result;
}
