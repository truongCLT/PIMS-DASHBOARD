import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { DollarSign } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetFxRatesHistory,
  usePutFxRatesHistory,
  useDeleteFxRatesHistory,
  usePutFxRates,
  getGetFxRatesHistoryQueryKey,
  getGetFxRatesQueryKey,
  getGetCashflowReportSummaryQueryKey,
} from "@workspace/api-client-react";
import { useTranslation } from "react-i18next";
import { useDashboardFilters } from "../lib/dashboardFilters";

type Tab = "current" | "monthly" | "cashflow";

// 환율 입력란은 그냥 <input type="text">라서(VndInput처럼 자리에서 숫자만 걸러주지 않음), 쉼표는
// 항상 "천단위 구분 표시"로만 쓰고 제거하며, 사용자가 입력한 "."은 항상 소수점으로 그대로 쓴다
// (자릿수를 보고 천단위/소수점을 추측하던 예전 방식은 "4343.66"을 "4.34366"으로 잘못 해석하는 등
// 실사용자가 원치 않는 추측을 해서 혼란을 줬다 — 이제는 추측하지 않는다, 사용자가 직접 "."를 찍은
// 자리가 곧 소수점이다). 입력 중인 원문을 "정수부(구분자 제거).소수부" 형태로 정규화한다. 사용자가
// 막 "."를 쳐서 소수부가 아직 비어 있는 중간 상태("123.")도 그대로 보존해 타이핑 중 포맷팅이 끊기지
// 않게 한다.
function normalizeRateInput(raw: string): string {
  const s = raw.trim();
  if (s === "") return "";
  const dotIdx = s.indexOf(".");
  let intPart = dotIdx >= 0 ? s.slice(0, dotIdx) : s;
  const fracPart = dotIdx >= 0 ? s.slice(dotIdx + 1) : "";
  intPart = intPart.replace(/[.,\s]/g, "");
  const cleanFrac = fracPart.replace(/[^0-9]/g, "");
  return dotIdx >= 0 ? `${intPart}.${cleanFrac}` : intPart;
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
// - "월별 자금 환율" 탭: 자금수지에 반영하는 환율은 매출 환율과 또 달라서(실사용자 요청) 연/월별 VND 환율을
//   purpose="cashflow"로 따로 저장한다. 서버가 PIMSVINA Cash Flow의 VND 거래를 USD로 환산할 때 그 달 값이
//   있으면 PIMSVINA 환율 대신 이 값을 쓴다(cashflowReport.ts). 비워두면 PIMSVINA 환율 그대로.
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
  // 월 선택란에 "계획"을 1~12월과 같은 드롭다운 옵션으로 넣는다(PLAN_MONTH 센티널 값).
  // "계획"을 고르고 저장하면 입력한 KRW/VND를 선택한 연도의 1~12월 전체에 동일하게 반영한다
  // (본사에서 내려주는 연간 계획 환율은 월별로 따로 입력할 필요가 없어서).
  const PLAN_MONTH = 0;
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [krw, setKrw] = useState("");
  const [vnd, setVnd] = useState("");
  const [error, setError] = useState<string | null>(null);

  // ── 탭 3: 월별 자금 환율 (연/월은 탭 2와 공유, "계획" 옵션 없음) ─────────────
  const [cfVnd, setCfVnd] = useState("");

  const historyQuery = useGetFxRatesHistory(undefined, {
    query: { queryKey: getGetFxRatesHistoryQueryKey(), enabled: open && tab !== "current" },
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
    if (month === PLAN_MONTH) {
      // 계획은 연도당 1건으로 취급 — 1월 자리에 저장된 purpose="plan" 행을 보여준다
      // (저장 시 1~12월 전체에 같은 값을 반영하므로 아무 달이나 대표로 조회해도 된다).
      const krwRow = history.find((r) => r.currency === "KRW" && r.year === year && r.month === 1 && r.purpose === "plan");
      const vndRow = history.find((r) => r.currency === "VND" && r.year === year && r.month === 1 && r.purpose === "plan");
      setKrw(krwRow ? formatRateDisplay(String(krwRow.rate)) : "");
      setVnd(vndRow ? formatRateDisplay(String(vndRow.rate)) : "");
      setError(null);
      return;
    }
    const krwRow = history.find((r) => r.currency === "KRW" && r.year === year && r.month === month && (r.purpose ?? "actual_forecast") === "actual_forecast");
    const vndRow = history.find((r) => r.currency === "VND" && r.year === year && r.month === month && (r.purpose ?? "actual_forecast") === "actual_forecast");
    setKrw(krwRow ? formatRateDisplay(String(krwRow.rate)) : "");
    setVnd(vndRow ? formatRateDisplay(String(vndRow.rate)) : "");
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, tab, year, month, history.length]);

  useEffect(() => {
    if (!open || tab !== "cashflow") return;
    if (month === PLAN_MONTH) {
      setMonth(now.getMonth() + 1);
      return;
    }
    const vndRow = history.find((r) => r.currency === "VND" && r.year === year && r.month === month && r.purpose === "cashflow");
    setCfVnd(vndRow ? formatRateDisplay(String(vndRow.rate)) : "");
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
  const deleteMonthlyMutation = useDeleteFxRatesHistory({
    mutation: {
      onError: () => setError(t("fxRateEditor:saveFailed")),
    },
  });

  // 입력란을 비워두면(null) 그 통화의 해당 달 환율을 아예 지워서(DELETE) site 계약 환율/현재 환율로
  // 다시 폴백되게 한다 — 값을 입력했을 때만 저장(PUT)한다. 실사용자 요청: "VND는 비워두고 싶을 때
  // (0보다 커야 한다는 입력값 검증 때문에) 저장이 안 됐다".
  const saveOrClearRate = (currency: "KRW" | "VND", year: number, month: number, purpose: "plan" | "actual_forecast" | "cashflow", num: number | null) =>
    num == null
      ? deleteMonthlyMutation.mutateAsync({ params: { currency, year, month, purpose } })
      : putMonthlyMutation.mutateAsync({ data: { currency, year, month, purpose, rate: num } });

  const saveMonthly = async () => {
    const krwRaw = krw.trim();
    const vndRaw = vnd.trim();
    const krwNum = krwRaw === "" ? null : parseRateInput(krw);
    const vndNum = vndRaw === "" ? null : parseRateInput(vnd);
    if ((krwNum != null && (!Number.isFinite(krwNum) || krwNum <= 0)) || (vndNum != null && (!Number.isFinite(vndNum) || vndNum <= 0))) {
      setError(t("fxRateEditor:invalidNumber"));
      return;
    }
    setError(null);
    if (month === PLAN_MONTH) {
      // "계획" 선택 시 선택한 연도의 1~12월 전체에 같은 값을 purpose="plan"으로만 반영한다.
      // (버그 수정: 예전에는 purpose="actual_forecast"에도 같이 써서 그 달의 월별 매출 환율
      // 설정을 계획값으로 덮어썼다 — 실사용자 보고: 계획 환율을 저장했더니 이미 따로 입력해 둔
      // 월별 실적 환율이 전부 사라지고 계획값 하나로 통일돼 버렸다. plan과 actual_forecast는
      // 완전히 독립된 환율 트랙이라 plan 저장이 actual_forecast를 절대 건드리면 안 된다.)
      // 한 달 저장이 실패해도 나머지 달 저장을 계속 시도한다(이전에 한 달에서 실패하면 그 뒤
      // 달들이 전부 저장되지 않고 조용히 빠지는 문제가 있었다) — 실패한 달이 있으면 모아서 에러로
      // 알려준다.
      const failedMonths: number[] = [];
      for (let m = 1; m <= 12; m++) {
        try {
          await saveOrClearRate("KRW", year, m, "plan", krwNum);
          await saveOrClearRate("VND", year, m, "plan", vndNum);
        } catch {
          failedMonths.push(m);
        }
      }
      await queryClient.invalidateQueries({ queryKey: getGetFxRatesHistoryQueryKey() });
      await queryClient.invalidateQueries({ queryKey: getGetFxRatesQueryKey() });
      if (failedMonths.length > 0) {
        setError(`${t("fxRateEditor:saveFailed")} (${failedMonths.join(", ")})`);
        return;
      }
      setOpen(false);
    } else {
      try {
        await saveOrClearRate("KRW", year, month, "actual_forecast", krwNum);
        await saveOrClearRate("VND", year, month, "actual_forecast", vndNum);
        await queryClient.invalidateQueries({ queryKey: getGetFxRatesHistoryQueryKey() });
        await queryClient.invalidateQueries({ queryKey: getGetFxRatesQueryKey() });
        setOpen(false);
      } catch {
        setError(t("fxRateEditor:saveFailed"));
      }
    }
  };

  const saveCashflow = async () => {
    const vndNum = cfVnd.trim() === "" ? null : parseRateInput(cfVnd);
    if (vndNum != null && (!Number.isFinite(vndNum) || vndNum <= 0)) {
      setError(t("fxRateEditor:invalidNumber"));
      return;
    }
    setError(null);
    try {
      await saveOrClearRate("VND", year, month, "cashflow", vndNum);
      await queryClient.invalidateQueries({ queryKey: getGetFxRatesHistoryQueryKey() });
      // 자금수지 금액(USD)은 서버가 이 환율로 다시 환산하므로 리포트 조회도 새로 받는다.
      await queryClient.invalidateQueries({ queryKey: getGetCashflowReportSummaryQueryKey() });
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
    // 탭이 3개라 VI/EN 라벨은 300px 안에 한 줄로 안 들어간다 — 줄바꿈 허용
    whiteSpace: "normal",
    lineHeight: 1.3,
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
            <button style={tabButtonStyle(tab === "cashflow")} onClick={() => setTab("cashflow")}>
              {t("fxRateEditor:cashflowTabLabel")}
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
            ) : tab === "cashflow" ? (
              <>
                <div style={{ fontSize: "12px", fontWeight: 700, color: "#16294a", marginBottom: "10px" }}>
                  {t("fxRateEditor:cashflowPopupTitle")}
                </div>
                <div style={{ display: "flex", gap: "6px", marginBottom: "8px" }}>
                  <select value={year} onChange={(e) => setYear(Number(e.target.value))} style={selectStyle}>
                    {Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i).map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                  <select value={month} onChange={(e) => setMonth(Number(e.target.value))} style={selectStyle}>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                      <option key={m} value={m}>{t("projectDataEntryTab:monthSuffix", { month: m })}</option>
                    ))}
                  </select>
                </div>
                <div style={{ fontSize: "11px", color: "#8a6d1e", marginBottom: "8px" }}>
                  {t("fxRateEditor:cashflowHint")}
                </div>
                <div style={{ marginBottom: "8px" }}>
                  <div style={labelStyle}>USD</div>
                  <input value="1" disabled style={{ ...inputStyle, backgroundColor: "#f2f5f8", color: "#8a94a3" }} />
                </div>
                <div style={{ marginBottom: "10px" }}>
                  <div style={labelStyle}>VND</div>
                  <input value={cfVnd} onChange={(e) => setCfVnd(formatRateDisplay(e.target.value))} inputMode="decimal" style={inputStyle} />
                </div>
                {error && (
                  <div style={{ fontSize: "11px", color: "#e0655c", marginBottom: "8px" }}>{error}</div>
                )}
                <button
                  onClick={saveCashflow}
                  disabled={putMonthlyMutation.isPending || deleteMonthlyMutation.isPending}
                  style={{
                    width: "100%",
                    padding: "8px 0",
                    fontSize: "12px",
                    fontWeight: 600,
                    backgroundColor: "#1e3a6e",
                    color: "#fff",
                    border: "none",
                    borderRadius: "6px",
                    cursor: putMonthlyMutation.isPending || deleteMonthlyMutation.isPending ? "wait" : "pointer",
                  }}
                >
                  {putMonthlyMutation.isPending || deleteMonthlyMutation.isPending ? t("fxRateEditor:saving") : t("common:save")}
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
                    {/* "계획"을 고르면 입력한 값이 저장 시 1~12월 전체에 일괄 반영된다. 그 외에는
                        매출 실적/전망 환산용 환율이므로 선택한 연도의 1~12월 전체를 고를 수 있어야
                        한다(전망 월도 미리 환율을 입력해야 해서 마감 규칙으로 제한하지 않는다). */}
                    <option value={PLAN_MONTH}>{t("fxRateEditor:planOption")}</option>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                      <option key={m} value={m}>{t("projectDataEntryTab:monthSuffix", { month: m })}</option>
                    ))}
                  </select>
                </div>
                {month === PLAN_MONTH && (
                  <div style={{ fontSize: "11px", color: "#8a6d1e", marginBottom: "8px" }}>
                    {t("fxRateEditor:planHint")}
                  </div>
                )}
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
                  disabled={putMonthlyMutation.isPending || deleteMonthlyMutation.isPending}
                  style={{
                    width: "100%",
                    padding: "8px 0",
                    fontSize: "12px",
                    fontWeight: 600,
                    backgroundColor: "#1e3a6e",
                    color: "#fff",
                    border: "none",
                    borderRadius: "6px",
                    cursor: putMonthlyMutation.isPending || deleteMonthlyMutation.isPending ? "wait" : "pointer",
                  }}
                >
                  {putMonthlyMutation.isPending || deleteMonthlyMutation.isPending ? t("fxRateEditor:saving") : t("common:save")}
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
