import { useState } from "react";
import { TopNav } from "./components/TopNav";
import { Sidebar, type DashboardScope } from "./components/Sidebar";
import { Dashboard } from "./components/Dashboard";
import { ProjectDashboard } from "./components/ProjectDashboard";
import { ServiceProjectDashboard } from "./components/ServiceProjectDashboard";
import { getProjectDivision } from "./data/projects";

function App() {
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [selectedScope, setSelectedScope] = useState<DashboardScope>("전체");
  const division = selectedProject ? getProjectDivision(selectedProject) : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden", fontFamily: "'Noto Sans KR', 'Inter', sans-serif" }}>
      <TopNav />
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <Sidebar
          selectedProject={selectedProject}
          selectedScope={selectedScope}
          onSelectProject={setSelectedProject}
          onSelectScope={(scope) => {
            setSelectedScope(scope);
            setSelectedProject(null);
          }}
          onSelectTotal={() => {
            setSelectedProject(null);
            setSelectedScope("전체");
          }}
        />
        {selectedProject ? (
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
  );
}

export default App;
