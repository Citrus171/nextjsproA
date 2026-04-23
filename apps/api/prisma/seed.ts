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

// ── デモ用マップデータ ────────────────────────────────────────────────
const DEMO_MAP_USER_ID = "20000000-0000-0000-0000-000000000001";
const OMIYA_LAT = 35.9062;
const OMIYA_LNG = 139.6237;

/** 黄金角分布で50点を大宮駅周辺に散布する */
function demoCoords(
  count: number,
  maxRadiusLat: number,
  maxRadiusLng: number
): { lat: number; lng: number }[] {
  return Array.from({ length: count }, (_, i) => {
    const angle = i * 137.508 * (Math.PI / 180);
    const r = Math.sqrt((i + 1) / count);
    return {
      lat: parseFloat(
        (OMIYA_LAT + r * maxRadiusLat * Math.cos(angle)).toFixed(6)
      ),
      lng: parseFloat(
        (OMIYA_LNG + r * maxRadiusLng * Math.sin(angle)).toFixed(6)
      ),
    };
  });
}

const CAT_NAMES = [
  "ミケ",
  "レオ",
  "シロ",
  "クロ",
  "モモ",
  "ハナ",
  "ソラ",
  "ムギ",
  "コテツ",
  "チャチャ",
  "ルナ",
  "ノア",
  "キナコ",
  "マロン",
  "ユキ",
  "ゴマ",
  "あんず",
  "きなこ",
  "こむぎ",
  "もち",
];
const COLORS = [
  "白",
  "黒",
  "茶トラ",
  "サバトラ",
  "三毛",
  "キジトラ",
  "白黒",
  "茶白",
  "グレー",
  "クリーム",
];
const BREEDS = [
  "雑種",
  "アメショ",
  "スコティッシュ",
  "ロシアンブルー",
  "マンチカン",
  "ノルウェー",
  "ラグドール",
  "メインクーン",
  "ペルシャ",
  "シャム",
];
const GENDERS: Gender[] = [Gender.male, Gender.female, Gender.unknown];

async function deleteDemoMapData() {
  await prisma.sighting.deleteMany({ where: { userId: DEMO_MAP_USER_ID } });
  const posts = await prisma.post.findMany({
    where: { userId: DEMO_MAP_USER_ID },
    select: { id: true },
  });
  const postIds = posts.map((p) => p.id);
  if (postIds.length > 0) {
    await prisma.location.deleteMany({ where: { postId: { in: postIds } } });
    await prisma.petDetail.deleteMany({ where: { postId: { in: postIds } } });
    await prisma.post.deleteMany({ where: { id: { in: postIds } } });
  }
  await prisma.user.deleteMany({ where: { id: DEMO_MAP_USER_ID } });
}

async function createDemoMapData() {
  const normalized = normalizeEmail("demo-map@finder.miyaoo.test");
  const password = await bcrypt.hash(seedPassword, 10);
  const demoUser = await prisma.user.create({
    data: {
      id: DEMO_MAP_USER_ID,
      emailEncrypted: encryptEmail(normalized),
      emailHash: hmacEmail(normalized),
      password,
      nickname: "demo-map-user",
      role: Role.user,
      plan: Plan.free,
    },
  });

  // 迷い猫 50件
  const lostCoords = demoCoords(50, 0.014, 0.018);
  for (let i = 0; i < 50; i++) {
    const { lat, lng } = lostCoords[i];
    const name =
      CAT_NAMES[i % CAT_NAMES.length] +
      (i >= CAT_NAMES.length
        ? String(Math.floor(i / CAT_NAMES.length) + 1)
        : "");
    await prisma.post.create({
      data: {
        userId: demoUser.id,
        postType: PostType.cat,
        status: PostStatus.lost,
        title: `${name}を探しています`,
        description: `${name}がいなくなりました。見かけた方はご連絡ください。`,
        lostDate: new Date(Date.now() - (i + 1) * 24 * 60 * 60 * 1000),
        petDetail: {
          create: {
            name,
            color: COLORS[i % COLORS.length],
            age: `${(i % 10) + 1}歳`,
            features: `${COLORS[i % COLORS.length]}の猫`,
            gender: GENDERS[i % 3],
            breed: BREEDS[i % BREEDS.length],
          },
        },
        location: {
          create: {
            prefecture: Prefecture.saitama,
            city: "さいたま市大宮区",
            address: `大宮区周辺 ${i + 1}`,
            lat,
            lng,
          },
        },
      },
    });
  }

  // 目撃 50件
  const sightingCoords = demoCoords(50, 0.013, 0.017);
  for (let i = 0; i < 50; i++) {
    const { lat, lng } = sightingCoords[i];
    await prisma.sighting.create({
      data: {
        userId: demoUser.id,
        lat,
        lng,
        address: `さいたま市大宮区周辺 目撃${i + 1}`,
        sightedAt: new Date(Date.now() - i * 12 * 60 * 60 * 1000),
        comment: `猫を目撃しました（目撃 ${i + 1}）`,
      },
    });
  }

  console.log(`デモマップデータ作成完了: 迷い猫 50件, 目撃 50件`);
}
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  loadEnvFile();

  await deleteSeedData();
  await deleteDemoMapData();

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

  await createDemoMapData();
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
