/**
 * ContentPulse Analyzer Engine
 * Detects semantic decay in PayloadCMS content
 */
import * as chrono from 'chrono-node'
import type { PulseWarning, PulseAnalysisResult, ContentPulseConfig } from '../types'

// Default config values
const DEFAULT_WARNING_THRESHOLD = 80
const DEFAULT_MAX_AGE_DAYS = 365
const DEFAULT_VERSION_PATTERNS = [
  // Version X.Y.Z patterns (e.g., "v2.0.0", "version 1.5.3")
  /\b(?:v(?:ersion)?\s*)?(\d+)\.(\d+)\.(\d+)\b/gi,
  // Year-based versions (e.g., "2023 edition", "2024 version")
  /\b(20[12]\d)\s+(?:edition|version|release|update)\b/gi,
]

/**
 * Extract plain text from Lexical/RichText JSON recursively
 */
export function extractTextFromRichText(content: unknown): string {
  if (!content) return ''
  if (typeof content === 'string') return content

  if (Array.isArray(content)) {
    return content.map(extractTextFromRichText).join(' ')
  }

  if (typeof content === 'object' && content !== null) {
    const obj = content as Record<string, unknown>
    const parts: string[] = []

    // Lexical text nodes
    if (obj.type === 'text' && typeof obj.text === 'string') {
      parts.push(obj.text)
    }

    // Recurse into children
    if (Array.isArray(obj.children)) {
      parts.push(extractTextFromRichText(obj.children))
    }

    // Recurse into root
    if (obj.root && typeof obj.root === 'object') {
      parts.push(extractTextFromRichText(obj.root))
    }

    // Recurse into nodes array
    if (Array.isArray(obj.nodes)) {
      parts.push(extractTextFromRichText(obj.nodes))
    }

    return parts.filter(Boolean).join(' ')
  }

  return ''
}

/**
 * Detect date-based decay warnings
 */
function detectDateDecay(
  text: string,
  maxAgeDays: number,
  now: Date
): PulseWarning[] {
  const warnings: PulseWarning[] = []
  const parsedDates = chrono.parse(text, now)

  for (const dateResult of parsedDates) {
    const dateText = dateResult.text
    const parsedDate = dateResult.start.date()

    // Skip future dates
    if (parsedDate > now) continue

    const ageMs = now.getTime() - parsedDate.getTime()
    const ageDays = Math.floor(ageMs / (1000 * 60 * 60 * 24))

    if (ageDays > maxAgeDays) {
      const ageYears = Math.floor(ageDays / 365)
      let severity: PulseWarning['severity'] = 'low'
      let suggestion = `This date is ${ageDays} days old.`

      if (ageDays > maxAgeDays * 3) {
        severity = 'critical'
        suggestion = `This date is ${ageYears}+ years old and likely outdated. Consider updating.`
      } else if (ageDays > maxAgeDays * 2) {
        severity = 'high'
        suggestion = `This date is over ${ageYears} year(s) old. Review for accuracy.`
      } else if (ageDays > maxAgeDays * 1.5) {
        severity = 'medium'
        suggestion = `This date is ${ageDays} days old. Verify it's still current.`
      }

      warnings.push({
        type: 'date_decay',
        severity,
        message: `Stale date detected: "${dateText}" (${ageDays} days ago)`,
        originalText: dateText,
        suggestion,
      })
    }
  }

  return warnings
}

/**
 * Detect version string decay warnings
 */
function detectVersionDecay(
  text: string,
  patterns: RegExp[]
): PulseWarning[] {
  const warnings: PulseWarning[] = []

  for (const pattern of patterns) {
    // Reset lastIndex for global regexes
    pattern.lastIndex = 0
    let match: RegExpExecArray | null

    while ((match = pattern.exec(text)) !== null) {
      const matchedText = match[0]

      // For year-based versions, check if the year is old
      const yearMatch = matchedText.match(/\b(20[12]\d)\b/)
      if (yearMatch) {
        const year = parseInt(yearMatch[1], 10)
        const currentYear = new Date().getFullYear()
        const yearDiff = currentYear - year

        if (yearDiff >= 1) {
          let severity: PulseWarning['severity'] = 'low'
          if (yearDiff >= 3) severity = 'critical'
          else if (yearDiff >= 2) severity = 'high'
          else if (yearDiff >= 1) severity = 'medium'

          warnings.push({
            type: 'version_decay',
            severity,
            message: `Outdated version reference: "${matchedText}" (${yearDiff} year(s) old)`,
            originalText: matchedText,
            suggestion: `Consider updating to the current year/version.`,
          })
        }
      } else {
        // Generic version string found - flag as potential decay
        warnings.push({
          type: 'version_decay',
          severity: 'low',
          message: `Version reference detected: "${matchedText}" - verify it's current`,
          originalText: matchedText,
          suggestion: `Check if this version is still supported or current.`,
        })
      }
    }
  }

  return warnings
}

/**
 * Analyze content for semantic decay
 */
export async function analyzeContent(
  content: unknown,
  config: ContentPulseConfig = { collections: [] }
): Promise<PulseAnalysisResult> {
  const maxAgeDays = config.maxAgeDays ?? DEFAULT_MAX_AGE_DAYS
  const analyzers = config.analyzers ?? { dates: true, versions: true, custom: false }

  // Extract plain text from rich text content
  const text = extractTextFromRichText(content)

  if (!text.trim()) {
    return {
      score: 100,
      warnings: [],
      analyzedAt: new Date().toISOString(),
    }
  }

  const now = new Date()
  const warnings: PulseWarning[] = []

  // Run date decay detection
  if (analyzers.dates !== false) {
    warnings.push(...detectDateDecay(text, maxAgeDays, now))
  }

  // Run version decay detection
  if (analyzers.versions !== false) {
    const patterns = [
      ...DEFAULT_VERSION_PATTERNS,
      ...(config.customVersionPatterns?.map((p) => new RegExp(p, 'gi')) ?? []),
    ]
    warnings.push(...detectVersionDecay(text, patterns))
  }

  // Calculate freshness score (100 = perfectly fresh, 0 = completely stale)
  let score = 100

  for (const warning of warnings) {
    switch (warning.severity) {
      case 'critical':
        score -= 25
        break
      case 'high':
        score -= 15
        break
      case 'medium':
        score -= 10
        break
      case 'low':
        score -= 5
        break
    }
  }

  // Clamp score to 0-100
  score = Math.max(0, Math.min(100, score))

  return {
    score,
    warnings,
    analyzedAt: now.toISOString(),
  }
}
