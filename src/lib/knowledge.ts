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

// In-memory index of ALL knowledge (seed + user-added). Built once, refreshed when DB changes.
let memoryIndex: RetrievedChunk[] | null = null;
let lastDbCount = -1;

async function loadIndex(): Promise<RetrievedChunk[]> {
  const dbCount = await db.knowledgeChunk.count();
  if (memoryIndex && dbCount === lastDbCount) return memoryIndex;

  const fromDb = await db.knowledgeChunk.findMany({
    select: {
      board: true, subject: true, className: true, category: true, chapter: true,
      title: true, content: true, tags: true
    }
  });

  const seedMapped: RetrievedChunk[] = ICSE_SEED.map(c => ({
    board: 'ICSE', subject: c.subject, className: c.className, category: c.category,
    chapter: c.chapter, title: c.title, content: c.content,
    tags: c.tags, score: 0
  }));

  const dbMapped: RetrievedChunk[] = fromDb.map(c => ({
    board: c.board || 'ICSE', subject: c.subject, className: c.className, category: c.category,
    chapter: c.chapter, title: c.title, content: c.content,
    tags: c.tags, score: 0
  }));

  memoryIndex = [...seedMapped, ...dbMapped];
  lastDbCount = dbCount;
  return memoryIndex;
}

// Allow forcing reload after new user uploads
export async function reloadKnowledgeBase(): Promise<void> {
  memoryIndex = null;
  lastDbCount = -1;
  await loadIndex();
}

// Simple but effective retrieval: term-frequency + metadata boost.
// This avoids needing an embedding model — keeps cost zero.
export async function retrieve(query: string, opts: {
  subject?: string;
  category?: string;
  board?: string; // ICSE | CBSE | GENERAL
  topK?: number;
} = {}): Promise<RetrievedChunk[]> {
  const index = await loadIndex();
  const topK = opts.topK ?? 5;
  const terms = query.toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 2);

  const scored = index.map(chunk => {
    const haystack = `${chunk.title} ${chunk.tags} ${chunk.content}`.toLowerCase();
    let score = 0;
    for (const term of terms) {
      const matches = (haystack.match(new RegExp(term, 'g')) || []).length;
      score += matches;
    }
    // subject match boost
    if (opts.subject && chunk.subject.toLowerCase() === opts.subject.toLowerCase()) score *= 1.5;
    if (opts.category && chunk.category === opts.category) score *= 1.3;
    // Board filtering: if board specified, prefer same-board chunks (but allow GENERAL)
    if (opts.board) {
      if (chunk.board === opts.board) score *= 2.0; // strong boost for same board
      else if (chunk.board === 'GENERAL') score *= 1.0; // neutral for general
      else score *= 0.1; // heavily penalize other board
    }
    return { ...chunk, score: score / Math.max(haystack.length, 1) * 1000 };
  });

  return scored
    .filter(c => c.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
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
    `[${i + 1}] BOARD: ${c.board} | SUBJECT: ${c.subject} | CHAPTER: ${c.chapter} | CATEGORY: ${c.category}\nTITLE: ${c.title}\n${c.content}`
  ).join('\n\n---\n\n');
}

export async function getKnowledgeStats() {
  const index = await loadIndex();
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
