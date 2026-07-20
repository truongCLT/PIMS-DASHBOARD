/**
 * 공용 차트 테마 — 메인 대시보드(매출/손익/자금수지 차트)의 색톤을 단일 소스로 관리.
 * 메인 디자인이 바뀌면 이 파일만 수정하면 프로젝트 개요/상세 탭 차트도 동일하게 반영됩니다.
 * (차트 유형은 각 컴포넌트가 결정 — 여기서는 색상만 정의)
 */
export const chartTheme = {
  // 계열(시리즈) 색상 — 메인 화면 기준
  planBlue: "#2b5cad", // 계획 (매출 실적 및 전망 차트의 계획 라인)
  actualGreen: "#2e8b3d", // 실적/전망 (매출 차트의 실적 라인)
  rateOrange: "#e67e22", // 달성률 %
  profitNavy: "#3d5a8f", // 손익현황 영업이익 막대
  profitGreen: "#3e7d4c", // 손익현황 영업외손익/경상이익 (녹색 계열)
  profitLight: "#eef4fb", // 손익현황 판관비 영역
  sgaOrange: "#e07b28", // 손익현황 판관비 브래킷
  inflowBlue: "#1565c0", // 자금 유입 막대
  outflowRed: "#e53935", // 자금 유출 막대 / 부정(적자·초과) 계열
  balanceNavy: "#1a3a5c", // 누적 현금 잔액 라인 / 짙은 남색 계열

  // 보조/중립 색상
  neutralGray: "#c9d2dd", // 비교용 회색 막대 (전월 등)
  lightGray: "#d9dee5", // 배경성 막대 (예산 등)
  lightBlue: "#9dc3e6", // 옅은 파랑 (보조 막대)
  paleBlue: "#9db8d9", // 아주 옅은 파랑 (도넛 보조)
  trackGray: "#e3e8ef", // 도넛 트랙

  // 텍스트/축/그리드
  titleNavy: "#1a3a5c", // 차트 제목
  headingNavy: "#1a2d4d", // 카드 소제목/강조 텍스트
  linkBlue: "#1e6fdd", // 링크/버튼 파랑
  axisText: "#666", // 축 눈금 텍스트
  gridLine: "#e8f0f8", // 그리드 라인
  axisLine: "#d5dce6", // 축 라인
  zeroLine: "#ccc", // 0 기준선
} as const;
