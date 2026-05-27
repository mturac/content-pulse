<p align="center">
  <img src="docs/images/hero-banner.png" alt="ContentPulse Logo" width="680" />
</p>

<h1 align="center">ContentPulse</h1>

<p align="center">
  <strong>Semantic Decay &amp; Freshness Engine for PayloadCMS v3</strong>
</p>

<p align="center">
  <img src="docs/badges/version.svg" alt="Version 1.0.0" />
  <img src="docs/badges/license.svg" alt="License MIT" />
  <img src="docs/badges/tests.svg" alt="Tests Passing" />
  <img src="docs/badges/payload-v3.svg" alt="PayloadCMS v3 Compatible" />
</p>

---

<p align="center">
  <a href="#english">English</a> |
  <a href="#francais">Fran&ccedil;ais</a> |
  <a href="#turkce">T&uuml;rk&ccedil;e</a>
</p>

---

<details open>
<summary><h2 id="english" style="display:inline">English</h2></summary>

ContentPulse automatically detects stale dates, outdated version references, and semantic decay in your PayloadCMS content -- before your readers do.

### Table of Contents

- [Features](#features)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [How It Works](#how-it-works)
- [Admin UI Preview](#admin-ui-preview)
- [Warning Types & Severity](#warning-types--severity)
- [Privacy](#privacy)
- [API Reference](#api-reference)
- [Contributing](#contributing)
- [License](#license)

---

### Features

- **Automatic freshness scoring** -- every document receives a 0-100 freshness score on save.
- **Date decay detection** -- uses `chrono-node` to find and flag stale dates buried in rich text.
- **Version decay detection** -- catches outdated version strings (`v2.0.0`, `2023 edition`, etc.).
- **Custom regex patterns** -- supply your own patterns to flag project-specific outdated references.
- **Per-collection targeting** -- enable only on the collections that matter.
- **Configurable thresholds** -- set warning thresholds and max age to match your editorial policy.
- **Zero frontend overhead** -- analysis runs server-side in an `afterChange` hook; nothing ships to the browser.
- **Non-blocking** -- analysis failures never prevent a document from saving.

---

### Quick Start

#### 1. Install

```bash
npm install contentpulse
# or
pnpm add contentpulse
# or
yarn add contentpulse
```

#### 2. Add to Payload config

```ts
// payload.config.ts
import { buildConfig } from 'payload'
import { contentPulse } from 'contentpulse'

export default buildConfig({
  collections: [
    /* your collections */
  ],
  plugins: [
    contentPulse({
      collections: ['posts', 'articles'],
      warningThreshold: 80,
      maxAgeDays: 365,
    }),
  ],
})
```

#### 3. Done

Open any document in the configured collection, edit and save. The `_pulseScore` and `_pulseWarnings` fields are populated automatically.

---

### Configuration

| Option | Type | Default | Description |
|---|---|---|---|
| `collections` | `string[]` | *(required)* | Collection slugs to monitor. |
| `warningThreshold` | `number` | `80` | Minimum freshness score (0-100) before warnings surface. |
| `maxAgeDays` | `number` | `365` | Days after which a date is considered stale. |
| `customVersionPatterns` | `string[]` | `[]` | Additional regex strings for version detection. |
| `analyzers.dates` | `boolean` | `true` | Enable/disable date decay analysis. |
| `analyzers.versions` | `boolean` | `true` | Enable/disable version decay analysis. |
| `analyzers.custom` | `boolean` | `false` | Enable/disable custom pattern analysis. |

<details>
<summary>Full configuration example</summary>

```ts
contentPulse({
  collections: ['posts', 'docs', 'changelog'],
  warningThreshold: 70,
  maxAgeDays: 180,
  customVersionPatterns: [
    'API\\s+v\\d+',
    'SDK\\s+\\d{4}',
  ],
  analyzers: {
    dates: true,
    versions: true,
    custom: true,
  },
})
```

</details>

---

### How It Works

```
+---------------------+       afterChange hook        +-------------------+
|  Document saved in  |  -------------------------->  |  ContentPulse     |
|  PayloadCMS Admin   |                                |  Analyzer Engine  |
+---------------------+                                +--------+----------+
                                                                |
                                            +-------------------+-------------------+
                                            |                                       |
                                   +--------v--------+                    +----------v---------+
                                   | Date Decay      |                    | Version Decay      |
                                   | Detector        |                    | Detector           |
                                   | (chrono-node)   |                    | (regex patterns)   |
                                   +--------+--------+                    +----------+---------+
                                            |                                       |
                                            +-------------------+-------------------+
                                                                |
                                                     +----------v----------+
                                                     | Freshness Score     |
                                                     | (0-100) + Warnings  |
                                                     +----------+----------+
                                                                |
                                                     +----------v----------+
                                                     | Stored on document  |
                                                     | _pulseScore         |
                                                     | _pulseWarnings      |
                                                     | _lastAnalyzedAt     |
                                                     +---------------------+
```

<p align="center">
  <img src="docs/images/architecture-diagram.svg" alt="ContentPulse Architecture Diagram" width="600" />
</p>

---

### Admin UI Preview

<p align="center">
  <img src="docs/images/admin-sidebar-widget.png" alt="ContentPulse sidebar widget showing freshness score and warnings" width="420" />
</p>

<p align="center">
  <img src="docs/images/admin-warning-detail.png" alt="Detailed warning view in PayloadCMS admin panel" width="420" />
</p>

<p align="center">
  <img src="docs/images/admin-score-gauge.png" alt="Freshness score gauge visualization" width="320" />
</p>

---

### Warning Types & Severity

ContentPulse produces warnings of three types, each carrying a severity level.

<details>
<summary>Warning Types</summary>

| Type | Trigger | Example |
|---|---|---|
| `date_decay` | A date in the text exceeds `maxAgeDays`. | "Published on March 12, 2021" (1,500+ days ago) |
| `version_decay` | A version string references an old year or edition. | "Version 2022 release" |
| `custom` | A custom regex pattern matches. | "API v1" when v2 is current |

</details>

<details>
<summary>Severity Levels</summary>

| Severity | Score Penalty | When |
|---|---|---|
| `low` | -5 | Mildly stale (< 1.5x maxAgeDays) or generic version ref. |
| `medium` | -10 | Moderately stale (1.5x - 2x maxAgeDays) or 1-year-old version. |
| `high` | -15 | Very stale (2x - 3x maxAgeDays) or 2-year-old version. |
| `critical` | -25 | Extremely stale (> 3x maxAgeDays) or 3+ year-old version. |

**Score calculation:** `score = clamp(100 - sum(penalties), 0, 100)`

</details>

---

### Privacy

ContentPulse runs **entirely on your server**. No data is sent to external services. The `chrono-node` date parser and all regex matching execute within your PayloadCMS process. Content never leaves your infrastructure.

- No external API calls
- No data collection or telemetry
- No tracking pixels or analytics

---

### API Reference

#### `contentPulse(config: ContentPulseConfig): Plugin`

The main plugin factory. Returns a PayloadCMS v3 plugin function.

<details>
<summary>Usage</summary>

```ts
import { contentPulse } from 'contentpulse'

export default buildConfig({
  plugins: [
    contentPulse({
      collections: ['posts'],
      warningThreshold: 80,
      maxAgeDays: 365,
    }),
  ],
})
```

</details>

#### `analyzeContent(content: unknown, config?: ContentPulseConfig): Promise<PulseAnalysisResult>`

Programmatic analysis. Call from custom hooks, scripts, or API routes.

<details>
<summary>Usage</summary>

```ts
import { analyzeContent } from 'contentpulse'

const result = await analyzeContent(richTextData, {
  collections: [],
  maxAgeDays: 365,
})

console.log(result.score)      // 72
console.log(result.warnings)   // PulseWarning[]
console.log(result.analyzedAt) // ISO timestamp
```

</details>

#### `extractTextFromRichText(content: unknown): string`

Recursively extracts plain text from Lexical rich-text JSON nodes.

<details>
<summary>Types</summary>

```ts
interface PulseWarning {
  type: 'date_decay' | 'version_decay' | 'custom'
  severity: 'low' | 'medium' | 'high' | 'critical'
  message: string
  originalText: string
  suggestion?: string
}

interface PulseAnalysisResult {
  score: number          // 0-100
  warnings: PulseWarning[]
  analyzedAt: string     // ISO 8601
}
```

</details>

---

### Contributing

1. Fork the repository.
2. Create a feature branch: `git checkout -b feature/my-change`.
3. Run tests: `npm test`.
4. Submit a pull request with a clear description.

All contributions require passing tests. Run `npm test` before opening a PR.

---

### License

MIT License -- Copyright (c) 2024 Mehmet Turac

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

**Author:** Mehmet Turac

</details>

---

<details>
<summary><h2 id="francais" style="display:inline">Fran&ccedil;ais</h2></summary>

ContentPulse d&eacute;tecte automatiquement les dates obsol&egrave;tes, les r&eacute;f&eacute;rences &agrave; des versions p&eacute;rim&eacute;es et la d&eacute;gradation s&eacute;mantique de votre contenu PayloadCMS -- avant vos lecteurs.

### Table des mati&egrave;res

- [Fonctionnalit&eacute;s](#fonctionnalit%C3%A9s-1)
- [D&eacute;marrage rapide](#d%C3%A9marrage-rapide)
- [Configuration](#configuration-1)
- [Comment &ccedil;a fonctionne](#comment-%C3%A7a-fonctionne)
- [Aper&ccedil;u de l'interface admin](#aper%C3%A7u-de-linterface-admin)
- [Types d'avertissements et niveaux de s&eacute;v&eacute;rit&eacute;](#types-davertissements-et-niveaux-de-s%C3%A9v%C3%A9rit%C3%A9)
- [Confidentialit&eacute;](#confidentialit%C3%A9)
- [R&eacute;f&eacute;rence API](#r%C3%A9f%C3%A9rence-api)
- [Contribuer](#contribuer)
- [Licence](#licence)

---

### Fonctionnalit&eacute;s

- **Score de fra&icirc;cheur automatique** -- chaque document re&ccedil;oit un score de 0 &agrave; 100 &agrave; l'enregistrement.
- **D&eacute;tection de la d&eacute;gradation des dates** -- utilise `chrono-node` pour trouver et signaler les dates obsol&egrave;tes dans le texte enrichi.
- **D&eacute;tection de la d&eacute;gradation des versions** -- d&eacute;tecte les cha&icirc;nes de version p&eacute;rim&eacute;es (`v2.0.0`, `edition 2023`, etc.).
- **Motifs regex personnalis&eacute;s** -- fournissez vos propres motifs pour signaler des r&eacute;f&eacute;rences sp&eacute;cifiques &agrave; votre projet.
- **Ciblage par collection** -- activez uniquement sur les collections qui vous int&eacute;ressent.
- **Seuils configurables** -- d&eacute;finissez les seuils d'avertissement et l'&acirc;ge maximal selon votre politique &eacute;ditoriale.
- **Z&eacute;ro charge frontale** -- l'analyse s'ex&eacute;cute c&ocirc;t&eacute; serveur dans un hook `afterChange` ; rien n'est envoy&eacute; au navigateur.
- **Non bloquant** -- les &eacute;checs d'analyse n'emp&ecirc;chent jamais l'enregistrement d'un document.

---

### D&eacute;marrage rapide

#### 1. Installer

```bash
npm install contentpulse
# ou
pnpm add contentpulse
# ou
yarn add contentpulse
```

#### 2. Ajouter &agrave; la configuration Payload

```ts
// payload.config.ts
import { buildConfig } from 'payload'
import { contentPulse } from 'contentpulse'

export default buildConfig({
  collections: [
    /* vos collections */
  ],
  plugins: [
    contentPulse({
      collections: ['posts', 'articles'],
      warningThreshold: 80,
      maxAgeDays: 365,
    }),
  ],
})
```

#### 3. Termin&eacute;

Ouvrez un document dans la collection configur&eacute;e, modifiez et enregistrez. Les champs `_pulseScore` et `_pulseWarnings` sont remplis automatiquement.

---

### Configuration

| Option | Type | D&eacute;faut | Description |
|---|---|---|---|
| `collections` | `string[]` | *(requis)* | Slugs des collections &agrave; surveiller. |
| `warningThreshold` | `number` | `80` | Score de fra&icirc;cheur minimum (0-100) avant affichage des avertissements. |
| `maxAgeDays` | `number` | `365` | Nombre de jours apr&egrave;s lequel une date est consid&eacute;r&eacute;e obsol&egrave;te. |
| `customVersionPatterns` | `string[]` | `[]` | Expressions r&eacute;guli&egrave;res suppl&eacute;mentaires pour la d&eacute;tection de versions. |
| `analyzers.dates` | `boolean` | `true` | Active/d&eacute;sactive l'analyse de d&eacute;gradation des dates. |
| `analyzers.versions` | `boolean` | `true` | Active/d&eacute;sactive l'analyse de d&eacute;gradation des versions. |
| `analyzers.custom` | `boolean` | `false` | Active/d&eacute;sactive l'analyse par motifs personnalis&eacute;s. |

<details>
<summary>Exemple de configuration compl&egrave;te</summary>

```ts
contentPulse({
  collections: ['posts', 'docs', 'changelog'],
  warningThreshold: 70,
  maxAgeDays: 180,
  customVersionPatterns: [
    'API\\s+v\\d+',
    'SDK\\s+\\d{4}',
  ],
  analyzers: {
    dates: true,
    versions: true,
    custom: true,
  },
})
```

</details>

---

### Comment &ccedil;a fonctionne

```
+---------------------+       hook afterChange        +-------------------+
|  Document enregistré|  -------------------------->  |  ContentPulse     |
|  dans PayloadCMS    |                                |  Moteur d'analyse |
+---------------------+                                +--------+----------+
                                                                |
                                            +-------------------+-------------------+
                                            |                                       |
                                   +--------v--------+                    +----------v---------+
                                   | Détecteur de    |                    | Détecteur de       |
                                   | dégradation     |                    | dégradation        |
                                   | des dates       |                    | des versions       |
                                   | (chrono-node)   |                    | (expressions rég.) |
                                   +--------+--------+                    +----------+---------+
                                            |                                       |
                                            +-------------------+-------------------+
                                                                |
                                                     +----------v----------+
                                                     | Score de fraîcheur  |
                                                     | (0-100) + Avertis.  |
                                                     +----------+----------+
                                                                |
                                                     +----------v----------+
                                                     | Stocké sur le       |
                                                     | document            |
                                                     | _pulseScore         |
                                                     | _pulseWarnings      |
                                                     | _lastAnalyzedAt     |
                                                     +---------------------+
```

<p align="center">
  <img src="docs/images/architecture-diagram.svg" alt="Diagramme d'architecture ContentPulse" width="600" />
</p>

---

### Aper&ccedil;u de l'interface admin

<p align="center">
  <img src="docs/images/admin-sidebar-widget.png" alt="Widget latéral ContentPulse montrant le score de fraîcheur et les avertissements" width="420" />
</p>

<p align="center">
  <img src="docs/images/admin-warning-detail.png" alt="Vue détaillée des avertissements dans le panneau d'administration PayloadCMS" width="420" />
</p>

---

### Types d'avertissements et niveaux de s&eacute;v&eacute;rit&eacute;

<details>
<summary>Types d'avertissements</summary>

| Type | Déclencheur | Exemple |
|---|---|---|
| `date_decay` | Une date dans le texte dépasse `maxAgeDays`. | "Publié le 12 mars 2021" (1 500+ jours) |
| `version_decay` | Une référence de version mentionne une année ancienne. | "Version édition 2022" |
| `custom` | Un motif regex personnalisé correspond. | "API v1" quand v2 est actuelle |

</details>

<details>
<summary>Niveaux de sévérité</summary>

| Sévérité | Pénalité | Quand |
|---|---|---|
| `low` | -5 | Légèrement obsolète (< 1.5x maxAgeDays). |
| `medium` | -10 | Modérément obsolète (1.5x - 2x maxAgeDays). |
| `high` | -15 | Très obsolète (2x - 3x maxAgeDays). |
| `critical` | -25 | Extrêmement obsolète (> 3x maxAgeDays). |

**Calcul du score :** `score = clamp(100 - somme(pénalités), 0, 100)`

</details>

---

### Confidentialit&eacute;

ContentPulse s'ex&eacute;cute **enti&egrave;rement sur votre serveur**. Aucune donn&eacute;e n'est envoy&eacute;e &agrave; des services externes. L'analyseur de dates `chrono-node` et toutes les correspondances regex s'ex&eacute;cutent dans votre processus PayloadCMS. Le contenu ne quitte jamais votre infrastructure.

- Aucun appel API externe
- Aucune collecte de données ni télémétrie
- Aucun pixel de suivi ni analytique

---

### R&eacute;f&eacute;rence API

#### `contentPulse(config: ContentPulseConfig): Plugin`

Fabrique principale du plugin. Retourne une fonction plugin PayloadCMS v3.

<details>
<summary>Utilisation</summary>

```ts
import { contentPulse } from 'contentpulse'

export default buildConfig({
  plugins: [
    contentPulse({
      collections: ['posts'],
      warningThreshold: 80,
      maxAgeDays: 365,
    }),
  ],
})
```

</details>

#### `analyzeContent(content: unknown, config?: ContentPulseConfig): Promise<PulseAnalysisResult>`

Analyse programmatique. Appelable depuis des hooks personnalisés, scripts ou routes API.

<details>
<summary>Utilisation</summary>

```ts
import { analyzeContent } from 'contentpulse'

const result = await analyzeContent(richTextData, {
  collections: [],
  maxAgeDays: 365,
})

console.log(result.score)      // 72
console.log(result.warnings)   // PulseWarning[]
console.log(result.analyzedAt) // horodatage ISO
```

</details>

#### `extractTextFromRichText(content: unknown): string`

Extrait récursivement le texte brut des noeuds JSON Lexical.

<details>
<summary>Types</summary>

```ts
interface PulseWarning {
  type: 'date_decay' | 'version_decay' | 'custom'
  severity: 'low' | 'medium' | 'high' | 'critical'
  message: string
  originalText: string
  suggestion?: string
}

interface PulseAnalysisResult {
  score: number          // 0-100
  warnings: PulseWarning[]
  analyzedAt: string     // ISO 8601
}
```

</details>

---

### Contribuer

1. Forker le dépôt.
2. Créer une branche de fonctionnalité : `git checkout -b feature/mon-changement`.
3. Lancer les tests : `npm test`.
4. Soumettre une pull request avec une description claire.

Toutes les contributions nécessitent des tests réussis. Lancez `npm test` avant d'ouvrir une PR.

---

### Licence

Licence MIT -- Copyright (c) 2024 Mehmet Turac

La présente autorisation est accordée gratuitement à toute personne obtenant une copie de ce logiciel et des fichiers de documentation associés (le "Logiciel"), de traiter le Logiciel sans restriction, y compris sans limitation les droits d'utiliser, de copier, de modifier, de fusionner, de publier, de distribuer, de sous-licencier et/ou de vendre des copies du Logiciel, et de permettre aux personnes à qui le Logiciel est fourni de le faire, sous réserve des conditions suivantes.

L'avis de droit d'auteur ci-dessus et le présent avis d'autorisation doivent être inclus dans toutes les copies ou parties substantielles du Logiciel.

LE LOGICIEL EST FOURNI "TEL QUEL", SANS GARANTIE D'AUCUNE SORTE, EXPRESSE OU IMPLICITE.

**Auteur :** Mehmet Turac

</details>

---

<details>
<summary><h2 id="turkce" style="display:inline">T&uuml;rk&ccedil;e</h2></summary>

ContentPulse, PayloadCMS i&ccedil;eriğinizdeki eskimiş tarihleri, g&uuml;ncelliğini yitirmiş s&uuml;r&uuml;m referanslarını ve anlamsal bozulmaları okuyucularınızdan &ouml;nce otomatik olarak algılar.

### İçindekiler

- [&Ouml;zellikler](#%C3%B6zellikler-1)
- [Hızlı Başlangıç](#h%C4%B1zl%C4%B1-ba%C5%9Flang%C4%B1%C3%A7)
- [Yapılandırma](#yap%C4%B1land%C4%B1rma)
- [Nasıl &Ccedil;alışır](#nas%C4%B1l-%C3%A7al%C4%B1%C5%9F%C4%B1r)
- [Admin &Ouml;nizleme](#admin-%C3%B6nizleme)
- [Uyarı T&uuml;rleri ve &Ouml;nem D&uuml;zeyleri](#uyar%C4%B1-t%C3%BCrleri-ve-%C3%B6nem-d%C3%BCzeyleri)
- [Gizlilik](#gizlilik)
- [API Referansı](#api-referans%C4%B1)
- [Katkıda Bulunma](#katk%C4%B1da-bulunma)
- [Lisans](#lisans)

---

### &Ouml;zellikler

- **Otomatik tazelik puanı** -- her kayıt kaydedildiğinde 0-100 arası tazelik puanı alır.
- **Tarih bozulması tespiti** -- zengin metindeki eskimiş tarihleri bulup işaretlemek için `chrono-node` kullanır.
- **S&uuml;r&uuml;m bozulması tespiti** -- eski s&uuml;r&uuml;m dizgelerini yakalar (`v2.0.0`, `2023 baskısı`, vb.).
- **&Ouml;zel regex kalıpları** -- projenize &ouml;zel eskimiş referansları işaretlemek için kendi kalıplarınızı sağlayın.
- **Koleksiyon bazlı hedefleme** -- yalnızca ilgili koleksiyonlarda etkinleştirin.
- **Yapılandırılabilir eşikler** -- uyarı eşiklerini ve maksimum yaşı edit&ouml;ryal politikanıza g&ouml;re ayarlayın.
- **Sıfır &ouml;n y&uuml;z ek y&uuml;k&uuml;** -- analiz sunucu tarafında bir `afterChange` kancasında &ccedil;alışır; tarayıcıya hi&ccedil;bir şey g&ouml;nderilmez.
- **Engelleyici değil** -- analiz hataları asla bir belgenin kaydedilmesini engellemez.

---

### Hızlı Başlangıç

#### 1. Y&uuml;kleyin

```bash
npm install contentpulse
# veya
pnpm add contentpulse
# veya
yarn add contentpulse
```

#### 2. Payload yapılandırmasına ekleyin

```ts
// payload.config.ts
import { buildConfig } from 'payload'
import { contentPulse } from 'contentpulse'

export default buildConfig({
  collections: [
    /* koleksiyonlarınız */
  ],
  plugins: [
    contentPulse({
      collections: ['posts', 'articles'],
      warningThreshold: 80,
      maxAgeDays: 365,
    }),
  ],
})
```

#### 3. Tamamlandı

Yapılandırılmış koleksiyondaki herhangi bir belgeyi a&ccedil;ın, d&uuml;zenleyin ve kaydedin. `_pulseScore` ve `_pulseWarnings` alanları otomatik olarak doldurulur.

---

### Yapılandırma

| Se&ccedil;enek | T&uuml;r | Varsayılan | A&ccedil;ıklama |
|---|---|---|---|
| `collections` | `string[]` | *(zorunlu)* | İzlenecek koleksiyon slug'ları. |
| `warningThreshold` | `number` | `80` | Uyarılar g&ouml;r&uuml;nmeden &ouml;nceki minimum tazelik puanı (0-100). |
| `maxAgeDays` | `number` | `365` | Bir tarihin eskimiş sayılacağı g&uuml;n sayısı. |
| `customVersionPatterns` | `string[]` | `[]` | S&uuml;r&uuml;m tespiti için ek regex ifadeleri. |
| `analyzers.dates` | `boolean` | `true` | Tarih bozulması analizini etkinleştirir/devre dışı bırakır. |
| `analyzers.versions` | `boolean` | `true` | S&uuml;r&uuml;m bozulması analizini etkinleştirir/devre dışı bırakır. |
| `analyzers.custom` | `boolean` | `false` | &Ouml;zel kalıp analizini etkinleştirir/devre dışı bırakır. |

<details>
<summary>Tam yapılandırma &ouml;rneği</summary>

```ts
contentPulse({
  collections: ['posts', 'docs', 'changelog'],
  warningThreshold: 70,
  maxAgeDays: 180,
  customVersionPatterns: [
    'API\\s+v\\d+',
    'SDK\\s+\\d{4}',
  ],
  analyzers: {
    dates: true,
    versions: true,
    custom: true,
  },
})
```

</details>

---

### Nasıl &Ccedil;alışır

```
+---------------------+       afterChange kancası      +-------------------+
|  PayloadCMS'te      |  -------------------------->  |  ContentPulse     |
|  belge kaydedildi   |                                |  Analiz Motoru    |
+---------------------+                                +--------+----------+
                                                                |
                                            +-------------------+-------------------+
                                            |                                       |
                                   +--------v--------+                    +----------v---------+
                                   | Tarih Bozulması |                    | Sürüm Bozulması    |
                                   | Dedektörü       |                    | Dedektörü          |
                                   | (chrono-node)   |                    | (regex kalıpları)  |
                                   +--------+--------+                    +----------+---------+
                                            |                                       |
                                            +-------------------+-------------------+
                                                                |
                                                     +----------v----------+
                                                     | Tazelik Puanı       |
                                                     | (0-100) + Uyarılar  |
                                                     +----------+----------+
                                                                |
                                                     +----------v----------+
                                                     | Belge üzerinde      |
                                                     | saklanır            |
                                                     | _pulseScore         |
                                                     | _pulseWarnings      |
                                                     | _lastAnalyzedAt     |
                                                     +---------------------+
```

<p align="center">
  <img src="docs/images/architecture-diagram.svg" alt="ContentPulse Mimari Diyagramı" width="600" />
</p>

---

### Admin &Ouml;nizleme

<p align="center">
  <img src="docs/images/admin-sidebar-widget.png" alt="Tazelik puanını ve uyarıları g&ouml;steren ContentPulse kenar &ccedil;ubuğu widget'ı" width="420" />
</p>

<p align="center">
  <img src="docs/images/admin-warning-detail.png" alt="PayloadCMS admin panelinde ayrıntılı uyarı g&ouml;r&uuml;n&uuml;m&uuml;" width="420" />
</p>

---

### Uyarı T&uuml;rleri ve &Ouml;nem D&uuml;zeyleri

<details>
<summary>Uyarı T&uuml;rleri</summary>

| T&uuml;r | Tetikleyici | &Ouml;rnek |
|---|---|---|
| `date_decay` | Metindeki bir tarih `maxAgeDays` değerini aşıyor. | "12 Mart 2021'de yayınlandı" (1.500+ g&uuml;n &ouml;nce) |
| `version_decay` | Bir s&uuml;r&uuml;m referansı eski bir yıldan bahsediyor. | "2022 baskısı s&uuml;r&uuml;m&uuml;" |
| `custom` | &Ouml;zel bir regex kalıbı eşleşiyor. | v2 g&uuml;ncelken "API v1" |

</details>

<details>
<summary>&Ouml;nem D&uuml;zeyleri</summary>

| D&uuml;zey | Puan Cezası | Ne Zaman |
|---|---|---|
| `low` | -5 | Hafif eski (< 1.5x maxAgeDays). |
| `medium` | -10 | Orta d&uuml;zeyde eski (1.5x - 2x maxAgeDays). |
| `high` | -15 | &Ccedil;ok eski (2x - 3x maxAgeDays). |
| `critical` | -25 | Son d&uuml;zeyde eski (> 3x maxAgeDays). |

**Puan hesaplaması:** `puan = sinirlandir(100 - toplam(cezalar), 0, 100)`

</details>

---

### Gizlilik

ContentPulse **tamamen sunucunuzda &ccedil;alışır**. Hi&ccedil;bir veri harici hizmetlere g&ouml;nderilmez. `chrono-node` tarih ayrıştırıcısı ve t&uuml;m regex eşleştirmeleri PayloadCMS s&uuml;reciniz i&ccedil;inde &ccedil;alışır. İçerik asla altyapınızdan ayrılmaz.

- Harici API &ccedil;ağrısı yok
- Veri toplama veya t&uuml;lelemetre yok
- İzleme pikselleri veya analitik yok

---

### API Referansı

#### `contentPulse(config: ContentPulseConfig): Plugin`

Ana plugin fabrikası. Bir PayloadCMS v3 plugin fonksiyonu d&ouml;nd&uuml;r&uuml;r.

<details>
<summary>Kullanım</summary>

```ts
import { contentPulse } from 'contentpulse'

export default buildConfig({
  plugins: [
    contentPulse({
      collections: ['posts'],
      warningThreshold: 80,
      maxAgeDays: 365,
    }),
  ],
})
```

</details>

#### `analyzeContent(content: unknown, config?: ContentPulseConfig): Promise<PulseAnalysisResult>`

Programatik analiz. &Ouml;zel kancalardan, scriptlerden veya API yollarından &ccedil;ağrılabilir.

<details>
<summary>Kullanım</summary>

```ts
import { analyzeContent } from 'contentpulse'

const result = await analyzeContent(richTextData, {
  collections: [],
  maxAgeDays: 365,
})

console.log(result.score)      // 72
console.log(result.warnings)   // PulseWarning[]
console.log(result.analyzedAt) // ISO zaman damgası
```

</details>

#### `extractTextFromRichText(content: unknown): string`

Lexical zengin metin JSON d&uuml;ğ&uuml;mlerinden &ouml;zyinelemeli olarak d&uuml;z metin &ccedil;ıkarır.

<details>
<summary>T&uuml;rler</summary>

```ts
interface PulseWarning {
  type: 'date_decay' | 'version_decay' | 'custom'
  severity: 'low' | 'medium' | 'high' | 'critical'
  message: string
  originalText: string
  suggestion?: string
}

interface PulseAnalysisResult {
  score: number          // 0-100
  warnings: PulseWarning[]
  analyzedAt: string     // ISO 8601
}
```

</details>

---

### Katkıda Bulunma

1. Depoyu fork edin.
2. Bir &ouml;zellik dalı oluşturun: `git checkout -b feature/degisikligim`.
3. Testleri &ccedil;alıştırın: `npm test`.
4. A&ccedil;ıklamalı bir pull request g&ouml;nderin.

T&uuml;m katkılar için ge&ccedil;en testler zorunludur. PR a&ccedil;madan &ouml;nce `npm test` &ccedil;alıştırın.

---

### Lisans

MIT Lisansı -- Telif Hakkı (c) 2024 Mehmet Turac

İşbu izin, bu yazılımın ve ilişkili belge dosyalarının ("Yazılım") bir kopyasını edinen herhangi bir kişiye, kullanma, kopyalama, değiştirme, birleştirme, yayınlama, dağıtma, alt lisans verme ve/veya Yazılımın kopyalarını satma dahil ancak bunlarla sınırlı olmamak üzere, Yazılımla ilgili herhangi bir kısıtlama olmaksızın uğraşma iznini ücretsiz olarak verir.

Yukarıdaki telif hakkı bildirimi ve bu izin bildirimi, Yazılımın tüm kopyalarına veya mali kısımlarına dahil edilecektir.

YAZILIM "OLDUĞU GİBİ" SAĞLANMAKTADIR.

**Yazar:** Mehmet Turac

</details>

---

<p align="center">
  <sub>Built with care by <strong>Mehmet Turac</strong></sub>
</p>
