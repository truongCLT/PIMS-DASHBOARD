import React from "react";
import daewooLogo from "../assets/daewoo-logo.png";

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
      backgroundColor: "var(--color-navy-dark)",
      display: "flex",
      alignItems: "center",
      height: "44px",
      flexShrink: 0,
    }}>
      {/* Logo */}
      <div style={{
        display: "flex",
        alignItems: "center",
        padding: "0 14px",
        minWidth: "170px",
        height: "100%",
        backgroundColor: "var(--color-navy-dark)",
      }}>
        <img
          src={daewooLogo}
          alt="DAEWOO E&C VINA"
          style={{ height: "24px", objectFit: "contain" }}
        />
      </div>

      {/* Nav Tabs */}
      <div style={{ display: "flex", alignItems: "center", flex: 1, height: "100%", gap: "2px", padding: "0 8px" }}>
        {NAV_TABS.map((tab) => (
          <button
            key={tab.label}
            style={{
              position: "relative",
              height: "100%",
              padding: "0 14px",
              backgroundColor: "transparent",
              border: "none",
              cursor: "pointer",
              fontSize: "12px",
              whiteSpace: "nowrap",
              display: "flex",
              alignItems: "center",
            }}
          >
            {tab.active ? (
              <>
                <span style={{
                  backgroundColor: "var(--color-primary-blue)",
                  color: "#ffffff",
                  fontWeight: "600",
                  padding: "5px 12px",
                  borderRadius: "8px",
                }}>
                  {tab.label}
                </span>
                <span style={{
                  position: "absolute",
                  left: "8px",
                  right: "8px",
                  bottom: "0",
                  height: "3px",
                  backgroundColor: "var(--color-sky-light)",
                  borderRadius: "2px 2px 0 0",
                }} />
              </>
            ) : (
              <span style={{ color: "var(--color-sidebar-text)", fontWeight: "400" }}>{tab.label}</span>
            )}
          </button>
        ))}
        <button style={{
          height: "100%",
          padding: "0 14px",
          backgroundColor: "transparent",
          color: "var(--color-sidebar-text)",
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
