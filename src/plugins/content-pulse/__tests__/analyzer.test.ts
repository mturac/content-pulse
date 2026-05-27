/**
 * ContentPulse Analyzer Tests
 * Vitest test suite for content decay detection
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { analyzeContent, extractTextFromRichText } from '../analyzer'

describe('extractTextFromRichText', () => {
  it('should extract text from plain string', async () => {
    const result = extractTextFromRichText('Hello world')
    expect(result).toBe('Hello world')
  })

  it('should extract text from Lexical JSON structure', async () => {
    const lexicalContent = {
      root: {
        type: 'root',
        children: [
          {
            type: 'paragraph',
            children: [
              { type: 'text', text: 'First paragraph' },
            ],
          },
          {
            type: 'paragraph',
            children: [
              { type: 'text', text: 'Second paragraph' },
            ],
          },
        ],
      },
    }

    const result = extractTextFromRichText(lexicalContent)
    expect(result).toContain('First paragraph')
    expect(result).toContain('Second paragraph')
  })

  it('should handle empty content', async () => {
    expect(extractTextFromRichText(null)).toBe('')
    expect(extractTextFromRichText(undefined)).toBe('')
    expect(extractTextFromRichText('')).toBe('')
  })

  it('should handle nested arrays', async () => {
    const content = [
      [{ type: 'text', text: 'Array ' }],
      [{ type: 'text', text: 'content' }],
    ]
    const result = extractTextFromRichText(content)
    expect(result).toContain('Array')
    expect(result).toContain('content')
  })
})

describe('analyzeContent', () => {
  const defaultConfig = {
    collections: ['posts'],
    maxAgeDays: 365,
  }

  it('should return perfect score for empty content', async () => {
    const result = await analyzeContent('', defaultConfig)
    expect(result.score).toBe(100)
    expect(result.warnings).toHaveLength(0)
  })

  it('should return perfect score for fresh content', async () => {
    const content = {
      root: {
        children: [
          {
            type: 'paragraph',
            children: [{ type: 'text', text: 'This is fresh content from May 2026.' }],
          },
        ],
      },
    }

    const result = await analyzeContent(content, defaultConfig)
    expect(result.score).toBe(100)
    expect(result.warnings).toHaveLength(0)
  })

  it('should detect date decay for old dates', async () => {
    // Use a date that's always old (2020)
    const content = 'Last updated in March 2020.'

    const result = await analyzeContent(content, defaultConfig)

    // Should have at least one warning
    expect(result.warnings.length).toBeGreaterThan(0)

    // Should detect date decay
    const dateWarnings = result.warnings.filter((w) => w.type === 'date_decay')
    expect(dateWarnings.length).toBeGreaterThan(0)

    // Score should be less than 100
    expect(result.score).toBeLessThan(100)
    expect(result.score).toBeGreaterThanOrEqual(0)
  })

  it('should detect version decay', async () => {
    const content = {
      root: {
        children: [
          {
            type: 'paragraph',
            children: [{ type: 'text', text: 'Using version 2.0.0 of the library.' }],
          },
        ],
      },
    }

    const result = await analyzeContent(content, defaultConfig)

    // Should detect version reference
    const versionWarnings = result.warnings.filter((w) => w.type === 'version_decay')
    expect(versionWarnings.length).toBeGreaterThan(0)
  })

  it('should detect year-based version decay', async () => {
    const content = {
      root: {
        children: [
          {
            type: 'paragraph',
            children: [{ type: 'text', text: 'Check the 2025 edition of the guide.' }],
          },
        ],
      },
    }

    const result = await analyzeContent(content, defaultConfig)

    const versionWarnings = result.warnings.filter((w) => w.type === 'version_decay')
    expect(versionWarnings.length).toBeGreaterThan(0)
    expect(versionWarnings[0].severity).toBe('medium') // 1 year old
  })

  it('should calculate lower score for multiple warnings', async () => {
    const content = {
      root: {
        children: [
          {
            type: 'paragraph',
            children: [
              {
                type: 'text',
                text: 'Updated in January 2020 with version 1.0.0. See 2019 edition.',
              },
            ],
          },
        ],
      },
    }

    const result = await analyzeContent(content, defaultConfig)

    // Multiple warnings should result in lower score
    expect(result.warnings.length).toBeGreaterThan(1)
    expect(result.score).toBeLessThan(50)
  })

  it('should handle content without text fields gracefully', async () => {
    const content = {
      root: {
        children: [
          {
            type: 'paragraph',
            children: [{ type: 'text', text: '' }],
          },
        ],
      },
    }

    const result = await analyzeContent(content, defaultConfig)
    expect(result.score).toBe(100)
    expect(result.warnings).toHaveLength(0)
  })

  it('should respect custom maxAgeDays config', async () => {
    // Use a very short max age (30 days)
    const strictConfig = {
      collections: ['posts'],
      maxAgeDays: 30,
    }

    // Use a date that's always old (2019)
    const content = 'Last updated December 2019.'

    const result = await analyzeContent(content, strictConfig)

    // With 30 day max, a date from 2019 should be flagged as critical
    const criticalWarnings = result.warnings.filter((w) => w.severity === 'critical')
    expect(criticalWarnings.length).toBeGreaterThan(0)
  })

  it('should respect analyzer config flags', async () => {
    const noDateConfig = {
      collections: ['posts'],
      analyzers: {
        dates: false,
        versions: true,
      },
    }

    const content = {
      root: {
        children: [
          {
            type: 'paragraph',
            children: [
              { type: 'text', text: 'Updated March 2020 with version 3.0.0' },
            ],
          },
        ],
      },
    }

    const result = await analyzeContent(content, noDateConfig)

    // Should only have version warnings, not date warnings
    const dateWarnings = result.warnings.filter((w) => w.type === 'date_decay')
    const versionWarnings = result.warnings.filter((w) => w.type === 'version_decay')

    expect(dateWarnings).toHaveLength(0)
    expect(versionWarnings.length).toBeGreaterThan(0)
  })

  it('should clamp score between 0 and 100', async () => {
    // Create content with many old dates to push score below 0
    const content = {
      root: {
        children: [
          {
            type: 'paragraph',
            children: [
              {
                type: 'text',
                text: 'Jan 2010, Feb 2010, Mar 2010, Apr 2010, May 2010, Jun 2010',
              },
            ],
          },
        ],
      },
    }

    const result = await analyzeContent(content, defaultConfig)

    // Score should be clamped to 0 minimum
    expect(result.score).toBeGreaterThanOrEqual(0)
    expect(result.score).toBeLessThanOrEqual(100)
  })
})
