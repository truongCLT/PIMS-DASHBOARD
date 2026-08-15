import type React from "react";

/**
 * 공통 UI 토큰 — 대시보드 톤앤매너 통일 (2026-08 디자인 의견 반영)
 *
 * 규칙 요약
 * - 카드: 흰 배경 + #e2e9f3 테두리 + 8px 라운딩 + 10/12px 패딩
 * - 카드 제목: 16px / 700 / 포인트 블루(#2f7cf6)
 * - 본문·라벨: 12px, 보조 텍스트 11px, 축·설명 #7c8ba3
 * - 달성률: 100% 이상 초록(ACHIEVE_GREEN) · 미만 빨강(ACHIEVE_RED)
 * - 핵심 결과값: 크기·굵기(800)로 강조, 색은 달성률 규칙을 따름
 */

/** 달성률 색 규칙 */
export const ACHIEVE_GREEN = "#1c9e6e";
export const ACHIEVE_RED = "#e0655c";
export function rateColor(pct: number | null | undefined): string {
  if (pct == null || Number.isNaN(pct)) return "#7c8ba3";
  return pct >= 100 ? ACHIEVE_GREEN : ACHIEVE_RED;
}

/** 공통 팔레트 (텍스트/보조) */
export const INK_NAVY = "#16294a"; // 본문 강조 텍스트
export const INK_MUTED = "#7c8ba3"; // 보조 텍스트/축
export const INK_BODY = "#333";    // 일반 본문 텍스트
export const INK_SECONDARY = "#555"; // 보조 본문 텍스트
export const POINT_BLUE = "#2f7cf6"; // 포인트/링크/제목
export const CARD_BORDER = "#e2e9f3";
export const TABLE_HEADER_BG = "#eef2f7"; // 테이블 헤더 배경
export const DIVIDER = "#eef2f7";          // 행 구분선

/** 상태 / 진행 / 컨트롤 토큰 */
export const PROGRESS_TRACK = "#e2e7ee"; // 진행바·링 배경 트랙
export const STATUS_POS_BG  = "#dff2e3"; // 양수 상태 배경 (이익·초과 달성)
export const STATUS_NEG_BG  = "#fdecea"; // 음수 상태 배경 (손실·미달)
export const SUCCESS_GREEN  = "#1c7a5a"; // 업로드 성공 등 긍정 피드백
export const DISABLED_GRAY  = "#b0b8c4"; // 비활성화 토글/컨트롤
export const MUTED_HINT     = "#aab2bc"; // 연도·월 suffix 등 매우 연한 안내 텍스트

/** 프로젝트 상태(마감/진행) 배지 */
export const STATUS_CLOSED_BG   = "#f3d9d5"; // 마감 상태 배경
export const STATUS_OPEN_BG     = "#d8ecdc"; // 진행 상태 배경
export const STATUS_CLOSED_TEXT = "#a83a2a"; // 마감 상태 텍스트
export const STATUS_OPEN_TEXT   = "#2f6b3d"; // 진행 상태 텍스트

/** 어드민 버튼/컨트롤 */
export const ADMIN_NAVY    = "#1e3a6e"; // 관리자 전용 버튼 깊은 남색
export const BORDER_STRONG = "#c8d2de"; // 버튼·입력 강조 테두리 (CARD_BORDER보다 진함)
export const BORDER_MID    = "#b9c6d8"; // 상태 토글 버튼 테두리 (중간 강도)
export const BORDER_LIGHT  = "#ccd6e3"; // 입력 필드 연한 테두리

/** 경고 배너 */
export const WARNING_BG     = "#fff3cd"; // 경고 배너 배경
export const WARNING_TEXT   = "#856404"; // 경고 배너 텍스트
export const WARNING_BORDER = "#f5c842"; // 경고 배너 테두리

/** 카드 공통 스타일 */
export const cardStyle: React.CSSProperties = {
  backgroundColor: "#fff",
  border: `1px solid ${CARD_BORDER}`,
  borderRadius: "8px",
  padding: "10px 12px",
};

/** 카드 제목 공통 스타일 */
export const sectionTitle: React.CSSProperties = {
  fontSize: "16px",
  fontWeight: 700,
  color: POINT_BLUE,
  marginBottom: "6px",
};

/** 데이터 없음 안내 공통 스타일 */
export const emptyNote: React.CSSProperties = {
  padding: "40px 12px",
  textAlign: "center",
  fontSize: "13px",
  color: INK_MUTED,
};

/** 타이포 스케일 (px) — 카드 내부에서 일관 사용 */
export const FONT = {
  title: 16, // 카드 제목
  keyValue: 15, // 핵심 결과값 (굵기 800과 함께)
  body: 12, // 본문·라벨
  caption: 11, // 보조 캡션·단위
} as const;
