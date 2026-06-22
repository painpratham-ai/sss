// Knowledge Base — RAG retrieval layer using SQLite FTS5
// FTS5 does full-text search at the DB level — ZERO in-memory loading.
// Scales to 100K+ chunks with constant memory usage.
//
// This replaced the old in-memory index that loaded all chunks into RAM
// and caused OOM crashes with 10K+ chunks.

import { ICSE_SEED, type SeedChunk } from './icse-knowledge';
import { db } from './db';
import { Prisma } from '@prisma/client';

export interface RetrievedChunk {
  id: string;
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

// ─── FTS5 raw SQL queries (Prisma doesn't natively support FTS5) ──────────

// Escape FTS5 query string: wrap each term in quotes for safe matching
function buildFtsQuery(query: string): string {
  const terms = query
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 2)
    .slice(0, 10); // limit to 10 terms to avoid huge queries
  if (terms.length === 0) return '';
  // Use OR matching: any term can match
  return terms.map(t => `"${t}"*`).join(' OR ');
}

// Main retrieval: FTS5 search with board + subject filtering
export async function retrieve(query: string, opts: {
  subject?: string;
  category?: string;
  board?: string;
  topK?: number;
  allowBoardFallback?: boolean;
} = {}): Promise<RetrievedChunk[]> {
  const topK = opts.topK ?? 5;
  const allowBoardFallback = opts.allowBoardFallback ?? false;
  const ftsQuery = buildFtsQuery(query);

  // If no FTS query (all terms too short), fall back to ILIKE on title
  if (!ftsQuery) {
    const fallback = await db.knowledgeChunk.findMany({
      where: {
        ...(opts.board && { board: opts.board }),
        ...(opts.subject && { subject: opts.subject }),
        ...(opts.category && { category: opts.category })
      },
      take: topK,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, board: true, subject: true, className: true, category: true,
        chapter: true, title: true, content: true, tags: true
      }
    });
    return fallback.map(c => ({ ...c, score: 1 }));
  }

  // FTS5 search via raw SQL
  // Rank by bm25() (lower = better match, so we negate)
  // Filter by board/subject/category in the JOIN
  try {
    const boardFilter = opts.board ? `AND k.board = '${opts.board.replace(/'/g, "''")}'` : '';
    const subjectFilter = opts.subject ? `AND k.subject = '${opts.subject.replace(/'/g, "''")}'` : '';
    const categoryFilter = opts.category ? `AND k.category = '${opts.category.replace(/'/g, "''")}'` : '';

    const sql = Prisma.sql`
      SELECT k.id, k.board, k.subject, k.class_name as className, k.category, k.chapter,
             k.title, k.content, k.tags,
             -bm25(KnowledgeChunk_fts) as score
      FROM KnowledgeChunk_fts
      JOIN KnowledgeChunk k ON k.rowid = KnowledgeChunk_fts.rowid
      WHERE KnowledgeChunk_fts MATCH ${ftsQuery}
      ${Prisma.raw(boardFilter)}
      ${Prisma.raw(subjectFilter)}
      ${Prisma.raw(categoryFilter)}
      ORDER BY score DESC
      LIMIT ${topK}
    `;

    const results: any[] = await db.$queryRaw(sql);
    const chunks: RetrievedChunk[] = results.map(r => ({
      id: r.id,
      board: r.board || 'ICSE',
      subject: r.subject,
      className: r.className,
      category: r.category,
      chapter: r.chapter,
      title: r.title,
      content: typeof r.content === 'string' ? r.content : String(r.content),
      tags: r.tags,
      score: typeof r.score === 'number' ? r.score : Number(r.score)
    }));

    // If board-filtered search returns too few, try without board filter (fallback) if allowed
    if (allowBoardFallback && chunks.length < 3 && opts.board) {
      const fallback = await retrieve(query, { ...opts, board: undefined, topK });
      // Merge, preferring board-matched chunks
      const seen = new Set(chunks.map(c => c.id));
      return [...chunks, ...fallback.filter(c => !seen.has(c.id))].slice(0, topK);
    }

    // Also include seed chunks in search (they're not in DB)
    const seedResults = searchSeedChunks(query, opts, topK);
    return [...chunks, ...seedResults].slice(0, topK);
  } catch (err: any) {
    console.error('FTS5 search failed, falling back to seed:', err.message);
    return searchSeedChunks(query, opts, topK);
  }
}

// Search the in-code seed chunks (22 chunks) — always in memory (tiny)
function searchSeedChunks(query: string, opts: {
  subject?: string;
  category?: string;
  board?: string;
  topK?: number;
}, topK: number = 5): RetrievedChunk[] {
  const terms = query.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(t => t.length > 2);
  const scored = ICSE_SEED.map(c => {
    const haystack = `${c.title} ${c.tags} ${c.content}`.toLowerCase();
    let score = 0;
    for (const term of terms) {
      score += (haystack.match(new RegExp(term, 'g')) || []).length;
    }
    if (opts.subject && c.subject.toLowerCase() === opts.subject.toLowerCase()) score *= 1.5;
    if (opts.board && opts.board !== 'ICSE') score = 0; // seeds are ICSE-only
    return {
      id: `seed_${ICSE_SEED.indexOf(c)}`,
      board: 'ICSE', subject: c.subject, className: c.className, category: c.category,
      chapter: c.chapter, title: c.title, content: c.content, tags: c.tags,
      score: score / Math.max(haystack.length, 1) * 1000
    };
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
    `[${i + 1}] BOARD: ${c.board} | SUBJECT: ${c.subject} | CHAPTER: ${c.chapter} | CATEGORY: ${c.category}\nTITLE: ${c.title}\n${c.content.slice(0, 1500)}`
  ).join('\n\n---\n\n');
}

export async function getKnowledgeStats() {
  // Use raw SQL for efficiency — avoid loading 10K rows into memory
  const totalChunks = await db.knowledgeChunk.count();
  const icseCount = await db.knowledgeChunk.count({ where: { board: 'ICSE' } });
  const cbseCount = await db.knowledgeChunk.count({ where: { board: 'CBSE' } });

  // Get distinct subjects/boards/categories via raw SQL GROUP BY (much faster than Prisma distinct)
  const subjects: any[] = await db.$queryRaw`SELECT DISTINCT subject FROM KnowledgeChunk`;
  const boards: any[] = await db.$queryRaw`SELECT DISTINCT board FROM KnowledgeChunk`;
  const categories: any[] = await db.$queryRaw`SELECT DISTINCT category FROM KnowledgeChunk`;

  return {
    totalChunks: totalChunks + ICSE_SEED.length,
    subjects: subjects.map(s => s.subject).filter(Boolean),
    categories: categories.map(c => c.category).filter(Boolean),
    boards: boards.map(b => b.board).filter(Boolean),
    icseChunks: icseCount + ICSE_SEED.length,
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
  tags: string | string[] | any;
  source?: string;
}): Promise<void> {
  const tagsStr = Array.isArray(chunk.tags)
    ? chunk.tags.join(',')
    : (typeof chunk.tags === 'string' ? chunk.tags : (chunk.tags ? String(chunk.tags) : ''));

  await db.knowledgeChunk.create({
    data: {
      board: chunk.board || 'ICSE',
      subject: chunk.subject,
      className: chunk.className,
      category: chunk.category,
      chapter: chunk.chapter,
      title: chunk.title,
      content: chunk.content,
      tags: tagsStr,
      source: chunk.source ?? 'user_upload'
    }
  });
  // FTS5 sync trigger handles index update automatically
}

// No-op now — FTS5 is always in sync via DB triggers. Kept for backwards compat.
export async function reloadKnowledgeBase(): Promise<void> {
  return;
}
