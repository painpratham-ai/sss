const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const count = await prisma.cacheEntry.count();
  console.log('Total cache entries:', count);

  const kinds = await prisma.cacheEntry.groupBy({
    by: ['kind'],
    _count: {
      id: true
    },
    _sum: {
      hits: true
    }
  });
  console.log('Cache entries by kind:', kinds);

  const latest = await prisma.cacheEntry.findMany({
    take: 10,
    orderBy: {
      createdAt: 'desc'
    },
    select: {
      id: true,
      kind: true,
      hits: true,
      createdAt: true,
      value: true
    }
  });
  console.log('\nLatest 10 cache entries:');
  latest.forEach((entry, i) => {
    console.log(`${i+1}. [${entry.kind}] hits=${entry.hits}, created=${entry.createdAt}, length=${entry.value.length}`);
    console.log(`   Snippet: "${entry.value.slice(0, 100).replace(/\n/g, ' ')}..."`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
