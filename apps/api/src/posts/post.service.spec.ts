import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  NotFoundException,
} from "@nestjs/common";
import * as fs from "fs";
import { PostsService } from "./post.service";

jest.mock("fs");
const mockFs = fs as jest.Mocked<typeof fs>;

jest.mock("sharp", () =>
  jest.fn().mockReturnValue({
    resize: jest.fn().mockReturnThis(),
    jpeg: jest.fn().mockReturnThis(),
    toBuffer: jest.fn().mockResolvedValue(Buffer.from("processed-image")),
  })
);

const mockPrisma = {
  post: {
    create: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
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
  $transaction: jest.fn(),
};

describe("PostsService", () => {
  let service: PostsService;

  beforeEach(() => {
    service = new PostsService(mockPrisma as any);
    jest.clearAllMocks();
    mockFs.existsSync.mockReturnValue(true);
    mockFs.writeFileSync.mockReturnValue(undefined);
    mockFs.mkdirSync.mockReturnValue(undefined as any);
    mockFs.unlinkSync.mockReturnValue(undefined);
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
        orderBy: { createdAt: "desc" },
        include: { petDetail: true, location: true, images: true },
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

    it("items と total を返す", async () => {
      const posts = [
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
          images: [],
        },
      ];
      mockPrisma.post.findMany.mockResolvedValue(posts);
      mockPrisma.post.count.mockResolvedValue(1);

      const result = await service.findAll(1, 10);

      expect(result).toEqual({ items: posts, total: 1 });
    });
  });

  // ─── findById ───────────────────────────────────────────────
  describe("findById", () => {
    it("petDetail と location と images を include して取得する", async () => {
      const post = {
        id: "post1",
        petDetail: { name: "Mimi" },
        location: { city: "さいたま市" },
        images: [],
      };
      mockPrisma.post.findUnique.mockResolvedValue(post);

      const result = await service.findById("post1");

      expect(mockPrisma.post.findUnique).toHaveBeenCalledWith({
        where: { id: "post1" },
        include: { petDetail: true, location: true, images: true },
      });
      expect(result).toEqual(post);
    });

    it("存在しない投稿は NotFoundException", async () => {
      mockPrisma.post.findUnique.mockResolvedValue(null);

      await expect(service.findById("no-such")).rejects.toThrow(
        NotFoundException
      );
    });
  });

  // ─── create ─────────────────────────────────────────────────
  describe("create", () => {
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
      const withIncludes = {
        ...created,
        petDetail: null,
        location: null,
        images: [],
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

    it("ファイルありで投稿を作成する時、writeFileSyncが呼ばれること", async () => {
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
        images: [],
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

      expect(mockFs.writeFileSync).toHaveBeenCalled();
      expect(mockPrisma.image.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ postId: "post1" }),
      });
    });

    it("アップロードディレクトリが存在しない時、mkdirSyncを呼ぶこと", async () => {
      mockFs.existsSync.mockReturnValue(false);
      mockPrisma.post.create.mockResolvedValue({ id: "post1" } as any);
      mockPrisma.post.findUnique.mockResolvedValue({
        id: "post1",
        petDetail: null,
        location: null,
        images: [],
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

      expect(mockFs.mkdirSync).toHaveBeenCalled();
    });

    it("画像が sharp でリサイズ・JPEG変換されること", async () => {
      const sharpMock = jest.requireMock("sharp") as jest.Mock;
      const mockInstance = {
        resize: jest.fn().mockReturnThis(),
        jpeg: jest.fn().mockReturnThis(),
        toBuffer: jest.fn().mockResolvedValue(Buffer.from("processed-image")),
      };
      sharpMock.mockReturnValue(mockInstance);

      mockPrisma.post.create.mockResolvedValue({ id: "post1" } as any);
      mockPrisma.post.findUnique.mockResolvedValue({
        id: "post1",
        petDetail: null,
        location: null,
        images: [],
      });
      mockPrisma.image.create.mockResolvedValue({});
      const rawBuf = Buffer.from("raw");
      const files = [{ originalname: "photo.png", buffer: rawBuf } as any];

      await service.create(
        "u1",
        { description: "C", lostDate: "2024-01-01" },
        files
      );

      expect(sharpMock).toHaveBeenCalledWith(rawBuf);
      expect(mockInstance.resize).toHaveBeenCalledWith({
        width: 1200,
        withoutEnlargement: true,
      });
      expect(mockInstance.jpeg).toHaveBeenCalledWith({ quality: 80 });
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining("post1"),
        Buffer.from("processed-image")
      );
    });

    it("lostDate なしは BadRequestException をスローする", async () => {
      await expect(
        service.create("u1", { description: "C" } as any)
      ).rejects.toThrow(BadRequestException);
    });

    it("画像が5枚超の場合 BadRequestException をスローする", async () => {
      const files = Array.from(
        { length: 6 },
        () => ({ originalname: "p.png", buffer: Buffer.from("") }) as any
      );

      await expect(
        service.create(
          "u1",
          { description: "C", lostDate: "2024-01-01" },
          files
        )
      ).rejects.toThrow(BadRequestException);
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
        images: [],
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
        images: [],
      });

      await service.create("u1", { description: "C", lostDate: "2024-06-15" });

      expect(mockPrisma.post.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ lostDate: new Date("2024-06-15") }),
      });
    });

    it("トランザクション失敗時に保存済みファイルを削除する", async () => {
      mockPrisma.post.create.mockResolvedValue({ id: "post1" } as any);
      // 1枚目は保存成功、2枚目でエラー
      mockFs.writeFileSync
        .mockReturnValueOnce(undefined)
        .mockImplementationOnce(() => {
          throw new Error("disk full");
        });
      mockPrisma.image.create.mockResolvedValue({});

      const files = [
        { originalname: "a.png", buffer: Buffer.from("") } as any,
        { originalname: "b.png", buffer: Buffer.from("") } as any,
      ];

      await expect(
        service.create(
          "u1",
          { title: "T", description: "C", lostDate: "2024-01-01" },
          files
        )
      ).rejects.toThrow("disk full");
      // 1枚目の保存済みファイルがクリーンアップされること
      expect(mockFs.unlinkSync).toHaveBeenCalledTimes(1);
    });
  });

  // ─── addImages ──────────────────────────────────────────────
  describe("addImages", () => {
    const existingPost = {
      id: "post1",
      userId: "user1",
      images: [],
    };

    it("画像を追加できる", async () => {
      mockPrisma.post.findUnique.mockResolvedValue(existingPost);
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

      expect(mockFs.writeFileSync).toHaveBeenCalled();
      expect(mockPrisma.image.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ postId: "post1" }),
      });
      expect(result.remainingSlots).toBe(4);
      expect(result.images).toHaveLength(1);
    });

    it("オーナー以外は ForbiddenException", async () => {
      mockPrisma.post.findUnique.mockResolvedValue(existingPost);

      await expect(
        service.addImages("post1", "other-user", [])
      ).rejects.toThrow(ForbiddenException);
    });

    it("存在しない投稿は NotFoundException", async () => {
      mockPrisma.post.findUnique.mockResolvedValue(null);

      await expect(service.addImages("no-such", "user1", [])).rejects.toThrow(
        NotFoundException
      );
    });

    it("5枚超になる場合は BadRequestException", async () => {
      mockPrisma.post.findUnique.mockResolvedValue({
        ...existingPost,
        images: [1, 2, 3],
      });
      const files = [
        { originalname: "a.png", buffer: Buffer.from("") } as any,
        { originalname: "b.png", buffer: Buffer.from("") } as any,
        { originalname: "c.png", buffer: Buffer.from("") } as any,
      ];

      await expect(service.addImages("post1", "user1", files)).rejects.toThrow(
        BadRequestException
      );
    });

    it("DB作成失敗時に保存済みファイルを削除する", async () => {
      mockPrisma.post.findUnique.mockResolvedValue(existingPost);
      mockPrisma.image.create.mockRejectedValue(new Error("DB error"));

      const files = [{ originalname: "a.png", buffer: Buffer.from("") } as any];

      await expect(service.addImages("post1", "user1", files)).rejects.toThrow(
        "DB error"
      );
      expect(mockFs.unlinkSync).toHaveBeenCalledTimes(1);
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

      expect(mockFs.unlinkSync).toHaveBeenCalled();
      expect(mockPrisma.image.delete).toHaveBeenCalledWith({
        where: { id: "img1" },
      });
      expect(result).toEqual(existingImage);
    });

    it("ファイルが存在しない場合 unlinkSync を呼ばない", async () => {
      mockFs.existsSync.mockReturnValue(false);
      mockPrisma.post.findUnique.mockResolvedValue(existingPost);
      mockPrisma.image.findUnique.mockResolvedValue(existingImage);
      mockPrisma.image.delete.mockResolvedValue(existingImage);

      await service.removeImage("post1", "img1", "user1");

      expect(mockFs.unlinkSync).not.toHaveBeenCalled();
    });

    it("オーナー以外は ForbiddenException", async () => {
      mockPrisma.post.findUnique.mockResolvedValue(existingPost);

      await expect(
        service.removeImage("post1", "img1", "other-user")
      ).rejects.toThrow(ForbiddenException);
    });

    it("存在しない投稿は NotFoundException", async () => {
      mockPrisma.post.findUnique.mockResolvedValue(null);

      await expect(
        service.removeImage("no-such", "img1", "user1")
      ).rejects.toThrow(NotFoundException);
    });

    it("別の投稿に属する画像は NotFoundException", async () => {
      mockPrisma.post.findUnique.mockResolvedValue(existingPost);
      mockPrisma.image.findUnique.mockResolvedValue({
        ...existingImage,
        postId: "other-post",
      });

      await expect(
        service.removeImage("post1", "img1", "user1")
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── update ─────────────────────────────────────────────────
  describe("update", () => {
    const existingPost = {
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
      const updatedWithIncludes = {
        ...existingPost,
        title: "New",
        petDetail: null,
        location: null,
        images: [],
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

    it("オーナー以外は ForbiddenException", async () => {
      mockPrisma.post.findUnique.mockResolvedValue(existingPost);

      await expect(
        service.update("post1", "other-user", { title: "Hacked" })
      ).rejects.toThrow(ForbiddenException);
    });

    it("存在しない投稿は HttpException (404)", async () => {
      mockPrisma.post.findUnique.mockResolvedValue(null);

      await expect(
        service.update("no-such-post", "user1", { title: "X" })
      ).rejects.toThrow(HttpException);
    });

    it("lostDate を更新できる", async () => {
      mockPrisma.post.findUnique
        .mockResolvedValueOnce(existingPost)
        .mockResolvedValueOnce({
          ...existingPost,
          lostDate: new Date("2024-06-15"),
          petDetail: null,
          location: null,
          images: [],
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
          images: [],
        });
      mockPrisma.post.update.mockResolvedValue({});

      await service.update("post1", "user1", { status: "resolved" });

      expect(mockPrisma.post.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: "resolved" }),
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
          images: [],
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

      await expect(
        service.update("post1", "user1", { petDetail: { name: "Mimi" } })
      ).rejects.toThrow(BadRequestException);
    });

    it("location 未存在かつ必須フィールドなしは BadRequestException", async () => {
      mockPrisma.post.findUnique.mockResolvedValue(existingPost);

      await expect(
        service.update("post1", "user1", { location: { city: "さいたま市" } })
      ).rejects.toThrow(BadRequestException);
    });

    it("location を upsert できる", async () => {
      mockPrisma.post.findUnique
        .mockResolvedValueOnce(existingPost)
        .mockResolvedValueOnce({
          ...existingPost,
          petDetail: null,
          location: { city: "さいたま市" },
          images: [],
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
      images: [],
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

      expect(mockFs.unlinkSync).toHaveBeenCalledTimes(1);
    });

    it("オーナー以外は ForbiddenException", async () => {
      mockPrisma.post.findUnique.mockResolvedValue(existingPost);

      await expect(service.remove("post1", "other-user")).rejects.toThrow(
        ForbiddenException
      );
    });

    it("存在しない投稿は HttpException (404)", async () => {
      mockPrisma.post.findUnique.mockResolvedValue(null);

      await expect(service.remove("no-such-post", "user1")).rejects.toThrow(
        HttpException
      );
    });
  });
});
