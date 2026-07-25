import React, { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { usePutProjectdetail } from "@workspace/api-client-react";
import { ProjectCommentPanel } from "./ProjectCommentPanel";
import { Download, Upload, FileSpreadsheet } from "lucide-react";
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
import { exportProjectDetailExcel } from "../lib/exportProjectDetail";
import { useAdminAuth } from "../lib/adminAuth";
export { Donut, MiniBar } from "./charts";


const cardStyle: React.CSSProperties = {
  backgroundColor: "#fff",
  border: "1px solid #d0dce8",
  borderRadius: "6px",
  padding: "10px 12px",
};

const sectionTitle: React.CSSProperties = {
  fontSize: "11px",
  fontWeight: 600,
  color: "#4472c4",
  marginBottom: "6px",
};

const SIDE_TABS = ["Overview", "Construction progress", "Sale & Profit", "Costing", "Outsourcing", "Cashflow", "Data entry"];

const SIDE_TAB_LABELS: Record<string, string> = {
  Overview: "개요",
  "Construction progress": "공정",
  "Sale & Profit": "매출",
  Costing: "원가",
  Outsourcing: "외주",
  Cashflow: "자금",
  "Data entry": "데이터 입력",
};

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
  const [excelBusy, setExcelBusy] = useState(false);

  const handleTemplateDownload = async () => {
    if (!detail || excelBusy) return;
    setExcelBusy(true);
    setExcelMsg(null);
    try {
      await downloadProjectDetailTemplate(projectName, detail);
    } catch (err) {
      console.error("Excel template download failed", err);
      setExcelMsg("양식 다운로드에 실패했습니다.");
    } finally {
      setExcelBusy(false);
    }
  };

  const handleExcelUpload = async (file: File) => {
    if (!detail || excelBusy) return;
    setExcelBusy(true);
    setExcelMsg(null);
    try {
      const parsed = await parseProjectDetailWorkbook(file, detail);
      if (!window.confirm("업로드한 Excel 내용으로 이 프로젝트의 데이터를 교체합니다. 계속할까요?")) {
        setExcelBusy(false);
        return;
      }
      await putMutation.mutateAsync({ data: { ...parsed, projectName } });
      queryClient.invalidateQueries({ queryKey: getGetProjectdetailQueryKey({ projectName }) });
      setExcelMsg("업로드가 완료되었습니다.");
    } catch (err) {
      console.error("Excel upload failed", err);
      if (err instanceof ExcelParseError) setExcelMsg(err.message);
      else {
        const serverMsg =
          typeof err === "object" && err != null && "data" in err
            ? (err as { data?: { error?: string } | null }).data?.error
            : undefined;
        setExcelMsg(serverMsg || "업로드에 실패했습니다. 파일 양식을 확인해 주세요.");
      }
    } finally {
      setExcelBusy(false);
      if (excelFileRef.current) excelFileRef.current.value = "";
    }
  };

  const [exporting, setExporting] = useState(false);
  const handleExport = async () => {
    if (!detail || exporting) return;
    setExporting(true);
    try {
      await exportProjectDetailExcel(projectName, detail, currency, unitOn);
    } catch (err) {
      console.error("Excel export failed", err);
      alert("Excel 내보내기에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setExporting(false);
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
          return `${fmtDate(ov.startDate)}~${fmtDate(ov.endDate)}\u00A0\u00A0(${mo}개월)`;
        })()
      : "-";

  return (
    <DisplayUnitProvider currency={currency} unitOn={unitOn}>
    <div style={{ flex: 1, overflowY: "auto", backgroundColor: "#e8edf3" }}>
      {/* Banner */}
      <div
        style={{
          background: "linear-gradient(90deg, #dfe9f5 0%, #c9dcf0 55%, #9fc0e0 100%)",
          padding: "16px 20px 12px",
        }}
      >
        <div style={{ fontSize: "22px", fontWeight: 800, color: "#1a3a6b" }}>Dashboard of {projectName}</div>
      </div>

      {/* Filter row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "18px",
          flexWrap: "wrap",
          backgroundColor: "#fff",
          borderBottom: "1px solid #d5dce6",
          padding: "8px 20px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "12px", color: "#333", fontWeight: 600 }}>기간 :</span>
          {/* From */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "2px",
              border: "1px solid #ccd4dd",
              borderRadius: "6px",
              padding: "4px 8px",
              backgroundColor: "#fff",
            }}
          >
            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <select value={fromYear} onChange={(e) => setFromYear(Number(e.target.value))} style={selectStyle}>
                {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
              <span style={{ position: "absolute", right: 0, fontSize: "9px", color: "#888", pointerEvents: "none" }}>▼</span>
            </div>
            <span style={{ fontSize: "12px", color: "#aab2bc", margin: "0 1px" }}>년</span>
            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <select value={fromMonth} onChange={(e) => setFromMonth(e.target.value)} style={selectStyle}>
                {MONTHS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
              <span style={{ position: "absolute", right: 0, fontSize: "9px", color: "#888", pointerEvents: "none" }}>▼</span>
            </div>
            <span style={{ fontSize: "12px", color: "#aab2bc", margin: "0 1px" }}>월</span>
          </div>
          <span style={{ fontSize: "12px", color: "#aab2bc" }}>→</span>
          {/* To */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "2px",
              border: "1px solid #ccd4dd",
              borderRadius: "6px",
              padding: "4px 8px",
              backgroundColor: "#fff",
            }}
          >
            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <select value={toYear} onChange={(e) => setToYear(Number(e.target.value))} style={selectStyle}>
                {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
              <span style={{ position: "absolute", right: 0, fontSize: "9px", color: "#888", pointerEvents: "none" }}>▼</span>
            </div>
            <span style={{ fontSize: "12px", color: "#aab2bc", margin: "0 1px" }}>년</span>
            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <select value={toMonth} onChange={(e) => setToMonth(e.target.value)} style={selectStyle}>
                {MONTHS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
              <span style={{ position: "absolute", right: 0, fontSize: "9px", color: "#888", pointerEvents: "none" }}>▼</span>
            </div>
            <span style={{ fontSize: "12px", color: "#aab2bc", margin: "0 1px" }}>월</span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "12px", color: "#333", fontWeight: 600 }}>Currency :</span>
          <div style={{ display: "flex", border: "1px solid #ccd4dd", borderRadius: "6px", overflow: "hidden" }}>
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
                  color: currency === c ? "#1e6fdd" : "#666",
                  borderRight: c !== "VND" ? "1px solid #e0e6ee" : "none",
                }}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "12px", color: "#333", fontWeight: 600 }}>Unit :</span>
          <div
            onClick={() => setUnitOn(!unitOn)}
            style={{
              width: "36px",
              height: "20px",
              backgroundColor: unitOn ? "#5b5fc7" : "#b0b8c4",
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
          <span style={{ fontSize: "12px", color: "#333", fontWeight: 600 }}>{moneyUnitLabel(currency, unitOn)}</span>
        </div>

        <button
          onClick={handleExport}
          disabled={detail == null || exporting}
          style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            backgroundColor: "#2e4568",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            padding: "7px 14px",
            fontSize: "12px",
            fontWeight: 500,
            cursor: detail == null || exporting ? "not-allowed" : "pointer",
            opacity: detail == null || exporting ? 0.6 : 1,
          }}
        >
          <Download size={13} />
          {exporting ? "내보내는 중…" : "Export Excel"}
        </button>
      </div>

      {/* Project info bar — always visible */}
      <div style={{ ...cardStyle, margin: "8px 10px 0", display: "flex", gap: "10px", alignItems: "stretch" }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 0", fontSize: "12px", color: "#1a2d4d" }}>
            <span style={{ fontWeight: 700, paddingRight: "14px" }}>Project : {projectName}</span>
            <span style={{ borderLeft: "1px solid #d5dce6", padding: "0 14px" }}>발주처 : {ov.client ?? "-"}</span>
            <span style={{ borderLeft: "1px solid #d5dce6", padding: "0 14px" }}>
              공사기간 : {periodLabel}
            </span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 0", fontSize: "12px", color: "#1a2d4d", marginTop: "8px" }}>
            <span style={{ fontWeight: 700, paddingRight: "14px" }}>
              도급액 : {formatMoney(ov.contractAmount, currency, unitOn)} {moneyUnitLabel(currency, unitOn)}
            </span>
            <span style={{ borderLeft: "1px solid #d5dce6", padding: "0 14px" }}>
              공사규모 : {ov.scale ?? "-"}
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
          backgroundColor: "#f0f4f9",
          borderBottom: "2px solid #c8d2de",
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
                color: active ? "#1a3a6b" : "#5a6a7e",
                backgroundColor: active ? "#fff" : "transparent",
                border: "1px solid",
                borderColor: active ? "#c8d2de" : "transparent",
                borderBottom: active ? "2px solid #fff" : "none",
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
                  color: excelMsg.includes("완료") ? "#3e7d4c" : "#c0392b",
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
              title="현재 데이터가 담긴 Excel 양식을 내려받아 수정 후 업로드하세요."
              style={{
                display: "flex",
                alignItems: "center",
                gap: "5px",
                padding: "5px 12px",
                fontSize: "11px",
                fontWeight: 600,
                color: "#1a3a6b",
                backgroundColor: "#fff",
                border: "1px solid #c8d2de",
                borderRadius: "4px",
                cursor: excelBusy ? "wait" : "pointer",
                opacity: !detail || excelBusy ? 0.6 : 1,
              }}
            >
              <FileSpreadsheet size={13} /> Excel 다운로드
            </button>
            <button
              onClick={() => excelFileRef.current?.click()}
              disabled={!detail || excelBusy}
              title="다운로드한 양식에 데이터를 입력해 업로드하면 전체 데이터가 교체됩니다."
              style={{
                display: "flex",
                alignItems: "center",
                gap: "5px",
                padding: "5px 12px",
                fontSize: "11px",
                fontWeight: 600,
                color: "#fff",
                backgroundColor: "#2e4568",
                border: "none",
                borderRadius: "4px",
                cursor: excelBusy ? "wait" : "pointer",
                opacity: !detail || excelBusy ? 0.6 : 1,
              }}
            >
              <Upload size={13} /> Excel 업로드
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
