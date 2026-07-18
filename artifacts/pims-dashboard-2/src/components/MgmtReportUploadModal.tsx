import React, { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { FileSpreadsheet, Upload, X } from "lucide-react";
import {
  previewMgmtreportImport,
  applyMgmtreportImport,
  type MgmtreportImportPreview,
} from "@workspace/api-client-react";
import { REPORT_YEAR } from "../lib/mgmtreportData";

function errorMessage(err: unknown): string {
  const data = (err as { data?: { error?: string } } | null)?.data;
  if (data?.error) return data.error;
  if (err instanceof Error && err.message) return err.message;
  return "요청 처리 중 오류가 발생했습니다. 다시 시도해 주세요.";
}

const fmt = (n: number) =>
  n.toLocaleString("ko-KR", { maximumFractionDigits: 0 });

export function MgmtReportUploadModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [year, setYear] = useState(REPORT_YEAR);
  const [preview, setPreview] = useState<MgmtreportImportPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<"preview" | "apply" | null>(null);
  const [done, setDone] = useState(false);

  const pickFile = (f: File | null) => {
    setFile(f);
    setPreview(null);
    setError(null);
    setDone(false);
  };

  const handlePreview = async () => {
    if (!file) {
      setError("Excel(.xlsx) 파일을 먼저 선택해 주세요.");
      return;
    }
    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      setError("xlsx 형식의 Excel 파일만 업로드할 수 있습니다.");
      return;
    }
    setLoading("preview");
    setError(null);
    try {
      const res = await previewMgmtreportImport({ file, year });
      setPreview(res);
    } catch (err) {
      setPreview(null);
      setError(errorMessage(err));
    } finally {
      setLoading(null);
    }
  };

  const handleApply = async () => {
    if (!file || !preview) return;
    setLoading("apply");
    setError(null);
    try {
      await applyMgmtreportImport({ file, year });
      setDone(true);
      await queryClient.invalidateQueries();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(null);
    }
  };

  const busy = loading != null;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(20,35,60,0.45)",
        zIndex: 2000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: "#fff",
          borderRadius: "12px",
          boxShadow: "0 12px 40px rgba(10,25,50,0.25)",
          width: "min(680px, 100%)",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 18px",
            borderBottom: "1px solid #e5eaf0",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <FileSpreadsheet size={16} color="#1e7145" />
            <span style={{ fontSize: "14px", fontWeight: 700, color: "#1a2d4d" }}>
              경영관리보고회 Excel 업로드
            </span>
          </div>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#8a94a6", padding: "4px" }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "16px 18px", overflowY: "auto" }}>
          <p style={{ margin: "0 0 12px", fontSize: "12px", color: "#5a6579", lineHeight: 1.6 }}>
            매월 취합된 경영관리보고회 Excel(.xlsx)을 업로드하면 자동으로 파싱하여 미리보기를 보여드립니다.
            내용을 확인한 뒤 <b>반영</b>을 누르면 대시보드 데이터가 갱신됩니다. (기존 경영관리보고회 데이터는 새 파일 내용으로 교체됩니다.)
          </p>

          {/* Controls */}
          <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap", marginBottom: "12px" }}>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx"
              style={{ display: "none" }}
              onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
            />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={busy}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                border: "1px dashed #9db3cc",
                borderRadius: "8px",
                padding: "8px 14px",
                fontSize: "12px",
                color: "#2e4568",
                backgroundColor: "#f6f9fc",
                cursor: busy ? "wait" : "pointer",
                maxWidth: "320px",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              <Upload size={13} />
              {file ? file.name : "Excel 파일 선택 (.xlsx)"}
            </button>
            <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#333", fontWeight: 600 }}>
              대상 연도:
              <input
                type="number"
                value={year}
                min={2000}
                max={2100}
                disabled={busy}
                onChange={(e) => {
                  setYear(Number(e.target.value));
                  setPreview(null);
                  setDone(false);
                }}
                style={{
                  width: "72px",
                  border: "1px solid #ccd4dd",
                  borderRadius: "6px",
                  padding: "6px 8px",
                  fontSize: "12px",
                }}
              />
            </label>
            <button
              onClick={handlePreview}
              disabled={busy || !file}
              style={{
                backgroundColor: "#2e4568",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                padding: "8px 16px",
                fontSize: "12px",
                fontWeight: 600,
                cursor: busy || !file ? "not-allowed" : "pointer",
                opacity: busy || !file ? 0.6 : 1,
              }}
            >
              {loading === "preview" ? "분석 중..." : "미리보기"}
            </button>
          </div>

          {error && (
            <div
              style={{
                backgroundColor: "#fdecec",
                border: "1px solid #f5c2c0",
                color: "#a94442",
                borderRadius: "8px",
                padding: "10px 12px",
                fontSize: "12px",
                marginBottom: "12px",
                whiteSpace: "pre-wrap",
              }}
            >
              {error}
            </div>
          )}

          {done && (
            <div
              style={{
                backgroundColor: "#e8f6ee",
                border: "1px solid #bfe5cf",
                color: "#1e7145",
                borderRadius: "8px",
                padding: "10px 12px",
                fontSize: "12px",
                marginBottom: "12px",
                fontWeight: 600,
              }}
            >
              반영이 완료되었습니다. 대시보드가 새 데이터로 갱신되었습니다.
            </div>
          )}

          {preview && (
            <div style={{ border: "1px solid #dde5ee", borderRadius: "10px", overflow: "hidden" }}>
              <div style={{ backgroundColor: "#f2f6fb", padding: "10px 14px", fontSize: "12px", color: "#1a2d4d", fontWeight: 700 }}>
                파싱 결과 미리보기 — {preview.year}년 (단위: {preview.unit})
              </div>
              <div style={{ padding: "10px 14px", fontSize: "12px", color: "#333", display: "flex", gap: "18px", flexWrap: "wrap", borderBottom: "1px solid #eef1f5" }}>
                <span>프로젝트 <b>{preview.projectCount}</b>개</span>
                <span>월별 데이터 <b>{fmt(preview.monthlyCount)}</b>건</span>
                <span>연간 전망 <b>{fmt(preview.annualCount)}</b>건</span>
                <span>손익 라인 <b>{fmt(preview.pnlCount)}</b>건</span>
                <span>
                  실적 입력 월: <b>{preview.monthsWithActual.length > 0 ? `${Math.min(...preview.monthsWithActual)}~${Math.max(...preview.monthsWithActual)}월` : "-"}</b>
                </span>
              </div>
              <div style={{ padding: "10px 14px", fontSize: "12px", color: "#333", display: "flex", gap: "18px", flexWrap: "wrap", borderBottom: "1px solid #eef1f5" }}>
                <span>매출 계획 합계 <b>{fmt(preview.totals.revenuePlan)}</b></span>
                <span>매출 실적/전망 합계 <b>{fmt(preview.totals.revenueActual)}</b></span>
                <span>원가 실적/전망 합계 <b>{fmt(preview.totals.cogsActual)}</b></span>
              </div>
              <div style={{ maxHeight: "220px", overflowY: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
                  <thead>
                    <tr style={{ backgroundColor: "#f8fafc", color: "#5a6579" }}>
                      <th style={{ textAlign: "left", padding: "6px 14px", fontWeight: 600 }}>프로젝트</th>
                      <th style={{ textAlign: "right", padding: "6px 10px", fontWeight: 600 }}>매출 실적/전망</th>
                      <th style={{ textAlign: "right", padding: "6px 10px", fontWeight: 600 }}>원가 실적/전망</th>
                      <th style={{ textAlign: "right", padding: "6px 14px", fontWeight: 600 }}>데이터 건수</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.projects.map((p) => (
                      <tr key={p.name} style={{ borderTop: "1px solid #eef1f5", backgroundColor: p.isGroup ? "#fbf7ec" : "#fff" }}>
                        <td style={{ padding: "6px 14px", color: "#1a2d4d", fontWeight: p.isGroup ? 700 : 400 }}>
                          {p.name}
                          {p.siteCode ? ` (${p.siteCode})` : ""}
                        </td>
                        <td style={{ padding: "6px 10px", textAlign: "right" }}>{fmt(p.revenueActualTotal)}</td>
                        <td style={{ padding: "6px 10px", textAlign: "right" }}>{fmt(p.cogsActualTotal)}</td>
                        <td style={{ padding: "6px 14px", textAlign: "right" }}>{fmt(p.monthlyCount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "10px",
            padding: "12px 18px",
            borderTop: "1px solid #e5eaf0",
            backgroundColor: "#fafbfd",
          }}
        >
          <button
            onClick={onClose}
            disabled={loading === "apply"}
            style={{
              backgroundColor: "#fff",
              border: "1px solid #ccd4dd",
              borderRadius: "6px",
              padding: "8px 16px",
              fontSize: "12px",
              color: "#333",
              cursor: "pointer",
            }}
          >
            닫기
          </button>
          <button
            onClick={handleApply}
            disabled={busy || !preview || done}
            style={{
              backgroundColor: "#1e7145",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              padding: "8px 18px",
              fontSize: "12px",
              fontWeight: 700,
              cursor: busy || !preview || done ? "not-allowed" : "pointer",
              opacity: busy || !preview || done ? 0.55 : 1,
            }}
          >
            {loading === "apply" ? "반영 중..." : "반영"}
          </button>
        </div>
      </div>
    </div>
  );
}
