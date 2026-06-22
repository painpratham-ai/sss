// ICSE Multi-Agent Pipeline
//
// Each agent is a prompt-engineered specialist. They run sequentially because
// each depends on the previous output, except image generation which can run
// in parallel with the writer.
//
// Pipeline:
//   1. Analyzer Agent    — identifies subject, class, topic, key concepts from PDF text
//   2. Outline Agent     — builds ICSE-compliant project structure (uses KB context)
//   3. Writer Agent      — produces humanized, non-plagiarized prose section-by-section
//   4. Image Director    — decides what diagrams/figures to generate
//   5. Image Generator   — generates the cutout images (image-generation skill, cached)
//   6. Originality Agent — rewrites to ensure uniqueness and human voice
//   7. (Optional) Mock Agent — produces specimen-style mock paper
//
// All LLM calls go through cachedLLM for cost control.

import ZAI from 'z-ai-web-dev-sdk';
import { buildContext, retrieve } from './knowledge';
import { cachedLLM, cachedImage } from './llm-cache';
import { callModel } from './models';
import path from 'path';
import fs from 'fs/promises';

let zaiInstance: Awaited<ReturnType<typeof ZAI.create>> | null = null;
async function getZai() {
  if (!zaiInstance) zaiInstance = await ZAI.create();
  return zaiInstance;
}

export interface AgentLog {
  agent: string;
  status: 'running' | 'completed' | 'failed';
  startedAt: string;
  finishedAt?: string;
  durationMs?: number;
  cached?: boolean;
  output?: string;
  error?: string;
}

export interface PipelineInput {
  sourceText: string;
  sourceName: string;
  userTopic?: string;
  userSubject?: string;
  userClass?: string;
  board?: string;
  skipImages?: boolean; // skip image generation to save memory/time
  webSearch?: boolean; // retrieve fresh information from search engines
}

export interface PipelineOutput {
  subject: string;
  className: string;
  topic: string;
  outline: any;
  finalOutput: string;
  images: { prompt: string; path: string; caption: string }[];
  logs: AgentLog[];
  mockPaper?: any;
}

const log = (agent: string, status: AgentLog['status'], extra: Partial<AgentLog> = {}): AgentLog => ({
  agent, status,
  startedAt: new Date().toISOString(),
  ...extra
});

// ============================================================
// AGENT 1: ANALYZER
// Identifies subject, class, topic, and extracts key concepts
// from the uploaded PDF text.
// ============================================================
export async function runAnalyzer(input: PipelineInput): Promise<{
  subject: string; className: string; topic: string; keyConcepts: string[];
  log: AgentLog;
}> {
  const startedAt = Date.now();
  const agentLog = log('Analyzer', 'running');

  const activeBoard = input.board || 'ICSE';
  const subjectsList = activeBoard === 'CBSE'
    ? 'Science, Physics, Chemistry, Biology, Mathematics, Social Science, History, Geography, Civics, Economics, English, Computer Science, General'
    : 'Physics, Chemistry, Biology, Mathematics, History, Geography, Civics, English, Computer, Economics, General';

  const systemPrompt = `You are the ANALYZER AGENT in an ${activeBoard} Board exam-prep system.
Your job: analyze the text a student uploaded (PDF content, notes, or topic) and identify:
1. The ${activeBoard} subject (${subjectsList})
2. The class (Class 9 or Class 10 — default 10 if unclear)
3. The specific topic of the project
4. 3-6 key scientific/historical/mathematical concepts involved

Respond ONLY with valid JSON, no prose:
{"subject":"...","className":"10","topic":"...","keyConcepts":["...","..."]}`;

  const userPrompt = `User-suggested subject: ${input.userSubject || '(unspecified)'}
User-suggested topic: ${input.userTopic || '(unspecified)'}
Source filename: ${input.sourceName}

Source text (truncated to first 4000 chars):
${input.sourceText.slice(0, 4000)}`;

  try {
    const { content, cached } = await cachedLLM(
      [{ role: 'assistant', content: systemPrompt }, { role: 'user', content: userPrompt }],
      async () => {
        const result = await callModel({
          messages: [
            { role: 'assistant', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.3,
          question: userPrompt,
          preferredModel: 'auto'
        });
        return result.content;
      },
      { temperature: 0.3 }
    );

    // Extract JSON from response (handle code fences)
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { subject: 'General', className: '10', topic: 'Untitled', keyConcepts: [] };

    agentLog.status = 'completed';
    agentLog.finishedAt = new Date().toISOString();
    agentLog.durationMs = Date.now() - startedAt;
    agentLog.cached = cached;
    agentLog.output = `Subject: ${parsed.subject} | Class: ${parsed.className} | Topic: ${parsed.topic}`;

    return {
      subject: parsed.subject || input.userSubject || 'General',
      className: parsed.className || input.userClass || '10',
      topic: parsed.topic || input.userTopic || 'Untitled Project',
      keyConcepts: parsed.keyConcepts || [],
      log: agentLog
    };
  } catch (err: any) {
    agentLog.status = 'failed';
    agentLog.error = err.message;
    agentLog.finishedAt = new Date().toISOString();
    agentLog.durationMs = Date.now() - startedAt;
    return {
      subject: input.userSubject || 'General',
      className: input.userClass || '10',
      topic: input.userTopic || 'Untitled',
      keyConcepts: [],
      log: agentLog
    };
  }
}

// ============================================================
// AGENT 2: OUTLINE
// Builds comprehensive 15-25 section project structure using RAG context.
// Generates competition-winning, exhaustive outlines.
// ============================================================
export async function runOutlineAgent(
  subject: string, className: string, topic: string, keyConcepts: string[], webContext?: string, board: string = 'ICSE'
): Promise<{ outline: any; log: AgentLog }> {
  const startedAt = Date.now();
  const agentLog = log('Outline', 'running');

  const context = await buildContext(`${board} ${subject} project format exemplar`, {
    subject, category: 'project_exemplar', topK: 3, board
  });

  const systemPrompt = board === 'CBSE'
    ? `You are the OUTLINE AGENT for CBSE Board project generation.
You MUST produce a MASSIVE, COMPREHENSIVE outline for a competition-winning project.
The outline MUST contain 15 to 25 sections covering every aspect in extreme depth.

MANDATORY SECTIONS (adapt names to the subject):
1. Cover Page
2. Table of Contents
3. Acknowledgement
4. Abstract / Synopsis (brief summary of entire project)
5. Aim / Objective
6. Introduction (historical background, relevance, scope)
7. Literature Review / Background Research (what others have studied)
8. Theoretical Framework / Scientific Principles
9. Materials / Apparatus / Software Requirements
10. Methodology / Procedure (step-by-step detailed)
11. Observations / Data Collection
12. Data Analysis / Calculations
13. Results / Findings
14. Discussion (interpret results, compare with theory)
15. Case Studies / Real-World Examples (2-3 detailed cases)
16. Real-World Applications
17. Environmental / Social Impact
18. Limitations / Sources of Error
19. Precautions / Safety Measures
20. Future Scope / Further Research
21. Conclusion
22. Glossary of Key Terms
23. Bibliography / References
24. Appendix (supplementary data, extra diagrams)

Remove sections that don't apply (e.g., Apparatus for History) but ALWAYS keep at least 15 sections.
For each section, write a 2-3 line description of what detailed content it should contain.

Respond ONLY with valid JSON:
{"title":"...","sections":[{"name":"...","description":"..."}]}`
    : `You are the OUTLINE AGENT for ICSE Board project generation.
You MUST produce a MASSIVE, COMPREHENSIVE outline for a competition-winning project.
The outline MUST contain 15 to 25 sections covering every aspect in extreme depth.

MANDATORY SECTIONS (adapt names to the subject):
1. Cover Page
2. Certificate
3. Acknowledgement
4. Abstract / Synopsis (brief summary of entire project)
5. Aim / Objective
6. Introduction (historical context, modern relevance, scope of study)
7. Literature Review / Background Research (what textbooks and experts say)
8. Theory / Scientific Principles (core concepts, laws, formulas)
9. Materials / Apparatus / Software Requirements
10. Detailed Methodology / Procedure (step-by-step with reasoning)
11. Observations / Data Collection (tables, measurements)
12. Calculations / Data Analysis (worked examples, graphs)
13. Results / Findings (summary of outcomes)
14. Discussion (interpret results, compare with expected values)
15. Case Studies / Real-World Examples (2-3 detailed cases)
16. Real-World Applications (industry, daily life)
17. Environmental / Social Impact
18. Precautions / Safety Measures
19. Sources of Error / Limitations
20. Future Scope / Extensions
21. Conclusion
22. Glossary of Key Terms
23. Bibliography / References
24. Appendix (raw data, additional diagrams, formulae table)

Remove sections that truly don't apply (e.g., Apparatus for History) but ALWAYS keep at least 15 sections.
For each section, write a 2-3 line description of what detailed content it should contain.
Adapt section names to the subject (e.g., for History: Theory → Historical Context & Analysis,
for Computer: Materials → Software/Hardware Requirements, Apparatus → Development Environment).

Respond ONLY with valid JSON:
{"title":"...","sections":[{"name":"...","description":"..."}]}`;

  const userPrompt = `Subject: ${subject}
Class: ${className}
Topic: ${topic}
Key concepts: ${keyConcepts.join(', ')}

${webContext ? `RECENT WEB SEARCH CONTEXT (incorporate details for fresh information):\n${webContext}\n` : ''}

${board} format reference (from knowledge base):
${context || `(no exemplar found in KB — use default ${board} format)`}`;

  try {
    const { content, cached } = await cachedLLM(
      [{ role: 'assistant', content: systemPrompt }, { role: 'user', content: userPrompt }],
      async () => {
        const result = await callModel({
          messages: [
            { role: 'assistant', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.4,
          question: userPrompt,
          preferredModel: 'auto'
        });
        return result.content;
      },
      { temperature: 0.4 }
    );

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const outline = jsonMatch ? JSON.parse(jsonMatch[0]) : { title: topic, sections: [] };

    agentLog.status = 'completed';
    agentLog.finishedAt = new Date().toISOString();
    agentLog.durationMs = Date.now() - startedAt;
    agentLog.cached = cached;
    agentLog.output = `Generated ${outline.sections?.length ?? 0} sections`;

    return { outline, log: agentLog };
  } catch (err: any) {
    agentLog.status = 'failed';
    agentLog.error = err.message;
    agentLog.finishedAt = new Date().toISOString();
    agentLog.durationMs = Date.now() - startedAt;
    return { outline: { title: topic, sections: [] }, log: agentLog };
  }
}

// ============================================================
// AGENT 3: WRITER
// Produces massive, deeply detailed prose for each section.
// Fetches per-section KB context for maximum relevance.
// Target: 400-800 words per section for competition-winning depth.
// ============================================================
async function writeSection(
  section: { name: string; description: string },
  subject: string, className: string, topic: string,
  outline: any, sourceText: string, webContext?: string, kbContext?: string, board: string = 'ICSE'
): Promise<string> {
  const systemPrompt = `You are a specialist section writer in a ${board} Board project-prep system.
Your task: write the section "${section.name}" for a project on topic "${topic}".
The section description/guideline is: "${section.description}".

CRITICAL REQUIREMENTS — you MUST follow ALL of these:
1. LENGTH: Write 400-800 words for this section. Short sections are UNACCEPTABLE.
2. DEPTH: Include proper definitions of all key terms mentioned, with at least 2 concrete examples per concept.
3. VOICE: Write in a Class 9/10 Indian student's natural voice — clear, confident, not robotic.
4. FORMATTING: Use bullet points, numbered lists, sub-headings (###), key equations (in LaTeX-style), comparison tables, and examples where appropriate.
5. TERMINOLOGY: Use correct ${board} Board terminology and definitions from the syllabus.
6. ORIGINALITY: Paraphrase everything — do NOT copy word-for-word from source material.
7. CROSS-REFERENCES: Reference other sections of the project where relevant (e.g., "As discussed in the Theory section...").
8. DATA: Include specific numbers, dates, values, formulas, or statistics wherever applicable.
9. STRUCTURE: Start with a brief introductory paragraph, then dive into detailed sub-points.

IMPORTANT CONSTRAINTS:
- Start directly with the heading "## ${section.name}".
- Write ONLY the content of this specific section.
- Do NOT add preamble, conversational commentary, or meta text.
- Do NOT write "In this section we will..." — just write the actual content directly.`;

  // Fetch section-specific KB context
  let sectionKbContext = kbContext || '';
  try {
    const sectionCtx = await buildContext(`${board} ${subject} ${section.name} ${topic} class ${className}`, {
      subject, topK: 2, board
    });
    if (sectionCtx) sectionKbContext = sectionCtx + '\n\n' + (kbContext || '').slice(0, 1000);
  } catch (e) {
    // Use fallback kbContext
  }

  const userPrompt = `Subject: ${subject} | Class: ${className} | Topic: ${topic}
Section to Write: ${section.name}
Section Guideline: ${section.description}
Minimum Words Required: 400-800 words

Full Outline Context (for cross-referencing):
${JSON.stringify(outline, null, 2)}

SOURCE MATERIAL (use for facts/paraphrasing):
${sourceText.slice(0, 4000)}

${webContext ? `RECENT WEB SEARCH CONTEXT (include latest facts/data):\n${webContext.slice(0, 2500)}\n` : ''}
${sectionKbContext ? `${board} KNOWLEDGE BASE CONTEXT:\n${sectionKbContext.slice(0, 2500)}\n` : ''}

Now write a comprehensive, detailed section (400-800 words) in markdown starting with ## ${section.name}:`;

  try {
    const { content } = await cachedLLM(
      [{ role: 'assistant', content: systemPrompt }, { role: 'user', content: userPrompt }],
      async () => {
        const result = await callModel({
          messages: [
            { role: 'assistant', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.7,
          question: `Write a detailed 400-800 word section ${section.name} of ${board} project on ${topic}`,
          preferredModel: 'mistral'
        });
        return result.content;
      },
      { temperature: 0.7 }
    );
    return content;
  } catch (err: any) {
    console.error(`[Writer] Failed to generate section "${section.name}":`, err.message);
    return `## ${section.name}\n\n*(Error generating section content: ${err.message})*`;
  }
}

export async function runWriterAgent(
  subject: string, className: string, topic: string,
  outline: any, sourceText: string, webContext?: string, board: string = 'ICSE'
): Promise<{ content: string; log: AgentLog }> {
  const startedAt = Date.now();
  const agentLog = log('Writer', 'running');

  // Retrieve general KB context for the topic
  const kbContext = await buildContext(`${board} ${subject} ${topic} class ${className} concepts theory`, {
    subject, topK: 4, board
  });

  try {
    const sections = outline.sections || [];
    if (sections.length === 0) {
      throw new Error("Outline has no sections");
    }

    console.log(`[Writer] Launching ${sections.length} sections in parallel (with per-section KB context)...`);
    const sectionTexts = await Promise.all(
      sections.map((sec: any) =>
        writeSection(sec, subject, className, topic, outline, sourceText, webContext, kbContext, board)
      )
    );

    // Filter out Cover Page, Certificate, Acknowledgement, Table of Contents from the body
    const filteredTexts = sectionTexts.filter((text) => {
      const lower = text.toLowerCase();
      return !(
        lower.includes('## cover page') ||
        lower.includes('## certificate') ||
        lower.includes('## acknowledgement') ||
        lower.includes('## table of contents')
      );
    });

    const combinedContent = filteredTexts.join('\n\n');
    const wordCount = combinedContent.split(/\s+/).length;

    agentLog.status = 'completed';
    agentLog.finishedAt = new Date().toISOString();
    agentLog.durationMs = Date.now() - startedAt;
    agentLog.output = `Generated ${combinedContent.length} chars (~${wordCount} words) across ${filteredTexts.length} sections`;

    return { content: combinedContent, log: agentLog };
  } catch (err: any) {
    agentLog.status = 'failed';
    agentLog.error = err.message;
    agentLog.finishedAt = new Date().toISOString();
    agentLog.durationMs = Date.now() - startedAt;
    return { content: '', log: agentLog };
  }
}

// ============================================================
// AGENT 4: IMAGE DIRECTOR
// Decides what diagrams/figures the project needs.
// ============================================================
export async function runImageDirector(
  subject: string, topic: string, outline: any, content: string, board: string = 'ICSE'
): Promise<{ images: { prompt: string; caption: string; section: string }[]; log: AgentLog }> {
  const startedAt = Date.now();
  const agentLog = log('Image Director', 'running');

  const systemPrompt = `You are the IMAGE DIRECTOR AGENT for a ${board} student project.
Given the project content, decide what DIAGRAMS / FIGURES / ILLUSTRATIONS the project needs.
For ${board} projects, typical figures include:
- Physics: circuit diagrams, ray diagrams, free-body diagrams, experimental setups
- Chemistry: apparatus diagrams, reaction schematics, molecular structures
- Biology: labeled biological diagrams (pencil-sketch style)
- Math: geometric constructions, graphs
- History: maps, timelines, photographs of historical events
- Geography: topographical maps, climatic charts, distribution maps

Suggest 2-4 images. For each, provide:
1. A detailed image-generation prompt (describe what to draw, ${board}-style diagram, clean, labeled)
2. A short caption to place under the figure in the project
3. Which section it belongs to

Respond ONLY with JSON:
{"images":[{"prompt":"...","caption":"Fig 1: ...","section":"..."}]}`;

  const userPrompt = `Subject: ${subject} | Topic: ${topic}

OUTLINE:
${JSON.stringify(outline, null, 2).slice(0, 1500)}

CONTENT (truncated):
${content.slice(0, 2000)}`;

  try {
    const { content: response, cached } = await cachedLLM(
      [{ role: 'assistant', content: systemPrompt }, { role: 'user', content: userPrompt }],
      async () => {
        const result = await callModel({
          messages: [
            { role: 'assistant', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.5,
          question: userPrompt,
          preferredModel: 'auto'
        });
        return result.content;
      },
      { temperature: 0.5 }
    );

    const jsonMatch = response.match(/\{[\s\S]*\}/);
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { images: [] };

    agentLog.status = 'completed';
    agentLog.finishedAt = new Date().toISOString();
    agentLog.durationMs = Date.now() - startedAt;
    agentLog.cached = cached;
    agentLog.output = `Planned ${parsed.images?.length ?? 0} images`;

    return { images: parsed.images || [], log: agentLog };
  } catch (err: any) {
    agentLog.status = 'failed';
    agentLog.error = err.message;
    agentLog.finishedAt = new Date().toISOString();
    agentLog.durationMs = Date.now() - startedAt;
    return { images: [], log: agentLog };
  }
}

// ============================================================
// AGENT 5: IMAGE GENERATOR (uses Pollinations AI or Z.ai fallback, cached)
// ============================================================
export async function runImageGenerator(
  images: { prompt: string; caption: string; section: string }[], board: string = 'ICSE'
): Promise<{ images: { prompt: string; path: string; caption: string; section: string }[]; log: AgentLog }> {
  const startedAt = Date.now();
  const agentLog = log('Image Generator', 'running');

  const outputDir = path.join(process.cwd(), 'public', 'generated');
  await fs.mkdir(outputDir, { recursive: true });

  const results: { prompt: string; path: string; caption: string; section: string }[] = [];

  for (const img of images.slice(0, 4)) {
    try {
      const size = '1024x1024';
      const { path: imgPath, cached } = await cachedImage(img.prompt, size, async () => {
        const fullPrompt = `${img.prompt}. Clean ${board}-style diagram, labeled, suitable for a school project, clear lines, educational illustration.`;
        let buffer: Buffer | null = null;

        // TIER 1: Gemini Imagen
        const geminiKey = process.env.GEMINI_API_KEY;
        if (geminiKey) {
          try {
            console.log(`[ImageGen] Trying Gemini Imagen for: "${img.prompt.slice(0, 40)}..."`);
            const url = `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${geminiKey}`;
            const res = await fetch(url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                instances: [{ prompt: fullPrompt }],
                parameters: {
                  numberOfImages: 1,
                  outputMimeType: 'image/png',
                  aspectRatio: '1:1'
                }
              })
            });
            const data = await res.json();
            if (res.ok && data.predictions?.[0]?.bytesBase64Encoded) {
              const base64 = data.predictions[0].bytesBase64Encoded;
              buffer = Buffer.from(base64, 'base64');
              console.log('[ImageGen] Gemini Imagen generation succeeded!');
            } else {
              const errMsg = data.error?.message || 'Unknown error';
              console.log(`[ImageGen] Gemini Imagen generation failed: ${errMsg}. Trying fallback...`);
            }
          } catch (err: any) {
            console.log(`[ImageGen] Gemini Imagen call errored: ${err.message}. Trying fallback...`);
          }
        }

        // TIER 2: Pollinations AI
        if (!buffer) {
          try {
            console.log(`[ImageGen] Trying Pollinations AI for: "${img.prompt.slice(0, 40)}..."`);
            const pollinationsKey = process.env.POLLINATIONS_API_KEY;
            const url = `https://gen.pollinations.ai/image/${encodeURIComponent(fullPrompt)}?width=1024&height=1024&model=flux&nologo=true&private=true&enhance=false`;
            
            const headers: Record<string, string> = {};
            if (pollinationsKey) {
              headers['Authorization'] = `Bearer ${pollinationsKey}`;
            }

            const res = await fetch(url, { headers });
            if (res.ok) {
              buffer = Buffer.from(await res.arrayBuffer());
              console.log('[ImageGen] Pollinations AI generation succeeded!');
            } else {
              console.log(`[ImageGen] Pollinations API failed: ${res.status} ${res.statusText}. Trying Z.ai...`);
            }
          } catch (err: any) {
            console.log(`[ImageGen] Pollinations errored: ${err.message}. Trying Z.ai...`);
          }
        }

        // TIER 3: Z.ai / AutoGLM fallback
        if (!buffer) {
          try {
            console.log(`[ImageGen] Trying Z.ai for: "${img.prompt.slice(0, 40)}..."`);
            const zai = await getZai();
            const response = await zai.images.generations.create({
              prompt: fullPrompt,
              size
            });
            const base64 = response.data[0].base64;
            buffer = Buffer.from(base64, 'base64');
            console.log('[ImageGen] Z.ai generation succeeded!');
          } catch (err: any) {
            console.error('[ImageGen] All image providers failed:', err.message);
            throw new Error(`Failed to generate image via any provider: ${err.message}`);
          }
        }

        const filename = `img_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.png`;
        const fullPath = path.join(outputDir, filename);
        await fs.writeFile(fullPath, buffer);
        return `/generated/${filename}`;
      });
      results.push({ ...img, path: imgPath });
    } catch (err: any) {
      console.error('Image gen failed:', err.message);
    }
  }

  agentLog.status = 'completed';
  agentLog.finishedAt = new Date().toISOString();
  agentLog.durationMs = Date.now() - startedAt;
  agentLog.output = `Generated ${results.length}/${images.length} images`;

  return { images: results, log: agentLog };
}

// ============================================================
// AGENT 3.5: DEPTH EXPANDER
// Identifies gaps, shallow sections, and missing content, then
// generates additional paragraphs, examples, case studies, and
// data tables to fill those gaps.
// ============================================================
export async function runDepthExpanderAgent(
  content: string, subject: string, className: string, topic: string, outline: any, board: string = 'ICSE'
): Promise<{ content: string; log: AgentLog }> {
  const startedAt = Date.now();
  const agentLog = log('Depth Expander', 'running');

  // Split content into sections
  const sectionChunks = content.split(/(?=## )/).filter(s => s.trim());

  const expandedSections: string[] = [];
  let totalExpanded = 0;

  for (const chunk of sectionChunks) {
    const wordCount = chunk.split(/\s+/).length;
    // Only expand sections that are too short (< 350 words)
    if (wordCount < 350) {
      try {
        const sectionHeadingMatch = chunk.match(/^## (.+?)$/m);
        const sectionName = sectionHeadingMatch ? sectionHeadingMatch[1].trim() : 'Unknown';

        const systemPrompt = `You are the DEPTH EXPANDER AGENT for a ${board} Board project.
The section "${sectionName}" in a project on "${topic}" is TOO SHORT (only ${wordCount} words).

Your job: EXPAND this section to at least 500 words by adding:
1. Additional detailed explanations of concepts
2. 2-3 concrete real-world examples or case studies
3. Relevant data, statistics, or numerical values
4. Comparison tables or bullet-point breakdowns where useful
5. Historical context or background information
6. Practical applications or implications

RULES:
- Keep the existing content INTACT — only ADD new content after/between existing paragraphs
- Maintain the same ## heading
- Write in a Class ${className} Indian student's voice
- Keep ${board} Board terminology
- Do NOT add meta-commentary like "Let me expand..." — just write the content

Return the COMPLETE expanded section (original + new content) starting with ## ${sectionName}`;

        const { content: expanded } = await cachedLLM(
          [{ role: 'assistant', content: systemPrompt }, { role: 'user', content: `Original section:\n${chunk}` }],
          async () => {
            const result = await callModel({
              messages: [
                { role: 'assistant', content: systemPrompt },
                { role: 'user', content: `Original section (${wordCount} words — needs expansion to 500+):\n${chunk}` }
              ],
              temperature: 0.75,
              question: `Expand the section ${sectionName} of ${board} project on ${topic} from ${wordCount} words to 500+ words`,
              preferredModel: 'auto'
            });
            return result.content;
          },
          { temperature: 0.75 }
        );
        expandedSections.push(expanded);
        totalExpanded++;
      } catch (err: any) {
        console.error(`[DepthExpander] Failed to expand section:`, err.message);
        expandedSections.push(chunk);
      }
    } else {
      expandedSections.push(chunk);
    }
  }

  const expandedContent = expandedSections.join('\n\n');
  const finalWordCount = expandedContent.split(/\s+/).length;

  agentLog.status = 'completed';
  agentLog.finishedAt = new Date().toISOString();
  agentLog.durationMs = Date.now() - startedAt;
  agentLog.output = `Expanded ${totalExpanded} sections. Final: ~${finalWordCount} words`;

  return { content: expandedContent, log: agentLog };
}

// ============================================================
// AGENT 6: ORIGINALITY REVIEWER
// Section-by-section rewriting for uniqueness and human voice.
// Processes each section independently for better quality.
// ============================================================
export async function runOriginalityAgent(
  content: string, subject: string, topic: string, board: string = 'ICSE'
): Promise<{ content: string; log: AgentLog }> {
  const startedAt = Date.now();
  const agentLog = log('Originality', 'running');

  const systemPrompt = `You are the ORIGINALITY AGENT for a ${board} Board project.
Your job: rewrite the following section to ensure:
1. NO plagiarism — paraphrase any sentence that sounds like textbook copy
2. Human voice — vary sentence length, use natural transitions, occasional first-person ("I observed that...", "In my research...")
3. Uniqueness — every sentence should be reworded so a plagiarism checker returns < 15% match
4. Preserve ALL factual accuracy, ${board} terminology, data, formulas, and examples
5. Keep the SAME section heading (## ...) and structure
6. Do NOT shorten the content — maintain the same depth and length

Return ONLY the rewritten section markdown. Same structure, same depth, fresh wording.`;

  try {
    // Split into sections and rewrite each independently
    const sectionChunks = content.split(/(?=## )/).filter(s => s.trim());

    console.log(`[Originality] Processing ${sectionChunks.length} sections for uniqueness...`);

    const rewrittenSections = await Promise.all(
      sectionChunks.map(async (chunk) => {
        try {
          const { content: rewritten } = await cachedLLM(
            [{ role: 'assistant', content: systemPrompt }, { role: 'user', content: `Subject: ${subject}\nTopic: ${topic}\n\nOriginal section to rewrite:\n${chunk}` }],
            async () => {
              const result = await callModel({
                messages: [
                  { role: 'assistant', content: systemPrompt },
                  { role: 'user', content: `Subject: ${subject}\nTopic: ${topic}\n\nOriginal section to rewrite:\n${chunk}` }
                ],
                temperature: 0.85,
                question: `Paraphrase this section for uniqueness: ${chunk.slice(0, 200)}`,
                preferredModel: 'mistral'
              });
              return result.content;
            },
            { temperature: 0.85 }
          );
          return rewritten || chunk;
        } catch (err: any) {
          console.error(`[Originality] Failed to rewrite section:`, err.message);
          return chunk; // Fall back to original if rewriting fails
        }
      })
    );

    const finalContent = rewrittenSections.join('\n\n');

    agentLog.status = 'completed';
    agentLog.finishedAt = new Date().toISOString();
    agentLog.durationMs = Date.now() - startedAt;
    agentLog.output = `Rewrote ${sectionChunks.length} sections (${finalContent.length} chars)`;

    return { content: finalContent || content, log: agentLog };
  } catch (err: any) {
    agentLog.status = 'failed';
    agentLog.error = err.message;
    agentLog.finishedAt = new Date().toISOString();
    agentLog.durationMs = Date.now() - startedAt;
    return { content, log: agentLog };
  }
}

// ============================================================
// AGENT 7: MOCK PAPER GENERATOR
// Produces ICSE/CBSE specimen-style mock paper for the topic.
// ============================================================
export async function runMockAgent(
  subject: string, className: string, topic: string, difficulty: string = 'medium', format: string = 'full', isPyq: boolean = false, year: number = 2024, board: string = 'ICSE', questionTypes?: string[]
): Promise<{ paper: any; log: AgentLog }> {
  const startedAt = Date.now();
  const agentLog = log('Mock Generator', 'running');

  const patternCtx = await buildContext(`${board} ${subject} specimen paper pattern marks`, {
    subject, category: 'specimen_pattern', topK: 2, board
  });
  const pastCtx = await buildContext(`${board} ${subject} ${topic} past paper questions`, {
    subject, category: 'past_paper', topK: 3, board
  });

  let formatText = '';
  if (isPyq) {
    formatText = `Task: Generate a ${board} Past Year Question (PYQ) worksheet containing actual-style exam questions from the year ${year}. The questions must represent the real syllabus and difficulty of the ${year} board exam.`;
  } else if (format === 'custom') {
    const typesStr = questionTypes && questionTypes.length > 0
      ? questionTypes.map(t => {
          if (t === 'mcq') return 'MCQ (type: "mcq", 1 mark each, must include "options" array of 4 choices and "answerIndex" pointing to correct choice index 0-3)';
          if (t === 'fill_in_the_blank') return 'Fill in the Blanks (type: "fill_in_the_blank", 1 mark each, the question string "q" must have a blank "________" and "answer" contains the exact word/phrase)';
          if (t === 'very_short') return 'Very Short Answer (type: "very_short", 2 marks each)';
          if (t === 'short') return 'Short Answer (type: "short", 3 marks each)';
          if (t === 'long') return 'Long Answer (type: "long", 5 marks each)';
          return t;
        }).join(', ')
      : 'MCQ (type: "mcq"), Fill in the Blanks (type: "fill_in_the_blank"), and written questions (type: "short" / "long")';
      
    formatText = `Task: Generate a Custom Interactive Test.
It MUST contain questions of the following types: ${typesStr}.
For each question, ensure the "type" field is explicitly set to the respective question type name.
For MCQ questions, you MUST include "options" (array of 4 choices) and "answerIndex" (integer 0-3).
For Fill in the Blanks, ensure the question string "q" contains a blank "________" and "answer" contains the exact word/phrase.
Organize the questions into appropriate sections based on their type, e.g. "Section A (Multiple Choice Questions)", "Section B (Fill in the Blanks)", "Section C (Written Questions)", etc.
Generate 2-3 questions for each selected type.`;
  } else if (board === 'CBSE') {
    formatText = `Format Required: ${
      format === 'mcq'
        ? 'Only Multiple Choice Questions (generate 10 MCQs, 1 mark each)'
        : format === 'fill_in_the_blanks'
        ? 'Only Fill in the Blanks questions (generate 10 blanks, 1 mark each)'
        : format === 'short'
        ? 'Only Short Answer Questions (generate 6 short questions, 2-3 marks each)'
        : 'Full Specimen Paper: Section A (5 MCQs, 1 mark each) + Section B (2 Very Short Answer questions, 2 marks each) + Section C (2 Short Answer questions, 3 marks each) + Section D (2 Long Answer questions, 5 marks each) + Section E (1 Case-based question, 4 marks)'
    }`;
  } else {
    formatText = `Format Required: ${
      format === 'mcq'
        ? 'Only Multiple Choice Questions (generate 10 MCQs, 1 mark each)'
        : format === 'fill_in_the_blanks'
        ? 'Only Fill in the Blanks questions (generate 10 blanks, 1 mark each)'
        : format === 'short'
        ? 'Only Short Answer Questions (generate 6 short questions, 2-3 marks each)'
        : 'Full Specimen Paper: Section A (5 short questions, 2 marks each) + Section B (4 long questions, 5 marks each)'
    }`;
  }

  const systemPrompt = `You are the MOCK PAPER GENERATOR AGENT for ${board} Board.
Create a specimen-style mock test paper or past year question worksheet for the given subject and topic following the
${board} paper pattern provided in context. 

${formatText}

Include:
- Total marks: 30
- Provide complete marking scheme (answers) for each question
- Match ${board} question style: definitions, derivations, numerical problems, diagrams, reasoning
- For MCQ questions, you MUST include "options" (array of 4 choices) and "answerIndex" (integer 0-3).
- For Fill in the Blanks, ensure the question string "q" contains a blank "________" and "answer" contains the exact word/phrase.

Difficulty: ${isPyq ? 'board-level' : difficulty} (easy=fundamentals, medium=board-level, hard=application-heavy)

Respond ONLY with JSON:
{"subject":"...","topic":"...","duration":60,"totalMarks":30,"sections":[{"name":"Section A","questions":[{"q":"...","type":"short","marks":2,"answer":"...","options":["..."],"answerIndex":0}]}]}`;

  const userPrompt = `Subject: ${subject} | Class: ${className} | Topic: ${topic} | Difficulty: ${difficulty} | Format: ${format} | isPyq: ${isPyq} | year: ${year} | Board: ${board}

${board} PAPER PATTERN REFERENCE:
${patternCtx || `(standard ${board} pattern)`}

PAST PAPER CONTEXT:
${pastCtx || '(no past papers in KB)'}`;

  try {
    const { content, cached } = await cachedLLM(
      [{ role: 'assistant', content: systemPrompt }, { role: 'user', content: userPrompt }],
      async () => {
        const result = await callModel({
          messages: [
            { role: 'assistant', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.6,
          question: userPrompt,
          preferredModel: 'auto'
        });
        return result.content;
      },
      { temperature: 0.6 }
    );

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const paper = jsonMatch ? JSON.parse(jsonMatch[0]) : { sections: [] };

    agentLog.status = 'completed';
    agentLog.finishedAt = new Date().toISOString();
    agentLog.durationMs = Date.now() - startedAt;
    agentLog.cached = cached;
    agentLog.output = `Generated mock with ${paper.sections?.length ?? 0} sections`;

    return { paper, log: agentLog };
  } catch (err: any) {
    agentLog.status = 'failed';
    agentLog.error = err.message;
    agentLog.finishedAt = new Date().toISOString();
    agentLog.durationMs = Date.now() - startedAt;
    return { paper: { sections: [] }, log: agentLog };
  }
}

// ============================================================
// ORCHESTRATOR — runs the full pipeline
// ============================================================
export async function runPipeline(input: PipelineInput): Promise<PipelineOutput> {
  const logs: AgentLog[] = [];
  const activeBoard = input.board || 'ICSE';

  console.log(`[Pipeline] Starting pipeline for topic: "${input.userTopic}" on board: "${activeBoard}"...`);

  // 1. Analyzer
  console.log(`[Pipeline] Running Analyzer Agent...`);
  const analysis = await runAnalyzer(input);
  logs.push(analysis.log);
  console.log(`[Pipeline] Analyzer Agent finished. Subject: "${analysis.subject}", Topic: "${analysis.topic}"`);

  // Web Grounding Search Step
  let webContext = '';
  if (input.webSearch) {
    console.log(`[Pipeline] Running Web Search Grounding for topic: "${analysis.topic}"...`);
    try {
      const searchResult = await callModel({
        preferredModel: 'auto',
        question: `Search the web for details about the ${activeBoard} syllabus topic: "${analysis.subject} - ${analysis.topic}". Return a summary of current facts, formulas, definitions, or historical context.`,
        messages: [
          { role: 'user', content: `Search the web for details about the ${activeBoard} syllabus topic: "${analysis.subject} - ${analysis.topic}". Return a summary of current facts, formulas, definitions, or historical context.` }
        ],
        webNeeded: true,
        temperature: 0.5
      });
      webContext = searchResult.content;
      console.log(`[Pipeline] Web Search finished. Context length: ${webContext.length} chars`);
    } catch (err: any) {
      console.error('[Pipeline] Web Search failed:', err.message);
    }
  }

  // 2. Outline
  console.log(`[Pipeline] Running Outline Agent...`);
  const { outline, log: outlineLog } = await runOutlineAgent(
    analysis.subject, analysis.className, analysis.topic, analysis.keyConcepts, webContext, activeBoard
  );
  logs.push(outlineLog);
  console.log(`[Pipeline] Outline Agent finished. Sections generated: ${outline.sections?.length ?? 0}`);

  // 3. Writer
  console.log(`[Pipeline] Running Writer Agent...`);
  const { content: rawContent, log: writerLog } = await runWriterAgent(
    analysis.subject, analysis.className, analysis.topic, outline, input.sourceText, webContext, activeBoard
  );
  logs.push(writerLog);
  console.log(`[Pipeline] Writer Agent finished. Raw content size: ${rawContent.length} chars (~${rawContent.split(/\s+/).length} words)`);

  // 3.5. Depth Expander — fills in shallow sections
  console.log(`[Pipeline] Running Depth Expander Agent...`);
  let expandedContent = rawContent;
  try {
    const { content: expanded, log: expanderLog } = await runDepthExpanderAgent(
      rawContent, analysis.subject, analysis.className, analysis.topic, outline, activeBoard
    );
    expandedContent = expanded;
    logs.push(expanderLog);
    console.log(`[Pipeline] Depth Expander Agent finished. Expanded content: ${expandedContent.length} chars (~${expandedContent.split(/\s+/).length} words)`);
  } catch (err: any) {
    console.error('[Pipeline] Depth Expander failed (non-fatal):', err.message);
    logs.push(log('Depth Expander', 'failed', {
      finishedAt: new Date().toISOString(),
      error: err.message,
      output: 'Depth expansion skipped'
    }));
  }

  // 4. Concurrently run Originality Reviewer & Image Generation Pipeline
  let finalContent = expandedContent;
  let images: { prompt: string; path: string; caption: string; section: string }[] = [];
  const originalityLogs: AgentLog[] = [];
  const imageLogs: AgentLog[] = [];

  const runOriginalityTask = async () => {
    try {
      console.log(`[Pipeline] Running Originality Reviewer Agent (section-by-section)...`);
      const { content: rewritten, log: origLog } = await runOriginalityAgent(
        expandedContent, analysis.subject, analysis.topic, activeBoard
      );
      finalContent = rewritten;
      originalityLogs.push(origLog);
      console.log(`[Pipeline] Originality Reviewer Agent finished. Final content size: ${finalContent.length} chars`);
    } catch (err: any) {
      console.error('[Pipeline] Originality Reviewer failed:', err.message);
      originalityLogs.push(log('Originality', 'failed', {
        finishedAt: new Date().toISOString(),
        error: err.message,
        output: 'Originality rewriting failed'
      }));
    }
  };

  const runImageTask = async () => {
    if (input.skipImages) {
      console.log(`[Pipeline] Skipping Image Director and Generator (skipImages=true)`);
      imageLogs.push(log('Image Director', 'completed', {
        finishedAt: new Date().toISOString(),
        durationMs: 0,
        output: 'Skipped (memory-safe mode)'
      }));
      imageLogs.push(log('Image Generator', 'completed', {
        finishedAt: new Date().toISOString(),
        durationMs: 0,
        output: 'Skipped (memory-safe mode)'
      }));
    } else {
      try {
        console.log(`[Pipeline] Running Image Director Agent...`);
        const { images: imagePlan, log: dirLog } = await runImageDirector(
          analysis.subject, analysis.topic, outline, expandedContent, activeBoard
        );
        imageLogs.push(dirLog);
        console.log(`[Pipeline] Image Director Agent finished. Planned: ${imagePlan.length} images`);

        console.log(`[Pipeline] Running Image Generator Agent...`);
        const { images: genImages, log: imgLog } = await runImageGenerator(imagePlan, activeBoard);
        imageLogs.push(imgLog);
        images = genImages;
        console.log(`[Pipeline] Image Generator Agent finished. Generated: ${genImages.length} images`);
      } catch (err: any) {
        console.error('[Pipeline] Image generation failed (non-fatal):', err.message);
        imageLogs.push(log('Image Generator', 'failed', {
          finishedAt: new Date().toISOString(),
          error: err.message,
          output: 'Image generation skipped due to error'
        }));
      }
    }
  };

  await Promise.all([runOriginalityTask(), runImageTask()]);
  logs.push(...originalityLogs);
  logs.push(...imageLogs);

  // Insert image references into final content
  let finalOutput = finalContent;
  for (const img of images) {
    const imgMd = `\n\n![${img.caption}](${img.path})\n\n*${img.caption}*\n\n`;
    // Try to insert after the section heading matching img.section
    const sectionRegex = new RegExp(`(##\\s*${img.section}[^\\n]*\\n)`, 'i');
    if (sectionRegex.test(finalOutput)) {
      finalOutput = finalOutput.replace(sectionRegex, `$1${imgMd}`);
    } else {
      finalOutput += imgMd;
    }
  }

  const finalWordCount = finalOutput.split(/\s+/).length;
  console.log(`[Pipeline] Pipeline finished successfully! Final output: ${finalOutput.length} chars (~${finalWordCount} words)`);
  return {
    subject: analysis.subject,
    className: analysis.className,
    topic: analysis.topic,
    outline,
    finalOutput,
    images: images.map(i => ({ prompt: i.prompt, path: i.path, caption: i.caption })),
    logs
  };
}

// ============================================================
// AGENT 8: QUIZ CLASH GENERATOR
// Produces 5 MCQ questions for multiplayer quiz competition.
// ============================================================
export async function runQuizAgent(
  subject: string, className: string, topic: string, board: string = 'ICSE'
): Promise<{ quiz: any; log: AgentLog }> {
  const startedAt = Date.now();
  const agentLog = log('Quiz Generator', 'running');

  const systemPrompt = `You are the QUIZ GENERATOR AGENT for ${board} Board.
Create a set of 5 multiple-choice questions (MCQs) for the given subject and topic.
Each question must:
1. Be challenging and typical of ${board} Board standard (Class 9/10 level).
2. Have 4 options (A, B, C, D) and exactly 1 correct answer.
3. Have a detailed explanation of why the correct option is correct.

Respond ONLY with valid JSON, no prose and no markdown code fences:
{
  "questions": [
    {
      "q": "Question text here...",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "answerIndex": 0, // 0-based index of the correct option (0=A, 1=B, 2=C, 3=D)
      "explanation": "Explanation here..."
    }
  ]
}`;

  const userPrompt = `Subject: ${subject} | Class: ${className} | Topic: ${topic} | Board: ${board}`;

  try {
    const { content, cached } = await cachedLLM(
      [{ role: 'assistant', content: systemPrompt }, { role: 'user', content: userPrompt }],
      async () => {
        const result = await callModel({
          messages: [
            { role: 'assistant', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.6,
          question: `Generate 5 MCQs for ${board} ${subject} topic ${topic}`,
          preferredModel: 'auto'
        });
        return result.content;
      },
      { temperature: 0.6 }
    );

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const quiz = jsonMatch ? JSON.parse(jsonMatch[0]) : { questions: [] };

    agentLog.status = 'completed';
    agentLog.finishedAt = new Date().toISOString();
    agentLog.durationMs = Date.now() - startedAt;
    agentLog.cached = cached;
    agentLog.output = `Generated quiz with ${quiz.questions?.length ?? 0} questions`;

    return { quiz, log: agentLog };
  } catch (err: any) {
    agentLog.status = 'failed';
    agentLog.error = err.message;
    agentLog.finishedAt = new Date().toISOString();
    agentLog.durationMs = Date.now() - startedAt;
    return { quiz: { questions: [] }, log: agentLog };
  }
}
