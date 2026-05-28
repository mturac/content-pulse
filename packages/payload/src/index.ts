/**
 * @contentpulse/payload — Payload CMS v3 Plugin
 *
 * Drop-in plugin for Payload v3 that injects freshness analysis
 * into any collection via afterChange hooks + hidden pulse fields.
 *
 * @example
 * ```ts
 * // payload.config.ts
 * import { contentPulse } from '@contentpulse/payload'
 *
 * export default buildConfig({
 *   plugins: [
 *     contentPulse({
 *       collections: ['posts', 'articles'],
 *       warningThreshold: 80,
 *       maxAgeDays: 365,
 *     }),
 *   ],
 * })
 * ```
 */
import type { CollectionAfterChangeHook, Field, Plugin } from 'payload'
import { analyzeTexts, appendHistory } from '@contentpulse/core'
import type { PulseHistoryEntry } from '@contentpulse/core'
import type { AnalyzerConfig } from '@contentpulse/core'
import { extractPayloadFields } from './extractor'

// ─── Plugin config ────────────────────────────────────────────────────────────

export interface ContentPulsePayloadConfig extends AnalyzerConfig {
  /** Payload collection slugs to monitor */
  collections: string[]
  /** Score below which warnings appear in the admin (default: 80) */
  warningThreshold?: number
  /** Fields to scan for text content (default: common names) */
  textFields?: string[]
}

const DEFAULT_TEXT_FIELDS = ['content', 'richText', 'body', 'description', 'excerpt']

// ─── Pulse fields injected into each collection ───────────────────────────────

function pulseFields(): Field[] {
  return [
    { name: '_pulseScore', type: 'number', admin: { hidden: true, readOnly: true } },
    { name: '_pulseWarnings', type: 'json', admin: { hidden: true, readOnly: true } },
    { name: '_lastAnalyzedAt', type: 'text', admin: { hidden: true, readOnly: true } },
    {
      name: '_pulseHistory',
      type: 'json',
      label: 'Pulse Score History',
      admin: { readOnly: true, description: 'Rolling 30-entry score history' },
    },
    { name: '_isAnalyzing', type: 'checkbox', admin: { hidden: true }, defaultValue: false },
  ]
}

// ─── afterChange hook ─────────────────────────────────────────────────────────

function makeHook(cfg: ContentPulsePayloadConfig): CollectionAfterChangeHook {
  const textFields = cfg.textFields ?? DEFAULT_TEXT_FIELDS

  return async (args) => {
    const { doc, req, collection } = args  // collection.slug is the authoritative source

    // Guard: skip recursive updates
    if (args.req.context?.skipPulseHook || doc._isAnalyzing) return doc

    const inputs = extractPayloadFields(doc as Record<string, unknown>, textFields)
    if (!inputs.length) return doc

    try {
      const result = analyzeTexts(inputs, cfg)
      const existingHistory = Array.isArray(doc._pulseHistory)
        ? doc._pulseHistory as PulseHistoryEntry[]
        : undefined
      const newHistory = appendHistory(existingHistory, result)

      await req.payload.update({
        collection: collection.slug,  // fix: was reading from doc which doesn't have this field
        id: doc.id as string,
        data: {
          _pulseScore: result.score,
          _pulseWarnings: result.warnings,
          _lastAnalyzedAt: result.analyzedAt,
          _pulseHistory: newHistory,
          _isAnalyzing: false,
        },
        context: { skipPulseHook: true },
      })
    } catch (err) {
      console.error('[ContentPulse] afterChange analysis error:', err)
    }

    return doc
  }
}

// ─── Plugin ───────────────────────────────────────────────────────────────────

export function contentPulse(cfg: ContentPulsePayloadConfig): Plugin {
  return (incomingConfig) => {
    const config = { ...incomingConfig }

    config.collections = (config.collections ?? []).map((collection) => {
      if (!cfg.collections.includes(collection.slug)) return collection

      return {
        ...collection,
        fields: [...collection.fields, ...pulseFields()],
        hooks: {
          ...collection.hooks,
          afterChange: [...(collection.hooks?.afterChange ?? []), makeHook(cfg)],
        },
      }
    })

    return config
  }
}

export default contentPulse

// Re-export core types for convenience
export type { AnalyzerConfig, PulseAnalysisResult, PulseWarning, Severity } from '@contentpulse/core'
export { analyzeText, analyzeTexts, getScoreColor, getScoreLabel } from '@contentpulse/core'
export { extractPayloadFields, extractTextFromLexical } from './extractor'
