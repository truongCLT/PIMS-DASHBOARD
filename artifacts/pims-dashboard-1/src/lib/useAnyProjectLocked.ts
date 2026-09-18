import { useQuery } from "@tanstack/react-query";
import { getBaseUrl } from "@workspace/api-client-react";

/** ProjectDataEntryTab의 잠금 토글 직후 이 쿼리를 invalidate해서, 헤더의 Sync 버튼이 폴링 주기를
 * 기다리지 않고 바로 최신 잠금 상태를 반영하도록 한다. */
export const ANY_PROJECT_LOCKED_QUERY_KEY = ["projectdetail", "any-locked"] as const;

/**
 * 시스템 전체에서 잠긴(closed) 프로젝트 섹션이 하나라도 있는지 확인한다.
 * "Sync PIMSVINA" 버튼(및 새벽 1시 자동 동기화)이 잠긴 데이터를 덮어쓰지 않도록,
 * 하나라도 잠겨 있으면 버튼을 비활성화하기 위해 사용한다.
 */
export function useAnyProjectLocked(): boolean {
  const { data } = useQuery({
    queryKey: ANY_PROJECT_LOCKED_QUERY_KEY,
    queryFn: async () => {
      const baseUrl = getBaseUrl() || "";
      const res = await fetch(`${baseUrl}/api/projectdetail/any-locked`);
      if (!res.ok) throw new Error("failed to check locked sections");
      return (await res.json()) as { anyLocked: boolean };
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
  return data?.anyLocked ?? false;
}
