import React, { useCallback, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { usePutProjectdetail, useGetPimsvinaSiterate, getBaseUrl, getGetCashflowMonthlyQueryKey } from "@workspace/api-client-react";
import { Download, FileSpreadsheet, Upload, RefreshCw } from "lucide-react";
import { downloadProjectDetailTemplate, parseProjectDetailWorkbook, ExcelParseError } from "../lib/projectDetailExcel";
import { useMonthlyFxRates } from "../lib/monthlyFxRates";
import { SaleCostTab } from "./SaleCostTab";
import { OutsourcingTab } from "./OutsourcingTab";
import { ServiceCashflowTab } from "./ServiceCashflowTab";
import { ServiceReportTab } from "./ServiceReportTab";
import { ProjectDataEntryTab } from "./ProjectDataEntryTab";
import { PimsvinaSyncPreviewModal, type PimsvinaPreviewData } from "./PimsvinaSyncPreviewModal";
import { useProjectDetail, getGetProjectdetailQueryKey } from "../lib/projectDetailData";
import { useAdminAuth, readAdminToken } from "../lib/adminAuth";
import { DisplayUnitProvider, DEFAULT_EXCHANGE_RATES, formatMoney, formatVnd, moneyUnitLabel } from "../lib/displayUnit";
import { useDashboardFilters } from "../lib/dashboardFilters";
import { lastClosedYearMonth } from "../lib/monthRange";
import { REPORT_YEAR } from "../lib/mgmtreportData";
import { chartTheme } from "../lib/chartTheme";
import { cardStyle, sectionTitle, emptyNote, INK_NAVY, INK_BODY, INK_MUTED, CARD_BORDER, POINT_BLUE, TABLE_HEADER_BG, MUTED_HINT, SUCCESS_GREEN, DISABLED_GRAY } from "../lib/uiTokens";
import { ProjectContextBar } from "./ProjectContextBar";

const TABS = ["Report", "Sale & Cost", "Outsourcing", "Cashflow", "Data entry"];

/** tab id → fully-qualified i18next key (may reference the shared "common" namespace) */
const TAB_LABEL_KEYS: Record<string, string> = {
  Report: "serviceProjectDashboard:reportTab",
  "Sale & Cost": "serviceProjectDashboard:saleCostTab",
  Outsourcing: "common:outsourcing",
  Cashflow: "serviceProjectDashboard:cashLabel",
  "Data entry": "serviceProjectDashboard:dataEntryTab",
};

const YEARS = Array.from({ length: 21 }, (_, i) => 2015 + i); // 2015 ~ 2035
const MONTHS = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];

const selectStyle: React.CSSProperties = {
  border: "none",
  outline: "none",
  fontSize: "12px",
  color: INK_BODY,
  backgroundColor: "transparent",
  cursor: "pointer",
  appearance: "none" as const,
  WebkitAppearance: "none" as const,
  paddingRight: "14px",
};

function YearMonthSelect({
  year,
  month,
  onYear,
  onMonth,
}: {
  year: number;
  month: string;
  onYear: (y: number) => void;
  onMonth: (m: string) => void;
}) {
  const { t } = useTranslation(["serviceProjectDashboard", "common"]);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "2px",
        border: `1px solid ${CARD_BORDER}`,
        borderRadius: "6px",
        padding: "4px 8px",
        backgroundColor: "#fff",
      }}
    >
      <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
        <select value={year} onChange={(e) => onYear(Number(e.target.value))} style={selectStyle}>
          {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <span style={{ position: "absolute", right: 0, fontSize: "11px", color: MUTED_HINT, pointerEvents: "none" }}>▼</span>
      </div>
      <span style={{ fontSize: "12px", color: MUTED_HINT, margin: "0 1px" }}>{t("serviceProjectDashboard:yearSuffix")}</span>
      <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
        <select value={month} onChange={(e) => onMonth(e.target.value)} style={selectStyle}>
          {MONTHS.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <span style={{ position: "absolute", right: 0, fontSize: "11px", color: MUTED_HINT, pointerEvents: "none" }}>▼</span>
      </div>
      <span style={{ fontSize: "12px", color: MUTED_HINT, margin: "0 1px" }}>{t("serviceProjectDashboard:monthSuffix")}</span>
    </div>
  );
}

function EmptyHint({ label }: { label: string }) {
  const { t } = useTranslation(["serviceProjectDashboard", "common"]);
  return (
    <div style={emptyNote}>
      {t("serviceProjectDashboard:emptyDataHint", { label })}
    </div>
  );
}

export function ServiceProjectDashboard({ projectName }: { projectName: string }) {
  const { t, i18n } = useTranslation(["serviceProjectDashboard", "overviewTab", "common", "projectDataEntryTab"]);
  const excelLang = (i18n.language?.slice(0, 2) === "en" || i18n.language?.slice(0, 2) === "vi" ? i18n.language.slice(0, 2) : "ko") as "ko" | "en" | "vi";
  const { fxRates } = useDashboardFilters();
  const [currency, setCurrency] = useState("USD");
  const [unitOn, setUnitOn] = useState(true);
  const [activeTab, setActiveTab] = useState("Report");
  const { isAdmin } = useAdminAuth();
  const [syncing, setSyncing] = useState(false);
  const [syncPreview, setSyncPreview] = useState<PimsvinaPreviewData | null>(null);
  const [confirming, setConfirming] = useState(false);
  // 기본 기간: 올해 1월 ~ 마감된 최근월(lastClosedYearMonth — 원가 정산 마감 규칙 반영)
  const now = new Date();
  const closedRef = lastClosedYearMonth();
  const [fromYear, setFromYear] = useState(now.getFullYear());
  const [fromMonth, setFromMonth] = useState("01");
  const [toYear, setToYear] = useState(closedRef.year);
  const [toMonth, setToMonth] = useState(String(closedRef.month).padStart(2, "0"));
  // Report tab의 "기준월" — 시공 ProjectDashboard와 동일한 패턴: null이면 "최신월"(실적 있는
  // 가장 최근 달)을 자동으로 쓰고, ServiceReportTab이 실제로 정한 달(resolved)을 공유 기간
  // 필터(toYear/toMonth)에도 반영해 다른 탭(Sale & Cost, Outsourcing, Cashflow)과 맞춘다.
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
  // Outsourcing 탭 자체의 기준월 선택 — 시공 ProjectDashboard와 동일한 패턴: Report 탭과 같은
  // reportMonth를 공유해서 Report 탭으로 돌아가도 방금 고른 달이 유지되게 하고, toYear/toMonth도
  // 즉시 갱신한다(Report 탭은 Outsourcing 탭이 떠 있는 동안 마운트되지 않아 그쪽 useEffect가 대신
  // 갱신해 주지 않으므로 직접 반영 필요).
  const handleOutsourcingMonthChange = useCallback((month: number) => {
    setReportMonth(month);
    setToYear(REPORT_YEAR);
    setToMonth(String(month).padStart(2, "0"));
  }, []);

  const { detail, isLoading } = useProjectDetail(projectName);
  const siteCode = detail?.overview?.siteCode ?? null;
  const siteRateQuery = useGetPimsvinaSiterate(
    { siteCode: siteCode ?? "" },
    { query: { enabled: !!siteCode, staleTime: 5 * 60_000 } },
  );
  // 현장 계약 환율(dashboard_common_siterate_1q.jsp)이 없으면(CBTB_CTRTSUMM은 시공 계약에만 등록되므로
  // 용역 현장은 대부분 이 값이 없다) DEFAULT_EXCHANGE_RATES 같은 하드코딩된 값 대신, 이미 조회해 둔
  // 당월 공식 환율(fxRates, dashboard_common_exchangerate_1q.jsp 기반)로 대체한다 — 둘 다 실제
  // PIMSVINA 환율이며, 이렇게 하면 계약 환율이 없는 용역 현장도 시공(Construction)과 동일하게
  // USD/KRW 환산이 표시된다.
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

  // Excel 양식 다운로드/업로드 (데이터 입력 탭)
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
  const [excelMsgIsSuccess, setExcelMsgIsSuccess] = useState(false);
  const [excelBusy, setExcelBusy] = useState(false);

  const { getRatesForMonth } = useMonthlyFxRates();
  const monthlyVndRate = (year: number, month: number) => getRatesForMonth(year, month, "actual_forecast")?.VND ?? null;
  const monthlyVndRatePlan = (year: number, month: number) => getRatesForMonth(year, month, "plan")?.VND ?? null;

  const handleTemplateDownload = async () => {
    if (!detail || excelBusy) return;
    setExcelBusy(true);
    setExcelMsg(null);
    setExcelMsgIsSuccess(false);
    try {
      const sectionTitles = {
        overview: t("projectDataEntryTab:overviewTitle"),
        costEstimation: t("projectDataEntryTab:costEstimationTitleService"),
        costBudget: t("projectDataEntryTab:costBudgetTitleService"),
        outsourcing: t("projectDataEntryTab:outsourcingTitleService"),
        cashflow: t("projectDataEntryTab:cashflowTitleService"),
        cogsMonthly: t("projectDataEntryTab:cogsMonthlyTitle"),
        salesMonthly: t("projectDataEntryTab:salesMonthlyTitleService"),
      };
      await downloadProjectDetailTemplate(projectName, detail, fxRates.VND, "용역", monthlyVndRate, excelLang, sectionTitles, monthlyVndRatePlan);
    } catch (err) {
      console.error("Excel template download failed", err);
      setExcelMsg(t("serviceProjectDashboard:templateDownloadFailed"));
      setExcelMsgIsSuccess(false);
    } finally {
      setExcelBusy(false);
    }
  };

  const handleExcelUpload = async (file: File) => {
    if (!detail || excelBusy) return;
    setExcelBusy(true);
    setExcelMsg(null);
    setExcelMsgIsSuccess(false);
    try {
      const parsed = await parseProjectDetailWorkbook(file, detail, fxRates.VND, monthlyVndRate, "용역", monthlyVndRatePlan);
      if (!window.confirm(t("serviceProjectDashboard:uploadConfirm"))) {
        setExcelBusy(false);
        return;
      }
      await putMutation.mutateAsync({ data: { ...parsed, projectName } });
      queryClient.invalidateQueries({ queryKey: getGetProjectdetailQueryKey({ projectName }) });
      setExcelMsg(t("serviceProjectDashboard:uploadCompleted"));
      setExcelMsgIsSuccess(true);
    } catch (err) {
      console.error("Excel upload failed", err);
      if (err instanceof ExcelParseError) setExcelMsg(err.message);
      else {
        const serverMsg =
          typeof err === "object" && err != null && "data" in err
            ? (err as { data?: { error?: string } | null }).data?.error
            : undefined;
        setExcelMsg(serverMsg || t("serviceProjectDashboard:uploadFailed"));
      }
      setExcelMsgIsSuccess(false);
    } finally {
      setExcelBusy(false);
      if (excelFileRef.current) excelFileRef.current.value = "";
    }
  };

  // 도급액 — Overview 입력값만 사용한다(요청: execution/bidding으로 fallback하지 않고 정확한 값만 표시).
  // overview는 VND 원본 그대로 저장된다. VND 원본 값은 formatVnd()로 한 번만 변환하는
  // ProjectDashboard(시공)와 동일한 방식을 써서 원본 그대로 정확히 표시한다.
  const ov = detail?.overview;
  const contractAmountVnd = ov?.contractAmount ?? null;

  // 수행기간 표시 (YY.MM.DD ~ YY.MM.DD (n개월))
  const periodLabel = (() => {
    if (!ov?.startDate && !ov?.endDate) return null;
    const fmt = (d: string | null | undefined) =>
      d ? `'${d.slice(2, 4)}.${d.slice(5, 7)}.${d.slice(8, 10)}` : "-";
    let months: number | null = null;
    if (ov?.startDate && ov?.endDate) {
      const s = new Date(ov.startDate);
      const e = new Date(ov.endDate);
      months = Math.max(1, Math.round((e.getTime() - s.getTime()) / (30.44 * 24 * 3600 * 1000)));
    }
    return `${fmt(ov?.startDate)} ~ ${fmt(ov?.endDate)}${months != null ? ` (${t("serviceProjectDashboard:monthsSuffix", { months })})` : ""}`;
  })();

  return (
    <DisplayUnitProvider currency={effectiveCurrency} unitOn={unitOn} rates={siteRates} lang={excelLang}>
    <div style={{ flex: 1, overflowY: "auto", backgroundColor: TABLE_HEADER_BG }}>
      {/* Filter row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "18px",
          flexWrap: "wrap",
          backgroundColor: "#fff",
          borderBottom: `1px solid ${CARD_BORDER}`,
          padding: "8px 20px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "12px", color: INK_BODY, fontWeight: 600 }}>{t("common:exchangeRate")} :</span>
          <div style={{ display: "flex", border: `1px solid ${CARD_BORDER}`, borderRadius: "6px", overflow: "hidden" }}>
            {["USD", "KRW", "VND"].map((c) => {
              return (
                <button
                  key={c}
                  onClick={() => { if (isCurrencyAvailable(c)) setCurrency(c); }}
                  disabled={!isCurrencyAvailable(c)}
                  title={!isCurrencyAvailable(c) ? t("serviceProjectDashboard:siteRateUnavailable") : c === "KRW" && krwUsesFxSetting ? t("serviceProjectDashboard:siteRateKrwFallback") : undefined}
                  style={{
                    padding: "5px 12px",
                    fontSize: "12px",
                    fontWeight: 600,
                    border: "none",
                    cursor: isCurrencyAvailable(c) ? "pointer" : "not-allowed",
                    backgroundColor: effectiveCurrency === c ? "#fff" : "#f2f5f9",
                    color: effectiveCurrency === c ? POINT_BLUE : INK_MUTED,
                    opacity: isCurrencyAvailable(c) ? 1 : 0.45,
                    borderRight: c !== "VND" ? `1px solid ${CARD_BORDER}` : "none",
                  }}
                >
                  {c}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "12px", color: INK_BODY, fontWeight: 600 }}>{t("common:unit")} :</span>
          <div
            onClick={() => {
              const sy = window.scrollY;
              setUnitOn((v) => !v);
              requestAnimationFrame(() => window.scrollTo({ top: sy, behavior: "instant" as ScrollBehavior }));
            }}
            style={{
              width: "36px",
              height: "20px",
              backgroundColor: unitOn ? POINT_BLUE : DISABLED_GRAY,
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
          <span style={{ fontSize: "12px", color: INK_BODY, fontWeight: 600 }}>{moneyUnitLabel(effectiveCurrency, unitOn, excelLang)}</span>
        </div>

        {/* Sync PIMSVINA Button for Service Project View */}
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

        <button
          style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            backgroundColor: POINT_BLUE,
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            padding: "7px 14px",
            fontSize: "12px",
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          <Download size={13} />
          Export Excel
        </button>
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

      <ProjectContextBar projectName={siteCode ? `${projectName} [${siteCode}]` : projectName} businessType="용역" client={ov?.client} period={periodLabel} primaryValue={ov?.scope} contractValue={contractAmountVnd != null ? `${formatVnd(contractAmountVnd, effectiveCurrency, siteRates)} ${effectiveCurrency}` : "-"} referenceMonth={ov?.asOfMonth} isClosed={ov?.isClosed} labels={{ client: t("serviceProjectDashboard:clientLabel"), period: t("serviceProjectDashboard:periodLabel"), primary: t("serviceProjectDashboard:scopeLabel"), contract: t("common:contractAmount"), referenceMonth: t("common:baseMonth"), closed: t("common:closed"), ongoing: t("common:inProgress") }} />

      {/* Horizontal tab bar */}
      <div
        style={{
          display: "flex",
          gap: "4px",
          padding: "8px 10px 0",
          backgroundColor: TABLE_HEADER_BG,
          borderBottom: `2px solid ${CARD_BORDER}`,
          marginTop: "8px",
        }}
      >
        {TABS.filter((tab) => tab !== "Data entry" || isAdmin).map((tab) => {
          const active = tab === activeTab;
          return (
            <button
              key={tab}
              onClick={() => handleTabClick(tab)}
              style={{
                padding: "7px 20px",
                fontSize: "12px",
                fontWeight: active ? 700 : 500,
                color: active ? INK_NAVY : INK_MUTED,
                backgroundColor: active ? "#fff" : "transparent",
                border: "1px solid",
                borderColor: active ? CARD_BORDER : "transparent",
                borderBottom: active ? `2px solid ${POINT_BLUE}` : "none",
                borderRadius: "4px 4px 0 0",
                cursor: "pointer",
                marginBottom: active ? "-2px" : "0",
                whiteSpace: "nowrap",
              }}
            >
              {t(TAB_LABEL_KEYS[tab] ?? tab)}
            </button>
          );
        })}
      </div>

      {/* Body */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px", padding: "10px" }}>
        {activeTab === "Report" ? (
          <ServiceReportTab
            projectName={projectName}
            selectedMonth={reportMonth}
            onSelectedMonthChange={handleReportMonthChange}
            onResolvedMonthChange={handleResolvedReportMonthChange}
          />
        ) : activeTab === "Sale & Cost" ? (
          <SaleCostTab
            projectName={projectName}
            fromYear={fromYear}
            fromMonth={Number(fromMonth)}
            months={Math.min(
              24,
              Math.max(1, (toYear - fromYear) * 12 + (Number(toMonth) - Number(fromMonth)) + 1),
            )}
            toYear={toYear}
            toMonth={Number(toMonth)}
            showCostRatioLine={false}
            showBudgetExecution={false}
            splitRevenueForecast
          />
        ) : activeTab === "Outsourcing" ? (
          <OutsourcingTab
            projectName={projectName}
            referenceYear={toYear}
            referenceMonth={Number(toMonth)}
            onReferenceMonthChange={handleOutsourcingMonthChange}
          />
        ) : activeTab === "Cashflow" ? (
          <ServiceCashflowTab
            projectName={projectName}
            fromYear={fromYear}
            fromMonth={Number(fromMonth)}
            months={Math.min(
              24,
              Math.max(1, (toYear - fromYear) * 12 + (Number(toMonth) - Number(fromMonth)) + 1),
            )}
            toYear={toYear}
            toMonth={Number(toMonth)}
          />
        ) : activeTab === "Data entry" ? (
          <>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "8px" }}>
              {excelMsg && (
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 600,
                    color: excelMsgIsSuccess ? SUCCESS_GREEN : chartTheme.outflowRed,
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
                title={t("serviceProjectDashboard:templateDownloadTitle")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                  padding: "5px 12px",
                  fontSize: "11px",
                  fontWeight: 600,
                  color: INK_NAVY,
                  backgroundColor: "#fff",
                  border: `1px solid ${CARD_BORDER}`,
                  borderRadius: "4px",
                  cursor: excelBusy ? "wait" : "pointer",
                  opacity: !detail || excelBusy ? 0.6 : 1,
                }}
              >
                <FileSpreadsheet size={13} /> {t("serviceProjectDashboard:excelDownloadButton")}
              </button>
              <button
                onClick={() => excelFileRef.current?.click()}
                disabled={!detail || excelBusy}
                title={t("serviceProjectDashboard:templateUploadTitle")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                  padding: "5px 12px",
                  fontSize: "11px",
                  fontWeight: 600,
                  color: "#fff",
                  backgroundColor: POINT_BLUE,
                  border: "none",
                  borderRadius: "4px",
                  cursor: excelBusy ? "wait" : "pointer",
                  opacity: !detail || excelBusy ? 0.6 : 1,
                }}
              >
                <Upload size={13} /> {t("serviceProjectDashboard:excelUploadButton")}
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
            <ProjectDataEntryTab projectName={projectName} service />
          </>
        ) : (
          <div
            style={{
              ...cardStyle,
              padding: "60px 20px",
              textAlign: "center",
              fontSize: "15px",
              color: INK_MUTED,
            }}
          >
            {t("serviceProjectDashboard:comingSoon", { label: t(TAB_LABEL_KEYS[activeTab] ?? activeTab) })}
          </div>
        )}
      </div>
    </div>
    </DisplayUnitProvider>
  );
}
