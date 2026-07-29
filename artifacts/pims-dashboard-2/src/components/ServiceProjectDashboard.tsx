import React, { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { usePutProjectdetail } from "@workspace/api-client-react";
import { ProjectCommentPanel } from "./ProjectCommentPanel";
import { Download, FileSpreadsheet, Upload } from "lucide-react";
import { downloadProjectDetailTemplate, parseProjectDetailWorkbook, ExcelParseError } from "../lib/projectDetailExcel";
import { MiniBar } from "./ProjectDashboard";
import { SaleProfitTab } from "./SaleProfitTab";
import { ServiceOutsourcingTab } from "./ServiceOutsourcingTab";
import { ServiceCashflowTab } from "./ServiceCashflowTab";
import { ServiceBudgetTab } from "./ServiceBudgetTab";
import { ProjectDataEntryTab } from "./ProjectDataEntryTab";
import { useProjectDetail, getGetProjectdetailQueryKey, fmtPct, ratioPct } from "../lib/projectDetailData";
import { useAdminAuth } from "../lib/adminAuth";
import { DisplayUnitProvider, formatMoney, moneyUnitLabel } from "../lib/displayUnit";

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

const TABS = ["Overview", "Sale & Profit", "Budget Execution", "Outsourcing", "Cashflow", "Data entry"];

const TAB_LABELS: Record<string, string> = {
  Overview: "개요",
  "Sale & Profit": "매출",
  "Budget Execution": "예산집행",
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
  return (
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
        <select value={year} onChange={(e) => onYear(Number(e.target.value))} style={selectStyle}>
          {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <span style={{ position: "absolute", right: 0, fontSize: "9px", color: "#888", pointerEvents: "none" }}>▼</span>
      </div>
      <span style={{ fontSize: "12px", color: "#aab2bc", margin: "0 1px" }}>년</span>
      <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
        <select value={month} onChange={(e) => onMonth(e.target.value)} style={selectStyle}>
          {MONTHS.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <span style={{ position: "absolute", right: 0, fontSize: "9px", color: "#888", pointerEvents: "none" }}>▼</span>
      </div>
      <span style={{ fontSize: "12px", color: "#aab2bc", margin: "0 1px" }}>월</span>
    </div>
  );
}

function EmptyHint({ label }: { label: string }) {
  return (
    <div style={{ padding: "40px 10px", textAlign: "center", fontSize: "11px", color: "#8a97a8" }}>
      {label} 데이터가 없습니다. "데이터 입력" 탭에서 입력해 주세요.
    </div>
  );
}

export function ServiceProjectDashboard({ projectName }: { projectName: string }) {
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

  // 외주 요약 (Cash 카드 대용 — 계약/기성 현황)
  const outSum = {
    budget: outsourcing.some((r) => r.budget != null) ? outsourcing.reduce((a, r) => a + (r.budget ?? 0), 0) : null,
    resolved: outsourcing.some((r) => r.resolved != null) ? outsourcing.reduce((a, r) => a + (r.resolved ?? 0), 0) : null,
    accum: outsourcing.some((r) => r.accum != null) ? outsourcing.reduce((a, r) => a + (r.accum ?? 0), 0) : null,
  };
  const outMax = Math.max(outSum.budget ?? 0, outSum.resolved ?? 0, outSum.accum ?? 0);
  const outstanding =
    outSum.resolved != null && outSum.accum != null ? outSum.resolved - outSum.accum : null;

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
    return `${fmt(ov?.startDate)} ~ ${fmt(ov?.endDate)}${months != null ? ` (${months}개월)` : ""}`;
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
          <YearMonthSelect year={fromYear} month={fromMonth} onYear={setFromYear} onMonth={setFromMonth} />
          <span style={{ fontSize: "12px", color: "#aab2bc" }}>→</span>
          <YearMonthSelect year={toYear} month={toMonth} onYear={setToYear} onMonth={setToMonth} />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "12px", color: "#333", fontWeight: 600 }}>통화 :</span>
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
          <span style={{ fontSize: "12px", color: "#333", fontWeight: 600 }}>단위 :</span>
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
          <span style={{ fontSize: "12px", color: "#333", fontWeight: 600 }}>1K {currency}</span>
        </div>

        <button
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
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 0", fontSize: "12px", color: "#1a2d4d" }}>
            <span style={{ fontWeight: 700, paddingRight: "14px" }}>Project : {projectName}</span>
            {ov?.asOfMonth && (
              <span style={{ borderLeft: "1px solid #d5dce6", padding: "0 14px" }}>
                작성 기준 : {ov.asOfMonth.slice(0, 4)}년 {Number(ov.asOfMonth.slice(5, 7))}월 말
              </span>
            )}
            {ov?.client && (
              <span style={{ borderLeft: "1px solid #d5dce6", padding: "0 14px" }}>발주처 : {ov.client}</span>
            )}
            {periodLabel && (
              <span style={{ borderLeft: "1px solid #d5dce6", padding: "0 14px" }}>수행기간 : {periodLabel}</span>
            )}
            {ov?.scope && (
              <span style={{ borderLeft: "1px solid #d5dce6", padding: "0 14px" }}>수행내용 : {ov.scope}</span>
            )}
            <span style={{ borderLeft: "1px solid #d5dce6", padding: "0 14px" }}>
              도급액 : {contractAmount != null ? `${formatMoney(contractAmount, currency, unitOn)} ${moneyUnitLabel(currency, unitOn)}` : "-"}
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
              {TAB_LABELS[tab] ?? tab}
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
            <ProjectDataEntryTab projectName={projectName} service />
          </>
        ) : activeTab === "Overview" ? (
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "8px" }}>
            {/* Row 0: Revenue / Cash */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              {/* Revenue — Annual Target Achievement */}
              <div style={cardStyle}>
                <span style={sectionTitle}>
                  매출 <u>연간 목표 달성</u>
                </span>
                {isLoading ? (
                  <div style={{ padding: "40px 10px", textAlign: "center", fontSize: "11px", color: "#8a97a8" }}>불러오는 중…</div>
                ) : revenueTarget == null && revenueTotal == null ? (
                  <EmptyHint label="매출 목표/실적" />
                ) : (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-around", padding: "18px 0 10px" }}>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: "10px", color: "#5a6a7e", fontWeight: 600 }}>연간 목표</div>
                      <div style={{ fontSize: "20px", fontWeight: 800, color: "#1a3a6b", marginTop: "4px" }}>
                        {formatMoney(revenueTarget, currency, unitOn)}
                      </div>
                      <div style={{ fontSize: "9px", color: "#8a97a8" }}>{moneyUnitLabel(currency, unitOn)}</div>
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: "10px", color: "#5a6a7e", fontWeight: 600 }}>매출 누계</div>
                      <div style={{ fontSize: "20px", fontWeight: 800, color: "#2b5cad", marginTop: "4px" }}>
                        {formatMoney(revenueTotal, currency, unitOn)}
                      </div>
                      <div style={{ fontSize: "9px", color: "#8a97a8" }}>{moneyUnitLabel(currency, unitOn)}</div>
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: "10px", color: "#5a6a7e", fontWeight: 600 }}>달성률</div>
                      <div style={{ fontSize: "26px", fontWeight: 800, color: "#3e7d4c", marginTop: "2px" }}>
                        {fmtPct(achievementPct)}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Cash — Confirmed / Collection / Outstanding */}
              <div style={cardStyle}>
                <span style={sectionTitle}>현금</span>
                {isLoading ? (
                  <div style={{ padding: "40px 10px", textAlign: "center", fontSize: "11px", color: "#8a97a8" }}>불러오는 중…</div>
                ) : cashConfirmed == null && cashCollection == null ? (
                  <EmptyHint label="현금 (확정/수금)" />
                ) : (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-around", padding: "18px 0 10px" }}>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: "10px", color: "#5a6a7e", fontWeight: 600 }}>확정 (A)</div>
                      <div style={{ fontSize: "20px", fontWeight: 800, color: "#1a3a6b", marginTop: "4px" }}>
                        {formatMoney(cashConfirmed, currency, unitOn)}
                      </div>
                      <div style={{ fontSize: "9px", color: "#8a97a8" }}>{moneyUnitLabel(currency, unitOn)}</div>
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: "10px", color: "#5a6a7e", fontWeight: 600 }}>수금 (B)</div>
                      <div style={{ fontSize: "20px", fontWeight: 800, color: "#2b5cad", marginTop: "4px" }}>
                        {formatMoney(cashCollection, currency, unitOn)}
                      </div>
                      <div style={{ fontSize: "9px", color: "#8a97a8" }}>{moneyUnitLabel(currency, unitOn)}</div>
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: "10px", color: "#5a6a7e", fontWeight: 600 }}>미수금 (A-B)</div>
                      <div style={{ fontSize: "20px", fontWeight: 800, color: "#c0392b", marginTop: "4px" }}>
                        {formatMoney(cashOutstanding, currency, unitOn)}
                      </div>
                      <div style={{ fontSize: "9px", color: "#8a97a8" }}>{moneyUnitLabel(currency, unitOn)}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Row 1: Budget Execution Status / Outsourcing */}
            <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: "8px" }}>
              {/* Budget Execution Status */}
              <div style={cardStyle}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <span style={sectionTitle}>
                    예산 <u>집행 현황</u>
                  </span>
                  <span style={{ fontSize: "10px", color: "#333", fontWeight: 600 }}>
                    총 집행률 : {fmtPct(ratioPct(totalActual, totalBudget))}
                  </span>
                </div>
                {isLoading ? (
                  <div style={{ padding: "40px 10px", textAlign: "center", fontSize: "11px", color: "#8a97a8" }}>불러오는 중…</div>
                ) : budgetRows.length === 0 ? (
                  <EmptyHint label="예산 집행" />
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
                          <div style={{ fontSize: "9px", color: "#555", marginBottom: "2px" }}>{formatMoney(g.budget, currency, unitOn)}</div>
                          <div style={{ height: `${H}px`, display: "flex", alignItems: "flex-end", gap: "3px", justifyContent: "center" }}>
                            <div style={{ width: "24px", height: `${bh}px`, backgroundColor: "#d9dee5" }} />
                            {sh > 0 && (
                              <div style={{ width: "24px", height: `${sh}px`, backgroundColor: "#2b5cad", position: "relative" }}>
                                <span
                                  style={{
                                    position: "absolute",
                                    top: "50%",
                                    left: "50%",
                                    transform: "translate(-50%, -50%)",
                                    fontSize: "8px",
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
                            <div style={{ fontSize: "9px", color: "#4a90d9", fontWeight: 600, marginTop: "2px" }}>{fmtPct(pct)}</div>
                          )}
                          <div style={{ fontSize: "9px", color: "#333", fontWeight: 600, marginTop: "2px" }}>{g.item}</div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Outsourcing summary */}
              <div style={cardStyle}>
                <span style={sectionTitle}>외주</span>
                {isLoading ? (
                  <div style={{ padding: "40px 10px", textAlign: "center", fontSize: "11px", color: "#8a97a8" }}>불러오는 중…</div>
                ) : outsourcing.length === 0 ? (
                  <EmptyHint label="외주" />
                ) : (
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
                      value={outSum.budget ?? 0}
                      max={outMax}
                      color="#c9d2dd"
                      label="예산 (A)"
                      height={150}
                      valueLabel={formatMoney(outSum.budget, currency, unitOn)}
                      width={24}
                    />
                    <MiniBar
                      value={outSum.resolved ?? 0}
                      max={outMax}
                      color="#c9d2dd"
                      label="결의금액 (B)"
                      height={150}
                      valueLabel={formatMoney(outSum.resolved, currency, unitOn)}
                      width={24}
                    />
                    <MiniBar
                      value={outSum.accum ?? 0}
                      max={outMax}
                      color="#2b5cad"
                      label="기성 누계 (C)"
                      height={150}
                      valueLabel={formatMoney(outSum.accum, currency, unitOn)}
                      width={24}
                    />
                    <MiniBar
                      value={outstanding ?? 0}
                      max={outMax}
                      color="#c0392b"
                      label="잔여 (B)-(C)"
                      height={150}
                      valueLabel={formatMoney(outstanding, currency, unitOn)}
                      width={24}
                    />
                  </div>
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
              fontSize: "13px",
              color: "#5a6a7e",
            }}
          >
            {TAB_LABELS[activeTab] ?? activeTab} 화면은 준비 중입니다.
          </div>
        )}
      </div>
    </div>
    </DisplayUnitProvider>
  );
}
