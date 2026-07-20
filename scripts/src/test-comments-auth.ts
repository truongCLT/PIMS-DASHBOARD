/**
 * Integration test for /projectdetail/comments auth matrix.
 * Requires: API server running behind the shared proxy (localhost:80)
 * and ADMIN_PASSWORD env var.
 *
 * Run: pnpm --filter @workspace/scripts run test-comments-auth
 */
const BASE = process.env.API_BASE ?? "http://localhost:80/api";
const PROJECT = "__AUTH_TEST__";
const TAB = "overview";

let failures = 0;

function check(name: string, ok: boolean, detail?: unknown) {
  if (ok) {
    console.log(`PASS  ${name}`);
  } else {
    failures++;
    console.error(`FAIL  ${name}`, detail ?? "");
  }
}

async function main() {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) {
    console.error("ADMIN_PASSWORD is not set");
    process.exit(1);
  }

  // GET is public
  const listRes = await fetch(`${BASE}/projectdetail/comments?projectName=${PROJECT}&tab=${TAB}`);
  check("GET list is public (200)", listRes.status === 200, listRes.status);

  // GET with bad tab -> 400
  const badTab = await fetch(`${BASE}/projectdetail/comments?projectName=${PROJECT}&tab=nope`);
  check("GET with invalid tab -> 400", badTab.status === 400, badTab.status);

  // POST is public
  const createRes = await fetch(`${BASE}/projectdetail/comments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ projectName: PROJECT, tab: TAB, body: "auth matrix test" }),
  });
  check("POST create is public (201)", createRes.status === 201, createRes.status);
  const created = (await createRes.json()) as { id: number };

  // POST with empty body -> 400
  const badCreate = await fetch(`${BASE}/projectdetail/comments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ projectName: PROJECT, tab: TAB, body: "   " }),
  });
  check("POST with blank body -> 400", badCreate.status === 400, badCreate.status);

  // PATCH without token -> 401
  const patchNoAuth = await fetch(`${BASE}/projectdetail/comments/${created.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ body: "hacked" }),
  });
  check("PATCH without token -> 401", patchNoAuth.status === 401, patchNoAuth.status);

  // DELETE without token -> 401
  const delNoAuth = await fetch(`${BASE}/projectdetail/comments/${created.id}`, { method: "DELETE" });
  check("DELETE without token -> 401", delNoAuth.status === 401, delNoAuth.status);

  // Admin login
  const loginRes = await fetch(`${BASE}/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  check("Admin login -> 200", loginRes.status === 200, loginRes.status);
  const { token } = (await loginRes.json()) as { token: string };
  const auth = { Authorization: `Bearer ${token}` };

  // PATCH with token -> 200
  const patchRes = await fetch(`${BASE}/projectdetail/comments/${created.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...auth },
    body: JSON.stringify({ body: "updated by admin" }),
  });
  check("PATCH with token -> 200", patchRes.status === 200, patchRes.status);

  // PATCH missing comment -> 404
  const patch404 = await fetch(`${BASE}/projectdetail/comments/999999`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...auth },
    body: JSON.stringify({ body: "x" }),
  });
  check("PATCH nonexistent -> 404", patch404.status === 404, patch404.status);

  // DELETE with token -> 204
  const delRes = await fetch(`${BASE}/projectdetail/comments/${created.id}`, {
    method: "DELETE",
    headers: auth,
  });
  check("DELETE with token -> 204", delRes.status === 204, delRes.status);

  // DELETE missing comment -> 404
  const del404 = await fetch(`${BASE}/projectdetail/comments/999999`, {
    method: "DELETE",
    headers: auth,
  });
  check("DELETE nonexistent -> 404", del404.status === 404, del404.status);

  // Cleanup any leftover test comments
  const leftover = await fetch(`${BASE}/projectdetail/comments?projectName=${PROJECT}&tab=${TAB}`);
  const { comments } = (await leftover.json()) as { comments: { id: number }[] };
  for (const c of comments) {
    await fetch(`${BASE}/projectdetail/comments/${c.id}`, { method: "DELETE", headers: auth });
  }

  console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
