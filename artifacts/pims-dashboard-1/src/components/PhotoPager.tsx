import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

interface Props {
  src: string;
  alt?: string;
  total: number;           // 전체 사진 수
  current: number;         // 0-based 현재 인덱스
  onChange: (idx: number) => void;
  imgStyle?: React.CSSProperties;
  autoPlayIntervalSeconds?: number; // 0 또는 미설정 = 자동재생 꺼짐
}

/** 페이지 번호 목록 계산 (1-based, '...' 포함) */
function buildPages(total: number, cur: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const p = cur + 1; // 1-based
  const pages: (number | "...")[] = [];
  const add = (n: number | "...") => {
    if (pages[pages.length - 1] !== n) pages.push(n);
  };

  add(1);
  if (p > 3) add("...");
  for (let i = Math.max(2, p - 1); i <= Math.min(total - 1, p + 1); i++) add(i);
  if (p < total - 2) add("...");
  add(total);
  return pages;
}

const NAV_BTN: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  minWidth: "24px",
  height: "24px",
  padding: "0 4px",
  border: "1px solid #e2e9f3",
  borderRadius: "4px",
  background: "#fff",
  color: "#4a6080",
  fontSize: "11px",
  cursor: "pointer",
  userSelect: "none",
  lineHeight: 1,
  flexShrink: 0,
};

export function PhotoPager({ src, alt, total, current, onChange, imgStyle, autoPlayIntervalSeconds = 0 }: Props) {
  const { t } = useTranslation(["photoPager", "common"]);
  const pages = buildPages(total, current);
  const [paused, setPaused] = useState(false);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // 자동 슬라이드쇼: interval > 0 이고 사진이 2장 이상일 때만 동작
  useEffect(() => {
    if (!autoPlayIntervalSeconds || autoPlayIntervalSeconds <= 0 || total <= 1 || paused) return;
    const timer = setInterval(() => {
      onChangeRef.current((current + 1) % total);
    }, autoPlayIntervalSeconds * 1000);
    return () => clearInterval(timer);
  }, [autoPlayIntervalSeconds, total, current, paused]);

  return (
    <div
      style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%" }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* 이미지 */}
      <div style={{ flex: 1, minHeight: 0, position: "relative" }}>
        <img
          src={src}
          alt={alt ?? t("photoPager:defaultAlt")}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            borderRadius: "4px",
            display: "block",
            minHeight: "180px",
            ...imgStyle,
          }}
        />
        {/* 자동재생 일시정지 표시 */}
        {autoPlayIntervalSeconds > 0 && total > 1 && paused && (
          <div style={{
            position: "absolute",
            bottom: "6px",
            right: "6px",
            background: "rgba(0,0,0,0.45)",
            color: "#fff",
            fontSize: "10px",
            borderRadius: "3px",
            padding: "2px 5px",
            pointerEvents: "none",
          }}>
            ⏸
          </div>
        )}
        {/* 자동재생 중 표시 */}
        {autoPlayIntervalSeconds > 0 && total > 1 && !paused && (
          <div style={{
            position: "absolute",
            bottom: "6px",
            right: "6px",
            background: "rgba(0,0,0,0.35)",
            color: "#fff",
            fontSize: "10px",
            borderRadius: "3px",
            padding: "2px 5px",
            pointerEvents: "none",
          }}>
            ▶ {autoPlayIntervalSeconds}s
          </div>
        )}
      </div>

      {/* 페이지 네비게이션 */}
      {total > 1 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "4px",
            paddingTop: "8px",
            flexWrap: "wrap",
          }}
        >
          {/* 이전 버튼 */}
          <button
            onClick={() => onChange(Math.max(0, current - 1))}
            disabled={current === 0}
            style={{
              ...NAV_BTN,
              opacity: current === 0 ? 0.35 : 1,
              cursor: current === 0 ? "default" : "pointer",
            }}
            aria-label={t("photoPager:prevPhoto")}
          >
            ‹
          </button>

          {pages.map((p, i) =>
            p === "..." ? (
              <span key={`ellipsis-${i}`} style={{ fontSize: "11px", color: "#8898aa", padding: "0 2px", lineHeight: "24px" }}>
                …
              </span>
            ) : (
              <button
                key={p}
                onClick={() => onChange((p as number) - 1)}
                aria-label={t("photoPager:photoNumber", { number: p })}
                aria-current={p === current + 1 ? "page" : undefined}
                style={{
                  ...NAV_BTN,
                  minWidth: "24px",
                  backgroundColor: p === current + 1 ? "#16294a" : "#eef2f7",
                  color: p === current + 1 ? "#fff" : "#4a6080",
                  fontWeight: p === current + 1 ? 700 : 400,
                  border: p === current + 1 ? "1px solid #16294a" : "1px solid #e2e9f3",
                }}
              >
                {p}
              </button>
            )
          )}

          {/* 다음 버튼 */}
          <button
            onClick={() => onChange(Math.min(total - 1, current + 1))}
            disabled={current === total - 1}
            style={{
              ...NAV_BTN,
              opacity: current === total - 1 ? 0.35 : 1,
              cursor: current === total - 1 ? "default" : "pointer",
            }}
            aria-label={t("photoPager:nextPhoto")}
          >
            ›
          </button>
        </div>
      )}
    </div>
  );
}
