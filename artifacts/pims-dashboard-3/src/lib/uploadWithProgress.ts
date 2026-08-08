// XHR 기반 업로드 헬퍼 — fetch는 업로드 진행률 이벤트를 제공하지 않으므로
// Excel 업로드처럼 진행률 표시가 필요한 요청에만 사용합니다.
import { readAdminToken } from "./adminAuth";

export interface UploadProgress {
  /** upload: 파일 전송 중(정확한 %), processing: 서버 분석/반영 중(불확정) */
  phase: "upload" | "processing";
  /** 0~100 (upload 단계에서만 의미 있음) */
  percent: number;
}

export class UploadHttpError extends Error {
  readonly status: number;
  readonly data: unknown;

  constructor(status: number, statusText: string, data: unknown) {
    const detail =
      data && typeof data === "object" && typeof (data as { error?: unknown }).error === "string"
        ? `: ${(data as { error: string }).error}`
        : statusText
          ? ` ${statusText}`
          : "";
    super(`HTTP ${status}${detail}`);
    this.status = status;
    this.data = data;
  }
}

export function uploadWithProgress<T>(
  url: string,
  formData: FormData,
  onProgress: (p: UploadProgress) => void,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.responseType = "text";

    const token = readAdminToken();
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.setRequestHeader("Accept", "application/json");

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        onProgress({ phase: "upload", percent: Math.round((e.loaded / e.total) * 100) });
      }
    };
    // 파일 전송 완료 → 서버 파싱/반영 대기 단계
    xhr.upload.onload = () => onProgress({ phase: "processing", percent: 100 });

    xhr.onerror = () => reject(new Error("네트워크 오류로 업로드에 실패했습니다. 다시 시도해 주세요."));
    xhr.onabort = () => reject(new Error("업로드가 취소되었습니다."));

    xhr.onload = () => {
      let data: unknown = null;
      const raw = xhr.responseText;
      if (raw) {
        try {
          data = JSON.parse(raw);
        } catch {
          data = raw;
        }
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(data as T);
      } else {
        reject(new UploadHttpError(xhr.status, xhr.statusText, data));
      }
    };

    xhr.send(formData);
  });
}
