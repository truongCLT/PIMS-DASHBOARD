// Bản sao phía server của artifacts/pims-dashboard-1/src/data/mrProjectLinks.ts (MR_TO_CASHFLOW).
// Dùng để sync PIMSVINA có thể tra cf_projects/cf_monthly_amounts theo tên mr_projects.
// LƯU Ý: phải giữ đồng bộ 2 bên khi thêm/sửa mapping — không có cơ chế tự động chia sẻ giữa
// frontend (pims-dashboard-1) và backend (api-server) cho bảng tra cứu này.
export interface CashflowRef {
  name: string;
  division: string;
}

export const MR_TO_CASHFLOW: Record<string, CashflowRef> = {
  // 도급(시공) 사업
  "K8HH1 도급공사": { name: "K8HH1", division: "도급 사업" },
  "K8CT1 도급공사": { name: "K8CT1", division: "도급 사업" },
  "K2CT1 도급공사": { name: "K2CT1", division: "도급 사업" },
  "K2HH1 도급공사": { name: "K2HH1", division: "도급 사업" },
  "H1HH1 도급공사": { name: "H1HH1", division: "도급 사업" },
  "B1CC4 도급공사": { name: "B1CC4", division: "도급 사업" },
  "K8CT1 모델하우스": { name: "K8CT1 모델하우스", division: "도급 사업" },
  "년짝 신도시 인프라": { name: "년짝 인프라", division: "도급 사업" },
  "년짝 신도시 빌라 1단계": { name: "년짝 빌라 1단계", division: "도급 사업" },
  "년짝 신도시 빌라 2단계": { name: "년짝 빌라 2단계", division: "도급 사업" },
  "타이빙 신도시 인프라": { name: "타이빙 신도시 인프라", division: "도급 사업" },
  "타이빙 신도시 빌라 1단계": { name: "타이빙 빌라 1단계", division: "도급 사업" },
  "타이빙 신도시 빌라 2단계": { name: "타이빙 빌라 2단계", division: "도급 사업" },
  "THT2단계 인프라": { name: "THT 2단계 인프라", division: "도급 사업" },

  // 용역 사업
  "K8HH1 프리콘": { name: "K8HH1 프리콘", division: "용역 사업" },
  "K8CT1 프리콘": { name: "K8CT1 프리콘", division: "용역 사업" },
  "K2CT1 프리콘": { name: "K2CT1 프리콘", division: "용역 사업" },
  "K2HH1 프리콘": { name: "K2HH1 프리콘", division: "용역 사업" },
  "K8CT1 테스트 파일": { name: "K8CT1 테스트파일", division: "용역 사업" },
  "K2CT1 테스트 파일": { name: "K2CT1 테스트파일", division: "용역 사업" },
  "K2HH1 테스트 파일": { name: "K2HH1 테스트파일", division: "용역 사업" },
  "H1HH1 테스트 파일": { name: "H1HH1 테스트파일", division: "용역 사업" },
  "B1CC4 테스트 파일": { name: "B1CC4 테스트파일", division: "용역 사업" },
  "B3CC1 인허가지원": { name: "B3CC1 인허가", division: "용역 사업" },
  "B1CC4 인허가지원": { name: "B1CC4 인허가", division: "용역 사업" },
  "H1HH1 인허가지원": { name: "H1HH1 인허가", division: "용역 사업" },
  "K8CT1 사업비 산출 용역": { name: "K8CT1 사업비산출용역", division: "용역 사업" },
  "K2 Block 사업비 산출용역": { name: "K2블록 사업비 산출용역", division: "용역 사업" },
  "THT CIP 산출용역": { name: "THT CIP 산출용역", division: "용역 사업" },
  "H9 아파트 5년차 하자보수 용역": { name: "H9 Apartment 5년차 하자보수용역", division: "용역 사업" },
  "K8HH1 APT, 상가 분양대행 및 홍보관리 용역": { name: "K8HH1 분양대행", division: "용역 사업" },
  "K8CT1 APT, 상가 분양대행 및 홍보관리 용역": { name: "K8CT1 분양대행", division: "용역 사업" },
  "THT1단계/2단계 인프라 유지관리": { name: "THT O&M", division: "용역 사업" },
};

export function getMrCashflowRef(mrProjectName: string): CashflowRef | null {
  return MR_TO_CASHFLOW[mrProjectName] ?? null;
}
