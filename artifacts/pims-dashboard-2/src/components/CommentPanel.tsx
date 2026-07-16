import React, { useState } from "react";
import { Send } from "lucide-react";

const comments: { text: string; link: string }[] = [];

export function CommentPanel({ title }: { title: string }) {
  const [inputText, setInputText] = useState("");

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
        <select style={{
          width: "100%",
          border: "1px solid #ccc",
          borderRadius: "4px",
          padding: "4px 8px",
          fontSize: "11px",
          color: "#333",
          backgroundColor: "#fff",
          cursor: "pointer",
        }}>
          <option>6월</option>
          <option>1월</option>
          <option>2월</option>
          <option>3월</option>
          <option>4월</option>
          <option>5월</option>
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
            height: "50px",
            fontFamily: "inherit",
            boxSizing: "border-box",
          }}
        />
        <button style={{
          position: "absolute",
          right: "8px",
          bottom: "8px",
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "#1e6fdd",
          padding: "0",
        }}>
          <Send size={14} />
        </button>
      </div>

      {/* Separator */}
      <div style={{ height: "1px", backgroundColor: "#e8f0f8" }} />

      {/* Comment list */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {comments.map((c, i) => (
          <div key={i} style={{
            backgroundColor: "#f0f5fa",
            borderRadius: "4px",
            padding: "8px",
            fontSize: "11px",
            color: "#333",
            lineHeight: "1.5",
          }}>
            <p style={{ margin: "0 0 4px" }}>{c.text}</p>
            <a
              href={c.link}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#1e6fdd", fontSize: "10px", textDecoration: "underline" }}
            >
              {c.link}
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
