import Database from 'better-sqlite3';

const db = new Database('./db/custom.db');
try {
  const stmt = db.prepare(`
    INSERT INTO KnowledgeChunk (id, board, subject, class_name, category, chapter, title, content, tags, source, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `);
  stmt.run(
    'test-id-123',
    'ICSE',
    'Geography',
    '10',
    'CFQ_ICSE',
    'CISCE CFQ_ICSE',
    'Geography (CFQ_ICSE) - Part 1',
    'Test content',
    'test,tags',
    'source'
  );
  console.log('Direct insert successful!');
} catch (e) {
  console.error('Direct insert failed:', e);
}
