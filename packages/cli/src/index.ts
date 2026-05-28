import { readFileSync } from 'fs'
import { extname } from 'path'
import { analyzeText, getScoreLabel, type PulseAnalysisResult } from '@contentpulse/core'

const GREEN = '\u001b[32m'
const YELLOW = '\u001b[33m'
const RED = '\u001b[31m'
const RESET = '\u001b[0m'

export interface CliResult {
  score: number
  warnings: any[]
  exitCode: number
  output?: string
}

function colorForScore(score: number): string {
  if (score >= 80) return GREEN
  if (score >= 60) return YELLOW
  if (score < 40) return RED
  return ''
}

function usage(): string {
  return [
    'Usage:',
    '  contentpulse analyze <filepath> [--format json]',
    '  contentpulse --help',
  ].join('\n')
}

function parseArgs(argv: string[]): { command?: string; filepath?: string; format?: string; help: boolean } {
  const args = argv.slice(2)
  const formatIndex = args.indexOf('--format')

  return {
    command: args[0],
    filepath: args[1],
    format: formatIndex >= 0 ? args[formatIndex + 1] : undefined,
    help: args.includes('--help') || args.includes('-h'),
  }
}

function stripHtmlIfNeeded(filepath: string, content: string): string {
  if (extname(filepath).toLowerCase() !== '.html') return content
  return content.replace(/<[^>]+>/g, ' ')
}

export function formatResult(result: PulseAnalysisResult, format?: string): string {
  if (format === 'json') return JSON.stringify(result)

  const label = getScoreLabel(result.score)
  const color = colorForScore(result.score)
  const scoreLine = `${color}Score: ${result.score}/100 [${label}]${color ? RESET : ''}`
  const lines = [scoreLine]

  if (result.warnings.length > 0) {
    for (const warning of result.warnings) {
      lines.push(`  ⚠  [${warning.type}] ${warning.message}`)
    }
  } else if (result.score === 100) {
    lines.push('  ✓  No decay detected')
  }

  return lines.join('\n')
}

export function runCli(argv: string[]): CliResult {
  const { command, filepath, format, help } = parseArgs(argv)

  if (help) {
    const output = usage()
    console.log(output)
    return { score: 100, warnings: [], exitCode: 0, output }
  }

  if (command !== 'analyze' || !filepath) {
    const output = usage()
    console.error(output)
    return { score: 0, warnings: [], exitCode: 1, output }
  }

  try {
    const fileContent = readFileSync(filepath, 'utf8')
    const content = stripHtmlIfNeeded(filepath, fileContent)
    const result = analyzeText(content)
    const output = formatResult(result, format)
    console.log(output)

    return {
      score: result.score,
      warnings: result.warnings,
      exitCode: result.score < 60 ? 1 : 0,
      output,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    const output = `Failed to read file: ${message}`
    console.error(output)
    return { score: 0, warnings: [], exitCode: 1, output }
  }
}
