import { useState } from "react";
import { TopNav } from "./components/TopNav";
import { Sidebar, type DashboardScope } from "./components/Sidebar";
import { Dashboard } from "./components/Dashboard";
import { ProjectDashboard } from "./components/ProjectDashboard";
import { ServiceProjectDashboard } from "./components/ServiceProjectDashboard";
import { AdminLoginScreen } from "./components/AdminLoginScreen";
import { AdminAuthProvider } from "./lib/adminAuth";
import { getProjectDivision } from "./data/projects";

function App() {
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [selectedScope, setSelectedScope] = useState<DashboardScope>("전체");
  const [adminLoginOpen, setAdminLoginOpen] = useState(false);
  const division = selectedProject ? getProjectDivision(selectedProject) : null;

  return (
    <AdminAuthProvider>
      <div style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden", fontFamily: "'Noto Sans KR', 'Inter', sans-serif" }}>
        <TopNav />
        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
          <Sidebar
            selectedProject={selectedProject}
            selectedScope={selectedScope}
            onSelectProject={(name) => {
              setSelectedProject(name);
              setAdminLoginOpen(false);
            }}
            onSelectScope={(scope) => {
              setSelectedScope(scope);
              setSelectedProject(null);
              setAdminLoginOpen(false);
            }}
            onSelectTotal={() => {
              setSelectedProject(null);
              setSelectedScope("전체");
              setAdminLoginOpen(false);
            }}
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
            <Dashboard scope={selectedScope} />
          )}
        </div>
      </div>
    </AdminAuthProvider>
  );
}

export default App;
