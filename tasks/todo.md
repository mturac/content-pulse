# ContentPulse - PayloadCMS v3 Plugin

## Execution Plan

### Step 0: Payload Project Scaffold
- [x] Created package.json with PayloadCMS v3 dependencies
- [x] Created tsconfig.json with strict TypeScript config
- [x] Created vitest.config.ts for testing

### Step 1: Setup & Types
- [x] Create `src/plugins/content-pulse/` directory structure
- [x] Define `ContentPulseConfig`
- [x] Define `PulseWarning`
- [x] Define `PulseAnalysisResult`

### Step 2: Analyzer Engine
- [x] Implement `analyzer/index.ts`
- [x] Implement `analyzeContent()` function
- [x] Recursively extract text from Payload Lexical/RichText JSON
- [x] Use `chrono-node` for date detection (DATE_DECAY)
- [x] Use deterministic regex matching for version decay warnings
- [x] Handle empty content without warnings

### Step 3: Plugin Injection & Hooks
- [x] Implement main plugin export in `index.ts`
- [x] Inject hidden `_pulseScore`, `_pulseWarnings`, and `_lastAnalyzedAt` fields
- [x] Implement `afterChange` analyzer hook and prevent recursive update loops

### Step 4: Admin UI Sidebar Widget
- [x] Create React Client Component for sidebar with `"use client"`
- [x] Design UI with score display and warning cards
- [x] Implement severity-based color coding

### Step 5: Integration & README
- [x] Add usage example for `payload.config.ts`
- [x] Generate README with installation, configuration, behavior, and privacy notes

### Step 6: Vitest Tests
- [x] Add Vitest suite for `analyzer/index.ts`
- [x] Cover date decay, version strings, empty content, and collections without text fields
- [x] All 14 tests passing

---

## Review Section
- **14/14 tests passing**
- Plugin structure complete: types.ts, analyzer/index.ts, hooks/analyzeContent.ts, ui/PulseSidebarWidget/, index.ts
- Ready for integration with PayloadCMS project
