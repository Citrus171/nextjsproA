import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const post = await prisma.post.findUnique({
    where: { id: 'cmo1hfsxh0003kb4vezgh852u' }
  });
  console.log('Post exists:', !!post);
  if (post) console.log('Post:', post);
}

main().catch(console.error).finally(() => prisma.$disconnect());