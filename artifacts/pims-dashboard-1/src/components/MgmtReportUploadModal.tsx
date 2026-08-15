import React, { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { FileSpreadsheet, History, RotateCcw, Upload, X } from "lucide-react";
import {
  getPreviewMgmtreportImportUrl,
  getApplyMgmtreportImportUrl,
  getPreviewCashflowImportUrl,
  getApplyCashflowImportUrl,
  getPreviewSalescostImportUrl,
  getApplySalescostImportUrl,
  useListMgmtreportImportHistory,
  getListMgmtreportImportHistoryQueryKey,
  revertMgmtreportImport,
  type MgmtreportImportPreview,
  type CashflowImportPreview,
  type SalescostImportPreview,
} from "@workspace/api-client-react";
import { REPORT_YEAR } from "../lib/mgmtreportData";
import { TABLE_HEADER_BG, INK_MUTED, ACHIEVE_RED } from "../lib/uiTokens";
import { uploadWithProgress, type UploadProgress } from "../lib/uploadWithProgress";

type Dataset = "mgmtreport" | "cashflow" | "salescost";

const DATASET_META: Record<
  Dataset,
  { labelKey: string; needsYear: boolean; descriptionKey: string }
> = {
  mgmtreport: {
    labelKey: "datasetLabelMgmtreport",
    needsYear: true,
    descriptionKey: "datasetDescMgmtreport",
  },
  cashflow: {
    labelKey: "datasetLabelCashflow",
    needsYear: false,
    descriptionKey: "datasetDescCashflow",
  },
  salescost: {
    labelKey: "datasetLabelSalescost",
    needsYear: true,
    descriptionKey: "datasetDescSalescost",
  },
};

type PreviewState =
  | { kind: "mgmtreport"; data: MgmtreportImportPreview }
  | { kind: "cashflow"; data: CashflowImportPreview }
  | { kind: "salescost"; data: SalescostImportPreview };

function errorMessage(err: unknown, t: (key: string) => string): string {
  const data = (err as { data?: { error?: string } } | null)?.data;
  if (data?.error) return data.error;
  if (err instanceof Error && err.message) return err.message;
  return t("mgmtReportUploadModal:genericError");
}

const fmt = (n: number) =>
  n.toLocaleString("ko-KR", { maximumFractionDigits: 0 });

const thLeft: React.CSSProperties = { textAlign: "left", padding: "6px 14px", fontWeight: 600 };
const thRight: React.CSSProperties = { textAlign: "right", padding: "6px 10px", fontWeight: 600 };
const thRightEdge: React.CSSProperties = { textAlign: "right", padding: "6px 14px", fontWeight: 600 };
const tdRight: React.CSSProperties = { padding: "6px 10px", textAlign: "right" };
const tdRightEdge: React.CSSProperties = { padding: "6px 14px", textAlign: "right" };
const statRow: React.CSSProperties = {
  padding: "10px 14px",
  fontSize: "12px",
  color: "#333",
  display: "flex",
  gap: "18px",
  flexWrap: "wrap",
  borderBottom: "1px solid #eef2f7",
};

export function MgmtReportUploadModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation(["mgmtReportUploadModal", "common"]);
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [dataset, setDataset] = useState<Dataset>("mgmtreport");
  const [file, setFile] = useState<File | null>(null);
  const [year, setYear] = useState(REPORT_YEAR);
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<"preview" | "apply" | "revert" | null>(null);
  const [done, setDone] = useState(false);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [revertDone, setRevertDone] = useState<string | null>(null);
  const [confirmRevertId, setConfirmRevertId] = useState<number | null>(null);

  const metaFor = (key: Dataset) => ({
    needsYear: DATASET_META[key].needsYear,
    label: t(`mgmtReportUploadModal:${DATASET_META[key].labelKey}`),
    description: t(`mgmtReportUploadModal:${DATASET_META[key].descriptionKey}`),
  });
  const meta = metaFor(dataset);

  const historyQuery = useListMgmtreportImportHistory({
    query: {
      enabled: dataset === "mgmtreport",
      queryKey: getListMgmtreportImportHistoryQueryKey(),
    },
  });
  const history = historyQuery.data?.entries ?? [];

  const handleRevert = async (historyId: number) => {
    setLoading("revert");
    setError(null);
    setRevertDone(null);
    try {
      const res = await revertMgmtreportImport({ historyId });
      setRevertDone(
        t("mgmtReportUploadModal:revertDoneMessage", {
          filename: res.filename,
          restoredProjects: res.restoredProjects,
          restoredMonthly: fmt(res.restoredMonthly),
        }),
      );
      setConfirmRevertId(null);
      setPreview(null);
      setDone(false);
      await queryClient.invalidateQueries();
    } catch (err) {
      setError(errorMessage(err, t));
    } finally {
      setLoading(null);
    }
  };

  const resetResult = () => {
    setPreview(null);
    setError(null);
    setDone(false);
  };

  const pickFile = (f: File | null) => {
    setFile(f);
    resetResult();
  };

  const handlePreview = async () => {
    if (!file) {
      setError(t("mgmtReportUploadModal:selectFileFirst"));
      return;
    }
    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      setError(t("mgmtReportUploadModal:xlsxOnly"));
      return;
    }
    setLoading("preview");
    setError(null);
    setProgress({ phase: "upload", percent: 0 });
    try {
      const form = new FormData();
      form.append("file", file);
      if (dataset !== "cashflow") form.append("year", String(year));
      if (dataset === "mgmtreport") {
        const res = await uploadWithProgress<MgmtreportImportPreview>(
          getPreviewMgmtreportImportUrl(),
          form,
          setProgress,
        );
        setPreview({ kind: "mgmtreport", data: res });
      } else if (dataset === "cashflow") {
        const res = await uploadWithProgress<CashflowImportPreview>(
          getPreviewCashflowImportUrl(),
          form,
          setProgress,
        );
        setPreview({ kind: "cashflow", data: res });
      } else {
        const res = await uploadWithProgress<SalescostImportPreview>(
          getPreviewSalescostImportUrl(),
          form,
          setProgress,
        );
        setPreview({ kind: "salescost", data: res });
      }
    } catch (err) {
      setPreview(null);
      setError(errorMessage(err, t));
    } finally {
      setLoading(null);
      setProgress(null);
    }
  };

  const handleApply = async () => {
    if (!file || !preview) return;
    setLoading("apply");
    setError(null);
    setProgress({ phase: "upload", percent: 0 });
    try {
      const form = new FormData();
      form.append("file", file);
      if (preview.kind !== "cashflow") form.append("year", String(year));
      if (preview.kind === "mgmtreport") {
        await uploadWithProgress(getApplyMgmtreportImportUrl(), form, setProgress);
      } else if (preview.kind === "cashflow") {
        await uploadWithProgress(getApplyCashflowImportUrl(), form, setProgress);
      } else {
        await uploadWithProgress(getApplySalescostImportUrl(), form, setProgress);
      }
      setDone(true);
      await queryClient.invalidateQueries();
    } catch (err) {
      setError(errorMessage(err, t));
    } finally {
      setLoading(null);
      setProgress(null);
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
            borderBottom: "1px solid #e2e9f3",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <FileSpreadsheet size={16} color="#1c7a5a" />
            <span style={{ fontSize: "14px", fontWeight: 700, color: "#16294a" }}>
              {t("mgmtReportUploadModal:modalTitle")}
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
          <p style={{ margin: "0 0 12px", fontSize: "12px", color: INK_MUTED, lineHeight: 1.6 }}>
            {meta.description} {t("mgmtReportUploadModal:descConfirmBefore")}<b>{t("mgmtReportUploadModal:apply")}</b>{t("mgmtReportUploadModal:descConfirmAfter")}
          </p>

          {/* Controls */}
          <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap", marginBottom: "12px" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#333", fontWeight: 600 }}>
              {t("mgmtReportUploadModal:datasetTypeLabel")}
              <select
                value={dataset}
                disabled={busy}
                onChange={(e) => {
                  setDataset(e.target.value as Dataset);
                  resetResult();
                }}
                style={{
                  border: "1px solid #dde6f1",
                  borderRadius: "6px",
                  padding: "6px 8px",
                  fontSize: "12px",
                  backgroundColor: "#fff",
                }}
              >
                {(Object.keys(DATASET_META) as Dataset[]).map((key) => (
                  <option key={key} value={key}>
                    {metaFor(key).label}
                  </option>
                ))}
              </select>
            </label>
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
                color: "#1e3a6e",
                backgroundColor: "#f6f9fc",
                cursor: busy ? "wait" : "pointer",
                maxWidth: "320px",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              <Upload size={13} />
              {file ? file.name : t("mgmtReportUploadModal:selectExcelFilePlaceholder")}
            </button>
            {meta.needsYear && (
              <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#333", fontWeight: 600 }}>
                {t("mgmtReportUploadModal:targetYearLabel")}
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
                    border: "1px solid #dde6f1",
                    borderRadius: "6px",
                    padding: "6px 8px",
                    fontSize: "12px",
                  }}
                />
              </label>
            )}
            <button
              onClick={handlePreview}
              disabled={busy || !file}
              style={{
                backgroundColor: "#1e3a6e",
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
              {loading === "preview" ? t("mgmtReportUploadModal:previewAnalyzing") : t("mgmtReportUploadModal:previewButton")}
            </button>
          </div>

          {progress && (
            <div style={{ marginBottom: "12px" }}>
              <style>{`@keyframes uploadIndeterminate { 0% { left: -40%; } 100% { left: 100%; } }`}</style>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: INK_MUTED, marginBottom: "4px", fontWeight: 600 }}>
                <span>
                  {progress.phase === "upload"
                    ? t("mgmtReportUploadModal:uploadingFile")
                    : loading === "apply"
                      ? dataset === "cashflow"
                        ? t("mgmtReportUploadModal:applyingCashflowNote")
                        : t("mgmtReportUploadModal:applyingData")
                      : t("mgmtReportUploadModal:analyzingFile")}
                </span>
                {progress.phase === "upload" && <span>{progress.percent}%</span>}
              </div>
              <div style={{ position: "relative", height: "8px", backgroundColor: "#eef2f7", borderRadius: "4px", overflow: "hidden" }}>
                {progress.phase === "upload" ? (
                  <div
                    style={{
                      height: "100%",
                      width: `${progress.percent}%`,
                      backgroundColor: "#1e3a6e",
                      borderRadius: "4px",
                      transition: "width 0.2s ease",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      position: "absolute",
                      top: 0,
                      height: "100%",
                      width: "40%",
                      backgroundColor: "#1c7a5a",
                      borderRadius: "4px",
                      animation: "uploadIndeterminate 1.2s linear infinite",
                    }}
                  />
                )}
              </div>
            </div>
          )}

          {error && (
            <div
              style={{
                backgroundColor: "#fdecec",
                border: "1px solid #f5c2c0",
                color: ACHIEVE_RED,
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
                color: "#1c7a5a",
                borderRadius: "8px",
                padding: "10px 12px",
                fontSize: "12px",
                marginBottom: "12px",
                fontWeight: 600,
              }}
            >
              {t("mgmtReportUploadModal:applyCompleteMessage")}
            </div>
          )}

          {revertDone && (
            <div
              style={{
                backgroundColor: "#eef4fd",
                border: "1px solid #c3d7f2",
                color: "#1e3a6e",
                borderRadius: "8px",
                padding: "10px 12px",
                fontSize: "12px",
                marginBottom: "12px",
                fontWeight: 600,
              }}
            >
              {revertDone}
            </div>
          )}

          {dataset === "mgmtreport" && history.length > 0 && (
            <div style={{ border: "1px solid #e2e9f3", borderRadius: "10px", overflow: "hidden", marginBottom: "12px" }}>
              <div
                style={{
                  backgroundColor: "#f2f6fb",
                  padding: "10px 14px",
                  fontSize: "12px",
                  color: "#16294a",
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <History size={13} />
                {t("mgmtReportUploadModal:recentHistoryTitle")}
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
                <thead>
                  <tr style={{ backgroundColor: TABLE_HEADER_BG, color: INK_MUTED }}>
                    <th style={thLeft}>{t("mgmtReportUploadModal:colAppliedAt")}</th>
                    <th style={thLeft}>{t("mgmtReportUploadModal:colFilename")}</th>
                    <th style={thRight}>{t("common:year")}</th>
                    <th style={thRightEdge}></th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((h) => (
                    <tr key={h.id} style={{ borderTop: "1px solid #eef2f7" }}>
                      <td style={{ padding: "6px 14px", color: INK_MUTED, whiteSpace: "nowrap" }}>
                        {new Date(h.createdAt).toLocaleString("ko-KR", {
                          year: "2-digit",
                          month: "2-digit",
                          day: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td style={{ padding: "6px 14px", color: "#16294a", wordBreak: "break-all" }}>{h.filename}</td>
                      <td style={tdRight}>{h.year}</td>
                      <td style={{ ...tdRightEdge, whiteSpace: "nowrap" }}>
                        {h.snapshotEmpty ? (
                          <span style={{ color: "#8a94a6" }}>{t("mgmtReportUploadModal:cannotRestore")}</span>
                        ) : confirmRevertId === h.id ? (
                          <span style={{ display: "inline-flex", gap: "6px", alignItems: "center" }}>
                            <span style={{ color: ACHIEVE_RED, fontWeight: 600 }}>{t("mgmtReportUploadModal:confirmRestorePrompt")}</span>
                            <button
                              onClick={() => handleRevert(h.id)}
                              disabled={busy}
                              style={{
                                backgroundColor: ACHIEVE_RED,
                                color: "#fff",
                                border: "none",
                                borderRadius: "5px",
                                padding: "4px 10px",
                                fontSize: "11px",
                                fontWeight: 700,
                                cursor: busy ? "wait" : "pointer",
                              }}
                            >
                              {loading === "revert" ? t("mgmtReportUploadModal:restoring") : t("common:confirm")}
                            </button>
                            <button
                              onClick={() => setConfirmRevertId(null)}
                              disabled={busy}
                              style={{
                                backgroundColor: "#fff",
                                border: "1px solid #dde6f1",
                                borderRadius: "5px",
                                padding: "4px 10px",
                                fontSize: "11px",
                                cursor: "pointer",
                              }}
                            >
                              {t("common:cancel")}
                            </button>
                          </span>
                        ) : (
                          <button
                            onClick={() => setConfirmRevertId(h.id)}
                            disabled={busy}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "5px",
                              backgroundColor: "#fff",
                              border: "1px solid #dde6f1",
                              borderRadius: "5px",
                              padding: "4px 10px",
                              fontSize: "11px",
                              color: "#1e3a6e",
                              fontWeight: 600,
                              cursor: busy ? "wait" : "pointer",
                            }}
                          >
                            <RotateCcw size={11} />
                            {t("mgmtReportUploadModal:revertToPreviousData")}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {preview?.kind === "mgmtreport" && (
            <div style={{ border: "1px solid #e2e9f3", borderRadius: "10px", overflow: "hidden" }}>
              <div style={{ backgroundColor: "#f2f6fb", padding: "10px 14px", fontSize: "12px", color: "#16294a", fontWeight: 700 }}>
                {t("mgmtReportUploadModal:previewHeaderMgmtreport", { year: preview.data.year, unit: preview.data.unit })}
              </div>
              <div style={statRow}>
                <span>{t("mgmtReportUploadModal:statProjectPrefix")}<b>{preview.data.projectCount}</b>{t("mgmtReportUploadModal:countSuffixGae")}</span>
                <span>{t("mgmtReportUploadModal:statMonthlyDataPrefix")}<b>{fmt(preview.data.monthlyCount)}</b>{t("mgmtReportUploadModal:countSuffixGeon")}</span>
                <span>{t("mgmtReportUploadModal:statAnnualForecastPrefix")}<b>{fmt(preview.data.annualCount)}</b>{t("mgmtReportUploadModal:countSuffixGeon")}</span>
                <span>{t("mgmtReportUploadModal:statPnlLinePrefix")}<b>{fmt(preview.data.pnlCount)}</b>{t("mgmtReportUploadModal:countSuffixGeon")}</span>
                <span>
                  {t("mgmtReportUploadModal:statActualMonthLabel")}<b>{preview.data.monthsWithActual.length > 0 ? t("mgmtReportUploadModal:monthRange", { min: Math.min(...preview.data.monthsWithActual), max: Math.max(...preview.data.monthsWithActual) }) : "-"}</b>
                </span>
              </div>
              <div style={statRow}>
                <span>{t("mgmtReportUploadModal:statRevenuePlanTotalPrefix")}<b>{fmt(preview.data.totals.revenuePlan)}</b></span>
                <span>{t("mgmtReportUploadModal:statRevenueActualTotalPrefix")}<b>{fmt(preview.data.totals.revenueActual)}</b></span>
                <span>{t("mgmtReportUploadModal:statCogsActualTotalPrefix")}<b>{fmt(preview.data.totals.cogsActual)}</b></span>
              </div>
              <div style={{ maxHeight: "220px", overflowY: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
                  <thead>
                    <tr style={{ backgroundColor: TABLE_HEADER_BG, color: INK_MUTED }}>
                      <th style={thLeft}>{t("common:project")}</th>
                      <th style={thRight}>{t("mgmtReportUploadModal:colRevenueActualForecast")}</th>
                      <th style={thRight}>{t("mgmtReportUploadModal:colCogsActualForecast")}</th>
                      <th style={thRightEdge}>{t("mgmtReportUploadModal:colDataCount")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.data.projects.map((p) => (
                      <tr key={p.name} style={{ borderTop: "1px solid #eef2f7", backgroundColor: p.isGroup ? "#fbf7ec" : "#fff" }}>
                        <td style={{ padding: "6px 14px", color: "#16294a", fontWeight: p.isGroup ? 700 : 400 }}>
                          {p.name}
                          {p.siteCode ? ` (${p.siteCode})` : ""}
                        </td>
                        <td style={tdRight}>{fmt(p.revenueActualTotal)}</td>
                        <td style={tdRight}>{fmt(p.cogsActualTotal)}</td>
                        <td style={tdRightEdge}>{fmt(p.monthlyCount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {preview?.kind === "cashflow" && (
            <div style={{ border: "1px solid #e2e9f3", borderRadius: "10px", overflow: "hidden" }}>
              <div style={{ backgroundColor: "#f2f6fb", padding: "10px 14px", fontSize: "12px", color: "#16294a", fontWeight: 700 }}>
                {t("mgmtReportUploadModal:previewHeaderCashflow", { unit: preview.data.unit })}
              </div>
              <div style={statRow}>
                <span>{t("mgmtReportUploadModal:statProjectPrefix")}<b>{preview.data.projectCount}</b>{t("mgmtReportUploadModal:countSuffixGae")}</span>
                <span>{t("mgmtReportUploadModal:statMonthlyDataPrefix")}<b>{fmt(preview.data.amountCount)}</b>{t("mgmtReportUploadModal:countSuffixGeon")}</span>
              </div>
              <div style={statRow}>
                <span>{t("mgmtReportUploadModal:statCashInTotalPrefix")}<b>{fmt(preview.data.totals.cashIn)}</b></span>
                <span>{t("mgmtReportUploadModal:statCashOutTotalPrefix")}<b>{fmt(preview.data.totals.cashOut)}</b></span>
              </div>
              <div style={{ maxHeight: "220px", overflowY: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
                  <thead>
                    <tr style={{ backgroundColor: TABLE_HEADER_BG, color: INK_MUTED }}>
                      <th style={thLeft}>{t("common:project")}</th>
                      <th style={thLeft}>{t("mgmtReportUploadModal:colDivision")}</th>
                      <th style={thRight}>{t("mgmtReportUploadModal:colIncomeTotal")}</th>
                      <th style={thRight}>{t("mgmtReportUploadModal:colExpenseTotal")}</th>
                      <th style={thRightEdge}>{t("mgmtReportUploadModal:colDataCount")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.data.projects.map((p) => (
                      <tr key={p.name} style={{ borderTop: "1px solid #eef2f7" }}>
                        <td style={{ padding: "6px 14px", color: "#16294a" }}>{p.name}</td>
                        <td style={{ padding: "6px 14px", color: INK_MUTED }}>{p.division}</td>
                        <td style={tdRight}>{fmt(p.cashInTotal)}</td>
                        <td style={tdRight}>{fmt(p.cashOutTotal)}</td>
                        <td style={tdRightEdge}>{fmt(p.amountCount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {preview?.kind === "salescost" && (
            <div style={{ border: "1px solid #e2e9f3", borderRadius: "10px", overflow: "hidden" }}>
              <div style={{ backgroundColor: "#f2f6fb", padding: "10px 14px", fontSize: "12px", color: "#16294a", fontWeight: 700 }}>
                {t("mgmtReportUploadModal:previewHeaderSalescost", { year: preview.data.year, unit: preview.data.unit })}
              </div>
              <div style={statRow}>
                <span>{t("mgmtReportUploadModal:statSiteCountPrefix")}<b>{preview.data.siteCount}</b>{t("mgmtReportUploadModal:countSuffixGae")}</span>
                <span>{t("mgmtReportUploadModal:statMonthlyDataPrefix")}<b>{fmt(preview.data.amountCount)}</b>{t("mgmtReportUploadModal:countSuffixGeon")}</span>
              </div>
              <div style={statRow}>
                <span>{t("mgmtReportUploadModal:statRevenueTotalPrefix")}<b>{fmt(preview.data.totals.revenueUsd)}</b></span>
                <span>{t("mgmtReportUploadModal:statCogsTotalPrefix")}<b>{fmt(preview.data.totals.cogsUsd)}</b></span>
              </div>
              <div style={{ maxHeight: "220px", overflowY: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
                  <thead>
                    <tr style={{ backgroundColor: TABLE_HEADER_BG, color: INK_MUTED }}>
                      <th style={thLeft}>{t("mgmtReportUploadModal:colCode")}</th>
                      <th style={thLeft}>{t("mgmtReportUploadModal:colSiteName")}</th>
                      <th style={thRight}>{t("mgmtReportUploadModal:colRevenueTotal")}</th>
                      <th style={thRight}>{t("mgmtReportUploadModal:colCogsTotal")}</th>
                      <th style={thRightEdge}>{t("mgmtReportUploadModal:colDataCount")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.data.sites.map((s) => (
                      <tr key={s.code} style={{ borderTop: "1px solid #eef2f7" }}>
                        <td style={{ padding: "6px 14px", color: INK_MUTED }}>{s.code}</td>
                        <td style={{ padding: "6px 14px", color: "#16294a" }}>{s.name}</td>
                        <td style={tdRight}>{fmt(s.revenueUsdTotal)}</td>
                        <td style={tdRight}>{fmt(s.cogsUsdTotal)}</td>
                        <td style={tdRightEdge}>{fmt(s.amountCount)}</td>
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
            borderTop: "1px solid #e2e9f3",
            backgroundColor: "#fafbfd",
          }}
        >
          <button
            onClick={onClose}
            disabled={loading === "apply"}
            style={{
              backgroundColor: "#fff",
              border: "1px solid #dde6f1",
              borderRadius: "6px",
              padding: "8px 16px",
              fontSize: "12px",
              color: "#333",
              cursor: "pointer",
            }}
          >
            {t("common:close")}
          </button>
          <button
            onClick={handleApply}
            disabled={busy || !preview || done}
            style={{
              backgroundColor: "#1c7a5a",
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
            {loading === "apply" ? t("mgmtReportUploadModal:applying") : t("mgmtReportUploadModal:apply")}
          </button>
        </div>
      </div>
    </div>
  );
}
