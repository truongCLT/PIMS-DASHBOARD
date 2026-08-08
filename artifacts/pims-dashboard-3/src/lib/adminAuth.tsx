import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { setAuthTokenGetter } from "@workspace/api-client-react";

const TOKEN_KEY = "pims3:adminToken";
const EXP_KEY = "pims3:adminTokenExp";

export function readAdminToken(): string | null {
  return readStoredToken();
}

// localStorage가 차단된 환경(iframe 미리보기 등)에서도 세션 동안 유지되는 메모리 백업
let memToken: string | null = null;
let memExp: number | null = null;

function readStoredToken(): string | null {
  let token: string | null = null;
  let exp: string | null = null;
  try {
    token = localStorage.getItem(TOKEN_KEY);
    exp = localStorage.getItem(EXP_KEY);
  } catch {
    // ignore — 메모리 백업으로 폴백
  }
  if (token && exp) {
    if (new Date(exp).getTime() > Date.now()) return token;
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(EXP_KEY);
    } catch {
      // ignore
    }
  }
  if (memToken && memExp && memExp > Date.now()) return memToken;
  return null;
}

// 모든 API 요청에 관리자 토큰(있을 때만) 자동 첨부
setAuthTokenGetter(() => readStoredToken());

interface AdminAuthContextValue {
  isAdmin: boolean;
  activate: (token: string, expiresAt: string) => void;
  logout: () => void;
}

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [isAdmin, setIsAdmin] = useState(() => readStoredToken() != null);

  // 토큰 만료 시 관리자 UI를 자동으로 비활성화 (주기 확인 + 창 포커스 시 확인)
  useEffect(() => {
    const sync = () => setIsAdmin(readStoredToken() != null);
    const interval = setInterval(sync, 60_000);
    window.addEventListener("focus", sync);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", sync);
    };
  }, []);

  const activate = useCallback((token: string, expiresAt: string) => {
    memToken = token;
    memExp = new Date(expiresAt).getTime();
    try {
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(EXP_KEY, expiresAt);
    } catch {
      // localStorage 사용 불가 시에도 메모리 백업으로 동작
    }
    setIsAdmin(true);
  }, []);

  const logout = useCallback(() => {
    memToken = null;
    memExp = null;
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(EXP_KEY);
    } catch {
      // ignore
    }
    setIsAdmin(false);
  }, []);

  const value = useMemo(() => ({ isAdmin, activate, logout }), [isAdmin, activate, logout]);
  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}

export function useAdminAuth(): AdminAuthContextValue {
  const ctx = useContext(AdminAuthContext);
  if (ctx) return ctx;
  return { isAdmin: false, activate: () => {}, logout: () => {} };
}
