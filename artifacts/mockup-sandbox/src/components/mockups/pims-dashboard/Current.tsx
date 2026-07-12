import "./_group.css";
import { TopNav } from "./components/TopNav";
import { Sidebar } from "./components/Sidebar";
import { Dashboard } from "./components/Dashboard";

export function Current() {
  return (
    <div
      className="min-h-screen"
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        overflow: "hidden",
        fontFamily: "'Noto Sans KR', 'Inter', sans-serif",
      }}
    >
      <TopNav />
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <Sidebar />
        <Dashboard />
      </div>
    </div>
  );
}
