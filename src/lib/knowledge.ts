// ICSE Knowledge Base — RAG retrieval layer
// Loaded once into memory at module init. Retrieval is O(N) string scan = sub-millisecond.
// No external API calls — fully local.

import { ICSE_SEED, type SeedChunk } from './icse-knowledge';
import { db } from './db';

export interface RetrievedChunk {
  board: string;
  subject: string;
  className: string;
  category: string;
  chapter: string;
  title: string;
  content: string;
  tags: string;
  score: number;
}

// In-memory LIGHTWEIGHT index (title + tags only — NOT full content).
// Full content is fetched on-demand per chunk after retrieval ranks them.
// This keeps memory low even with 10K+ chunks.
interface LightChunk {
  id: string;
  board: string;
  subject: string;
  className: string;
  category: string;
  chapter: string;
  title: string;
  tags: string;
}

let lightIndex: LightChunk[] | null = null;
let lastDbCount = -1;

async function loadLightIndex(): Promise<LightChunk[]> {
  const dbCount = await db.knowledgeChunk.count();
  if (lightIndex && dbCount === lastDbCount) return lightIndex;

  const fromDb = await db.knowledgeChunk.findMany({
    select: {
      id: true, board: true, subject: true, className: true, category: true,
      chapter: true, title: true, tags: true
    }
  });

  const seedLight: LightChunk[] = ICSE_SEED.map((c, i) => ({
    id: `seed_${i}`,
    board: 'ICSE', subject: c.subject, className: c.className, category: c.category,
    chapter: c.chapter, title: c.title, tags: c.tags
  }));

  const dbLight: LightChunk[] = fromDb.map(c => ({
    id: c.id,
    board: c.board || 'ICSE', subject: c.subject, className: c.className, category: c.category,
    chapter: c.chapter, title: c.title, tags: c.tags
  }));

  lightIndex = [...seedLight, ...dbLight];
  lastDbCount = dbCount;
  return lightIndex;
}

// Allow forcing reload after new user uploads
export async function reloadKnowledgeBase(): Promise<void> {
  lightIndex = null;
  lastDbCount = -1;
  await loadLightIndex();
}

// Fetch full content for a specific chunk by ID (on-demand)
async function fetchChunkContent(id: string): Promise<string> {
  if (id.startsWith('seed_')) {
    const seedIdx = parseInt(id.replace('seed_', ''), 10);
    return ICSE_SEED[seedIdx]?.content || '';
  }
  const chunk = await db.knowledgeChunk.findUnique({
    where: { id },
    select: { content: true }
  });
  return chunk?.content || '';
}

// Simple but effective retrieval: term-frequency + metadata boost.
// Uses lightweight index (title+tags only) for scoring, then fetches full content for top results.
export async function retrieve(query: string, opts: {
  subject?: string;
  category?: string;
  board?: string;
  topK?: number;
} = {}): Promise<RetrievedChunk[]> {
  const index = await loadLightIndex();
  const topK = opts.topK ?? 5;
  const terms = query.toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 2);

  const scored = index.map(chunk => {
    const haystack = `${chunk.title} ${chunk.tags}`.toLowerCase();
    let score = 0;
    for (const term of terms) {
      const matches = (haystack.match(new RegExp(term, 'g')) || []).length;
      score += matches;
    }
    if (opts.subject && chunk.subject.toLowerCase() === opts.subject.toLowerCase()) score *= 1.5;
    if (opts.category && chunk.category === opts.category) score *= 1.3;
    if (opts.board) {
      if (chunk.board === opts.board) score *= 2.0;
      else if (chunk.board === 'GENERAL') score *= 1.0;
      else score *= 0.1;
    }
    return { ...chunk, score: score / Math.max(haystack.length, 1) * 1000 };
  });

  const topResults = scored
    .filter(c => c.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  // Fetch full content for top results (on-demand, parallel)
  const withContent = await Promise.all(
    topResults.map(async (c) => {
      const content = await fetchChunkContent(c.id);
      return { ...c, content, score: c.score };
    })
  );

  return withContent;
}

// Build a context string for LLM prompts
export async function buildContext(query: string, opts?: {
  subject?: string;
  category?: string;
  board?: string;
  topK?: number;
}): Promise<string> {
  const chunks = await retrieve(query, opts);
  if (chunks.length === 0) return '';
  return chunks.map((c, i) =>
    `[${i + 1}] BOARD: ${c.board} | SUBJECT: ${c.subject} | CHAPTER: ${c.chapter} | CATEGORY: ${c.category}\nTITLE: ${c.title}\n${c.content.slice(0, 1500)}`
  ).join('\n\n---\n\n');
}

export async function getKnowledgeStats() {
  const index = await loadLightIndex();
  const subjects = Array.from(new Set(index.map(c => c.subject)));
  const categories = Array.from(new Set(index.map(c => c.category)));
  const boards = Array.from(new Set(index.map(c => c.board)));
  const icseCount = index.filter(c => c.board === 'ICSE').length;
  const cbseCount = index.filter(c => c.board === 'CBSE').length;
  return {
    totalChunks: index.length,
    subjects,
    categories,
    boards,
    icseChunks: icseCount,
    cbseChunks: cbseCount,
    lastLoadedAt: new Date().toISOString()
  };
}

// Add user-contributed knowledge (from the ingestion UI)
export async function addKnowledge(chunk: {
  board?: string;
  subject: string;
  className: string;
  category: string;
  chapter: string;
  title: string;
  content: string;
  tags: string;
  source?: string;
}): Promise<void> {
  await db.knowledgeChunk.create({
    data: {
      board: chunk.board || 'ICSE',
      subject: chunk.subject,
      className: chunk.className,
      category: chunk.category,
      chapter: chunk.chapter,
      title: chunk.title,
      content: chunk.content,
      tags: chunk.tags,
      source: chunk.source ?? 'user_upload'
    }
  });
  await reloadKnowledgeBase();
}
