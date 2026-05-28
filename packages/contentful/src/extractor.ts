/**
 * @contentpulse/contentful — Rich Text Extractor
 *
 * Converts Contentful rich-text Document format to plain string
 * for consumption by @contentpulse/core analyzer.
 */
import type { Document as RichTextDocument, Node, Text } from '@contentful/rich-text-types'
import { BLOCKS } from '@contentful/rich-text-types'

export function extractTextFromRichText(doc: RichTextDocument | null | undefined): string {
  if (!doc?.content) return ''
  const parts: string[] = []

  function walk(node: Node): void {
    if (node.nodeType === 'text') {
      const text = (node as Text).value?.trim()
      if (text) parts.push(text)
    }
    const block = node as { content?: Node[] }
    if (Array.isArray(block.content)) {
      for (const child of block.content) walk(child)
    }
  }

  walk(doc as unknown as Node)
  return parts.join(' ')
}

/** Normalise all fields from a Contentful entry to { fieldId → plain string } */
export function extractFields(
  rawFields: Record<string, unknown>
): Array<{ text: string; field: string }> {
  const result: Array<{ text: string; field: string }> = []

  for (const [fieldId, value] of Object.entries(rawFields)) {
    if (typeof value === 'string' && value.trim()) {
      result.push({ text: value, field: fieldId })
      continue
    }

    // Contentful rich text object
    if (
      value &&
      typeof value === 'object' &&
      'nodeType' in (value as Record<string, unknown>) &&
      (value as Record<string, unknown>).nodeType === BLOCKS.DOCUMENT
    ) {
      const text = extractTextFromRichText(value as RichTextDocument)
      if (text) result.push({ text, field: fieldId })
    }
  }

  return result
}
