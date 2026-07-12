import React from "react";

const NAV_TABS = [
  { label: "Standard", active: true },
  { label: "Dashboard" },
  { label: "Common" },
  { label: "Contracting" },
  { label: "Budget" },
  { label: "Sub-Contracting" },
  { label: "Material" },
  { label: "Expense" },
  { label: "Cost" },
  { label: "System" },
];

export function TopNav() {
  return (
    <div style={{
      backgroundColor: "#0e2a47",
      display: "flex",
      alignItems: "center",
      height: "40px",
      padding: "0 8px",
      flexShrink: 0,
      borderBottom: "1px solid #0a1f35",
    }}>
      {/* Logo */}
      <div style={{
        display: "flex",
        alignItems: "center",
        padding: "0 10px",
        minWidth: "170px",
        borderRight: "1px solid #1a3a5c",
        height: "100%",
      }}>
        <img
          src="/daewoo-logo.png"
          alt="DAEWOO E&C VINA"
          style={{ height: "22px", objectFit: "contain" }}
        />
      </div>

      {/* Nav Tabs */}
      <div style={{ display: "flex", alignItems: "center", flex: 1, height: "100%" }}>
        {NAV_TABS.map((tab) => (
          <button
            key={tab.label}
            style={{
              height: "100%",
              padding: "0 14px",
              backgroundColor: tab.active ? "#1e6fdd" : "transparent",
              color: tab.active ? "#ffffff" : "#a8c4e0",
              border: "none",
              cursor: "pointer",
              fontSize: "12px",
              fontWeight: tab.active ? "600" : "400",
              borderRight: "1px solid #1a3a5c",
              whiteSpace: "nowrap",
            }}
          >
            {tab.label}
          </button>
        ))}
        <button style={{
          height: "100%",
          padding: "0 14px",
          backgroundColor: "transparent",
          color: "#a8c4e0",
          border: "none",
          cursor: "pointer",
          fontSize: "12px",
          marginLeft: "auto",
        }}>
          More
        </button>
      </div>
    </div>
  );
}
