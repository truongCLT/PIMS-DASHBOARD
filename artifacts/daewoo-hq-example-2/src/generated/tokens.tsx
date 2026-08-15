/* GENERATED FROM tokens.json -- DO NOT EDIT. Run scripts/build-tokens.mjs. */
// Portable design tokens (colors as hex). Web consumes the theme via
// src/index.css; mobile (Expo) and any other platform import this object so the
// whole product shares one source of truth.
export const tokens = {
  "color": {
    "light": {
      "background": "#f5f7fb",
      "foreground": "#1a2d4d",
      "border": "#e2e8f0",
      "card": "#ffffff",
      "cardForeground": "#1a2d4d",
      "popover": "#ffffff",
      "popoverForeground": "#1a2d4d",
      "primary": "#2e5bdb",
      "primaryForeground": "#ffffff",
      "secondary": "#152449",
      "secondaryForeground": "#ffffff",
      "muted": "#f0f3f8",
      "mutedForeground": "#6b7a9b",
      "accent": "#e8edf7",
      "accentForeground": "#1a2d4d",
      "destructive": "#dc3545",
      "destructiveForeground": "#ffffff",
      "input": "#cdd5e0",
      "ring": "#2e5bdb",
      "chart1": "#2e5bdb",
      "chart2": "#5b9bd5",
      "chart3": "#4caf50",
      "chart4": "#e07b28",
      "chart5": "#26c6da",
      "sidebar": "#ffffff",
      "sidebarForeground": "#44546a",
      "sidebarBorder": "#e2e8f0",
      "sidebarPrimary": "#2e5bdb",
      "sidebarPrimaryForeground": "#ffffff",
      "sidebarAccent": "#e8edf7",
      "sidebarAccentForeground": "#1a2d4d",
      "sidebarRing": "#2e5bdb"
    },
    "dark": {
      "background": "#0e1623",
      "foreground": "#e6ecf5",
      "border": "#1e3254",
      "card": "#152038",
      "cardForeground": "#e6ecf5",
      "popover": "#152038",
      "popoverForeground": "#e6ecf5",
      "primary": "#4e78e8",
      "primaryForeground": "#0d1626",
      "secondary": "#243660",
      "secondaryForeground": "#e6ecf5",
      "muted": "#1a2c48",
      "mutedForeground": "#8ea3c0",
      "accent": "#1a2c48",
      "accentForeground": "#e6ecf5",
      "destructive": "#e55c6a",
      "destructiveForeground": "#0d1626",
      "input": "#243660",
      "ring": "#4e78e8",
      "chart1": "#4e78e8",
      "chart2": "#7ab4e8",
      "chart3": "#66bb6a",
      "chart4": "#f0a050",
      "chart5": "#4dd0e1",
      "sidebar": "#0b1220",
      "sidebarForeground": "#9fb0cc",
      "sidebarBorder": "#1a2c48",
      "sidebarPrimary": "#4e78e8",
      "sidebarPrimaryForeground": "#0d1626",
      "sidebarAccent": "#152038",
      "sidebarAccentForeground": "#e6ecf5",
      "sidebarRing": "#4e78e8"
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
  "radius": "0.375rem",
  "spacing": "0.25rem"
} as const;

export type Tokens = typeof tokens;
export default tokens;
