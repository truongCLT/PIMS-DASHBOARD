import { describe, expect, it } from "vitest";
import {
  classifyMrProject,
  resolveProjectBusinessType,
} from "./projects";

describe("프로젝트 사업 유형 분류", () => {
  it.each([
    ["K8HH1 모델하우스", "시공"],
    ["K8CT1 모델하우스", "시공"],
    ["K8HH1 도급공사", "시공"],
    ["년짝 신도시 인프라", "시공"],
    ["K8HH1 프리콘", "용역"],
    ["B3CC1 인허가지원", "용역"],
    ["THT1단계/2단계 인프라 유지관리", "용역"],
  ] as const)("%s를 %s으로 분류한다", (projectName, expected) => {
    expect(classifyMrProject(projectName)).toBe(expected);
  });

  it("서버에 명시된 사업 유형을 이름 추정보다 우선한다", () => {
    expect(resolveProjectBusinessType("K8HH1 도급공사", "용역")).toBe("용역");
    expect(resolveProjectBusinessType("K8HH1 프리콘", "시공")).toBe("시공");
  });

  it("서버 사업 유형이 없으면 이름 기반 분류를 사용한다", () => {
    expect(resolveProjectBusinessType("K8CT1 모델하우스", null)).toBe("시공");
    expect(resolveProjectBusinessType("K8CT1 프리콘", undefined)).toBe("용역");
  });
});