# 🫀 ContentPulse

**Semantic Decay & Freshness Engine — Multi-Platform Monorepo**

> Detect stale dates, outdated version strings, deprecated tech references, and rotting content — before your readers do. Works across every major CMS.

[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-22c55e?style=flat-square)](LICENSE)

---

## Packages

| Package | Platform | Description |
|---|---|---|
| [`@contentpulse/core`](packages/core) | — | Shared analyzer engine (no platform deps) |
| [`@contentpulse/payload`](packages/payload) | Payload CMS v3 | Plugin with lifecycle hooks + admin fields |
| [`@contentpulse/contentful`](packages/contentful) | Contentful | Sidebar app + Entry Field SDK integration |
| [`strapi-plugin-content-pulse`](https://github.com/mturac/contentpulse-strapi) | Strapi v5 | Separate repo — webhook, cron, REST API, dashboard |

---

## Architecture

```
contentpulse/ (this repo)
├── packages/
│   ├── core/              ← @contentpulse/core
│   │   └── src/
│   │       ├── analyzer.ts    chrono-node + version + stale-ref + tech-decay
│   │       ├── types.ts       shared PulseWarning, AnalyzerConfig, helpers
│   │       └── index.ts
│   │
│   ├── contentful/        ← @contentpulse/contentful
│   │   └── src/
│   │       ├── extractor.ts   Contentful rich-text → plain text
│   │       ├── adapter.ts     bridge to @contentpulse/core
│   │       ├── components/
│   │       │   └── PulseWidget.tsx
│   │       └── index.tsx
│   │
│   └── payload/           ← @contentpulse/payload
│       └── src/
│           ├── extractor.ts   Lexical JSON → plain text
│           └── index.ts       Plugin + afterChange hook
│
contentpulse-strapi/ (separate repo)
    github.com/mturac/contentpulse-strapi
    Strapi v5 — webhook, cron, dashboard, REST API
```

---

## What It Detects

| Type | Examples |
|---|---|
| `date_decay` | "Updated January 2022", "as of last year" |
| `version_decay` | "v3.2.1", "2023 edition", "2021 release" |
| `stale_reference` | "deprecated", "coming soon", "TBD", "formerly" |
| `tech_decay` | Create React App, Python 2, IE11, Flash, AngularJS v1 |

---

## Scoring

| Severity | Deduction | Trigger |
|---|---|---|
| **Critical** | −25 pts | > 3 years old / EOL tech |
| **High** | −15 pts | > 2 years old |
| **Medium** | −10 pts | > 1.5 years old |
| **Low** | −5 pts | Generic version string |

Range: `0` (fully decayed) → `100` (fresh)

---

## Core Usage

Any adapter — or your own custom integration — can use `@contentpulse/core` directly:

```ts
import { analyzeTexts, getScoreColor, getScoreLabel } from '@contentpulse/core'

const result = analyzeTexts([
  { text: 'Updated January 2022. Requires Node.js v14.', field: 'body' },
  { text: 'Built with Create React App. Python 2 compatible.', field: 'intro' },
])

console.log(result.score)       // e.g. 30
console.log(getScoreLabel(30))  // "Critical"
console.log(result.warnings)
// [
//   { type: 'date_decay', severity: 'critical', message: 'Stale date: "January 2022"…' },
//   { type: 'tech_decay', severity: 'high',     message: 'Node.js version is EOL…' },
//   { type: 'tech_decay', severity: 'high',     message: 'Create React App is deprecated (2023)…' },
//   { type: 'tech_decay', severity: 'critical', message: 'Python 2 is EOL since January 2020…' },
// ]
```

---

## Payload CMS v3

```ts
// payload.config.ts
import { contentPulse } from '@contentpulse/payload'

export default buildConfig({
  plugins: [
    contentPulse({
      collections: ['posts', 'articles', 'docs'],
      warningThreshold: 80,
      maxAgeDays: 365,
    }),
  ],
})
```

Injects `_pulseScore`, `_pulseWarnings`, `_lastAnalyzedAt` into every monitored collection via `afterChange` hook.

---

## Contentful

Install the Contentful App via the marketplace or sideload in development. Displays a PulseWidget in the Entry sidebar showing:

- Circular score badge (0–100)
- Severity-filtered warning list
- Re-analyze button
- Per-warning type + suggestion

Config via App Parameters: `decayThresholdDays` (default: 365).

---

## Strapi v5

→ **[github.com/mturac/contentpulse-strapi](https://github.com/mturac/contentpulse-strapi)**

Full-featured standalone plugin:
- Webhook / Slack notifications on decay
- Daily cron bulk re-analysis
- Admin Freshness Dashboard with filters + per-row re-analyze
- REST API: `/api/content-pulse/dashboard`, `/reanalyze/:uid/:id`

---

## Development

```bash
# Install all workspaces
npm install

# Run all tests
npm test

# Build all packages
npm run build

# Work on a specific package
npm run test:core
npm run test:payload
npm run test:contentful
```

---

## Roadmap

- [ ] `@contentpulse/core` — broken link detection (`url_rot`)
- [ ] Score history / trend tracking (JSON rolling window)
- [ ] Public freshness badge API
- [ ] npm publish for all packages
- [ ] Community-maintained tech decay dictionary

---

## License

MIT © [Mehmet Turac](https://github.com/mturac)
