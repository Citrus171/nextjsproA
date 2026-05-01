import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import * as request from "supertest";
import * as cookieParser from "cookie-parser";
import { getOptionsToken } from "@nestjs/throttler";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma.service";

const createdUserIds: string[] = [];

describe("レート制限 E2E", () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(getOptionsToken())
      .useValue({
        throttlers: [
          { name: "default", ttl: 60_000, limit: 60 },
          { name: "login", ttl: 60_000, limit: 2 },
          { name: "register", ttl: 60_000, limit: 2 },
          { name: "public", ttl: 60_000, limit: 120 },
        ],
      })
      .compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    app.setGlobalPrefix("api");
    app.use(cookieParser());
    await app.init();

    prisma = module.get(PrismaService);
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    await prisma.$disconnect();
    await app.close();
  });

  describe("POST /api/auth/login のレート制限", () => {
    it("制限内（2回）は 401 が返ること（認証失敗だがレート制限ではない）", async () => {
      for (let i = 0; i < 2; i++) {
        const res = await request(app.getHttpServer())
          .post("/api/auth/login")
          .send({ email: "nouser@example.com", password: "wrongpass" });
        expect(res.status).toBe(401);
      }
    });

    it("制限超過（3回目）は 429 と日本語エラーメッセージが返ること", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/auth/login")
        .send({ email: "nouser@example.com", password: "wrongpass" });
      expect(res.status).toBe(429);
      expect(res.body.message).toBe(
        "リクエスト数が制限を超えました。しばらく待ってから再試行してください。"
      );
    });
  });

  describe("POST /api/users/register のレート制限", () => {
    const ts = Date.now();
    const makeEmail = (n: number) => `throttle-${ts}-${n}@example.com`;

    it("制限内（2回）は登録成功または重複エラーが返ること（429 ではない）", async () => {
      for (let i = 0; i < 2; i++) {
        const res = await request(app.getHttpServer())
          .post("/api/users/register")
          .send({
            email: makeEmail(i),
            password: "password123",
            nickname: `throttle-user-${i}`,
          });
        expect(res.status).not.toBe(429);
        if (res.status === 201 && res.body.id) {
          createdUserIds.push(res.body.id);
        }
      }
    });

    it("制限超過（3回目）は 429 と日本語エラーメッセージが返ること", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/users/register")
        .send({
          email: makeEmail(99),
          password: "password123",
          nickname: "throttle-user-99",
        });
      expect(res.status).toBe(429);
      expect(res.body.message).toBe(
        "リクエスト数が制限を超えました。しばらく待ってから再試行してください。"
      );
    });
  });
});
