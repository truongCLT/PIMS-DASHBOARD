import type React from "react";
import { tokens as aquaTokens } from "@workspace/aqua-glass";
const AG = aquaTokens.color.light;

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
  if (pct == null || Number.isNaN(pct)) return AG.mutedForeground;
  return pct >= 100 ? ACHIEVE_GREEN : ACHIEVE_RED;
}

/** 공통 팔레트 (텍스트/보조) */
export const INK_NAVY = AG.foreground; // 본문 강조 텍스트
export const INK_MUTED = AG.mutedForeground; // 보조 텍스트/축
export const POINT_BLUE = AG.primary; // 포인트/링크/제목
export const CARD_BORDER = AG.border;

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
