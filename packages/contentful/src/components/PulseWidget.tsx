/**
 * @contentpulse/contentful — PulseWidget
 * Sidebar app component for Contentful Entry editor.
 * Uses @contentpulse/core for analysis, @contentpulse/contentful adapter for extraction.
 */
'use client'

import React, { useCallback, useEffect, useState } from 'react'
import type { AppExtensionSDK } from '@contentful/app-sdk'
import { getScoreColor, getScoreLabel } from '@contentpulse/core'
import type { PulseAnalysisResult, PulseWarning, Severity } from '@contentpulse/core'
import { analyzeEntry } from '../adapter'

interface Props {
  sdk: AppExtensionSDK
}

const SEVERITY_COLORS: Record<Severity, string> = {
  critical: '#ff6b6b',
  high: '#ff9800',
  medium: '#ffd54f',
  low: '#81c784',
}

const s = {
  root: { fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', color: '#e0e0e0', padding: 0, minHeight: 200 } as React.CSSProperties,
  center: { textAlign: 'center', padding: '24px 16px', color: '#666', fontSize: 13 } as React.CSSProperties,
  title: { fontSize: 14, fontWeight: 600, color: '#fff', margin: '0 0 12px' } as React.CSSProperties,
  scoreRow: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 } as React.CSSProperties,
  circle: (c: string): React.CSSProperties => ({ width: 48, height: 48, borderRadius: '50%', border: `3px solid ${c}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, color: c, flexShrink: 0 }),
  meta: { flex: 1 } as React.CSSProperties,
  scoreLabel: (c: string): React.CSSProperties => ({ fontSize: 14, fontWeight: 600, color: c, margin: '0 0 4px' }),
  bar: { width: '100%', height: 6, background: 'rgba(255,255,255,.1)', borderRadius: 3, overflow: 'hidden' } as React.CSSProperties,
  fill: (w: number, c: string): React.CSSProperties => ({ width: `${w}%`, height: '100%', background: c, borderRadius: 3, transition: 'width .5s ease' }),
  summary: { fontSize: 12, color: '#999', margin: '4px 0 0' } as React.CSSProperties,
  sectionLabel: { fontSize: 12, fontWeight: 600, color: '#aaa', textTransform: 'uppercase', letterSpacing: '.5px', margin: '16px 0 8px' } as React.CSSProperties,
  filters: { display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' } as React.CSSProperties,
  chip: (active: boolean, c?: string): React.CSSProperties => ({ padding: '4px 10px', borderRadius: 12, border: `1px solid ${active ? c ?? '#666' : '#444'}`, background: active ? `${c ?? '#666'}22` : 'transparent', color: active ? c ?? '#ddd' : '#888', fontSize: 11, cursor: 'pointer' }),
  warningCard: (severity: Severity): React.CSSProperties => ({ background: '#1a1a1a', borderLeft: `3px solid ${SEVERITY_COLORS[severity]}`, borderRadius: 4, padding: '8px 10px', marginBottom: 6 }),
  wType: { fontSize: 10, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '.5px', margin: '0 0 2px' } as React.CSSProperties,
  wMsg: { fontSize: 12, color: '#ccc', margin: '0 0 4px' } as React.CSSProperties,
  wSnip: { fontSize: 11, color: '#666', fontStyle: 'italic', margin: 0 } as React.CSSProperties,
  refreshBtn: { padding: '6px 12px', borderRadius: 4, border: '1px solid #444', background: 'transparent', color: '#aaa', fontSize: 11, cursor: 'pointer', marginTop: 8 } as React.CSSProperties,
  ts: { fontSize: 11, color: '#555', marginTop: 16, textAlign: 'center', display: 'block' } as React.CSSProperties,
}

export const PulseWidget: React.FC<Props> = ({ sdk }) => {
  const [result, setResult] = useState<PulseAnalysisResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Severity | 'all'>('all')

  const run = useCallback(() => {
    setLoading(true)
    try {
      const fields: Record<string, unknown> = {}
      for (const id of Object.keys(sdk.entry.fields)) {
        try { fields[id] = sdk.entry.fields[id].getValue() } catch { /* skip */ }
      }
      const params = sdk.parameters.instance as Record<string, unknown>
      const maxAgeDays = typeof params?.decayThresholdDays === 'number' ? params.decayThresholdDays : 365
      setResult(analyzeEntry(fields, { maxAgeDays }))
    } catch {
      setResult({ score: 100, warnings: [], analyzedAt: new Date().toISOString() })
    } finally {
      setLoading(false)
    }
  }, [sdk])

  useEffect(() => {
    const detach = sdk.entry.onSysChanged(run)
    run()
    return () => { if (typeof detach === 'function') detach() }
  }, [sdk, run])

  if (loading) return <div style={s.root}><div style={s.center}>Analyzing…</div></div>
  if (!result) return <div style={s.root}><div style={s.center}>No data</div></div>

  const color = getScoreColor(result.score)
  const label = getScoreLabel(result.score)
  const severityCounts = result.warnings.reduce<Record<string, number>>((a, w) => { a[w.severity] = (a[w.severity] ?? 0) + 1; return a }, {})
  const shown = filter === 'all' ? result.warnings : result.warnings.filter((w) => w.severity === filter)

  return (
    <div style={s.root}>
      <h2 style={s.title}>ContentPulse</h2>
      <div style={s.scoreRow}>
        <div style={s.circle(color)}>{result.score}</div>
        <div style={s.meta}>
          <p style={s.scoreLabel(color)}>{label}</p>
          <div style={s.bar}><div style={s.fill(result.score, color)} /></div>
          <p style={s.summary}>{result.warnings.length === 0 ? 'No issues found' : `${result.warnings.length} issue(s) detected`}</p>
        </div>
      </div>

      {result.warnings.length > 0 && <>
        <div style={s.sectionLabel}>Filters</div>
        <div style={s.filters}>
          <button style={s.chip(filter === 'all')} onClick={() => setFilter('all')}>All ({result.warnings.length})</button>
          {(['critical', 'high', 'medium', 'low'] as Severity[]).map((sev) =>
            severityCounts[sev] ? (
              <button key={sev} style={s.chip(filter === sev, SEVERITY_COLORS[sev])} onClick={() => setFilter(sev)}>
                {sev} ({severityCounts[sev]})
              </button>
            ) : null
          )}
        </div>

        <div style={s.sectionLabel}>Warnings</div>
        {shown.map((w: PulseWarning) => (
          <div key={w.id} style={s.warningCard(w.severity)}>
            <p style={s.wType}>{w.type.replace(/_/g, ' ')} · {w.severity}</p>
            <p style={s.wMsg}>{w.message}</p>
            {w.originalText && <p style={s.wSnip}>"{w.originalText}"</p>}
          </div>
        ))}
      </>}

      <button style={s.refreshBtn} onClick={run}>Re-analyze</button>
      <span style={s.ts}>Last analyzed: {new Date(result.analyzedAt).toLocaleString()}</span>
    </div>
  )
}

export default PulseWidget
