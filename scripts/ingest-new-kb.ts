// Ingest NEW knowledge base files from the OpenClaw agent workspace
// into the website's KnowledgeChunk database.
//
// Source: c:\Users\HP\.openclaw-autoclaw\agents\ed\workspace\knowledge-base\
// Files:
//   - cisce-cfq-icse.json      (ICSE Competency-Focused Questions)
//   - cisce-cfq-isc.json       (ISC Competency-Focused Questions)
//   - cisce-isc-specimen-2025.json  (ISC Specimen 2025 papers)
//   - cisce-pupil-analysis.json     (Pupil Performance Analysis across boards)
//
// These files are pre-formatted as JSON arrays with fields matching the
// KnowledgeChunk schema: board, subject, className, category, chapter,
// title, content, tags, source.
//
// Usage:
//   npx tsx scripts/ingest-new-kb.ts              # ingest all
//   npx tsx scripts/ingest-new-kb.ts --dry-run    # preview only
//
// Or with bun:
//   bun run scripts/ingest-new-kb.ts
//   bun run scripts/ingest-new-kb.ts --dry-run

import fs from 'fs/promises';
import path from 'path';
import { db } from '../src/lib/db';
import { addKnowledge, reloadKnowledgeBase } from '../src/lib/knowledge';

// ─── Configuration ─────────────────────────────────────────
const KB_SOURCE_DIR = 'c:\\Users\\HP\\.openclaw-autoclaw\\agents\\ed\\workspace\\knowledge-base';
const UPLOAD_DIR = path.join(process.cwd(), 'upload');

// The 4 new knowledge base JSON files to ingest
const KB_FILES = [
  'cisce-cfq-icse.json',
  'cisce-cfq-isc.json',
  'cisce-isc-specimen-2025.json',
  'cisce-pupil-analysis.json',
];

// ─── Helpers ───────────────────────────────────────────────

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

// Check if an identical chunk already exists in the DB (by normalized title + board + subject + className)
async function isDuplicate(chunk: {
  title: string;
  board: string;
  subject: string;
  className: string;
  content: string;
}): Promise<boolean> {
  const normTitle = normalize(chunk.title);

  const existing = await db.knowledgeChunk.findMany({
    where: {
      board: chunk.board,
      subject: chunk.subject,
      className: chunk.className,
    },
    select: { title: true, content: true },
  });

  for (const ex of existing) {
    // Exact title match
    if (normalize(ex.title) === normTitle) {
      return true;
    }
    // Content fingerprint match (first 300 chars + length)
    const exFp = normalize(ex.content.slice(0, 300)) + '|' + ex.content.length;
    const newFp = normalize(chunk.content.slice(0, 300)) + '|' + chunk.content.length;
    if (exFp === newFp) {
      return true;
    }
  }
  return false;
}

// Filter out chunks with only copyright/boilerplate content (< 100 meaningful chars)
function hasSubstantiveContent(content: string): boolean {
  const cleaned = content
    .replace(/©\s*Copyright.*?Examinations\.?/gi, '')
    .replace(/All rights reserved[\s\S]*?Examinations\.?/gi, '')
    .replace(/\[ocr_err\]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned.length >= 80;
}

// ─── Main ──────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');

  console.log('═══════════════════════════════════════════════════════════');
  console.log(dryRun ? '🔍 DRY RUN — New Knowledge Base Ingestion' : '📦 NEW KNOWLEDGE BASE INGESTION');
  console.log('═══════════════════════════════════════════════════════════\n');

  // 1. Count existing chunks
  const totalBefore = await db.knowledgeChunk.count();
  const icseBefore = await db.knowledgeChunk.count({ where: { board: 'ICSE' } });
  const iscBefore = await db.knowledgeChunk.count({ where: { board: 'ISC' } });
  const cbseBefore = await db.knowledgeChunk.count({ where: { board: 'CBSE' } });
  console.log(`KB Status BEFORE:`);
  console.log(`  Total: ${totalBefore} | ICSE: ${icseBefore} | ISC: ${iscBefore} | CBSE: ${cbseBefore}\n`);

  let grandTotal = { parsed: 0, skipped_dup: 0, skipped_empty: 0, ingested: 0 };
  const report: { file: string; parsed: number; ingested: number; skipped_dup: number; skipped_empty: number }[] = [];

  for (const fileName of KB_FILES) {
    let sourcePath = path.join(KB_SOURCE_DIR, fileName);

    // Check file exists
    try {
      await fs.access(sourcePath);
    } catch {
      // Fallback to upload directory
      sourcePath = path.join(UPLOAD_DIR, fileName);
      try {
        await fs.access(sourcePath);
      } catch {
        console.log(`⚠️  File not found in source or upload: ${fileName} — SKIPPING\n`);
        continue;
      }
    }

    console.log(`━━━ Processing: ${fileName} ━━━`);

    // Read and parse
    const raw = await fs.readFile(sourcePath, 'utf-8');
    const data = JSON.parse(raw);

    if (!Array.isArray(data)) {
      console.log(`  ⚠️  Not an array — SKIPPING\n`);
      continue;
    }

    console.log(`  Chunks in file: ${data.length}`);

    // Also copy to upload dir for future smart-ingest compatibility
    const destPath = path.join(UPLOAD_DIR, fileName);
    try {
      await fs.access(destPath);
      console.log(`  📁 Already exists in upload/ — skipping copy`);
    } catch {
      if (!dryRun) {
        await fs.copyFile(sourcePath, destPath);
        console.log(`  📁 Copied to upload/${fileName}`);
      } else {
        console.log(`  📁 Would copy to upload/${fileName}`);
      }
    }

    let fileStats = { parsed: 0, skipped_dup: 0, skipped_empty: 0, ingested: 0 };

    for (const chunk of data) {
      fileStats.parsed++;

      // Validate required fields
      if (!chunk.title || !chunk.content || !chunk.subject) {
        console.log(`  ⚠️  Missing required fields — SKIP: ${JSON.stringify(chunk).slice(0, 80)}`);
        fileStats.skipped_empty++;
        continue;
      }

      // Filter out copyright-only / boilerplate chunks
      if (!hasSubstantiveContent(chunk.content)) {
        fileStats.skipped_empty++;
        continue;
      }

      // Check for duplicates
      const dup = await isDuplicate({
        title: chunk.title,
        board: chunk.board || 'ICSE',
        subject: chunk.subject,
        className: String(chunk.className || '10'),
        content: chunk.content,
      });

      if (dup) {
        fileStats.skipped_dup++;
        continue;
      }

      // Ingest!
      if (!dryRun) {
        await addKnowledge({
          board: chunk.board ? String(chunk.board) : 'ICSE',
          subject: String(chunk.subject),
          className: chunk.className ? String(chunk.className) : '10',
          category: chunk.category ? String(chunk.category) : 'general',
          chapter: chunk.chapter ? String(chunk.chapter) : '',
          title: String(chunk.title),
          content: typeof chunk.content === 'string' ? chunk.content : JSON.stringify(chunk.content),
          tags: chunk.tags ? String(chunk.tags) : '',
          source: chunk.source ? String(chunk.source) : 'user_upload',
        });
      }
      fileStats.ingested++;
    }

    console.log(`  ✅ Parsed: ${fileStats.parsed} | Ingested: ${fileStats.ingested} | Dup-skipped: ${fileStats.skipped_dup} | Empty-skipped: ${fileStats.skipped_empty}\n`);

    report.push({ file: fileName, ...fileStats });
    grandTotal.parsed += fileStats.parsed;
    grandTotal.skipped_dup += fileStats.skipped_dup;
    grandTotal.skipped_empty += fileStats.skipped_empty;
    grandTotal.ingested += fileStats.ingested;
  }

  // Reload KB
  if (!dryRun) {
    await reloadKnowledgeBase();
  }

  // Final stats
  const totalAfter = await db.knowledgeChunk.count();
  const icseAfter = await db.knowledgeChunk.count({ where: { board: 'ICSE' } });
  const iscAfter = await db.knowledgeChunk.count({ where: { board: 'ISC' } });
  const cbseAfter = await db.knowledgeChunk.count({ where: { board: 'CBSE' } });

  console.log('═══════════════════════════════════════════════════════════');
  console.log(dryRun ? 'DRY RUN SUMMARY (nothing was ingested)' : 'INGESTION SUMMARY');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`  Files processed:  ${report.length} / ${KB_FILES.length}`);
  console.log(`  Chunks parsed:    ${grandTotal.parsed}`);
  console.log(`  Ingested:         ${grandTotal.ingested}`);
  console.log(`  Skipped (dups):   ${grandTotal.skipped_dup}`);
  console.log(`  Skipped (empty):  ${grandTotal.skipped_empty}`);
  console.log(`  ─────────────────────────────────────────────`);
  console.log(`  KB BEFORE: ${totalBefore} (ICSE: ${icseBefore} | ISC: ${iscBefore} | CBSE: ${cbseBefore})`);
  console.log(`  KB AFTER:  ${totalAfter} (ICSE: ${icseAfter} | ISC: ${iscAfter} | CBSE: ${cbseAfter})`);
  console.log('═══════════════════════════════════════════════════════════\n');

  // Per-file breakdown
  console.log('Per-file breakdown:');
  for (const r of report) {
    console.log(`  ${r.file}: ${r.ingested} ingested, ${r.skipped_dup} dup-skipped, ${r.skipped_empty} empty-skipped`);
  }
  console.log('');
}

main()
  .catch(e => { console.error('FATAL:', e); process.exit(1); })
  .finally(() => process.exit(0));
