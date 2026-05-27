"use client";

import React, { useEffect, useState, useCallback } from "react";
import { AppExtensionSDK } from "@contentful/app-sdk";
import {
  analyzeContent,
  AnalysisResult,
  getScoreColor,
  getScoreLabel,
  Severity,
} from "../services/analyzer";
import WarningCard from "./WarningCard";

interface PulseWidgetProps {
  sdk: AppExtensionSDK;
}

const styles = {
  container: {
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    color: "#e0e0e0",
    padding: "0",
    minHeight: "200px",
  },
  header: {
    marginBottom: "16px",
  },
  title: {
    fontSize: "14px",
    fontWeight: 600 as const,
    color: "#fff",
    margin: "0 0 12px 0",
  },
  scoreContainer: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginBottom: "12px",
  },
  scoreCircle: (color: string) => ({
    width: "48px",
    height: "48px",
    borderRadius: "50%",
    border: `3px solid ${color}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "18px",
    fontWeight: 700 as const,
    color: color,
    flexShrink: 0,
  }),
  scoreMeta: {
    flex: 1,
  },
  scoreLabel: (color: string) => ({
    fontSize: "14px",
    fontWeight: 600 as const,
    color: color,
    margin: "0 0 4px 0",
  }),
  progressBarContainer: {
    width: "100%",
    height: "6px",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: "3px",
    overflow: "hidden",
  },
  progressBar: (width: number, color: string) => ({
    width: `${width}%`,
    height: "100%",
    backgroundColor: color,
    borderRadius: "3px",
    transition: "width 0.5s ease",
  }),
  summary: {
    fontSize: "12px",
    color: "#999",
    margin: "4px 0 0 0",
  },
  sectionTitle: {
    fontSize: "12px",
    fontWeight: 600 as const,
    color: "#aaa",
    textTransform: "uppercase" as const,
    letterSpacing: "0.5px",
    margin: "16px 0 8px 0",
  },
  filterContainer: {
    display: "flex",
    gap: "6px",
    marginBottom: "12px",
    flexWrap: "wrap" as const,
  },
  filterButton: (active: boolean, color?: string) => ({
    padding: "4px 10px",
    borderRadius: "12px",
    border: `1px solid ${active ? color || "#666" : "#444"}`,
    backgroundColor: active ? `${color || "#666"}22` : "transparent",
    color: active ? color || "#ddd" : "#888",
    fontSize: "11px",
    cursor: "pointer",
    transition: "all 0.2s ease",
  }),
  emptyState: {
    textAlign: "center" as const,
    padding: "24px 16px",
    color: "#666",
    fontSize: "13px",
  },
  refreshButton: {
    padding: "6px 12px",
    borderRadius: "4px",
    border: "1px solid #444",
    backgroundColor: "transparent",
    color: "#aaa",
    fontSize: "11px",
    cursor: "pointer",
    marginTop: "8px",
  },
  timestamp: {
    fontSize: "11px",
    color: "#555",
    marginTop: "16px",
    textAlign: "center" as const,
  },
};

const SEVERITY_FILTER_COLORS: Record<Severity, string> = {
  critical: "#ff6b6b",
  high: "#ff9800",
  medium: "#ffd54f",
  low: "#81c784",
};

export const PulseWidget: React.FC<PulseWidgetProps> = ({ sdk }) => {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Severity | "all">("all");

  const runAnalysis = useCallback(() => {
    setLoading(true);
    try {
      const entry = sdk.entry;
      const fields: Record<string, unknown> = {};

      for (const fieldId of Object.keys(entry.fields)) {
        try {
          const field = entry.fields[fieldId];
          const value = field.getValue();
          if (value !== undefined && value !== null) {
            fields[fieldId] = value;
          }
        } catch {
          // Skip fields that can't be read
        }
      }

      const params = sdk.parameters.instance as Record<string, unknown>;
      const thresholdDays =
        typeof params?.decayThresholdDays === "number"
          ? params.decayThresholdDays
          : 365;

      const analysis = analyzeContent(fields, thresholdDays);
      analysis.entryTitle =
        typeof fields["title"] === "string"
          ? (fields["title"] as string)
          : typeof fields["name"] === "string"
          ? (fields["name"] as string)
          : undefined;

      setResult(analysis);
    } catch (err) {
      console.error("ContentPulse analysis error:", err);
      setResult({
        score: 100,
        warnings: [],
        analyzedAt: new Date().toISOString(),
      });
    } finally {
      setLoading(false);
    }
  }, [sdk]);

  useEffect(() => {
    const detach = sdk.entry.onSysChanged(() => {
      runAnalysis();
    });
    runAnalysis();
    return () => {
      if (typeof detach === "function") detach();
    };
  }, [sdk, runAnalysis]);

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.emptyState}>Analyzing content...</div>
      </div>
    );
  }

  if (!result) {
    return (
      <div style={styles.container}>
        <div style={styles.emptyState}>No data available</div>
      </div>
    );
  }

  const scoreColor = getScoreColor(result.score);
  const scoreLabel = getScoreLabel(result.score);

  const severityCounts = result.warnings.reduce(
    (acc, w) => {
      acc[w.severity] = (acc[w.severity] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const filteredWarnings =
    filter === "all"
      ? result.warnings
      : result.warnings.filter((w) => w.severity === filter);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>ContentPulse</h2>
        <div style={styles.scoreContainer}>
          <div style={styles.scoreCircle(scoreColor)}>{result.score}</div>
          <div style={styles.scoreMeta}>
            <p style={styles.scoreLabel(scoreColor)}>{scoreLabel}</p>
            <div style={styles.progressBarContainer}>
              <div style={styles.progressBar(result.score, scoreColor)} />
            </div>
            <p style={styles.summary}>
              {result.warnings.length === 0
                ? "No issues found"
                : `${result.warnings.length} issue${
                    result.warnings.length !== 1 ? "s" : ""
                  } detected`}
            </p>
          </div>
        </div>
      </div>

      {result.warnings.length > 0 && (
        <>
          <div style={styles.sectionTitle}>Filters</div>
          <div style={styles.filterContainer}>
            <button
              style={styles.filterButton(filter === "all")}
              onClick={() => setFilter("all")}
            >
              All ({result.warnings.length})
            </button>
            {(["critical", "high", "medium", "low"] as Severity[]).map(
              (sev) =>
                severityCounts[sev] && (
                  <button
                    key={sev}
                    style={styles.filterButton(
                      filter === sev,
                      SEVERITY_FILTER_COLORS[sev]
                    )}
                    onClick={() => setFilter(sev)}
                  >
                    {sev} ({severityCounts[sev]})
                  </button>
                )
            )}
          </div>

          <div style={styles.sectionTitle}>Warnings</div>
          {filteredWarnings.map((warning) => (
            <WarningCard key={warning.id} warning={warning} />
          ))}
        </>
      )}

      <button style={styles.refreshButton} onClick={runAnalysis}>
        Re-analyze
      </button>
      <div style={styles.timestamp}>
        Last analyzed: {new Date(result.analyzedAt).toLocaleString()}
      </div>
    </div>
  );
};

export default PulseWidget;
