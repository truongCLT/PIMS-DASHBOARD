import React, { useState } from "react";
import { Send } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListMgmtreportComments,
  useCreateMgmtreportComment,
  getListMgmtreportCommentsQueryKey,
} from "@workspace/api-client-react";
import { useDashboardData, REPORT_YEAR } from "../lib/mgmtreportData";

export type CommentSection = "analysis" | "outlook";

export function CommentPanel({
  title,
  section,
}: {
  title: string;
  section: CommentSection;
}) {
  const [inputText, setInputText] = useState("");
  const { derived } = useDashboardData();
  const latestMonth = derived?.month ?? new Date().getMonth() + 1;
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const month = selectedMonth ?? latestMonth;

  // 데이터가 있는 최근 월부터 1월까지 동적 생성
  const monthOptions = Array.from({ length: latestMonth }, (_, i) => latestMonth - i);

  const queryClient = useQueryClient();
  const listQuery = useListMgmtreportComments({ year: REPORT_YEAR, month, section });
  const createMutation = useCreateMgmtreportComment({
    mutation: {
      onSuccess: () => {
        setInputText("");
        queryClient.invalidateQueries({
          queryKey: getListMgmtreportCommentsQueryKey({ year: REPORT_YEAR, month, section }),
        });
      },
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
      border: "1px solid #d0dce8",
      borderRadius: "6px",
      padding: "10px 12px",
      display: "flex",
      flexDirection: "column",
      gap: "8px",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        <span style={{ fontSize: "12px", color: "#555" }}>💬</span>
        <span style={{ fontSize: "12px", fontWeight: "600", color: "#1a3a5c" }}>{title}</span>
      </div>

      {/* Month selector */}
      <div>
        <div style={{ fontSize: "10px", color: "#888", marginBottom: "3px" }}>월:</div>
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
            <option key={m} value={m}>{m}월</option>
          ))}
        </select>
      </div>

      {/* Input */}
      <div style={{ position: "relative" }}>
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Write a comment..."
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
          aria-label="코멘트 저장"
          style={{
            position: "absolute",
            right: "8px",
            bottom: "8px",
            background: "none",
            border: "none",
            cursor: canSubmit ? "pointer" : "default",
            color: canSubmit ? "#1e6fdd" : "#a9c4e8",
            padding: "0",
          }}
        >
          <Send size={14} />
        </button>
      </div>

      {createMutation.isError && (
        <div style={{ fontSize: "10px", color: "#c0392b" }}>
          코멘트 저장에 실패했습니다. 다시 시도해 주세요.
        </div>
      )}

      {/* Separator */}
      <div style={{ height: "1px", backgroundColor: "#e8f0f8" }} />

      {/* Comment list */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {listQuery.isLoading ? (
          <div style={{ fontSize: "11px", color: "#999" }}>불러오는 중...</div>
        ) : listQuery.isError ? (
          <div style={{ fontSize: "11px", color: "#c0392b" }}>코멘트 조회에 실패했습니다.</div>
        ) : comments.length === 0 ? (
          <div style={{ fontSize: "11px", color: "#999" }}>{month}월 코멘트가 없습니다.</div>
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
              <p style={{ margin: "0 0 4px", whiteSpace: "pre-wrap" }}>{c.body}</p>
              <span style={{ color: "#8aa0b8", fontSize: "10px" }}>
                {new Date(c.createdAt).toLocaleDateString("ko-KR")}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
