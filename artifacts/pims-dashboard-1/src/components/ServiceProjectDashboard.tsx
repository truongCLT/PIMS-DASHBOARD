import React, { useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { usePutProjectdetail, useGetPimsvinaSiterate, getBaseUrl } from "@workspace/api-client-react";
import { ProjectCommentPanel } from "./ProjectCommentPanel";
import { Download, FileSpreadsheet, Upload, RefreshCw } from "lucide-react";
import { downloadProjectDetailTemplate, parseProjectDetailWorkbook, ExcelParseError } from "../lib/projectDetailExcel";
import { MiniBar } from "./ProjectDashboard";
import { Donut } from "./charts";
import { SaleProfitTab } from "./SaleProfitTab";
import { ServiceOutsourcingTab } from "./ServiceOutsourcingTab";
import { ServiceCashflowTab } from "./ServiceCashflowTab";
import { ServiceBudgetTab } from "./ServiceBudgetTab";
import { ProjectDataEntryTab } from "./ProjectDataEntryTab";
import { PimsvinaSyncPreviewModal, type PimsvinaPreviewData } from "./PimsvinaSyncPreviewModal";
import { useProjectDetail, getGetProjectdetailQueryKey, fmtPct, ratioPct } from "../lib/projectDetailData";
import { useAdminAuth, readAdminToken } from "../lib/adminAuth";
import { DisplayUnitProvider, DEFAULT_EXCHANGE_RATES, formatMoney, moneyUnitLabel } from "../lib/displayUnit";
import { useDashboardFilters } from "../lib/dashboardFilters";
import { CardHeader, rateColor } from "./OverviewTab";
import { chartTheme } from "../lib/chartTheme";
import { cardStyle, sectionTitle, emptyNote, INK_NAVY, INK_BODY, INK_SECONDARY, INK_MUTED, CARD_BORDER, POINT_BLUE, DIVIDER, TABLE_HEADER_BG, MUTED_HINT, SUCCESS_GREEN, DISABLED_GRAY } from "../lib/uiTokens";

const TABS = ["Overview", "Sale & Profit", "Budget Execution", "Outsourcing", "Cashflow", "Data entry"];

/** tab id → fully-qualified i18next key (may reference the shared "common" namespace) */
const TAB_LABEL_KEYS: Record<string, string> = {
  Overview: "common:overview",
  "Sale & Profit": "common:revenue",
  "Budget Execution": "serviceProjectDashboard:budgetExecutionTab",
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
  const [activeTab, setActiveTab] = useState("Overview");
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
      await downloadProjectDetailTemplate(projectName, detail, fxRates.VND);
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

  const costBudget = detail?.costBudget ?? [];
  const outsourcing = detail?.outsourcing ?? [];

  // 예산 집행 현황 — 시공(OverviewTab)과 동일한 구조
  const findCb = (name: string) =>
    costBudget.find((r) => r.item.trim().toLowerCase() === name.toLowerCase()) ?? null;
  const _common = findCb("Common");
  const _expense1 = findCb("Expense 1");
  const _expense2 = findCb("Expense 2");
  const _contingency = findCb("Contingency");
  const outRows = outsourcing;
  const outBudget = outRows.some((r) => r.budget != null)
    ? outRows.reduce((a, r) => a + (r.budget ?? 0), 0)
    : null;
  const outActual = outRows.some((r) => r.accum != null || r.resolved != null)
    ? outRows.reduce((a, r) => a + (r.accum ?? r.resolved ?? 0), 0)
    : null;
  const outPlan = outRows.some((r) => r.executedBudget != null)
    ? outRows.reduce((a, r) => a + (r.executedBudget ?? 0), 0)
    : null;
  const budgetRows = [
    { item: "외주성", budget: outBudget, plan: outPlan, actual: outActual },
    { item: "Common", budget: _common?.budget ?? null, plan: _common?.plan ?? null, actual: _common?.actual ?? null },
    { item: "Expense 1", budget: _expense1?.budget ?? null, plan: _expense1?.plan ?? null, actual: _expense1?.actual ?? null },
  ].filter((r) => r.budget != null || r.actual != null || r.plan != null);
  const extraBudgetRows = [
    { item: "Expense 2", budget: _expense2?.budget ?? null, plan: _expense2?.plan ?? null, actual: _expense2?.actual ?? null },
    { item: "Contingency", budget: _contingency?.budget ?? null, plan: _contingency?.plan ?? null, actual: _contingency?.actual ?? null },
  ].filter((r) => r.budget != null || r.actual != null || r.plan != null);
  const allBudgetRows = [...budgetRows, ...extraBudgetRows];
  const directCostPct = ratioPct(
    budgetRows.reduce((a, r) => a + (r.actual ?? 0), 0),
    budgetRows.reduce((a, r) => a + (r.budget ?? 0), 0),
  );
  const totalBudgetSum = allBudgetRows.reduce((a, r) => a + (r.budget ?? 0), 0);
  const totalActualSum = allBudgetRows.reduce((a, r) => a + (r.actual ?? 0), 0);
  const totalCostPct = ratioPct(totalActualSum, totalBudgetSum);

  // 도급액 — 개요 입력값 우선, 없으면 원가율 데이터(execution 우선, 없으면 bidding)의 도급액 사용
  const ov = detail?.overview;
  const isProjectLocked = ov?.isClosed ?? false;
  const contractAmount =
    ov?.contractAmount ??
    detail?.costEstimation.find((e) => e.kind === "execution")?.contractAmount ??
    detail?.costEstimation.find((e) => e.kind === "bidding")?.contractAmount ??
    null;

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

  // Revenue / Cash 카드 값
  const revenueTarget = ov?.revenueAnnualTarget ?? null;
  const revenueTotal = ov?.revenueTotal ?? null;
  const achievementPct = ratioPct(revenueTotal, revenueTarget);
  const cashConfirmed = ov?.cashConfirmed ?? null;
  const cashCollection = ov?.cashCollection ?? null;
  const cashOutstanding =
    cashConfirmed != null && cashCollection != null ? cashConfirmed - cashCollection : null;

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
            title={isProjectLocked ? t("projectDashboard:syncDisabledLockedTooltip") : undefined}
            onClick={async () => {
              if (syncing || isProjectLocked) return;
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
            disabled={syncing || isProjectLocked}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              backgroundColor: syncing || isProjectLocked ? "#64748b" : "#2563eb",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              padding: "5px 12px",
              fontSize: "12px",
              cursor: syncing ? "wait" : isProjectLocked ? "not-allowed" : "pointer",
              fontWeight: "600",
              boxShadow: "0 1px 3px rgba(0,0,0,0.12)",
              marginLeft: "12px",
              opacity: isProjectLocked ? 0.6 : 1,
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
              const res = await fetch(baseUrl + "/api/sync-pimsvina/confirm", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({ data: syncPreview }),
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

      {/* Project info bar — always visible */}
      <div style={{ ...cardStyle, margin: "8px 10px 0", display: "flex", gap: "10px", alignItems: "stretch" }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 0", fontSize: "12px", color: INK_NAVY }}>
            <span style={{ fontWeight: 700, paddingRight: "14px" }}>
              Project : {projectName}
              {siteCode && <span style={{ fontWeight: 400, color: INK_BODY }}> [{siteCode}]</span>}
            </span>
            {ov?.asOfMonth && (
              <span style={{ borderLeft: `1px solid ${CARD_BORDER}`, padding: "0 14px" }}>
                {t("serviceProjectDashboard:asOfMonth", { year: ov.asOfMonth.slice(0, 4), month: Number(ov.asOfMonth.slice(5, 7)) })}
              </span>
            )}
            {ov?.client && (
              <span style={{ borderLeft: `1px solid ${CARD_BORDER}`, padding: "0 14px" }}>{t("serviceProjectDashboard:clientLabel")} : {ov.client}</span>
            )}
            {periodLabel && (
              <span style={{ borderLeft: `1px solid ${CARD_BORDER}`, padding: "0 14px" }}>{t("serviceProjectDashboard:periodLabel")} : {periodLabel}</span>
            )}
            {ov?.scope && (
              <span style={{ borderLeft: `1px solid ${CARD_BORDER}`, padding: "0 14px" }}>{t("serviceProjectDashboard:scopeLabel")} : {ov.scope}</span>
            )}
            <span style={{ borderLeft: `1px solid ${CARD_BORDER}`, padding: "0 14px" }}>
              {t("common:contractAmount")} : {contractAmount != null ? `${formatMoney(contractAmount, currency, unitOn)} ${moneyUnitLabel(currency, unitOn)}` : "-"}
            </span>
          </div>
        </div>
      </div>

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
        {activeTab === "Sale & Profit" ? (
          <SaleProfitTab
            projectName={projectName}
            fromYear={fromYear}
            fromMonth={Number(fromMonth)}
            months={Math.min(
              24,
              Math.max(1, (toYear - fromYear) * 12 + (Number(toMonth) - Number(fromMonth)) + 1),
            )}
          />
        ) : activeTab === "Outsourcing" ? (
          <ServiceOutsourcingTab projectName={projectName} />
        ) : activeTab === "Cashflow" ? (
          <ServiceCashflowTab
            projectName={projectName}
            fromYear={fromYear}
            fromMonth={Number(fromMonth)}
            months={Math.min(
              24,
              Math.max(1, (toYear - fromYear) * 12 + (Number(toMonth) - Number(fromMonth)) + 1),
            )}
          />
        ) : activeTab === "Budget Execution" ? (
          <ServiceBudgetTab projectName={projectName} />
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
        ) : activeTab === "Overview" ? (
          (() => {
            const unitStr = moneyUnitLabel(currency, unitOn);
            // 매출 진도 (누계 매출 / 도급액) — 예산집행 기준선으로 사용
            const revProgress = ratioPct(revenueTotal, contractAmount);
            const totalDonutPct = ratioPct(revenueTotal, contractAmount);
            const collectionRatePct =
              cashConfirmed != null && cashConfirmed > 0 && cashCollection != null
                ? (cashCollection / cashConfirmed) * 100
                : null;
            return (
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "8px" }}>
            {/* Row: Revenue (도넛 2개) / Budget Execution Status / Cash (막대 4개) */}
            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1.2fr 1fr", gap: "8px", alignItems: "stretch" }}>
              {/* Revenue — 연간/전체 도넛 (달성 초록 · 미달 빨강) */}
              <div style={cardStyle}>
                <CardHeader
                  title={t("common:revenue")}
                  unit={unitStr}
                  badgeLabel={t("serviceProjectDashboard:annualShortLabel")}
                  badgeValue={achievementPct != null ? fmtPct(achievementPct) : undefined}
                  badgeColor={rateColor(achievementPct)}
                />
                {isLoading ? (
                  <div style={{ ...emptyNote, padding: "40px 10px" }}>{t("common:loading")}</div>
                ) : revenueTarget == null && revenueTotal == null ? (
                  <EmptyHint label={t("serviceProjectDashboard:revenueTargetActualLabel")} />
                ) : (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-evenly", padding: "26px 0 10px" }}>
                    <div style={{ textAlign: "center" }}>
                      <Donut
                        percent={achievementPct ?? 0}
                        color={rateColor(achievementPct)}
                        size={150}
                        stroke={16}
                        label={fmtPct(achievementPct)}
                        labelSize={24}
                        labelColor={rateColor(achievementPct)}
                      />
                      <div style={{ fontSize: "13px", color: INK_NAVY, fontWeight: 700, marginTop: "8px" }}>
                        {t("serviceProjectDashboard:annualTargetAchievementRate")}
                      </div>
                      <div style={{ fontSize: "12px", color: INK_SECONDARY, marginTop: "3px" }}>
                        {t("common:actual")} <b style={{ color: INK_NAVY }}>{formatMoney(revenueTotal, currency, unitOn)}</b>
                        {" / "}{t("serviceProjectDashboard:annualTargetLabel")} {formatMoney(revenueTarget, currency, unitOn)}
                      </div>
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <Donut
                        percent={totalDonutPct ?? 0}
                        color={rateColor(totalDonutPct)}
                        size={150}
                        stroke={16}
                        label={fmtPct(totalDonutPct)}
                        labelSize={24}
                        labelColor={rateColor(totalDonutPct)}
                      />
                      <div style={{ fontSize: "13px", color: INK_NAVY, fontWeight: 700, marginTop: "8px" }}>
                        {t("serviceProjectDashboard:cumulativeRevenueAchievementRate")}
                      </div>
                      <div style={{ fontSize: "12px", color: INK_SECONDARY, marginTop: "3px" }}>
                        {t("common:actual")} <b style={{ color: INK_NAVY }}>{formatMoney(revenueTotal, currency, unitOn)}</b>
                        {" / "}{t("common:contractAmount")} {formatMoney(contractAmount, currency, unitOn)}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Budget Execution Status — 시공(OverviewTab)과 동일한 3-막대 스타일 */}
              <div style={cardStyle}>
                <CardHeader
                  title={t("overviewTab:budgetExecutionStatus")}
                  unit={unitStr}
                  badgeLabel={t("overviewTab:totalCost")}
                  badgeValue={fmtPct(totalCostPct)}
                  badgeColor={chartTheme.planBlue}
                />
                {isLoading ? (
                  <div style={{ ...emptyNote, padding: "40px 10px" }}>{t("common:loading")}</div>
                ) : allBudgetRows.length === 0 ? (
                  <EmptyHint label={t("serviceProjectDashboard:budgetExecutionEmptyLabel")} />
                ) : (
                  <>
                    <div style={{ display: "flex", gap: "10px", alignItems: "stretch" }}>
                      {(() => {
                        const BAR_H = 130;
                        const LABEL_H = 18;
                        const maxVal = Math.max(
                          ...allBudgetRows.flatMap((r) => [r.budget ?? 0, r.plan ?? 0, r.actual ?? 0]),
                          1,
                        );
                        const barH = (v: number | null) =>
                          v != null && v > 0 ? Math.max((v / maxVal) * BAR_H, 8) : 0;
                        const GRAY_W = 68;
                        const renderGroup = (g: (typeof allBudgetRows)[number]) => {
                          const bud = g.budget ?? 0;
                          const pln = g.plan ?? 0;
                          const act = g.actual ?? 0;
                          const pct = bud > 0 && act > 0 ? (act / bud) * 100 : null;
                          const bh = barH(bud);
                          const ph = barH(pln);
                          const ah = barH(act);
                          const subTop = Math.max(ph, ah);
                          const itemLabel = g.item === "외주성" ? t("overviewTab:outsourcingItem") : g.item;
                          return (
                            <div key={g.item} style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", alignItems: "center" }}>
                              <div title={formatMoney(bud || null, currency, unitOn)} style={{ fontSize: "12px", fontWeight: 600, color: INK_BODY, marginBottom: "2px", whiteSpace: "nowrap", maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis" }}>
                                {formatMoney(bud || null, currency, unitOn)}
                              </div>
                              <div style={{ position: "relative", height: `${BAR_H + LABEL_H}px`, width: `${GRAY_W}px` }}>
                                <div style={{ position: "absolute", bottom: 0, left: 0, width: `${GRAY_W}px`, height: `${Math.max(bh, 2)}px`, backgroundColor: chartTheme.lightGray, borderRadius: "2px 2px 0 0" }} />
                                {g.actual != null && ah > 0 && (
                                  <div style={{ position: "absolute", bottom: 0, left: 0, width: `${GRAY_W}px`, height: `${ah}px`, backgroundColor: chartTheme.inflowBlue, borderRadius: "0 0 2px 2px" }}>
                                    <span title={formatMoney(act || null, currency, unitOn)} style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", fontSize: "10px", color: "#fff", fontWeight: 700, whiteSpace: "nowrap" }}>
                                      {formatMoney(act || null, currency, unitOn)}
                                    </span>
                                  </div>
                                )}
                                {g.plan != null && ph > 0 && (
                                  <div title={formatMoney(pln || null, currency, unitOn)} style={{ position: "absolute", bottom: `${ph}px`, left: 0, width: `${GRAY_W}px`, height: "3px", backgroundColor: chartTheme.outflowRed, borderRadius: "2px", zIndex: 2 }} />
                                )}
                                {pct != null && (
                                  <div style={{ position: "absolute", bottom: `${subTop + 4}px`, left: "50%", transform: "translateX(-50%)", fontSize: "12px", fontWeight: 700, color: chartTheme.inflowBlue, whiteSpace: "nowrap" }}>
                                    {fmtPct(pct)}
                                  </div>
                                )}
                              </div>
                              <div style={{ fontSize: "13px", color: INK_NAVY, fontWeight: 700, marginTop: "4px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%" }}>
                                {itemLabel}
                              </div>
                            </div>
                          );
                        };
                        return (
                          <>
                            {budgetRows.length > 0 && (
                              <div style={{ flex: budgetRows.length, minWidth: 0, backgroundColor: "rgba(214,226,240,0.28)", border: `1px solid ${CARD_BORDER}`, borderRadius: "8px", padding: "6px 8px 8px" }}>
                                <div style={{ textAlign: "center", fontSize: "13px", color: INK_NAVY, fontWeight: 700, marginBottom: "4px" }}>
                                  {t("overviewTab:directCost")} : {fmtPct(directCostPct)}
                                </div>
                                <div style={{ display: "flex", justifyContent: "space-around", gap: "8px", alignItems: "flex-end" }}>
                                  {budgetRows.map(renderGroup)}
                                </div>
                              </div>
                            )}
                            {extraBudgetRows.length > 0 && (
                              <div style={{ flex: extraBudgetRows.length, minWidth: 0, display: "flex", justifyContent: "space-around", gap: "8px", alignItems: "flex-end", padding: "6px 0 8px" }}>
                                {extraBudgetRows.map(renderGroup)}
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                    {/* 합계 (좌) + 범례 (우) — 같은 행 */}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginTop: "10px",
                        paddingTop: "7px",
                        borderTop: `1px solid ${DIVIDER}`,
                        flexWrap: "wrap",
                        gap: "6px",
                      }}
                    >
                      <span style={{ fontSize: "13px", color: INK_NAVY, fontWeight: 700 }}>
                        {t("common:total")} : {formatMoney(totalActualSum || null, currency, unitOn)} / {formatMoney(totalBudgetSum || null, currency, unitOn)}
                        {totalCostPct != null && ` (${fmtPct(totalCostPct)})`}
                      </span>
                      <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
                        {[
                          { label: t("overviewTab:totalBudget"), color: chartTheme.lightGray },
                          { label: t("overviewTab:executionPlanCumulative"), color: chartTheme.outflowRed },
                          { label: t("overviewTab:executionActualCumulative"), color: chartTheme.inflowBlue },
                        ].map(({ label, color }) => (
                          <div key={label} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                            <div style={{ width: "11px", height: "11px", backgroundColor: color, borderRadius: "2px" }} />
                            <span style={{ fontSize: "12px", color: INK_SECONDARY }}>{label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Cash — 매출·확정·수금·채권 */}
              <div style={cardStyle}>
                <CardHeader
                  title={t("serviceProjectDashboard:cashLabel")}
                  unit={unitStr}
                  badgeLabel={t("serviceProjectDashboard:collectionRateLabel")}
                  badgeValue={collectionRatePct != null ? fmtPct(collectionRatePct) : undefined}
                  badgeColor={rateColor(collectionRatePct)}
                />
                {isLoading ? (
                  <div style={{ ...emptyNote, padding: "40px 10px" }}>{t("common:loading")}</div>
                ) : revenueTotal == null && cashConfirmed == null && cashCollection == null ? (
                  <EmptyHint label={t("serviceProjectDashboard:cashEmptyLabel")} />
                ) : (
                  (() => {
                    const rev = revenueTotal ?? 0;
                    const conf = cashConfirmed ?? 0;
                    const coll = cashCollection ?? 0;
                    const outs = Math.max(cashOutstanding ?? 0, 0);
                    const cashMax = Math.max(rev, conf, coll, outs, 1);
                    return (
                      <>
                        {/* 막대 그래프 */}
                        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-around", marginTop: "10px", height: "130px" }}>
                          <MiniBar value={rev}  max={cashMax} color={chartTheme.neutralGray} label={t("common:revenue")}                          height={100} width={34} />
                          <MiniBar value={conf} max={cashMax} color={chartTheme.neutralGray} label={t("serviceProjectDashboard:confirmedA")}      height={100} width={34} />
                          <MiniBar value={coll} max={cashMax} color={chartTheme.balanceNavy} label={t("serviceProjectDashboard:collectionB")}     height={100} width={34} />
                          <MiniBar value={outs} max={cashMax} color={chartTheme.outflowRed}  label={t("serviceProjectDashboard:receivableAB")}    height={100} width={34} />
                        </div>
                        {/* 하단 수치 테이블 */}
                        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "8px", fontSize: "12px" }}>
                          <tbody>
                            {([
                              { label: t("common:revenue"),                          value: rev,  color: chartTheme.neutralGray },
                              { label: t("serviceProjectDashboard:confirmedA"),      value: conf, color: chartTheme.neutralGray },
                              { label: t("serviceProjectDashboard:collectionB"),     value: coll, color: chartTheme.balanceNavy },
                              { label: t("serviceProjectDashboard:receivableAB"),    value: outs, color: chartTheme.outflowRed  },
                            ] as const).map(({ label, value, color }) => (
                              <tr key={label} style={{ borderTop: `1px solid ${DIVIDER}` }}>
                                <td style={{ padding: "4px 4px 4px 0", display: "flex", alignItems: "center", gap: "5px", whiteSpace: "nowrap" }}>
                                  <div style={{ width: "8px", height: "8px", borderRadius: "2px", backgroundColor: color, flexShrink: 0 }} />
                                  <span style={{ color: INK_MUTED }}>{label}</span>
                                </td>
                                <td style={{ padding: "4px 0", textAlign: "right", fontWeight: 600, color: INK_NAVY, whiteSpace: "nowrap" }}>
                                  {formatMoney(value || null, currency, unitOn)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </>
                    );
                  })()
                )}
              </div>
            </div>

            {/* Comment */}
            <div style={cardStyle}>
              <ProjectCommentPanel projectName={projectName} tab="service" />
            </div>
          </div>
            );
          })()
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
