/**
 * ContentPulse Plugin - Main Entry
 * PayloadCMS v3 Plugin for Semantic Decay & Freshness Analysis
 */
import type { Plugin } from 'payload'
import { analyzeContentHook } from './hooks/analyzeContent'
import { createPulseFields } from './ui/PulseSidebarWidget'
import type { ContentPulseConfig } from './types'

// Re-export types
export type { ContentPulseConfig, PulseWarning, PulseAnalysisResult } from './types'

// Re-export analyzer functions
export { analyzeContent, extractTextFromRichText } from './analyzer'

/**
 * ContentPulse Plugin for PayloadCMS v3
 *
 * @example
 * ```ts
 * // payload.config.ts
 * import { contentPulse } from './plugins/content-pulse'
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
export const contentPulse = (pluginConfig: ContentPulseConfig): Plugin => {
  return (incomingConfig) => {
    const config = { ...incomingConfig }

    // Validate collections exist
    const validCollections = (config.collections || []).filter((col) =>
      pluginConfig.collections.includes(col.slug)
    )

    if (validCollections.length === 0) {
      console.warn(
        `ContentPulse: None of the specified collections [${pluginConfig.collections.join(', ')}] found in config.`
      )
    }

    // Inject fields and hooks into target collections
    config.collections = (config.collections || []).map((collection) => {
      if (!pluginConfig.collections.includes(collection.slug)) {
        return collection
      }

      return {
        ...collection,
        fields: [
          ...collection.fields,
          ...createPulseFields(),
        ],
        hooks: {
          ...collection.hooks,
          afterChange: [
            ...(collection.hooks?.afterChange || []),
            analyzeContentHook(pluginConfig),
          ],
        },
      }
    })

    // Add admin components if configured
    if (config.admin) {
      config.admin = {
        ...config.admin,
        components: {
          ...config.admin?.components,
        },
      }
    }

    return config
  }
}

// Default export for convenience
export default contentPulse
