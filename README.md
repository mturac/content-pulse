<!-- ContentPulse — Semantic Decay & Freshness Engine -->

<p align="center">
  <a href="https://github.com/mturac/content-pulse">
    <img src="https://img.shields.io/badge/🚀_ContentPulse-Semantic_Decay_Engine-FF6B00?style=for-the-badge&logo=payload&logoColor=white" alt="ContentPulse" />
  </a>
</p>

<h1 align="center">
  <img src="https://raw.githubusercontent.com/simple-icons/simple-icons/develop/icons/payloadcms.svg" width="48" alt="PayloadCMS" />
  <br/>
  ContentPulse
</h1>

<p align="center">
  <strong>🔍 Detect outdated content before your readers do.</strong>
</p>

<p align="center">
  <em>A PayloadCMS v3 plugin that automatically detects semantic decay in your content — stale dates, outdated version references, and aging information — so you can keep your content fresh and trustworthy.</em>
</p>

<p align="center">
  <a href="#-quick-start">Quick Start</a> · <a href="#-features">Features</a> · <a href="#%EF%B8%8F-how-it-works">How It Works</a> · <a href="#-api-reference">API</a> · <a href="https://github.com/mturac/content-pulse/stargazers">⭐ Star</a>
</p>

<p align="center">
  <img src="https://img.shields.io/github/stars/mturac/content-pulse?style=social" alt="GitHub stars" />
  <img src="https://img.shields.io/github/forks/mturac/content-pulse?style=social" alt="GitHub forks" />
  <img src="https://img.shields.io/github/issues/mturac/content-pulse?style=social" alt="GitHub issues" />
</p>

---

<p align="center">
  <a href="#english">🇺🇸 English</a> · <a href="#francais">🇫🇷 Français</a> · <a href="#turkce">🇹🇷 Türkçe</a>
</p>

---

## 📊 Badges

<p align="center">
  <img src="https://img.shields.io/badge/version-1.0.0-blue?style=flat-square" alt="Version 1.0.0" />
  <img src="https://img.shields.io/badge/license-MIT-green?style=flat-square" alt="License MIT" />
  <img src="https://img.shields.io/badge/tests-14%2F14-brightgreen?style=flat-square" alt="Tests 14/14" />
  <img src="https://img.shields.io/badge/PayloadCMS-v3-FF6B00?style=flat-square&logo=payloadcms&logoColor=white" alt="PayloadCMS v3" />
  <img src="https://img.shields.io/badge/TypeScript-5.6-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript 5.6" />
  <img src="https://img.shields.io/badge/Vitest-2.0-6E9F18?style=flat-square&logo=vitest&logoColor=white" alt="Vitest" />
  <img src="https://img.shields.io/badge/Node.js-22+-339933?style=flat-square&logo=node.js&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/PRs-Welcome-brightgreen?style=flat-square" alt="PRs Welcome" />
</p>

---

<a name="english"></a>
## 🇺🇸 English

### ✨ Features

| Feature | Description |
|---------|-------------|
| 🕐 **Date Decay Detection** | Finds stale dates using `chrono-node` natural language parsing |
| 🔖 **Version Decay Detection** | Catches outdated version strings (`v2.0.0`, `2023 edition`) |
| 📊 **Freshness Score** | 0-100 score based on content age and decay severity |
| 🎯 **Per-Collection Targeting** | Enable only on collections that matter |
| ⚙️ **Configurable Thresholds** | Set warning thresholds to match your editorial policy |
| 🔒 **Privacy-First** | All analysis runs locally — no external API calls |
| ⚡ **Non-Blocking** | Analysis failures never prevent document saves |
| 🧪 **Fully Tested** | 14/14 tests passing with Vitest |

---

### 🚀 Quick Start

```bash
npm install contentpulse
```

```typescript
// payload.config.ts
import { buildConfig } from 'payload'
import { contentPulse } from 'contentpulse'

export default buildConfig({
  collections: [
    {
      slug: 'posts',
      fields: [
        { name: 'title', type: 'text' },
        { name: 'content', type: 'richText' },
      ],
    },
  ],
  plugins: [
    contentPulse({
      collections: ['posts'],
      warningThreshold: 80,
      maxAgeDays: 365,
    }),
  ],
})
```

**That's it!** Open any document, edit and save. The `_pulseScore` and `_pulseWarnings` fields are populated automatically.

---

### ⚙️ Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `collections` | `string[]` | *(required)* | Collection slugs to monitor |
| `warningThreshold` | `number` | `80` | Minimum freshness score before warnings surface |
| `maxAgeDays` | `number` | `365` | Days after which a date is considered stale |
| `customVersionPatterns` | `string[]` | `[]` | Additional regex patterns for version detection |
| `analyzers.dates` | `boolean` | `true` | Enable/disable date decay analysis |
| `analyzers.versions` | `boolean` | `true` | Enable/disable version decay analysis |

<details>
<summary>📋 Full Configuration Example</summary>

```typescript
contentPulse({
  collections: ['posts', 'docs', 'changelog'],
  warningThreshold: 70,
  maxAgeDays: 180,
  customVersionPatterns: ['API\\s+v\\d+', 'SDK\\s+\\d{4}'],
  analyzers: {
    dates: true,
    versions: true,
    custom: true,
  },
})
```

</details>

---

### 🔄 How It Works

```
┌─────────────────┐         afterChange hook          ┌───────────────────┐
│  Document saved │  ───────────────────────────────▶  │  ContentPulse     │
│  in PayloadCMS  │                                    │  Analyzer Engine  │
└─────────────────┘                                    └────────┬──────────┘
                                                                │
                                         ┌──────────────────────┴──────────────────────┐
                                         │                                             │
                                   ┌─────▼─────┐                              ┌───────▼────────┐
                                   │   Date    │                              │   Version      │
                                   │   Decay   │                              │   Decay        │
                                   │ Detector  │                              │   Detector     │
                                   │(chrono-   │                              │  (regex)       │
                                   │  node)    │                              │                │
                                   └─────┬─────┘                              └───────┬────────┘
                                         │                                             │
                                         └──────────────────────┬──────────────────────┘
                                                                │
                                                     ┌──────────▼──────────┐
                                                     │   Freshness Score   │
                                                     │      (0-100)        │
                                                     │   + Warnings[]      │
                                                     └──────────┬──────────┘
                                                                │
                                                     ┌──────────▼──────────┐
                                                     │   Stored on Doc:    │
                                                     │  _pulseScore        │
                                                     │  _pulseWarnings     │
                                                     │  _lastAnalyzedAt    │
                                                     └─────────────────────┘
```

---

### 📊 Warning Types & Severity

| Type | Trigger | Example | Severity |
|------|---------|---------|----------|
| `date_decay` | Date exceeds `maxAgeDays` | "Published March 2020" (1500+ days ago) | 🟡-🔴 |
| `version_decay` | Version references old year | "Version 2022 release" | 🟡-🔴 |
| `custom` | Custom regex matches | "API v1" when v2 is current | 🟢-🟡 |

| Severity | Score Penalty | When |
|----------|---------------|------|
| 🟢 `low` | -5 | Mildly stale (< 1.5x maxAgeDays) |
| 🟡 `medium` | -10 | Moderately stale (1.5x - 2x maxAgeDays) |
| 🟠 `high` | -15 | Very stale (2x - 3x maxAgeDays) |
| 🔴 `critical` | -25 | Extremely stale (> 3x maxAgeDays) |

**Formula:** `score = clamp(100 - Σ(penalties), 0, 100)`

---

### 🧪 Testing

```bash
npm test
```

```
 ✓ extractTextFromRichText > should extract text from plain string
 ✓ extractTextFromRichText > should extract text from Lexical JSON
 ✓ extractTextFromRichText > should handle empty content
 ✓ extractTextFromRichText > should handle nested arrays
 ✓ analyzeContent > should return perfect score for empty content
 ✓ analyzeContent > should return perfect score for fresh content
 ✓ analyzeContent > should detect date decay for old dates
 ✓ analyzeContent > should detect version decay
 ✓ analyzeContent > should detect year-based version decay
 ✓ analyzeContent > should calculate lower score for multiple warnings
 ✓ analyzeContent > should handle content without text fields
 ✓ analyzeContent > should respect custom maxAgeDays config
 ✓ analyzeContent > should respect analyzer config flags
 ✓ analyzeContent > should clamp score between 0 and 100

 Test Files  1 passed (1)
      Tests  14 passed (14)
   Duration  1.2s
```

---

### 🔒 Privacy

ContentPulse is designed with privacy in mind:

- ✅ **No External APIs** — All analysis runs locally in your PayloadCMS instance
- ✅ **No Data Collection** — Content never leaves your server
- ✅ **No Tracking** — No analytics or telemetry
- ✅ **Open Source** — Full transparency, audit the code yourself

---

### 📚 API Reference

<details>
<summary><code>contentPulse(config: ContentPulseConfig): Plugin</code></summary>

The main plugin function. Returns a PayloadCMS plugin.

```typescript
import { contentPulse } from 'contentpulse'

const plugin = contentPulse({
  collections: ['posts'],
  warningThreshold: 80,
  maxAgeDays: 365,
})
```

</details>

<details>
<summary><code>analyzeContent(content: unknown, config?: ContentPulseConfig): Promise&lt;PulseAnalysisResult&gt;</code></summary>

Direct analysis function for programmatic use.

```typescript
import { analyzeContent } from 'contentpulse'

const result = await analyzeContent(richTextContent, {
  collections: [],
  maxAgeDays: 365,
})

console.log(result.score)      // 75
console.log(result.warnings)   // [{ type: 'date_decay', severity: 'medium', ... }]
```

</details>

<details>
<summary><code>extractTextFromRichText(content: unknown): string</code></summary>

Extracts plain text from Lexical/RichText JSON.

```typescript
import { extractTextFromRichText } from 'contentpulse'

const text = extractTextFromRichText(lexicalContent)
// "This is the plain text content"
```

</details>

---

### 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) before submitting PRs.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

### 📄 License

MIT © [Mehmet Turac](https://github.com/mturac)

---

### 🙏 Acknowledgments

- [PayloadCMS](https://payloadcms.com/) — The best headless CMS
- [chrono-node](https://github.com/wanasit/chrono) — Natural language date parser
- [Vitest](https://vitest.dev/) — blazing fast unit test framework

---

<p align="center">
  <strong>Made with ❤️ for the PayloadCMS community</strong>
</p>

<p align="center">
  <a href="https://github.com/mturac/content-pulse/stargazers">
    <img src="https://img.shields.io/badge/⭐_Star_on_GitHub-FF6B00?style=for-the-badge&logo=github&logoColor=white" alt="Star on GitHub" />
  </a>
</p>

---

<a name="francais"></a>
<details>
<summary><h2 style="display:inline">🇫🇷 Français</h2></summary>

### ✨ Fonctionnalités

| Fonctionnalité | Description |
|----------------|-------------|
| 🕐 **Détection de dégradation des dates** | Trouve les dates obsolètes avec `chrono-node` |
| 🔖 **Détection de versions** | Détecte les anciennes références de version |
| 📊 **Score de fraîcheur** | Score de 0 à 100 basé sur l'âge du contenu |
| 🎯 **Ciblage par collection** | Active uniquement sur les collections pertinentes |
| ⚙️ **Seuils configurables** | Configurez les seuils selon votre politique éditoriale |
| 🔒 **Respect de la vie privée** | Toute l'analyse s'exécute localement |

### 🚀 Démarrage rapide

```bash
npm install contentpulse
```

```typescript
import { contentPulse } from 'contentpulse'

plugins: [
  contentPulse({
    collections: ['posts'],
    warningThreshold: 80,
    maxAgeDays: 365,
  }),
]
```

### 📊 Niveaux de sévérité

| Sévérité | Impact | Condition |
|----------|--------|-----------|
| 🟢 Faible | -5 | Légèrement ancien |
| 🟡 Moyen | -10 | Modérément ancien |
| 🟠 Élevé | -15 | Très ancien |
| 🔴 Critique | -25 | Extrêmement ancien |

### 📄 Licence

MIT © [Mehmet Turac](https://github.com/mturac)

</details>

---

<a name="turkce"></a>
<details>
<summary><h2 style="display:inline">🇹🇷 Türkçe</h2></summary>

### ✨ Özellikler

| Özellik | Açıklama |
|---------|----------|
| 🕐 **Tarih bozulma tespiti** | `chrono-node` ile eski tarihleri bulur |
| 🔖 **Sürüm bozulma tespiti** | Eski sürüm referanslarını yakalar |
| 📊 **Tazelik puanı** | İçerik yaşına göre 0-100 puan |
| 🎯 **Koleksiyon bazlı hedefleme** | Sadece ilgili koleksiyonlarda etkinleştir |
| ⚙️ **Yapılandırılabilir eşikler** | Editöryal politikanıza göre ayarlayın |
| 🔒 **Gizlilik odaklı** | Tüm analiz yerel olarak çalışır |

### 🚀 Hızlı Başlangıç

```bash
npm install contentpulse
```

```typescript
import { contentPulse } from 'contentpulse'

plugins: [
  contentPulse({
    collections: ['posts'],
    warningThreshold: 80,
    maxAgeDays: 365,
  }),
]
```

### 📊 Önem Seviyeleri

| Seviye | Puan Etkisi | Koşul |
|--------|-------------|-------|
| 🟢 Düşük | -5 | Hafif eski |
| 🟡 Orta | -10 | Orta düzeyde eski |
| 🟠 Yüksek | -15 | Çok eski |
| 🔴 Kritik | -25 | Aşırı eski |

### 📄 Lisans

MIT © [Mehmet Turac](https://github.com/mturac)

</details>

---

<p align="center">
  <img src="https://img.shields.io/badge/Built_with_TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="Built with TypeScript" />
  <img src="https://img.shields.io/badge/Powered_by_PayloadCMS-FF6B00?style=for-the-badge&logo=payloadcms&logoColor=white" alt="Powered by PayloadCMS" />
</p>
