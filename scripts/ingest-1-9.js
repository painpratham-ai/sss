const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

// Load environment variables from .env if needed
const envPath = path.join(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const firstEquals = trimmed.indexOf('=');
    if (firstEquals === -1) return;
    const key = trimmed.substring(0, firstEquals).trim();
    const val = trimmed.substring(firstEquals + 1).trim();
    process.env[key] = val;
  });
}

const prisma = new PrismaClient();

const JSON_FILES = [
  'c:/Users/HP/.openclaw-autoclaw/agents/ed/workspace/knowledge-base/icse-class-1-3.json',
  'c:/Users/HP/.openclaw-autoclaw/agents/ed/workspace/knowledge-base/icse-class-4-6.json',
  'c:/Users/HP/.openclaw-autoclaw/agents/ed/workspace/knowledge-base/icse-class-7-9.json',
  'c:/Users/HP/.openclaw-autoclaw/agents/ed/workspace/knowledge-base/cbse-class-1-3.json',
  'c:/Users/HP/.openclaw-autoclaw/agents/ed/workspace/knowledge-base/cbse-class-4-6.json',
  'c:/Users/HP/.openclaw-autoclaw/agents/ed/workspace/knowledge-base/cbse-class-7-9.json'
];

async function main() {
  console.log('Starting ingestion of ICSE Class 1-9 data...');
  let totalParsed = 0;
  let totalInserted = 0;
  let totalSkipped = 0;

  for (const filePath of JSON_FILES) {
    if (!fs.existsSync(filePath)) {
      console.warn(`File not found: ${filePath}`);
      continue;
    }

    console.log(`Reading: ${path.basename(filePath)}...`);
    const raw = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(raw);

    if (!Array.isArray(data)) {
      console.warn(`Expected array in JSON file: ${filePath}`);
      continue;
    }

    console.log(`Parsed ${data.length} chunks. Inserting...`);
    totalParsed += data.length;

    for (const chunk of data) {
      const title = chunk.title || 'Untitled';
      const content = chunk.content || '';

      // Check if duplicate exists (by exact title or content fingerprint match)
      const existing = await prisma.knowledgeChunk.findFirst({
        where: {
          title: title,
          board: chunk.board || 'ICSE',
          subject: chunk.subject || 'General',
          className: String(chunk.className || '10')
        }
      });

      if (existing) {
        totalSkipped++;
        continue;
      }

      await prisma.knowledgeChunk.create({
        data: {
          board: chunk.board || 'ICSE',
          subject: chunk.subject || 'General',
          className: String(chunk.className || '10'),
          category: chunk.category || 'syllabus',
          chapter: chunk.chapter || '',
          title: title,
          content: content,
          tags: chunk.tags || '',
          source: chunk.source || 'user_upload'
        }
      });
      totalInserted++;
    }
  }

  console.log('═══════════════════════════════════════════════');
  console.log('INGESTION COMPLETED');
  console.log('═══════════════════════════════════════════════');
  console.log(`  Total parsed:     ${totalParsed}`);
  console.log(`  Total skipped:    ${totalSkipped} (duplicates)`);
  console.log(`  Total inserted:   ${totalInserted}`);
  console.log('═══════════════════════════════════════════════\n');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
