/**
 * PulseSidebarWidget - PayloadCMS Admin UI Entry Point
 * Registers the sidebar widget for the admin panel
 */
import type { Field } from 'payload'

/**
 * Creates hidden fields for pulse analysis data
 */
export function createPulseFields(): Field[] {
  return [
    {
      name: '_pulseScore',
      type: 'number',
      admin: {
        hidden: true,
        readOnly: true,
      },
    },
    {
      name: '_pulseWarnings',
      type: 'json',
      admin: {
        hidden: true,
        readOnly: true,
      },
    },
    {
      name: '_lastAnalyzedAt',
      type: 'text',
      admin: {
        hidden: true,
        readOnly: true,
      },
    },
    {
      name: '_isAnalyzing',
      type: 'checkbox',
      admin: {
        hidden: true,
      },
      defaultValue: false,
    },
  ]
}
