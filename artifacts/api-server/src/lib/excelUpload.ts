import multer from "multer";
import type { Request, Response } from "express";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

const uploadSingle = (req: Request, res: Response) =>
  new Promise<Error | undefined>((resolve) => {
    upload.single("file")(req, res, (err?: unknown) => resolve(err as Error | undefined));
  });

export function parseYearField(raw: unknown): number | null {
  const y = Number(raw);
  if (!Number.isInteger(y) || y < 2000 || y > 2100) return null;
  return y;
}

export async function readExcelUpload(
  req: Request,
  res: Response,
  opts: { requireYear?: boolean } = {},
) {
  const err = await uploadSingle(req, res);
  if (err) {
    const isSize = (err as { code?: string }).code === "LIMIT_FILE_SIZE";
    return {
      error: isSize
        ? "파일이 너무 큽니다. 25MB 이하의 Excel 파일만 업로드할 수 있습니다."
        : "파일 업로드에 실패했습니다. 다시 시도해 주세요.",
    } as const;
  }
  const file = (req as unknown as { file?: { buffer: Buffer; originalname: string } }).file;
  if (!file) {
    return { error: "업로드된 파일이 없습니다. Excel(.xlsx) 파일을 선택해 주세요." } as const;
  }
  if (opts.requireYear) {
    const year = parseYearField((req.body as Record<string, unknown>)?.year);
    if (year == null) {
      return { error: "연도(year)가 올바르지 않습니다. 예: 2026" } as const;
    }
    return { file, year } as const;
  }
  return { file, year: null } as const;
}
