import React from "react";
import { ChevronUp, Download } from "lucide-react";

export function DashboardHeader() {
  return (
    <div style={{
      background: "linear-gradient(135deg, #1565c0 0%, #1e88e5 40%, #29b6f6 70%, #4fc3f7 100%)",
      padding: "10px 16px 0",
      position: "relative",
      overflow: "hidden",
      flexShrink: 0,
    }}>
      {/* Background building image overlay */}
      <div style={{
        position: "absolute",
        right: 0,
        top: 0,
        bottom: 0,
        width: "50%",
        opacity: 0.25,
        backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 200'%3E%3Crect x='20' y='20' width='60' height='180' fill='%23ffffff' opacity='0.3'/%3E%3Crect x='90' y='40' width='40' height='160' fill='%23ffffff' opacity='0.2'/%3E%3Crect x='140' y='10' width='80' height='190' fill='%23ffffff' opacity='0.4'/%3E%3Crect x='230' y='30' width='50' height='170' fill='%23ffffff' opacity='0.3'/%3E%3Crect x='290' y='50' width='70' height='150' fill='%23ffffff' opacity='0.2'/%3E%3Crect x='370' y='20' width='30' height='180' fill='%23ffffff' opacity='0.3'/%3E%3C/svg%3E\")",
        backgroundSize: "cover",
      }} />

      <div style={{ position: "relative", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <h1 style={{
          color: "#ffffff",
          fontSize: "22px",
          fontWeight: "700",
          margin: "0 0 10px",
        }}>대시보드</h1>
        <button style={{
          backgroundColor: "rgba(255,255,255,0.2)",
          border: "1px solid rgba(255,255,255,0.4)",
          borderRadius: "4px",
          padding: "4px 8px",
          cursor: "pointer",
          color: "#fff",
        }}>
          <ChevronUp size={14} />
        </button>
      </div>

      {/* Filter bar */}
      <div style={{
        backgroundColor: "rgba(255,255,255,0.92)",
        borderRadius: "6px 6px 0 0",
        padding: "8px 12px",
        display: "flex",
        alignItems: "center",
        gap: "10px",
        flexWrap: "wrap",
      }}>
        {/* Project filter */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ fontSize: "12px", color: "#444", fontWeight: "500" }}>프로젝트:</span>
          <select style={{
            border: "1px solid #ccc",
            borderRadius: "4px",
            padding: "3px 20px 3px 8px",
            fontSize: "12px",
            color: "#333",
            backgroundColor: "#fff",
            cursor: "pointer",
          }}>
            <option>All</option>
          </select>
        </div>

        <div style={{ width: "1px", height: "20px", backgroundColor: "#ddd" }} />

        {/* Date filter */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ fontSize: "12px", color: "#444", fontWeight: "500" }}>조회 기간:</span>
          <div style={{
            display: "flex",
            alignItems: "center",
            border: "1px solid #ccc",
            borderRadius: "4px",
            padding: "3px 8px",
            backgroundColor: "#fff",
            gap: "6px",
          }}>
            <span style={{ fontSize: "11px", color: "#888" }}>Start</span>
            <span style={{ fontSize: "11px", color: "#aaa" }}>→</span>
            <span style={{ fontSize: "11px", color: "#888" }}>End</span>
            <span style={{ fontSize: "11px", color: "#aaa" }}>📅</span>
          </div>
        </div>

        <div style={{ width: "1px", height: "20px", backgroundColor: "#ddd" }} />

        {/* View period */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ fontSize: "12px", color: "#444", fontWeight: "500" }}>조회 기준:</span>
          <select style={{
            border: "1px solid #ccc",
            borderRadius: "4px",
            padding: "3px 20px 3px 8px",
            fontSize: "12px",
            color: "#333",
            backgroundColor: "#fff",
            cursor: "pointer",
          }}>
            <option>Month</option>
          </select>
        </div>

        <div style={{ width: "1px", height: "20px", backgroundColor: "#ddd" }} />

        {/* Currency */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ fontSize: "12px", color: "#444", fontWeight: "500" }}>통화:</span>
          <select style={{
            border: "1px solid #ccc",
            borderRadius: "4px",
            padding: "3px 20px 3px 8px",
            fontSize: "12px",
            color: "#333",
            backgroundColor: "#fff",
            cursor: "pointer",
          }}>
            <option>USD</option>
          </select>
        </div>

        <div style={{ width: "1px", height: "20px", backgroundColor: "#ddd" }} />

        {/* Unit toggle */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ fontSize: "12px", color: "#444", fontWeight: "500" }}>단위:</span>
          <div style={{
            display: "flex",
            alignItems: "center",
            backgroundColor: "#1e6fdd",
            borderRadius: "12px",
            padding: "2px",
            gap: "2px",
          }}>
            <div style={{
              backgroundColor: "#fff",
              borderRadius: "10px",
              padding: "2px 8px",
              fontSize: "10px",
              fontWeight: "600",
              color: "#1e6fdd",
            }}>1K</div>
            <div style={{
              padding: "2px 8px",
              fontSize: "10px",
              color: "#fff",
            }}>USD</div>
          </div>
        </div>

        {/* Download button */}
        <div style={{ marginLeft: "auto" }}>
          <button style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            backgroundColor: "#1e6fdd",
            color: "#fff",
            border: "none",
            borderRadius: "4px",
            padding: "5px 12px",
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
    </div>
  );
}
