// Bulk ingest CBSE database (1578 papers with text content)
// Adds board='CBSE' to every chunk
import fs from 'fs/promises';
import { db } from '../src/lib/db';
import { reloadKnowledgeBase } from '../src/lib/knowledge';

async function main() {
  console.log('CBSE Bulk Ingest\n');
  const before = await db.knowledgeChunk.count();
  console.log(`KB chunks before: ${before}\n`);

  const raw = await fs.readFile('/home/z/my-project/upload/cbse_database.json', 'utf-8');
  const data = JSON.parse(raw);

  const withText = data.filter((d: any) => d.Text && d.Text.trim().length > 100);
  console.log(`Items with text: ${withText.length}\n`);

  let totalChunks = 0;
  let totalChars = 0;
  const subjectStats: Record<string, number> = {};

  // Process in batches of 50 papers
  const BATCH = 50;
  for (let i = 0; i < withText.length; i += BATCH) {
    const batch = withText.slice(i, i + BATCH);
    const records: any[] = [];

    for (const paper of batch) {
      const subject = (paper.Subject || 'General').replace(/^cbse\s+/i, '').trim();
      const year = String(paper.Year || 'unknown');
      const paperType = paper.PaperType || 'Question Paper';
      const fileName = paper.Filename || '';
      const text = paper.Text || '';

      if (text.trim().length < 100) continue;

      subjectStats[subject] = (subjectStats[subject] || 0) + 1;

      // Split into ~3500-char chunks
      const CHUNK_SIZE = 3500;
      const pages = text.split(/--- Page \d+ ---/).filter(p => p.trim().length > 50);

      let currentChunk = '';
      let chunkIndex = 1;
      let startPage = 1;

      for (let j = 0; j < pages.length; j++) {
        const pageText = pages[j].trim();
        if (pageText.length < 20) continue;

        if (currentChunk.length + pageText.length > CHUNK_SIZE && currentChunk.length > 0) {
          records.push({
            board: 'CBSE',
            subject,
            className: '10',
            category: 'past_paper',
            chapter: year,
            title: `${subject} ${year} ${paperType} — Part ${chunkIndex}`,
            content: `CBSE Class 10 ${subject} — ${paperType} from ${year}\nSource: ${fileName}\n\n${currentChunk.trim()}`.slice(0, 6000),
            tags: `${subject.toLowerCase()},cbse,past,paper,${year},${paperType.toLowerCase()}`.slice(0, 200),
            source: 'user_upload'
          });
          totalChunks++;
          totalChars += currentChunk.length;
          chunkIndex++;
          currentChunk = pageText;
          startPage = j + 1;
        } else {
          currentChunk = currentChunk + '\n\n' + pageText;
        }
      }

      if (currentChunk.trim().length > 50) {
        records.push({
          board: 'CBSE',
          subject,
          className: '10',
          category: 'past_paper',
          chapter: year,
          title: `${subject} ${year} ${paperType} — Part ${chunkIndex}`,
          content: `CBSE Class 10 ${subject} — ${paperType} from ${year}\nSource: ${fileName}\n\n${currentChunk.trim()}`.slice(0, 6000),
          tags: `${subject.toLowerCase()},cbse,past,paper,${year},${paperType.toLowerCase()}`.slice(0, 200),
          source: 'user_upload'
        });
        totalChunks++;
        totalChars += currentChunk.length;
      }
    }

    if (records.length > 0) {
      await db.knowledgeChunk.createMany({ data: records });
    }
    process.stdout.write(`  Batch ${Math.floor(i/BATCH)+1}/${Math.ceil(withText.length/BATCH)}: ${records.length} chunks\r`);
  }

  // Also ingest the resources guide as GENERAL board
  console.log('\n\nIngesting CBSE resources guide...');
  const guide = await fs.readFile('/home/z/my-project/upload/cbse_resources_guide.md', 'utf-8');
  await db.knowledgeChunk.create({
    data: {
      board: 'CBSE',
      subject: 'General',
      className: '10',
      category: 'rubric',
      chapter: 'Resources Guide',
      title: 'CBSE Class 10 — Topper Strategies, Free Notes, YouTube Channels',
      content: guide.slice(0, 8000),
      tags: 'cbse,resources,topper,notes,youtube,guide',
      source: 'user_upload'
    }
  });
  totalChunks++;

  await reloadKnowledgeBase();
  const after = await db.knowledgeChunk.count();
  const cbseCount = await db.knowledgeChunk.count({ where: { board: 'CBSE' } });
  const icseCount = await db.knowledgeChunk.count({ where: { board: 'ICSE' } });

  console.log('\n═══════════════════════════════════════════════');
  console.log('CBSE INGEST COMPLETE');
  console.log('═══════════════════════════════════════════════');
  console.log(`  Papers processed:  ${withText.length}`);
  console.log(`  Chunks created:    ${totalChunks}`);
  console.log(`  Total chars:       ${totalChars.toLocaleString()}`);
  console.log(`  KB chunks: ${before} → ${after}`);
  console.log(`  ICSE: ${icseCount} | CBSE: ${cbseCount}`);
  console.log('═══════════════════════════════════════════════\n');
}

main()
  .catch(e => { console.error('FATAL:', e); process.exit(1); })
  .finally(() => process.exit(0));
