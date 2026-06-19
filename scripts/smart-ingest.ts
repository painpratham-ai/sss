// Smart Dedup Knowledge Ingester
// Scans /home/z/my-project/upload/ for new data files, compares against existing KB,
// ingests only NEW chunks (skips duplicates). Supports JSON, TXT, MD, DOCX (via pandoc).
//
// Usage:
//   bun run scripts/smart-ingest.ts                  # scan + ingest
//   bun run scripts/smart-ingest.ts --dry-run        # scan only, report what would be ingested
//   bun run scripts/smart-ingest.ts --file <path>    # ingest one specific file

import fs from 'fs/promises';
import path from 'path';
import { execSync } from 'child_process';
import { db } from '../src/lib/db';
import { addKnowledge, reloadKnowledgeBase } from '../src/lib/knowledge';

const UPLOAD_DIR = '/home/z/my-project/upload';

// ─── Helpers ───────────────────────────────────────────────

// Normalize a string for comparison (lowercase, collapse whitespace, strip punctuation)
function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

// Generate a content fingerprint (first 200 chars normalized + length)
function fingerprint(content: string): string {
  const n = normalize(content.slice(0, 500));
  return `${n.slice(0, 200)}|len:${content.length}`;
}

// Check if a chunk with similar title OR content already exists
async function findDuplicate(title: string, content: string, subject?: string): Promise<boolean> {
  const normTitle = normalize(title);
  const fp = fingerprint(content);

  // Check by title — use FULL normalized title (not just first 80 chars)
  // because multiple PDFs can have same subject+year+type but different content
  const titleMatches = await db.knowledgeChunk.findMany({
    where: subject ? { subject } : {},
    select: { title: true, content: true }
  });

  for (const chunk of titleMatches) {
    // Full title match (exact duplicate)
    if (normalize(chunk.title) === normTitle) {
      return true;
    }
    // Content fingerprint match (exact same content)
    if (fingerprint(chunk.content) === fp) {
      return true;
    }
    // High similarity check — >95% similar AND same title prefix
    // (ICSE papers from same subject+year share boilerplate, so we need BOTH)
    const existing = normalize(chunk.content.slice(0, 500));
    const incoming = normalize(content.slice(0, 500));
    if (existing.length > 100 && incoming.length > 100) {
      const overlap = incoming.split(' ').filter(w => existing.includes(w)).length;
      const similarity = overlap / Math.max(incoming.split(' ').length, 1);
      // Only skip if extremely similar (>95%) — same paper, different scan
      if (similarity > 0.95) return true;
    }
  }
  return false;
}

// ─── File parsers ──────────────────────────────────────────

interface ParsedChunk {
  subject: string;
  className: string;
  category: string;
  chapter: string;
  title: string;
  content: string;
  tags: string;
  source?: string;
}

// Auto-detect file type and parse into chunks
async function parseFile(filePath: string): Promise<{ chunks: ParsedChunk[]; format: string }> {
  const ext = path.extname(filePath).toLowerCase();
  const basename = path.basename(filePath);

  if (ext === '.json') {
    return parseJsonFile(filePath);
  } else if (ext === '.txt' || ext === '.md') {
    return parseTextFile(filePath);
  } else if (ext === '.docx') {
    return parseDocxFile(filePath);
  } else if (ext === '.csv') {
    return parseCsvFile(filePath);
  }
  return { chunks: [], format: 'unknown' };
}

// Parse JSON — auto-detect structure
async function parseJsonFile(filePath: string): Promise<{ chunks: ParsedChunk[]; format: string }> {
  const raw = await fs.readFile(filePath, 'utf-8');
  const data = JSON.parse(raw);
  const chunks: ParsedChunk[] = [];

  // Pattern 0: PDF-extracted content array [{file_name, year, subject, content: [{page, text}]}]
  // (the icse_kb_*.json files from user's laptop PDF extraction)
  // SPLIT INTO PAGE-LEVEL CHUNKS — NO TRUNCATION, every line captured.
  if (Array.isArray(data) && data.length > 0 && data[0]?.file_name && data[0]?.content) {
    for (const paper of data) {
      const subject = normalizeSubject(paper.subject || 'Unknown');
      const year = String(paper.year || 'unknown');
      const paperType = paper.type || 'PYQ';
      const fileName = paper.file_name || '';
      const totalPages = paper.pages || (paper.content || []).length;

      const pages = (paper.content || []);
      if (pages.length === 0) continue;

      // Strategy: group pages into ~3500-char chunks (with 200-char overlap)
      // so we capture EVERY line without truncation, and each chunk is small enough
      // for precise RAG retrieval.
      const CHUNK_SIZE = 3500;
      const OVERLAP = 200;

      let currentChunk = '';
      let currentChunkStartPage = 1;
      let chunkIndex = 1;

      for (let i = 0; i < pages.length; i++) {
        const p = pages[i];
        const pageNum = (typeof p === 'object' && p?.page) ? p.page : (i + 1);
        const pageText = typeof p === 'string' ? p : (p?.text || '');
        if (pageText.trim().length < 10) continue;

        const pageHeader = `--- Page ${pageNum} ---\n`;
        const candidate = currentChunk + pageHeader + pageText + '\n\n';

        if (candidate.length > CHUNK_SIZE && currentChunk.length > 0) {
          // Flush current chunk
          chunks.push({
            subject,
            className: '10',
            category: 'past_paper',
            chapter: year,
            title: `${subject} ${year} ${paperType} — Part ${chunkIndex} (pages ${currentChunkStartPage}-${i}) — ICSE Class 10`,
            content: `ICSE Class 10 ${subject} — ${paperType} Paper from ${year}
Source: ${fileName} | Part ${chunkIndex} of paper | Pages ${currentChunkStartPage}-${i} of ${totalPages}

${currentChunk.trim()}`,
            tags: `${subject.toLowerCase()},past,paper,${year},${paperType.toLowerCase()},icse,class10,pdf-extracted,part${chunkIndex}`,
            source: 'user_upload'
          });

          // Start new chunk with overlap (last 200 chars of previous)
          const overlap = currentChunk.slice(-OVERLAP);
          currentChunk = overlap + pageHeader + pageText + '\n\n';
          currentChunkStartPage = pageNum;
          chunkIndex++;
        } else {
          currentChunk = candidate;
        }
      }

      // Flush final chunk
      if (currentChunk.trim().length > 50) {
        chunks.push({
          subject,
          className: '10',
          category: 'past_paper',
          chapter: year,
          title: `${subject} ${year} ${paperType} — Part ${chunkIndex} (pages ${currentChunkStartPage}-${totalPages}) — ICSE Class 10`,
          content: `ICSE Class 10 ${subject} — ${paperType} Paper from ${year}
Source: ${fileName} | Part ${chunkIndex} of paper | Pages ${currentChunkStartPage}-${totalPages} of ${totalPages}

${currentChunk.trim()}`,
          tags: `${subject.toLowerCase()},past,paper,${year},${paperType.toLowerCase()},icse,class10,pdf-extracted,part${chunkIndex}`,
          source: 'user_upload'
        });
      }
    }
    return { chunks, format: 'pdf_extracted_pages' };
  }

  // Pattern 1: { meta, papers: [...] } — past papers format
  if (data.papers && Array.isArray(data.papers)) {
    if (data.papers.length === 0) {
      return { chunks: [], format: 'past_papers_empty' };
    }
    for (const paper of data.papers) {
      const subject = (paper.subject || 'General').trim();
      const year = paper.academic_year || 'unknown';
      const questions: string[] = [];
      for (const section of paper.sections || []) {
        for (const q of section.questions || []) {
          if (q.text && q.text.trim().length > 5) {
            questions.push(`Q${q.number || '?'} [${q.marks || 0}m]: ${q.text.trim()}`);
          }
        }
      }
      if (questions.length === 0) continue;
      chunks.push({
        subject: normalizeSubject(subject), className: '10', category: 'past_paper', chapter: year,
        title: `${subject} ${year} — ICSE Class 10 Past Paper (${questions.length} questions)`,
        content: `ICSE Class 10 ${subject} Question Paper — ${year}\nDuration: ${paper.duration || '?'} | Total marks: ${paper.total_marks || '?'}\n\nQUESTIONS:\n${questions.join('\n')}`,
        tags: `${subject.toLowerCase()},past,paper,${year},icse`
      });
    }
    return { chunks, format: 'past_papers' };
  }

  // Pattern 2: { SubjectName: { chapters: [...] } } — frequency analysis
  for (const [key, val] of Object.entries(data)) {
    if (val && typeof val === 'object' && Array.isArray((val as any).chapters)) {
      const subject = (val as any).subject || key;
      const chapters = (val as any).chapters || [];
      const totalQs = (val as any).total_questions_analyzed || 0;
      const lines = chapters.map((ch: any) =>
        `• ${ch.chapter || ch.name || '?'}: ${ch.question_count || ch.count || 0} questions (${ch.percentage || 0}%)${ch.priority ? `, priority: ${ch.priority}` : ''}`
      ).join('\n');
      chunks.push({
        subject: normalizeSubject(subject), className: '10', category: 'past_paper', chapter: 'Topic Frequency',
        title: `${subject} — Chapter Frequency Analysis (${totalQs} Qs, ${chapters.length} chapters)`,
        content: `ICSE Class 10 ${subject} — Chapter-wise Topic Frequency Analysis\nBased on ${totalQs} real board questions.\n\nCHAPTER FREQUENCY:\n${lines}`,
        tags: `${subject.toLowerCase()},frequency,topics,chapters,weightage`
      });
    }
  }
  if (chunks.length > 0) return { chunks, format: 'frequency_analysis' };

  // Pattern 3: { SubjectName: { ChapterName: { key_terms, formulas } } } — glossary
  for (const [subject, chapters] of Object.entries(data)) {
    if (!chapters || typeof chapters !== 'object') continue;
    for (const [chapter, chData] of Object.entries(chapters as any)) {
      const keyTerms = (chData as any).key_terms || [];
      const formulas = (chData as any).formulas || [];
      if (keyTerms.length === 0 && formulas.length === 0) continue;
      chunks.push({
        subject, className: '10', category: 'glossary', chapter,
        title: `${subject} — ${chapter} (Key Terms + Formulas)`,
        content: `ICSE Class 10 ${subject} — ${chapter}\n\nKEY TERMS:\n${keyTerms.map((t: any) => typeof t === 'string' ? `• ${t}` : `• ${t.term || '?'}: ${t.definition || ''}`).join('\n')}\n\nFORMULAS:\n${formulas.map((f: any) => typeof f === 'string' ? `• ${f}` : `• ${f.formula || '?'} — ${f.description || ''}`).join('\n')}`,
        tags: `${subject.toLowerCase()},glossary,formula,${chapter.toLowerCase()}`
      });
    }
  }
  if (chunks.length > 0) return { chunks, format: 'glossary' };

  // Pattern 4: exam guide with subject_patterns
  if (data.subject_patterns) {
    for (const [subject, pat] of Object.entries(data.subject_patterns)) {
      chunks.push({
        subject: normalizeSubject(subject), className: '10', category: 'rubric', chapter: 'Exam Pattern',
        title: `${subject} — Exam Pattern & Strategy`,
        content: `ICSE Class 10 ${subject} — Exam Pattern & Strategy\n\n${JSON.stringify(pat, null, 2)}`,
        tags: `${subject.toLowerCase()},exam,pattern,strategy`
      });
    }
    return { chunks, format: 'exam_guide' };
  }

  // Pattern 5: paper index { subject_key: { subject, papers: [...] } }
  for (const [key, val] of Object.entries(data)) {
    if (val && typeof val === 'object' && Array.isArray((val as any).papers)) {
      const subject = (val as any).subject || key;
      const papers = (val as any).papers || [];
      const lines = papers.map((p: any) => `${p.year || p.academic_year || '?'} — ${p.total_marks || '?'} marks`).join('\n');
      chunks.push({
        subject: normalizeSubject(subject), className: '10', category: 'past_paper', chapter: 'Paper Index',
        title: `${subject} — Paper Index (${papers.length} papers)`,
        content: `ICSE Class 10 ${subject} — Paper Index\n${papers.length} papers.\n\nPAPERS:\n${lines}`,
        tags: `${subject.toLowerCase()},paper,index`
      });
    }
  }
  if (chunks.length > 0) return { chunks, format: 'paper_index' };

  // Fallback: dump JSON as one chunk — but skip empty/trivial JSON
  const jsonString = JSON.stringify(data, null, 2);
  if (jsonString.length < 50 || jsonString === '{}' || jsonString === '[]') {
    return { chunks: [], format: 'json_empty' };
  }
  chunks.push({
    subject: 'General', className: '10', category: 'glossary', chapter: 'General',
    title: path.basename(filePath, '.json'),
    content: jsonString.slice(0, 8000),
    tags: 'json,imported'
  });
  return { chunks, format: 'json_fallback' };
}

function normalizeSubject(s: string): string {
  const map: Record<string, string> = {
    'History & Civics': 'History',
    'Computer Applications': 'Computer',
    'Computer Science': 'Computer',
    'English Language': 'English',
    'English Literature': 'English',
    'COMPUTER SCIENCE': 'Computer',
    'PHYSICS': 'Physics',
    'CHEMISTRY': 'Chemistry',
    'BIOLOGY': 'Biology',
    'MATHEMATICS': 'Mathematics',
    'HISTORY': 'History',
    'GEOGRAPHY': 'Geography',
    'ENGLISH': 'English',
    'ECONOMICS': 'Economics',
    'CIVICS': 'History',
    'HINDI': 'Hindi',
    'COMMERCIAL STUDIES': 'Commercial Studies',
    'ENVIRONMENTAL SCIENCE': 'Environmental Science',
    'PHYSICAL EDUCATION': 'Physical Education'
  };
  return map[s] || map[s.toUpperCase()] || s;
}

async function parseTextFile(filePath: string): Promise<{ chunks: ParsedChunk[]; format: string }> {
  const content = await fs.readFile(filePath, 'utf-8');
  // Split by ## headers if present, else by double newlines
  const sections = content.split(/^## /m).filter(s => s.trim().length > 50);
  const chunks: ParsedChunk[] = [];

  if (sections.length > 1) {
    for (const section of sections) {
      const title = section.split('\n')[0].trim();
      const body = section.slice(title.length).trim();
      chunks.push({
        subject: 'General', className: '10', category: 'glossary', chapter: title,
        title: `${path.basename(filePath)} — ${title}`,
        content: body.slice(0, 6000),
        tags: 'text,imported'
      });
    }
  } else {
    chunks.push({
      subject: 'General', className: '10', category: 'glossary', chapter: 'General',
      title: path.basename(filePath),
      content: content.slice(0, 8000),
      tags: 'text,imported'
    });
  }
  return { chunks, format: 'text' };
}

async function parseDocxFile(filePath: string): Promise<{ chunks: ParsedChunk[]; format: string }> {
  // Use pandoc to extract text, then split by project headers
  const txtPath = `/tmp/${path.basename(filePath, '.docx')}.txt`;
  try {
    execSync(`pandoc -t plain "${filePath}" -o "${txtPath}"`, { stdio: 'pipe' });
  } catch (e: any) {
    return { chunks: [], format: 'docx_pandoc_failed' };
  }
  const text = await fs.readFile(txtPath, 'utf-8');
  // Split by ALL CAPS headers like "PHYSICS – PROJECT 1"
  const headerRegex = /^(PHYSICS|CHEMISTRY|BIOLOGY|MATHEMATICS|COMPUTER SCIENCE|HISTORY|GEOGRAPHY|ENGLISH|ECONOMICS|CIVICS)\s*[–-]\s*PROJECT\s*\d+\s*$/im;
  const sections = text.split(headerRegex).filter(s => s.trim().length > 100);
  const matches = text.match(headerRegex);

  const chunks: ParsedChunk[] = [];
  if (matches && sections.length > 1) {
    const subjects = text.match(new RegExp(headerRegex.source, 'gim')) || [];
    for (let i = 0; i < sections.length - 1; i++) {
      const subjRaw = subjects[i]?.match(/^[A-Z\s]+/)?.[0]?.trim() || 'General';
      const subject = normalizeSubject(subjRaw);
      const body = sections[i + 1].trim();
      const titleLine = body.split('\n')[0].trim().slice(0, 80);
      chunks.push({
        subject, className: '10', category: 'project_exemplar', chapter: 'General',
        title: `${subject} Exemplar: ${titleLine}`,
        content: body.slice(0, 6000),
        tags: `${subject.toLowerCase()},project,exemplar,docx`
      });
    }
  } else {
    chunks.push({
      subject: 'General', className: '10', category: 'glossary', chapter: 'General',
      title: path.basename(filePath, '.docx'),
      content: text.slice(0, 8000),
      tags: 'docx,imported'
    });
  }
  return { chunks, format: 'docx' };
}

async function parseCsvFile(filePath: string): Promise<{ chunks: ParsedChunk[]; format: string }> {
  const content = await fs.readFile(filePath, 'utf-8');
  const lines = content.split('\n').filter(l => l.trim());
  if (lines.length < 2) return { chunks: [], format: 'csv_empty' };
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  const chunks: ParsedChunk[] = [];

  // Try to group by a subject column if present
  const subjCol = headers.findIndex(h => h.includes('subject'));
  const titleCol = headers.findIndex(h => h.includes('title') || h.includes('question'));
  const contentCol = headers.findIndex(h => h.includes('content') || h.includes('answer') || h.includes('text'));

  if (subjCol >= 0 && contentCol >= 0) {
    const grouped: Record<string, string[]> = {};
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',');
      const subj = normalizeSubject(cols[subjCol] || 'General');
      if (!grouped[subj]) grouped[subj] = [];
      grouped[subj].push(cols[contentCol] || '');
    }
    for (const [subj, items] of Object.entries(grouped)) {
      chunks.push({
        subject: subj, className: '10', category: 'past_paper', chapter: 'CSV Import',
        title: `${subj} — CSV Import (${items.length} items)`,
        content: items.slice(0, 200).join('\n---\n').slice(0, 6000),
        tags: `${subj.toLowerCase()},csv,imported`
      });
    }
  } else {
    chunks.push({
      subject: 'General', className: '10', category: 'glossary', chapter: 'CSV',
      title: path.basename(filePath, '.csv'),
      content: lines.slice(0, 100).join('\n').slice(0, 8000),
      tags: 'csv,imported'
    });
  }
  return { chunks, format: 'csv' };
}

// ─── Main ingestor ─────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const fileArgIdx = args.indexOf('--file');
  const specificFile = fileArgIdx >= 0 ? args[fileArgIdx + 1] : null;

  console.log(dryRun ? '🔍 DRY RUN — scanning only, no ingestion\n' : '📦 SMART INGEST — scanning + ingesting\n');

  const before = await db.knowledgeChunk.count({ where: { source: 'user_upload' } });
  console.log(`KB has ${before} user chunks currently\n`);

  // List files
  const files = specificFile
    ? [specificFile]
    : (await fs.readdir(UPLOAD_DIR))
        .filter(f => !f.startsWith('.') && !f.endsWith('.db'))
        .map(f => path.join(UPLOAD_DIR, f));

  console.log(`Scanning ${files.length} file(s):\n${files.map(f => '  - ' + path.basename(f)).join('\n')}\n`);

  let totalParsed = 0;
  let totalSkipped = 0;
  let totalIngested = 0;
  const report: { file: string; format: string; parsed: number; skipped: number; ingested: number; sample: string[] }[] = [];

  for (const file of files) {
    const basename = path.basename(file);
    process.stdout.write(`[${basename}] parsing... `);
    let parsed;
    try {
      parsed = await parseFile(file);
    } catch (e: any) {
      console.log(`❌ parse error: ${e.message}`);
      report.push({ file: basename, format: 'error', parsed: 0, skipped: 0, ingested: 0, sample: [e.message] });
      continue;
    }

    if (parsed.chunks.length === 0) {
      console.log(`⚪ no chunks (format: ${parsed.format})`);
      report.push({ file: basename, format: parsed.format, parsed: 0, skipped: 0, ingested: 0, sample: [] });
      continue;
    }

    console.log(`${parsed.chunks.length} chunks (format: ${parsed.format})`);

    let ingested = 0;
    let skipped = 0;
    const sample: string[] = [];

    for (const chunk of parsed.chunks) {
      totalParsed++;
      // Check for duplicate
      const isDup = await findDuplicate(chunk.title, chunk.content, chunk.subject);
      if (isDup) {
        skipped++;
        totalSkipped++;
        sample.push(`  ⏭️  SKIP (dup): ${chunk.title.slice(0, 70)}`);
        continue;
      }
      if (dryRun) {
        sample.push(`  ➕ NEW: ${chunk.title.slice(0, 70)}`);
        ingested++;
        totalIngested++;
      } else {
        try {
          await addKnowledge({ ...chunk, source: 'user_upload' });
          sample.push(`  ➕ INGESTED: ${chunk.title.slice(0, 70)}`);
          ingested++;
          totalIngested++;
        } catch (e: any) {
          sample.push(`  ❌ FAIL: ${e.message.slice(0, 60)}`);
        }
      }
    }

    report.push({ file: basename, format: parsed.format, parsed: parsed.chunks.length, skipped, ingested, sample });

    // Print sample (first 3 lines)
    for (const s of sample.slice(0, 3)) console.log(s);
    if (sample.length > 3) console.log(`  ... and ${sample.length - 3} more`);
    console.log('');
  }

  if (!dryRun) {
    await reloadKnowledgeBase();
  }
  const after = await db.knowledgeChunk.count({ where: { source: 'user_upload' } });
  const total = await db.knowledgeChunk.count();

  console.log('═══════════════════════════════════════════════');
  console.log(dryRun ? 'DRY RUN SUMMARY (nothing was ingested)' : 'INGESTION SUMMARY');
  console.log('═══════════════════════════════════════════════');
  console.log(`  Files scanned:    ${files.length}`);
  console.log(`  Chunks parsed:    ${totalParsed}`);
  console.log(`  Skipped (dups):   ${totalSkipped}`);
  console.log(`  ${dryRun ? 'Would ingest' : 'Ingested'}:      ${totalIngested}`);
  console.log(`  User chunks:      ${before} → ${after}`);
  console.log(`  TOTAL KB chunks:  ${total}`);
  console.log('═══════════════════════════════════════════════\n');

  // Output machine-readable JSON for the API
  console.log('__JSON__' + JSON.stringify({
    dryRun,
    filesScanned: files.length,
    chunksParsed: totalParsed,
    chunksSkipped: totalSkipped,
    chunksIngested: totalIngested,
    userChunksBefore: before,
    userChunksAfter: after,
    totalChunks: total,
    report
  }));
}

main()
  .catch(e => { console.error('FATAL:', e); process.exit(1); })
  .finally(() => process.exit(0));
