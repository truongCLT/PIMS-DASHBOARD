import React, { useCallback, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { usePutProjectdetail, useGetPimsvinaSiterate, getBaseUrl, getGetCashflowMonthlyQueryKey } from "@workspace/api-client-react";
import { ProjectCommentPanel } from "./ProjectCommentPanel";
import { Upload, FileSpreadsheet, RefreshCw } from "lucide-react";
import projectPhoto from "../assets/project-photo.png";
import { ConstructionProgressTab } from "./ConstructionProgressTab";
import { SaleCostTab } from "./SaleCostTab";
import { OutsourcingTab } from "./OutsourcingTab";
import { ServiceCashflowTab } from "./ServiceCashflowTab";
import { ProjectDataEntryTab } from "./ProjectDataEntryTab";
import { OverviewTab } from "./OverviewTab";
import { ProjectSummaryTab } from "./ProjectSummaryTab";
import { ProjectReportTab } from "./ProjectReportTab";
import { useProjectDetail, getGetProjectdetailQueryKey } from "../lib/projectDetailData";
import { lastClosedYearMonth } from "../lib/monthRange";
import { downloadProjectDetailTemplate, parseProjectDetailWorkbook, ExcelParseError } from "../lib/projectDetailExcel";
import { useMonthlyFxRates } from "../lib/monthlyFxRates";
import { DisplayUnitProvider, DEFAULT_EXCHANGE_RATES, formatMoney, formatVnd, moneyUnitLabel } from "../lib/displayUnit";
import { useAdminAuth, readAdminToken } from "../lib/adminAuth";
import { useDashboardFilters } from "../lib/dashboardFilters";
import { PimsvinaSyncPreviewModal, type PimsvinaPreviewData } from "./PimsvinaSyncPreviewModal";
import { cardStyle } from "../lib/uiTokens";
import { ProjectContextBar } from "./ProjectContextBar";
import { REPORT_YEAR } from "../lib/mgmtreportData";
export { Donut, MiniBar } from "./charts";


const SIDE_TABS = ["Summary", "Report", "Overview", "Construction progress", "Sale & Cost", "Outsourcing", "Cashflow", "Data entry"];

const YEARS = Array.from({ length: 21 }, (_, i) => 2015 + i); // 2015 ~ 2035
const MONTHS = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];

const selectStyle: React.CSSProperties = {
  border: "none",
  outline: "none",
  fontSize: "12px",
  color: "#333",
  backgroundColor: "transparent",
  cursor: "pointer",
  appearance: "none" as const,
  WebkitAppearance: "none" as const,
  paddingRight: "14px",
};

export function ProjectDashboard({ projectName }: { projectName: string }) {
  const { t } = useTranslation(["projectDashboard", "common"]);
  const SIDE_TAB_LABELS: Record<string, string> = {
    Summary: t("common:overview"),
    Report: t("projectDashboard:report"),
    Overview: "개요(2)",
    "Construction progress": t("common:process"),
    "Sale & Cost": t("projectDashboard:saleCost"),
    Outsourcing: t("common:outsourcing"),
    Cashflow: t("projectDashboard:cashflow"),
    "Data entry": t("projectDashboard:dataEntry"),
  };
  const { fxRates } = useDashboardFilters();
  const [currency, setCurrency] = useState("USD");
  const [unitOn, setUnitOn] = useState(true);
  const [activeTab, setActiveTab] = useState("Summary");
  const { isAdmin } = useAdminAuth();
  const [syncing, setSyncing] = useState(false);
  const [syncPreview, setSyncPreview] = useState<PimsvinaPreviewData | null>(null);
  const [confirming, setConfirming] = useState(false);
  const now = new Date();
  // 기본 기간: 올해 1월 ~ 마감월(M월은 M+2월 13일부터 마감 — lastClosedYearMonth). 예전엔 "직전월"이라
  // 마감 전인 달(예: 10/1 기준 9월)까지 실적처럼 보였다(요청: 최신은 8월, 10/13 이후 9월).
  const closedYm = lastClosedYearMonth();
  const [fromYear, setFromYear] = useState(now.getFullYear());
  const [fromMonth, setFromMonth] = useState("01");
  const [toYear, setToYear] = useState(closedYm.year);
  const [toMonth, setToMonth] = useState(String(closedYm.month).padStart(2, "0"));
  const [reportMonth, setReportMonth] = useState<number | null>(null);
  const handleReportMonthChange = (month: number | null) => {
    setReportMonth(month);
  };
  const handleResolvedReportMonthChange = useCallback((month: number | null) => {
    if (month != null) {
      setToYear(REPORT_YEAR);
      setToMonth(String(month).padStart(2, "0"));
    }
  }, []);
  // Outsourcing 탭 자체의 기준월 선택 — Report 탭과 같은 reportMonth를 공유해서 Report 탭으로
  // 돌아가도 방금 고른 달이 유지되게 하고, toYear/toMonth도 즉시 갱신한다(Report 탭은 Outsourcing
  // 탭이 떠 있는 동안 마운트되지 않아 그쪽 useEffect가 대신 갱신해 주지 않으므로 직접 반영 필요).
  const handleOutsourcingMonthChange = useCallback((month: number) => {
    setReportMonth(month);
    setToYear(REPORT_YEAR);
    setToMonth(String(month).padStart(2, "0"));
  }, []);
  const periodMonths = Math.min(
    24,
    Math.max(1, (toYear - fromYear) * 12 + (Number(toMonth) - Number(fromMonth)) + 1),
  );

  const { detail } = useProjectDetail(projectName);
  const siteCode = detail?.overview?.siteCode ?? null;
  const siteRateQuery = useGetPimsvinaSiterate(
    { siteCode: siteCode ?? "" },
    { query: { enabled: !!siteCode, staleTime: 5 * 60_000 } },
  );
  // 현장 계약 환율(dashboard_common_siterate_1q.jsp)이 없으면(예: 계약 환율이 등록되지 않은 현장)
  // DEFAULT_EXCHANGE_RATES 같은 하드코딩된 값 대신, 이미 조회해 둔 당월 공식 환율(fxRates,
  // dashboard_common_exchangerate_1q.jsp 기반)로 대체한다 — 둘 다 실제 PIMSVINA 환율이며, 이렇게 하면
  // 계약 환율이 없는 현장도 Construction과 동일하게 USD/KRW 환산이 표시된다.
  const siteRates = useMemo(() => {
    const vndPerUsd = siteRateQuery.data?.rateUsd;
    if (!vndPerUsd) return fxRates;
    const vndPerKrw = siteRateQuery.data?.rateKrw;
    return {
      USD: 1,
      VND: vndPerUsd,
      // 계약환율 KRW가 비어있거나 0인 현장(PIMSVINA 공사개요 > 계약사항 "계약환율 KRW 0.00000")은 하드코딩
      // 1350 대신 대시보드 "FX Rate Settings"의 KRW 환율(fxRates.KRW)로 환산한다.
      KRW: vndPerKrw ? vndPerUsd / vndPerKrw : (fxRates.KRW || DEFAULT_EXCHANGE_RATES.KRW),
    };
  }, [siteRateQuery.data, fxRates]);
  // 계약환율이 0 또는 미등록인 통화(예: PIMSVINA 공사개요 > 계약사항 "계약환율 KRW 0.00000")는 환산하지 않고
  // VND(원 통화)로 표시한다(요청). 해당 통화 버튼은 비활성화하고 안내 툴팁을 띄운다. 환율 조회가 끝나기
  // 전에는 선택한 통화를 그대로 둬서 화면이 깜빡이지 않게 한다.
  const rateUsd = siteRateQuery.data?.rateUsd ?? 0;
  const rateKrw = siteRateQuery.data?.rateKrw ?? 0;
  const siteRateResolved = !siteCode || siteRateQuery.isSuccess || siteRateQuery.isError;
  const isCurrencyAvailable = (c: string) =>
    c === "VND" || !siteRateResolved || (c === "USD" ? rateUsd > 0 : c === "KRW" ? (rateUsd > 0 && rateKrw > 0) || fxRates.KRW > 0 : true);
  // KRW 계약환율이 0이면(USD 계약환율 유무와 무관) VND로 막지 않고 "FX Rate Settings"의 KRW 환율(fxRates.KRW)로
  // 환산한다(요청) — siteRates.KRW도 같은 값으로 폴백한다. 버튼에는 그 사실을 툴팁으로 알린다.
  const krwUsesFxSetting = siteRateResolved && !(rateUsd > 0 && rateKrw > 0);
  const effectiveCurrency = isCurrencyAvailable(currency) ? currency : "VND";
  const queryClient = useQueryClient();
  // 탭을 누를 때마다 이 프로젝트의 상세 데이터(pd_*)와 자금수지(cf_*)를 다시 불러온다 — 캐시(staleTime 60초)
  // 때문에 다른 사용자의 저장/PIMSVINA 동기화 결과가 탭을 옮겨도 반영되지 않는다는 요청. 조회 중에도
  // 이전 값을 그대로 보여주므로 화면이 깜빡이지 않는다(데이터 입력 탭은 재조회 완료 후 폼을 채운다).
  const handleTabClick = (tab: string) => {
    setActiveTab(tab);
    void queryClient.invalidateQueries({ queryKey: getGetProjectdetailQueryKey({ projectName }) });
    void queryClient.invalidateQueries({ queryKey: getGetCashflowMonthlyQueryKey() });
  };
  const putMutation = usePutProjectdetail();
  const excelFileRef = useRef<HTMLInputElement>(null);
  const [excelMsg, setExcelMsg] = useState<string | null>(null);
  const [excelStatus, setExcelStatus] = useState<"success" | "error" | null>(null);
  const [excelBusy, setExcelBusy] = useState(false);
  const { getRatesForMonth } = useMonthlyFxRates();
  const monthlyVndRate = (year: number, month: number) => getRatesForMonth(year, month)?.VND ?? null;

  const handleTemplateDownload = async () => {
    if (!detail || excelBusy) return;
    setExcelBusy(true);
    setExcelMsg(null);
    setExcelStatus(null);
    try {
      await downloadProjectDetailTemplate(projectName, detail, fxRates.VND, "시공", monthlyVndRate);
    } catch (err) {
      console.error("Excel template download failed", err);
      setExcelMsg(t("projectDashboard:templateDownloadFailed"));
      setExcelStatus("error");
    } finally {
      setExcelBusy(false);
    }
  };

  const handleExcelUpload = async (file: File) => {
    if (!detail || excelBusy) return;
    setExcelBusy(true);
    setExcelMsg(null);
    setExcelStatus(null);
    try {
      const parsed = await parseProjectDetailWorkbook(file, detail, fxRates.VND, monthlyVndRate);
      if (!window.confirm(t("projectDashboard:confirmReplaceData"))) {
        setExcelBusy(false);
        return;
      }
      await putMutation.mutateAsync({ data: { ...parsed, projectName } });
      queryClient.invalidateQueries({ queryKey: getGetProjectdetailQueryKey({ projectName }) });
      setExcelMsg(t("projectDashboard:uploadCompleted"));
      setExcelStatus("success");
    } catch (err) {
      console.error("Excel upload failed", err);
      if (err instanceof ExcelParseError) { setExcelMsg(err.message); setExcelStatus("error"); }
      else {
        const serverMsg =
          typeof err === "object" && err != null && "data" in err
            ? (err as { data?: { error?: string } | null }).data?.error
            : undefined;
        setExcelMsg(serverMsg || t("projectDashboard:uploadFailedCheckFormat"));
        setExcelStatus("error");
      }
    } finally {
      setExcelBusy(false);
      if (excelFileRef.current) excelFileRef.current.value = "";
    }
  };

  const ov = detail?.overview ?? { contractAmount: null, startDate: null, endDate: null, client: null, scale: null };
  const fmtDate = (d: string | null) => (d ? `'${d.slice(2, 4)}.${d.slice(5, 7)}.${d.slice(8, 10)}` : "-");
  const periodLabel =
    ov.startDate && ov.endDate
      ? (() => {
          const s = new Date(ov.startDate);
          const e = new Date(ov.endDate);
          const mo = Math.max(0, Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24 * 30.44)));
          return `${fmtDate(ov.startDate)}~${fmtDate(ov.endDate)}\u00A0\u00A0(${t("projectDashboard:monthsSuffix", { count: mo })})`;
        })()
      : "-";

  return (
    <DisplayUnitProvider currency={effectiveCurrency} unitOn={unitOn} rates={siteRates}>
    <div style={{ flex: 1, overflowY: "auto", backgroundColor: "#eef2f7" }}>
      {/* Filter row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "18px",
          flexWrap: "wrap",
          backgroundColor: "#fff",
          borderBottom: "1px solid #e2e9f3",
          padding: "8px 20px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "12px", color: "#333", fontWeight: 600 }}>{t("common:exchangeRate")} :</span>
          <div style={{ display: "flex", border: "1px solid #e2e9f3", borderRadius: "6px", overflow: "hidden" }}>
            {["USD", "KRW", "VND"].map((c) => (
              <button
                key={c}
                onClick={() => { if (isCurrencyAvailable(c)) setCurrency(c); }}
                disabled={!isCurrencyAvailable(c)}
                title={!isCurrencyAvailable(c) ? t("projectDashboard:siteRateUnavailable") : c === "KRW" && krwUsesFxSetting ? t("projectDashboard:siteRateKrwFallback") : undefined}
                style={{
                  padding: "5px 12px",
                  fontSize: "12px",
                  fontWeight: 600,
                  border: "none",
                  cursor: isCurrencyAvailable(c) ? "pointer" : "not-allowed",
                  backgroundColor: effectiveCurrency === c ? "#fff" : "#f2f5f9",
                  color: effectiveCurrency === c ? "#2f7cf6" : "#666",
                  opacity: isCurrencyAvailable(c) ? 1 : 0.45,
                  borderRight: c !== "VND" ? "1px solid #e2e9f3" : "none",
                }}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "12px", color: "#333", fontWeight: 600 }}>{t("common:unit")} :</span>
          <div
            onClick={() => {
              const sy = window.scrollY;
              setUnitOn((v) => !v);
              requestAnimationFrame(() => window.scrollTo({ top: sy, behavior: "instant" as ScrollBehavior }));
            }}
            style={{
              width: "36px",
              height: "20px",
              backgroundColor: unitOn ? "#2f7cf6" : "#b0b8c4",
              borderRadius: "10px",
              position: "relative",
              cursor: "pointer",
            }}
          >
            <div
              style={{
                position: "absolute",
                left: unitOn ? "18px" : "2px",
                top: "2px",
                width: "16px",
                height: "16px",
                backgroundColor: "#fff",
                borderRadius: "50%",
                boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
                transition: "left 0.15s ease",
              }}
            />
          </div>
          <span style={{ fontSize: "12px", color: "#333", fontWeight: 600, display: "inline-block", minWidth: "64px" }}>{moneyUnitLabel(effectiveCurrency, unitOn)}</span>
        </div>

        {/* Sync PIMSVINA Button for Project View */}
        {isAdmin && (
          <button
            onClick={async () => {
              if (syncing) return;
              setSyncing(true);
              try {
                const token = readAdminToken();
                const baseUrl = getBaseUrl() || "";
                const res = await fetch(baseUrl + "/api/sync-pimsvina/preview", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                  },
                });
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
            }}
            disabled={syncing}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              backgroundColor: syncing ? "#64748b" : "#2563eb",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              padding: "5px 12px",
              fontSize: "12px",
              cursor: syncing ? "wait" : "pointer",
              fontWeight: "600",
              boxShadow: "0 1px 3px rgba(0,0,0,0.12)",
              marginLeft: "12px",
            }}
          >
            <RefreshCw size={13} style={{ animation: syncing ? "spin 1s linear infinite" : "none" }} />
            {syncing ? t("dashboardHeader:syncing") : t("dashboardHeader:syncButtonLabel")}
          </button>
        )}
      </div>

      {syncPreview && (
        <PimsvinaSyncPreviewModal
          data={syncPreview}
          confirming={confirming}
          onConfirm={async () => {
            if (confirming || !syncPreview) return;
            setConfirming(true);
            try {
              const token = readAdminToken();
              const baseUrl = getBaseUrl() || "";
              // Server tự truy vấn lại PIMSVINA khi confirm — không gửi lại toàn bộ dữ liệu preview
              // (có thể tới hàng nghìn dòng, từng vượt giới hạn kích thước request body khi deploy).
              const res = await fetch(baseUrl + "/api/sync-pimsvina/confirm", {
                method: "POST",
                headers: {
                  ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
              });
              const data = await res.json();
              if (data.success) {
                setSyncPreview(null);
                await queryClient.invalidateQueries({ queryKey: getGetProjectdetailQueryKey({ projectName }) });
                await queryClient.refetchQueries({ queryKey: getGetProjectdetailQueryKey({ projectName }) });
              } else {
                alert(t("dashboardHeader:syncFailed", { error: data.error || t("dashboardHeader:syncFailedDefaultError") }));
              }
            } catch (err: any) {
              console.error("Sync confirm error:", err);
              alert(t("dashboardHeader:connectionErrorMessage", { message: err.message }));
            } finally {
              setConfirming(false);
            }
          }}
          onClose={() => setSyncPreview(null)}
        />
      )}

      <ProjectContextBar projectName={siteCode ? `${projectName} [${siteCode}]` : projectName} businessType="시공" client={ov.client} period={periodLabel} primaryValue={ov.scale} contractValue={`${formatVnd(ov.contractAmount, effectiveCurrency, siteRates)} ${effectiveCurrency}`} referenceMonth={ov.asOfMonth} isClosed={ov.isClosed} labels={{ client: t("projectDashboard:client"), period: t("projectDashboard:constructionPeriod"), primary: t("projectDashboard:constructionScale"), contract: t("common:contractAmount"), referenceMonth: t("common:baseMonth"), closed: t("common:closed"), ongoing: t("common:inProgress") }} />

      {/* Horizontal tab bar */}
      <div
        style={{
          display: "flex",
          gap: "4px",
          padding: "8px 10px 0",
          backgroundColor: "#eef2f7",
          borderBottom: "2px solid #e2e9f3",
          marginTop: "8px",
        }}
      >
        {SIDE_TABS.filter((tab) => tab !== "Overview" && (tab !== "Data entry" || isAdmin)).map((tab) => {
          const active = tab === activeTab;
          return (
            <button
              key={tab}
              onClick={() => handleTabClick(tab)}
              style={{
                padding: "7px 20px",
                fontSize: "12px",
                fontWeight: active ? 700 : 500,
                color: active ? "#16294a" : "#7c8ba3",
                backgroundColor: active ? "#fff" : "transparent",
                border: "1px solid",
                borderColor: active ? "#e2e9f3" : "transparent",
                borderBottom: active ? "2px solid #2f7cf6" : "none",
                borderRadius: "4px 4px 0 0",
                cursor: "pointer",
                marginBottom: active ? "-2px" : "0",
                whiteSpace: "nowrap",
              }}
            >
              {SIDE_TAB_LABELS[tab] ?? tab}
            </button>
          );
        })}
        {isAdmin && (
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "6px", paddingBottom: "6px" }}>
            {excelMsg && (
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  color: excelStatus === "success" ? "#1c7a5a" : "#e0655c",
                  maxWidth: "360px",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
                title={excelMsg}
              >
                {excelMsg}
              </span>
            )}
            <button
              onClick={handleTemplateDownload}
              disabled={!detail || excelBusy}
              title={t("projectDashboard:downloadTemplateTooltip")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "5px",
                padding: "5px 12px",
                fontSize: "11px",
                fontWeight: 600,
                color: "#16294a",
                backgroundColor: "#fff",
                border: "1px solid #e2e9f3",
                borderRadius: "4px",
                cursor: excelBusy ? "wait" : "pointer",
                opacity: !detail || excelBusy ? 0.6 : 1,
              }}
            >
              <FileSpreadsheet size={13} /> Excel {t("common:download")}
            </button>
            <button
              onClick={() => excelFileRef.current?.click()}
              disabled={!detail || excelBusy}
              title={t("projectDashboard:uploadTemplateTooltip")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "5px",
                padding: "5px 12px",
                fontSize: "11px",
                fontWeight: 600,
                color: "#fff",
                backgroundColor: "#2f7cf6",
                border: "none",
                borderRadius: "4px",
                cursor: excelBusy ? "wait" : "pointer",
                opacity: !detail || excelBusy ? 0.6 : 1,
              }}
            >
              <Upload size={13} /> Excel {t("common:upload")}
            </button>
            <input
              ref={excelFileRef}
              type="file"
              accept=".xlsx"
              style={{ display: "none" }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleExcelUpload(f);
              }}
            />
          </div>
        )}
      </div>

      {/* Body: content */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px", padding: "10px" }}>
        {activeTab === "Summary" ? (
          <div style={{ flex: 1, minWidth: 0, minHeight: "620px" }}>
            <ProjectSummaryTab projectName={projectName} />
          </div>
        ) : activeTab === "Report" ? (
          <div style={{ flex: 1, minWidth: 0, minHeight: "620px" }}>
            <ProjectReportTab
              projectName={projectName}
              selectedMonth={reportMonth}
              onSelectedMonthChange={handleReportMonthChange}
              onResolvedMonthChange={handleResolvedReportMonthChange}
            />
          </div>
        ) : activeTab === "Construction progress" ? (
          <div style={{ flex: 1, minWidth: 0 }}>
            <ConstructionProgressTab
              projectName={projectName}
              referenceYear={toYear}
              referenceMonth={Number(toMonth)}
            />
          </div>
        ) : activeTab === "Outsourcing" ? (
          <div style={{ flex: 1, minWidth: 0 }}>
            <OutsourcingTab
              projectName={projectName}
              referenceYear={toYear}
              referenceMonth={Number(toMonth)}
              onReferenceMonthChange={handleOutsourcingMonthChange}
            />
          </div>
        ) : activeTab === "Data entry" ? (
          <div style={{ flex: 1, minWidth: 0 }}>
            <ProjectDataEntryTab projectName={projectName} />
          </div>
        ) : activeTab === "Cashflow" ? (
          <div style={{ flex: 1, minWidth: 0 }}>
            <ServiceCashflowTab
              projectName={projectName}
              fromYear={fromYear}
              fromMonth={Number(fromMonth)}
              months={periodMonths}
              toYear={toYear}
              toMonth={Number(toMonth)}
            />
          </div>
        ) : activeTab === "Sale & Cost" ? (
          <div style={{ flex: 1, minWidth: 0 }}>
            <SaleCostTab
              projectName={projectName}
              fromYear={fromYear}
              fromMonth={Number(fromMonth)}
              months={periodMonths}
              toYear={toYear}
              toMonth={Number(toMonth)}
              // 기준월(마감월) 이후 달 매출은 실적이 아니라 전망(경영보고 Forecast)이므로 점선 막대로 구분한다.
              splitRevenueForecast
            />
          </div>
        ) : (
        /* Overview (개요(2)) — original OverviewTab + comment panel */
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "8px" }}>
          <OverviewTab projectName={projectName} />

          {/* Comment */}
          <div style={cardStyle}>
            <ProjectCommentPanel projectName={projectName} tab="overview" />
          </div>
        </div>
        )}

      </div>
    </div>
    </DisplayUnitProvider>
  );
}
