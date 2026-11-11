// 업로드/반영/되돌리기 API의 500 응답에 "왜 실패했는지"를 사용자(관리자)가 읽을 수 있게 붙이기 위한 헬퍼.
// drizzle은 pg 오류를 cause로 한두 겹 감싸서 던지므로 안쪽의 pg 오류(code/constraint/detail)까지 내려가서 해석한다.

type PgLikeError = {
  message?: string;
  code?: string;
  constraint?: string;
  detail?: string;
  column?: string;
  table?: string;
  cause?: unknown;
};

// 제약조건 이름 → 사용자가 이해할 수 있는 설명
const CONSTRAINT_HINTS: Record<string, string> = {
  mr_projects_name_uq: "같은 프로젝트명이 이미 다른 프로젝트에 사용 중입니다",
  mr_projects_code_uq: "같은 프로젝트 코드가 이미 다른 프로젝트에 사용 중입니다",
  mr_monthly_uq: "같은 프로젝트·월·구분(계획/실적)·항목 데이터가 파일 안에 중복되어 있습니다",
  mr_annual_uq: "같은 프로젝트·연도·구분·항목 데이터가 파일 안에 중복되어 있습니다",
  mr_pnl_uq: "같은 손익 라인·월·구분 데이터가 파일 안에 중복되어 있습니다",
  order_entries_year_project_uq: "같은 연도에 같은 프로젝트명의 수주 계획이 중복되어 있습니다",
};

function findPgError(err: unknown): PgLikeError | undefined {
  let e = err as PgLikeError | undefined;
  for (let i = 0; i < 5 && e; i++) {
    if (e.code || e.constraint) return e;
    if (!e.cause) break;
    e = e.cause as PgLikeError;
  }
  return err as PgLikeError | undefined;
}

// pg detail 예: 'Key (name)=(K2CT1 도급공사) already exists.' → "name = 'K2CT1 도급공사'"
function keyFromDetail(detail?: string): string | null {
  const m = detail && /Key \((.+?)\)=\((.*)\)/.exec(detail);
  return m ? `${m[1]} = '${m[2]}'` : null;
}

export function describeError(err: unknown): string {
  const e = findPgError(err);
  if (!e) return "알 수 없는 오류";
  const hint = e.constraint ? CONSTRAINT_HINTS[e.constraint] : undefined;
  const where = [e.table && `테이블 ${e.table}`, e.column && `컬럼 ${e.column}`, e.constraint && `제약조건 ${e.constraint}`]
    .filter(Boolean)
    .join(", ");
  const suffix = where ? ` [${where}]` : "";

  switch (e.code) {
    case "23505": {
      const key = keyFromDetail(e.detail);
      return `중복 데이터 — ${hint ?? "이미 존재하는 값입니다"}${key ? `: ${key}` : ""}${suffix}`;
    }
    case "21000":
      return `중복 데이터 — 파일 안에 같은 키(프로젝트/월/구분/항목)의 값이 두 번 이상 있습니다. 같은 프로젝트가 두 번 나오거나 같은 SITE번호가 여러 프로젝트에 붙어 있는지 확인해 주세요.${suffix}`;
    case "22003":
      return `숫자 값이 너무 큽니다 — 단위(천 USD)가 맞는지 확인해 주세요.${suffix}`;
    case "22P02":
      return `숫자/날짜 형식이 올바르지 않은 값이 있습니다 — ${e.message}${suffix}`;
    case "23502":
      return `필수 값이 비어 있습니다${e.column ? ` (${e.column})` : ""}${suffix}`;
    case "23503":
      return `연결된 데이터가 없거나 다른 데이터가 참조 중입니다 — ${e.detail ?? e.message}${suffix}`;
    case "23514":
      return `허용되지 않는 값이 있습니다 — ${hint ?? e.message}${suffix}`;
    case "40P01":
    case "55P03":
    case "40001":
      return "다른 반영/동기화 작업과 동시에 실행되어 충돌했습니다. 잠시 후 다시 시도해 주세요.";
    case "57014":
      return "처리 시간이 초과되었습니다. 잠시 후 다시 시도해 주세요.";
  }
  const msg = e.message ?? String(err);
  if (/ECONNREFUSED|ETIMEDOUT|ENOTFOUND|timeout expired|Connection terminated/i.test(msg)) {
    return "데이터베이스에 연결할 수 없습니다. 잠시 후 다시 시도하거나 관리자에게 문의해 주세요.";
  }
  const detail = e.detail ? ` / ${e.detail}` : "";
  return `${msg}${detail}${suffix}`;
}

/** "기본 문구\n원인: ..." 형태의 500 응답 메시지 */
export function errorWithCause(base: string, err: unknown): string {
  return `${base}\n원인: ${describeError(err)}`;
}
