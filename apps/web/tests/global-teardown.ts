import { PrismaClient } from "@prisma/client";

export default async function globalTeardown() {
  const prisma = new PrismaClient();
  try {
    await prisma.post.deleteMany({ where: { title: { startsWith: "E2E-" } } });
    await prisma.user.deleteMany({ where: { email: { startsWith: "e2e-" } } });
  } finally {
    await prisma.$disconnect();
  }
}
