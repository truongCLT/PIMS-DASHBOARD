import React, { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { usePutProjectdetail } from "@workspace/api-client-react";
import { ProjectCommentPanel } from "./ProjectCommentPanel";
import { Download, FileSpreadsheet, Upload } from "lucide-react";
import { downloadProjectDetailTemplate, parseProjectDetailWorkbook, ExcelParseError } from "../lib/projectDetailExcel";
import { MiniBar } from "./ProjectDashboard";
import { Donut } from "./charts";
import { SaleProfitTab } from "./SaleProfitTab";
import { ServiceOutsourcingTab } from "./ServiceOutsourcingTab";
import { ServiceCashflowTab } from "./ServiceCashflowTab";
import { ServiceBudgetTab } from "./ServiceBudgetTab";
import { ProjectDataEntryTab } from "./ProjectDataEntryTab";
import { useProjectDetail, getGetProjectdetailQueryKey, fmtPct, ratioPct } from "../lib/projectDetailData";
import { useAdminAuth } from "../lib/adminAuth";
import { DisplayUnitProvider, formatMoney, moneyUnitLabel } from "../lib/displayUnit";
import { tokens as aquaTokens } from "@workspace/aqua-glass";
const AG = aquaTokens.color.light;

const cardStyle: React.CSSProperties = {
  backgroundColor: "#fff",
  border: `1px solid ${AG.border}`,
  borderRadius: "8px",
  padding: "10px 12px",
};

const sectionTitle: React.CSSProperties = {
  fontSize: "16px",
  fontWeight: 700,
  color: AG.primary,
  marginBottom: "6px",
};

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

const YEARS = Array.from({ length: 47 }, (_, i) => 1990 + i); // 1990 ~ 2036
const MONTHS = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];

const selectStyle: React.CSSProperties = {
  border: "none",
  outline: "none",
  fontSize: "16px",
  color: "#333",
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
        border: `1px solid ${AG.border}`,
        borderRadius: "6px",
        padding: "4px 8px",
        backgroundColor: "#fff",
      }}
    >
      <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
        <select value={year} onChange={(e) => onYear(Number(e.target.value))} style={selectStyle}>
          {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <span style={{ position: "absolute", right: 0, fontSize: "11px", color: "#888", pointerEvents: "none" }}>▼</span>
      </div>
      <span style={{ fontSize: "14px", color: "#aab2bc", margin: "0 1px" }}>{t("serviceProjectDashboard:yearSuffix")}</span>
      <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
        <select value={month} onChange={(e) => onMonth(e.target.value)} style={selectStyle}>
          {MONTHS.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <span style={{ position: "absolute", right: 0, fontSize: "11px", color: "#888", pointerEvents: "none" }}>▼</span>
      </div>
      <span style={{ fontSize: "14px", color: "#aab2bc", margin: "0 1px" }}>{t("serviceProjectDashboard:monthSuffix")}</span>
    </div>
  );
}

function EmptyHint({ label }: { label: string }) {
  const { t } = useTranslation(["serviceProjectDashboard", "common"]);
  return (
    <div style={{ padding: "40px 10px", textAlign: "center", fontSize: "13px", color: AG.mutedForeground }}>
      {t("serviceProjectDashboard:emptyDataHint", { label })}
    </div>
  );
}

export function ServiceProjectDashboard({ projectName }: { projectName: string }) {
  const { t } = useTranslation(["serviceProjectDashboard", "common"]);
  const [currency, setCurrency] = useState("USD");
  const [unitOn, setUnitOn] = useState(true);
  const [activeTab, setActiveTab] = useState("Overview");
  const { isAdmin } = useAdminAuth();
  // 기본 기간: 올해 1월 ~ 직전월
  const now = new Date();
  const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const [fromYear, setFromYear] = useState(now.getFullYear());
  const [fromMonth, setFromMonth] = useState("01");
  const [toYear, setToYear] = useState(prevMonthDate.getFullYear());
  const [toMonth, setToMonth] = useState(String(prevMonthDate.getMonth() + 1).padStart(2, "0"));

  const { detail, isLoading } = useProjectDetail(projectName);

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
      await downloadProjectDetailTemplate(projectName, detail);
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
      const parsed = await parseProjectDetailWorkbook(file, detail);
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

  // 예산 집행 현황 (Budget Execution) — 항목별 예산 vs 기성 실적
  const budgetRows = costBudget.filter((c) => c.budget != null || c.actual != null);
  const totalBudget = budgetRows.some((c) => c.budget != null)
    ? budgetRows.reduce((a, c) => a + (c.budget ?? 0), 0)
    : null;
  const totalActual = budgetRows.some((c) => c.actual != null)
    ? budgetRows.reduce((a, c) => a + (c.actual ?? 0), 0)
    : null;
  const maxBudget = budgetRows.reduce((a, c) => Math.max(a, c.budget ?? 0), 0);

  // 도급액 — 개요 입력값 우선, 없으면 원가율 데이터(execution 우선, 없으면 bidding)의 도급액 사용
  const ov = detail?.overview;
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
    <DisplayUnitProvider currency={currency} unitOn={unitOn}>
    <div style={{ flex: 1, overflowY: "auto", backgroundColor: AG.background }}>
      {/* Filter row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "18px",
          flexWrap: "wrap",
          backgroundColor: "#fff",
          borderBottom: `1px solid ${AG.border}`,
          padding: "8px 20px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "14px", color: "#333", fontWeight: 600 }}>{t("common:exchangeRate")} :</span>
          <div style={{ display: "flex", border: `1px solid ${AG.border}`, borderRadius: "6px", overflow: "hidden" }}>
            {["USD", "KRW", "VND"].map((c) => (
              <button
                key={c}
                onClick={() => setCurrency(c)}
                style={{
                  padding: "5px 12px",
                  fontSize: "16px",
                  fontWeight: 600,
                  border: "none",
                  cursor: "pointer",
                  backgroundColor: currency === c ? "#fff" : "#f2f5f9",
                  color: currency === c ? AG.primary : "#666",
                  borderRight: c !== "VND" ? `1px solid ${AG.border}` : "none",
                }}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "14px", color: "#333", fontWeight: 600 }}>{t("common:unit")} :</span>
          <div
            onClick={() => {
              const sy = window.scrollY;
              setUnitOn((v) => !v);
              requestAnimationFrame(() => window.scrollTo({ top: sy, behavior: "instant" as ScrollBehavior }));
            }}
            style={{
              width: "36px",
              height: "20px",
              backgroundColor: unitOn ? AG.primary : "#b0b8c4",
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
          <span style={{ fontSize: "14px", color: "#333", fontWeight: 600 }}>1K {currency}</span>
        </div>

        <button
          style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            backgroundColor: AG.primary,
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            padding: "7px 14px",
            fontSize: "16px",
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          <Download size={13} />
          Export Excel
        </button>
      </div>

      {/* Project info bar — always visible */}
      <div style={{ ...cardStyle, margin: "8px 10px 0", display: "flex", gap: "10px", alignItems: "stretch" }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 0", fontSize: "14px", color: AG.foreground }}>
            <span style={{ fontWeight: 700, paddingRight: "14px" }}>Project : {projectName}</span>
            {ov?.asOfMonth && (
              <span style={{ borderLeft: `1px solid ${AG.border}`, padding: "0 14px" }}>
                {t("serviceProjectDashboard:asOfMonth", { year: ov.asOfMonth.slice(0, 4), month: Number(ov.asOfMonth.slice(5, 7)) })}
              </span>
            )}
            {ov?.client && (
              <span style={{ borderLeft: `1px solid ${AG.border}`, padding: "0 14px" }}>{t("serviceProjectDashboard:clientLabel")} : {ov.client}</span>
            )}
            {periodLabel && (
              <span style={{ borderLeft: `1px solid ${AG.border}`, padding: "0 14px" }}>{t("serviceProjectDashboard:periodLabel")} : {periodLabel}</span>
            )}
            {ov?.scope && (
              <span style={{ borderLeft: `1px solid ${AG.border}`, padding: "0 14px" }}>{t("serviceProjectDashboard:scopeLabel")} : {ov.scope}</span>
            )}
            <span style={{ borderLeft: `1px solid ${AG.border}`, padding: "0 14px" }}>
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
          backgroundColor: AG.background,
          borderBottom: `2px solid ${AG.border}`,
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
                fontSize: "16px",
                fontWeight: active ? 700 : 500,
                color: active ? AG.foreground : AG.mutedForeground,
                backgroundColor: active ? "#fff" : "transparent",
                border: "1px solid",
                borderColor: active ? AG.border : "transparent",
                borderBottom: active ? `2px solid ${AG.primary}` : "none",
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
                    fontSize: "13px",
                    fontWeight: 600,
                    color: excelMsgIsSuccess ? AG.accentForeground : AG.destructive,
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
                  fontSize: "13px",
                  fontWeight: 600,
                  color: AG.foreground,
                  backgroundColor: "#fff",
                  border: `1px solid ${AG.border}`,
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
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "#fff",
                  backgroundColor: AG.primary,
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
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "8px" }}>
            {/* Row: Revenue (도넛 2개) / Budget Execution Status / Cash (막대 4개) */}
            <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr 1fr", gap: "8px" }}>
              {/* Revenue — 도넛 2개 */}
              <div style={cardStyle}>
                <span style={sectionTitle}>{t("common:revenue")}</span>
                {isLoading ? (
                  <div style={{ padding: "40px 10px", textAlign: "center", fontSize: "13px", color: AG.mutedForeground }}>{t("common:loading")}</div>
                ) : revenueTarget == null && revenueTotal == null ? (
                  <EmptyHint label={t("serviceProjectDashboard:revenueTargetActualLabel")} />
                ) : (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-evenly", padding: "14px 0 6px" }}>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: "12px", color: "#555", marginBottom: "4px" }}>
                        {formatMoney(revenueTotal, currency, unitOn)} / {formatMoney(revenueTarget, currency, unitOn)}
                      </div>
                      <Donut
                        percent={achievementPct ?? 0}
                        color={AG.primary}
                        size={120}
                        stroke={14}
                        label={fmtPct(achievementPct)}
                        labelSize={20}
                      />
                      <div style={{ fontSize: "12px", color: AG.foreground, fontWeight: 700, marginTop: "5px", textDecoration: "underline" }}>
                        {t("serviceProjectDashboard:annualTargetAchievementRate")}
                      </div>
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: "12px", color: "#555", marginBottom: "4px" }}>
                        {formatMoney(revenueTotal, currency, unitOn)} / {formatMoney(contractAmount, currency, unitOn)}
                      </div>
                      <Donut
                        percent={ratioPct(revenueTotal, contractAmount) ?? 0}
                        color={AG.primary}
                        size={120}
                        stroke={14}
                        label={fmtPct(ratioPct(revenueTotal, contractAmount))}
                        labelSize={20}
                      />
                      <div style={{ fontSize: "12px", color: AG.foreground, fontWeight: 700, marginTop: "5px", textDecoration: "underline" }}>
                        {t("serviceProjectDashboard:cumulativeRevenueAchievementRate")}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Budget Execution Status */}
              <div style={cardStyle}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <span style={sectionTitle}>
                    {t("common:budget")} <u>{t("serviceProjectDashboard:executionStatusLabel")}</u>
                  </span>
                  <span style={{ fontSize: "12px", color: "#333", fontWeight: 600 }}>
                    {t("serviceProjectDashboard:totalExecutionRate")} : {fmtPct(ratioPct(totalActual, totalBudget))}
                  </span>
                </div>
                {isLoading ? (
                  <div style={{ padding: "40px 10px", textAlign: "center", fontSize: "13px", color: AG.mutedForeground }}>{t("common:loading")}</div>
                ) : budgetRows.length === 0 ? (
                  <EmptyHint label={t("serviceProjectDashboard:budgetExecutionEmptyLabel")} />
                ) : (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-end",
                      justifyContent: "space-around",
                      marginTop: "10px",
                      paddingBottom: "4px",
                    }}
                  >
                    {budgetRows.map((g, gi) => {
                      const H = 150;
                      const budget = g.budget ?? 0;
                      const spent = g.actual ?? 0;
                      const bh = maxBudget > 0 ? Math.max((budget / maxBudget) * H, 8) : 8;
                      const sh = budget > 0 && spent > 0 ? Math.max(bh * Math.min(spent / budget, 1), 6) : 0;
                      const pct = ratioPct(g.actual, g.budget);
                      return (
                        <div key={`${g.item}-${gi}`} style={{ textAlign: "center" }}>
                          <div style={{ fontSize: "11px", color: "#555", marginBottom: "2px" }}>{formatMoney(g.budget, currency, unitOn)}</div>
                          <div style={{ height: `${H}px`, display: "flex", alignItems: "flex-end", gap: "3px", justifyContent: "center" }}>
                            <div style={{ width: "24px", height: `${bh}px`, backgroundColor: "#d9dee5" }} />
                            {sh > 0 && (
                              <div style={{ width: "24px", height: `${sh}px`, backgroundColor: AG.primary, position: "relative" }}>
                                <span
                                  style={{
                                    position: "absolute",
                                    top: "50%",
                                    left: "50%",
                                    transform: "translate(-50%, -50%)",
                                    fontSize: "10px",
                                    color: "#fff",
                                    fontWeight: 700,
                                  }}
                                >
                                  {formatMoney(g.actual, currency, unitOn)}
                                </span>
                              </div>
                            )}
                          </div>
                          {pct != null && (
                            <div style={{ fontSize: "11px", color: AG.primary, fontWeight: 600, marginTop: "2px" }}>{fmtPct(pct)}</div>
                          )}
                          <div style={{ fontSize: "11px", color: "#333", fontWeight: 600, marginTop: "2px" }}>{g.item}</div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Cash — 매출·확정·수금·채권 */}
              <div style={cardStyle}>
                <span style={sectionTitle}>{t("serviceProjectDashboard:cashLabel")}</span>
                {isLoading ? (
                  <div style={{ padding: "40px 10px", textAlign: "center", fontSize: "13px", color: AG.mutedForeground }}>{t("common:loading")}</div>
                ) : revenueTotal == null && cashConfirmed == null && cashCollection == null ? (
                  <EmptyHint label={t("serviceProjectDashboard:cashEmptyLabel")} />
                ) : (
                  (() => {
                    const cashMax = Math.max(
                      revenueTotal ?? 0,
                      cashConfirmed ?? 0,
                      cashCollection ?? 0,
                      Math.abs(cashOutstanding ?? 0),
                      1,
                    );
                    return (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "flex-end",
                          justifyContent: "space-around",
                          marginTop: "10px",
                          height: "190px",
                        }}
                      >
                        <MiniBar
                          value={revenueTotal ?? 0}
                          max={cashMax}
                          color="#c9d2dd"
                          label={t("common:revenue")}
                          height={150}
                          valueLabel={formatMoney(revenueTotal, currency, unitOn)}
                          width={24}
                        />
                        <MiniBar
                          value={cashConfirmed ?? 0}
                          max={cashMax}
                          color="#c9d2dd"
                          label={t("serviceProjectDashboard:confirmedA")}
                          height={150}
                          valueLabel={formatMoney(cashConfirmed, currency, unitOn)}
                          width={24}
                        />
                        <MiniBar
                          value={cashCollection ?? 0}
                          max={cashMax}
                          color={AG.primary}
                          label={t("serviceProjectDashboard:collectionB")}
                          height={150}
                          valueLabel={formatMoney(cashCollection, currency, unitOn)}
                          width={24}
                        />
                        <MiniBar
                          value={Math.max(cashOutstanding ?? 0, 0)}
                          max={cashMax}
                          color={AG.destructive}
                          label={t("serviceProjectDashboard:receivableAB")}
                          height={150}
                          valueLabel={formatMoney(cashOutstanding, currency, unitOn)}
                          width={24}
                        />
                      </div>
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
        ) : (
          <div
            style={{
              ...cardStyle,
              padding: "60px 20px",
              textAlign: "center",
              fontSize: "15px",
              color: AG.mutedForeground,
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
