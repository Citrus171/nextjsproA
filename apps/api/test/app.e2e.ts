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
  let otherId: string;

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
    // ownerId / otherId は各テストで登録時に格納したIDを直接使用する
    // (User モデルに email フィールドは存在しないため、emailHash での検索は行わない)
    const userIds = [ownerId, otherId].filter(Boolean);
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
      otherId = res.body.id;
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

  // ─── Conversations E2E ───────────────────────────────────────
  //
  // 前提:
  //   owner (ownerToken)  … 投稿者 (Post の作成者 = Conversation の ownerId)
  //   other (otherToken)  … 目撃者 (Sighting の作成者 = Conversation の sighterId)
  //   outsider            … どちらの会話にも属さない第三者 (403 検証用)
  //
  // テスト順序:
  //   1. POST /api/conversations          会話を作成する
  //   2. GET  /api/conversations          自分が参加する会話一覧を取得する
  //   3. POST /api/conversations/:id/messages  メッセージを送信する
  //   4. GET  /api/conversations/:id/messages  メッセージ一覧を取得する
  //   5. PATCH /api/conversations/:id/messages/read  未読を既読にする
  // ──────────────────────────────────────────────────────────────
  describe("Conversations E2E", () => {
    // このブロック専用の変数
    let convPostId: string;
    let convSightingId: string;
    let convId: string;
    let outsiderToken: string;
    let outsiderId: string;

    // ── 事前準備 ─────────────────────────────────────────────────
    // owner が投稿を作成し、other がその投稿に目撃情報を登録する
    // outsider はどちらの会話にも属さないユーザーとして新規作成する
    beforeAll(async () => {
      // 投稿を作成 (owner)
      const postRes = await request(app.getHttpServer())
        .post("/api/posts")
        .set("Authorization", `Bearer ${ownerToken}`)
        .field("description", "会話テスト用の迷子投稿")
        .field("lostDate", "2024-01-01");
      expect(postRes.status).toBe(201);
      expect(postRes.body?.id).toBeDefined();
      convPostId = postRes.body.id;

      // 目撃情報を作成 (other)
      const sightingRes = await request(app.getHttpServer())
        .post("/api/sightings")
        .set("Authorization", `Bearer ${otherToken}`)
        .send({
          postId: convPostId,
          lat: 35.86,
          lng: 139.64,
          sightedAt: "2024-01-10",
          comment: "公園で目撃しました",
        });
      expect(sightingRes.status).toBe(201);
      expect(sightingRes.body?.id).toBeDefined();
      convSightingId = sightingRes.body.id;

      // 第三者ユーザーを登録してトークン取得
      const outsiderEmail = `e2e-outsider-${Date.now()}@test.example`;
      const regRes = await request(app.getHttpServer())
        .post("/api/users/register")
        .send({
          email: outsiderEmail,
          password: PASSWORD,
          nickname: "Outsider",
        });
      expect(regRes.status).toBe(201);
      expect(regRes.body?.id).toBeDefined();
      outsiderId = regRes.body.id;

      const loginRes = await request(app.getHttpServer())
        .post("/api/auth/login")
        .send({ email: outsiderEmail, password: PASSWORD });
      expect(loginRes.status).toBe(200);
      expect(loginRes.body?.accessToken).toBeDefined();
      outsiderToken = loginRes.body.accessToken;
    });

    // 第三者ユーザーはこのブロック専用なので afterAll で削除する
    afterAll(async () => {
      if (outsiderId) {
        await prisma.refreshToken.deleteMany({ where: { userId: outsiderId } });
        await prisma.user.deleteMany({ where: { id: outsiderId } });
      }
    });

    // ── 1. POST /api/conversations ────────────────────────────────
    describe("POST /api/conversations", () => {
      it("未認証は 401 を返す", async () => {
        const res = await request(app.getHttpServer())
          .post("/api/conversations")
          .send({ postId: convPostId, sightingId: convSightingId });

        expect(res.status).toBe(401);
      });

      it("投稿者(owner)が会話を作成できる (201)", async () => {
        const res = await request(app.getHttpServer())
          .post("/api/conversations")
          .set("Authorization", `Bearer ${ownerToken}`)
          .send({ postId: convPostId, sightingId: convSightingId });

        expect(res.status).toBe(201);
        expect(res.body.postId).toBe(convPostId);
        expect(res.body.sightingId).toBe(convSightingId);
        // ownerId は Post の作成者、sighterId は Sighting の作成者に自動設定される
        expect(res.body.ownerId).toBeDefined();
        expect(res.body.sighterId).toBeDefined();
        convId = res.body.id;
      });

      it("同一 postId + sightingId での重複作成は 409 を返す", async () => {
        const res = await request(app.getHttpServer())
          .post("/api/conversations")
          .set("Authorization", `Bearer ${ownerToken}`)
          .send({ postId: convPostId, sightingId: convSightingId });

        expect(res.status).toBe(409);
      });

      it("投稿・目撃情報のどちらにも無関係な第三者は 403 を返す", async () => {
        // outsider は Post にも Sighting にも紐付いていないので作成不可
        const res = await request(app.getHttpServer())
          .post("/api/conversations")
          .set("Authorization", `Bearer ${outsiderToken}`)
          .send({ postId: convPostId, sightingId: convSightingId });

        expect(res.status).toBe(403);
      });
    });

    // ── 2. GET /api/conversations ─────────────────────────────────
    describe("GET /api/conversations", () => {
      it("未認証は 401 を返す", async () => {
        const res = await request(app.getHttpServer()).get(
          "/api/conversations"
        );

        expect(res.status).toBe(401);
      });

      it("owner が自分の会話一覧を取得できる (200)", async () => {
        const res = await request(app.getHttpServer())
          .get("/api/conversations")
          .set("Authorization", `Bearer ${ownerToken}`);

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        // 作成した会話が含まれる
        const found = res.body.find((c: { id: string }) => c.id === convId);
        expect(found).toBeDefined();
      });

      it("other も同じ会話一覧を取得できる (200)", async () => {
        const res = await request(app.getHttpServer())
          .get("/api/conversations")
          .set("Authorization", `Bearer ${otherToken}`);

        expect(res.status).toBe(200);
        const found = res.body.find((c: { id: string }) => c.id === convId);
        expect(found).toBeDefined();
      });

      it("outsider の一覧には当該会話が含まれない", async () => {
        const res = await request(app.getHttpServer())
          .get("/api/conversations")
          .set("Authorization", `Bearer ${outsiderToken}`);

        expect(res.status).toBe(200);
        const found = res.body.find((c: { id: string }) => c.id === convId);
        expect(found).toBeUndefined();
      });
    });

    // ── 3. POST /api/conversations/:id/messages ───────────────────
    describe("POST /api/conversations/:id/messages", () => {
      it("未認証は 401 を返す", async () => {
        const res = await request(app.getHttpServer())
          .post(`/api/conversations/${convId}/messages`)
          .send({ body: "テストメッセージ" });

        expect(res.status).toBe(401);
      });

      it("会話に属さない outsider は 403 を返す", async () => {
        const res = await request(app.getHttpServer())
          .post(`/api/conversations/${convId}/messages`)
          .set("Authorization", `Bearer ${outsiderToken}`)
          .send({ body: "第三者からのメッセージ" });

        expect(res.status).toBe(403);
      });

      it("owner がメッセージを送信できる (201)", async () => {
        const res = await request(app.getHttpServer())
          .post(`/api/conversations/${convId}/messages`)
          .set("Authorization", `Bearer ${ownerToken}`)
          .send({ body: "こんにちは！情報ありがとうございます。" });

        expect(res.status).toBe(201);
        expect(res.body.conversationId).toBe(convId);
        expect(res.body.body).toBe("こんにちは！情報ありがとうございます。");
        // 送信直後は未読 (readAt が null)
        expect(res.body.readAt).toBeNull();
      });

      it("other がメッセージを送信できる (201)", async () => {
        const res = await request(app.getHttpServer())
          .post(`/api/conversations/${convId}/messages`)
          .set("Authorization", `Bearer ${otherToken}`)
          .send({ body: "公園の東口付近で見かけました。" });

        expect(res.status).toBe(201);
        expect(res.body.conversationId).toBe(convId);
        expect(res.body.readAt).toBeNull();
      });

      it("1000 文字超のメッセージは 400 を返す", async () => {
        const res = await request(app.getHttpServer())
          .post(`/api/conversations/${convId}/messages`)
          .set("Authorization", `Bearer ${ownerToken}`)
          .send({ body: "あ".repeat(1001) });

        expect(res.status).toBe(400);
      });
    });

    // ── 4. GET /api/conversations/:id/messages ────────────────────
    describe("GET /api/conversations/:id/messages", () => {
      it("未認証は 401 を返す", async () => {
        const res = await request(app.getHttpServer()).get(
          `/api/conversations/${convId}/messages`
        );

        expect(res.status).toBe(401);
      });

      it("会話に属さない outsider は 403 を返す", async () => {
        const res = await request(app.getHttpServer())
          .get(`/api/conversations/${convId}/messages`)
          .set("Authorization", `Bearer ${outsiderToken}`);

        expect(res.status).toBe(403);
      });

      it("owner がメッセージ一覧を取得できる (200)", async () => {
        const res = await request(app.getHttpServer())
          .get(`/api/conversations/${convId}/messages`)
          .set("Authorization", `Bearer ${ownerToken}`);

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        // owner と other が各1件送信済みなので2件以上存在する
        expect(res.body.length).toBeGreaterThanOrEqual(2);
      });
    });

    // ── 5. PATCH /api/conversations/:id/messages/read ─────────────
    describe("PATCH /api/conversations/:id/messages/read", () => {
      it("未認証は 401 を返す", async () => {
        const res = await request(app.getHttpServer()).patch(
          `/api/conversations/${convId}/messages/read`
        );

        expect(res.status).toBe(401);
      });

      it("owner が既読にすると更新件数を返す (200)", async () => {
        // owner が既読にする → other が送ったメッセージが既読化される
        const res = await request(app.getHttpServer())
          .patch(`/api/conversations/${convId}/messages/read`)
          .set("Authorization", `Bearer ${ownerToken}`);

        expect(res.status).toBe(200);
        // other が送った1件が既読対象 (own メッセージは除外される)
        expect(res.body.count).toBeGreaterThanOrEqual(1);
      });

      it("既読後はメッセージの readAt に日時が入る", async () => {
        const res = await request(app.getHttpServer())
          .get(`/api/conversations/${convId}/messages`)
          .set("Authorization", `Bearer ${ownerToken}`);

        expect(res.status).toBe(200);
        // other が送ったメッセージ（senderId !== ownerId）は readAt が設定されている
        const otherMessages = res.body.filter(
          (m: { readAt: string | null; senderId: string }) =>
            m.senderId !== ownerId && m.readAt !== null
        );
        expect(otherMessages.length).toBeGreaterThanOrEqual(1);
      });

      it("自分が送ったメッセージは既読対象外のまま (readAt が null)", async () => {
        const res = await request(app.getHttpServer())
          .get(`/api/conversations/${convId}/messages`)
          .set("Authorization", `Bearer ${ownerToken}`);

        expect(res.status).toBe(200);
        // owner 自身が送ったメッセージだけが readAt null のまま残る
        const ownUnreadMessages = res.body.filter(
          (m: { readAt: string | null; senderId: string }) =>
            m.senderId === ownerId && m.readAt === null
        );
        const othersUnreadMessages = res.body.filter(
          (m: { readAt: string | null; senderId: string }) =>
            m.senderId !== ownerId && m.readAt === null
        );

        expect(ownUnreadMessages.length).toBeGreaterThanOrEqual(1);
        expect(othersUnreadMessages.length).toBe(0);
      });

      it("再度 PATCH しても count: 0 を返す (既読済みは対象外)", async () => {
        const res = await request(app.getHttpServer())
          .patch(`/api/conversations/${convId}/messages/read`)
          .set("Authorization", `Bearer ${ownerToken}`);

        expect(res.status).toBe(200);
        expect(res.body.count).toBe(0);
      });
    });
  });
  // ─── Conversations E2E ここまで ──────────────────────────────────
});
