export type ProjectBusinessType = "시공" | "용역";

export type DivisionCandidate = {
  id: number;
  companyId: number;
  businessType: ProjectBusinessType;
  sortOrder: number;
};

/**
 * Prefer the matching division in the project's current company.
 * Fall back deterministically when that company does not have the target type.
 */
export function selectTargetDivision<T extends DivisionCandidate>(
  divisions: T[],
  targetBusinessType: ProjectBusinessType,
  currentCompanyId: number | null,
): T | undefined {
  const candidates = divisions
    .filter((division) => division.businessType === targetBusinessType)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);

  return candidates.find((division) => division.companyId === currentCompanyId) ?? candidates[0];
}