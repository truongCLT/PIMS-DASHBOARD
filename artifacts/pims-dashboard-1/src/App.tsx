import { useState } from "react";
import { Sidebar, type DashboardScope } from "./components/Sidebar";
import { Dashboard } from "./components/Dashboard";
import { ProjectDashboard } from "./components/ProjectDashboard";
import { ServiceProjectDashboard } from "./components/ServiceProjectDashboard";
import { AdminLoginScreen } from "./components/AdminLoginScreen";
import { AdminAuthProvider } from "./lib/adminAuth";
import { resolveProjectBusinessType } from "./data/projects";
import { ThemeProvider } from "./lib/theme";
import { useListMgmtreportProjects } from "@workspace/api-client-react";
import { useGetMgmtreportSettings } from "@workspace/api-client-react/generated/api";
import { REPORT_YEAR } from "./lib/mgmtreportData";
import { setServerClosedYearMonth } from "./lib/monthRange";

/* ── App ─────────────────────────────────────────────────────────── */
function AppInner() {
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [selectedScope, setSelectedScope] = useState<DashboardScope>("전체");
  const [adminLoginOpen, setAdminLoginOpen] = useState(false);
  const projectsQuery = useListMgmtreportProjects({ year: REPORT_YEAR });
  // 실적 마감월(업로드 파일 기준 포함)을 자식 컴포넌트가 그리기 전에 전역 마감 규칙에 반영한다.
  // lastClosedMonth()/getActualThroughMonth() 등은 렌더 중에 동기 호출되므로, settings를 받기 전에
  // 화면을 그리면 날짜 규칙 값으로 계산된 결과가 memo에 남을 수 있어 첫 로딩만 잠깐 기다린다.
  const settingsQuery = useGetMgmtreportSettings();
  const s = settingsQuery.data;
  setServerClosedYearMonth(s?.closedYear != null && s?.closedMonth != null ? { year: s.closedYear, month: s.closedMonth } : null);
  const selectedProjectData = projectsQuery.data?.projects.find((project) => project.name === selectedProject);
  const division = selectedProject
    ? resolveProjectBusinessType(selectedProject, selectedProjectData?.businessType)
    : null;

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
        {settingsQuery.isLoading ? (
          <div style={{ flex: 1 }} />
        ) : adminLoginOpen ? (
          <AdminLoginScreen onDone={() => setAdminLoginOpen(false)} />
        ) : selectedProject ? (
          division === "용역" ? (
            <ServiceProjectDashboard projectName={selectedProject} onRenamed={setSelectedProject} />
          ) : (
            <ProjectDashboard projectName={selectedProject} onRenamed={setSelectedProject} />
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
