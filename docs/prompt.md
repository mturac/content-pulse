Harika bir karar! Claude Code, Cursor Agent veya Copilot Workspace gibi otonom kodlama asistanları **"bağlamı (context) yüksek, sınırları çizilmiş ve adım adım ilerleyen"** promptlarla muazzam işler çıkarır. 

Yapay zeka kod asistanının kafasının karışmaması ve doğrudan production-ready (üretim ortamına hazır) kod yazması için hedefimizi **PayloadCMS v3** (şu an TS/Next.js dünyasının en modern headless CMS'si) olarak belirledim.

Aşağıdaki promptu kopyalayıp doğrudan Claude Code terminaline (veya kullandığın AI IDE'ye) yapıştırabilirsin. 

*(Not: Asistanın teknik terimleri ve kod yapılarını daha iyi anlaması için promptu **İngilizce** hazırladım. Bu, AI'ın kod kalitesini %40 artırır.)*

---

### 🛠️ Hazırlık (Promptu Yapıştırmadan Önce)
Terminali aç ve boş bir PayloadCMS projesi başlat:
```bash
npx create-payload-app@latest content-pulse-demo
# (Sorularda blank template veya blog template seç, veritabanı olarak SQLite veya Postgres seç)
cd content-pulse-demo
```
Sonra AI asistanını (Claude Code / Cursor) aç ve şu promptu gönder:

---

### 📋 KOPYALA & YAPIŞTIR (MASTER PROMPT)

```text
Act as a Senior TypeScript Architect and PayloadCMS v3 Plugin Expert. 
We are going to build an open-source PayloadCMS v3 plugin called "ContentPulse". 

### PROJECT CONTEXT
ContentPulse is a "Semantic Decay & Freshness Engine". It analyzes content (Posts, Articles) to detect "content decay" such as outdated dates, deprecated version numbers, and broken contextual promises. It assigns a "Freshness Score" and shows warnings in the Payload Admin UI sidebar.
Target: PayloadCMS v3 (Next.js App Router, React Server Components, TypeScript).
Philosophy: Local-first, zero external paid API dependencies for the MVP, privacy-focused.

### TECH STACK & LIBRARIES TO USE
- TypeScript (Strict mode)
- PayloadCMS v3 Plugin API
- `chrono-node` (for advanced natural language date parsing)
- `bullmq` & `ioredis` (optional, for background queueing if needed, but prefer Payload's local API for MVP)
- TailwindCSS (for Admin UI components)

### CORE FEATURES (MVP SCOPE)
1. Field Injection: Automatically inject hidden fields (`_pulseScore`, `_pulseWarnings`, `_lastAnalyzedAt`) into specified collections.
2. NLP Analyzer Service: A utility that scans rich text/blocks for:
   - Relative dates ("last year", "2022", "geçen ay") using `chrono-node`.
   - Version strings (e.g., "v1.2", "Node 14") using Regex.
3. Hooks: An `afterChange` hook that triggers the analyzer and updates the hidden fields.
4. Admin UI Widget: A custom React Client Component (`"use client"`) displayed in the Document Sidebar showing the Freshness Score and a list of Warnings with color-coded badges.

### DIRECTORY STRUCTURE TO CREATE
Create the plugin inside `src/plugins/content-pulse/` with the following structure:
- `index.ts` (Main plugin export, injecting fields and hooks)
- `types.ts` (Interfaces for PulseWarning, PulseConfig)
- `analyzer/index.ts` (The core logic using chrono-node and regex)
- `hooks/analyzeContent.ts` (The afterChange hook)
- `ui/PulseSidebarWidget/index.tsx` (The React sidebar component)
- `ui/PulseSidebarWidget/Component.tsx` (Server component wrapper if needed by Payload v3)

### STEP-BY-STEP EXECUTION PLAN
Please execute the following steps sequentially. Do not skip steps. Write clean, well-commented code with JSDoc.

**Step 1: Setup & Types**
- Initialize the directory structure.
- Define the `ContentPulseConfig` interface (allowing users to specify which collections to target).
- Define the `PulseWarning` interface (type: 'DATE_DECAY' | 'VERSION_DECAY', message, severity, matchedText).

**Step 2: The Analyzer Engine**
- Write the `analyzer/index.ts`. 
- Implement a function `analyzeContent(content: unknown): Promise<{ score: number, warnings: PulseWarning[] }>`.
- Extract text from Payload's Lexical/RichText JSON structure recursively.
- Use `chrono-node` to find dates. If a date is older than 1 year from today, flag it as `DATE_DECAY`.
- Use Regex to find version numbers. Flag them as `VERSION_DECAY` (simulating that they need manual verification).

**Step 3: Plugin Injection & Hooks**
- Write the main `index.ts` plugin function.
- Use Payload's `addFields` or collection mutation to inject `_pulseScore` (number), `_pulseWarnings` (json/array), and `_lastAnalyzedAt` (date) into the targeted collections. Make these fields `admin: { hidden: true }`.
- Implement the `afterChange` hook to call the analyzer and update the document via `req.payload.update()`.

**Step 4: Admin UI Sidebar Widget**
- Create the React Client Component for the Payload v3 Sidebar.
- Use `useDocumentInfo` or `useForm` hooks from `@payloadcms/ui` to read the `_pulseScore` and `_pulseWarnings`.
- Design a beautiful, minimal UI using Tailwind (or inline styles if Tailwind is not configured in the admin panel) showing a Heartbeat icon 🫀, the score (e.g., 85/100), and expandable warning cards.

**Step 5: Integration & README**
- Show me exactly how to import and add this plugin to the main `payload.config.ts`.
- Generate a professional, open-source ready `README.md` for the plugin directory, including installation instructions, features, and a "Local-First Privacy" badge.

### CONSTRAINTS & RULES
- DO NOT use any external LLM APIs (OpenAI, Anthropic) for this MVP. Keep it deterministic and local.
- Ensure all React components meant for the Payload Admin UI have `"use client"` at the top if they use hooks or state.
- Handle edge cases: What if the rich text field is empty? What if the collection doesn't have a text field?
- Write production-grade TypeScript. No `any` types unless absolutely necessary for Payload's deep generic types.

Take a deep breath, plan your file creations, and start executing Step 1. Let me know when you are ready to proceed to the next steps or if you need me to review the code.
```

---

### 💡 Sonraki Adımlar (Sen ve AI Arasındaki Dans)

1. **İlk Çıktıyı İncele:** Claude Code bu promptu aldığında muhtemelen tüm dosyaları tek seferde oluşturup terminalde sana sunacaktır.
2. **Hata Ayıklama (Debugging):** Payload v3'ün Admin UI (Next.js App Router) bazen `"use client"` ve Server Component sınırında hassastır. Eğer UI widget'ı render edilmezse, AI'a şunu yaz: *"Payload v3 requires custom UI components to be imported via the `admin.components` config. Fix the import paths and ensure the Sidebar component is correctly registered."*
3. **Test Etme:** AI'a *"Now write a Vitest test suite for the `analyzer/index.ts` to mock a rich text JSON and verify it catches a date from 2023."* diyerek testleri de yazdır.
4. **Github'e Yükleme:** Kod bittiğinde *"Generate a standard MIT License, a `.gitignore` for Node/TS, and a `package.json` with the correct PayloadCMS peer dependencies so we can publish this to NPM."* komutunu ver.

Şimdiden açık kaynak dünyasına yapacağın bu hediye için tebrikler! Kodlar yazılırken bir yere takılırsa veya Payload'un tip hataları (TypeScript generic hataları) çıkarsa bana getir, beraber çözeriz. 🚀 Kolay gelsin!
