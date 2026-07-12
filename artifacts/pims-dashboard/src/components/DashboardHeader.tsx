import React from "react";
import { ChevronsUp, Download } from "lucide-react";

export function DashboardHeader() {
  return (
    <div style={{
      background: "linear-gradient(120deg, #dce9f5 0%, #e8f1f9 25%, #c9dcee 50%, #b3cde3 75%, #9dbdd8 100%)",
      padding: "14px 16px 14px",
      position: "relative",
      overflow: "hidden",
      flexShrink: 0,
      borderBottom: "1px solid #c5d5e5",
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
        padding: "12px 16px",
        display: "flex",
        alignItems: "center",
        gap: "14px",
        flexWrap: "wrap",
      }}>
        {/* Project filter */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "12px", color: "#333", fontWeight: "600" }}>프로젝트:</span>
          <select style={{
            border: "1px solid #ccd4dd",
            borderRadius: "6px",
            padding: "5px 26px 5px 10px",
            fontSize: "12px",
            color: "#333",
            backgroundColor: "#fff",
            cursor: "pointer",
            minWidth: "90px",
          }}>
            <option>All</option>
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
            padding: "5px 10px",
            backgroundColor: "#fff",
            gap: "8px",
          }}>
            <span style={{ fontSize: "12px", color: "#aab2bc" }}>Start</span>
            <span style={{ fontSize: "12px", color: "#aab2bc" }}>→</span>
            <span style={{ fontSize: "12px", color: "#aab2bc" }}>End</span>
            <span style={{ fontSize: "12px", color: "#aab2bc" }}>📅</span>
          </div>
        </div>

        {/* View period */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "12px", color: "#333", fontWeight: "600" }}>조회 기준:</span>
          <select style={{
            border: "1px solid #ccd4dd",
            borderRadius: "6px",
            padding: "5px 26px 5px 10px",
            fontSize: "12px",
            color: "#333",
            backgroundColor: "#fff",
            cursor: "pointer",
          }}>
            <option>Month</option>
          </select>
        </div>

        {/* Currency */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "12px", color: "#333", fontWeight: "600" }}>통화:</span>
          <select style={{
            border: "1px solid #ccd4dd",
            borderRadius: "6px",
            padding: "5px 26px 5px 10px",
            fontSize: "12px",
            color: "#333",
            backgroundColor: "#fff",
            cursor: "pointer",
          }}>
            <option>USD</option>
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

        {/* Download button */}
        <button style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          backgroundColor: "#2e4568",
          color: "#fff",
          border: "none",
          borderRadius: "6px",
          padding: "7px 14px",
          fontSize: "12px",
          cursor: "pointer",
          fontWeight: "500",
        }}>
          <Download size={13} />
          다운로드
          <span style={{ fontSize: "10px", opacity: 0.8 }}>▼</span>
        </button>
      </div>
    </div>
  );
}
