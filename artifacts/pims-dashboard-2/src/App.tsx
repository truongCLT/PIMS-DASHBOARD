import { useState } from "react";
import { TopNav } from "./components/TopNav";
import { Sidebar } from "./components/Sidebar";
import { Dashboard } from "./components/Dashboard";
import { ProjectDashboard } from "./components/ProjectDashboard";
import { ServiceProjectDashboard } from "./components/ServiceProjectDashboard";
import { getProjectDivision } from "./data/projects";

function App() {
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const division = selectedProject ? getProjectDivision(selectedProject) : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden", fontFamily: "'Noto Sans KR', 'Inter', sans-serif" }}>
      <TopNav />
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <Sidebar
          selectedProject={selectedProject}
          onSelectProject={setSelectedProject}
          onSelectTotal={() => setSelectedProject(null)}
        />
        {selectedProject ? (
          division === "용역" ? (
            <ServiceProjectDashboard projectName={selectedProject} />
          ) : (
            <ProjectDashboard projectName={selectedProject} />
          )
        ) : (
          <Dashboard />
        )}
      </div>
    </div>
  );
}

export default App;
