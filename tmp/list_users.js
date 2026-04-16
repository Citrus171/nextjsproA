const { PrismaClient } = require("@prisma/client");
(async function () {
  const p = new PrismaClient();
  try {
    const users = await p.user.findMany({
      select: { id: true, email: true, name: true, createdAt: true },
    });
    console.log(JSON.stringify(users, null, 2));
  } catch (e) {
    console.error("ERR", e);
    process.exit(1);
  } finally {
    await p.$disconnect();
  }
})();
