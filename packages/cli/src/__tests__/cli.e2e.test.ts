import { describe, it, expect } from 'vitest'
import { execSync } from 'child_process'
import { writeFileSync, unlinkSync } from 'fs'
import { join, resolve } from 'path'

const CLI_ENTRY = resolve(__dirname, '../../src/cli.ts')
const TSX_TSCONFIG = resolve(__dirname, '../../tsconfig.test.json')
const TSX_ENV = `TSX_TSCONFIG_PATH=${JSON.stringify(TSX_TSCONFIG)}`

describe('CLI e2e', () => {
  it('exits 0 for fresh content', () => {
    const tmp = join(__dirname, '_e2e_fresh.txt')
    writeFileSync(tmp, 'This is modern documentation.')
    try {
      const result = execSync(`${TSX_ENV} node --import tsx ${JSON.stringify(CLI_ENTRY)} analyze ${JSON.stringify(tmp)}`, { encoding: 'utf8' })
      expect(result).toContain('Score:')
    } finally { unlinkSync(tmp) }
  })

  it('exits 1 for critically stale content', () => {
    const tmp = join(__dirname, '_e2e_stale.txt')
    writeFileSync(tmp, 'Published January 2018. Uses Create React App. Deprecated method. Python 2.')
    try {
      let exitCode = 0
      try {
        execSync(`${TSX_ENV} node --import tsx ${JSON.stringify(CLI_ENTRY)} analyze ${JSON.stringify(tmp)}`, { encoding: 'utf8' })
      } catch (e: any) {
        exitCode = e.status
      }
      expect(exitCode).toBe(1)
    } finally { unlinkSync(tmp) }
  })

  it('--format json outputs valid JSON', () => {
    const tmp = join(__dirname, '_e2e_json.txt')
    writeFileSync(tmp, 'Hello world.')
    try {
      const out = execSync(`${TSX_ENV} node --import tsx ${JSON.stringify(CLI_ENTRY)} analyze ${JSON.stringify(tmp)} --format json`, { encoding: 'utf8' })
      const parsed = JSON.parse(out)
      expect(parsed).toHaveProperty('score')
      expect(parsed).toHaveProperty('warnings')
    } finally { unlinkSync(tmp) }
  })
})
