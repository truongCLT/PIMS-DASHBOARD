import fs from "fs";
import crypto from "crypto";

// Configs from environment variables (.env)
const PIMSVINA_BASE_URL =
  process.env.PIMSVINA_BASE_URL || "http://boatcon.infoerp.com.vn:8081/site/jsp/Common/dashboard";
const PRIVATE_KEY_PATH = process.env.PIMS_JWT_PRIVATE_KEY_PATH || "D:/pims_keys/pims_jwt_private.pem";
const PIMS_JWT_ISS = process.env.PIMS_JWT_ISS || "pims";
const PIMS_JWT_AUD = process.env.PIMS_JWT_AUD || "daewoo-gw-api";
const PIMS_JWT_KID = process.env.PIMS_JWT_KID || "pims-rsa-2026-01";

let cachedPrivateKey: string | null = null;

function getPrivateKey(): string {
  if (cachedPrivateKey) return cachedPrivateKey;
  if (fs.existsSync(PRIVATE_KEY_PATH)) {
    cachedPrivateKey = fs.readFileSync(PRIVATE_KEY_PATH, "utf8");
    return cachedPrivateKey;
  }
  if (process.env.PIMS_JWT_PRIVATE_KEY) {
    return process.env.PIMS_JWT_PRIVATE_KEY;
  }
  throw new Error("Private Key file not found at path: " + PRIVATE_KEY_PATH);
}

function base64UrlEncode(str: string | Buffer): string {
  const buf = typeof str === "string" ? Buffer.from(str, "utf8") : str;
  return buf.toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

export function generateRS256JwtToken(): string {
  const header = {
    alg: "RS256",
    typ: "JWT",
    kid: PIMS_JWT_KID,
  };

  const nowSec = Math.floor(Date.now() / 1000);
  const payload = {
    iss: PIMS_JWT_ISS,
    aud: PIMS_JWT_AUD,
    sub: "dashboard_sync_service",
    iat: nowSec,
    exp: nowSec + 600,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  const signer = crypto.createSign("SHA256");
  signer.update(signingInput);
  const signature = signer.sign(getPrivateKey());
  const encodedSignature = base64UrlEncode(signature);

  return `${signingInput}.${encodedSignature}`;
}

export async function fetchPimsvinaApi(endpoint: string, params: Record<string, string> = {}): Promise<any[]> {
  try {
    const token = generateRS256JwtToken();
    const baseUrl = PIMSVINA_BASE_URL.replace(/\/$/, "");
    const url = new URL(`${baseUrl}/${endpoint}`);
    Object.entries(params).forEach(([k, v]) => url.searchParams.append(k, v));

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    const resText = await response.text();
    if (!response.ok) {
      console.warn(`[PIMSVINA API] ${endpoint} HTTP ${response.status} Body: ${resText}`);
      return [];
    }

    const resJson = JSON.parse(resText);
    if (resJson && resJson.success && Array.isArray(resJson.data)) {
      return resJson.data;
    }
    return [];
  } catch (err: any) {
    console.error(`[PIMSVINA API Error] ${endpoint}:`, err.message);
    return [];
  }
}
