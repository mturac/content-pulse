'use client'
/**
 * PulseSidebarWidget - React Client Component
 * Displays content freshness score and decay warnings
 */
import React, { useEffect, useState } from 'react'
import type { PulseWarning } from '../../types'

// Inline styles for Payload Admin UI compatibility
const styles = {
  container: {
    padding: '16px',
    backgroundColor: '#1a1a2e',
    borderRadius: '8px',
    border: '1px solid #2d2d44',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '12px',
  },
  title: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#a0a0b8',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    margin: 0,
  },
  scoreContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  score: {
    fontSize: '24px',
    fontWeight: 700,
    lineHeight: 1,
  },
  scoreLabel: {
    fontSize: '11px',
    color: '#6b6b80',
  },
  progressBar: {
    height: '6px',
    backgroundColor: '#2d2d44',
    borderRadius: '3px',
    overflow: 'hidden',
    marginBottom: '16px',
  },
  progressFill: {
    height: '100%',
    borderRadius: '3px',
    transition: 'width 0.3s ease',
  },
  statusText: {
    fontSize: '12px',
    color: '#8888a0',
    marginBottom: '12px',
  },
  warningsContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
  },
  warningCard: {
    padding: '10px 12px',
    borderRadius: '6px',
    fontSize: '12px',
    lineHeight: '1.4',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
  },
  warningHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginBottom: '4px',
  },
  severityBadge: {
    fontSize: '10px',
    fontWeight: 600,
    padding: '2px 6px',
    borderRadius: '3px',
    textTransform: 'uppercase' as const,
  },
  warningType: {
    fontSize: '11px',
    color: '#6b6b80',
  },
  warningMessage: {
    fontSize: '12px',
    color: '#c0c0d0',
  },
  warningSuggestion: {
    fontSize: '11px',
    color: '#8888a0',
    marginTop: '4px',
    fontStyle: 'italic',
  },
  emptyState: {
    textAlign: 'center' as const,
    padding: '20px',
    color: '#6b6b80',
    fontSize: '13px',
  },
  freshIcon: {
    fontSize: '32px',
    marginBottom: '8px',
  },
}

// Severity color mapping
const severityColors: Record<string, { bg: string; text: string; badge: string }> = {
  critical: { bg: '#2d1518', text: '#ff6b6b', badge: '#ff4444' },
  high: { bg: '#2d1f15', text: '#ffa06b', badge: '#ff8844' },
  medium: { bg: '#2d2a15', text: '#ffd06b', badge: '#ffcc44' },
  low: { bg: '#152d1a', text: '#6bffa0', badge: '#44cc66' },
}

// Warning type icons
const typeIcons: Record<string, string> = {
  date_decay: '📅',
  version_decay: '🔖',
  custom: '⚡',
}

/**
 * Get color based on score value
 */
function getScoreColor(score: number): string {
  if (score >= 80) return '#4ade80' // Green
  if (score >= 60) return '#fbbf24' // Yellow
  if (score >= 40) return '#fb923c' // Orange
  return '#ef4444' // Red
}

/**
 * Get status text based on score
 */
function getStatusText(score: number): string {
  if (score >= 90) return 'Excellent - Content is fresh'
  if (score >= 80) return 'Good - Content is mostly current'
  if (score >= 60) return 'Fair - Some updates needed'
  if (score >= 40) return 'Poor - Significant updates required'
  return 'Critical - Content is severely outdated'
}

/**
 * Expandable warning card component
 */
function WarningCard({ warning }: { warning: PulseWarning }) {
  const [expanded, setExpanded] = useState(false)
  const colors = severityColors[warning.severity] || severityColors.low

  return (
    <div
      style={{
        ...styles.warningCard,
        backgroundColor: colors.bg,
        border: `1px solid ${colors.text}20`,
      }}
      onClick={() => setExpanded(!expanded)}
    >
      <div style={styles.warningHeader}>
        <span>{typeIcons[warning.type] || '⚠️'}</span>
        <span
          style={{
            ...styles.severityBadge,
            backgroundColor: colors.badge,
            color: '#000',
          }}
        >
          {warning.severity}
        </span>
        <span style={styles.warningType}>{warning.type.replace('_', ' ')}</span>
      </div>
      <div style={styles.warningMessage}>{warning.message}</div>
      {expanded && warning.suggestion && (
        <div style={styles.warningSuggestion}>💡 {warning.suggestion}</div>
      )}
    </div>
  )
}

/**
 * Main PulseSidebarWidget component
 */
export function PulseSidebarWidget() {
  const [score, setScore] = useState<number | null>(null)
  const [warnings, setWarnings] = useState<PulseWarning[]>([])
  const [lastAnalyzed, setLastAnalyzed] = useState<string | null>(null)

  // In a real PayloadCMS admin, these would come from useDocumentInfo/useForm
  // For now, we'll read from the document data if available
  useEffect(() => {
    // Try to read from global document data (Payload Admin pattern)
    const readDocumentData = () => {
      try {
        // Payload Admin stores form state in window.__payloadFormState
        const formState = (window as unknown as Record<string, unknown>).__payloadFormState as
          | Record<string, { value?: unknown }>
          | undefined

        if (formState) {
          if (formState._pulseScore?.value !== undefined) {
            setScore(formState._pulseScore.value as number)
          }
          if (formState._pulseWarnings?.value) {
            setWarnings(formState._pulseWarnings.value as PulseWarning[])
          }
          if (formState._lastAnalyzedAt?.value) {
            setLastAnalyzed(formState._lastAnalyzedAt.value as string)
          }
        }
      } catch {
        // Fallback: show loading state
      }
    }

    readDocumentData()

    // Poll for updates (Payload Admin pattern)
    const interval = setInterval(readDocumentData, 2000)
    return () => clearInterval(interval)
  }, [])

  // Loading state
  if (score === null) {
    return (
      <div style={styles.container}>
        <div style={styles.emptyState}>
          <div style={styles.freshIcon}>⏳</div>
          <div>Analyzing content freshness...</div>
          <div style={{ fontSize: '11px', marginTop: '4px', color: '#555' }}>
            Save the document to run analysis
          </div>
        </div>
      </div>
    )
  }

  const scoreColor = getScoreColor(score)
  const statusText = getStatusText(score)

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h3 style={styles.title}>Content Pulse</h3>
        <div style={styles.scoreContainer}>
          <span style={{ ...styles.score, color: scoreColor }}>{score}</span>
          <span style={styles.scoreLabel}>/ 100</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div style={styles.progressBar}>
        <div
          style={{
            ...styles.progressFill,
            width: `${score}%`,
            backgroundColor: scoreColor,
          }}
        />
      </div>

      {/* Status */}
      <div style={styles.statusText}>{statusText}</div>

      {/* Warnings */}
      {warnings.length > 0 ? (
        <div style={styles.warningsContainer}>
          {warnings.map((warning, index) => (
            <WarningCard key={`${warning.type}-${index}`} warning={warning} />
          ))}
        </div>
      ) : (
        <div style={{ ...styles.emptyState, padding: '12px' }}>
          <div style={{ fontSize: '20px', marginBottom: '4px' }}>✨</div>
          <div>No decay detected</div>
        </div>
      )}

      {/* Last Analyzed */}
      {lastAnalyzed && (
        <div
          style={{
            marginTop: '12px',
            fontSize: '10px',
            color: '#555',
            textAlign: 'center',
          }}
        >
          Last analyzed: {new Date(lastAnalyzed).toLocaleString()}
        </div>
      )}
    </div>
  )
}
