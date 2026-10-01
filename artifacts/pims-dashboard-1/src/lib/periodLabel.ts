/**
 * mgmtreportData(makeBuckets)가 만드는 기간 라벨("8월" / "3분기" / "2026년")은 차트 데이터의 키로도
 * 쓰이고(SalesChart extractMonthIdx 등), 원문이 한국어로 고정돼 있다 — 데이터는 그대로 두고 화면에
 * 표시할 때만 현재 언어로 바꾼다(다국어 요청: EN/VI에서 "1월" 그대로 노출).
 *   KO: 8월 / 3분기 / 2026년   EN: Aug / Q3 / 2026   VI: T8 / Q3 / 2026
 * 형식이 맞지 않는 라벨은 원문 그대로 돌려준다.
 */
export function localizePeriodLabel(label: string, language: string | undefined): string {
  const lang = (language ?? "ko").slice(0, 2);
  if (lang === "ko") return label;

  const month = /^(\d{1,2})월$/.exec(label);
  if (month) {
    const m = Number(month[1]);
    if (lang === "en") {
      return new Date(2000, m - 1, 1).toLocaleString("en-US", { month: "short" });
    }
    return `T${m}`;
  }

  const quarter = /^(\d)분기$/.exec(label);
  if (quarter) return `Q${quarter[1]}`;

  const year = /^(\d{4})년$/.exec(label);
  if (year) return year[1];

  return label;
}
