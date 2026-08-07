import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Sidebar, type DashboardScope } from "./components/Sidebar";
import { Dashboard } from "./components/Dashboard";
import { ProjectDashboard } from "./components/ProjectDashboard";
import { ServiceProjectDashboard } from "./components/ServiceProjectDashboard";
import { AdminLoginScreen } from "./components/AdminLoginScreen";
import { AdminAuthProvider } from "./lib/adminAuth";
import { useProjectBusinessType } from "./lib/mgmtreportData";
import { ThemeProvider, THEMES, useTheme } from "./lib/theme";

/* ── Floating theme switcher ─────────────────────────────────────── */
function ThemeSwitcher() {
  const { t } = useTranslation(["app", "common"]);
  const { theme, setThemeId } = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <div style={{
      position: "fixed",
      bottom: "20px",
      right: "20px",
      zIndex: 9999,
      display: "flex",
      flexDirection: "column",
      alignItems: "flex-end",
      gap: "8px",
    }}>
      {/* Theme list (expands upward) */}
      {open && (
        <div style={{
          backgroundColor: "#ffffff",
          border: "1px solid #e2e9f3",
          borderRadius: "12px",
          padding: "10px 12px",
          boxShadow: "0 8px 24px rgba(0,0,0,0.16)",
          display: "flex",
          flexDirection: "column",
          gap: "6px",
          minWidth: "180px",
        }}>
          <div style={{ fontSize: "11px", fontWeight: "700", color: "#888", marginBottom: "2px", letterSpacing: "0.04em" }}>
            {t("app:selectDesignTheme")}
          </div>
          {THEMES.map((t) => (
            <button
              key={t.id}
              onClick={() => { setThemeId(t.id); setOpen(false); }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "7px 10px",
                border: t.id === theme.id ? `2px solid ${t.swatch}` : "2px solid transparent",
                borderRadius: "8px",
                backgroundColor: t.id === theme.id ? `${t.swatch}14` : "transparent",
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <div style={{
                width: "18px",
                height: "18px",
                borderRadius: "50%",
                backgroundColor: t.swatch,
                flexShrink: 0,
                boxShadow: `0 0 0 2px ${t.id === theme.id ? t.swatch + "40" : "transparent"}`,
              }} />
              <span style={{
                fontSize: "12px",
                fontWeight: t.id === theme.id ? "700" : "500",
                color: "#333",
              }}>{t.label}</span>
              {t.id === theme.id && (
                <span style={{ marginLeft: "auto", fontSize: "12px", color: t.swatch }}>✓</span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Toggle button */}
      <button
        onClick={() => setOpen(!open)}
        title={t("app:changeTheme")}
        style={{
          width: "44px",
          height: "44px",
          borderRadius: "50%",
          backgroundColor: theme.swatch,
          border: "3px solid #ffffff",
          boxShadow: "0 4px 12px rgba(0,0,0,0.20)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "18px",
          transition: "transform 0.15s",
        }}
      >
        🎨
      </button>
    </div>
  );
}

/* ── App ─────────────────────────────────────────────────────────── */
function AppInner() {
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [selectedScope, setSelectedScope] = useState<DashboardScope>("전체");
  const [adminLoginOpen, setAdminLoginOpen] = useState(false);
  const division = useProjectBusinessType(selectedProject);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden", fontFamily: "'Noto Sans KR', 'Inter', sans-serif" }}>
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <Sidebar
          selectedProject={selectedProject}
          selectedScope={selectedScope}
          onSelectProject={(name) => { setSelectedProject(name); setAdminLoginOpen(false); }}
          onSelectScope={(scope) => { setSelectedScope(scope); setSelectedProject(null); setAdminLoginOpen(false); }}
          onSelectTotal={() => { setSelectedProject(null); setSelectedScope("전체"); setAdminLoginOpen(false); }}
          onLogoClick={() => setAdminLoginOpen(true)}
        />
        {adminLoginOpen ? (
          <AdminLoginScreen onDone={() => setAdminLoginOpen(false)} />
        ) : selectedProject ? (
          division === "용역" ? (
            <ServiceProjectDashboard projectName={selectedProject} />
          ) : (
            <ProjectDashboard projectName={selectedProject} />
          )
        ) : (
          <Dashboard
            scope={selectedScope}
            onSelectProject={(name) => { setSelectedProject(name); setAdminLoginOpen(false); }}
          />
        )}
      </div>
      <ThemeSwitcher />
    </div>
  );
}

function App() {
  return (
    <AdminAuthProvider>
      <ThemeProvider>
        <AppInner />
      </ThemeProvider>
    </AdminAuthProvider>
  );
}

export default App;
