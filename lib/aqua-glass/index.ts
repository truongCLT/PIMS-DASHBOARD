/**
 * @workspace/aqua-glass — design token stub
 * Original artifact was removed; this stub preserves the color values used by pims-dashboard-2.
 * Color values derived from pims-dashboard-1 equivalent palette.
 */

const light = {
  primary:          "#2f7cf6",  // mid-blue — main brand
  chart2:           "#35c7c0",  // teal — series 2
  chart3:           "#5fe0a8",  // green — series 3
  secondary:        "#82c4f5",  // light blue — series 4 / strip
  foreground:       "#16294a",  // dark navy — body text
  mutedForeground:  "#7c8ba3",  // blue-gray — axis / caption
  accentForeground: "#1a5fd4",  // darker blue — accent text on light bg
  muted:            "#f1f5f9",  // very light gray — muted background
  sidebarAccent:    "#e7f1fd",  // subtle blue — grid / fill
  destructive:      "#f2736a",  // coral — outflow / error
  input:            "#dde6f1",  // light gray-blue — zero line / neutral
  border:           "#e2e9f3",  // border
  background:       "#ffffff",  // card / page background
} as const;

export const tokens = {
  color: { light },
} as const;
