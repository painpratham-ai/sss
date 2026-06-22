import sqlite3
db = sqlite3.connect('./db/custom.db')

try:
    print("Dropping existing FTS5 table and triggers...")
    db.executescript('''
    DROP TRIGGER IF EXISTS KnowledgeChunk_ai;
    DROP TRIGGER IF EXISTS KnowledgeChunk_ad;
    DROP TRIGGER IF EXISTS KnowledgeChunk_au;
    DROP TABLE IF EXISTS KnowledgeChunk_fts;
    ''')

    print("Recreating FTS5 table with correct content_rowid='rowid'...")
    db.executescript('''
    CREATE VIRTUAL TABLE KnowledgeChunk_fts USING fts5(
        board, subject, title, tags, content, chapter,
        content='KnowledgeChunk',
        content_rowid='rowid'
    );
    CREATE TRIGGER KnowledgeChunk_ai AFTER INSERT ON KnowledgeChunk BEGIN
        INSERT INTO KnowledgeChunk_fts(rowid, board, subject, title, tags, content, chapter)
        VALUES (new.rowid, new.board, new.subject, new.title, new.tags, new.content, new.chapter);
    END;
    CREATE TRIGGER KnowledgeChunk_ad AFTER DELETE ON KnowledgeChunk BEGIN
        INSERT INTO KnowledgeChunk_fts(KnowledgeChunk_fts, rowid, board, subject, title, tags, content, chapter)
        VALUES ('delete', old.rowid, old.board, old.subject, old.title, old.tags, old.content, old.chapter);
    END;
    CREATE TRIGGER KnowledgeChunk_au AFTER UPDATE ON KnowledgeChunk BEGIN
        INSERT INTO KnowledgeChunk_fts(KnowledgeChunk_fts, rowid, board, subject, title, tags, content, chapter)
        VALUES ('delete', old.rowid, old.board, old.subject, old.title, old.tags, old.content, old.chapter);
        INSERT INTO KnowledgeChunk_fts(rowid, board, subject, title, tags, content, chapter)
        VALUES (new.rowid, new.board, new.subject, new.title, new.tags, new.content, new.chapter);
    END;
    ''')

    print("Rebuilding FTS5 index for existing rows...")
    db.executescript("INSERT INTO KnowledgeChunk_fts(KnowledgeChunk_fts) VALUES('rebuild');")
    
    db.commit()
    print("Success! The FTS5 index has been rebuilt.")
except Exception as e:
    print("Error:", e)
finally:
    db.close()
