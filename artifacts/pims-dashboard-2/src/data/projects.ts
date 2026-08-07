export interface ProjectDivision {
  label: string;
}

export interface ProjectGroup {
  label: string;
  divisions: ProjectDivision[];
}

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

