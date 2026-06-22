import { db } from '../src/lib/db';

async function main() {
  const counts = await db.knowledgeChunk.groupBy({
    by: ['board', 'className', 'subject'],
    where: { category: 'syllabus' },
    _count: { _all: true },
    orderBy: [
      { board: 'asc' },
      { className: 'asc' },
      { subject: 'asc' }
    ]
  });
  console.log(JSON.stringify(counts, null, 2));
}

main()
  .catch(console.error)
  .finally(() => process.exit(0));
