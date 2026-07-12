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
      backgroundColor: "var(--color-primary-navy)",
      display: "flex",
      alignItems: "center",
      height: "56px",
      flexShrink: 0,
      boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
      zIndex: 1000,
    }}>
      {/* Logo */}
      <div style={{
        display: "flex",
        alignItems: "center",
        padding: "0 24px",
        minWidth: "170px",
        height: "100%",
      }}>
        <img
          src={daewooLogo}
          alt="DAEWOO E&C VINA"
          style={{ height: "24px", objectFit: "contain" }}
        />
      </div>

      {/* Nav Tabs */}
      <div style={{ display: "flex", alignItems: "center", flex: 1, height: "100%", gap: "8px", padding: "0 16px" }}>
        {NAV_TABS.map((tab) => (
          <button
            key={tab.label}
            style={{
              position: "relative",
              height: "100%",
              padding: "0 16px",
              backgroundColor: "transparent",
              border: "none",
              cursor: "pointer",
              fontSize: "13px",
              whiteSpace: "nowrap",
              display: "flex",
              alignItems: "center",
            }}
          >
            {tab.active ? (
              <>
                <span style={{
                  backgroundColor: "rgba(255,255,255,0.1)",
                  color: "#ffffff",
                  fontWeight: "600",
                  padding: "6px 14px",
                  borderRadius: "20px",
                }}>
                  {tab.label}
                </span>
                <span style={{
                  position: "absolute",
                  left: "50%",
                  transform: "translateX(-50%)",
                  bottom: "0",
                  height: "3px",
                  width: "24px",
                  backgroundColor: "var(--color-primary-blue)",
                  borderRadius: "2px 2px 0 0",
                }} />
              </>
            ) : (
              <span style={{ 
                color: "rgba(255,255,255,0.7)", 
                fontWeight: "500",
                transition: "color 0.2s",
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = "#ffffff"}
              onMouseLeave={(e) => e.currentTarget.style.color = "rgba(255,255,255,0.7)"}
              >
                {tab.label}
              </span>
            )}
          </button>
        ))}
        <button style={{
          height: "100%",
          padding: "0 16px",
          backgroundColor: "transparent",
          color: "rgba(255,255,255,0.7)",
          border: "none",
          cursor: "pointer",
          fontSize: "13px",
          marginLeft: "auto",
          fontWeight: "500",
          transition: "color 0.2s",
        }}
        onMouseEnter={(e) => e.currentTarget.style.color = "#ffffff"}
        onMouseLeave={(e) => e.currentTarget.style.color = "rgba(255,255,255,0.7)"}
        >
          More
        </button>
      </div>
    </div>
  );
}
