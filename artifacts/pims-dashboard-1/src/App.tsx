import { useState } from "react";
import { Sidebar, type DashboardScope } from "./components/Sidebar";
import { Dashboard } from "./components/Dashboard";
import { ProjectDashboard } from "./components/ProjectDashboard";
import { ServiceProjectDashboard } from "./components/ServiceProjectDashboard";
import { AdminLoginScreen } from "./components/AdminLoginScreen";
import { AdminAuthProvider } from "./lib/adminAuth";
import { getProjectDivision } from "./data/projects";
import { ThemeProvider } from "./lib/theme";

/* ── App ─────────────────────────────────────────────────────────── */
function AppInner() {
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [selectedScope, setSelectedScope] = useState<DashboardScope>("전체");
  const [adminLoginOpen, setAdminLoginOpen] = useState(false);
  const division = selectedProject ? getProjectDivision(selectedProject) : null;

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
