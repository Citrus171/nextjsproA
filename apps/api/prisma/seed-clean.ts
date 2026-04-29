import { PrismaClient, Plan, Role } from "@prisma/client";
import * as bcrypt from "bcrypt";
import * as fs from "fs";
import * as path from "path";
import { encryptEmail, hmacEmail, normalizeEmail } from "../src/utils/crypto";

const prisma = new PrismaClient();
const seedPassword = "Password123!";

const ids = {
  adminUser: "10000000-0000-0000-0000-000000000001",
  ownerUser: "10000000-0000-0000-0000-000000000002",
  sighterUser: "10000000-0000-0000-0000-000000000003",
};

function loadEnvFile() {
  const envPath = path.join(__dirname, "..", ".env");
  if (!fs.existsSync(envPath)) return;

  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    if (process.env[key]) continue;

    const value = trimmed
      .slice(separatorIndex + 1)
      .trim()
      .replace(/^['"]|['"]$/g, "");
    process.env[key] = value;
  }
}

async function cleanAllData() {
  await prisma.$transaction([
    prisma.message.deleteMany(),
    prisma.conversation.deleteMany(),
    prisma.sightingFavorite.deleteMany(),
    prisma.sightingImage.deleteMany(),
    prisma.sighting.deleteMany(),
    prisma.postFavorite.deleteMany(),
    prisma.image.deleteMany(),
    prisma.location.deleteMany(),
    prisma.petDetail.deleteMany(),
    prisma.post.deleteMany(),
    prisma.refreshToken.deleteMany(),
    prisma.user.deleteMany(),
  ]);
}

async function createUser({
  id,
  email,
  nickname,
  role,
  plan,
}: {
  id: string;
  email: string;
  nickname: string;
  role: Role;
  plan: Plan;
}) {
  const normalized = normalizeEmail(email);
  const password = await bcrypt.hash(seedPassword, 10);

  return prisma.user.create({
    data: {
      id,
      emailEncrypted: encryptEmail(normalized),
      emailHash: hmacEmail(normalized),
      password,
      nickname,
      role,
      plan,
    },
  });
}

async function main() {
  loadEnvFile();

  await cleanAllData();

  const admin = await createUser({
    id: ids.adminUser,
    email: "seed-admin@finder.miyaoo.test",
    nickname: "seed-admin",
    role: Role.admin,
    plan: Plan.premium,
  });
  const owner = await createUser({
    id: ids.ownerUser,
    email: "seed-owner@finder.miyaoo.test",
    nickname: "seed-owner",
    role: Role.user,
    plan: Plan.premium,
  });
  const sighter = await createUser({
    id: ids.sighterUser,
    email: "seed-sighter@finder.miyaoo.test",
    nickname: "seed-sighter",
    role: Role.user,
    plan: Plan.free,
  });

  console.log(
    JSON.stringify(
      {
        adminUserId: admin.id,
        ownerUserId: owner.id,
        sighterUserId: sighter.id,
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
