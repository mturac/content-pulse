/**
 * @contentpulse/core
 *
 * Shared semantic decay analysis engine.
 * Import this in any platform adapter.
 */
export { analyzeText, analyzeTexts } from './analyzer'
export type { AnalyzeTextInput } from './analyzer'
export { checkLinks, extractUrls } from './link-checker'
export type { LinkCheckOptions, LinkCheckResult } from './link-checker'
export {
  appendHistory,
  calcScore,
  getScoreColor,
  getScoreLabel,
  SEVERITY_PENALTY,
} from './types'
export type {
  AnalyzerConfig,
  PulseAnalysisResult,
  PulseHistoryEntry,
  PulseWarning,
  Severity,
  WarningType,
} from './types'
