import { describe, it, expect } from 'vitest'
import { runCli } from '../index'
import { writeFileSync, unlinkSync } from 'fs'
import { join } from 'path'

describe('runCli', () => {
  it('returns score 100 for clean content', () => {
    const tmp = join(__dirname, '_test_clean.txt')
    writeFileSync(tmp, 'This is a modern guide.')
    try {
      const r = runCli(['node', 'cli', 'analyze', tmp])
      expect(r.score).toBe(100)
      expect(r.exitCode).toBe(0)
    } finally { unlinkSync(tmp) }
  })

  it('returns score < 100 for stale content', () => {
    const tmp = join(__dirname, '_test_stale.txt')
    writeFileSync(tmp, 'Updated January 2019. Uses Create React App.')
    try {
      const r = runCli(['node', 'cli', 'analyze', tmp])
      expect(r.score).toBeLessThan(100)
    } finally { unlinkSync(tmp) }
  })

  it('exits with code 1 when score < 60', () => {
    const tmp = join(__dirname, '_test_critical.txt')
    writeFileSync(tmp, 'Published January 2018. Uses Create React App. Deprecated method. TBD. Python 2.')
    try {
      const r = runCli(['node', 'cli', 'analyze', tmp])
      expect(r.exitCode).toBe(1)
    } finally { unlinkSync(tmp) }
  })

  it('returns exitCode 1 for missing file', () => {
    const r = runCli(['node', 'cli', 'analyze', '/does/not/exist.txt'])
    expect(r.exitCode).toBe(1)
  })

  it('--format json returns valid JSON result', () => {
    const tmp = join(__dirname, '_test_json.txt')
    writeFileSync(tmp, 'Hello world.')
    try {
      const r = runCli(['node', 'cli', 'analyze', tmp, '--format', 'json'])
      expect(r.score).toBeDefined()
      expect(r.exitCode).toBe(0)
    } finally { unlinkSync(tmp) }
  })
})
