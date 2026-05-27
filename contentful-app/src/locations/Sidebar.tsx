/**
 * ContentPulse Sidebar for Contentful
 * Content freshness widget for Contentful App
 */
import React, { useEffect, useState, useCallback } from 'react'
import { useSDK } from '@contentful/react-apps-toolkit'
import { Box, Flex, Text, Badge, ProgressBar, Note } from '@contentful/f36-components'
import * as chrono from 'chrono-node'

interface PulseWarning {
  type: 'date_decay' | 'version_decay'
  severity: 'low' | 'medium' | 'high' | 'critical'
  message: string
  originalText: string
}

interface PulseResult {
  score: number
  warnings: PulseWarning[]
}

const DEFAULT_VERSION_PATTERNS = [
  /\b(?:v(?:ersion)?\s*)?(\d+)\.(\d+)\.(\d+)\b/gi,
  /\b(20[12]\d)\s+(?:edition|version|release|update)\b/gi,
]

const severityColors: Record<string, string> = {
  critical: '#ff4444',
  high: '#ff8844',
  medium: '#ffcc44',
  low: '#44cc66',
}

function extractText(content: unknown): string {
  if (!content) return ''
  if (typeof content === 'string') return content
  if (Array.isArray(content)) return content.map(extractText).join(' ')
  if (typeof content === 'object' && content !== null) {
    const obj = content as Record<string, unknown>
    const parts: string[] = []
    if (obj.nodeType === 'text' && typeof obj.value === 'string') parts.push(obj.value)
    if (Array.isArray(obj.content)) parts.push(extractText(obj.content))
    return parts.filter(Boolean).join(' ')
  }
  return ''
}

function analyzeContent(content: unknown, maxAgeDays = 365): PulseResult {
  const text = extractText(content)
  const now = new Date()
  const warnings: PulseWarning[] = []

  if (!text.trim()) return { score: 100, warnings: [] }

  // Date decay
  const parsedDates = chrono.parse(text, now)
  for (const d of parsedDates) {
    const date = d.start.date()
    if (date > now) continue
    const ageDays = Math.floor((now.getTime() - date.getTime()) / 86400000)
    if (ageDays > maxAgeDays) {
      let severity: PulseWarning['severity'] = 'low'
      if (ageDays > maxAgeDays * 3) severity = 'critical'
      else if (ageDays > maxAgeDays * 2) severity = 'high'
      else if (ageDays > maxAgeDays * 1.5) severity = 'medium'
      warnings.push({ type: 'date_decay', severity, message: `Stale date: "${d.text}" (${ageDays}d)`, originalText: d.text })
    }
  }

  // Version decay
  for (const pattern of DEFAULT_VERSION_PATTERNS) {
    pattern.lastIndex = 0
    let match: RegExpExecArray | null
    while ((match = pattern.exec(text)) !== null) {
      const yearMatch = match[0].match(/\b(20[12]\d)\b/)
      if (yearMatch) {
        const diff = now.getFullYear() - parseInt(yearMatch[1], 10)
        if (diff >= 1) {
          let severity: PulseWarning['severity'] = 'low'
          if (diff >= 3) severity = 'critical'
          else if (diff >= 2) severity = 'high'
          else if (diff >= 1) severity = 'medium'
          warnings.push({ type: 'version_decay', severity, message: `Outdated: "${match[0]}" (${diff}y)`, originalText: match[0] })
        }
      }
    }
  }

  let score = 100
  for (const w of warnings) {
    if (w.severity === 'critical') score -= 25
    else if (w.severity === 'high') score -= 15
    else if (w.severity === 'medium') score -= 10
    else score -= 5
  }

  return { score: Math.max(0, Math.min(100, score)), warnings }
}

export const Sidebar: React.FC = () => {
  const sdk = useSDK()
  const [result, setResult] = useState<PulseResult | null>(null)

  const runAnalysis = useCallback(() => {
    const fields = sdk.entry.fields
    const textFields = ['content', 'body', 'description', 'richText']

    for (const fieldName of textFields) {
      const field = fields[fieldName]
      if (field) {
        const value = field.getValue()
        if (value) {
          setResult(analyzeContent(value))
          return
        }
      }
    }
    setResult(null)
  }, [sdk])

  useEffect(() => {
    runAnalysis()
    const detach = sdk.entry.onSysChanged(() => {
      setTimeout(runAnalysis, 1000)
    })
    return () => detach?.()
  }, [sdk, runAnalysis])

  if (!result) {
    return (
      <Box padding="spacingM">
        <Note variant="secondary">
          Save entry to analyze content freshness
        </Note>
      </Box>
    )
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'positive'
    if (score >= 60) return 'warning'
    return 'negative'
  }

  return (
    <Box padding="spacingM">
      <Flex justifyContent="space-between" alignItems="center" marginBottom="spacingS">
        <Text fontColor="gray600" fontSize="fontSizeS" fontWeight="fontWeightDemiBold">
          CONTENT PULSE
        </Text>
        <Text
          fontSize="fontSize2Xl"
          fontWeight="fontWeightBold"
          fontColor={getScoreColor(result.score) === 'positive' ? 'green600' : getScoreColor(result.score) === 'warning' ? 'orange600' : 'red600'}
        >
          {result.score}
        </Text>
      </Flex>

      <ProgressBar
        value={result.score}
        variant={getScoreColor(result.score)}
        marginBottom="spacingM"
      />

      {result.warnings.length > 0 ? (
        <Flex flexDirection="column" gap="spacingXs">
          {result.warnings.map((w, i) => (
            <Box
              key={i}
              padding="spacingS"
              backgroundColor="gray100"
              borderRadius="medium"
              borderLeftColor={severityColors[w.severity] as any}
              borderLeftSize="3px"
            >
              <Flex gap="spacingXs" alignItems="center" marginBottom="spacing2Xs">
                <Badge variant={w.severity === 'critical' || w.severity === 'high' ? 'negative' : w.severity === 'medium' ? 'warning' : 'positive'} size="small">
                  {w.severity}
                </Badge>
                <Text fontSize="fontSizeXs" fontColor="gray500">
                  {w.type.replace('_', ' ')}
                </Text>
              </Flex>
              <Text fontSize="fontSizeS">{w.message}</Text>
            </Box>
          ))}
        </Flex>
      ) : (
        <Note variant="positive">Content is fresh</Note>
      )}
    </Box>
  )
}
