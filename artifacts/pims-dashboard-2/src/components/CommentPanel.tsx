import React, { useState } from "react";
import { Send, Pencil, Trash2, Check, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListMgmtreportComments,
  useCreateMgmtreportComment,
  useUpdateMgmtreportComment,
  useDeleteMgmtreportComment,
  getListMgmtreportCommentsQueryKey,
} from "@workspace/api-client-react";
import { useDashboardData, REPORT_YEAR } from "../lib/mgmtreportData";
import { useAdminAuth } from "../lib/adminAuth";

export type CommentSection = "analysis" | "outlook";

export function CommentPanel({
  title,
  section,
}: {
  title: string;
  section: CommentSection;
}) {
  const { t } = useTranslation(["commentPanel", "common"]);
  const [inputText, setInputText] = useState("");
  const { derived } = useDashboardData();
  const latestMonth = derived?.month ?? new Date().getMonth() + 1;
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const month = selectedMonth ?? latestMonth;

  // 데이터가 있는 최근 월부터 1월까지 동적 생성
  const monthOptions = Array.from({ length: latestMonth }, (_, i) => latestMonth - i);

  const { isAdmin } = useAdminAuth();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  const queryClient = useQueryClient();
  const listQuery = useListMgmtreportComments({ year: REPORT_YEAR, month, section });
  const invalidateList = () =>
    queryClient.invalidateQueries({
      queryKey: getListMgmtreportCommentsQueryKey({ year: REPORT_YEAR, month, section }),
    });
  const createMutation = useCreateMgmtreportComment({
    mutation: {
      onSuccess: () => {
        setInputText("");
        invalidateList();
      },
    },
  });
  const updateMutation = useUpdateMgmtreportComment({
    mutation: {
      onSuccess: () => {
        setEditingId(null);
        setEditText("");
        setActionError(null);
        invalidateList();
      },
      onError: () => setActionError(t("commentPanel:editFailed")),
    },
  });
  const deleteMutation = useDeleteMgmtreportComment({
    mutation: {
      onSuccess: () => {
        setActionError(null);
        invalidateList();
      },
      onError: () => setActionError(t("commentPanel:deleteFailed")),
    },
  });

  const canSubmit = inputText.trim().length > 0 && !createMutation.isPending;
  const submit = () => {
    if (!canSubmit) return;
    createMutation.mutate({
      data: { year: REPORT_YEAR, month, section, body: inputText.trim() },
    });
  };

  const comments = listQuery.data?.comments ?? [];

  return (
    <div style={{
      backgroundColor: "#fff",
      border: "1px solid #e2e9f3",
      borderRadius: "6px",
      padding: "10px 12px",
      display: "flex",
      flexDirection: "column",
      gap: "8px",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        <span style={{ fontSize: "12px", color: "#555" }}>💬</span>
        <span style={{ fontSize: "12px", fontWeight: "600", color: "#16294a" }}>{title}</span>
      </div>

      {/* Month selector */}
      <div>
        <div style={{ fontSize: "10px", color: "#888", marginBottom: "3px" }}>{t("commentPanel:monthLabel")}</div>
        <select
          value={month}
          onChange={(e) => setSelectedMonth(Number(e.target.value))}
          style={{
            width: "100%",
            border: "1px solid #ccc",
            borderRadius: "4px",
            padding: "4px 8px",
            fontSize: "11px",
            color: "#333",
            backgroundColor: "#fff",
            cursor: "pointer",
          }}
        >
          {monthOptions.map((m) => (
            <option key={m} value={m}>{t("commentPanel:monthOption", { month: m })}</option>
          ))}
        </select>
      </div>

      {/* Input */}
      <div style={{ position: "relative" }}>
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={t("commentPanel:inputPlaceholder")}
          style={{
            width: "100%",
            border: "1px solid #ccc",
            borderRadius: "4px",
            padding: "6px 30px 6px 8px",
            fontSize: "11px",
            color: "#333",
            resize: "none",
            height: "80px",
            fontFamily: "inherit",
            boxSizing: "border-box",
          }}
        />
        <button
          onClick={submit}
          disabled={!canSubmit}
          aria-label={t("commentPanel:saveCommentAriaLabel")}
          style={{
            position: "absolute",
            right: "8px",
            bottom: "8px",
            background: "none",
            border: "none",
            cursor: canSubmit ? "pointer" : "default",
            color: canSubmit ? "#2f7cf6" : "#a9c4e8",
            padding: "0",
          }}
        >
          <Send size={14} />
        </button>
      </div>

      {createMutation.isError && (
        <div style={{ fontSize: "10px", color: "#e0655c" }}>
          {t("commentPanel:saveFailedRetry")}
        </div>
      )}

      {/* Separator */}
      <div style={{ height: "1px", backgroundColor: "#e7f1fd" }} />

      {/* Comment list */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {listQuery.isLoading ? (
          <div style={{ fontSize: "11px", color: "#999" }}>{t("commentPanel:loadingComments")}</div>
        ) : listQuery.isError ? (
          <div style={{ fontSize: "11px", color: "#e0655c" }}>{t("commentPanel:fetchFailed")}</div>
        ) : comments.length === 0 ? (
          <div style={{ fontSize: "11px", color: "#999" }}>{t("commentPanel:noCommentsForMonth", { month })}</div>
        ) : (
          comments.map((c) => (
            <div key={c.id} style={{
              backgroundColor: "#f0f5fa",
              borderRadius: "4px",
              padding: "8px",
              fontSize: "11px",
              color: "#333",
              lineHeight: "1.5",
            }}>
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
                      height: "60px",
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
                      aria-label={t("commentPanel:saveEditAriaLabel")}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "#1c7a5a", padding: 0 }}
                    >
                      <Check size={14} />
                    </button>
                    <button
                      onClick={() => { setEditingId(null); setEditText(""); }}
                      aria-label={t("commentPanel:cancelEditAriaLabel")}
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
                          onClick={() => { setEditingId(c.id); setEditText(c.body); setActionError(null); }}
                          aria-label={t("commentPanel:editCommentAriaLabel")}
                          style={{ background: "none", border: "none", cursor: "pointer", color: "#2f7cf6", padding: 0 }}
                        >
                          <Pencil size={12} />
                        </button>
                        <button
                          onClick={() => {
                            if (deleteMutation.isPending) return;
                            if (window.confirm(t("commentPanel:deleteConfirm"))) {
                              deleteMutation.mutate({ id: c.id });
                            }
                          }}
                          aria-label={t("commentPanel:deleteCommentAriaLabel")}
                          style={{ background: "none", border: "none", cursor: "pointer", color: "#e0655c", padding: 0 }}
                        >
                          <Trash2 size={12} />
                        </button>
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>
          ))
        )}
        {actionError && (
          <div style={{ fontSize: "10px", color: "#e0655c" }}>{actionError}</div>
        )}
      </div>
    </div>
  );
}
