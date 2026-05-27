import * as chrono from "chrono-node";
import { Document as RichTextDocument, Node, Text, BLOCKS, INLINES } from "@contentful/rich-text-types";

export type Severity = "critical" | "high" | "medium" | "low";

export interface ContentWarning {
  id: string;
  severity: Severity;
  type: "date_decay" | "version_decay" | "stale_reference";
  message: string;
  suggestion: string;
  field: string;
  snippet?: string;
}

export interface AnalysisResult {
  score: number;
  warnings: ContentWarning[];
  analyzedAt: string;
  entryTitle?: string;
}

const SEVERITY_PENALTY: Record<Severity, number> = {
  critical: 25,
  high: 15,
  medium: 10,
  low: 5,
};

const VERSION_REGEX = /v?\d+\.\d+\.\d+(?:-[\w.]+)?/g;
const YEAR_EDITION_REGEX = /\b(20\d{2})\s+(edition|version|release)\b/gi;
const YEAR_ONLY_REGEX = /\b(20[12]\d)\b/g;

let warningCounter = 0;
function nextId(): string {
  return `w-${Date.now()}-${++warningCounter}`;
}

export function extractTextFromRichText(doc: RichTextDocument | null | undefined): string {
  if (!doc || !doc.content) return "";
  const parts: string[][] = [];

  function walk(node: Node, path: string[] = []): void {
    if (node.nodeType === "text") {
      const textNode = node as Text;
      const text = textNode.value?.trim();
      if (text) {
        parts.push([...path, text]);
      }
    }
    if ("content" in node && node.content) {
      const fieldName =
        node.nodeType === BLOCKS.PARAGRAPH
          ? "paragraph"
          : node.nodeType === BLOCKS.HEADING_1
          ? "h1"
          : node.nodeType === BLOCKS.HEADING_2
          ? "h2"
          : node.nodeType === BLOCKS.HEADING_3
          ? "h3"
          : node.nodeType === BLOCKS.HEADING_4
          ? "h4"
          : node.nodeType === BLOCKS.HEADING_5
          ? "h5"
          : node.nodeType === BLOCKS.HEADING_6
          ? "h6"
          : node.nodeType === BLOCKS.UL_LIST
          ? "list"
          : node.nodeType === BLOCKS.OL_LIST
          ? "ordered-list"
          : node.nodeType === BLOCKS.LIST_ITEM
          ? "list-item"
          : node.nodeType === BLOCKS.QUOTE
          ? "quote"
          : node.nodeType === INLINES.HYPERLINK
          ? "link"
          : node.nodeType;
      for (const child of node.content) {
        walk(child, [...path, fieldName]);
      }
    }
  }

  walk(doc);
  return parts.map((p) => p[p.length - 1]).join(" ");
}

function detectDateDecay(text: string, field: string, thresholdDays: number): ContentWarning[] {
  const warnings: ContentWarning[] = [];
  const now = new Date();
  const parsedDates = chrono.parse(text);

  for (const result of parsedDates) {
    const date = result.start.date();
    const ageMs = now.getTime() - date.getTime();
    const ageDays = ageMs / (1000 * 60 * 60 * 24);

    if (ageDays > thresholdDays) {
      const snippet = result.text;
      const ageYears = Math.floor(ageDays / 365);

      let severity: Severity;
      if (ageDays > 365 * 5) {
        severity = "critical";
      } else if (ageDays > 365 * 3) {
        severity = "high";
      } else if (ageDays > 365 * 2) {
        severity = "medium";
      } else {
        severity = "low";
      }

      warnings.push({
        id: nextId(),
        severity,
        type: "date_decay",
        message: `Date reference "${snippet}" is ${ageYears > 0 ? `${ageYears} year(s)` : `${Math.floor(ageDays)} days`} old`,
        suggestion: `Update this date reference to reflect current information, or remove if no longer relevant.`,
        field,
        snippet,
      });
    }
  }

  return warnings;
}

function detectVersionDecay(text: string, field: string): ContentWarning[] {
  const warnings: ContentWarning[] = [];

  const versionMatches = text.matchAll(VERSION_REGEX);
  for (const match of versionMatches) {
    const version = match[0];
    const parts = version.replace(/^v/, "").split(".").map(Number);
    const major = parts[0];

    let severity: Severity;
    if (major <= 1) {
      severity = "medium";
    } else if (major <= 3) {
      severity = "low";
    } else {
      continue;
    }

    warnings.push({
      id: nextId(),
      severity,
      type: "version_decay",
      message: `Version string "${version}" may reference outdated software`,
      suggestion: `Verify this version is still current. Update to the latest stable version if needed.`,
      field,
      snippet: version,
    });
  }

  const yearEditionMatches = text.matchAll(YEAR_EDITION_REGEX);
  for (const match of yearEditionMatches) {
    const year = parseInt(match[1], 10);
    const currentYear = new Date().getFullYear();
    const age = currentYear - year;

    if (age >= 1) {
      let severity: Severity;
      if (age >= 4) severity = "critical";
      else if (age >= 3) severity = "high";
      else if (age >= 2) severity = "medium";
      else severity = "low";

      warnings.push({
        id: nextId(),
        severity,
        type: "version_decay",
        message: `${year} edition/version reference is ${age} year(s) old`,
        suggestion: `Update to the current year's edition or remove the year-specific reference.`,
        field,
        snippet: match[0],
      });
    }
  }

  return warnings;
}

function detectStaleReferences(text: string, field: string): ContentWarning[] {
  const warnings: ContentWarning[] = [];

  const stalePatterns = [
    { pattern: /\b(formerly|previously|used to|was known as)\b/gi, severity: "low" as Severity, msg: "Contains reference to past state" },
    { pattern: /\b(deprecated|obsolete|legacy|end-of-life|EOL)\b/gi, severity: "high" as Severity, msg: "References deprecated or obsolete concept" },
    { pattern: /\b(soon|upcoming|planned|in development)\b/gi, severity: "medium" as Severity, msg: "Contains forward-looking statement that may be outdated" },
    { pattern: /\b(TBD|TBA|coming soon|placeholder)\b/gi, severity: "high" as Severity, msg: "Contains placeholder or incomplete content" },
  ];

  for (const { pattern, severity, msg } of stalePatterns) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      warnings.push({
        id: nextId(),
        severity,
        type: "stale_reference",
        message: `${msg}: "${match[0]}"`,
        suggestion: `Review this reference and update or remove as appropriate.`,
        field,
        snippet: match[0],
      });
    }
  }

  return warnings;
}

export function analyzeContent(
  fields: Record<string, unknown>,
  thresholdDays: number = 365
): AnalysisResult {
  const allWarnings: ContentWarning[] = [];

  for (const [fieldName, value] of Object.entries(fields)) {
    if (typeof value === "string" && value.trim()) {
      allWarnings.push(...detectDateDecay(value, fieldName, thresholdDays));
      allWarnings.push(...detectVersionDecay(value, fieldName));
      allWarnings.push(...detectStaleReferences(value, fieldName));
    }

    if (value && typeof value === "object" && "content" in (value as Record<string, unknown>)) {
      const text = extractTextFromRichText(value as RichTextDocument);
      if (text.trim()) {
        allWarnings.push(...detectDateDecay(text, fieldName, thresholdDays));
        allWarnings.push(...detectVersionDecay(text, fieldName));
        allWarnings.push(...detectStaleReferences(text, fieldName));
      }
    }
  }

  const totalPenalty = allWarnings.reduce((sum, w) => sum + SEVERITY_PENALTY[w.severity], 0);
  const score = Math.max(0, Math.min(100, 100 - totalPenalty));

  return {
    score,
    warnings: allWarnings,
    analyzedAt: new Date().toISOString(),
  };
}

export function getScoreColor(score: number): string {
  if (score >= 80) return "#4caf50";
  if (score >= 60) return "#ff9800";
  if (score >= 40) return "#ff5722";
  return "#f44336";
}

export function getScoreLabel(score: number): string {
  if (score >= 80) return "Fresh";
  if (score >= 60) return "Aging";
  if (score >= 40) return "Stale";
  return "Critical";
}
