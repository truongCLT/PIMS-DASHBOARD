import React, { useState } from "react";
import { Send, MessageSquare, Pencil, Trash2, Check, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListProjectdetailComments,
  useCreateProjectdetailComment,
  useUpdateProjectdetailComment,
  useDeleteProjectdetailComment,
  getListProjectdetailCommentsQueryKey,
} from "@workspace/api-client-react";
import { useAdminAuth } from "../lib/adminAuth";

export type ProjectCommentTab =
  | "overview"
  | "progress"
  | "costing"
  | "outsourcing"
  | "cashflow"
  | "saleprofit"
  | "budget"
  | "service";

/** 프로젝트 상세 탭별 코멘트 패널 (DB 저장) */
export function ProjectCommentPanel({
  projectName,
  tab,
  showHeader = true,
}: {
  projectName: string;
  tab: ProjectCommentTab;
  showHeader?: boolean;
}) {
  const [inputText, setInputText] = useState("");
  const { isAdmin } = useAdminAuth();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  const params = { projectName, tab };
  const queryClient = useQueryClient();
  const listQuery = useListProjectdetailComments(params, {
    query: { queryKey: getListProjectdetailCommentsQueryKey(params) },
  });
  const invalidateList = () =>
    queryClient.invalidateQueries({ queryKey: getListProjectdetailCommentsQueryKey(params) });

  const createMutation = useCreateProjectdetailComment({
    mutation: {
      onSuccess: () => {
        setInputText("");
        setActionError(null);
        invalidateList();
      },
      onError: () => setActionError("코멘트 저장에 실패했습니다."),
    },
  });
  const updateMutation = useUpdateProjectdetailComment({
    mutation: {
      onSuccess: () => {
        setEditingId(null);
        setEditText("");
        setActionError(null);
        invalidateList();
      },
      onError: () => setActionError("코멘트 수정에 실패했습니다."),
    },
  });
  const deleteMutation = useDeleteProjectdetailComment({
    mutation: {
      onSuccess: () => {
        setActionError(null);
        invalidateList();
      },
      onError: () => setActionError("코멘트 삭제에 실패했습니다."),
    },
  });

  const canSubmit = inputText.trim().length > 0 && !createMutation.isPending;
  const submit = () => {
    if (!canSubmit) return;
    createMutation.mutate({ data: { projectName, tab, body: inputText.trim() } });
  };

  const comments = listQuery.data?.comments ?? [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      {showHeader && (
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <MessageSquare size={13} color="#1a2d4d" />
          <span style={{ fontSize: "12px", fontWeight: 700, color: "#1a2d4d" }}>Comment</span>
        </div>
      )}

      {/* Input */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: "8px",
          border: "1px solid #ccd4dd",
          borderRadius: "6px",
          padding: "8px 10px",
        }}
      >
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Write a comment"
          rows={2}
          style={{
            flex: 1,
            border: "none",
            outline: "none",
            resize: "none",
            fontSize: "11px",
            color: "#333",
            fontFamily: "inherit",
          }}
        />
        <button
          onClick={submit}
          disabled={!canSubmit}
          aria-label="코멘트 저장"
          style={{
            background: "none",
            border: "none",
            padding: 0,
            cursor: canSubmit ? "pointer" : "default",
            color: canSubmit ? "#1e6fdd" : "#a9c4e8",
            flexShrink: 0,
          }}
        >
          <Send size={14} />
        </button>
      </div>

      {actionError && <div style={{ fontSize: "10px", color: "#c0392b" }}>{actionError}</div>}

      {/* Comment list */}
      {listQuery.isLoading ? (
        <div style={{ fontSize: "11px", color: "#999" }}>불러오는 중...</div>
      ) : listQuery.isError ? (
        <div style={{ fontSize: "11px", color: "#c0392b" }}>코멘트 조회에 실패했습니다.</div>
      ) : comments.length === 0 ? null : (
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {comments.map((c) => (
            <div
              key={c.id}
              style={{
                backgroundColor: "#f0f5fa",
                borderRadius: "4px",
                padding: "8px",
                fontSize: "11px",
                color: "#333",
                lineHeight: "1.5",
              }}
            >
              {editingId === c.id ? (
                <>
                  <textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    style={{
                      width: "100%",
                      border: "1px solid #ccc",
                      borderRadius: "4px",
                      padding: "6px 8px",
                      fontSize: "11px",
                      color: "#333",
                      resize: "none",
                      height: "50px",
                      fontFamily: "inherit",
                      boxSizing: "border-box",
                      marginBottom: "4px",
                    }}
                  />
                  <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
                    <button
                      onClick={() => {
                        const body = editText.trim();
                        if (!body || updateMutation.isPending) return;
                        updateMutation.mutate({ id: c.id, data: { body } });
                      }}
                      disabled={editText.trim().length === 0 || updateMutation.isPending}
                      aria-label="수정 저장"
                      style={{ background: "none", border: "none", cursor: "pointer", color: "#1e7145", padding: 0 }}
                    >
                      <Check size={14} />
                    </button>
                    <button
                      onClick={() => {
                        setEditingId(null);
                        setEditText("");
                      }}
                      aria-label="수정 취소"
                      style={{ background: "none", border: "none", cursor: "pointer", color: "#8aa0b8", padding: 0 }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p style={{ margin: "0 0 4px", whiteSpace: "pre-wrap" }}>{c.body}</p>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ color: "#8aa0b8", fontSize: "10px" }}>
                      {new Date(c.createdAt).toLocaleDateString("ko-KR")}
                    </span>
                    {isAdmin && (
                      <span style={{ display: "flex", gap: "8px" }}>
                        <button
                          onClick={() => {
                            setEditingId(c.id);
                            setEditText(c.body);
                            setActionError(null);
                          }}
                          aria-label="코멘트 수정"
                          style={{ background: "none", border: "none", cursor: "pointer", color: "#1e6fdd", padding: 0 }}
                        >
                          <Pencil size={12} />
                        </button>
                        <button
                          onClick={() => {
                            if (deleteMutation.isPending) return;
                            if (window.confirm("이 코멘트를 삭제하시겠습니까?")) {
                              deleteMutation.mutate({ id: c.id });
                            }
                          }}
                          aria-label="코멘트 삭제"
                          style={{ background: "none", border: "none", cursor: "pointer", color: "#c0392b", padding: 0 }}
                        >
                          <Trash2 size={12} />
                        </button>
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
