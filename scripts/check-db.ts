import { db } from '../src/lib/db';

async function main() {
  const total = await db.knowledgeChunk.count();
  console.log(`Total KnowledgeChunks: ${total}`);

  const boards = await db.knowledgeChunk.groupBy({
    by: ['board'],
    _count: { _all: true },
  });
  console.log('By Board:');
  console.log(JSON.stringify(boards, null, 2));

  const classes = await db.knowledgeChunk.groupBy({
    by: ['board', 'className'],
    _count: { _all: true },
  });
  console.log('By Class:');
  console.log(JSON.stringify(classes, null, 2));

  const categories = await db.knowledgeChunk.groupBy({
    by: ['board', 'category'],
    _count: { _all: true },
  });
  console.log('By Category:');
  console.log(JSON.stringify(categories, null, 2));
}

main()
  .catch(console.error)
  .finally(() => process.exit(0));
