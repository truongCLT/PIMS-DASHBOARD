/**
 * 공용 차트 테마 — Analytics Clean 팔레트 기준
 * (차트 유형은 각 컴포넌트가 결정 — 여기서는 색상만 정의)
 */
export const chartTheme = {
  // 계열(시리즈) 색상
  planBlue:    "#4472ca",   // 계획 라인 — Analytics mid-blue
  actualGreen: "#5b9bd5",   // 실적/전망 라인 — lighter analytic blue (기존 green → blue 계열)
  rateOrange:  "#e67e22",   // 달성률 % — accent orange 유지

  profitNavy:  "#4472ca",   // 손익현황 영업이익 막대 — mid-blue
  profitGreen: "#5b9bd5",   // 손익현황 영업외손익/경상이익 — lighter blue
  profitLight: "#eef4fb",   // 손익현황 판관비 영역 fill
  sgaOrange:   "#e07b28",   // 손익현황 판관비 브래킷

  inflowBlue:  "#4472ca",   // 자금 유입 막대 — mid-blue
  outflowRed:  "#e57373",   // 자금 유출 막대 — softer coral (기존 강한 red 완화)
  balanceNavy: "#1e2a3b",   // 누적 현금 잔액 라인

  // 보조/중립
  neutralGray: "#c9d2dd",
  lightGray:   "#d9dee5",
  lightBlue:   "#9dc3e6",
  paleBlue:    "#b8d0e8",   // 도넛 보조 — slightly lighter
  trackGray:   "#e3e8ef",   // 도넛 트랙

  // 텍스트/축/그리드
  titleNavy:   "#1e2a3b",   // 차트 제목
  headingNavy: "#1e2a3b",   // 카드 소제목/강조 텍스트
  linkBlue:    "#4472ca",   // 링크/버튼 파랑
  axisText:    "#6b7d96",   // 축 눈금 — blue-gray
  gridLine:    "#eef2fa",   // 그리드 라인 — subtle blue tint
  axisLine:    "#dde3ee",   // 축 라인
  zeroLine:    "#c9d2dd",   // 0 기준선
} as const;
