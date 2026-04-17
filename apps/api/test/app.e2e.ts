import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import * as request from "supertest";
import * as cookieParser from "cookie-parser";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma.service";

// テスト用ユーザー（各テスト実行後に削除）
const TEST_EMAIL = `e2e-${Date.now()}@test.example`;
const TEST_PASSWORD = "testpass123";

describe("API E2E", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;
  let createdPostId: string;
  let refreshCookie: string;

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
    // テストデータをクリーンアップ
    const user = await prisma.user.findUnique({ where: { email: TEST_EMAIL } });
    if (user) {
      await prisma.post.deleteMany({ where: { authorId: user.id } });
      await prisma.refreshToken.deleteMany({ where: { userId: user.id } });
      await prisma.user.delete({ where: { id: user.id } });
    }
    await prisma.$disconnect();
    await app.close();
  });

  // ─── ユーザー登録 ────────────────────────────────────────────
  describe("POST /api/users/register", () => {
    it("新規ユーザーを登録できる (201)", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/users/register")
        .send({ email: TEST_EMAIL, password: TEST_PASSWORD, name: "E2E User" });

      expect(res.status).toBe(201);
      expect(res.body.email).toBe(TEST_EMAIL);
      expect(res.body.password).toBeUndefined(); // パスワードは返さない
    });

    it("重複メールは 400 を返す", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/users/register")
        .send({ email: TEST_EMAIL, password: TEST_PASSWORD });

      expect(res.status).toBe(400);
    });

    it("短すぎるパスワードは 400 を返す", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/users/register")
        .send({ email: "other@test.example", password: "short" });

      expect(res.status).toBe(400);
    });
  });

  // ─── ログイン ────────────────────────────────────────────────
  describe("POST /api/auth/login", () => {
    it("正しい認証情報で accessToken を返す (200)", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/auth/login")
        .send({ email: TEST_EMAIL, password: TEST_PASSWORD });

      expect(res.status).toBe(200);
      expect(res.body.accessToken).toBeDefined();
      accessToken = res.body.accessToken;

      // refreshToken が httpOnly Cookie にセットされる
      const cookies = res.headers["set-cookie"];
      refreshCookie = Array.isArray(cookies) ? cookies.find(c => c.startsWith("refreshToken=")) || "" : "";
      expect(refreshCookie).toContain("refreshToken=");
    });

    it("誤パスワードは 400 を返す", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/auth/login")
        .send({ email: TEST_EMAIL, password: "wrong" });

      expect(res.status).toBe(400);
    });
  });

  // ─── 投稿 CRUD ───────────────────────────────────────────────
  describe("POST /api/posts", () => {
    it("認証済みで投稿を作成できる (201)", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/posts")
        .set("Authorization", `Bearer ${accessToken}`)
        .field("title", "E2E Post")
        .field("content", "E2E content");

      expect(res.status).toBe(201);
      expect(res.body.title).toBe("E2E Post");
      createdPostId = res.body.id;
    });

    it("未認証は 401 を返す", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/posts")
        .field("title", "Unauth")
        .field("content", "Unauth");

      expect(res.status).toBe(401);
    });
  });

  describe("GET /api/posts", () => {
    it("投稿一覧を返す (200)", async () => {
      const res = await request(app.getHttpServer()).get("/api/posts");

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.items)).toBe(true);
      expect(typeof res.body.total).toBe("number");
    });

    it("page / perPage クエリが機能する", async () => {
      const res = await request(app.getHttpServer()).get("/api/posts?page=1&perPage=2");

      expect(res.status).toBe(200);
      expect(res.body.items.length).toBeLessThanOrEqual(2);
    });
  });

  describe("PUT /api/posts/:id", () => {
    it("オーナーが投稿を更新できる (200)", async () => {
      const res = await request(app.getHttpServer())
        .put(`/api/posts/${createdPostId}`)
        .set("Authorization", `Bearer ${accessToken}`)
        .field("title", "Updated Title");

      expect(res.status).toBe(200);
      expect(res.body.title).toBe("Updated Title");
    });

    it("未認証は 401 を返す", async () => {
      const res = await request(app.getHttpServer())
        .put(`/api/posts/${createdPostId}`)
        .field("title", "Hacked");

      expect(res.status).toBe(401);
    });
  });

  describe("DELETE /api/posts/:id", () => {
    it("オーナーが投稿を削除できる (200)", async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/posts/${createdPostId}`)
        .set("Authorization", `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
    });

    it("存在しない投稿は 404 を返す", async () => {
      const res = await request(app.getHttpServer())
        .delete("/api/posts/no-such-id")
        .set("Authorization", `Bearer ${accessToken}`);

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
