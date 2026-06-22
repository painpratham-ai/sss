// scripts/seed-for-deployment.ts
// Run this ONCE after deploying to populate the knowledge base.
// It ingests all ICSE + CBSE data from the /upload folder.
//
// Usage: npx tsx scripts/seed-for-deployment.ts

import { db } from '../src/lib/db';
import { reloadKnowledgeBase } from '../src/lib/knowledge';
import fs from 'fs/promises';
import path from 'path';
import { execSync } from 'child_process';

const UPLOAD_DIR = path.join(process.cwd(), 'upload');

async function main() {
  console.log('=== DEPLOYMENT SEED ===\n');

  // 1. Push schema
  console.log('1. Pushing Prisma schema...');
  execSync('npx prisma db push', { stdio: 'inherit' });

  // 2. Create FTS5 index using Prisma client raw execution (Turso/SQLite compatible)
  console.log('\n2. Creating FTS5 index...');
  try {
    await db.$executeRawUnsafe(`DROP TABLE IF EXISTS KnowledgeChunk_fts;`);
    await db.$executeRawUnsafe(`
      CREATE VIRTUAL TABLE KnowledgeChunk_fts USING fts5(
          board, subject, title, tags, content, chapter,
          content='KnowledgeChunk',
          content_rowid='rowid'
      );
    `);
    
    // Create triggers one by one
    await db.$executeRawUnsafe(`
      CREATE TRIGGER IF NOT EXISTS KnowledgeChunk_ai AFTER INSERT ON KnowledgeChunk BEGIN
          INSERT INTO KnowledgeChunk_fts(rowid, board, subject, title, tags, content, chapter)
          VALUES (new.rowid, new.board, new.subject, new.title, new.tags, new.content, new.chapter);
      END;
    `);
    
    await db.$executeRawUnsafe(`
      CREATE TRIGGER IF NOT EXISTS KnowledgeChunk_ad AFTER DELETE ON KnowledgeChunk BEGIN
          INSERT INTO KnowledgeChunk_fts(KnowledgeChunk_fts, rowid, board, subject, title, tags, content, chapter)
          VALUES ('delete', old.rowid, old.board, old.subject, old.title, old.tags, old.content, old.chapter);
      END;
    `);
    
    await db.$executeRawUnsafe(`
      CREATE TRIGGER IF NOT EXISTS KnowledgeChunk_au AFTER UPDATE ON KnowledgeChunk BEGIN
          INSERT INTO KnowledgeChunk_fts(KnowledgeChunk_fts, rowid, board, subject, title, tags, content, chapter)
          VALUES ('delete', old.rowid, old.board, old.subject, old.title, old.tags, old.content, old.chapter);
          INSERT INTO KnowledgeChunk_fts(rowid, board, subject, title, tags, content, chapter)
          VALUES (new.rowid, new.board, new.subject, new.title, new.tags, new.content, new.chapter);
      END;
    `);
    
    console.log('FTS5 index and triggers created successfully');
  } catch (err) {
    console.error('Error creating FTS5 index/triggers:', err);
  }

  // 3. Check if data already exists
  const existing = await db.knowledgeChunk.count();
  if (existing > 100) {
    console.log(`\n3. KB already has ${existing} chunks — skipping seed.`);
    await reloadKnowledgeBase();
    return;
  }

  // 4. Run smart ingest
  console.log('\n3. Running smart ingest...');
  if (await fs.access(UPLOAD_DIR).then(() => true).catch(() => false)) {
    execSync('npx tsx scripts/smart-ingest.ts', { stdio: 'inherit' });
  }

  // 5. Ingest CBSE data if present
  const cbseFile = path.join(UPLOAD_DIR, 'cbse_database.json');
  if (await fs.access(cbseFile).then(() => true).catch(() => false)) {
    console.log('\n4. Ingesting CBSE database...');
    execSync('npx tsx scripts/ingest_cbse.ts', { stdio: 'inherit' });
  }

  // 6. Ingest ICSE PDF data if present
  const icseFiles = (await fs.readdir(UPLOAD_DIR).catch(() => [])).filter(f => f.startsWith('icse_kb_'));
  if (icseFiles.length > 0) {
    console.log('\n5. Ingesting ICSE PDF data...');
    execSync('npx tsx scripts/bulk_ingest_pdfs.ts', { stdio: 'inherit' });
  }

  await reloadKnowledgeBase();
  const final = await db.knowledgeChunk.count();
  console.log(`\n=== SEED COMPLETE ===`);
  console.log(`Total chunks: ${final}`);
}

main()
  .catch(e => { console.error('FATAL:', e); process.exit(1); })
  .finally(() => process.exit(0));
