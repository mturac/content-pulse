/**
 * ContentPulse afterChange Hook
 * Runs content analysis after document changes
 */
import type { CollectionAfterChangeHook } from 'payload'
import { analyzeContent } from '../analyzer'
import type { ContentPulseConfig } from '../types'

/**
 * Creates an afterChange hook for content freshness analysis
 */
export function createAnalyzeContentHook(
  config: ContentPulseConfig
): CollectionAfterChangeHook {
  return async ({ doc, req, operation }) => {
    // Skip if no text fields to analyze
    const textFields = ['content', 'richText', 'body', 'description', 'excerpt']
    const hasTextField = textFields.some((field) => doc[field] !== undefined)

    if (!hasTextField) {
      return doc
    }

    // Prevent recursive update loops
    if (doc._isAnalyzing) {
      return doc
    }

    // Find the first available text field
    const contentToAnalyze = textFields
      .map((field) => doc[field])
      .find((value) => value !== undefined)

    if (!contentToAnalyze) {
      return doc
    }

    try {
      // Run analysis
      const result = await analyzeContent(contentToAnalyze, config)

      // Update document with analysis results (using local API to avoid hooks)
      await req.payload.update({
        collection: operation === 'create' ? doc.collection?.slug || '' : doc.collection?.slug || '',
        id: doc.id,
        data: {
          _pulseScore: result.score,
          _pulseWarnings: result.warnings,
          _lastAnalyzedAt: result.analyzedAt,
          _isAnalyzing: true, // Prevent recursive loop
        },
        context: {
          skipPulseHook: true, // Signal to skip this hook on the update
        },
      })

      // Clear the analyzing flag
      await req.payload.update({
        collection: doc.collection?.slug || '',
        id: doc.id,
        data: {
          _isAnalyzing: false,
        },
        context: {
          skipPulseHook: true,
        },
      })
    } catch (error) {
      // Don't fail the save if analysis fails
      console.error('ContentPulse analysis error:', error)
    }

    return doc
  }
}

/**
 * Wrapper hook that checks for skip signal
 */
export function analyzeContentHook(
  config: ContentPulseConfig
): CollectionAfterChangeHook {
  const hook = createAnalyzeContentHook(config)

  return async (args) => {
    // Skip if context signals to skip
    if (args.req.context?.skipPulseHook) {
      return args.doc
    }

    return hook(args)
  }
}
