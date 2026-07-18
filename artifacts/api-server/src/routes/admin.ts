import { timingSafeEqual } from "node:crypto";
import { Router, type IRouter } from "express";
import { AdminLoginBody, AdminLoginResponse } from "@workspace/api-zod";
import { issueAdminToken } from "../middlewares/adminAuth";

const router: IRouter = Router();

function passwordsMatch(input: string, expected: string): boolean {
  const a = Buffer.from(input);
  const b = Buffer.from(expected);
  if (a.length !== b.length) {
    // 길이가 달라도 타이밍 차이를 줄이기 위해 자기 자신과 비교
    timingSafeEqual(a, a);
    return false;
  }
  return timingSafeEqual(a, b);
}

router.post("/admin/login", (req, res) => {
  const parsed = AdminLoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(401).json({ error: "비밀번호가 올바르지 않습니다." });
    return;
  }
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    req.log.error("ADMIN_PASSWORD is not set");
    res.status(500).json({ error: "관리자 비밀번호가 설정되어 있지 않습니다." });
    return;
  }
  if (!passwordsMatch(parsed.data.password, expected)) {
    res.status(401).json({ error: "비밀번호가 올바르지 않습니다." });
    return;
  }
  res.json(AdminLoginResponse.parse(issueAdminToken()));
});

export default router;
