const Database = require('better-sqlite3');
const path = require('path');
const { execSync } = require('child_process');

const dbPath = path.join(__dirname, '../db/custom.db');
console.log('Connecting to database at:', dbPath);
const db = new Database(dbPath);

console.log('Dropping triggers if they exist...');
db.prepare('DROP TRIGGER IF EXISTS KnowledgeChunk_ai').run();
db.prepare('DROP TRIGGER IF EXISTS KnowledgeChunk_ad').run();
db.prepare('DROP TRIGGER IF EXISTS KnowledgeChunk_au').run();
console.log('Triggers dropped successfully.');

db.close();

console.log('Running prisma db push...');
try {
  execSync('npx prisma db push --accept-data-loss', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
} catch (e) {
  console.error('Prisma push failed:', e.message);
}

console.log('Reconnecting to database to restore FTS5 and triggers...');
const db2 = new Database(dbPath);

console.log('Creating FTS5 table and triggers...');
db2.exec(`
  DROP TABLE IF EXISTS KnowledgeChunk_fts;
  CREATE VIRTUAL TABLE KnowledgeChunk_fts USING fts5(
      board, subject, title, tags, content, chapter,
      content='KnowledgeChunk',
      content_rowid='id'
  );
  
  CREATE TRIGGER IF NOT EXISTS KnowledgeChunk_ai AFTER INSERT ON KnowledgeChunk BEGIN
      INSERT INTO KnowledgeChunk_fts(rowid, board, subject, title, tags, content, chapter)
      VALUES (new.id, new.board, new.subject, new.title, new.tags, new.content, new.chapter);
  END;
  
  CREATE TRIGGER IF NOT EXISTS KnowledgeChunk_ad AFTER DELETE ON KnowledgeChunk BEGIN
      INSERT INTO KnowledgeChunk_fts(KnowledgeChunk_fts, rowid, board, subject, title, tags, content, chapter)
      VALUES ('delete', old.id, old.board, old.subject, old.title, old.tags, old.content, old.chapter);
  END;
  
  CREATE TRIGGER IF NOT EXISTS KnowledgeChunk_au AFTER UPDATE ON KnowledgeChunk BEGIN
      INSERT INTO KnowledgeChunk_fts(KnowledgeChunk_fts, rowid, board, subject, title, tags, content, chapter)
      VALUES ('delete', old.id, old.board, old.subject, old.title, old.tags, old.content, old.chapter);
      INSERT INTO KnowledgeChunk_fts(rowid, board, subject, title, tags, content, chapter)
      VALUES (new.id, new.board, new.subject, new.title, new.tags, new.content, new.chapter);
  END;
`);

console.log('Rebuilding FTS5 index (if there is data)...');
try {
  db2.exec(`INSERT INTO KnowledgeChunk_fts(KnowledgeChunk_fts) VALUES('rebuild');`);
  console.log('FTS5 index rebuilt.');
} catch (e) {
  console.log('Rebuild warning (might be empty or already populated):', e.message);
}

db2.close();
console.log('Database preparation complete!');
