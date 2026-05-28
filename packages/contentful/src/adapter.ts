/**
 * @contentpulse/contentful — Analyzer Adapter
 *
 * Bridges Contentful-specific field extraction to @contentpulse/core.
 */
import { analyzeTexts } from '@contentpulse/core'
import type { AnalyzerConfig, PulseAnalysisResult } from '@contentpulse/core'
import { extractFields } from './extractor'

export function analyzeEntry(
  rawFields: Record<string, unknown>,
  config: AnalyzerConfig = {}
): PulseAnalysisResult {
  const inputs = extractFields(rawFields)
  if (!inputs.length) {
    return { score: 100, warnings: [], analyzedAt: new Date().toISOString() }
  }
  return analyzeTexts(inputs, config)
}
