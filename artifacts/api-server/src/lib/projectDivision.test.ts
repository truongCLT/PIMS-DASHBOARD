import { describe, expect, it } from "vitest";
import { selectTargetDivision, type DivisionCandidate } from "./projectDivision";

const divisions: DivisionCandidate[] = [
  { id: 1, companyId: 10, businessType: "시공", sortOrder: 1 },
  { id: 2, companyId: 10, businessType: "용역", sortOrder: 2 },
  { id: 3, companyId: 20, businessType: "시공", sortOrder: 3 },
  { id: 4, companyId: 20, businessType: "용역", sortOrder: 4 },
];

describe("selectTargetDivision", () => {
  it("switches construction to service in the same company", () => {
    expect(selectTargetDivision(divisions, "용역", 10)?.id).toBe(2);
  });

  it("switches service to construction in the same company", () => {
    expect(selectTargetDivision(divisions, "시공", 20)?.id).toBe(3);
  });

  it("uses a deterministic fallback when the current company lacks the target type", () => {
    expect(selectTargetDivision(divisions, "용역", 999)?.id).toBe(2);
  });

  it("returns undefined when the target type is not configured", () => {
    expect(selectTargetDivision(divisions.filter((division) => division.businessType === "시공"), "용역", 10)).toBeUndefined();
  });
});