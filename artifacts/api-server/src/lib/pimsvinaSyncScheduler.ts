import cron from "node-cron";
import { logger } from "./logger";
import { isAnySectionLocked } from "../routes/projectdetail";
import { fetchAllPimsvinaData, applyPimsvinaData } from "../routes/pimsvinaSync";

/**
 * 매일 새벽 1시(베트남 시간)에 PIMSVINA 데이터를 자동 동기화한다.
 * 수동 "Sync PIMSVINA" 버튼과 동일한 안전 규칙을 적용한다: 어떤 프로젝트든 잠긴(closed) 섹션이
 * 하나라도 있으면, 그 잠긴 데이터를 덮어쓰지 않도록 이번 회차 동기화 전체를 건너뛴다.
 */
async function runScheduledPimsvinaSync(): Promise<void> {
  logger.info("[PIMSVINA Auto Sync] starting scheduled sync");

  const anyLocked = await isAnySectionLocked();
  if (anyLocked) {
    logger.warn(
      "[PIMSVINA Auto Sync] skipped: at least one project section is locked (closed); unlock it to resume auto-sync",
    );
    return;
  }

  try {
    const data = await fetchAllPimsvinaData();
    const counts = await applyPimsvinaData(data);
    logger.info({ counts }, "[PIMSVINA Auto Sync] completed successfully");
  } catch (err) {
    logger.error({ err }, "[PIMSVINA Auto Sync] failed");
  }
}

export function startPimsvinaSyncScheduler(): void {
  cron.schedule("0 1 * * *", () => { void runScheduledPimsvinaSync(); }, {
    timezone: "Asia/Ho_Chi_Minh",
  });
  logger.info("[PIMSVINA Auto Sync] scheduled for 01:00 daily (Asia/Ho_Chi_Minh)");
}
