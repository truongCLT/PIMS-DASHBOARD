/* GENERATED FROM tokens.json -- DO NOT EDIT. Run scripts/build-tokens.mjs. */
// Portable design tokens (colors as hex). Web consumes the theme via
// src/index.css; mobile (Expo) and any other platform import this object so the
// whole product shares one source of truth.
export const tokens = {
  "color": {
    "light": {
      "background": "#eef1f6",
      "foreground": "#1a2d4d",
      "border": "#dde3ee",
      "card": "#ffffff",
      "cardForeground": "#1a2d4d",
      "popover": "#ffffff",
      "popoverForeground": "#1a2d4d",
      "primary": "#4472ca",
      "primaryForeground": "#ffffff",
      "secondary": "#1e2d5e",
      "secondaryForeground": "#ffffff",
      "muted": "#f2f4f8",
      "mutedForeground": "#5e6e8a",
      "accent": "#e8ecf5",
      "accentForeground": "#1a2d4d",
      "destructive": "#e05252",
      "destructiveForeground": "#ffffff",
      "input": "#d0d8e4",
      "ring": "#4472ca",
      "chart1": "#4472ca",
      "chart2": "#5b9bd5",
      "chart3": "#4caf50",
      "chart4": "#e07b28",
      "chart5": "#26c6da",
      "sidebar": "#ffffff",
      "sidebarForeground": "#44546a",
      "sidebarBorder": "#dde3ee",
      "sidebarPrimary": "#4472ca",
      "sidebarPrimaryForeground": "#ffffff",
      "sidebarAccent": "#e8ecf5",
      "sidebarAccentForeground": "#1a2d4d",
      "sidebarRing": "#4472ca"
    },
    "dark": {
      "background": "#111827",
      "foreground": "#e6ecf5",
      "border": "#243354",
      "card": "#1b2742",
      "cardForeground": "#e6ecf5",
      "popover": "#1b2742",
      "popoverForeground": "#e6ecf5",
      "primary": "#5b87db",
      "primaryForeground": "#0d1626",
      "secondary": "#2e4568",
      "secondaryForeground": "#e6ecf5",
      "muted": "#1f2d44",
      "mutedForeground": "#8fa3c0",
      "accent": "#1f2d44",
      "accentForeground": "#e6ecf5",
      "destructive": "#e87272",
      "destructiveForeground": "#0d1626",
      "input": "#2e4568",
      "ring": "#5b87db",
      "chart1": "#5b87db",
      "chart2": "#7ab4e8",
      "chart3": "#66bb6a",
      "chart4": "#f0a050",
      "chart5": "#4dd0e1",
      "sidebar": "#0f1826",
      "sidebarForeground": "#9fb0cc",
      "sidebarBorder": "#1f2d44",
      "sidebarPrimary": "#5b87db",
      "sidebarPrimaryForeground": "#0d1626",
      "sidebarAccent": "#1b2742",
      "sidebarAccentForeground": "#e6ecf5",
      "sidebarRing": "#5b87db"
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
