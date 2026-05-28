/**
 * @contentpulse/core — Broken Link Detector
 *
 * Async service. Called separately from the sync analyzeTexts().
 * Extracts URLs from plain text, performs HTTP HEAD checks,
 * returns url_rot PulseWarnings for broken/unreachable links.
 */
import type { PulseWarning } from './types'

export interface LinkCheckOptions {
  timeout?: number
  concurrency?: number
  excludePatterns?: string[]
  userAgent?: string
}

export interface LinkCheckResult {
  url: string
  status: number | null
  ok: boolean
  warning?: PulseWarning
}

export function extractUrls(text: string): string[] {
  const urlRegex = /https?:\/\/[^\s<>"'`)\]]+/gi
  const matches = text.match(urlRegex) ?? []
  const cleaned = matches.map((u) => u.replace(/[.,;:!?]+$/, ''))
  return [...new Set(cleaned)]
}

async function checkOne(url: string, opts: LinkCheckOptions): Promise<LinkCheckResult> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), opts.timeout ?? 8000)
  try {
    const res = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      headers: { 'User-Agent': opts.userAgent ?? 'ContentPulse/1.0 LinkChecker' },
      redirect: 'follow',
    })
    clearTimeout(timer)
    const ok = res.status < 400
    return {
      url,
      status: res.status,
      ok,
      warning: ok
        ? undefined
        : {
            id: `cpw-link-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            type: 'url_rot',
            severity: res.status >= 500 ? 'high' : 'medium',
            message: `Broken link: "${url}" returned HTTP ${res.status}`,
            originalText: url,
            suggestion: 'Update or remove this link.',
          },
    }
  } catch (err) {
    clearTimeout(timer)
    const isTimeout = (err as Error).name === 'AbortError'
    return {
      url,
      status: null,
      ok: false,
      warning: {
        id: `cpw-link-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        type: 'url_rot',
        severity: 'medium',
        message: `Unreachable link: "${url}" (${isTimeout ? 'timeout' : 'network error'})`,
        originalText: url,
        suggestion: 'Verify this URL is still accessible.',
      },
    }
  }
}

export async function checkLinks(
  text: string,
  options: LinkCheckOptions = {}
): Promise<LinkCheckResult[]> {
  const { concurrency = 5, excludePatterns = [] } = options
  const excludeRegexes = excludePatterns.map((p) => new RegExp(p, 'i'))

  const urls = extractUrls(text).filter(
    (url) => !excludeRegexes.some((rx) => rx.test(url))
  )

  if (!urls.length) return []

  const results: LinkCheckResult[] = []
  for (let i = 0; i < urls.length; i += concurrency) {
    const batch = urls.slice(i, i + concurrency)
    const batchResults = await Promise.all(batch.map((url) => checkOne(url, options)))
    results.push(...batchResults)
  }
  return results
}
