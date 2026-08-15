/* GENERATED FROM tokens.json -- DO NOT EDIT. Run scripts/build-tokens.mjs. */
// Portable design tokens (colors as hex). Web consumes the theme via
// src/index.css; mobile (Expo) and any other platform import this object so the
// whole product shares one source of truth.
export const tokens = {
  "color": {
    "light": {
      "background": "#e8edf3",
      "foreground": "#1a2d4d",
      "border": "#d5dce6",
      "card": "#ffffff",
      "cardForeground": "#1a2d4d",
      "popover": "#ffffff",
      "popoverForeground": "#1a2d4d",
      "primary": "#1e6fdd",
      "primaryForeground": "#ffffff",
      "secondary": "#2e4568",
      "secondaryForeground": "#ffffff",
      "muted": "#f2f4f7",
      "mutedForeground": "#44546a",
      "accent": "#e8ecf5",
      "accentForeground": "#1a2d4d",
      "destructive": "#ff5722",
      "destructiveForeground": "#ffffff",
      "input": "#ccd4dd",
      "ring": "#1e6fdd",
      "chart1": "#1565c0",
      "chart2": "#4472ca",
      "chart3": "#5b9bd5",
      "chart4": "#4caf50",
      "chart5": "#00bcd4",
      "sidebar": "#ffffff",
      "sidebarForeground": "#44546a",
      "sidebarBorder": "#d5dce6",
      "sidebarPrimary": "#1e6fdd",
      "sidebarPrimaryForeground": "#ffffff",
      "sidebarAccent": "#e8ecf5",
      "sidebarAccentForeground": "#1a2d4d",
      "sidebarRing": "#1e6fdd"
    },
    "dark": {
      "background": "#141d2c",
      "foreground": "#e6ecf5",
      "border": "#2e4568",
      "card": "#1f2c42",
      "cardForeground": "#e6ecf5",
      "popover": "#1f2c42",
      "popoverForeground": "#e6ecf5",
      "primary": "#4a8df0",
      "primaryForeground": "#0d1626",
      "secondary": "#33415f",
      "secondaryForeground": "#e6ecf5",
      "muted": "#26334a",
      "mutedForeground": "#9fb0cc",
      "accent": "#26334a",
      "accentForeground": "#e6ecf5",
      "destructive": "#ff7043",
      "destructiveForeground": "#0d1626",
      "input": "#33415f",
      "ring": "#4a8df0",
      "chart1": "#4a8df0",
      "chart2": "#6b93e0",
      "chart3": "#7ab4e8",
      "chart4": "#66bb6a",
      "chart5": "#26c6da",
      "sidebar": "#0f1826",
      "sidebarForeground": "#9fb0cc",
      "sidebarBorder": "#26334a",
      "sidebarPrimary": "#4a8df0",
      "sidebarPrimaryForeground": "#0d1626",
      "sidebarAccent": "#1f2c42",
      "sidebarAccentForeground": "#e6ecf5",
      "sidebarRing": "#4a8df0"
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
