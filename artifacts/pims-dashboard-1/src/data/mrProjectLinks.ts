// 경영관리보고회(mr_projects) 프로젝트명 기준으로 DB 데이터를 연결하는 모듈
// - 매출/원가(sc_*): mr_projects.site_code ↔ sc_sites.code 로 자동 연결
// - 자금수지(cf_*): 이름 체계가 달라 아래 명시적 매핑표 사용
import {
  useListMgmtreportProjects,
  getListMgmtreportProjectsQueryKey,
} from "@workspace/api-client-react";
import type { MgmtreportProject } from "@workspace/api-client-react";

export interface CashflowRef {
  name: string;
  division: string;
}

// mr_projects.name → cf_projects(name, division)
// 대응되는 자금수지 항목이 없거나 모호한 프로젝트(개발·운영관리 등)는 의도적으로 제외 — 화면에는 "-" 표시
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

/**
 * 해당 연도 경영관리보고회 프로젝트 목록에서 프로젝트 항목(siteCode, 월별 매출/원가 포함)을 조회.
 * 404(해당 연도 데이터 없음)는 오류가 아닌 "데이터 없음"으로 처리.
 */
export function useMrProject(projectName: string, year: number, enabled = true) {
  const params = { year };
  const q = useListMgmtreportProjects(params, {
    query: {
      enabled: enabled && projectName.trim().length > 0 && Number.isInteger(year) && year > 0,
      queryKey: getListMgmtreportProjectsQueryKey(params),
      staleTime: 60_000,
    },
  });
  const project: MgmtreportProject | null =
    q.data?.projects.find((p) => p.name === projectName) ?? null;
  const status = (q.error as { status?: number } | null)?.status;
  return {
    project,
    isLoading: q.isLoading,
    isError: q.isError && status !== 404,
  };
}
