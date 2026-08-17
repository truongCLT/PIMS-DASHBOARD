import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronsUp, Download, FileSpreadsheet, FileText, RefreshCw, Upload } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useListMgmtreportProjects, getBaseUrl } from "@workspace/api-client-react";
import { exportDashboardExcel, exportDashboardPdf } from "../lib/exportDashboard";
import { MgmtReportUploadModal } from "./MgmtReportUploadModal";
import { FxRateEditor } from "./FxRateEditor";
import { OrgStructureEditor } from "./OrgStructureEditor";
import { PimsvinaSyncPreviewModal, type PimsvinaPreviewData } from "./PimsvinaSyncPreviewModal";
import { useAdminAuth, readAdminToken } from "../lib/adminAuth";
import {
  useDashboardFilters,
  UNIT_OPTIONS,
  REPORT_YEAR,
  type PeriodMode,
  type CurrencyCode,
} from "../lib/dashboardFilters";
import { tokens as aquaTokens } from "@workspace/aqua-glass";
const AG = aquaTokens.color.light;

export function DashboardHeader({
  onSelectProject,
}: {
  onSelectProject?: (name: string) => void;
}) {
  const {
    project,
    division,
    setProject,
    startYm: startDate,
    setStartYm: setStartDate,
    endYm: endDate,
    setEndYm: setEndDate,
    period,
    setPeriod,
    currency,
    setCurrency,
    unitIndex,
    setUnitIndex,
  } = useDashboardFilters();

  const { t } = useTranslation(["dashboardHeader", "common"]);
  const { isAdmin } = useAdminAuth();
  const projectsQuery = useListMgmtreportProjects({ year: REPORT_YEAR });
  const projectOptions = (projectsQuery.data?.projects ?? []).filter((p) => !p.isGroup);

  const unitOptions = UNIT_OPTIONS[currency] ?? UNIT_OPTIONS.USD;
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncPreview, setSyncPreview] = useState<PimsvinaPreviewData | null>(null);
  const [confirming, setConfirming] = useState(false);
  const downloadRef = useRef<HTMLDivElement>(null);
  const downloadMenuRef = useRef<HTMLDivElement>(null);
  const [downloadPos, setDownloadPos] = useState<{ top: number; right: number } | null>(null);

  const adminFetch = (path: string, body?: any) => {
    const token = readAdminToken();
    const baseUrl = getBaseUrl() || "";
    const fullUrl = path.startsWith("/") ? `${baseUrl}${path}` : path;
    return fetch(fullUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  };

  // 1단계: PIMSVINA에서 데이터를 조회만 하고 미리보기 팝업을 연다 (아직 DB에 저장하지 않음)
  const handleSyncPimsvina = async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      const res = await adminFetch("/api/sync-pimsvina/preview");
      const data = await res.json();
      if (data.success) {
        setSyncPreview(data.data);
      } else {
        alert(t("dashboardHeader:syncFailed", { error: data.error || t("dashboardHeader:syncFailedDefaultError") }));
      }
    } catch (err: any) {
      console.error("Sync preview error:", err);
      alert(t("dashboardHeader:connectionErrorMessage", { message: err.message }));
    } finally {
      setSyncing(false);
    }
  };

  // 2단계: 미리보기 팝업에서 "확인"을 누르면 실제로 DB에 저장한다
  const handleConfirmSync = async () => {
    if (confirming || !syncPreview) return;
    setConfirming(true);
    try {
      const res = await adminFetch("/api/sync-pimsvina/confirm", { data: syncPreview });
      const data = await res.json();
      if (data.success) {
        alert(
          t("dashboardHeader:syncSuccessMessage", {
            cfProjects: data.counts?.cfProjects ?? 0,
            cfMonthly: data.counts?.cfMonthly ?? 0,
            scSites: data.counts?.scSites ?? 0,
            scMonthly: data.counts?.scMonthly ?? 0,
            mrProjects: data.counts?.mrProjects ?? 0,
            mrMonthly: data.counts?.mrMonthly ?? 0,
            mrAnnual: data.counts?.mrAnnual ?? 0,
            mrPnl: data.counts?.mrPnl ?? 0,
            pdOverview: data.counts?.pdOverview ?? 0,
            pdProgress: data.counts?.pdProgress ?? 0,
            pdOutsourcing: data.counts?.pdOutsourcing ?? 0,
            pdCashflow: data.counts?.pdCashflow ?? 0,
            pdSales: data.counts?.pdSales ?? 0,
            pdCostBudget: data.counts?.pdCostBudget ?? 0,
            fxRates: data.counts?.fxRates ?? 0,
          })
        );
        window.location.reload();
      } else {
        alert(t("dashboardHeader:syncFailed", { error: data.error || t("dashboardHeader:syncFailedDefaultError") }));
      }
    } catch (err: any) {
      console.error("Sync confirm error:", err);
      alert(t("dashboardHeader:connectionErrorMessage", { message: err.message }));
    } finally {
      setConfirming(false);
    }
  };

  useEffect(() => {
    if (!downloadOpen) return;
    const updatePos = () => {
      const btn = downloadRef.current;
      if (!btn) return;
      const rect = btn.getBoundingClientRect();
      setDownloadPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
    };
    updatePos();
    window.addEventListener("resize", updatePos);
    window.addEventListener("scroll", updatePos, true);
    const onClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (downloadRef.current?.contains(target)) return;
      if (downloadMenuRef.current?.contains(target)) return;
      setDownloadOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => {
      window.removeEventListener("resize", updatePos);
      window.removeEventListener("scroll", updatePos, true);
      document.removeEventListener("mousedown", onClickOutside);
    };
  }, [downloadOpen]);

  const handleExcel = async () => {
    setDownloadOpen(false);
    try {
      await exportDashboardExcel();
    } catch (err) {
      console.error("Excel export failed", err);
      alert(t("dashboardHeader:excelExportError"));
    }
  };

  const handlePdf = async () => {
    setDownloadOpen(false);
    setExporting(true);
    try {
      await exportDashboardPdf();
    } catch (err) {
      console.error("PDF export failed", err);
      alert(t("dashboardHeader:pdfExportError"));
    } finally {
      setExporting(false);
    }
  };

  return (
    <div style={{
      background: "linear-gradient(120deg, #dce9f5 0%, #e8f1f9 25%, #c9dcee 50%, #b3cde3 75%, #9dbdd8 100%)",
      padding: "14px 16px 14px",
      position: "relative",
      flexShrink: 0,
      borderRadius: "10px",
      boxShadow: "0 1px 4px rgba(30,60,110,0.08)",
    }}>
      {/* Background building image overlay */}
      <div style={{
        position: "absolute",
        right: 0,
        top: 0,
        bottom: 0,
        width: "70%",
        opacity: 0.35,
        borderRadius: "0 10px 10px 0",
        overflow: "hidden",
        backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 600 200'%3E%3Cg stroke='%23ffffff' stroke-width='2' opacity='0.6'%3E%3Cline x1='100' y1='0' x2='300' y2='200'/%3E%3Cline x1='150' y1='0' x2='350' y2='200'/%3E%3Cline x1='200' y1='0' x2='400' y2='200'/%3E%3Cline x1='250' y1='0' x2='450' y2='200'/%3E%3Cline x1='300' y1='0' x2='500' y2='200'/%3E%3Cline x1='350' y1='0' x2='550' y2='200'/%3E%3Cline x1='400' y1='0' x2='600' y2='200'/%3E%3C/g%3E%3Cg stroke='%237da7cc' stroke-width='1' opacity='0.5'%3E%3Cline x1='0' y1='50' x2='600' y2='20'/%3E%3Cline x1='0' y1='100' x2='600' y2='70'/%3E%3Cline x1='0' y1='150' x2='600' y2='120'/%3E%3C/g%3E%3C/svg%3E\")",
        backgroundSize: "cover",
      }} />

      <div style={{ position: "relative", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <h1 style={{
          color: AG.secondary,
          fontSize: "22px",
          fontWeight: "700",
          margin: "0 0 12px",
        }}>{t("dashboardHeader:title")}</h1>
        <button style={{
          backgroundColor: "#ffffff",
          border: "1px solid #d5dfe9",
          borderRadius: "8px",
          padding: "6px 8px",
          cursor: "pointer",
          color: AG.primary,
          boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
          display: "flex",
          alignItems: "center",
        }}>
          <ChevronsUp size={16} />
        </button>
      </div>

      {/* Filter bar — white rounded box */}
      <div style={{
        position: "relative",
        backgroundColor: "#ffffff",
        borderRadius: "10px",
        boxShadow: "0 2px 8px rgba(30,60,110,0.10)",
        padding: "12px 14px",
        display: "flex",
        alignItems: "center",
        gap: "10px",
        flexWrap: "wrap",
      }}>
        {/* Project filter */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "12px", color: "#333", fontWeight: "600" }}>{t("common:project")}:</span>
          <select
            value={project}
            onChange={(e) => {
              const value = e.target.value;
              if (value !== "All" && onSelectProject) {
                onSelectProject(value);
                return;
              }
              setProject(value);
            }}
            style={{
              border: `1px solid ${AG.input}`,
              borderRadius: "6px",
              padding: "5px 26px 5px 10px",
              fontSize: "12px",
              color: "#333",
              backgroundColor: "#fff",
              cursor: "pointer",
              minWidth: "70px",
              maxWidth: "260px",
            }}
          >
            <option value="All">{t("common:all")}</option>
            {projectOptions.map((p) => (
              <option key={p.name} value={p.name}>
                {p.name}
              </option>
            ))}
          </select>
          {division && project === "All" && (
            <span
              style={{
                fontSize: "12px",
                fontWeight: 700,
                color: AG.primary,
                backgroundColor: "#eaf2fd",
                border: "1px solid #c4dbf7",
                borderRadius: "6px",
                padding: "4px 8px",
                whiteSpace: "nowrap",
              }}
            >
              {t("dashboardHeader:divisionTotalSuffix", { division })}
            </span>
          )}
        </div>

        {/* Date filter */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "12px", color: "#333", fontWeight: "600" }}>{t("dashboardHeader:periodRangeLabel")}</span>
          <div style={{
            display: "flex",
            alignItems: "center",
            border: `1px solid ${AG.input}`,
            borderRadius: "6px",
            padding: "2px 8px",
            backgroundColor: "#fff",
            gap: "6px",
          }}>
            <input
              type="month"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{
                border: "none",
                outline: "none",
                fontSize: "12px",
                color: startDate ? "#333" : "#aab2bc",
                backgroundColor: "transparent",
                cursor: "pointer",
                width: "104px",
                padding: "3px 0",
              }}
            />
            <span style={{ fontSize: "12px", color: "#aab2bc" }}>→</span>
            <input
              type="month"
              value={endDate}
              min={startDate || undefined}
              onChange={(e) => setEndDate(e.target.value)}
              style={{
                border: "none",
                outline: "none",
                fontSize: "12px",
                color: endDate ? "#333" : "#aab2bc",
                backgroundColor: "transparent",
                cursor: "pointer",
                width: "104px",
                padding: "3px 0",
              }}
            />
          </div>
        </div>

        {/* View period */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "12px", color: "#333", fontWeight: "600" }}>{t("dashboardHeader:periodModeLabel")}</span>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as PeriodMode)}
            style={{
              border: `1px solid ${AG.input}`,
              borderRadius: "6px",
              padding: "5px 26px 5px 10px",
              fontSize: "12px",
              color: "#333",
              backgroundColor: "#fff",
              cursor: "pointer",
            }}
          >
            <option value="Month">{t("dashboardHeader:periodOptionMonth")}</option>
            <option value="Quarter">{t("dashboardHeader:periodOptionQuarter")}</option>
            <option value="Year">{t("common:annual")}</option>
          </select>
        </div>

        {/* Currency */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "12px", color: "#333", fontWeight: "600" }}>{t("common:exchangeRate")}:</span>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
            style={{
              border: `1px solid ${AG.input}`,
              borderRadius: "6px",
              padding: "5px 26px 5px 10px",
              fontSize: "12px",
              color: "#333",
              backgroundColor: "#fff",
              cursor: "pointer",
            }}
          >
            <option value="USD">USD</option>
            <option value="VND">VND</option>
            <option value="KRW">KRW</option>
          </select>
        </div>

        {/* Unit toggle */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginLeft: "auto" }}>
          <span style={{ fontSize: "12px", color: "#333", fontWeight: "600" }}>{t("common:unit")}:</span>
          <span style={{ fontSize: "12px", color: unitIndex === 0 ? "#333" : "#999", fontWeight: "600" }}>
            {unitOptions[0]}
          </span>
          <div
            onClick={() => setUnitIndex(unitIndex === 0 ? 1 : 0)}
            style={{
              width: "36px",
              height: "20px",
              backgroundColor: "#5b5fc7",
              borderRadius: "10px",
              position: "relative",
              cursor: "pointer",
            }}
          >
            <div style={{
              position: "absolute",
              left: unitIndex === 0 ? "2px" : "18px",
              top: "2px",
              width: "16px",
              height: "16px",
              backgroundColor: "#ffffff",
              borderRadius: "50%",
              boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
              transition: "left 0.15s ease",
            }} />
          </div>
          <span style={{ fontSize: "12px", color: unitIndex === 1 ? "#333" : "#999", fontWeight: "600" }}>
            {unitOptions[1]}
          </span>
        </div>



        {/* 관리자 전용: 조직 구조 + 환율 설정 + Excel 업로드 */}
        {isAdmin && <OrgStructureEditor />}
        {isAdmin && <FxRateEditor />}
        {isAdmin && (
          <button
            onClick={() => setUploadOpen(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              backgroundColor: AG.accentForeground,
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              padding: "7px 14px",
              fontSize: "12px",
              cursor: "pointer",
              fontWeight: "500",
            }}
          >
            <Upload size={13} />
            Excel {t("common:upload")}
          </button>
        )}

        {/* Download button + dropdown */}
        <div ref={downloadRef} style={{ position: "relative" }}>
          <button
            onClick={() => setDownloadOpen((v) => !v)}
            disabled={exporting}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              backgroundColor: AG.secondary,
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              padding: "7px 14px",
              fontSize: "12px",
              cursor: exporting ? "wait" : "pointer",
              fontWeight: "500",
              opacity: exporting ? 0.7 : 1,
            }}
          >
            <Download size={13} />
            {exporting ? t("dashboardHeader:generatingLabel") : t("common:download")}
            <span style={{ fontSize: "10px", opacity: 0.8 }}>▼</span>
          </button>

          {downloadOpen && downloadPos && createPortal(
            <>
              <div
                onClick={() => setDownloadOpen(false)}
                style={{ position: "fixed", inset: 0, zIndex: 999 }}
              />
              <div ref={downloadMenuRef} style={{
                position: "fixed",
                top: downloadPos.top,
                right: downloadPos.right,
                backgroundColor: "#fff",
                border: `1px solid ${AG.input}`,
                borderRadius: "6px",
                boxShadow: "0 4px 12px rgba(20,40,80,0.15)",
                zIndex: 1000,
                minWidth: "170px",
                overflow: "hidden",
              }}>
                <button
                  onClick={handleExcel}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    width: "100%",
                    padding: "9px 14px",
                    fontSize: "12px",
                    color: AG.foreground,
                    backgroundColor: "transparent",
                    border: "none",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#eef3f9")}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                >
                  <FileSpreadsheet size={14} color={AG.accentForeground} />
                  {t("dashboardHeader:excelDownloadOption")}
                </button>
                <button
                  onClick={handlePdf}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    width: "100%",
                    padding: "9px 14px",
                    fontSize: "12px",
                    color: AG.foreground,
                    backgroundColor: "transparent",
                    border: "none",
                    cursor: "pointer",
                    textAlign: "left",
                    borderTop: `1px solid ${AG.background}`,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#eef3f9")}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                >
                  <FileText size={14} color="#e0655c" />
                  {t("dashboardHeader:pdfDownloadOption")}
                </button>
              </div>
            </>,
            document.body,
          )}
        </div>
      </div>

      {uploadOpen && <MgmtReportUploadModal onClose={() => setUploadOpen(false)} />}
      {syncPreview && (
        <PimsvinaSyncPreviewModal
          data={syncPreview}
          confirming={confirming}
          onConfirm={handleConfirmSync}
          onClose={() => setSyncPreview(null)}
        />
      )}
    </div>
  );
}
