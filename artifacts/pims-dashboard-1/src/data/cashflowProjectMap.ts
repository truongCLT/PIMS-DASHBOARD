// Maps dashboard project names (data/projects.ts) to 자금수지 엑셀 프로젝트 (cf_projects.name + division)
export interface CashflowProjectRef {
  name: string;
  division: string;
}

export const CASHFLOW_PROJECT_MAP: Record<string, CashflowProjectRef> = {
  // DECV 용역 (감리/운영 SITE — 자금수지 도급 사업 항목과 대응)
  "THT PHASE 2 INFRA SITE": { name: "THT 2단계 인프라", division: "도급 사업" },
  "THT PHASE 2 K5&K7 VILLA SITE": { name: "K5/K7 빌라", division: "도급 사업" },
  "THT K8HH1 COMPLEX SITE": { name: "K8HH1", division: "도급 사업" },
  "THT K8CT1 APTMENT SITE": { name: "K8CT1", division: "도급 사업" },
  "NHON TRACH INFRA SITE": { name: "년짝 인프라", division: "도급 사업" },

  // DECV 시공
  "THT INFRA O&M SITE": { name: "THT O&M", division: "용역 사업" },
  "THT PHASE 1 H9 APARTMENT 5TH-YEAR MAINTENANCE SERVICE": {
    name: "H9 Apartment 5년차 하자보수용역",
    division: "용역 사업",
  },
  "THT B1CC4 TEST PILE SITE": { name: "B1CC4 테스트파일", division: "용역 사업" },
  "THT K8HH1 TEST PILE SITE": { name: "K8HH1 시험", division: "용역 사업" },
  "THT K8CT1 TEST PILE SITE": { name: "K8CT1 테스트파일", division: "용역 사업" },
  "THT K2CT1 TEST PILE SITE": { name: "K2CT1 테스트파일", division: "용역 사업" },
  "THT K8CT1 PRECON SERVICE": { name: "K8CT1 프리콘", division: "용역 사업" },
  "K8HH1 BROKERAGE": { name: "K8HH1 분양대행", division: "용역 사업" },

  // TCC 자체개발 (용역)
  "THT B3CC1 DESIGN&APPROVAL CONSULTING SERVICE": { name: "B3CC1 인허가", division: "용역 사업" },
  "THT PJ DESIGN&APPROVAL CONSULTING SERVICE": { name: "THT 인허가", division: "용역 사업" },
  "THT B1CC4 DESIGN&APPROVAL CONSULTING SERVICE": { name: "B1CC4 인허가", division: "용역 사업" },
  "THT H1HH1 DESIGN&APPROVAL CONSULTING SERVICE": { name: "H1HH1 인허가", division: "용역 사업" },
  "THT K8HH1 PRECON SERVICE": { name: "K8HH1 프리콘", division: "용역 사업" },
  "THT K2CT1 PRECON SERVICE": { name: "K2CT1 프리콘", division: "용역 사업" },
  "THT K2HH1 PRECON SERVICE": { name: "K2HH1 프리콘", division: "용역 사업" },
  "THT K8CT1 CONSTRUCTION INVESTMENT MANAGING SERVICE": {
    name: "K8CT1 사업비산출용역",
    division: "용역 사업",
  },
  "THT PHASE 2 K2 BLOCK CONSTRUCTION COST CONSULTING SERVICE": {
    name: "K2블록 사업비 산출용역",
    division: "용역 사업",
  },
  "THT PHASE 2 CIP REPORT CONSULTING SERVICE": { name: "THT CIP 산출용역", division: "용역 사업" },
};

export function getCashflowProjectRef(dashboardName: string): CashflowProjectRef | null {
  return CASHFLOW_PROJECT_MAP[dashboardName] ?? null;
}
