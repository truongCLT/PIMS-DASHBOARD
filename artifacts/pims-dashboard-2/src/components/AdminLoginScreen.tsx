import React, { useState } from "react";
import { Lock } from "lucide-react";
import { useAdminLogin } from "@workspace/api-client-react";
import { useAdminAuth } from "../lib/adminAuth";

export function AdminLoginScreen({ onDone }: { onDone: () => void }) {
  const { isAdmin, activate, logout } = useAdminAuth();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const loginMutation = useAdminLogin({
    mutation: {
      onSuccess: (data) => {
        activate(data.token, data.expiresAt);
        setPassword("");
        setError(null);
        onDone();
      },
      onError: () => setError("비밀번호가 올바르지 않습니다."),
    },
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.trim().length === 0 || loginMutation.isPending) return;
    setError(null);
    loginMutation.mutate({ data: { password } });
  };

  return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#e8edf3" }}>
      <div style={{
        backgroundColor: "#fff",
        border: "1px solid #d0dce8",
        borderRadius: "10px",
        padding: "32px 36px",
        width: "340px",
        boxShadow: "0 2px 10px rgba(30,60,110,0.08)",
        textAlign: "center",
      }}>
        <div style={{
          width: "44px",
          height: "44px",
          borderRadius: "50%",
          backgroundColor: "#eef3fa",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 12px",
        }}>
          <Lock size={20} color="#2e4568" />
        </div>
        <div style={{ fontSize: "16px", fontWeight: 700, color: "#1a2d4d", marginBottom: "4px" }}>관리자 모드</div>

        {isAdmin ? (
          <>
            <div style={{ fontSize: "12px", color: "#3e7d4c", margin: "10px 0 16px" }}>
              현재 관리자 모드가 활성화되어 있습니다.
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={onDone}
                style={{
                  flex: 1, padding: "9px 0", fontSize: "12px", fontWeight: 600,
                  backgroundColor: "#2e4568", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer",
                }}
              >
                대시보드로 돌아가기
              </button>
              <button
                onClick={() => { logout(); }}
                style={{
                  flex: 1, padding: "9px 0", fontSize: "12px", fontWeight: 600,
                  backgroundColor: "#fff", color: "#c0392b", border: "1px solid #e0b4b4", borderRadius: "6px", cursor: "pointer",
                }}
              >
                로그아웃
              </button>
            </div>
          </>
        ) : (
          <form onSubmit={submit}>
            <div style={{ fontSize: "12px", color: "#5a6a7e", marginBottom: "16px" }}>
              관리자 비밀번호를 입력해 주세요.
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호"
              autoFocus
              style={{
                width: "100%",
                boxSizing: "border-box",
                border: error ? "1px solid #c0392b" : "1px solid #ccd4dd",
                borderRadius: "6px",
                padding: "9px 12px",
                fontSize: "13px",
                marginBottom: "8px",
                outline: "none",
              }}
            />
            {error && (
              <div style={{ fontSize: "11px", color: "#c0392b", marginBottom: "8px" }}>{error}</div>
            )}
            <button
              type="submit"
              disabled={password.trim().length === 0 || loginMutation.isPending}
              style={{
                width: "100%",
                padding: "10px 0",
                fontSize: "13px",
                fontWeight: 600,
                backgroundColor: "#2e4568",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                cursor: loginMutation.isPending ? "wait" : "pointer",
                opacity: password.trim().length === 0 ? 0.6 : 1,
              }}
            >
              {loginMutation.isPending ? "확인 중…" : "로그인"}
            </button>
            <button
              type="button"
              onClick={onDone}
              style={{
                width: "100%",
                marginTop: "8px",
                padding: "8px 0",
                fontSize: "12px",
                backgroundColor: "transparent",
                color: "#5a6a7e",
                border: "none",
                cursor: "pointer",
              }}
            >
              취소
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
