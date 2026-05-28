/**
 * @contentpulse/core
 *
 * Shared semantic decay analysis engine.
 * Import this in any platform adapter.
 */
export { analyzeText, analyzeTexts } from './analyzer'
export type { AnalyzeTextInput } from './analyzer'
export {
  calcScore,
  getScoreColor,
  getScoreLabel,
  SEVERITY_PENALTY,
} from './types'
export type {
  AnalyzerConfig,
  PulseAnalysisResult,
  PulseWarning,
  Severity,
  WarningType,
} from './types'
