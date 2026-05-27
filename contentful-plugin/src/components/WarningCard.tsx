import React, { useState } from "react";
import { ContentWarning, Severity } from "../services/analyzer";

const SEVERITY_COLORS: Record<Severity, { bg: string; text: string; border: string }> = {
  critical: { bg: "#4a1a1a", text: "#ff6b6b", border: "#ff6b6b" },
  high: { bg: "#4a2a1a", text: "#ff9800", border: "#ff9800" },
  medium: { bg: "#4a3a1a", text: "#ffd54f", border: "#ffd54f" },
  low: { bg: "#1a3a2a", text: "#81c784", border: "#81c784" },
};

const SEVERITY_ICONS: Record<Severity, string> = {
  critical: "!!!",
  high: "!!",
  medium: "!",
  low: "i",
};

interface WarningCardProps {
  warning: ContentWarning;
}

export const WarningCard: React.FC<WarningCardProps> = ({ warning }) => {
  const [expanded, setExpanded] = useState(false);
  const colors = SEVERITY_COLORS[warning.severity];

  return (
    <div
      style={{
        backgroundColor: colors.bg,
        border: `1px solid ${colors.border}`,
        borderRadius: "6px",
        padding: "12px",
        marginBottom: "8px",
        cursor: "pointer",
        transition: "all 0.2s ease",
      }}
      onClick={() => setExpanded(!expanded)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setExpanded(!expanded);
        }
      }}
      aria-expanded={expanded}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: "20px",
            height: "20px",
            borderRadius: "4px",
            backgroundColor: colors.border,
            color: "#fff",
            fontSize: "10px",
            fontWeight: "bold",
            flexShrink: 0,
            marginTop: "1px",
          }}
        >
          {SEVERITY_ICONS[warning.severity]}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "2px" }}>
            <span
              style={{
                display: "inline-block",
                padding: "1px 6px",
                borderRadius: "3px",
                backgroundColor: `${colors.border}33`,
                color: colors.text,
                fontSize: "10px",
                fontWeight: "bold",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              {warning.severity}
            </span>
            <span
              style={{
                display: "inline-block",
                padding: "1px 6px",
                borderRadius: "3px",
                backgroundColor: "rgba(255,255,255,0.1)",
                color: "#aaa",
                fontSize: "10px",
              }}
            >
              {warning.field}
            </span>
          </div>
          <p
            style={{
              margin: "4px 0 0 0",
              color: "#e0e0e0",
              fontSize: "13px",
              lineHeight: "1.4",
            }}
          >
            {warning.message}
          </p>
        </div>
        <div
          style={{
            color: "#666",
            fontSize: "12px",
            flexShrink: 0,
            transform: expanded ? "rotate(90deg)" : "rotate(0deg)",
            transition: "transform 0.2s ease",
          }}
        >
          {"\u25B6"}
        </div>
      </div>
      {expanded && (
        <div
          style={{
            marginTop: "10px",
            paddingTop: "10px",
            borderTop: `1px solid ${colors.border}33`,
          }}
        >
          {warning.snippet && (
            <div
              style={{
                backgroundColor: "rgba(0,0,0,0.3)",
                borderRadius: "4px",
                padding: "8px 10px",
                marginBottom: "8px",
                fontSize: "12px",
                color: colors.text,
                fontFamily: "monospace",
                wordBreak: "break-all",
              }}
            >
              "{warning.snippet}"
            </div>
          )}
          <p
            style={{
              margin: 0,
              color: "#999",
              fontSize: "12px",
              lineHeight: "1.5",
            }}
          >
            {warning.suggestion}
          </p>
        </div>
      )}
    </div>
  );
};

export default WarningCard;
