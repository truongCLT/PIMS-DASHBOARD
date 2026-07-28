import React, { useEffect, useRef, useState } from "react";
import { ChevronsUp, Download, FileSpreadsheet, FileText } from "lucide-react";
import { PROJECT_GROUPS } from "../data/projects";
import { exportDashboardExcel, exportDashboardPdf } from "../lib/exportDashboard";

export function DashboardHeader() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [period, setPeriod] = useState("Month");
  const [currency, setCurrency] = useState("USD");
  const [project, setProject] = useState("All");
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const downloadRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!downloadOpen) return;
    const onClickOutside = (e: MouseEvent) => {
      if (downloadRef.current && !downloadRef.current.contains(e.target as Node)) {
        setDownloadOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [downloadOpen]);

  const handleExcel = async () => {
    setDownloadOpen(false);
    try {
      await exportDashboardExcel();
    } catch (err) {
      console.error("Excel export failed", err);
      alert("엑셀 다운로드 중 오류가 발생했습니다.");
    }
  };

  const handlePdf = async () => {
    setDownloadOpen(false);
    setExporting(true);
    try {
      await exportDashboardPdf();
    } catch (err) {
      console.error("PDF export failed", err);
      alert("PDF 다운로드 중 오류가 발생했습니다.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div style={{
      background: "linear-gradient(120deg, #e3ebf8 0%, #edf2fb 25%, #d3e0f4 50%, #bfd2ee 75%, #abc4e8 100%)",
      padding: "14px 16px 14px",
      position: "relative",
      flexShrink: 0,
      borderRadius: "14px",
      boxShadow: "0 2px 12px rgba(26,39,68,0.08)",
    }}>
      {/* Background building image overlay */}
      <div style={{
        position: "absolute",
        right: 0,
        top: 0,
        bottom: 0,
        width: "70%",
        opacity: 0.35,
        borderRadius: "0 14px 14px 0",
        overflow: "hidden",
        backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 600 200'%3E%3Cg stroke='%23ffffff' stroke-width='2' opacity='0.6'%3E%3Cline x1='100' y1='0' x2='300' y2='200'/%3E%3Cline x1='150' y1='0' x2='350' y2='200'/%3E%3Cline x1='200' y1='0' x2='400' y2='200'/%3E%3Cline x1='250' y1='0' x2='450' y2='200'/%3E%3Cline x1='300' y1='0' x2='500' y2='200'/%3E%3Cline x1='350' y1='0' x2='550' y2='200'/%3E%3Cline x1='400' y1='0' x2='600' y2='200'/%3E%3C/g%3E%3Cg stroke='%237da7cc' stroke-width='1' opacity='0.5'%3E%3Cline x1='0' y1='50' x2='600' y2='20'/%3E%3Cline x1='0' y1='100' x2='600' y2='70'/%3E%3Cline x1='0' y1='150' x2='600' y2='120'/%3E%3C/g%3E%3C/svg%3E\")",
        backgroundSize: "cover",
      }} />

      <div style={{ position: "relative", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <h1 style={{
          color: "var(--color-text-primary)",
          fontSize: "22px",
          fontWeight: "700",
          margin: "0 0 12px",
        }}>대시보드</h1>
        <button style={{
          backgroundColor: "var(--color-card-bg)",
          border: "1px solid var(--color-border)",
          borderRadius: "8px",
          padding: "6px 8px",
          cursor: "pointer",
          color: "var(--color-primary-blue)",
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
        backgroundColor: "var(--color-card-bg)",
        borderRadius: "10px",
        boxShadow: "0 2px 8px rgba(26,39,68,0.10)",
        padding: "12px 14px",
        display: "flex",
        alignItems: "center",
        gap: "16px",
        flexWrap: "wrap",
      }}>
        {/* Project filter */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "13px", color: "var(--color-text-secondary)", fontWeight: "500" }}>프로젝트:</span>
          <select
            value={project}
            onChange={(e) => setProject(e.target.value)}
            style={{
              border: "1px solid var(--color-border)",
              borderRadius: "8px",
              padding: "6px 32px 6px 12px",
              fontSize: "13px",
              color: "var(--color-text-primary)",
              fontWeight: "500",
              backgroundColor: "var(--color-background)",
              cursor: "pointer",
              minWidth: "120px",
              maxWidth: "260px",
              outline: "none",
              appearance: "none",
              backgroundImage: `url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%238b96ab%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")`,
              backgroundRepeat: "no-repeat",
              backgroundPosition: "right 10px top 50%",
              backgroundSize: "10px auto",
            }}
          >
            <option value="All">All</option>
            {PROJECT_GROUPS.flatMap((group) =>
              group.divisions.map((division) => (
                <optgroup
                  key={`${group.label}-${division.label}`}
                  label={`${group.label} · ${division.label}`}
                >
                  {division.projects.map((p) => (
                    <option key={p.code} value={p.code}>
                      {p.name}
                    </option>
                  ))}
                </optgroup>
              )),
            )}
          </select>
        </div>

        {/* Date filter */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "13px", color: "var(--color-text-secondary)", fontWeight: "500" }}>조회 기간:</span>
          <div style={{
            display: "flex",
            alignItems: "center",
            border: "1px solid var(--color-border)",
            borderRadius: "8px",
            padding: "4px 12px",
            backgroundColor: "var(--color-background)",
            gap: "8px",
          }}>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{
                border: "none",
                outline: "none",
                fontSize: "13px",
                color: startDate ? "var(--color-text-primary)" : "var(--color-text-secondary)",
                fontWeight: "500",
                backgroundColor: "transparent",
                cursor: "pointer",
                width: "110px",
                padding: "2px 0",
              }}
            />
            <span style={{ fontSize: "12px", color: "var(--color-text-secondary)" }}>→</span>
            <input
              type="date"
              value={endDate}
              min={startDate || undefined}
              onChange={(e) => setEndDate(e.target.value)}
              style={{
                border: "none",
                outline: "none",
                fontSize: "13px",
                color: endDate ? "var(--color-text-primary)" : "var(--color-text-secondary)",
                fontWeight: "500",
                backgroundColor: "transparent",
                cursor: "pointer",
                width: "110px",
                padding: "2px 0",
              }}
            />
          </div>
        </div>

        {/* View period */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "13px", color: "var(--color-text-secondary)", fontWeight: "500" }}>조회 기준:</span>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            style={{
              border: "1px solid var(--color-border)",
              borderRadius: "8px",
              padding: "6px 32px 6px 12px",
              fontSize: "13px",
              color: "var(--color-text-primary)",
              fontWeight: "500",
              backgroundColor: "var(--color-background)",
              cursor: "pointer",
              outline: "none",
              appearance: "none",
              backgroundImage: `url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%238b96ab%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")`,
              backgroundRepeat: "no-repeat",
              backgroundPosition: "right 10px top 50%",
              backgroundSize: "10px auto",
            }}
          >
            <option value="Month">Month</option>
            <option value="Quarter">Quarter</option>
            <option value="Year">Year</option>
          </select>
        </div>

        {/* Currency */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "13px", color: "var(--color-text-secondary)", fontWeight: "500" }}>통화:</span>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            style={{
              border: "1px solid var(--color-border)",
              borderRadius: "8px",
              padding: "6px 32px 6px 12px",
              fontSize: "13px",
              color: "var(--color-text-primary)",
              fontWeight: "500",
              backgroundColor: "var(--color-background)",
              cursor: "pointer",
              outline: "none",
              appearance: "none",
              backgroundImage: `url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%238b96ab%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")`,
              backgroundRepeat: "no-repeat",
              backgroundPosition: "right 10px top 50%",
              backgroundSize: "10px auto",
            }}
          >
            <option value="USD">USD</option>
            <option value="VND">VND</option>
          </select>
        </div>

        {/* Unit toggle */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginLeft: "auto" }}>
          <span style={{ fontSize: "13px", color: "var(--color-text-secondary)", fontWeight: "500" }}>단위:</span>
          <div style={{
            width: "40px",
            height: "22px",
            backgroundColor: "var(--color-primary-blue)",
            borderRadius: "12px",
            position: "relative",
            cursor: "pointer",
          }}>
            <div style={{
              position: "absolute",
              right: "2px",
              top: "2px",
              width: "18px",
              height: "18px",
              backgroundColor: "#ffffff",
              borderRadius: "50%",
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            }} />
          </div>
          <span style={{ fontSize: "13px", color: "var(--color-text-primary)", fontWeight: "600" }}>K USD</span>
        </div>

        {/* Download button + dropdown */}
        <div ref={downloadRef} style={{ position: "relative" }}>
          <button
            onClick={() => setDownloadOpen((v) => !v)}
            disabled={exporting}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              backgroundColor: "var(--color-primary-blue)",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              padding: "8px 16px",
              fontSize: "13px",
              cursor: exporting ? "wait" : "pointer",
              fontWeight: "600",
              opacity: exporting ? 0.7 : 1,
              boxShadow: "0 2px 6px rgba(74, 127, 212, 0.2)",
            }}
          >
            <Download size={14} />
            {exporting ? "생성 중..." : "다운로드"}
          </button>

          {downloadOpen && (
            <div style={{
              position: "absolute",
              top: "calc(100% + 4px)",
              right: 0,
              backgroundColor: "var(--color-card-bg)",
              border: "1px solid var(--color-border)",
              borderRadius: "8px",
              boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
              zIndex: 1000,
              minWidth: "180px",
              overflow: "hidden",
            }}>
              <button
                onClick={handleExcel}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  width: "100%",
                  padding: "10px 16px",
                  fontSize: "13px",
                  color: "var(--color-text-primary)",
                  backgroundColor: "transparent",
                  border: "none",
                  cursor: "pointer",
                  textAlign: "left",
                  fontWeight: "500",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--color-background)")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
              >
                <FileSpreadsheet size={16} color="var(--color-success-green)" />
                엑셀 다운로드 (.xlsx)
              </button>
              <button
                onClick={handlePdf}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  width: "100%",
                  padding: "10px 16px",
                  fontSize: "13px",
                  color: "var(--color-text-primary)",
                  backgroundColor: "transparent",
                  border: "none",
                  cursor: "pointer",
                  textAlign: "left",
                  fontWeight: "500",
                  borderTop: "1px solid var(--color-border)",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--color-background)")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
              >
                <FileText size={16} color="var(--color-accent-coral)" />
                PDF 다운로드 (.pdf)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
