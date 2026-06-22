const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const projects = await prisma.project.findMany({
    select: {
      id: true,
      title: true,
      status: true,
      createdAt: true
    },
    orderBy: {
      createdAt: 'desc'
    }
  });
  console.log('Projects:', projects);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
