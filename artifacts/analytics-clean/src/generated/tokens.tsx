/* GENERATED FROM tokens.json -- DO NOT EDIT. Run scripts/build-tokens.mjs. */
// Portable design tokens (colors as hex). Web consumes the theme via
// src/index.css; mobile (Expo) and any other platform import this object so the
// whole product shares one source of truth.
export const tokens = {
  "color": {
    "light": {
      "background": "#f2f5fa",
      "foreground": "#1e2a3b",
      "border": "#dde3ee",
      "card": "#ffffff",
      "cardForeground": "#1e2a3b",
      "popover": "#ffffff",
      "popoverForeground": "#1e2a3b",
      "primary": "#4472ca",
      "primaryForeground": "#ffffff",
      "secondary": "#5b9bd5",
      "secondaryForeground": "#ffffff",
      "muted": "#e9eef6",
      "mutedForeground": "#6b7d96",
      "accent": "#e4ecf9",
      "accentForeground": "#1e2a3b",
      "destructive": "#e57373",
      "destructiveForeground": "#ffffff",
      "input": "#dde3ee",
      "ring": "#4472ca",
      "chart1": "#4472ca",
      "chart2": "#5b9bd5",
      "chart3": "#e67e22",
      "chart4": "#0891b2",
      "chart5": "#059669",
      "sidebar": "#1e2a3b",
      "sidebarForeground": "#8fa8c2",
      "sidebarBorder": "#2c3b52",
      "sidebarPrimary": "#4472ca",
      "sidebarPrimaryForeground": "#ffffff",
      "sidebarAccent": "#28374d",
      "sidebarAccentForeground": "#ffffff",
      "sidebarRing": "#4472ca"
    },
    "dark": {
      "background": "#141c29",
      "foreground": "#e7edf6",
      "border": "#2c3b52",
      "card": "#1e2a3b",
      "cardForeground": "#e7edf6",
      "popover": "#1e2a3b",
      "popoverForeground": "#e7edf6",
      "primary": "#6b93e0",
      "primaryForeground": "#0f1826",
      "secondary": "#5b9bd5",
      "secondaryForeground": "#0f1826",
      "muted": "#26334a",
      "mutedForeground": "#9ab0c8",
      "accent": "#26334a",
      "accentForeground": "#e7edf6",
      "destructive": "#e57373",
      "destructiveForeground": "#0f1826",
      "input": "#2c3b52",
      "ring": "#6b93e0",
      "chart1": "#6b93e0",
      "chart2": "#7ab4e8",
      "chart3": "#eb984e",
      "chart4": "#22b8d4",
      "chart5": "#10b981",
      "sidebar": "#0f1826",
      "sidebarForeground": "#8fa8c2",
      "sidebarBorder": "#26334a",
      "sidebarPrimary": "#6b93e0",
      "sidebarPrimaryForeground": "#0f1826",
      "sidebarAccent": "#1e2a3b",
      "sidebarAccentForeground": "#e7edf6",
      "sidebarRing": "#6b93e0"
    }
  },
  "fontFamily": {
    "sans": [
      "Noto Sans KR",
      "Inter",
      "sans-serif"
    ],
    "serif": [
      "Georgia",
      "serif"
    ],
    "mono": [
      "Menlo",
      "monospace"
    ]
  },
  "radius": "0.5rem",
  "spacing": "0.25rem"
} as const;

export type Tokens = typeof tokens;
export default tokens;
