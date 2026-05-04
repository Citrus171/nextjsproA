import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import * as request from "supertest";
import * as cookieParser from "cookie-parser";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma.service";

describe("GET /api/health (E2E)", () => {
  let app: INestApplication;
  let prisma: PrismaService;

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
    await prisma.$disconnect();
    await app.close();
  });

  describe("正常系", () => {
    it("DBとディスクとuploadsが正常なとき、200とstatus:okを返すこと", async () => {
      const res = await request(app.getHttpServer()).get("/api/health");

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("ok");
      expect(res.body.info.database.status).toBe("up");
      expect(res.body.info.disk.status).toBe("up");
      expect(res.body.info.uploads.status).toBe("up");
    });

    it("認証なしでアクセスできること", async () => {
      const res = await request(app.getHttpServer()).get("/api/health");
      expect(res.status).not.toBe(401);
    });
  });

  describe("異常系", () => {
    it("DB切断時に503を返すこと", async () => {
      // DB接続を意図的に切断してエラーを発生させる
      jest
        .spyOn(prisma, "$queryRaw")
        .mockRejectedValueOnce(new Error("DB接続失敗"));

      const res = await request(app.getHttpServer()).get("/api/health");

      expect(res.status).toBe(503);
      expect(res.body.status).toBe("error");
      expect(res.body.error.database.status).toBe("down");

      jest.restoreAllMocks();
    });
  });
});
