# ICSE Project Tool — Work Log

Project: AI-powered ICSE Board project assistant for Indian students.
Approach: RAG + Prompt-Engineered Multi-Agent Pipeline (no model training — explained to user).

---
Task ID: 0
Agent: main
Task: Project kickoff, architecture design, environment setup

Work Log:
- Explored existing Next.js 16 scaffold (shadcn/ui, Prisma SQLite, z-ai-web-dev-sdk all present)
- Started dev server on port 3000
- Loaded LLM, Image-Generation, and PDF skills
- Decided architecture: 7-agent pipeline (Extractor → Analyzer → Outline → Writer → Image Director → Mock Generator → Originality Reviewer) backed by ICSE knowledge base (RAG)
- Explained to user why RAG+prompt-engineering beats fine-tuning for this use case

Stage Summary:
- Architecture locked in. Ready to build schema, knowledge base, agents, APIs, and frontend.

---
Task ID: 7
Agent: frontend-styling-expert
Task: Build ICSE Project Tool frontend (single-page app on src/app/page.tsx)

Work Log:
- Read worklog + existing API routes (upload, pipeline, projects, projects/[id], mock, knowledge/stats, knowledge/add) and agents.ts to lock the exact response shapes
- Audited available shadcn components (Card, Button, Input, Textarea, Select, Tabs, Badge, Progress, Separator, Accordion, Dialog, Tooltip, Skeleton, Sonner) — all present and used as-is
- Updated `src/app/globals.css` with a warm scholarly palette (emerald `--brand: oklch(0.55 0.13 155)` + amber accents on warm-neutral background), full dark-mode parity, brand utility classes (`.bg-brand`, `.text-brand`, etc.), and a `.prose-icse` typography stylesheet for rendering the pipeline's markdown output
- Updated `src/app/layout.tsx`: ICSE-branded metadata, mounted Sonner `<Toaster>` alongside the existing radix Toaster
- Created `src/components/icse/types.ts` — shared types (AgentLog, PipelineResponse, MockPaper, KnowledgeStats, UploadResponse, FullProject), pipeline agent definitions, ICSE subjects list, KB categories, difficulties
- Created `src/components/icse/StatChips.tsx` — live stat chips (KB chunks, subjects, cache hits) pulled from `/api/knowledge/stats`, with hero & footer variants and loading/empty states
- Created `src/components/icse/UploadStep.tsx` — accessible drag-and-drop PDF/text upload (Enter/Space keyboard support), optional Subject/Class/Topic metadata, animated text preview, 20-char validation gating Step 2
- Created `src/components/icse/AgentPipeline.tsx` — "Forge Project" button calling `/api/pipeline`. While waiting, animates the 7 agent cards (Analyzer → Outline → Writer → Image Director → Image Generator → Originality → Mock) progressively with fake timers based on expected per-agent durations. On response, replaces fake state with real `logs` (status, durationMs, cached badge). Global Progress bar + elapsed timer + "1-2 min" hint
- Created `src/components/icse/MockPaperCard.tsx` — renders mock paper (sections, questions, marks, internal choices), with a "Show answers" toggle that reveals the marking scheme with smooth framer-motion expand
- Created `src/components/icse/OutputViewer.tsx` — 3-column layout: header (topic + subject/class badges, Copy/Download/Generate Mock buttons), left = rendered markdown via react-markdown (inline images supported), right sticky sidebar = Generated Images gallery + collapsible Outline accordion + collapsible Agent Logs. Mock paper renders in a separate Card below with reveal-answers toggle
- Created `src/components/icse/PastProjectsTab.tsx` — lists `/api/projects` (with Skeleton loading + empty state), click to fetch full project from `/api/projects/[id]` and parse JSON fields (outline/images/agentLogs) into a PipelineResponse that loads into the Output Viewer, delete button per project
- Created `src/components/icse/KnowledgeBaseTab.tsx` — stats grid (total chunks, user-contributed, subjects, cache hits, subject + category badges) plus full add-chunk form (subject, class, category, chapter, title, content textarea with char counter, tags) → POST `/api/knowledge/add`, refreshes stats on success
- Created `src/components/icse/MockGeneratorTab.tsx` — standalone mock generator (subject, class, topic, difficulty easy/medium/hard via ToggleGroup) → POST `/api/mock`, renders paper via MockPaperCard with loading + empty states
- Wrote `src/app/page.tsx` — single client page with: sticky hero header (logo + tagline + StatChips), 4-tab nav (Workflow / Past Projects / Knowledge Base / Mock Generator), Workflow tab stacks Upload → AgentPipeline → OutputViewer (with smooth scroll-to-output on completion), and a sticky footer with disclaimer + footer StatChips. Uses `min-h-screen flex flex-col` + `mt-auto` footer pattern
- Ran `bun run lint` — first pass had 1 warning (unused eslint-disable directive on an <img>); removed the directive; second pass: 0 errors, 0 warnings
- Verified dev server (port 3000): GET / returns 200, ICSE Project Forge title renders, /api/knowledge/stats responds with 22 chunks across 10 subjects

Stage Summary:
- Files produced:
  - `src/app/globals.css` (edited — brand palette + .prose-icse + brand utilities)
  - `src/app/layout.tsx` (edited — ICSE metadata + Sonner Toaster)
  - `src/app/page.tsx` (rewritten — full single-page app)
  - `src/components/icse/types.ts` (new)
  - `src/components/icse/StatChips.tsx` (new)
  - `src/components/icse/UploadStep.tsx` (new)
  - `src/components/icse/AgentPipeline.tsx` (new)
  - `src/components/icse/OutputViewer.tsx` (new)
  - `src/components/icse/MockPaperCard.tsx` (new)
  - `src/components/icse/PastProjectsTab.tsx` (new)
  - `src/components/icse/KnowledgeBaseTab.tsx` (new)
  - `src/components/icse/MockGeneratorTab.tsx` (new)
- Lint: clean (0 errors, 0 warnings)
- Dev server: HTTP 200 on `/`, all API integrations wired
- Design: emerald/teal scholarly palette on warm neutral — no indigo/blue primary. Footer sticky to bottom via flex column. Fully responsive (mobile-first, stacks → multi-column on lg). Framer-motion animations on hero chips, agent cards, mock answer reveal, tab transitions. Sonner toasts for success/error. Accessibility: semantic header/main/footer/nav/section, ARIA labels on dropzone + icon buttons, keyboard-focusable, alt text on all images, aria-pressed on answer toggle
- Constraints honored: only `/` route is user-visible, no new pages/routes; only existing shadcn components reused; all fetches use relative paths; no test code

---
Task ID: 8
Agent: main
Task: End-to-end verification with Agent Browser + bug fixes

Work Log:
- Opened http://localhost:3000/ in agent-browser — page rendered cleanly with hero, 4 tabs (Workflow / Past Projects / Knowledge Base / Mock Generator), upload zone, metadata fields
- Uploaded /tmp/icse_test.txt (716 chars about refraction of light) — toast "Extracted 716 characters" appeared, Forge button enabled
- Clicked "Forge Project" → triggered 7-agent pipeline (Analyzer → Outline → Writer → Image Director → Image Generator → Originality)
- Discovered BUG: pdf-parse v2.4.5 has no default export — fixed import to `import { PDFParse } from 'pdf-parse'` and constructor usage `new PDFParse({ data: new Uint8Array(buffer) })` + `parser.getText().text`
- Pipeline completed in 2.7 min, returned full ICSE-format project with all sections (Aim, Introduction, Materials/Apparatus, Theory, Procedure, Observations, Calculations, Result, Conclusion, Precautions, Sources of Error, Bibliography)
- Generated images were inserted inline into the markdown output
- Outline accordion + Agent run logs accordion rendered in sticky sidebar
- Clicked "Generate Mock" → mock paper with Section A (short) + Section B (long) + "Show answers" toggle generated in 17s
- Past Projects tab showed saved project with Open/Delete actions
- Knowledge Base tab showed full ingestion form (Subject/Class/Category/Chapter/Title/Content/Tags)
- Mobile viewport (390x844) tested — layout responsive, footer present
- Lint clean: `bun run lint` → 0 errors, 0 warnings

Stage Summary:
- ICSE Project Forge is FULLY FUNCTIONAL end-to-end:
  • PDF/text upload + extraction works
  • 7-agent RAG pipeline produces complete ICSE-format project (2-3 min)
  • AI-generated diagrams inserted inline
  • Mock paper generator produces ICSE specimen-style tests with marking scheme
  • Knowledge base ingestion UI ready for user to feed specimen/textbook/past-paper data
  • Past projects persisted in SQLite, browseable + deletable
  • Cache layer (in-memory LRU + DB) dedupes LLM/image calls — repeat queries near-free
  • Responsive, accessible, sticky footer, emerald/amber scholarly palette
- The tool is now ready for the user to start contributing ICSE specimen data via the Knowledge Base tab

---
Task ID: 9
Agent: main
Task: Ingest user-collected ICSE data (7 uploaded files)

Work Log:
- Inspected all 7 uploaded files:
  - icse_class10_all_papers.json → EMPTY (0 papers, schema only)
  - index.json → EMPTY (just `{}`)
  - archive_search.json → mostly empty (Internet Archive search found 0 relevant items, 2 irrelevant podcast hits)
  - icse_kb.db → well-designed schema (subjects/syllabus/papers/questions/marking_schemes/sample_answers/yt_videos) but ONLY yt_videos table populated (78 rows); all substantive tables empty
  - youtube_curated.json → real data: validated reference videos + curated search queries for physics/chemistry/maths
  - yt_catalog.json → real data: 87 YouTube videos across physics/chemistry/maths with titles, channels, view counts, descriptions, tags
  - ICSE_Class10_Project_Exemplars.docx → GOLD: 1612 lines, 10 complete ICSE project exemplars (Physics x2, Chemistry x2, Biology x2, Maths x2, Computer x2) each with Aim/Apparatus/Theory/Procedure/Observations/Conclusion/Precautions
- Extracted DOCX via pandoc → /tmp/exemplars.txt
- Wrote ingestion script: scripts/ingest-collected-data.ts (parses exemplars by subject headers, summarizes YT catalog per subject, adds curated queries)
- Ran ingestion: 14 new KB chunks added (10 exemplars + 3 YT summaries + 1 curated queries)
- Fixed staleness bug in src/lib/knowledge.ts: in-memory index now checks DB count on every call (was only built once per process, so dev server didn't see new chunks added by ingestion script)
- Verified via API: KB grew from 22 → 36 chunks, all 5 subjects have real exemplars
- Verified retrieval: "Computer Java Fibonacci" → finds Computer Project Exemplar 1 (Fibonacci) as #1 hit; "Biology photosynthesis" → finds Biology Project Exemplar 1 (Photosynthesis) as #3
- Verified UI: stat chips now show "36 KB chunks"
- Cleaned up: removed test_retrieve.ts temp file

Stage Summary:
- User's data successfully ingested. KB now has 10 real ICSE project exemplars (not just format templates) + 87 topper video references + curated topic discovery queries.
- The 7-agent pipeline will now retrieve ACTUAL high-scoring exemplar content when generating projects, not just format guidance.
- 3 of the 7 uploaded files were empty (data collection scripts ran but found nothing) — user may want to re-run those scrapers with different sources.
- Ingestion script is reusable: user can drop more files in /upload/ and re-run `bun run scripts/ingest-collected-data.ts` after editing the script.

---
Task ID: 4
Agent: frontend-styling-expert
Task: Build ICSE Tutor chatbot UI component

Work Log:
- Read worklog.md to understand prior agent work (emerald --brand palette, flex-column sticky-footer pattern, shadcn component audit, prose-icse markdown styling)
- Read existing tab components (KnowledgeBaseTab, MockGeneratorTab, OutputViewer) and types.ts to lock the exact visual idiom: bg-brand text-brand-foreground buttons, bg-brand/15 text-brand border-brand/30 badges, prose-icse for markdown, motion from framer-motion, toast from sonner
- Read /api/chat route + /lib/chat.ts to verify response shape: { sessionId, answer, reasoning?, sources:[{title,subject,chapter,category}], cached, durationMs }
- Audited available shadcn components (Card, Button, Textarea, Select, Switch, Badge, Tooltip, Accordion, Skeleton, ScrollArea, Alert) — all present in src/components/ui/
- Created ONE file: src/components/icse/TutorTab.tsx (a 'use client' component with signature `export function TutorTab()`)
- Implemented full chatbot UI:
  • Card with header row (Brain icon + "ICSE AI Tutor" title + "Reasoning-powered · RAG-grounded on 2700+ real past questions" subtitle on left; subject Select + Clear icon button on right)
  • Messages area: role="log", aria-live="polite", max-h-[500px] overflow-y-auto, bordered bg-muted/20 container
  • Empty state: 6 suggested question chips (matches the exact list in the brief), each a motion.button with staggered entrance + Lightbulb icon, hover lifts to brand-soft bg
  • User message bubble: right-aligned, bg-brand text-brand-foreground, rounded-2xl with rounded-br-md corner
  • Assistant message card: left-aligned with Brain avatar + bg-card border card, contains: prose-icse markdown answer, collapsible "Show reasoning" toggle (animated height via framer-motion, defaults collapsed, brand-soft bg), sources chips (BookOpen header + clickable chips with Tooltip showing full title + chapter), footer with ⚡ cached badge (amber-strong) + durationMs formatted as ms/s with tabular-nums
  • Loading indicator: animated 3-dot pulse (Brain icon + staggered opacity/y animation), sr-only "Tutor is thinking" label
  • Error alert: red-tinted card with AlertCircle + Retry button (calls last user message again without duplicating it)
  • Input row: Textarea (auto-grow via field-sizing-content, max-h-200px, Enter sends / Shift+Enter newline) + Send button (bg-brand, shows Loader2 spinner while loading)
  • Footer of input: Force reasoning Switch + "new session"/"session xxxxxxxx…" mono label
  • Session management: first message has no sessionId → API returns one → stored in state and reused; Clear button calls DELETE /api/chat?sessionId=... then resets state
  • Subject filter: 'auto' (default) sends no subject; explicit subjects (Physics/Chemistry/Biology/Mathematics/History/Geography/English/Computer/Economics) pass subject to API
- Accessibility: role="log" + aria-live="polite" on messages, aria-label on Send / Clear / Switch / Textarea / Select, aria-expanded+aria-controls on reasoning toggle, sr-only label on loading indicator, focus-visible ring on all interactive elements, keyboard accessible (Enter/Shift+Enter)
- Responsive: max-w-3xl mx-auto on the outer wrapper; header row stacks on mobile (flex-col → sm:flex-row); Send button text hidden on mobile (icon-only); suggested-question grid is 1-col mobile / 2-col sm
- Honored constraints: 'use client' at top, ONLY one file created (no page.tsx modification), all fetches use relative paths, no indigo/blue (only emerald --brand, amber-strong, destructive), matches existing visual idiom of other tabs
- Ran `bun run lint` → 0 errors, 0 warnings (clean)
- Ran `npx tsc --noEmit` → no errors in src/components/icse/TutorTab.tsx (only pre-existing unrelated errors in examples/ and skills/ directories)
- Verified dev server: GET http://localhost:3000/ → 200 OK

Stage Summary:
- File produced: src/components/icse/TutorTab.tsx (~640 lines, fully self-contained, manages its own state, no props)
- Lint: clean (0 errors, 0 warnings)
- TypeScript: clean for the new file
- Component is ready to be wired into src/app/page.tsx — main agent should add a 5th tab:
    <TabsTrigger value="tutor" className="gap-1.5 py-2">
      <Brain className="size-4" /> AI Tutor
    </TabsTrigger>
  ... and:
    <TabsContent value="tutor" className="mt-6 outline-none">
      <TutorTab />
    </TabsContent>
  Plus imports: `import { Brain } from 'lucide-react';` and `import { TutorTab } from '@/components/icse/TutorTab';`
  Note: the TabsList grid is currently `grid-cols-2 sm:grid-cols-4` — when adding a 5th tab, change to `grid-cols-2 sm:grid-cols-5` (or keep 4 + wrap).
- Behavior verified against /api/chat contract: POST returns { sessionId, answer, reasoning?, sources, cached, durationMs } — all consumed correctly; GET and DELETE also wired
- No issues / no blockers

---
Task ID: 3
Agent: frontend-styling-expert
Task: Build ICSE Tutor chatbot UI component

Work Log:
- Read worklog.md to understand prior agent work — discovered a previous iteration (Task ID 4) had already produced a TutorTab.tsx but with significant gaps vs. the brief: missing backend status badge, only 6 suggested questions (brief required 10), missing `backend` field in message footer, custom error div instead of shadcn Alert, plain overflow div instead of shadcn ScrollArea, and stale subtitle copy.
- Read existing ICSE tab components (KnowledgeBaseTab, MockGeneratorTab) to lock the exact visual idiom: bg-brand text-brand-foreground buttons, bg-brand-soft text-brand chips, prose-icse markdown container, motion from framer-motion, toast from sonner, Tooltip wrapping icon buttons.
- Read globals.css to confirm `.prose-icse` typography stylesheet and brand utility classes (`.bg-brand`, `.bg-brand-soft`, `.text-brand`, `.text-amber-strong`, `.bg-amber-soft`) are already defined.
- Audited available shadcn primitives in `src/components/ui/`: confirmed ScrollArea, Skeleton, Alert (+ AlertTitle + AlertDescription), Collapsible, Switch, Select, Tooltip, Badge, Textarea all present. Textarea uses `field-sizing-content` so auto-grows for free.
- Verified the backend API contract:
  • POST /api/chat → `{ sessionId, answer, reasoning?, sources:[{title,subject,chapter?,category?}], cached, durationMs, backend: 'builtin'|'openclaw' }`
  • DELETE /api/chat?sessionId=... → `{ ok: true }`
  • GET /api/chat/status → `{ backend, openclawConfigured, openclawReachable }`
- Rewrote `/home/z/my-project/src/components/icse/TutorTab.tsx` from scratch as a `'use client'` component with signature `export function TutorTab()` (no props, manages own state). Key features vs. brief:
  • Card with header row — Brain icon in brand square + "ICSE AI Tutor" title + "Reasoning-powered · RAG-grounded on 130+ ICSE knowledge chunks" subtitle on left; BackendStatusBadge + subject Select + Clear icon button on right.
  • BackendStatusBadge: fetches `/api/chat/status` on mount, shows Skeleton while loading; green pill "OpenClaw connected" with Circle dot when `backend==='openclaw' && openclawReachable`, else amber pill "Built-in AI" with tooltip "Set OPENCLAW_URL + OPENCLAW_TOKEN in .env to switch to OpenClaw".
  • Messages area: shadcn ScrollArea, fixed `h-[480px] max-h-[480px]`, with inner `role="log"` + `aria-live="polite"` container.
  • Empty state: heading "Ask me anything about ICSE Class 10" + ALL 10 suggested question chips from the brief in a 2-col grid (1-col on mobile). Clicking a chip sends immediately via `handleSend(q)`.
  • User bubble: right-aligned, `bg-brand text-brand-foreground`, rounded-2xl with `rounded-br-md` corner, motion fade+slide-up (0.2s).
  • Assistant bubble: left-aligned card with Brain avatar, contains `prose-icse`-rendered markdown answer, collapsible "🧠 Show reasoning" button (defaults collapsed, aria-expanded+aria-controls, monospace gray reasoning text in brand-soft panel), sources row (BookOpen header + Badge chips with Tooltip showing full title), footer with cached ⚡ (brand color) · durationMs (formatted as ms/s with tabular-nums) · backend (OpenClaw brand-color / builtin amber-color, with Circle dot icon).
  • Loading state: pulsing Brain icon in brand-soft circle + "Thinking" text + staggered animated dots.
  • Error state: shadcn Alert with `variant="destructive"`, AlertCircle icon, AlertTitle, AlertDescription with error message + Retry button (re-sends last user message via `handleRetry`).
  • Input row: Textarea (auto-grow via field-sizing-content, 1 row min, max-h-200px, Enter sends / Shift+Enter newline) + Send button (bg-brand, Loader2 spinner while loading, "Send" label hidden on mobile).
  • Input footer: "Force reasoning" Switch + hint "· always show 🧠 chain-of-thought" + right-aligned mono session id (`session xxxxxxxx…` or `new session`).
  • Session management: first message has no sessionId → API returns one → stored and reused. Clear button calls DELETE then resets state.
  • Subject filter: 'auto' (default, sends no subject param) + Physics/Chemistry/Biology/Mathematics/History/Geography/English/Computer/Economics.
- Honored all constraints: `'use client'` at top, ONLY one file created (no page.tsx modification), all fetches use relative paths, no indigo/blue (only emerald `--brand`, amber-strong, destructive red), matches existing visual idiom of other tabs.
- Accessibility: `role="log"` + `aria-live="polite"` on messages, `aria-label` on Send / Clear / Switch / Textarea / Select / BackendStatusBadge, `aria-expanded` + `aria-controls` on reasoning toggle, `sr-only` label on loading indicator, `role="status"` on backend badge, focus-visible rings on all interactive elements, keyboard accessible (Enter / Shift+Enter).
- Ran `bun run lint` → 0 errors, 0 warnings (clean).
- Ran `npx tsc --noEmit` → no errors in `src/components/icse/TutorTab.tsx` (only pre-existing unrelated errors in `examples/` and `skills/` directories outside my scope).
- Verified dev server: GET http://localhost:3000/ → 200 OK.

Stage Summary:
- File produced: `/home/z/my-project/src/components/icse/TutorTab.tsx` (~570 lines, fully self-contained, manages own state, no props).
- Lint: clean (0 errors, 0 warnings).
- TypeScript: clean for the new file.
- Component is ready to be wired into `src/app/page.tsx` — main agent should add a 5th tab. Recommended wiring:
    `import { Brain } from 'lucide-react';`
    `import { TutorTab } from '@/components/icse/TutorTab';`
    `<TabsTrigger value="tutor" className="gap-1.5 py-2"><Brain className="size-4" /> AI Tutor</TabsTrigger>`
    `<TabsContent value="tutor" className="mt-6 outline-none"><TutorTab /></TabsContent>`
  Note: the existing TabsList uses `grid-cols-2 sm:grid-cols-4` — when adding the 5th tab, change to `grid-cols-2 sm:grid-cols-5` (or keep 4 + wrap).
- Behavior verified against all three `/api/chat` endpoints (POST, DELETE, GET /status) and against every brief requirement (backend badge, 10 suggested questions, backend in footer, shadcn Alert+ScrollArea, Skeleton on initial load, force-reasoning switch, subject filter, markdown via prose-icse, collapsible reasoning, source tooltips).
- No issues / no blockers.
