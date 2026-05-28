/**
 * @contentpulse/core — Shared Types
 *
 * Platform-agnostic types shared across all ContentPulse adapters
 * (Contentful, Payload, Strapi, etc.)
 */

// ─── Warning ──────────────────────────────────────────────────────────────────

export type Severity = 'critical' | 'high' | 'medium' | 'low'

export type WarningType =
  | 'date_decay'
  | 'version_decay'
  | 'stale_reference'
  | 'tech_decay'

export interface PulseWarning {
  /** Unique ID for this warning (useful for React keys and deduplication) */
  id: string
  /** Category of decay detected */
  type: WarningType
  /** How severe this decay is */
  severity: Severity
  /** Human-readable description */
  message: string
  /** The original text fragment that triggered this warning */
  originalText: string
  /** Optional: suggested fix */
  suggestion?: string
  /** Optional: field name in the source document */
  field?: string
}

// ─── Analysis Result ──────────────────────────────────────────────────────────

export interface PulseAnalysisResult {
  /** Freshness score: 0 (fully decayed) → 100 (perfectly fresh) */
  score: number
  warnings: PulseWarning[]
  analyzedAt: string
}

// ─── Config ───────────────────────────────────────────────────────────────────

export interface AnalyzerConfig {
  /** Days before a date reference is considered stale (default: 365) */
  maxAgeDays?: number
  /** Enable/disable individual analyzers */
  analyzers?: {
    dates?: boolean
    versions?: boolean
    staleReferences?: boolean
    techDecay?: boolean
  }
  /** Extra version patterns as regex strings */
  customVersionPatterns?: string[]
}

// ─── Score Helpers ────────────────────────────────────────────────────────────

export const SEVERITY_PENALTY: Record<Severity, number> = {
  critical: 25,
  high: 15,
  medium: 10,
  low: 5,
}

export function getScoreColor(score: number): string {
  if (score >= 80) return '#4ade80'
  if (score >= 60) return '#fbbf24'
  if (score >= 40) return '#fb923c'
  return '#ef4444'
}

export function getScoreLabel(score: number): string {
  if (score >= 80) return 'Fresh'
  if (score >= 60) return 'Aging'
  if (score >= 40) return 'Stale'
  return 'Critical'
}

export function calcScore(warnings: PulseWarning[]): number {
  const penalty = warnings.reduce((sum, w) => sum + SEVERITY_PENALTY[w.severity], 0)
  return Math.max(0, Math.min(100, 100 - penalty))
}
