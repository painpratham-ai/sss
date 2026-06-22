import { db } from '../src/lib/db';

async function main() {
  console.log('Querying ingested YouTube reference chunks...\n');

  const chunks = await db.knowledgeChunk.findMany({
    where: {
      source: 'user_upload',
      title: {
        contains: 'YouTube reference'
      }
    },
    select: {
      subject: true,
      category: true,
      title: true,
      content: true
    }
  });

  console.log(`Found ${chunks.length} YouTube reference chunks in database:`);
  for (const chunk of chunks) {
    console.log(`\n--------------------------------------------`);
    console.log(`Subject:  ${chunk.subject}`);
    console.log(`Category: ${chunk.category}`);
    console.log(`Title:    ${chunk.title}`);
    console.log(`Content Preview:\n${chunk.content.split('\n').slice(0, 10).join('\n')}...`);
  }
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => process.exit(0));
