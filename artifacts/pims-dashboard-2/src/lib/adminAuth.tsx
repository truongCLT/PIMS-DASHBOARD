import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { setAuthTokenGetter } from "@workspace/api-client-react";

const TOKEN_KEY = "pims2:adminToken";
const EXP_KEY = "pims2:adminTokenExp";

export function readAdminToken(): string | null {
  return readStoredToken();
}

function readStoredToken(): string | null {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    const exp = localStorage.getItem(EXP_KEY);
    if (!token || !exp) return null;
    if (new Date(exp).getTime() <= Date.now()) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(EXP_KEY);
      return null;
    }
    return token;
  } catch {
    return null;
  }
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
    try {
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(EXP_KEY, expiresAt);
    } catch {
      // localStorage 사용 불가 시에도 세션 동안은 동작하도록 무시
    }
    setIsAdmin(true);
  }, []);

  const logout = useCallback(() => {
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
