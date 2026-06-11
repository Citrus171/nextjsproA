import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PostsService } from "./post.service";
import { FileStorageService } from "./file-storage.service";
import { PrismaService } from "../prisma.service";

const mockFileStorage: jest.Mocked<FileStorageService> = {
  saveFile: jest.fn(),
  deleteFile: jest.fn(),
} as unknown as jest.Mocked<FileStorageService>;

const mockPrisma = {
  post: {
    create: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
  },
  petDetail: {
    create: jest.fn(),
    upsert: jest.fn(),
  },
  location: {
    create: jest.fn(),
    upsert: jest.fn(),
  },
  image: {
    create: jest.fn(),
    findUnique: jest.fn(),
    delete: jest.fn(),
  },
  postFavorite: {
    findUnique: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
  },
  $transaction: jest.fn(),
};

describe("PostsService", () => {
  let service: PostsService;

  beforeEach(() => {
    service = new PostsService(
      mockPrisma as unknown as PrismaService,
      mockFileStorage
    );
    jest.clearAllMocks();
    mockFileStorage.saveFile.mockResolvedValue("uploads/post1/uuid.jpg");
    mockFileStorage.deleteFile.mockReturnValue(undefined);
    mockPrisma.user.findUnique.mockResolvedValue({ plan: "free" });
    mockPrisma.post.count.mockResolvedValue(0);
    mockPrisma.$transaction.mockImplementation(
      async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => fn(mockPrisma)
    );
  });

  // ─── findAll ────────────────────────────────────────────────
  describe("findAll", () => {
    it("ページ1・perPage5 で skip=0 / take=5 を渡す", async () => {
      mockPrisma.post.findMany.mockResolvedValue([]);
      mockPrisma.post.count.mockResolvedValue(0);

      await service.findAll(1, 5);

      expect(mockPrisma.post.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: 5,
        where: {},
        orderBy: { createdAt: "desc" },
        include: {
          petDetail: true,
          location: true,
          images: true,
          user: { select: { nickname: true } },
        },
      });
    });

    it("ページ3・perPage5 で skip=10 を渡す", async () => {
      mockPrisma.post.findMany.mockResolvedValue([]);
      mockPrisma.post.count.mockResolvedValue(20);

      await service.findAll(3, 5);

      expect(mockPrisma.post.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 5 })
      );
    });

    it("items と total を返し、投稿者名を authorNickname に詰める", async () => {
      const posts: Record<string, unknown>[] = [
        {
          id: "1",
          title: "T",
          description: "C",
          userId: "u1",
          status: "lost",
          lostDate: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
          petDetail: null,
          location: null,
          images: [] as any[],
          user: { nickname: "Alice" },
        },
      ];
      mockPrisma.post.findMany.mockResolvedValue(posts);
      mockPrisma.post.count.mockResolvedValue(1);

      const result = await service.findAll(1, 10);

      expect(result).toEqual({
        items: [
          {
            id: "1",
            title: "T",
            description: "C",
            userId: "u1",
            status: "lost",
            lostDate: posts[0].lostDate,
            createdAt: posts[0].createdAt,
            updatedAt: posts[0].updatedAt,
            petDetail: null,
            location: null,
            images: [] as any[],
            authorNickname: "Alice",
          },
        ],
        total: 1,
      });
    });

    it("userId 指定時は where に userId を含めて検索する", async () => {
      mockPrisma.post.findMany.mockResolvedValue([]);
      mockPrisma.post.count.mockResolvedValue(0);

      await service.findAll(1, 10, "user1");

      expect(mockPrisma.post.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
        where: { userId: "user1" },
        orderBy: { createdAt: "desc" },
        include: {
          petDetail: true,
          location: true,
          images: true,
          user: { select: { nickname: true } },
        },
      });
      expect(mockPrisma.post.count).toHaveBeenCalledWith({
        where: { userId: "user1" },
      });
    });

    it("userId 指定時でもページネーションが正しく機能する", async () => {
      mockPrisma.post.findMany.mockResolvedValue([]);
      mockPrisma.post.count.mockResolvedValue(5);

      await service.findAll(2, 5, "user1");

      expect(mockPrisma.post.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 5,
          take: 5,
          where: { userId: "user1" },
        })
      );
      expect(mockPrisma.post.count).toHaveBeenCalledWith({
        where: { userId: "user1" },
      });
    });

    it("page=0 を渡しても skip=0 (先頭ページ) として処理される", async () => {
      mockPrisma.post.findMany.mockResolvedValue([]);
      mockPrisma.post.count.mockResolvedValue(0);

      await service.findAll(0, 10);

      expect(mockPrisma.post.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 10 })
      );
    });

    it("page=-1 を渡しても skip=0 (先頭ページ) として処理される", async () => {
      mockPrisma.post.findMany.mockResolvedValue([]);
      mockPrisma.post.count.mockResolvedValue(0);

      await service.findAll(-1, 10);

      expect(mockPrisma.post.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 10 })
      );
    });

    it("perPage=-5 かつ page=2 でも skip が負にならず take=1 にクランプされる", async () => {
      mockPrisma.post.findMany.mockResolvedValue([]);
      mockPrisma.post.count.mockResolvedValue(0);

      await service.findAll(2, -5);

      expect(mockPrisma.post.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 1, take: 1 })
      );
    });

    it("perPage=0 でも take=1 にクランプされる", async () => {
      mockPrisma.post.findMany.mockResolvedValue([]);
      mockPrisma.post.count.mockResolvedValue(0);

      await service.findAll(1, 0);

      expect(mockPrisma.post.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 1 })
      );
    });

    it("page/perPage が NaN でもデフォルト値 (skip=0, take=10) で処理される", async () => {
      mockPrisma.post.findMany.mockResolvedValue([]);
      mockPrisma.post.count.mockResolvedValue(0);

      await service.findAll(NaN, NaN);

      expect(mockPrisma.post.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 10 })
      );
    });

    it("page/perPage が小数でも整数に切り捨てて処理される", async () => {
      mockPrisma.post.findMany.mockResolvedValue([]);
      mockPrisma.post.count.mockResolvedValue(0);

      await service.findAll(2.7, 5.9);

      expect(mockPrisma.post.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 5, take: 5 })
      );
    });
  });

  // ─── findById ───────────────────────────────────────────────
  describe("findById", () => {
    it("petDetail と location と images を include して取得する", async () => {
      const post = {
        id: "post1",
        petDetail: { name: "Mimi" },
        location: { city: "さいたま市" },
        images: [] as any[],
        user: { nickname: "Alice" },
      };
      mockPrisma.post.findUnique.mockResolvedValue(post);

      const result = await service.findById("post1");

      expect(mockPrisma.post.findUnique).toHaveBeenCalledWith({
        where: { id: "post1" },
        include: {
          petDetail: true,
          location: true,
          images: true,
          user: { select: { nickname: true } },
        },
      });
      expect(result).toEqual({
        id: "post1",
        petDetail: { name: "Mimi" },
        location: { city: "さいたま市" },
        images: [] as any[],
        authorNickname: "Alice",
      });
    });

    it("存在しない投稿は NotFoundException", async () => {
      mockPrisma.post.findUnique.mockResolvedValue(null);

      try {
        await service.findById("no-such");
        fail("例外がスローされるべき");
      } catch (e: unknown) {
        expect(e).toBeInstanceOf(NotFoundException);
        const response = (e as NotFoundException).getResponse();
        expect(response).toMatchObject({
          code: "E_POST_NOT_FOUND",
          message: expect.any(String),
        });
      }
    });
  });

  // ─── create ─────────────────────────────────────────────────
  describe("create", () => {
    afterEach(() => {
      jest.useRealTimers();
    });

    it("ファイルなしで投稿を作成する", async () => {
      const created = {
        id: "post1",
        title: "T",
        description: "C",
        userId: "u1",
        status: "lost",
        lostDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const withIncludes: Record<string, unknown> = {
        ...created,
        petDetail: null,
        location: null,
        images: [] as any[],
      };
      mockPrisma.post.create.mockResolvedValue(created);
      mockPrisma.post.findUnique.mockResolvedValue(withIncludes);

      const result = await service.create("u1", {
        title: "T",
        description: "C",
        lostDate: "2024-01-01",
      });

      expect(mockPrisma.post.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          title: "T",
          description: "C",
          userId: "u1",
        }),
      });
      expect(result).toEqual(withIncludes);
    });

    it("postType 未指定の時、cat で保存して返す", async () => {
      const created = {
        id: "post1",
        title: "T",
        description: "C",
        userId: "u1",
        status: "lost",
        postType: "cat",
        lostDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const withIncludes: Record<string, unknown> = {
        ...created,
        petDetail: null,
        location: null,
        images: [] as any[],
      };
      mockPrisma.post.create.mockResolvedValue(created);
      mockPrisma.post.findUnique.mockResolvedValue(withIncludes);

      const result = await service.create("u1", {
        title: "T",
        description: "C",
        lostDate: "2024-01-01",
      });

      expect(mockPrisma.post.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          title: "T",
          description: "C",
          userId: "u1",
          postType: "cat",
        }),
      });
      expect(result).toEqual(withIncludes);
    });

    it("ファイルありで投稿を作成する時、fileStorageService.saveFileが呼ばれること", async () => {
      const created = {
        id: "post1",
        title: "T",
        description: "C",
        userId: "u1",
        status: "lost",
        lostDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrisma.post.create.mockResolvedValue(created);
      mockPrisma.post.findUnique.mockResolvedValue({
        ...created,
        petDetail: null,
        location: null,
        images: [] as any[],
      });
      mockPrisma.image.create.mockResolvedValue({});
      const files = [
        { originalname: "photo.png", buffer: Buffer.from("") } as any,
      ];

      await service.create(
        "u1",
        { title: "T", description: "C", lostDate: "2024-01-01" },
        files
      );

      expect(mockFileStorage.saveFile).toHaveBeenCalledWith("post1", files[0]);
      expect(mockPrisma.image.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ postId: "post1" }),
      });
    });

    it("元のファイルの拡張子に関わらず保存拡張子が .jpg になること", async () => {
      mockPrisma.post.create.mockResolvedValue({ id: "post1" } as any);
      mockPrisma.post.findUnique.mockResolvedValue({
        id: "post1",
        petDetail: null,
        location: null,
        images: [] as any[],
      });
      mockPrisma.image.create.mockResolvedValue({});
      const files = [
        { originalname: "image.jpeg", buffer: Buffer.from("") } as any,
        { originalname: "image.gif", buffer: Buffer.from("") } as any,
      ];

      await service.create(
        "u1",
        { description: "C", lostDate: "2024-01-01" },
        files
      );

      expect(mockFileStorage.saveFile).toHaveBeenCalledTimes(2);
    });

    it("無料プランの画像が3枚を超えると ForbiddenException をスローする", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ plan: "free" });
      mockPrisma.post.create.mockResolvedValue({ id: "post1" } as any);
      mockPrisma.post.findUnique.mockResolvedValue({
        id: "post1",
        petDetail: null,
        location: null,
        images: [] as any[],
      });
      const files = Array.from(
        { length: 4 },
        () => ({ originalname: "p.png", buffer: Buffer.from("") }) as any
      );

      try {
        await service.create(
          "u1",
          { description: "C", lostDate: "2024-01-01" },
          files
        );
        fail("例外がスローされるべき");
      } catch (e: unknown) {
        expect(e).toBeInstanceOf(ForbiddenException);
        const response = (e as ForbiddenException).getResponse();
        expect(response).toMatchObject({
          code: "E_POST_IMAGE_LIMIT",
          message: expect.any(String),
        });
      }
    });

    it("premium ユーザーは画像を10枚まで添付できる", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ plan: "premium" });
      mockPrisma.post.create.mockResolvedValue({ id: "post1" } as any);
      mockPrisma.post.findUnique.mockResolvedValue({
        id: "post1",
        petDetail: null,
        location: null,
        images: [] as any[],
      });
      mockPrisma.image.create.mockResolvedValue({});
      const files = Array.from(
        { length: 10 },
        (_, index) =>
          ({ originalname: `p${index}.png`, buffer: Buffer.from("") }) as any
      );

      await service.create(
        "u1",
        { description: "C", lostDate: "2024-01-01" },
        files
      );

      expect(mockPrisma.image.create).toHaveBeenCalledTimes(10);
    });

    it("lostDate なしは BadRequestException をスローする", async () => {
      try {
        await service.create("u1", { description: "C" } as any);
        fail("例外がスローされるべき");
      } catch (e: unknown) {
        expect(e).toBeInstanceOf(BadRequestException);
        const response = (e as BadRequestException).getResponse();
        expect(response).toMatchObject({
          code: "E_POST_LOST_DATE_REQUIRED",
          message: expect.any(String),
        });
      }
    });

    it("無料プランの画像が4枚を超えると ForbiddenException をスローする", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ plan: "free" });
      const files = Array.from(
        { length: 4 },
        () => ({ originalname: "p.png", buffer: Buffer.from("") }) as any
      );

      try {
        await service.create(
          "u1",
          { description: "C", lostDate: "2024-01-01" },
          files
        );
        fail("例外がスローされるべき");
      } catch (e: unknown) {
        expect(e).toBeInstanceOf(ForbiddenException);
        const response = (e as ForbiddenException).getResponse();
        expect(response).toMatchObject({
          code: "E_POST_IMAGE_LIMIT",
          message: expect.any(String),
        });
      }
    });

    it("petDetail と location を含む時、トランザクションで一括作成する", async () => {
      const created = {
        id: "post1",
        title: "T",
        description: "C",
        userId: "u1",
        status: "lost",
        lostDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrisma.post.create.mockResolvedValue(created);
      mockPrisma.post.findUnique.mockResolvedValue({
        ...created,
        petDetail: {},
        location: {},
        images: [] as any[],
      });
      mockPrisma.petDetail.create.mockResolvedValue({});
      mockPrisma.location.create.mockResolvedValue({});

      const petDetail = {
        name: "Mimi",
        color: "white",
        age: "2歳",
        features: "人懐こい",
      };
      const location = {
        prefecture: "saitama",
        city: "さいたま市",
        address: "南区",
        lat: 35.0,
        lng: 139.0,
      };

      await service.create("u1", {
        title: "T",
        description: "C",
        lostDate: "2024-01-01",
        petDetail,
        location,
      });

      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(mockPrisma.petDetail.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ postId: "post1", name: "Mimi" }),
      });
      expect(mockPrisma.location.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          postId: "post1",
          prefecture: "saitama",
        }),
      });
    });

    it("lostDate を指定して作成できる", async () => {
      mockPrisma.post.create.mockResolvedValue({ id: "post1" } as any);
      mockPrisma.post.findUnique.mockResolvedValue({
        id: "post1",
        petDetail: null,
        location: null,
        images: [] as any[],
      });

      await service.create("u1", { description: "C", lostDate: "2024-06-15" });

      expect(mockPrisma.post.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ lostDate: new Date("2024-06-15") }),
      });
    });

    it("トランザクション失敗時に保存済みファイルを削除する", async () => {
      mockPrisma.post.create.mockResolvedValue({ id: "post1" } as any);
      // 1枚目は保存成功、2枚目でエラー
      mockFileStorage.saveFile
        .mockResolvedValueOnce("uploads/post1/uuid1.jpg")
        .mockRejectedValueOnce(new Error("disk full"));
      mockPrisma.image.create.mockResolvedValue({});

      const files = [
        { originalname: "a.png", buffer: Buffer.from("raw") } as any,
        { originalname: "b.png", buffer: Buffer.from("raw") } as any,
      ];

      await expect(
        service.create(
          "u1",
          { title: "T", description: "C", lostDate: "2024-01-01" },
          files
        )
      ).rejects.toThrow("disk full");
      // 1枚目の保存済みファイルがクリーンアップされること
      expect(mockFileStorage.deleteFile).toHaveBeenCalledTimes(1);
    });

    it("無料プランの月間投稿数が3件に達している時は ForbiddenException をスローする", async () => {
      const now = new Date("2026-04-21T12:00:00.000Z");
      jest.useFakeTimers();
      jest.setSystemTime(now);
      mockPrisma.user.findUnique.mockResolvedValue({ plan: "free" });
      mockPrisma.post.count.mockResolvedValue(3);
      const monthStart = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)
      );
      const nextMonthStart = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)
      );

      try {
        await service.create("u1", {
          description: "C",
          lostDate: "2026-04-21",
        });
        fail("例外がスローされるべき");
      } catch (e: unknown) {
        expect(e).toBeInstanceOf(ForbiddenException);
        const response = (e as ForbiddenException).getResponse();
        expect(response).toMatchObject({
          code: "E_POST_PLAN_LIMIT",
          message: expect.any(String),
        });
      }

      expect(mockPrisma.post.count).toHaveBeenCalledWith({
        where: {
          userId: "u1",
          createdAt: {
            gte: monthStart,
            lt: nextMonthStart,
          },
        },
      });
    });

    it("翌月になると無料プランの投稿数はリセットされる", async () => {
      const now = new Date("2026-05-01T01:00:00.000Z");
      jest.useFakeTimers();
      jest.setSystemTime(now);
      mockPrisma.user.findUnique.mockResolvedValue({ plan: "free" });
      mockPrisma.post.count.mockResolvedValue(2);
      mockPrisma.post.create.mockResolvedValue({ id: "post1" } as any);
      mockPrisma.post.findUnique.mockResolvedValue({
        id: "post1",
        petDetail: null,
        location: null,
        images: [] as any[],
      });
      const monthStart = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)
      );
      const nextMonthStart = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)
      );

      await service.create("u1", {
        description: "C",
        lostDate: "2026-05-01",
      });

      expect(mockPrisma.post.count).toHaveBeenCalledWith({
        where: {
          userId: "u1",
          createdAt: {
            gte: monthStart,
            lt: nextMonthStart,
          },
        },
      });
    });

    it("トランザクション競合時は再試行して投稿を作成する", async () => {
      const conflictError = Object.assign(new Error("Transaction conflict"), {
        code: "P2034",
      });
      mockPrisma.user.findUnique.mockResolvedValue({ plan: "free" });
      mockPrisma.post.count.mockResolvedValue(2);
      const created = {
        id: "post1",
        title: "T",
        description: "C",
        userId: "u1",
        status: "lost",
        lostDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrisma.post.create.mockResolvedValue(created);
      mockPrisma.post.findUnique.mockResolvedValue({
        ...created,
        petDetail: null,
        location: null,
        images: [] as any[],
      });
      mockPrisma.$transaction
        .mockRejectedValueOnce(conflictError)
        .mockImplementationOnce(
          async (fn: (tx: typeof mockPrisma) => Promise<unknown>) =>
            fn(mockPrisma)
        );

      const result = await service.create("u1", {
        title: "T",
        description: "C",
        lostDate: "2026-04-21",
      });

      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(3);
      expect(mockPrisma.$transaction).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        })
      );
      expect(result).toEqual({
        ...created,
        petDetail: null,
        location: null,
        images: [] as any[],
      });
    });

    it("premium ユーザーは月間投稿数の制限を受けない", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ plan: "premium" });
      const created = {
        id: "post1",
        title: "T",
        description: "C",
        userId: "u1",
        status: "lost",
        lostDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrisma.post.create.mockResolvedValue(created);
      mockPrisma.post.findUnique.mockResolvedValue({
        ...created,
        petDetail: null,
        location: null,
        images: [] as any[],
      });

      await service.create("u1", {
        title: "T",
        description: "C",
        lostDate: "2026-04-21",
      });

      expect(mockPrisma.post.count).not.toHaveBeenCalled();
      expect(mockPrisma.post.create).toHaveBeenCalled();
    });
  });

  // ─── addImages ──────────────────────────────────────────────
  describe("addImages", () => {
    const existingPost = {
      id: "post1",
      userId: "user1",
      status: "lost",
      images: [] as any[],
    };

    it("画像を追加できる", async () => {
      mockPrisma.post.findUnique.mockResolvedValue(existingPost);
      mockPrisma.user.findUnique.mockResolvedValue({ plan: "free" });
      const newImage = {
        id: "img1",
        postId: "post1",
        url: "uploads/post1/abc.png",
        createdAt: new Date(),
      };
      mockPrisma.image.create.mockResolvedValue(newImage);
      const files = [
        { originalname: "photo.png", buffer: Buffer.from("") } as any,
      ];

      const result = await service.addImages("post1", "user1", files);

      expect(mockFileStorage.saveFile).toHaveBeenCalled();
      expect(mockPrisma.image.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ postId: "post1" }),
      });
      expect(result.remainingSlots).toBe(2);
      expect(result.images).toHaveLength(1);
    });

    it("無料プランで追加後の合計が3枚を超えると ForbiddenException", async () => {
      mockPrisma.post.findUnique.mockResolvedValue({
        ...existingPost,
        images: [
          { id: "img1", url: "u1" },
          { id: "img2", url: "u2" },
          { id: "img3", url: "u3" },
        ],
      });
      mockPrisma.user.findUnique.mockResolvedValue({ plan: "free" });
      const files = [{ originalname: "a.png", buffer: Buffer.from("") } as any];

      try {
        await service.addImages("post1", "user1", files);
        fail("例外がスローされるべき");
      } catch (e: unknown) {
        expect(e).toBeInstanceOf(ForbiddenException);
        const response = (e as ForbiddenException).getResponse();
        expect(response).toMatchObject({
          code: "E_POST_IMAGE_LIMIT",
          message: expect.any(String),
        });
      }
    });

    it("premium ユーザーは10枚まで追加できる", async () => {
      mockPrisma.post.findUnique.mockResolvedValue({
        ...existingPost,
        images: Array.from({ length: 9 }, (_, index) => ({
          id: `img${index + 1}`,
          url: `u${index + 1}`,
        })),
      });
      mockPrisma.user.findUnique.mockResolvedValue({ plan: "premium" });
      const newImage = {
        id: "img10",
        postId: "post1",
        url: "uploads/post1/xyz.png",
        createdAt: new Date(),
      };
      mockPrisma.image.create.mockResolvedValue(newImage);
      const files = [{ originalname: "a.png", buffer: Buffer.from("") } as any];

      const result = await service.addImages("post1", "user1", files);

      expect(result.remainingSlots).toBe(0);
      expect(result.images).toHaveLength(1);
    });

    it("resolved 状態の投稿には画像を追加できない（BadRequestException）", async () => {
      mockPrisma.post.findUnique.mockResolvedValue({
        ...existingPost,
        status: "resolved",
      });
      const files = [{ originalname: "a.png", buffer: Buffer.from("") } as any];

      try {
        await service.addImages("post1", "user1", files);
        fail("例外がスローされるべき");
      } catch (e: unknown) {
        expect(e).toBeInstanceOf(BadRequestException);
        const response = (e as BadRequestException).getResponse();
        expect(response).toMatchObject({
          code: "E_POST_RESOLVED_IMAGE",
          message: expect.any(String),
        });
      }
    });

    it("オーナー以外は ForbiddenException", async () => {
      mockPrisma.post.findUnique.mockResolvedValue(existingPost);

      try {
        await service.addImages("post1", "other-user", []);
        fail("例外がスローされるべき");
      } catch (e: unknown) {
        expect(e).toBeInstanceOf(ForbiddenException);
        const response = (e as ForbiddenException).getResponse();
        expect(response).toMatchObject({
          code: "E_POST_NOT_OWNER",
          message: expect.any(String),
        });
      }
    });

    it("存在しない投稿は NotFoundException", async () => {
      mockPrisma.post.findUnique.mockResolvedValue(null);

      try {
        await service.addImages("no-such", "user1", []);
        fail("例外がスローされるべき");
      } catch (e: unknown) {
        expect(e).toBeInstanceOf(NotFoundException);
        const response = (e as NotFoundException).getResponse();
        expect(response).toMatchObject({
          code: "E_POST_NOT_FOUND",
          message: expect.any(String),
        });
      }
    });

    it("追加後の合計が上限を超える場合は ForbiddenException", async () => {
      mockPrisma.post.findUnique.mockResolvedValue({
        ...existingPost,
        images: [1, 2, 3],
      });
      mockPrisma.user.findUnique.mockResolvedValue({ plan: "free" });
      const files = [
        { originalname: "a.png", buffer: Buffer.from("") } as any,
        { originalname: "b.png", buffer: Buffer.from("") } as any,
        { originalname: "c.png", buffer: Buffer.from("") } as any,
      ];

      try {
        await service.addImages("post1", "user1", files);
        fail("例外がスローされるべき");
      } catch (e: unknown) {
        expect(e).toBeInstanceOf(ForbiddenException);
        const response = (e as ForbiddenException).getResponse();
        expect(response).toMatchObject({
          code: "E_POST_IMAGE_LIMIT",
          message: expect.any(String),
        });
      }
    });

    it("DB作成失敗時に保存済みファイルを削除する", async () => {
      mockPrisma.post.findUnique.mockResolvedValue(existingPost);
      mockPrisma.image.create.mockRejectedValue(new Error("DB error"));

      const files = [{ originalname: "a.png", buffer: Buffer.from("") } as any];

      await expect(service.addImages("post1", "user1", files)).rejects.toThrow(
        "DB error"
      );
      expect(mockFileStorage.deleteFile).toHaveBeenCalledTimes(1);
    });
  });

  // ─── removeImage ────────────────────────────────────────────
  describe("removeImage", () => {
    const existingPost = {
      id: "post1",
      userId: "user1",
    };
    const existingImage = {
      id: "img1",
      postId: "post1",
      url: "uploads/post1/abc.png",
      createdAt: new Date(),
    };

    it("オーナーが画像を削除できる", async () => {
      mockPrisma.post.findUnique.mockResolvedValue(existingPost);
      mockPrisma.image.findUnique.mockResolvedValue(existingImage);
      mockPrisma.image.delete.mockResolvedValue(existingImage);

      const result = await service.removeImage("post1", "img1", "user1");

      expect(mockFileStorage.deleteFile).toHaveBeenCalled();
      expect(mockPrisma.image.delete).toHaveBeenCalledWith({
        where: { id: "img1" },
      });
      expect(result).toEqual({
        ...existingImage,
        url: "/uploads/post1/abc.png",
      });
    });

    it("オーナー以外は ForbiddenException", async () => {
      mockPrisma.post.findUnique.mockResolvedValue(existingPost);

      try {
        await service.removeImage("post1", "img1", "other-user");
        fail("例外がスローされるべき");
      } catch (e: unknown) {
        expect(e).toBeInstanceOf(ForbiddenException);
        const response = (e as ForbiddenException).getResponse();
        expect(response).toMatchObject({
          code: "E_POST_NOT_OWNER",
          message: expect.any(String),
        });
      }
    });

    it("存在しない投稿は NotFoundException", async () => {
      mockPrisma.post.findUnique.mockResolvedValue(null);

      try {
        await service.removeImage("no-such", "img1", "user1");
        fail("例外がスローされるべき");
      } catch (e: unknown) {
        expect(e).toBeInstanceOf(NotFoundException);
        const response = (e as NotFoundException).getResponse();
        expect(response).toMatchObject({
          code: "E_POST_NOT_FOUND",
          message: expect.any(String),
        });
      }
    });

    it("別の投稿に属する画像は NotFoundException", async () => {
      mockPrisma.post.findUnique.mockResolvedValue(existingPost);
      mockPrisma.image.findUnique.mockResolvedValue({
        ...existingImage,
        postId: "other-post",
      });

      try {
        await service.removeImage("post1", "img1", "user1");
        fail("例外がスローされるべき");
      } catch (e: unknown) {
        expect(e).toBeInstanceOf(NotFoundException);
        const response = (e as NotFoundException).getResponse();
        expect(response).toMatchObject({
          code: "E_POST_IMAGE_NOT_FOUND",
          message: expect.any(String),
        });
      }
    });

    it("admin は他ユーザーの投稿画像を削除できる", async () => {
      mockPrisma.post.findUnique.mockResolvedValue(existingPost);
      mockPrisma.image.findUnique.mockResolvedValue(existingImage);
      mockPrisma.image.delete.mockResolvedValue(existingImage);

      const result = await service.removeImage(
        "post1",
        "img1",
        "other-user",
        true
      );

      expect(mockFileStorage.deleteFile).toHaveBeenCalled();
      expect(result).toEqual({
        ...existingImage,
        url: "/uploads/post1/abc.png",
      });
    });

    it("admin でないユーザーが他ユーザーの画像を削除しようとすると ForbiddenException", async () => {
      mockPrisma.post.findUnique.mockResolvedValue(existingPost);

      try {
        await service.removeImage("post1", "img1", "other-user", false);
        fail("例外がスローされるべき");
      } catch (e: unknown) {
        expect(e).toBeInstanceOf(ForbiddenException);
      }
    });
  });

  // ─── update ─────────────────────────────────────────────────
  describe("update", () => {
    const existingPost: Record<string, unknown> = {
      id: "post1",
      title: "Old",
      description: "Old description",
      userId: "user1",
      status: "lost",
      lostDate: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      petDetail: null,
      location: null,
    };

    it("オーナーが更新でき、petDetail/location/images を含むレスポンスを返す", async () => {
      const updatedWithIncludes: Record<string, unknown> = {
        ...existingPost,
        title: "New",
        petDetail: null,
        location: null,
        images: [] as any[],
      };
      mockPrisma.post.findUnique
        .mockResolvedValueOnce(existingPost) // オーナー確認
        .mockResolvedValueOnce(updatedWithIncludes); // トランザクション内の再取得
      mockPrisma.post.update.mockResolvedValue({});

      const result = await service.update("post1", "user1", { title: "New" });

      expect(mockPrisma.post.update).toHaveBeenCalledWith({
        where: { id: "post1" },
        data: { title: "New" },
      });
      expect(result?.title).toBe("New");
      expect(result).toHaveProperty("petDetail");
      expect(result).toHaveProperty("location");
      expect(result).toHaveProperty("images");
    });

    it("postType を更新できる", async () => {
      mockPrisma.post.findUnique
        .mockResolvedValueOnce(existingPost)
        .mockResolvedValueOnce({
          ...existingPost,
          postType: "cat",
          petDetail: null,
          location: null,
          images: [] as any[],
        });
      mockPrisma.post.update.mockResolvedValue({});

      await service.update("post1", "user1", { postType: "cat" });

      expect(mockPrisma.post.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ postType: "cat" }),
        })
      );
    });

    it("オーナー以外は ForbiddenException", async () => {
      mockPrisma.post.findUnique.mockResolvedValue(existingPost);

      try {
        await service.update("post1", "other-user", { title: "Hacked" });
        fail("例外がスローされるべき");
      } catch (e: unknown) {
        expect(e).toBeInstanceOf(ForbiddenException);
        const response = (e as ForbiddenException).getResponse();
        expect(response).toMatchObject({
          code: "E_POST_NOT_OWNER",
          message: expect.any(String),
        });
      }
    });

    it("存在しない投稿は HttpException (404)", async () => {
      mockPrisma.post.findUnique.mockResolvedValue(null);

      try {
        await service.update("no-such-post", "user1", { title: "X" });
        fail("例外がスローされるべき");
      } catch (e: unknown) {
        expect(e).toBeInstanceOf(HttpException);
        const response = (e as HttpException).getResponse();
        expect(response).toMatchObject({
          code: "E_POST_NOT_FOUND",
          message: expect.any(String),
        });
      }
    });

    it("lostDate を更新できる", async () => {
      mockPrisma.post.findUnique
        .mockResolvedValueOnce(existingPost)
        .mockResolvedValueOnce({
          ...existingPost,
          lostDate: new Date("2024-06-15"),
          petDetail: null,
          location: null,
          images: [] as any[],
        });
      mockPrisma.post.update.mockResolvedValue({});

      await service.update("post1", "user1", { lostDate: "2024-06-15" });

      expect(mockPrisma.post.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ lostDate: new Date("2024-06-15") }),
        })
      );
    });

    it("status を更新できる", async () => {
      mockPrisma.post.findUnique
        .mockResolvedValueOnce(existingPost)
        .mockResolvedValueOnce({
          ...existingPost,
          status: "resolved",
          petDetail: null,
          location: null,
          images: [] as any[],
        });
      mockPrisma.post.update.mockResolvedValue({});

      await service.update("post1", "user1", { status: "resolved" });

      expect(mockPrisma.post.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: "resolved",
            resolvedAt: expect.any(Date),
          }),
        })
      );
    });

    it("status を lost に戻すと resolvedAt が null になる", async () => {
      mockPrisma.post.findUnique
        .mockResolvedValueOnce({ ...existingPost, status: "resolved" })
        .mockResolvedValueOnce({
          ...existingPost,
          status: "lost",
          resolvedAt: null,
          petDetail: null,
          location: null,
          images: [] as any[],
        });
      mockPrisma.post.update.mockResolvedValue({});

      await service.update("post1", "user1", { status: "lost" });

      expect(mockPrisma.post.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: "lost", resolvedAt: null }),
        })
      );
    });

    it("petDetail を upsert できる", async () => {
      mockPrisma.post.findUnique
        .mockResolvedValueOnce(existingPost)
        .mockResolvedValueOnce({
          ...existingPost,
          petDetail: { name: "Mimi" },
          location: null,
          images: [] as any[],
        });
      mockPrisma.post.update.mockResolvedValue({});
      mockPrisma.petDetail.upsert.mockResolvedValue({});

      const petDetail = {
        name: "Mimi",
        color: "white",
        age: "2歳",
        features: "人懐こい",
      };
      await service.update("post1", "user1", { petDetail });

      expect(mockPrisma.petDetail.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { postId: "post1" },
          create: expect.objectContaining({ postId: "post1", name: "Mimi" }),
        })
      );
    });

    it("petDetail 未存在かつ必須フィールドなしは BadRequestException", async () => {
      mockPrisma.post.findUnique.mockResolvedValue(existingPost);

      try {
        await service.update("post1", "user1", { petDetail: { name: "Mimi" } });
        fail("例外がスローされるべき");
      } catch (e: unknown) {
        expect(e).toBeInstanceOf(BadRequestException);
        const response = (e as BadRequestException).getResponse();
        expect(response).toMatchObject({
          code: "E_POST_PET_DETAIL_REQUIRED",
          message: expect.any(String),
        });
      }
    });

    it("location 未存在かつ必須フィールドなしは BadRequestException", async () => {
      mockPrisma.post.findUnique.mockResolvedValue(existingPost);

      try {
        await service.update("post1", "user1", {
          location: { city: "さいたま市" },
        });
        fail("例外がスローされるべき");
      } catch (e: unknown) {
        expect(e).toBeInstanceOf(BadRequestException);
        const response = (e as BadRequestException).getResponse();
        expect(response).toMatchObject({
          code: "E_POST_LOCATION_REQUIRED",
          message: expect.any(String),
        });
      }
    });

    it("location を upsert できる", async () => {
      mockPrisma.post.findUnique
        .mockResolvedValueOnce(existingPost)
        .mockResolvedValueOnce({
          ...existingPost,
          petDetail: null,
          location: { city: "さいたま市" },
          images: [] as any[],
        });
      mockPrisma.post.update.mockResolvedValue({});
      mockPrisma.location.upsert.mockResolvedValue({});

      const location = {
        prefecture: "saitama",
        city: "さいたま市",
        address: "南区",
        lat: 35.0,
        lng: 139.0,
      };
      await service.update("post1", "user1", { location });

      expect(mockPrisma.location.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { postId: "post1" },
          create: expect.objectContaining({
            postId: "post1",
            prefecture: "saitama",
          }),
        })
      );
    });
  });

  // ─── remove ─────────────────────────────────────────────────
  describe("remove", () => {
    const existingPost = {
      id: "post1",
      title: "T",
      description: "C",
      userId: "user1",
      status: "lost",
      lostDate: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      images: [] as any[],
    };

    it("オーナーが削除できる", async () => {
      mockPrisma.post.findUnique.mockResolvedValue(existingPost);
      mockPrisma.post.delete.mockResolvedValue(existingPost);

      const result = await service.remove("post1", "user1");

      expect(mockPrisma.post.delete).toHaveBeenCalledWith({
        where: { id: "post1" },
      });
      expect(result).toEqual(existingPost);
    });

    it("画像ファイルも削除する", async () => {
      const postWithImages = {
        ...existingPost,
        images: [
          {
            id: "img1",
            url: "uploads/post1/abc.png",
            postId: "post1",
            createdAt: new Date(),
          },
        ],
      };
      mockPrisma.post.findUnique.mockResolvedValue(postWithImages);
      mockPrisma.post.delete.mockResolvedValue(postWithImages);

      await service.remove("post1", "user1");

      expect(mockFileStorage.deleteFile).toHaveBeenCalledTimes(1);
    });

    it("オーナー以外は ForbiddenException", async () => {
      mockPrisma.post.findUnique.mockResolvedValue(existingPost);

      try {
        await service.remove("post1", "other-user");
        fail("例外がスローされるべき");
      } catch (e: unknown) {
        expect(e).toBeInstanceOf(ForbiddenException);
        const response = (e as ForbiddenException).getResponse();
        expect(response).toMatchObject({
          code: "E_POST_NOT_OWNER",
          message: expect.any(String),
        });
      }
    });

    it("存在しない投稿は HttpException (404)", async () => {
      mockPrisma.post.findUnique.mockResolvedValue(null);

      try {
        await service.remove("no-such-post", "user1");
        fail("例外がスローされるべき");
      } catch (e: unknown) {
        expect(e).toBeInstanceOf(HttpException);
        const response = (e as HttpException).getResponse();
        expect(response).toMatchObject({
          code: "E_POST_NOT_FOUND",
          message: expect.any(String),
        });
      }
    });

    it("管理者は他人の投稿を削除できる", async () => {
      mockPrisma.post.findUnique.mockResolvedValue(existingPost);
      mockPrisma.post.delete.mockResolvedValue(existingPost);

      const result = await service.remove("post1", "admin-user", true);

      expect(mockPrisma.post.delete).toHaveBeenCalledWith({
        where: { id: "post1" },
      });
      expect(result).toEqual(existingPost);
    });

    it("画像処理でSharpエラーが発生した場合 BadRequestException をスローする", async () => {
      mockPrisma.post.create.mockResolvedValue({ id: "post1" } as any);
      mockFileStorage.saveFile.mockRejectedValue(
        new BadRequestException(
          "画像処理に失敗しました。ファイルが破損または無効な形式です。"
        )
      );

      const files = [
        { originalname: "photo.png", buffer: Buffer.from("raw") } as any,
      ];

      try {
        await service.create(
          "u1",
          { description: "C", lostDate: "2024-01-01" },
          files
        );
        fail("例外がスローされるべき");
      } catch (e: unknown) {
        expect(e).toBeInstanceOf(BadRequestException);
        expect((e as BadRequestException).message).toBe(
          "画像処理に失敗しました。ファイルが破損または無効な形式です。"
        );
      }
    });
  });

  // ─── toggleFavorite ─────────────────────────────────────────
  describe("toggleFavorite", () => {
    const postOwner = "owner-1";
    const otherUser = "other-user";
    const postId = "post-1";
    const existingPost = { id: postId, userId: postOwner };

    it("お気に入りしていない状態でtoggleFavoriteを呼ぶと { favorited: true } を返す", async () => {
      mockPrisma.post.findUnique.mockResolvedValue(existingPost);
      mockPrisma.postFavorite.findUnique.mockResolvedValue(null);
      mockPrisma.postFavorite.count.mockResolvedValue(0);
      mockPrisma.postFavorite.create.mockResolvedValue({ id: "fav-1" });

      const result = await service.toggleFavorite(otherUser, postId);

      expect(result).toEqual({ favorited: true });
      expect(mockPrisma.postFavorite.create).toHaveBeenCalledWith({
        data: { userId: otherUser, postId },
      });
    });

    it("既にお気に入り済みの状態でtoggleFavoriteを呼ぶと { favorited: false } を返す", async () => {
      mockPrisma.post.findUnique.mockResolvedValue(existingPost);
      mockPrisma.postFavorite.findUnique.mockResolvedValue({ id: "fav-1" });
      mockPrisma.postFavorite.delete.mockResolvedValue({ id: "fav-1" });

      const result = await service.toggleFavorite(otherUser, postId);

      expect(result).toEqual({ favorited: false });
      expect(mockPrisma.postFavorite.delete).toHaveBeenCalledWith({
        where: { userId_postId: { userId: otherUser, postId } },
      });
    });

    it("自分の投稿をお気に入りしようとすると ForbiddenException", async () => {
      mockPrisma.post.findUnique.mockResolvedValue(existingPost);

      try {
        await service.toggleFavorite(postOwner, postId);
        fail("例外がスローされるべき");
      } catch (e: unknown) {
        expect(e).toBeInstanceOf(ForbiddenException);
        const response = (e as ForbiddenException).getResponse();
        expect(response).toMatchObject({
          code: "E_POST_SELF_FAVORITE",
          message: expect.any(String),
        });
      }
    });

    it("お気に入りが20件の状態でtoggleFavoriteを呼ぶと BadRequestException", async () => {
      mockPrisma.post.findUnique.mockResolvedValue(existingPost);
      mockPrisma.postFavorite.findUnique.mockResolvedValue(null);
      mockPrisma.postFavorite.count.mockResolvedValue(20);

      try {
        await service.toggleFavorite(otherUser, postId);
        fail("例外がスローされるべき");
      } catch (e: unknown) {
        expect(e).toBeInstanceOf(BadRequestException);
        const response = (e as BadRequestException).getResponse();
        expect(response).toMatchObject({
          code: "E_POST_FAVORITE_LIMIT",
          message: expect.any(String),
        });
      }
    });

    it("存在しない投稿をお気に入りしようとすると NotFoundException", async () => {
      mockPrisma.post.findUnique.mockResolvedValue(null);

      try {
        await service.toggleFavorite(otherUser, postId);
        fail("例外がスローされるべき");
      } catch (e: unknown) {
        expect(e).toBeInstanceOf(NotFoundException);
        const response = (e as NotFoundException).getResponse();
        expect(response).toMatchObject({
          code: "E_POST_NOT_FOUND",
          message: expect.any(String),
        });
      }
    });
  });
});
