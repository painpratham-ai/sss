import sqlite3
db = sqlite3.connect('./db/custom.db')
cursor = db.cursor()
cursor.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name IN ('KnowledgeChunk', 'KnowledgeChunk_fts')")
for row in cursor.fetchall():
    print(row[0])
