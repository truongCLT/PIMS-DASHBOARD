/* GENERATED FROM tokens.json -- DO NOT EDIT. Run scripts/build-tokens.mjs. */
// Portable design tokens (colors as hex). Web consumes the theme via
// src/index.css; mobile (Expo) and any other platform import this object so the
// whole product shares one source of truth.
export const tokens = {
  "color": {
    "light": {
      "background": "#eef2f7",
      "foreground": "#16294a",
      "border": "#e2e9f3",
      "card": "#ffffff",
      "cardForeground": "#16294a",
      "popover": "#ffffff",
      "popoverForeground": "#16294a",
      "primary": "#2f7cf6",
      "primaryForeground": "#ffffff",
      "secondary": "#1e3a6e",
      "secondaryForeground": "#ffffff",
      "muted": "#f2f6fb",
      "mutedForeground": "#7c8ba3",
      "accent": "#d8f6ea",
      "accentForeground": "#1c7a5a",
      "destructive": "#f2736a",
      "destructiveForeground": "#ffffff",
      "input": "#dde6f1",
      "ring": "#2f7cf6",
      "chart1": "#2f7cf6",
      "chart2": "#35c7c0",
      "chart3": "#5fe0a8",
      "chart4": "#6db9f2",
      "chart5": "#1e3a6e",
      "sidebar": "#ffffff",
      "sidebarForeground": "#44546a",
      "sidebarBorder": "#e2e9f3",
      "sidebarPrimary": "#2f7cf6",
      "sidebarPrimaryForeground": "#ffffff",
      "sidebarAccent": "#e7f1fd",
      "sidebarAccentForeground": "#1e3a6e",
      "sidebarRing": "#2f7cf6"
    },
    "dark": {
      "background": "#0f1a2e",
      "foreground": "#e7eef8",
      "border": "#24334e",
      "card": "#16233c",
      "cardForeground": "#e7eef8",
      "popover": "#16233c",
      "popoverForeground": "#e7eef8",
      "primary": "#4f95f7",
      "primaryForeground": "#0f1a2e",
      "secondary": "#24334e",
      "secondaryForeground": "#e7eef8",
      "muted": "#1b2a44",
      "mutedForeground": "#8fa2bd",
      "accent": "#143d31",
      "accentForeground": "#7fe7c0",
      "destructive": "#e0655c",
      "destructiveForeground": "#ffffff",
      "input": "#24334e",
      "ring": "#4f95f7",
      "chart1": "#4f95f7",
      "chart2": "#3fd8d0",
      "chart3": "#6ee9b4",
      "chart4": "#82c4f5",
      "chart5": "#93aed6",
      "sidebar": "#121e34",
      "sidebarForeground": "#c4d1e4",
      "sidebarBorder": "#24334e",
      "sidebarPrimary": "#4f95f7",
      "sidebarPrimaryForeground": "#0f1a2e",
      "sidebarAccent": "#1b2a44",
      "sidebarAccentForeground": "#e7eef8",
      "sidebarRing": "#4f95f7"
    }
  },
  "fontFamily": {
    "sans": [
      "Inter",
      "Noto Sans KR",
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
  "radius": "1rem",
  "spacing": "0.25rem"
} as const;

export type Tokens = typeof tokens;
export default tokens;
