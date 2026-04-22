import {
  PrismaClient,
  Plan,
  PostStatus,
  PostType,
  Gender,
  Prefecture,
  Role,
} from "@prisma/client";
import * as bcrypt from "bcrypt";
import * as fs from "fs";
import * as path from "path";
import {
  OPENAPI_CONVERSATION_ID_EXAMPLE,
  OPENAPI_IMAGE_ID_EXAMPLE,
  OPENAPI_MESSAGE_ID_EXAMPLE,
  OPENAPI_POST_ID_EXAMPLE,
  OPENAPI_SIGHTING_ID_EXAMPLE,
} from "../src/common/openapi-examples";
import { encryptEmail, hmacEmail, normalizeEmail } from "../src/utils/crypto";

const prisma = new PrismaClient();
const seedPassword = "Password123!";

const ids = {
  adminUser: "10000000-0000-0000-0000-000000000001",
  ownerUser: "10000000-0000-0000-0000-000000000002",
  sighterUser: "10000000-0000-0000-0000-000000000003",
  post: OPENAPI_POST_ID_EXAMPLE,
  image: OPENAPI_IMAGE_ID_EXAMPLE,
  sighting: OPENAPI_SIGHTING_ID_EXAMPLE,
  conversation: OPENAPI_CONVERSATION_ID_EXAMPLE,
  message: OPENAPI_MESSAGE_ID_EXAMPLE,
  petDetail: "00000000-0000-0000-0000-000000000005",
  location: "00000000-0000-0000-0000-000000000006",
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
      .replace(/^['\"]|['\"]$/g, "");
    process.env[key] = value;
  }
}

async function deleteSeedData() {
  await prisma.$transaction([
    prisma.message.deleteMany({
      where: { id: ids.message, conversationId: ids.conversation },
    }),
    prisma.conversation.deleteMany({ where: { id: ids.conversation } }),
    prisma.sightingFavorite.deleteMany({
      where: { sightingId: ids.sighting },
    }),
    prisma.sightingImage.deleteMany({ where: { sightingId: ids.sighting } }),
    prisma.sighting.deleteMany({ where: { id: ids.sighting } }),
    prisma.postFavorite.deleteMany({ where: { postId: ids.post } }),
    prisma.image.deleteMany({ where: { id: ids.image, postId: ids.post } }),
    prisma.location.deleteMany({ where: { postId: ids.post } }),
    prisma.petDetail.deleteMany({ where: { postId: ids.post } }),
    prisma.post.deleteMany({ where: { id: ids.post } }),
    prisma.refreshToken.deleteMany({
      where: {
        userId: { in: [ids.adminUser, ids.ownerUser, ids.sighterUser] },
      },
    }),
    prisma.user.deleteMany({
      where: { id: { in: [ids.adminUser, ids.ownerUser, ids.sighterUser] } },
    }),
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

  await deleteSeedData();

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

  await prisma.post.create({
    data: {
      id: ids.post,
      userId: owner.id,
      postType: PostType.cat,
      status: PostStatus.lost,
      title: "Seed cat",
      description: "Seed data for contract testing",
      lostDate: new Date("2024-01-01T00:00:00.000Z"),
      petDetail: {
        create: {
          id: ids.petDetail,
          name: "Momo",
          color: "white",
          age: "2 years",
          features: "Pink nose, blue collar",
          gender: Gender.female,
          breed: "Mixed",
          size: "medium",
          collar: "blue collar",
          microchip: true,
          neutered: true,
        },
      },
      location: {
        create: {
          id: ids.location,
          prefecture: Prefecture.saitama,
          city: "Saitama City",
          address: "Urawa-ku 1-1-1",
          lat: 35.8617,
          lng: 139.6455,
        },
      },
      images: {
        create: {
          id: ids.image,
          url: `uploads/${ids.post}/seed-image.jpg`,
        },
      },
    },
  });

  const sighting = await prisma.sighting.create({
    data: {
      id: ids.sighting,
      postId: ids.post,
      userId: sighter.id,
      lat: 35.8617,
      lng: 139.6455,
      address: "Saitama City, Urawa-ku",
      sightedAt: new Date("2024-01-02T00:00:00.000Z"),
      comment: "Seed sighting",
    },
  });

  const conversation = await prisma.conversation.create({
    data: {
      id: ids.conversation,
      postId: ids.post,
      sightingId: sighting.id,
      ownerId: owner.id,
      sighterId: sighter.id,
    },
  });

  await prisma.message.create({
    data: {
      id: ids.message,
      conversationId: conversation.id,
      senderId: admin.id,
      body: "Seed message",
    },
  });

  console.log(
    JSON.stringify(
      {
        adminUserId: admin.id,
        ownerUserId: owner.id,
        sighterUserId: sighter.id,
        postId: ids.post,
        imageId: ids.image,
        sightingId: sighting.id,
        conversationId: conversation.id,
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
