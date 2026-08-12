export interface ProjectDivision {
  label: string;
}

export interface ProjectGroup {
  label: string;
  divisions: ProjectDivision[];
}

/**
 * 조직 구조(DB)가 비어 있을 때 좌측 메뉴가 통째로 사라지지 않도록 쓰는 기본 구조.
 * 관리자 조직도 편집으로 저장하면 DB 값이 우선한다.
 */
export const DEFAULT_PROJECT_GROUPS: ProjectGroup[] = [
  { label: "DECV", divisions: [{ label: "시공" }, { label: "용역" }] },
  { label: "TCC", divisions: [{ label: "자체개발" }, { label: "용지매각" }] },
  { label: "DE HEIM", divisions: [{ label: "자체개발" }, { label: "용지매각" }] },
];

const SERVICE_KEYWORDS = [
  "용역",
  "프리콘",
  "인허가",
  "산출",
  "유지관리",
  "운영관리",
  "분양대행",
  "테스트 파일",
];

/** 테스트 프로젝트 여부 (사이드바에서 최상단 정렬용) */
export function isTestMrProject(projectName: string): boolean {
  return projectName.trim().startsWith("테스트");
}

/** mr 프로젝트명 기반 시공/용역 분류 (키워드 매칭, 기본값 시공) */
export function classifyMrProject(projectName: string): "시공" | "용역" {
  return SERVICE_KEYWORDS.some((k) => projectName.includes(k)) ? "용역" : "시공";
}

