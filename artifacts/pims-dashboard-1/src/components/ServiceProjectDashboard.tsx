import React, { useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { usePutProjectdetail, useGetPimsvinaSiterate, getBaseUrl } from "@workspace/api-client-react";
import { Download, FileSpreadsheet, Upload, RefreshCw } from "lucide-react";
import { downloadProjectDetailTemplate, parseProjectDetailWorkbook, ExcelParseError } from "../lib/projectDetailExcel";
import { SaleCostTab } from "./SaleCostTab";
import { OutsourcingTab } from "./OutsourcingTab";
import { ServiceCashflowTab } from "./ServiceCashflowTab";
import { ServiceReportTab } from "./ServiceReportTab";
import { ProjectDataEntryTab } from "./ProjectDataEntryTab";
import { PimsvinaSyncPreviewModal, type PimsvinaPreviewData } from "./PimsvinaSyncPreviewModal";
import { useProjectDetail, getGetProjectdetailQueryKey } from "../lib/projectDetailData";
import { useAdminAuth, readAdminToken } from "../lib/adminAuth";
import { DisplayUnitProvider, DEFAULT_EXCHANGE_RATES, formatMoney, moneyUnitLabel, convertVndToKUsdAmount } from "../lib/displayUnit";
import { useDashboardFilters } from "../lib/dashboardFilters";
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
  const { t } = useTranslation(["serviceProjectDashboard", "overviewTab", "common"]);
  const { fxRates } = useDashboardFilters();
  const [currency, setCurrency] = useState("USD");
  const [unitOn, setUnitOn] = useState(true);
  const [activeTab, setActiveTab] = useState("Report");
  const { isAdmin } = useAdminAuth();
  const [syncing, setSyncing] = useState(false);
  const [syncPreview, setSyncPreview] = useState<PimsvinaPreviewData | null>(null);
  const [confirming, setConfirming] = useState(false);
  // 기본 기간: 올해 1월 ~ 직전월
  const now = new Date();
  const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const [fromYear, setFromYear] = useState(now.getFullYear());
  const [fromMonth, setFromMonth] = useState("01");
  const [toYear, setToYear] = useState(prevMonthDate.getFullYear());
  const [toMonth, setToMonth] = useState(String(prevMonthDate.getMonth() + 1).padStart(2, "0"));

  const { detail, isLoading } = useProjectDetail(projectName);
  const siteCode = detail?.overview?.siteCode ?? null;
  const siteRateQuery = useGetPimsvinaSiterate(
    { siteCode: siteCode ?? "" },
    { query: { enabled: !!siteCode, staleTime: 5 * 60_000 } },
  );
  const siteRates = useMemo(() => {
    const vndPerUsd = siteRateQuery.data?.rateUsd;
    if (!vndPerUsd) return DEFAULT_EXCHANGE_RATES;
    const vndPerKrw = siteRateQuery.data?.rateKrw;
    return {
      USD: 1,
      VND: vndPerUsd,
      KRW: vndPerKrw ? vndPerUsd / vndPerKrw : DEFAULT_EXCHANGE_RATES.KRW,
    };
  }, [siteRateQuery.data]);

  // Excel 양식 다운로드/업로드 (데이터 입력 탭)
  const queryClient = useQueryClient();
  const putMutation = usePutProjectdetail();
  const excelFileRef = useRef<HTMLInputElement>(null);
  const [excelMsg, setExcelMsg] = useState<string | null>(null);
  const [excelMsgIsSuccess, setExcelMsgIsSuccess] = useState(false);
  const [excelBusy, setExcelBusy] = useState(false);

  const handleTemplateDownload = async () => {
    if (!detail || excelBusy) return;
    setExcelBusy(true);
    setExcelMsg(null);
    setExcelMsgIsSuccess(false);
    try {
      await downloadProjectDetailTemplate(projectName, detail, fxRates.VND, "용역");
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
      const parsed = await parseProjectDetailWorkbook(file, detail, fxRates.VND);
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

  // 도급액 — 개요 입력값 우선, 없으면 원가율 데이터(execution 우선, 없으면 bidding)의 도급액 사용.
  // overview/execution은 VND 원본 그대로 저장되고 bidding은 천 USD로 저장되어 단위가 서로 다르므로,
  // 이 화면(차트/비율 계산 등 천 USD 기준 다른 값들과 함께 쓰임) 전체에서 일관되게 쓸 수 있도록 여기서
  // 미리 천 USD 기준으로 정규화한다.
  const ov = detail?.overview;
  const executionContractAmountVnd = detail?.costEstimation.find((e) => e.kind === "execution")?.contractAmount;
  const biddingContractAmountKUsd = detail?.costEstimation.find((e) => e.kind === "bidding")?.contractAmount;
  const contractAmount =
    ov?.contractAmount != null
      ? convertVndToKUsdAmount(ov.contractAmount, siteRates)
      : executionContractAmountVnd != null
        ? convertVndToKUsdAmount(executionContractAmountVnd, siteRates)
        : (biddingContractAmountKUsd ?? null);

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
    <DisplayUnitProvider currency={currency} unitOn={unitOn} rates={siteRates}>
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
            {["USD", "KRW", "VND"].map((c) => (
              <button
                key={c}
                onClick={() => setCurrency(c)}
                style={{
                  padding: "5px 12px",
                  fontSize: "12px",
                  fontWeight: 600,
                  border: "none",
                  cursor: "pointer",
                  backgroundColor: currency === c ? "#fff" : "#f2f5f9",
                  color: currency === c ? POINT_BLUE : INK_MUTED,
                  borderRight: c !== "VND" ? `1px solid ${CARD_BORDER}` : "none",
                }}
              >
                {c}
              </button>
            ))}
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
          <span style={{ fontSize: "12px", color: INK_BODY, fontWeight: 600 }}>1K {currency}</span>
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

      <ProjectContextBar projectName={siteCode ? `${projectName} [${siteCode}]` : projectName} businessType="용역" client={ov?.client} period={periodLabel} primaryValue={ov?.scope} contractValue={contractAmount != null ? `${formatMoney(contractAmount, currency, unitOn)} ${moneyUnitLabel(currency, unitOn)}` : "-"} referenceMonth={ov?.asOfMonth} isClosed={ov?.isClosed} labels={{ client: t("serviceProjectDashboard:clientLabel"), period: t("serviceProjectDashboard:periodLabel"), primary: t("serviceProjectDashboard:scopeLabel"), contract: t("common:contractAmount"), referenceMonth: t("common:baseMonth"), closed: t("common:closed"), ongoing: t("common:inProgress") }} />

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
              onClick={() => setActiveTab(tab)}
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
            referenceYear={toYear}
            referenceMonth={Number(toMonth)}
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
            showRevenueCumulativeLine={false}
            splitRevenueForecast
          />
        ) : activeTab === "Outsourcing" ? (
          <OutsourcingTab
            projectName={projectName}
            referenceYear={toYear}
            referenceMonth={Number(toMonth)}
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
