import { describe, it, expect } from 'vitest'
import { analyzeText, analyzeTexts } from '../analyzer'
import { getScoreColor, getScoreLabel, calcScore } from '../types'

// ─── analyzeText ──────────────────────────────────────────────────────────────

describe('analyzeText — clean content', () => {
  it('returns score 100 for empty string', () => {
    const r = analyzeText('')
    expect(r.score).toBe(100)
    expect(r.warnings).toHaveLength(0)
  })

  it('returns score 100 for whitespace-only', () => {
    expect(analyzeText('   \n\t  ').score).toBe(100)
  })

  it('returns score 100 for fresh, unambiguous content', () => {
    const r = analyzeText('This guide explains how to use the product effectively.')
    expect(r.score).toBe(100)
    expect(r.warnings).toHaveLength(0)
  })
})

// ─── date_decay ───────────────────────────────────────────────────────────────

describe('analyzeText — date_decay', () => {
  it('flags a clearly stale year-based date', () => {
    const r = analyzeText('Published January 2019.')
    const w = r.warnings.filter((x) => x.type === 'date_decay')
    expect(w.length).toBeGreaterThan(0)
    expect(r.score).toBeLessThan(100)
  })

  it('does not flag a recent date', () => {
    const r = analyzeText('Updated May 2026.')
    expect(r.warnings.filter((x) => x.type === 'date_decay')).toHaveLength(0)
  })

  it('does not flag future dates', () => {
    const r = analyzeText('Scheduled for January 2030.')
    expect(r.warnings.filter((x) => x.type === 'date_decay')).toHaveLength(0)
  })

  it('severity increases with age', () => {
    const old1 = analyzeText('Written January 2023.', { maxAgeDays: 30 })
    const old3 = analyzeText('Written January 2020.', { maxAgeDays: 30 })
    const w1 = old1.warnings.find((x) => x.type === 'date_decay')!
    const w3 = old3.warnings.find((x) => x.type === 'date_decay')!
    const order = ['low', 'medium', 'high', 'critical']
    expect(order.indexOf(w3.severity)).toBeGreaterThanOrEqual(order.indexOf(w1.severity))
  })
})

// ─── version_decay ────────────────────────────────────────────────────────────

describe('analyzeText — version_decay', () => {
  it('flags a year-edition reference', () => {
    const r = analyzeText('Based on the 2020 edition of the spec.')
    expect(r.warnings.filter((x) => x.type === 'version_decay').length).toBeGreaterThan(0)
  })

  it('flags a semver version string', () => {
    const r = analyzeText('Install v1.0.0 for best results.')
    expect(r.warnings.filter((x) => x.type === 'version_decay').length).toBeGreaterThan(0)
  })

  it('does NOT flag IP addresses as version strings', () => {
    const r = analyzeText('Connect to 192.168.1.1 for admin access.')
    const vw = r.warnings.filter((x) => x.type === 'version_decay')
    expect(vw).toHaveLength(0)
  })

  it('does NOT flag subnet masks', () => {
    const r = analyzeText('Configure your network with 255.255.255.0 subnet mask.')
    const vw = r.warnings.filter((x) => x.type === 'version_decay')
    expect(vw).toHaveLength(0)
  })

  it('still flags real semver adjacent to other numbers', () => {
    const r = analyzeText('Upgrade from v2.1.0 to the latest.')
    const vw = r.warnings.filter((x) => x.type === 'version_decay')
    expect(vw.length).toBeGreaterThan(0)
  })
})

// ─── stale_reference ─────────────────────────────────────────────────────────

describe('analyzeText — stale_reference', () => {
  it('flags "deprecated"', () => {
    const r = analyzeText('This method is deprecated.')
    expect(r.warnings.filter((x) => x.type === 'stale_reference').length).toBeGreaterThan(0)
  })

  it('flags "TBD"', () => {
    const r = analyzeText('Feature specs are TBD.')
    expect(r.warnings.filter((x) => x.type === 'stale_reference').length).toBeGreaterThan(0)
  })

  it('deduplicates — "deprecated" appearing 10× counts as 1 warning', () => {
    const text = Array(10).fill('This is deprecated.').join(' ')
    const r = analyzeText(text)
    const dups = r.warnings.filter((x) => x.type === 'stale_reference' && x.originalText.toLowerCase() === 'deprecated')
    expect(dups).toHaveLength(1)
  })

  it('score does not go negative when content has many stale patterns', () => {
    const text = 'deprecated deprecated deprecated deprecated deprecated deprecated TBD TBD TBD TBD TBD TBD'
    expect(analyzeText(text).score).toBeGreaterThanOrEqual(0)
  })
})

// ─── tech_decay ───────────────────────────────────────────────────────────────

describe('analyzeText — tech_decay (Tech Stack Radar)', () => {
  const cases: [string, string][] = [
    ['Create React App', 'create-react-app is recommended for bootstrapping'],
    ['Python 2', 'This script requires Python 2.7'],
    ['IE11', 'Compatible with Internet Explorer 11'],
    ['AngularJS v1', 'Built with AngularJS framework'],
    ['Node.js EOL', 'Requires Node.js v14 or higher'],
    ['Flash', 'The dashboard uses Adobe Flash'],
    ['Moment.js', 'Date formatting uses moment.js'],
    ['TSLint', 'Linting is configured via tslint'],
  ]

  it.each(cases)('flags %s', (_label, text) => {
    const r = analyzeText(text)
    const tw = r.warnings.filter((x) => x.type === 'tech_decay')
    expect(tw.length).toBeGreaterThan(0)
  })

  it('does NOT flag modern tech as decayed', () => {
    const r = analyzeText('Built with React 18, Vite, and TypeScript 5. Requires Node.js v22.')
    const tw = r.warnings.filter((x) => x.type === 'tech_decay')
    expect(tw).toHaveLength(0)
  })
})

// ─── analyzeTexts — multi-field ───────────────────────────────────────────────

describe('analyzeTexts — multi-field input', () => {
  it('aggregates warnings from multiple fields', () => {
    const r = analyzeTexts([
      { text: 'Written in January 2019.', field: 'body' },
      { text: 'Uses Create React App.', field: 'footer' },
    ])
    const types = new Set(r.warnings.map((w) => w.type))
    expect(types.has('date_decay')).toBe(true)
    expect(types.has('tech_decay')).toBe(true)
  })

  it('field name is carried through to warning', () => {
    const r = analyzeTexts([{ text: 'Written in January 2019.', field: 'intro' }])
    expect(r.warnings[0].field).toBe('intro')
  })

  it('skips empty segments', () => {
    const r = analyzeTexts([
      { text: '', field: 'a' },
      { text: '   ', field: 'b' },
      { text: 'Hello world', field: 'c' },
    ])
    expect(r.score).toBe(100)
  })
})

// ─── analyzedAt ───────────────────────────────────────────────────────────────

describe('analyzeText — metadata', () => {
  it('returns an ISO timestamp in analyzedAt', () => {
    const r = analyzeText('hello')
    expect(() => new Date(r.analyzedAt)).not.toThrow()
    expect(r.analyzedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })
})

// ─── Score helpers ────────────────────────────────────────────────────────────

describe('calcScore', () => {
  it('returns 100 for no warnings', () => {
    expect(calcScore([])).toBe(100)
  })

  it('deducts 25 per critical warning', () => {
    const warns = [
      { id: '1', type: 'date_decay' as const, severity: 'critical' as const, message: '', originalText: '' },
      { id: '2', type: 'date_decay' as const, severity: 'critical' as const, message: '', originalText: '' },
    ]
    expect(calcScore(warns)).toBe(50)
  })

  it('clamps score to 0, never negative', () => {
    const warns = Array.from({ length: 10 }, (_, i) => ({
      id: String(i),
      type: 'date_decay' as const,
      severity: 'critical' as const,
      message: '',
      originalText: '',
    }))
    expect(calcScore(warns)).toBe(0)
  })
})

describe('getScoreColor', () => {
  it('green for ≥ 80', () => expect(getScoreColor(80)).toBe('#4ade80'))
  it('yellow for 60–79', () => expect(getScoreColor(60)).toBe('#fbbf24'))
  it('orange for 40–59', () => expect(getScoreColor(40)).toBe('#fb923c'))
  it('red for < 40', () => expect(getScoreColor(39)).toBe('#ef4444'))
})

describe('getScoreLabel', () => {
  it('Fresh for ≥ 80', () => expect(getScoreLabel(85)).toBe('Fresh'))
  it('Aging for 60–79', () => expect(getScoreLabel(65)).toBe('Aging'))
  it('Stale for 40–59', () => expect(getScoreLabel(45)).toBe('Stale'))
  it('Critical for < 40', () => expect(getScoreLabel(20)).toBe('Critical'))
})
