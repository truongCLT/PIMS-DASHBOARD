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

  const handleExcel = () => {
    setDownloadOpen(false);
    exportDashboardExcel();
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
      background: "linear-gradient(120deg, #dce9f5 0%, #e8f1f9 25%, #c9dcee 50%, #b3cde3 75%, #9dbdd8 100%)",
      padding: "14px 16px 14px",
      position: "relative",
      overflow: "hidden",
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
        backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 600 200'%3E%3Cg stroke='%23ffffff' stroke-width='2' opacity='0.6'%3E%3Cline x1='100' y1='0' x2='300' y2='200'/%3E%3Cline x1='150' y1='0' x2='350' y2='200'/%3E%3Cline x1='200' y1='0' x2='400' y2='200'/%3E%3Cline x1='250' y1='0' x2='450' y2='200'/%3E%3Cline x1='300' y1='0' x2='500' y2='200'/%3E%3Cline x1='350' y1='0' x2='550' y2='200'/%3E%3Cline x1='400' y1='0' x2='600' y2='200'/%3E%3C/g%3E%3Cg stroke='%237da7cc' stroke-width='1' opacity='0.5'%3E%3Cline x1='0' y1='50' x2='600' y2='20'/%3E%3Cline x1='0' y1='100' x2='600' y2='70'/%3E%3Cline x1='0' y1='150' x2='600' y2='120'/%3E%3C/g%3E%3C/svg%3E\")",
        backgroundSize: "cover",
      }} />

      <div style={{ position: "relative", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <h1 style={{
          color: "#2e4568",
          fontSize: "22px",
          fontWeight: "700",
          margin: "0 0 12px",
        }}>대시보드</h1>
        <button style={{
          backgroundColor: "#ffffff",
          border: "1px solid #d5dfe9",
          borderRadius: "8px",
          padding: "6px 8px",
          cursor: "pointer",
          color: "#1e6fdd",
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
          <span style={{ fontSize: "12px", color: "#333", fontWeight: "600" }}>프로젝트:</span>
          <select
            value={project}
            onChange={(e) => setProject(e.target.value)}
            style={{
              border: "1px solid #ccd4dd",
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
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "12px", color: "#333", fontWeight: "600" }}>조회 기간:</span>
          <div style={{
            display: "flex",
            alignItems: "center",
            border: "1px solid #ccd4dd",
            borderRadius: "6px",
            padding: "2px 8px",
            backgroundColor: "#fff",
            gap: "6px",
          }}>
            <input
              type="date"
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
              type="date"
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
          <span style={{ fontSize: "12px", color: "#333", fontWeight: "600" }}>조회 기준:</span>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            style={{
              border: "1px solid #ccd4dd",
              borderRadius: "6px",
              padding: "5px 26px 5px 10px",
              fontSize: "12px",
              color: "#333",
              backgroundColor: "#fff",
              cursor: "pointer",
            }}
          >
            <option value="Month">Month</option>
            <option value="Quarter">Quarter</option>
            <option value="Year">Year</option>
          </select>
        </div>

        {/* Currency */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "12px", color: "#333", fontWeight: "600" }}>통화:</span>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            style={{
              border: "1px solid #ccd4dd",
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
          </select>
        </div>

        {/* Unit toggle */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginLeft: "auto" }}>
          <span style={{ fontSize: "12px", color: "#333", fontWeight: "600" }}>단위:</span>
          <div style={{
            width: "36px",
            height: "20px",
            backgroundColor: "#5b5fc7",
            borderRadius: "10px",
            position: "relative",
            cursor: "pointer",
          }}>
            <div style={{
              position: "absolute",
              right: "2px",
              top: "2px",
              width: "16px",
              height: "16px",
              backgroundColor: "#ffffff",
              borderRadius: "50%",
              boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
            }} />
          </div>
          <span style={{ fontSize: "12px", color: "#333", fontWeight: "600" }}>1K USD</span>
        </div>

        {/* Download button + dropdown */}
        <div ref={downloadRef} style={{ position: "relative" }}>
          <button
            onClick={() => setDownloadOpen((v) => !v)}
            disabled={exporting}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              backgroundColor: "#2e4568",
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
            {exporting ? "생성 중..." : "다운로드"}
            <span style={{ fontSize: "10px", opacity: 0.8 }}>▼</span>
          </button>

          {downloadOpen && (
            <div style={{
              position: "absolute",
              top: "calc(100% + 4px)",
              right: 0,
              backgroundColor: "#fff",
              border: "1px solid #ccd4dd",
              borderRadius: "6px",
              boxShadow: "0 4px 12px rgba(20,40,80,0.15)",
              zIndex: 50,
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
                  color: "#1a2d4d",
                  backgroundColor: "transparent",
                  border: "none",
                  cursor: "pointer",
                  textAlign: "left",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#eef3f9")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
              >
                <FileSpreadsheet size={14} color="#1e7145" />
                엑셀 다운로드 (.xlsx)
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
                  color: "#1a2d4d",
                  backgroundColor: "transparent",
                  border: "none",
                  cursor: "pointer",
                  textAlign: "left",
                  borderTop: "1px solid #eef1f5",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#eef3f9")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
              >
                <FileText size={14} color="#c0392b" />
                PDF 다운로드 (.pdf)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
