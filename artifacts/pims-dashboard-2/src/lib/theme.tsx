import React, { createContext, useContext, useState } from "react";

export interface Theme {
  id: string;
  label: string;
  swatch: string; // color shown in theme picker
  sidebar: {
    bg: string;
    border: string;
    topLevelColor: string;
    midLevelColor: string;
    subLevelColor: string;
    activeItemBg: string;
    activeItemColor: string;
    activeItemAccent: string; // left-border accent
    totalActiveBg: string;
    totalBorderBottom: string;
    brandingBorderTop: string;
  };
  dashboard: {
    bg: string;
  };
  kpi: {
    cardBg: string;
    cardBorderTop: string | null; // null = no special top border
    cardBorder: string;
    titleColor: string;
    labelColor: string;
    valueColor: string;
    accentBorderLeft: string | null; // per-card colored left border (theme B uses this)
    boxShadow: string;
  };
}

export const THEMES: Theme[] = [
  /* ── Current ────────────────────────────────── */
  {
    id: "current",
    label: "현재 (Current)",
    swatch: "#2e4568",
    sidebar: {
      bg: "#ffffff",
      border: "1px solid #d5dce6",
      topLevelColor: "#1a2d4d",
      midLevelColor: "#2a3d55",
      subLevelColor: "#44546a",
      activeItemBg: "#dbe6f5",
      activeItemColor: "#1a2d4d",
      activeItemAccent: "transparent",
      totalActiveBg: "#e8ecf5",
      totalBorderBottom: "1px solid #eef1f5",
      brandingBorderTop: "1px solid #e5eaf0",
    },
    dashboard: { bg: "#e8edf3" },
    kpi: {
      cardBg: "#33415f",
      cardBorderTop: null,
      cardBorder: "none",
      titleColor: "#ffffff",
      labelColor: "#9fb0cc",
      valueColor: "#ffffff",
      accentBorderLeft: null,
      boxShadow: "0 1px 4px rgba(20,35,70,0.15)",
    },
  },

  /* ── A: Dark Navy Command ────────────────────── */
  {
    id: "dark-navy",
    label: "A — Dark Navy",
    swatch: "#00c9b1",
    sidebar: {
      bg: "#080f1c",
      border: "1px solid #1d3050",
      topLevelColor: "#e2eaf4",
      midLevelColor: "#9ab5d0",
      subLevelColor: "#5a7898",
      activeItemBg: "#1a3050",
      activeItemColor: "#00c9b1",
      activeItemAccent: "#00c9b1",
      totalActiveBg: "rgba(0,201,177,0.12)",
      totalBorderBottom: "1px solid #1d3050",
      brandingBorderTop: "1px solid #1d3050",
    },
    dashboard: { bg: "#0b1624" },
    kpi: {
      cardBg: "#152236",
      cardBorderTop: "2px solid #00c9b1",
      cardBorder: "1px solid #1d3050",
      titleColor: "#e2eaf4",
      labelColor: "#5a7898",
      valueColor: "#e2eaf4",
      accentBorderLeft: null,
      boxShadow: "none",
    },
  },

  /* ── B: Clean White Minimal ──────────────────── */
  {
    id: "white-minimal",
    label: "B — Clean White",
    swatch: "#2563eb",
    sidebar: {
      bg: "#ffffff",
      border: "1px solid #e2e8f0",
      topLevelColor: "#1e293b",
      midLevelColor: "#334155",
      subLevelColor: "#64748b",
      activeItemBg: "#eff6ff",
      activeItemColor: "#2563eb",
      activeItemAccent: "#2563eb",
      totalActiveBg: "#eff6ff",
      totalBorderBottom: "1px solid #e2e8f0",
      brandingBorderTop: "1px solid #e2e8f0",
    },
    dashboard: { bg: "#f4f6fa" },
    kpi: {
      cardBg: "#ffffff",
      cardBorderTop: null,
      cardBorder: "1px solid #e2e8f0",
      titleColor: "#64748b",
      labelColor: "#94a3b8",
      valueColor: "#1e293b",
      accentBorderLeft: "#2563eb", // each card gets this left border; achievement color varies per card
      boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
    },
  },

  /* ── C: Warm Earth Tones ─────────────────────── */
  {
    id: "warm-earth",
    label: "C — Warm Earth",
    swatch: "#c67c3a",
    sidebar: {
      bg: "#3d2b1f",
      border: "none",
      topLevelColor: "#f0e0cc",
      midLevelColor: "#d4b898",
      subLevelColor: "#b89070",
      activeItemBg: "rgba(198,124,58,0.25)",
      activeItemColor: "#c67c3a",
      activeItemAccent: "#c67c3a",
      totalActiveBg: "rgba(198,124,58,0.18)",
      totalBorderBottom: "1px solid rgba(255,255,255,0.08)",
      brandingBorderTop: "1px solid rgba(255,255,255,0.08)",
    },
    dashboard: { bg: "#f2ece3" },
    kpi: {
      cardBg: "#faf6f0",
      cardBorderTop: "2px solid #c67c3a",
      cardBorder: "1px solid #d9c9b4",
      titleColor: "#2c1a0e",
      labelColor: "#8b6f52",
      valueColor: "#2c1a0e",
      accentBorderLeft: null,
      boxShadow: "0 2px 6px rgba(100,60,20,0.08)",
    },
  },

  /* ── D: Slate Gradient Modern ────────────────── */
  {
    id: "slate-modern",
    label: "D — Slate Modern",
    swatch: "#06b6d4",
    sidebar: {
      bg: "#1e2d3d",
      border: "none",
      topLevelColor: "#e2ecf6",
      midLevelColor: "#b0cce6",
      subLevelColor: "#7090b0",
      activeItemBg: "rgba(6,182,212,0.15)",
      activeItemColor: "#06b6d4",
      activeItemAccent: "#06b6d4",
      totalActiveBg: "rgba(6,182,212,0.12)",
      totalBorderBottom: "1px solid rgba(255,255,255,0.06)",
      brandingBorderTop: "1px solid rgba(255,255,255,0.06)",
    },
    dashboard: { bg: "#eef2f8" },
    kpi: {
      cardBg: "#ffffff",
      cardBorderTop: null,
      cardBorder: "1px solid #dce4ef",
      titleColor: "#64748b",
      labelColor: "#94a3b8",
      valueColor: "#0f172a",
      accentBorderLeft: "#06b6d4",
      boxShadow: "0 2px 8px rgba(15,23,42,0.06)",
    },
  },
];

interface ThemeContextValue {
  theme: Theme;
  setThemeId: (id: string) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: THEMES[0],
  setThemeId: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const stored = typeof localStorage !== "undefined" ? localStorage.getItem("pims-theme") : null;
  const initial = THEMES.find((t) => t.id === stored) ?? THEMES[0];
  const [theme, setTheme] = useState<Theme>(initial);

  const setThemeId = (id: string) => {
    const t = THEMES.find((th) => th.id === id);
    if (t) {
      setTheme(t);
      localStorage.setItem("pims-theme", id);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, setThemeId }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
