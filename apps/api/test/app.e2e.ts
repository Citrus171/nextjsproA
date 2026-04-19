import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import * as request from "supertest";
import * as cookieParser from "cookie-parser";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma.service";

const OWNER_EMAIL = `e2e-owner-${Date.now()}@test.example`;
const OTHER_EMAIL = `e2e-other-${Date.now()}@test.example`;
const PASSWORD = "testpass123";

// 1x1 PNG の最小バイナリ
const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64"
);

describe("API E2E", () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let ownerToken: string;
  let otherToken: string;
  let refreshCookie: string;
  let ownerId: string;

  let createdPostId: string;
  let createdImageId: string;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    app.setGlobalPrefix("api");
    app.use(cookieParser());
    await app.init();

    prisma = module.get(PrismaService);
  });

  afterAll(async () => {
    const users = await prisma.user.findMany({
      where: { email: { in: [OWNER_EMAIL, OTHER_EMAIL] } },
      select: { id: true },
    });
    const userIds = users.map((u) => u.id);
    await prisma.refreshToken.deleteMany({
      where: { userId: { in: userIds } },
    });
    await prisma.post.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.$disconnect();
    await app.close();
  });

  // ─── ユーザー登録 ────────────────────────────────────────────
  describe("POST /api/users/register", () => {
    it("オーナーユーザーを登録できる (201)", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/users/register")
        .send({ email: OWNER_EMAIL, password: PASSWORD, nickname: "Owner" });

      expect(res.status).toBe(201);
      expect(res.body.email).toBe(OWNER_EMAIL);
      expect(res.body.password).toBeUndefined();
      ownerId = res.body.id;
    });

    it("非オーナーユーザーを登録できる (201)", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/users/register")
        .send({ email: OTHER_EMAIL, password: PASSWORD, nickname: "Other" });

      expect(res.status).toBe(201);
    });

    it("重複メールは 400 を返す", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/users/register")
        .send({ email: OWNER_EMAIL, password: PASSWORD, nickname: "Dup" });

      expect(res.status).toBe(400);
    });

    it("短すぎるパスワードは 400 を返す", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/users/register")
        .send({
          email: "short@test.example",
          password: "short",
          nickname: "S",
        });

      expect(res.status).toBe(400);
    });
  });

  // ─── ログイン ────────────────────────────────────────────────
  describe("POST /api/auth/login", () => {
    it("オーナー: accessToken を返す (200)", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/auth/login")
        .send({ email: OWNER_EMAIL, password: PASSWORD });

      expect(res.status).toBe(200);
      expect(res.body.accessToken).toBeDefined();
      ownerToken = res.body.accessToken;

      const cookies = res.headers["set-cookie"];
      refreshCookie = Array.isArray(cookies)
        ? (cookies.find((c: string) => c.startsWith("refreshToken=")) ?? "")
        : "";
      expect(refreshCookie).toContain("refreshToken=");
    });

    it("非オーナー: accessToken を返す (200)", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/auth/login")
        .send({ email: OTHER_EMAIL, password: PASSWORD });

      expect(res.status).toBe(200);
      otherToken = res.body.accessToken;
    });

    it("誤パスワードは 400 を返す", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/auth/login")
        .send({ email: OWNER_EMAIL, password: "wrong" });

      expect(res.status).toBe(400);
    });
  });

  // ─── Post 作成 ───────────────────────────────────────────────
  describe("POST /api/posts", () => {
    it("認証済みで投稿を作成できる (201)", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/posts")
        .set("Authorization", `Bearer ${ownerToken}`)
        .field("description", "E2E content")
        .field("lostDate", "2024-01-01");

      expect(res.status).toBe(201);
      expect(res.body.description).toBe("E2E content");
      createdPostId = res.body.id;
    });

    it("未認証は 401 を返す", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/posts")
        .field("description", "Unauth")
        .field("lostDate", "2024-01-01");

      expect(res.status).toBe(401);
    });
  });

  // ─── Post 一覧・詳細（ゲストアクセス可） ──────────────────────
  describe("GET /api/posts", () => {
    it("ゲストでも一覧を取得できる (200)", async () => {
      const res = await request(app.getHttpServer()).get("/api/posts");

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.items)).toBe(true);
      expect(typeof res.body.total).toBe("number");
    });

    it("page / perPage クエリが機能する", async () => {
      const res = await request(app.getHttpServer()).get(
        "/api/posts?page=1&perPage=2"
      );

      expect(res.status).toBe(200);
      expect(res.body.items.length).toBeLessThanOrEqual(2);
    });
  });

  describe("GET /api/posts/:id", () => {
    it("ゲストでも詳細を取得できる (200)", async () => {
      const res = await request(app.getHttpServer()).get(
        `/api/posts/${createdPostId}`
      );

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(createdPostId);
    });
  });

  // ─── Post 更新（認証・認可） ──────────────────────────────────
  describe("PATCH /api/posts/:id", () => {
    it("未認証は 401 を返す", async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/posts/${createdPostId}`)
        .send({ title: "Hacked" });

      expect(res.status).toBe(401);
    });

    it("非オーナーは 403 を返す", async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/posts/${createdPostId}`)
        .set("Authorization", `Bearer ${otherToken}`)
        .send({ title: "Hacked" });

      expect(res.status).toBe(403);
    });

    it("オーナーは更新できる (200)", async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/posts/${createdPostId}`)
        .set("Authorization", `Bearer ${ownerToken}`)
        .send({ title: "Updated Title" });

      expect(res.status).toBe(200);
      expect(res.body.title).toBe("Updated Title");
    });
  });

  // ─── 画像追加（認証・認可） ───────────────────────────────────
  describe("POST /api/posts/:id/images", () => {
    it("未認証は 401 を返す", async () => {
      const res = await request(app.getHttpServer()).post(
        `/api/posts/${createdPostId}/images`
      );

      expect(res.status).toBe(401);
    });

    it("非オーナーは 403 を返す", async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/posts/${createdPostId}/images`)
        .set("Authorization", `Bearer ${otherToken}`);

      expect(res.status).toBe(403);
    });

    it("オーナーは画像をアップロードできる (201)", async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/posts/${createdPostId}/images`)
        .set("Authorization", `Bearer ${ownerToken}`)
        .attach("images", TINY_PNG, "test.png");

      expect(res.status).toBe(201);
      expect(res.body.images).toHaveLength(1);
      expect(res.body.remainingSlots).toBe(4);
      createdImageId = res.body.images[0].id;
    });
  });

  // ─── 画像削除（認証・認可） ───────────────────────────────────
  describe("DELETE /api/posts/:id/images/:imageId", () => {
    it("未認証は 401 を返す", async () => {
      const res = await request(app.getHttpServer()).delete(
        `/api/posts/${createdPostId}/images/${createdImageId}`
      );

      expect(res.status).toBe(401);
    });

    it("非オーナーは 403 を返す", async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/posts/${createdPostId}/images/${createdImageId}`)
        .set("Authorization", `Bearer ${otherToken}`);

      expect(res.status).toBe(403);
    });

    it("オーナーは画像を削除できる (200)", async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/posts/${createdPostId}/images/${createdImageId}`)
        .set("Authorization", `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
    });
  });

  // ─── Post 削除（認証・認可） ──────────────────────────────────
  describe("DELETE /api/posts/:id", () => {
    it("未認証は 401 を返す", async () => {
      const res = await request(app.getHttpServer()).delete(
        `/api/posts/${createdPostId}`
      );

      expect(res.status).toBe(401);
    });

    it("非オーナーは 403 を返す", async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/posts/${createdPostId}`)
        .set("Authorization", `Bearer ${otherToken}`);

      expect(res.status).toBe(403);
    });

    it("オーナーは削除できる (200)", async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/posts/${createdPostId}`)
        .set("Authorization", `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
    });

    it("存在しない投稿は 404 を返す", async () => {
      const res = await request(app.getHttpServer())
        .delete("/api/posts/no-such-id")
        .set("Authorization", `Bearer ${ownerToken}`);

      expect(res.status).toBe(404);
    });
  });

  // ─── トークン更新・ログアウト ─────────────────────────────────
  describe("POST /api/auth/refresh", () => {
    it("有効な refreshToken で新しい accessToken を返す (200)", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/auth/refresh")
        .set("Cookie", refreshCookie);

      expect(res.status).toBe(200);
      expect(res.body.accessToken).toBeDefined();
    });

    it("Cookie なしは 401 を返す", async () => {
      const res = await request(app.getHttpServer()).post("/api/auth/refresh");

      expect(res.status).toBe(401);
    });
  });

  describe("POST /api/auth/logout", () => {
    it("ログアウトで Cookie が削除される (200)", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/auth/logout")
        .set("Cookie", refreshCookie);

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
    });
  });
});
