/**
 * @contentpulse/payload — Lexical Rich Text Extractor
 *
 * Converts Payload CMS v3 Lexical JSON to plain strings
 * for consumption by @contentpulse/core analyzer.
 */

/** Recursively extract text from Payload's Lexical JSON structure */
export function extractTextFromLexical(content: unknown): string {
  if (!content) return ''
  if (typeof content === 'string') return content

  if (Array.isArray(content)) {
    return content.map(extractTextFromLexical).filter(Boolean).join(' ')
  }

  if (typeof content === 'object') {
    const obj = content as Record<string, unknown>
    const parts: string[] = []

    // Lexical text node
    if (obj.type === 'text' && typeof obj.text === 'string') {
      parts.push(obj.text)
    }

    // Children / root / nodes
    for (const key of ['children', 'root', 'nodes']) {
      if (obj[key]) parts.push(extractTextFromLexical(obj[key]))
    }

    return parts.filter(Boolean).join(' ')
  }

  return ''
}

/** Normalise Payload document fields into { text, field } pairs */
export function extractPayloadFields(
  doc: Record<string, unknown>,
  textFields: string[]
): Array<{ text: string; field: string }> {
  const result: Array<{ text: string; field: string }> = []

  for (const field of textFields) {
    const value = doc[field]
    if (!value) continue

    const text =
      typeof value === 'string' ? value : extractTextFromLexical(value)

    if (text.trim()) result.push({ text, field })
  }

  return result
}
