const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.resolve(__dirname, '../db/custom.db');
console.log('Connecting to SQLite database at:', dbPath);

try {
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');

  console.log('Creating TimetableSlot table...');
  db.exec(`
    CREATE TABLE IF NOT EXISTS "TimetableSlot" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "user_id" TEXT NOT NULL,
      "subject" TEXT NOT NULL,
      "topic" TEXT NOT NULL,
      "dayOfWeek" TEXT NOT NULL,
      "timeStart" TEXT NOT NULL,
      "timeEnd" TEXT NOT NULL,
      "completed" INTEGER NOT NULL DEFAULT 0,
      "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" DATETIME NOT NULL
    );
  `);
  
  console.log('Creating index on TimetableSlot...');
  db.exec(`CREATE INDEX IF NOT EXISTS "TimetableSlot_user_id_idx" ON "TimetableSlot" ("user_id");`);

  console.log('TimetableSlot table and index created successfully!');
  db.close();
} catch (err) {
  console.error('Timetable migration failed:', err);
  process.exit(1);
}
