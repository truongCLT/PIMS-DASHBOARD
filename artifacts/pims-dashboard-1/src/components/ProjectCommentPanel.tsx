import React, { useState } from "react";
import { Send, MessageSquare, Pencil, Trash2, Check, X } from "lucide-react";
import { useTranslation } from "react-i18next";
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

type TFunc = ReturnType<typeof useTranslation>["t"];

/** 월 필터 옵션 목록 (value는 조회용 식별자, label만 번역 대상) */
function getMonthOptions(t: TFunc) {
  return [
    { value: 0, label: t("common:all") },
    ...Array.from({ length: 12 }, (_, i) => ({
      value: i + 1,
      label: t("projectCommentPanel:monthOption", { month: i + 1 }),
    })),
  ];
}

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
  const { t } = useTranslation(["projectCommentPanel", "common"]);
  const MONTH_OPTIONS = getMonthOptions(t);
  const [inputText, setInputText] = useState("");
  const { isAdmin } = useAdminAuth();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  // 기본값: 현재 월 (0 = 전체)
  const [filterMonth, setFilterMonth] = useState<number>(() => new Date().getMonth() + 1);

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
      onError: () => setActionError(t("projectCommentPanel:saveFailed")),
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
      onError: () => setActionError(t("projectCommentPanel:editFailed")),
    },
  });
  const deleteMutation = useDeleteProjectdetailComment({
    mutation: {
      onSuccess: () => {
        setActionError(null);
        invalidateList();
      },
      onError: () => setActionError(t("projectCommentPanel:deleteFailed")),
    },
  });

  const canSubmit = inputText.trim().length > 0 && !createMutation.isPending;
  const submit = () => {
    if (!canSubmit) return;
    createMutation.mutate({ data: { projectName, tab, body: inputText.trim() } });
  };

  const comments = listQuery.data?.comments ?? [];

  const visibleComments = filterMonth === 0
    ? comments
    : comments.filter((c) => new Date(c.createdAt).getMonth() + 1 === filterMonth);

  const filterLabel = MONTH_OPTIONS.find((m) => m.value === filterMonth)?.label ?? t("common:all");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      {showHeader && (
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <MessageSquare size={13} color="#16294a" />
          <span style={{ fontSize: "12px", fontWeight: 700, color: "#16294a" }}>{t("common:comment")}</span>
        </div>
      )}

      {/* 월 필터 */}
      <div>
        <div style={{ fontSize: "11px", color: "#555", marginBottom: "4px" }}>{t("projectCommentPanel:monthLabel")}</div>
        <select
          value={filterMonth}
          onChange={(e) => setFilterMonth(Number(e.target.value))}
          style={{
            width: "100%",
            border: "1px solid #dde6f1",
            borderRadius: "8px",
            padding: "7px 10px",
            fontSize: "12px",
            color: "#333",
            backgroundColor: "#fff",
            cursor: "pointer",
          }}
        >
          {MONTH_OPTIONS.map((m) => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
      </div>

      {/* Input */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: "8px",
          border: "1px solid #dde6f1",
          borderRadius: "8px",
          padding: "8px 10px",
        }}
      >
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={t("projectCommentPanel:inputPlaceholder")}
          rows={4}
          style={{
            flex: 1,
            border: "none",
            outline: "none",
            resize: "vertical",
            minHeight: "64px",
            fontSize: "12px",
            color: "#333",
            fontFamily: "inherit",
          }}
        />
        <button
          onClick={submit}
          disabled={!canSubmit}
          aria-label={t("projectCommentPanel:saveCommentAriaLabel")}
          style={{
            background: "none",
            border: "none",
            padding: 0,
            cursor: canSubmit ? "pointer" : "default",
            color: canSubmit ? "#2f7cf6" : "#a9c4e8",
            flexShrink: 0,
          }}
        >
          <Send size={14} />
        </button>
      </div>

      {actionError && <div style={{ fontSize: "10px", color: "#f2736a" }}>{actionError}</div>}

      {/* Comment list */}
      {listQuery.isLoading ? (
        <div style={{ fontSize: "11px", color: "#999" }}>{t("projectCommentPanel:loadingComments")}</div>
      ) : listQuery.isError ? (
        <div style={{ fontSize: "11px", color: "#f2736a" }}>{t("projectCommentPanel:fetchFailed")}</div>
      ) : visibleComments.length === 0 ? (
        filterMonth !== 0 ? (
          <div style={{ fontSize: "11px", color: "#999" }}>{t("projectCommentPanel:noCommentsForFilter", { filter: filterLabel })}</div>
        ) : null
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {visibleComments.map((c) => (
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
                      aria-label={t("projectCommentPanel:saveEditAriaLabel")}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "#1c7a5a", padding: 0 }}
                    >
                      <Check size={14} />
                    </button>
                    <button
                      onClick={() => {
                        setEditingId(null);
                        setEditText("");
                      }}
                      aria-label={t("projectCommentPanel:cancelEditAriaLabel")}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "#7c8ba3", padding: 0 }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p style={{ margin: "0 0 4px", whiteSpace: "pre-wrap" }}>{c.body}</p>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ color: "#7c8ba3", fontSize: "10px" }}>
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
                          aria-label={t("projectCommentPanel:editCommentAriaLabel")}
                          style={{ background: "none", border: "none", cursor: "pointer", color: "#2f7cf6", padding: 0 }}
                        >
                          <Pencil size={12} />
                        </button>
                        <button
                          onClick={() => {
                            if (deleteMutation.isPending) return;
                            if (window.confirm(t("projectCommentPanel:deleteConfirm"))) {
                              deleteMutation.mutate({ id: c.id });
                            }
                          }}
                          aria-label={t("projectCommentPanel:deleteCommentAriaLabel")}
                          style={{ background: "none", border: "none", cursor: "pointer", color: "#f2736a", padding: 0 }}
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
