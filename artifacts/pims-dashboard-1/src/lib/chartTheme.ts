/**
 * 공용 차트 테마 — Analytics Clean 팔레트 기준
 * (차트 유형은 각 컴포넌트가 결정 — 여기서는 색상만 정의)
 */
export const chartTheme = {
  // 계열(시리즈) 색상
  planBlue:    "#2f7cf6",   // 계획 라인 — Analytics mid-blue
  actualGreen: "#35c7c0",   // 실적/전망 라인 — lighter analytic blue (기존 green → blue 계열)
  rateOrange:  "#5fe0a8",   // 달성률 % — accent orange 유지

  profitNavy:  "#2f7cf6",   // 손익현황 영업이익 막대 — mid-blue
  profitGreen: "#35c7c0",   // 손익현황 영업외손익/경상이익 — lighter blue
  profitLight: "#e7f1fd",   // 손익현황 판관비 영역 fill
  sgaOrange:   "#f0b429",   // 손익현황 판관비 브래킷

  inflowBlue:  "#2f7cf6",   // 자금 유입 막대 — mid-blue
  outflowRed:  "#f2736a",   // 자금 유출 막대 — softer coral (기존 강한 red 완화)
  balanceNavy: "#16294a",   // 누적 현금 잔액 라인

  // 보조/중립
  neutralGray: "#dde6f1",
  lightGray:   "#e2e9f3",
  lightBlue:   "#82c4f5",
  paleBlue:    "#a9d4f0",   // 도넛 보조 — slightly lighter
  trackGray:   "#e2e9f3",   // 도넛 트랙

  // 텍스트/축/그리드
  titleNavy:     "#16294a",   // 차트 제목
  headingNavy:   "#16294a",   // 카드 소제목/강조 텍스트
  linkBlue:      "#2f7cf6",   // 링크/버튼 파랑
  axisText:      "#7c8ba3",   // 축 눈금 — blue-gray
  gridLine:      "#e7f1fd",   // 그리드 라인 — subtle blue tint
  axisLine:      "#e2e9f3",   // 축 라인
  zeroLine:      "#dde6f1",   // 0 기준선

  // 참조선/중립 스트로크 (ProfitChart)
  neutralStroke: "#c0cede",   // 참조선·중립 막대 테두리
  refLine:       "#9aa8ba",   // 손익 0 기준선 stroke
  subLabel:      "#5a6c8e",   // 차트 보조 레이블 (muted blue-gray)

  // 도메인 차트 시리즈 (ProfitChart 대우 스타일)
  dwOp:     "#2b4a8b", // 영업이익 — 진한 남색
  dwSga:    "#a9c4f0", // 판관비 — 연한 파랑
  dwNon:    "#3f9e63", // 영업외손익 — 녹색
  dwPos:    "#2e9e5b", // 양수 영업외 — 진한 녹색
  dwNeg:    "#cf4d4d", // 음수 영업외 — 붉은색

  // ProfitChart 보조 fill/text
  chipPosBg:  "#e7f5ec", // 양수 영업외 배지 배경
  chipNegBg:  "#fdecec", // 음수 영업외 배지 배경
  valueFill:  "#1a2d4d", // 총 매출 합계 강조 텍스트
  axisSmall:  "#64748b", // 소형 축 레이블 (영업외손익/영업이익률)
  opRateBg:   "#e8eef7", // 영업이익률 캡슐 배경

  // SaleProfitTab 계획 막대
  planGray:   "#c9d2dd", // 매출이익 월간 계획 막대 (연한 회색-파랑)
} as const;
