# ContentPulse for Contentful

Content freshness analyzer that detects stale dates, outdated version strings, and deprecated references in your Contentful entries.

## Installation

### Via Contentful Marketplace

1. Visit the Contentful Marketplace
2. Search for "ContentPulse"
3. Click "Install" and select your space/environment
4. The app will appear in your entry sidebar

### Via Contentful CLI

```bash
npm install -g @contentful/cli
contentful app install --app-id contentpulse-contentful
```

### Local Development

```bash
git clone <repo-url>
cd contentful-plugin
npm install
npm start
```

This starts the development server. Register the app in your Contentful space pointing to `http://localhost:3000`.

## Configuration

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `decayThresholdDays` | Number | 365 | Days after which a date reference is flagged as stale |
| `enableRichTextAnalysis` | Boolean | true | Analyze Contentful rich text fields |

## How It Works

ContentPulse scans your entry fields and rich text content for:

### Date Decay Detection

Uses `chrono-node` to parse natural language dates (e.g., "January 2020", "last Tuesday", "Q3 2019"). Dates older than the configured threshold trigger warnings.

### Version String Detection

Matches patterns like:
- Semantic versions: `v2.0.0`, `1.3.2-beta`
- Year editions: `2023 edition`, `2021 version`

### Stale Reference Detection

Flags language indicating outdated content:
- `deprecated`, `obsolete`, `legacy`, `EOL`
- `coming soon`, `TBD`, `TBA`
- `formerly`, `previously`, `used to`

### Scoring

Starts at 100 points and deducts per warning severity:

| Severity | Penalty | Examples |
|----------|---------|----------|
| Critical | -25 | Date >5 years old, obsolete references |
| High | -15 | Date >3 years old, deprecated language |
| Medium | -10 | Date >2 years old, forward-looking statements |
| Low | -5 | Date >1 year old, minor version refs |

### Color Coding

- **Green (80-100)**: Fresh content
- **Yellow (60-79)**: Aging, may need review
- **Orange (40-59)**: Stale, should be updated
- **Red (0-39)**: Critical, immediate attention needed

## Privacy

ContentPulse runs entirely in your browser within Contentful's app framework. **No content is sent to external servers.** All analysis happens client-side using:

- `chrono-node` for date parsing
- Regex patterns for version detection

Your content never leaves your browser session.

## Development

```bash
npm test          # Run tests
npm run build     # Build for production
npm run lint      # Lint source files
npm run typecheck # Type checking
```

## License

MIT
