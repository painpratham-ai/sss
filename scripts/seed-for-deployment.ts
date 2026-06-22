// scripts/seed-for-deployment.ts
// Run this ONCE after deploying to populate the knowledge base.
// It ingests all ICSE + CBSE data from the /upload folder.
//
// Usage: bun run scripts/seed-for-deployment.ts

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
  execSync('bun run db:push', { stdio: 'inherit' });

  // 2. Create FTS5 index
  console.log('\n2. Creating FTS5 index...');
  const dbPath = process.env.DATABASE_URL?.replace('file:', '') || './db/custom.db';
  // Use python3 for FTS5 creation (sqlite3 CLI may not be available)
  execSync(`python3 -c "
import sqlite3
db = sqlite3.connect('${dbPath}')
db.executescript('''
DROP TABLE IF EXISTS KnowledgeChunk_fts;
CREATE VIRTUAL TABLE KnowledgeChunk_fts USING fts5(
    board, subject, title, tags, content, chapter,
    content='KnowledgeChunk',
    content_rowid='rowid'
);
CREATE TRIGGER IF NOT EXISTS KnowledgeChunk_ai AFTER INSERT ON KnowledgeChunk BEGIN
    INSERT INTO KnowledgeChunk_fts(rowid, board, subject, title, tags, content, chapter)
    VALUES (new.rowid, new.board, new.subject, new.title, new.tags, new.content, new.chapter);
END;
CREATE TRIGGER IF NOT EXISTS KnowledgeChunk_ad AFTER DELETE ON KnowledgeChunk BEGIN
    INSERT INTO KnowledgeChunk_fts(KnowledgeChunk_fts, rowid, board, subject, title, tags, content, chapter)
    VALUES ('delete', old.rowid, old.board, old.subject, old.title, old.tags, old.content, old.chapter);
END;
CREATE TRIGGER IF NOT EXISTS KnowledgeChunk_au AFTER UPDATE ON KnowledgeChunk BEGIN
    INSERT INTO KnowledgeChunk_fts(KnowledgeChunk_fts, rowid, board, subject, title, tags, content, chapter)
    VALUES ('delete', old.rowid, old.board, old.subject, old.title, old.tags, old.content, old.chapter);
    INSERT INTO KnowledgeChunk_fts(rowid, board, subject, title, tags, content, chapter)
    VALUES (new.rowid, new.board, new.subject, new.title, new.tags, new.content, new.chapter);
END;
''')
db.commit()
db.close()
print('FTS5 index created')
"`, { stdio: 'inherit' });

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
    execSync('bun run scripts/smart-ingest.ts', { stdio: 'inherit' });
  }

  // 5. Ingest CBSE data if present
  const cbseFile = path.join(UPLOAD_DIR, 'cbse_database.json');
  if (await fs.access(cbseFile).then(() => true).catch(() => false)) {
    console.log('\n4. Ingesting CBSE database...');
    execSync('bun run scripts/ingest_cbse.ts', { stdio: 'inherit' });
  }

  // 6. Ingest ICSE PDF data if present
  const icseFiles = (await fs.readdir(UPLOAD_DIR).catch(() => [])).filter(f => f.startsWith('icse_kb_'));
  if (icseFiles.length > 0) {
    console.log('\n5. Ingesting ICSE PDF data...');
    execSync('bun run scripts/bulk_ingest_pdfs.ts', { stdio: 'inherit' });
  }

  await reloadKnowledgeBase();
  const final = await db.knowledgeChunk.count();
  console.log(`\n=== SEED COMPLETE ===`);
  console.log(`Total chunks: ${final}`);
}

main()
  .catch(e => { console.error('FATAL:', e); process.exit(1); })
  .finally(() => process.exit(0));
