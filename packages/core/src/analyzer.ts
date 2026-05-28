/**
 * @contentpulse/core — Unified Analyzer
 *
 * Platform-agnostic semantic decay detection.
 * Each platform adapter passes plain text strings here.
 *
 * Detects:
 *   1. date_decay       — stale date references (chrono-node NLP)
 *   2. version_decay    — outdated version strings / year editions
 *   3. stale_reference  — deprecated/legacy/placeholder language
 *   4. tech_decay       — mentions of EOL tech (CRA, Python 2, IE11…)
 */
import * as chrono from 'chrono-node'
import { existsSync, readFileSync } from 'node:fs'
import type { AnalyzerConfig, PulseWarning, Severity, WarningType } from './types'
import { calcScore } from './types'

// ─── ID generation ────────────────────────────────────────────────────────────

let _counter = 0
function nextId(): string {
  return `cpw-${Date.now()}-${++_counter}`
}

// ─── Version patterns ─────────────────────────────────────────────────────────

const DEFAULT_VERSION_PATTERNS: RegExp[] = [
  // Semver — negative lookbehind/ahead to exclude IP addresses (e.g. 192.168.1.1)
  /(?<!\d\.)\b(?:v(?:ersion)?\s*)?(\d+)\.(\d+)\.(\d+)\b(?!\.\d)/gi,
  /\b(20[12]\d)\s+(?:edition|version|release|update)\b/gi,
]

// ─── Stale reference keywords ─────────────────────────────────────────────────

const STALE_REFERENCE_PATTERNS: Array<{
  pattern: RegExp
  severity: Severity
  message: string
}> = [
  {
    pattern: /\b(deprecated|obsolete|legacy|end-of-life|EOL)\b/gi,
    severity: 'high',
    message: 'References a deprecated or obsolete concept',
  },
  {
    pattern: /\b(formerly|previously|used to|was known as)\b/gi,
    severity: 'low',
    message: 'Contains a reference to a past state',
  },
  {
    pattern: /\b(upcoming|planned|in development|coming soon)\b/gi,
    severity: 'medium',
    message: 'Contains a forward-looking statement that may now be outdated',
  },
  {
    pattern: /\b(TBD|TBA|placeholder|TODO|FIXME)\b/gi,
    severity: 'high',
    message: 'Contains placeholder or incomplete content',
  },
]

// ─── Tech Stack Radar ─────────────────────────────────────────────────────────
// Technologies that are EOL, deprecated, or in maintenance mode.
// PRs welcome to expand this dictionary.

type TechRadarEntry = {
  name: string
  pattern: string
  severity: Severity
  message: string
  replacement?: string
  eolDate?: string
}

type TechDecayPattern = {
  pattern: RegExp
  message: string
  severity: Severity
}

const VALID_SEVERITIES = new Set<Severity>(['low', 'medium', 'high', 'critical'])

function isTechRadarEntry(value: unknown): value is TechRadarEntry {
  if (!value || typeof value !== 'object') return false
  const entry = value as Record<string, unknown>

  return (
    typeof entry.name === 'string' &&
    entry.name.length > 0 &&
    typeof entry.pattern === 'string' &&
    entry.pattern.length > 0 &&
    typeof entry.message === 'string' &&
    entry.message.length > 0 &&
    typeof entry.severity === 'string' &&
    VALID_SEVERITIES.has(entry.severity as Severity)
  )
}

function loadTechRadar(): TechRadarEntry[] {
  const paths = [
    new URL('./tech-radar.json', import.meta.url),
    new URL('../src/tech-radar.json', import.meta.url),
  ]
  const path = paths.find((candidate) => existsSync(candidate))
  if (!path) throw new Error('tech-radar.json not found')

  const parsed: unknown = JSON.parse(readFileSync(path, 'utf8'))
  if (!Array.isArray(parsed) || !parsed.every(isTechRadarEntry)) {
    throw new Error('tech-radar.json contains invalid entries')
  }

  return parsed
}

const TECH_DECAY_PATTERNS: TechDecayPattern[] = loadTechRadar().map((entry) => ({
  pattern: new RegExp(entry.pattern, 'gi'),
  message: entry.message,
  severity: entry.severity,
}))

// ─── Detectors ────────────────────────────────────────────────────────────────

function detectDateDecay(
  text: string,
  maxAgeDays: number,
  field?: string
): PulseWarning[] {
  const warnings: PulseWarning[] = []
  const now = new Date()
  const parsed = chrono.parse(text, now)

  for (const result of parsed) {
    const date = result.start.date()
    if (date > now) continue

    const ageDays = Math.floor((now.getTime() - date.getTime()) / 86_400_000)
    if (ageDays <= maxAgeDays) continue

    const ageYears = Math.floor(ageDays / 365)
    let severity: Severity = 'low'
    if (ageDays > maxAgeDays * 3) severity = 'critical'
    else if (ageDays > maxAgeDays * 2) severity = 'high'
    else if (ageDays > maxAgeDays * 1.5) severity = 'medium'

    warnings.push({
      id: nextId(),
      type: 'date_decay',
      severity,
      message: `Stale date: "${result.text}" (${ageYears > 0 ? `${ageYears} year(s)` : `${ageDays} days`} ago)`,
      originalText: result.text,
      suggestion: 'Update this date reference to reflect current information.',
      field,
    })
  }

  return warnings
}

function detectVersionDecay(
  text: string,
  extraPatterns: RegExp[],
  field?: string
): PulseWarning[] {
  const warnings: PulseWarning[] = []
  const patterns = [...DEFAULT_VERSION_PATTERNS, ...extraPatterns]
  const now = new Date()

  for (const pattern of patterns) {
    pattern.lastIndex = 0
    let match: RegExpExecArray | null
    while ((match = pattern.exec(text)) !== null) {
      const raw = match[0]
      const yearMatch = raw.match(/\b(20[12]\d)\b/)

      if (yearMatch) {
        const year = parseInt(yearMatch[1], 10)
        const diff = now.getFullYear() - year
        if (diff < 1) continue

        let severity: Severity = 'low'
        if (diff >= 3) severity = 'critical'
        else if (diff >= 2) severity = 'high'
        else severity = 'medium'

        warnings.push({
          id: nextId(),
          type: 'version_decay',
          severity,
          message: `Outdated year reference: "${raw}" (${diff} year(s) old)`,
          originalText: raw,
          suggestion: 'Update to the current year or remove the year-specific reference.',
          field,
        })
      } else {
        // Generic semver — flag as low unless it's v0/v1 (possibly abandoned)
        const major = parseInt(raw.replace(/^v/, '').split('.')[0], 10)
        const severity: Severity = major <= 1 ? 'medium' : 'low'

        warnings.push({
          id: nextId(),
          type: 'version_decay',
          severity,
          message: `Version string "${raw}" — verify it's still current`,
          originalText: raw,
          suggestion: 'Check if this version is still supported.',
          field,
        })
      }
    }
  }

  return warnings
}

function detectStaleReferences(text: string, field?: string): PulseWarning[] {
  const warnings: PulseWarning[] = []
  // Deduplicate: one warning per (message category + normalised token)
  // Prevents "deprecated" appearing 10× from blowing up the score
  const seen = new Set<string>()

  for (const { pattern, severity, message } of STALE_REFERENCE_PATTERNS) {
    const matches = text.matchAll(pattern)
    for (const match of matches) {
      const key = `${message}::${match[0].toLowerCase()}`
      if (seen.has(key)) continue
      seen.add(key)

      warnings.push({
        id: nextId(),
        type: 'stale_reference',
        severity,
        message: `${message}: "${match[0]}"`,
        originalText: match[0],
        suggestion: 'Review this reference and update or remove as appropriate.',
        field,
      })
    }
  }

  return warnings
}

function detectTechDecay(text: string, field?: string): PulseWarning[] {
  const warnings: PulseWarning[] = []

  for (const { pattern, message, severity } of TECH_DECAY_PATTERNS) {
    if (pattern.test(text)) {
      pattern.lastIndex = 0
      const match = pattern.exec(text)
      warnings.push({
        id: nextId(),
        type: 'tech_decay',
        severity,
        message,
        originalText: match?.[0] ?? '',
        suggestion: 'Replace with a currently supported alternative.',
        field,
      })
    }
    pattern.lastIndex = 0
  }

  return warnings
}

function detectCustomRules(
  text: string,
  rules: NonNullable<AnalyzerConfig['customRules']>,
  field?: string
): PulseWarning[] {
  const warnings: PulseWarning[] = []
  const seen = new Set<string>()

  for (const rule of rules) {
    const pattern = new RegExp(rule.pattern, 'gi')
    let match: RegExpExecArray | null

    while ((match = pattern.exec(text)) !== null) {
      const key = `${rule.message}::${match[0].toLowerCase()}`
      if (seen.has(key)) continue
      seen.add(key)

      warnings.push({
        id: nextId(),
        type: rule.type ?? ('stale_reference' satisfies WarningType),
        severity: rule.severity ?? 'medium',
        message: rule.message,
        originalText: match[0],
        suggestion: rule.suggestion,
        field,
      })
    }
  }

  return warnings
}

// ─── Public API ───────────────────────────────────────────────────────────────

export interface AnalyzeTextInput {
  /** Plain text to analyze */
  text: string
  /** Optional: field name for tracability in warnings */
  field?: string
}

/**
 * Analyze one or more text segments for semantic decay.
 *
 * Adapters should extract plain text from their platform-specific
 * rich text format first, then call this function.
 *
 * @example
 * // Strapi adapter
 * const text = extractStrapiText(doc.body)
 * const result = analyzeTexts([{ text, field: 'body' }], config)
 */
export function analyzeTexts(
  inputs: AnalyzeTextInput[],
  config: AnalyzerConfig = {}
): ReturnType<typeof buildResult> {
  const {
    maxAgeDays = 365,
    analyzers = {},
    customVersionPatterns = [],
    customRules = [],
    locale = 'en',
  } = config

  const {
    dates = true,
    versions = true,
    staleReferences = true,
    techDecay = true,
  } = analyzers

  const extraPatterns = customVersionPatterns.map((p) => new RegExp(p, 'gi'))
  const warnings: PulseWarning[] = []
  const isEnglishLocale = locale.toLowerCase().startsWith('en')

  for (const { text, field } of inputs) {
    if (!text?.trim()) continue
    if (dates && isEnglishLocale) warnings.push(...detectDateDecay(text, maxAgeDays, field))
    if (versions) warnings.push(...detectVersionDecay(text, extraPatterns, field))
    if (staleReferences) warnings.push(...detectStaleReferences(text, field))
    if (techDecay && isEnglishLocale) warnings.push(...detectTechDecay(text, field))
    if (customRules.length) warnings.push(...detectCustomRules(text, customRules, field))
  }

  return buildResult(warnings)
}

function buildResult(warnings: PulseWarning[]) {
  return {
    score: calcScore(warnings),
    warnings,
    analyzedAt: new Date().toISOString(),
  }
}

/** Convenience: analyze a single plain-text string */
export function analyzeText(text: string, config?: AnalyzerConfig) {
  return analyzeTexts([{ text }], config)
}
