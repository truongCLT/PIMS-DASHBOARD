// 원가 정산(실적 마감) 관행상, M월 실적은 M+2월 13일이 되어야 "마감 완료"로 간주한다 —
// 예: 8월 실적은 10/13부터 active, 그 전(9월 전체 ~ 10/12)까지는 여전히 7월이 마감 실적이다.
const CLOSE_CUTOFF_DAY = 13;

function monthsBackFromToday(): number {
  return new Date().getDate() >= CLOSE_CUTOFF_DAY ? 1 : 2;
}

export function lastClosedMonth(): number {
  const now = new Date();
  return now.getMonth() + 1 - monthsBackFromToday();
}

/**
 * 위 마감 규칙을 연도 이월까지 정확히 반영한 {year, month} — lastClosedMonth()는 같은 연도
 * 안에서 1로 clamp될 뿐 이전 연도로 넘어가지 않으므로, 연도가 필요한 곳(예: 초기 필터 기간)은
 * 이 함수를 쓴다.
 */
export function lastClosedYearMonth(): { year: number; month: number } {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() - monthsBackFromToday(), 1);
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

/**
 * 실적이 마감된(위 규칙 기준) 가장 최근 달. 당월/직전월은 아직 마감 전이라 제외되며,
 * 연초라 마감된 달이 없으면 최소 1로 clamp한다.
 * 기준월(base month) 선택 UI의 상한값으로 쓴다.
 */
export function maxSelectableMonth(): number {
  return Math.max(lastClosedMonth(), 1);
}

export function filterUpToLastMonth<T>(data: T[], getMonthLabel: (row: T) => string): T[] {
  const limit = lastClosedMonth();
  return data.filter((row) => {
    const n = parseInt(getMonthLabel(row).replace("월", ""), 10);
    return !Number.isNaN(n) && n >= 1 && n <= limit;
  });
}
