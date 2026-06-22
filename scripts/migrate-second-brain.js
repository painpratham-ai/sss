const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.resolve(__dirname, '../db/custom.db');
console.log('Connecting to SQLite database at:', dbPath);

try {
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');

  console.log('Creating StudentProfile table...');
  db.exec(`
    CREATE TABLE IF NOT EXISTS "StudentProfile" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "user_id" TEXT NOT NULL,
      "learningStyle" TEXT NOT NULL DEFAULT 'Socratic',
      "interests" TEXT NOT NULL DEFAULT '[]',
      "strengths" TEXT NOT NULL DEFAULT '[]',
      "weaknesses" TEXT NOT NULL DEFAULT '[]',
      "studyHabits" TEXT NOT NULL DEFAULT '{}',
      "memoryLog" TEXT NOT NULL DEFAULT '[]',
      "last_ai_extraction" DATETIME,
      "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" DATETIME NOT NULL
    );
  `);
  
  // Ensure user_id is unique
  try {
    db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS "StudentProfile_user_id_key" ON "StudentProfile" ("user_id");`);
  } catch (e) {
    console.log('Index creation message:', e.message);
  }

  console.log('Creating StudyEvent table...');
  db.exec(`
    CREATE TABLE IF NOT EXISTS "StudyEvent" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "user_id" TEXT NOT NULL,
      "event_type" TEXT NOT NULL,
      "subject" TEXT NOT NULL,
      "topic" TEXT NOT NULL,
      "metadata" TEXT NOT NULL DEFAULT '',
      "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  console.log('Creating indexes on StudyEvent...');
  db.exec(`
    CREATE INDEX IF NOT EXISTS "StudyEvent_user_id_event_type_idx" ON "StudyEvent" ("user_id", "event_type");
    CREATE INDEX IF NOT EXISTS "StudyEvent_user_id_subject_idx" ON "StudyEvent" ("user_id", "subject");
  `);

  console.log('Tables and indexes created successfully!');
  db.close();
} catch (err) {
  console.error('Migration failed:', err);
  process.exit(1);
}
