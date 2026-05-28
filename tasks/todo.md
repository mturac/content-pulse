# ContentPulse Roadmap Features

## Execution Plan

- [x] Read required core analyzer, type, test, and package manifest files
- [x] Extend core types for `url_rot`, `locale`, and custom decay rules
- [x] Add custom rule detection and locale-aware detector gating to `packages/core/src/analyzer.ts`
- [x] Add async broken-link detector module and core exports
- [x] Update core/contentful/payload package publish metadata
- [x] Append requested analyzer/link tests without overwriting existing coverage
- [x] Run core tests with `npx vitest run`
- [x] Commit changes on `main`
- [ ] Push to `origin main`

## Review Section

- `npx vitest run` in `packages/core`: 51 tests passed.
- `npm run build` in `packages/core`: passed.
- Commit created locally. Push failed because `github.com` could not be resolved from this environment.
