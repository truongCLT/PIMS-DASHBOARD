import { tokens as aquaTokens } from "@workspace/aqua-glass";
const AG = aquaTokens.color.light;
/**
 * 공용 차트 테마 — Aqua Glass 팔레트 기준 (@workspace/aqua-glass 토큰)
 * (차트 유형은 각 컴포넌트가 결정 — 여기서는 색상만 정의)
 */
export const chartTheme = {
  // 계열(시리즈) 색상
  planBlue:    AG.primary,   // 계획 라인 — Analytics mid-blue
  actualGreen: AG.chart2,   // 실적/전망 라인 — lighter analytic blue (기존 green → blue 계열)
  rateOrange:  AG.chart3,   // 달성률 % — accent orange 유지

  profitNavy:  AG.primary,   // 손익현황 영업이익 막대 — mid-blue
  profitGreen: AG.chart2,   // 손익현황 영업외손익/경상이익 — lighter blue
  profitLight: AG.sidebarAccent,   // 손익현황 판관비 영역 fill
  sgaOrange:   "#f0b429",   // 손익현황 판관비 브래킷

  inflowBlue:  AG.primary,   // 자금 유입 막대 — mid-blue
  outflowRed:  AG.destructive,   // 자금 유출 막대 — softer coral (기존 강한 red 완화)
  balanceNavy: AG.foreground,   // 누적 현금 잔액 라인

  // 보조/중립
  neutralGray: AG.input,
  lightGray:   AG.border,
  lightBlue:   "#82c4f5",
  paleBlue:    "#a9d4f0",   // 도넛 보조 — slightly lighter
  trackGray:   AG.border,   // 도넛 트랙

  // 텍스트/축/그리드
  titleNavy:   AG.foreground,   // 차트 제목
  headingNavy: AG.foreground,   // 카드 소제목/강조 텍스트
  linkBlue:    AG.primary,   // 링크/버튼 파랑
  axisText:    AG.mutedForeground,   // 축 눈금 — blue-gray
  gridLine:    AG.sidebarAccent,   // 그리드 라인 — subtle blue tint
  axisLine:    AG.border,   // 축 라인
  zeroLine:    AG.input,   // 0 기준선
} as const;
