import React, { useState } from "react";
import { Send, MessageSquare } from "lucide-react";

const comments = [
  {
    text: "Revenue did not achieve plans because customers are experiencing financial difficulties",
    link: "https://boardsale.com/",
  },
];

export function CommentPanel() {
  const [inputText, setInputText] = useState("");

  return (
    <div style={{
      backgroundColor: "var(--color-card-bg)",
      borderRadius: "14px",
      boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
      padding: "20px 24px",
      display: "flex",
      flexDirection: "column",
      gap: "12px",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
        <div style={{ 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "center", 
          width: "28px", 
          height: "28px", 
          backgroundColor: "rgba(74, 127, 212, 0.1)", 
          borderRadius: "50%" 
        }}>
          <MessageSquare size={14} color="var(--color-primary-blue)" />
        </div>
        <span style={{ fontSize: "14px", fontWeight: "600", color: "var(--color-text-primary)" }}>코멘트</span>
      </div>

      {/* Selectors row */}
      <div style={{ display: "flex", gap: "12px" }}>
        {/* Chart selector */}
        <div style={{ flex: 2 }}>
          <div style={{ fontSize: "11px", color: "var(--color-text-secondary)", marginBottom: "4px", fontWeight: "500" }}>차트:</div>
          <select style={{
            width: "100%",
            border: "1px solid var(--color-border)",
            borderRadius: "8px",
            padding: "8px 12px",
            fontSize: "12px",
            color: "var(--color-text-primary)",
            backgroundColor: "var(--color-background)",
            cursor: "pointer",
            outline: "none",
          }}>
            <option>매출 실적 및 전망</option>
            <option>손익현황</option>
            <option>자금수지</option>
          </select>
        </div>

        {/* Month selector */}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: "11px", color: "var(--color-text-secondary)", marginBottom: "4px", fontWeight: "500" }}>월:</div>
          <select style={{
            width: "100%",
            border: "1px solid var(--color-border)",
            borderRadius: "8px",
            padding: "8px 12px",
            fontSize: "12px",
            color: "var(--color-text-primary)",
            backgroundColor: "var(--color-background)",
            cursor: "pointer",
            outline: "none",
          }}>
            <option>6월</option>
            <option>1월</option>
            <option>2월</option>
            <option>3월</option>
            <option>4월</option>
            <option>5월</option>
          </select>
        </div>
      </div>

      {/* Input */}
      <div style={{ position: "relative", marginTop: "4px" }}>
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Write a comment..."
          style={{
            width: "100%",
            border: "1px solid var(--color-border)",
            borderRadius: "8px",
            padding: "12px 40px 12px 12px",
            fontSize: "12px",
            color: "var(--color-text-primary)",
            backgroundColor: "#fff",
            resize: "none",
            height: "60px",
            fontFamily: "inherit",
            boxSizing: "border-box",
            outline: "none",
            boxShadow: "inset 0 1px 2px rgba(0,0,0,0.02)",
          }}
          onFocus={(e) => e.target.style.borderColor = "var(--color-primary-blue)"}
          onBlur={(e) => e.target.style.borderColor = "var(--color-border)"}
        />
        <button style={{
          position: "absolute",
          right: "8px",
          bottom: "12px",
          background: "var(--color-primary-blue)",
          border: "none",
          borderRadius: "6px",
          cursor: "pointer",
          color: "#fff",
          padding: "6px 8px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "opacity 0.2s",
        }}
        onMouseEnter={(e) => e.currentTarget.style.opacity = "0.9"}
        onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}
        >
          <Send size={14} />
        </button>
      </div>

      {/* Separator */}
      <div style={{ height: "1px", backgroundColor: "var(--color-border)", margin: "4px 0" }} />

      {/* Comment list */}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px", flex: 1, overflowY: "auto" }}>
        {comments.map((c, i) => (
          <div key={i} style={{
            backgroundColor: "var(--color-background)",
            borderRadius: "8px",
            padding: "12px",
            fontSize: "12px",
            color: "var(--color-text-primary)",
            lineHeight: "1.5",
          }}>
            <p style={{ margin: "0 0 6px" }}>{c.text}</p>
            <a
              href={c.link}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "var(--color-primary-blue)", fontSize: "11px", textDecoration: "none", fontWeight: "500" }}
              onMouseEnter={(e) => e.currentTarget.style.textDecoration = "underline"}
              onMouseLeave={(e) => e.currentTarget.style.textDecoration = "none"}
            >
              {c.link}
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
