import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { DollarSign } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { usePutFxRates, getGetFxRatesQueryKey } from "@workspace/api-client-react";
import { useTranslation } from "react-i18next";
import { useDashboardFilters } from "../lib/dashboardFilters";

export function FxRateEditor() {
  const { t } = useTranslation(["fxRateEditor", "common"]);
  const { fxRates } = useDashboardFilters();
  const [open, setOpen] = useState(false);
  const [krw, setKrw] = useState("");
  const [vnd, setVnd] = useState("");
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const [popupPos, setPopupPos] = useState<{ top: number; left: number } | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!open) return;
    setKrw(String(fxRates.KRW));
    setVnd(String(fxRates.VND));
    setError(null);
    // 버튼 위치 기준으로 팝업 좌표 계산 (포털이라 화면 기준 fixed 좌표 사용)
    const updatePos = () => {
      const btn = ref.current;
      if (!btn) return;
      const rect = btn.getBoundingClientRect();
      const width = 320;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const saveMutation = usePutFxRates({
    mutation: {
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: getGetFxRatesQueryKey() });
        setOpen(false);
      },
      onError: () => setError(t("fxRateEditor:saveFailed")),
    },
  });

  const save = () => {
    const krwNum = Number(krw);
    const vndNum = Number(vnd);
    if (!Number.isFinite(krwNum) || krwNum <= 0 || !Number.isFinite(vndNum) || vndNum <= 0) {
      setError(t("fxRateEditor:invalidNumber"));
      return;
    }
    setError(null);
    saveMutation.mutate({ data: { usd: 1, krw: krwNum, vnd: vndNum } });
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
          width: "320px",
          padding: "14px",
        }}>
          <div style={{ fontSize: "12px", fontWeight: 700, color: "#16294a", marginBottom: "10px" }}>
            {t("fxRateEditor:popupTitle")}
          </div>
          <div style={{ marginBottom: "8px" }}>
            <div style={labelStyle}>USD</div>
            <input value={String(fxRates.USD)} disabled style={{ ...inputStyle, backgroundColor: "#f2f5f8", color: "#8a94a3" }} />
          </div>
          <div style={{ marginBottom: "8px" }}>
            <div style={labelStyle}>KRW</div>
            <input
              value={krw}
              onChange={(e) => setKrw(e.target.value)}
              inputMode="decimal"
              style={inputStyle}
            />
          </div>
          <div style={{ marginBottom: "10px" }}>
            <div style={labelStyle}>VND</div>
            <input
              value={vnd}
              onChange={(e) => setVnd(e.target.value)}
              inputMode="decimal"
              style={inputStyle}
            />
          </div>
          {error && (
            <div style={{ fontSize: "11px", color: "#e0655c", marginBottom: "8px" }}>{error}</div>
          )}
          <button
            onClick={save}
            disabled={saveMutation.isPending}
            style={{
              width: "100%",
              padding: "8px 0",
              fontSize: "12px",
              fontWeight: 600,
              backgroundColor: "#1e3a6e",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              cursor: saveMutation.isPending ? "wait" : "pointer",
            }}
          >
            {saveMutation.isPending ? t("fxRateEditor:saving") : t("common:save")}
          </button>
        </div>,
        document.body,
      )}
    </div>
  );
}
