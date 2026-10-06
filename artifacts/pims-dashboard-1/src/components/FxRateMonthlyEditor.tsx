import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { DollarSign } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetFxRatesHistory,
  usePutFxRatesHistory,
  usePutFxRates,
  getGetFxRatesHistoryQueryKey,
  getGetFxRatesQueryKey,
} from "@workspace/api-client-react";
import { useTranslation } from "react-i18next";
import { useDashboardFilters } from "../lib/dashboardFilters";

type Tab = "current" | "monthly";

// 환율 입력란은 그냥 <input type="text">라서(VndInput처럼 자리에서 숫자만 걸러주지 않음), "1.600" 같은
// 천단위 구분(VN/KR 표기 관례)이나 "25.985,50"처럼 쉼표를 소수점으로 쓴 입력이 그대로 들어오면
// Number()가 NaN을 반환해 "저장 실패"가 떴다(실사용자 보고). 쉼표/마침표를 보고 어느 쪽이 소수점인지
// 판단해서 숫자로 정규화한다: 마지막에 나오는 구분자를 소수점으로, 그 앞의 같은 종류 구분자는
// 천단위로 간주해 제거한다. 구분자가 하나뿐이고 뒤에 정확히 2자리면 소수점으로, 아니면 천단위로 본다.
// 입력 중인 원문을 "정수부(구분자 제거).소수부" 형태로 정규화한다. 사용자가 막 "."나 ","를 쳐서
// 소수부가 아직 비어 있는 중간 상태("123.")도 그대로 보존해야 타이핑 중 포맷팅이 끊기지 않는다.
function normalizeRateInput(raw: string): string {
  const s = raw.trim();
  if (s === "") return "";
  const lastDot = s.lastIndexOf(".");
  const lastComma = s.lastIndexOf(",");
  let decimalPos = -1;
  if (lastDot >= 0 && lastComma >= 0) {
    decimalPos = Math.max(lastDot, lastComma);
  } else if (lastDot >= 0 || lastComma >= 0) {
    const pos = Math.max(lastDot, lastComma);
    // 구분자가 하나뿐이면, 그 뒤 자릿수가 정확히 3개일 때만 천단위 구분으로 본다(예: "1.600").
    // 그 외(1~2자리, 또는 VND 환율처럼 4자리 이상인 "0.05570")는 소수점으로 처리한다.
    if (s.length - pos - 1 !== 3) decimalPos = pos;
  }
  let intPart = decimalPos >= 0 ? s.slice(0, decimalPos) : s;
  const fracPart = decimalPos >= 0 ? s.slice(decimalPos + 1) : "";
  intPart = intPart.replace(/[.,\s]/g, "");
  return decimalPos >= 0 ? `${intPart}.${fracPart}` : intPart;
}

function parseRateInput(raw: string): number {
  const normalized = normalizeRateInput(raw);
  if (normalized === "" || normalized === ".") return NaN;
  return Number(normalized);
}

// 입력란에 천단위 구분 쉼표를 넣어 보여준다("148739000" → "148,739,000"). 소수부와 타이핑 중인
// 마침표는 그대로 보존해 커서가 끊기지 않게 한다.
function formatRateDisplay(raw: string): string {
  const normalized = normalizeRateInput(raw);
  if (normalized === "") return "";
  const dotIdx = normalized.indexOf(".");
  const hasDot = dotIdx >= 0;
  let intPart = hasDot ? normalized.slice(0, dotIdx) : normalized;
  const fracPart = hasDot ? normalized.slice(dotIdx + 1) : "";
  intPart = intPart.replace(/\D/g, "");
  const grouped = intPart === "" ? "0" : intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return hasDot ? `${grouped}.${fracPart}` : grouped;
}

// 환율 설정 버튼 하나 안에 탭 2개:
// - "현재 환율" 탭: 기존 FxRateEditor와 동일 — 화면 표시용 "지금" 환율 하나만 빠르게 수정(PUT /fxrates).
// - "월별 매출 환율" 탭: 경영현황판 Excel이 매달 그 달 실제 환율로 USD 환산해서 들어오는데, "현재" 환율
//   하나로는 과거/특정 달의 매출을 맞게 재환산할 수 없어서 연/월을 골라 그 달의 환율을 따로 저장한다
//   (PUT /fxrates/history — fx_rates 테이블은 이미 연·월별 저장을 지원해서 스키마/API 변경 없이 화면만
//   추가). 두 탭 다 "요청: 버튼 하나로 합쳐 달라"에 따라 한 팝업 안에 탭으로 합쳤다.
export function FxRateMonthlyEditor() {
  const { t } = useTranslation(["fxRateEditor", "common", "projectDataEntryTab"]);
  const { fxRates } = useDashboardFilters();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("current");
  const ref = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const [popupPos, setPopupPos] = useState<{ top: number; left: number } | null>(null);
  const queryClient = useQueryClient();

  // ── 탭 1: 현재 환율 ───────────────────────────────────────────────────────
  const [curKrw, setCurKrw] = useState("");
  const [curVnd, setCurVnd] = useState("");
  const [curError, setCurError] = useState<string | null>(null);

  // ── 탭 2: 월별 매출 환율 ──────────────────────────────────────────────────
  const now = new Date();
  // 이 탭은 "실적 마감 여부"와 무관하게, 매출 실적/전망 환산에 쓸 환율을 연도 전체(1~12월)에
  // 대해 미리 입력해 둘 수 있어야 한다(9~12월 전망 환율도 포함). 원가/매출 보고서의 "기준월
  // 상한"(lastClosedYearMonth)은 여기 적용 대상이 아니다.
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [krw, setKrw] = useState("");
  const [vnd, setVnd] = useState("");
  const [error, setError] = useState<string | null>(null);

  const historyQuery = useGetFxRatesHistory({
    query: { queryKey: getGetFxRatesHistoryQueryKey(), enabled: open && tab === "monthly" },
  });
  const history = historyQuery.data ?? [];

  useEffect(() => {
    if (!open) return;
    setCurKrw(formatRateDisplay(String(fxRates.KRW)));
    setCurVnd(formatRateDisplay(String(fxRates.VND)));
    setCurError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open || tab !== "monthly") return;
    const krwRow = history.find((r) => r.currency === "KRW" && r.year === year && r.month === month);
    const vndRow = history.find((r) => r.currency === "VND" && r.year === year && r.month === month);
    setKrw(krwRow ? formatRateDisplay(String(krwRow.rate)) : "");
    setVnd(vndRow ? formatRateDisplay(String(vndRow.rate)) : "");
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, tab, year, month, history.length]);

  useEffect(() => {
    if (!open) return;
    const updatePos = () => {
      const btn = ref.current;
      if (!btn) return;
      const rect = btn.getBoundingClientRect();
      const width = 300;
      const left = Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8));
      setPopupPos({ top: rect.bottom + 4, left });
    };
    updatePos();
    window.addEventListener("resize", updatePos);
    window.addEventListener("scroll", updatePos, true);
    const onClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (ref.current?.contains(target)) return;
      if (popupRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => {
      window.removeEventListener("resize", updatePos);
      window.removeEventListener("scroll", updatePos, true);
      document.removeEventListener("mousedown", onClickOutside);
    };
  }, [open]);

  const putCurrentMutation = usePutFxRates({
    mutation: {
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: getGetFxRatesQueryKey() });
        setOpen(false);
      },
      onError: () => setCurError(t("fxRateEditor:saveFailed")),
    },
  });

  const saveCurrent = () => {
    const krwNum = parseRateInput(curKrw);
    const vndNum = parseRateInput(curVnd);
    if (!Number.isFinite(krwNum) || krwNum <= 0 || !Number.isFinite(vndNum) || vndNum <= 0) {
      setCurError(t("fxRateEditor:invalidNumber"));
      return;
    }
    setCurError(null);
    putCurrentMutation.mutate({ data: { usd: 1, krw: krwNum, vnd: vndNum } });
  };

  const putMonthlyMutation = usePutFxRatesHistory({
    mutation: {
      onError: () => setError(t("fxRateEditor:saveFailed")),
    },
  });

  const saveMonthly = async () => {
    const krwNum = parseRateInput(krw);
    const vndNum = parseRateInput(vnd);
    if (!Number.isFinite(krwNum) || krwNum <= 0 || !Number.isFinite(vndNum) || vndNum <= 0) {
      setError(t("fxRateEditor:invalidNumber"));
      return;
    }
    setError(null);
    try {
      await putMonthlyMutation.mutateAsync({ data: { currency: "KRW", year, month, rate: krwNum } });
      await putMonthlyMutation.mutateAsync({ data: { currency: "VND", year, month, rate: vndNum } });
      await queryClient.invalidateQueries({ queryKey: getGetFxRatesHistoryQueryKey() });
      await queryClient.invalidateQueries({ queryKey: getGetFxRatesQueryKey() });
      setOpen(false);
    } catch {
      setError(t("fxRateEditor:saveFailed"));
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    boxSizing: "border-box",
    border: "1px solid #dde6f1",
    borderRadius: "5px",
    padding: "6px 8px",
    fontSize: "12px",
    outline: "none",
    textAlign: "right",
  };
  const labelStyle: React.CSSProperties = {
    fontSize: "11px",
    color: "#7c8ba3",
    fontWeight: 600,
    marginBottom: "3px",
  };
  const selectStyle: React.CSSProperties = {
    width: "100%",
    boxSizing: "border-box",
    border: "1px solid #dde6f1",
    borderRadius: "5px",
    padding: "6px 8px",
    fontSize: "12px",
    outline: "none",
  };
  const tabButtonStyle = (active: boolean): React.CSSProperties => ({
    flex: 1,
    padding: "7px 4px",
    fontSize: "11px",
    fontWeight: 600,
    textAlign: "center",
    whiteSpace: "nowrap",
    cursor: "pointer",
    border: "none",
    borderBottom: active ? "2px solid #1e3a6e" : "2px solid transparent",
    backgroundColor: "transparent",
    color: active ? "#16294a" : "#8a94a3",
  });

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        title={t("fxRateEditor:settingsButtonTitle")}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          backgroundColor: "#8a6d1e",
          color: "#fff",
          border: "none",
          borderRadius: "6px",
          padding: "7px 14px",
          fontSize: "12px",
          cursor: "pointer",
          fontWeight: "500",
        }}
      >
        <DollarSign size={13} />
        {t("fxRateEditor:settingsButtonLabel")}
      </button>

      {open && popupPos && createPortal(
        <div ref={popupRef} style={{
          position: "fixed",
          top: popupPos.top,
          left: popupPos.left,
          maxHeight: `calc(100vh - ${popupPos.top + 8}px)`,
          overflowY: "auto",
          backgroundColor: "#fff",
          border: "1px solid #dde6f1",
          borderRadius: "8px",
          boxShadow: "0 4px 12px rgba(20,40,80,0.15)",
          zIndex: 1000,
          width: "300px",
        }}>
          <div style={{ display: "flex", borderBottom: "1px solid #eef2f7" }}>
            <button style={tabButtonStyle(tab === "current")} onClick={() => setTab("current")}>
              {t("fxRateEditor:currentTabLabel")}
            </button>
            <button style={tabButtonStyle(tab === "monthly")} onClick={() => setTab("monthly")}>
              {t("fxRateEditor:monthlyTabLabel")}
            </button>
          </div>

          <div style={{ padding: "14px" }}>
            {tab === "current" ? (
              <>
                <div style={{ fontSize: "12px", fontWeight: 700, color: "#16294a", marginBottom: "10px" }}>
                  {t("fxRateEditor:popupTitle")}
                </div>
                <div style={{ marginBottom: "8px" }}>
                  <div style={labelStyle}>USD</div>
                  <input value="1" disabled style={{ ...inputStyle, backgroundColor: "#f2f5f8", color: "#8a94a3" }} />
                </div>
                <div style={{ marginBottom: "8px" }}>
                  <div style={labelStyle}>KRW</div>
                  <input value={curKrw} onChange={(e) => setCurKrw(formatRateDisplay(e.target.value))} inputMode="decimal" style={inputStyle} />
                </div>
                <div style={{ marginBottom: "10px" }}>
                  <div style={labelStyle}>VND</div>
                  <input value={curVnd} onChange={(e) => setCurVnd(formatRateDisplay(e.target.value))} inputMode="decimal" style={inputStyle} />
                </div>
                {curError && (
                  <div style={{ fontSize: "11px", color: "#e0655c", marginBottom: "8px" }}>{curError}</div>
                )}
                <button
                  onClick={saveCurrent}
                  disabled={putCurrentMutation.isPending}
                  style={{
                    width: "100%",
                    padding: "8px 0",
                    fontSize: "12px",
                    fontWeight: 600,
                    backgroundColor: "#1e3a6e",
                    color: "#fff",
                    border: "none",
                    borderRadius: "6px",
                    cursor: putCurrentMutation.isPending ? "wait" : "pointer",
                  }}
                >
                  {putCurrentMutation.isPending ? t("fxRateEditor:saving") : t("common:save")}
                </button>
              </>
            ) : (
              <>
                <div style={{ fontSize: "12px", fontWeight: 700, color: "#16294a", marginBottom: "10px" }}>
                  {t("fxRateEditor:monthlyPopupTitle")}
                </div>
                <div style={{ display: "flex", gap: "6px", marginBottom: "8px" }}>
                  <select
                    value={year}
                    onChange={(e) => setYear(Number(e.target.value))}
                    style={selectStyle}
                  >
                    {Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i).map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                  <select value={month} onChange={(e) => setMonth(Number(e.target.value))} style={selectStyle}>
                    {/* 매출 실적/전망 환산용 환율이므로 선택한 연도의 1~12월 전체를 고를 수 있어야
                        한다(전망 월도 미리 환율을 입력해야 해서 마감 규칙으로 제한하지 않는다). */}
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                      <option key={m} value={m}>{t("projectDataEntryTab:monthSuffix", { month: m })}</option>
                    ))}
                  </select>
                </div>
                <div style={{ marginBottom: "8px" }}>
                  <div style={labelStyle}>USD</div>
                  <input value="1" disabled style={{ ...inputStyle, backgroundColor: "#f2f5f8", color: "#8a94a3" }} />
                </div>
                <div style={{ marginBottom: "8px" }}>
                  <div style={labelStyle}>KRW</div>
                  <input value={krw} onChange={(e) => setKrw(formatRateDisplay(e.target.value))} inputMode="decimal" style={inputStyle} />
                </div>
                <div style={{ marginBottom: "10px" }}>
                  <div style={labelStyle}>VND</div>
                  <input value={vnd} onChange={(e) => setVnd(formatRateDisplay(e.target.value))} inputMode="decimal" style={inputStyle} />
                </div>
                {error && (
                  <div style={{ fontSize: "11px", color: "#e0655c", marginBottom: "8px" }}>{error}</div>
                )}
                <button
                  onClick={saveMonthly}
                  disabled={putMonthlyMutation.isPending}
                  style={{
                    width: "100%",
                    padding: "8px 0",
                    fontSize: "12px",
                    fontWeight: 600,
                    backgroundColor: "#1e3a6e",
                    color: "#fff",
                    border: "none",
                    borderRadius: "6px",
                    cursor: putMonthlyMutation.isPending ? "wait" : "pointer",
                  }}
                >
                  {putMonthlyMutation.isPending ? t("fxRateEditor:saving") : t("common:save")}
                </button>
              </>
            )}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
