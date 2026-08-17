import React, { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { usePutProjectdetail } from "@workspace/api-client-react";
import { ProjectCommentPanel } from "./ProjectCommentPanel";
import { Upload, FileSpreadsheet } from "lucide-react";
import projectPhoto from "../assets/project-photo.png";
import { ConstructionProgressTab } from "./ConstructionProgressTab";
import { CostingTab } from "./CostingTab";
import { OutsourcingTab } from "./OutsourcingTab";
import { ServiceCashflowTab } from "./ServiceCashflowTab";
import { ProjectDataEntryTab } from "./ProjectDataEntryTab";
import { SaleProfitTab } from "./SaleProfitTab";
import { OverviewTab } from "./OverviewTab";
import { useProjectDetail, getGetProjectdetailQueryKey } from "../lib/projectDetailData";
import { downloadProjectDetailTemplate, parseProjectDetailWorkbook, ExcelParseError } from "../lib/projectDetailExcel";
import { DisplayUnitProvider, formatMoney, moneyUnitLabel } from "../lib/displayUnit";
import { useAdminAuth } from "../lib/adminAuth";
import { useDashboardFilters } from "../lib/dashboardFilters";
import { cardStyle, sectionTitle } from "../lib/uiTokens";
export { Donut, MiniBar } from "./charts";


const SIDE_TABS = ["Overview", "Construction progress", "Sale & Profit", "Costing", "Outsourcing", "Cashflow", "Data entry"];

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
    Overview: t("common:overview"),
    "Construction progress": t("common:process"),
    "Sale & Profit": t("common:revenue"),
    Costing: t("projectDashboard:costing"),
    Outsourcing: t("common:outsourcing"),
    Cashflow: t("projectDashboard:cashflow"),
    "Data entry": t("projectDashboard:dataEntry"),
  };
  const { fxRates } = useDashboardFilters();
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
  const periodMonths = Math.min(
    24,
    Math.max(1, (toYear - fromYear) * 12 + (Number(toMonth) - Number(fromMonth)) + 1),
  );

  const { detail } = useProjectDetail(projectName);
  const queryClient = useQueryClient();
  const putMutation = usePutProjectdetail();
  const excelFileRef = useRef<HTMLInputElement>(null);
  const [excelMsg, setExcelMsg] = useState<string | null>(null);
  const [excelStatus, setExcelStatus] = useState<"success" | "error" | null>(null);
  const [excelBusy, setExcelBusy] = useState(false);

  const handleTemplateDownload = async () => {
    if (!detail || excelBusy) return;
    setExcelBusy(true);
    setExcelMsg(null);
    setExcelStatus(null);
    try {
      await downloadProjectDetailTemplate(projectName, detail, fxRates.VND);
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
      const parsed = await parseProjectDetailWorkbook(file, detail, fxRates.VND);
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
    <DisplayUnitProvider currency={currency} unitOn={unitOn}>
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
                onClick={() => setCurrency(c)}
                style={{
                  padding: "5px 12px",
                  fontSize: "12px",
                  fontWeight: 600,
                  border: "none",
                  cursor: "pointer",
                  backgroundColor: currency === c ? "#fff" : "#f2f5f9",
                  color: currency === c ? "#2f7cf6" : "#666",
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
          <span style={{ fontSize: "12px", color: "#333", fontWeight: 600, display: "inline-block", minWidth: "64px" }}>{moneyUnitLabel(currency, unitOn)}</span>
        </div>

      </div>

      {/* Project info bar — always visible */}
      <div style={{ ...cardStyle, margin: "8px 10px 0", display: "flex", gap: "10px", alignItems: "stretch" }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 0", fontSize: "12px", color: "#16294a" }}>
            <span style={{ fontWeight: 700, paddingRight: "14px" }}>{t("common:project")} : {projectName}</span>
            <span style={{ borderLeft: "1px solid #e2e9f3", padding: "0 14px" }}>{t("projectDashboard:client")} : {ov.client ?? "-"}</span>
            <span style={{ borderLeft: "1px solid #e2e9f3", padding: "0 14px" }}>
              {t("projectDashboard:constructionPeriod")} : {periodLabel}
            </span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 0", fontSize: "12px", color: "#16294a", marginTop: "8px" }}>
            <span style={{ paddingRight: "14px" }}>
              {t("common:contractAmount")} : {formatMoney(ov.contractAmount, currency, unitOn)} {moneyUnitLabel(currency, unitOn)}
            </span>
            <span style={{ borderLeft: "1px solid #e2e9f3", padding: "0 14px" }}>
              {t("projectDashboard:constructionScale")} : {ov.scale ?? "-"}
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
          backgroundColor: "#eef2f7",
          borderBottom: "2px solid #e2e9f3",
          marginTop: "8px",
        }}
      >
        {SIDE_TABS.filter((tab) => tab !== "Data entry" || isAdmin).map((tab) => {
          const active = tab === activeTab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
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
        {activeTab === "Construction progress" ? (
          <div style={{ flex: 1, minWidth: 0 }}>
            <ConstructionProgressTab projectName={projectName} />
          </div>
        ) : activeTab === "Costing" ? (
          <div style={{ flex: 1, minWidth: 0 }}>
            <CostingTab projectName={projectName} toYear={toYear} toMonth={Number(toMonth)} />
          </div>
        ) : activeTab === "Outsourcing" ? (
          <div style={{ flex: 1, minWidth: 0 }}>
            <OutsourcingTab projectName={projectName} />
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
            />
          </div>
        ) : activeTab === "Sale & Profit" ? (
          <div style={{ flex: 1, minWidth: 0 }}>
            <SaleProfitTab
              projectName={projectName}
              fromYear={fromYear}
              fromMonth={Number(fromMonth)}
              months={periodMonths}
            />
          </div>
        ) : (
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
