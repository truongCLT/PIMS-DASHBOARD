// Maps dashboard project names (data/projects.ts) to 매출/원가 엑셀 사이트 (sc_sites.name)
export const SALESCOST_SITE_MAP: Record<string, string> = {
  // DECV 용역 (감리/운영 SITE)
  "THT PHASE 2 INFRA SITE": "Infra Phase II",
  "THT K8CT1 APTMENT SITE": "Construction K8CT1",
  "THT K8HH1 COMPLEX SITE": "Construction K8HH1",
  "NHON TRACH INFRA SITE": "Nhon Trach Infra",

  // DECV 시공
  "THT INFRA O&M SITE": "Infra Management",
  "THT PHASE 1&2 VILLA O&M": "Villa H&K Management",
  "THT PHASE 1 H9 APARTMENT 5TH-YEAR MAINTENANCE SERVICE": "Defect repairing for H9CT1",
  "THT B1CC4 TEST PILE SITE": "Pile testing B1CC4",
  "K8HH1 BROKERAGE": "Brokerage for K8HH1 Building distribution",
  "THT K8CT1 PRECON SERVICE": "Precons K8CT1",

  // TCC 자체개발 (용역)
  "THT B3CC1 DESIGN&APPROVAL CONSULTING SERVICE": "B3CC1",
  "THT B1CC4 DESIGN&APPROVAL CONSULTING SERVICE": "B1CC4",
  "THT H1HH1 DESIGN&APPROVAL CONSULTING SERVICE": "H1HH1",
  "THT K2CT1 PRECON SERVICE": "Precons K2CT1",
  "THT K2HH1 PRECON SERVICE": "Precons K2HH1",
};

export function getSalescostSiteName(dashboardName: string): string | null {
  return SALESCOST_SITE_MAP[dashboardName] ?? null;
}
