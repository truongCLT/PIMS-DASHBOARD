import React, { useEffect, useRef, useState } from "react";
import { DollarSign } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { usePutFxRates, getGetFxRatesQueryKey } from "@workspace/api-client-react";
import { useDashboardFilters } from "../lib/dashboardFilters";

export function FxRateEditor() {
  const { fxRates } = useDashboardFilters();
  const [open, setOpen] = useState(false);
  const [krw, setKrw] = useState("");
  const [vnd, setVnd] = useState("");
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!open) return;
    setKrw(String(fxRates.KRW));
    setVnd(String(fxRates.VND));
    setError(null);
    const onClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const saveMutation = usePutFxRates({
    mutation: {
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: getGetFxRatesQueryKey() });
        setOpen(false);
      },
      onError: () => setError("환율 저장에 실패했습니다."),
    },
  });

  const save = () => {
    const krwNum = Number(krw);
    const vndNum = Number(vnd);
    if (!Number.isFinite(krwNum) || krwNum <= 0 || !Number.isFinite(vndNum) || vndNum <= 0) {
      setError("0보다 큰 숫자를 입력해 주세요.");
      return;
    }
    setError(null);
    saveMutation.mutate({ data: { usd: 1, krw: krwNum, vnd: vndNum } });
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    boxSizing: "border-box",
    border: "1px solid #ccd4dd",
    borderRadius: "5px",
    padding: "6px 8px",
    fontSize: "12px",
    outline: "none",
    textAlign: "right",
  };
  const labelStyle: React.CSSProperties = {
    fontSize: "11px",
    color: "#5a6a7e",
    fontWeight: 600,
    marginBottom: "3px",
  };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        title="환율 설정 (관리자)"
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
        환율 설정
      </button>

      {open && (
        <div style={{
          position: "absolute",
          top: "calc(100% + 4px)",
          right: 0,
          backgroundColor: "#fff",
          border: "1px solid #ccd4dd",
          borderRadius: "8px",
          boxShadow: "0 4px 12px rgba(20,40,80,0.15)",
          zIndex: 1000,
          width: "220px",
          padding: "14px",
        }}>
          <div style={{ fontSize: "12px", fontWeight: 700, color: "#1a2d4d", marginBottom: "10px" }}>
            환율 설정 (1 USD 기준)
          </div>
          <div style={{ marginBottom: "8px" }}>
            <div style={labelStyle}>USD</div>
            <input value="1" disabled style={{ ...inputStyle, backgroundColor: "#f2f5f8", color: "#8a94a3" }} />
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
            <div style={{ fontSize: "11px", color: "#c0392b", marginBottom: "8px" }}>{error}</div>
          )}
          <button
            onClick={save}
            disabled={saveMutation.isPending}
            style={{
              width: "100%",
              padding: "8px 0",
              fontSize: "12px",
              fontWeight: 600,
              backgroundColor: "#2e4568",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              cursor: saveMutation.isPending ? "wait" : "pointer",
            }}
          >
            {saveMutation.isPending ? "저장 중…" : "저장"}
          </button>
        </div>
      )}
    </div>
  );
}
