import { ForbiddenException, HttpException } from "@nestjs/common";
import { PostsService } from "./post.service";

// PrismaService のモック
const mockPrisma = {
  post: {
    create: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

describe("PostsService", () => {
  let service: PostsService;

  beforeEach(() => {
    service = new PostsService(mockPrisma as any);
    jest.clearAllMocks();
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
      });
    });

    it("ページ3・perPage5 で skip=10 を渡す", async () => {
      mockPrisma.post.findMany.mockResolvedValue([]);
      mockPrisma.post.count.mockResolvedValue(20);

      await service.findAll(3, 5);

      expect(mockPrisma.post.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 5 }),
      );
    });

    it("items と total を返す", async () => {
      const posts = [{ id: "1", title: "T", content: "C", authorId: "u1", image: null, createdAt: new Date() }];
      mockPrisma.post.findMany.mockResolvedValue(posts);
      mockPrisma.post.count.mockResolvedValue(1);

      const result = await service.findAll(1, 10);

      expect(result).toEqual({ items: posts, total: 1 });
    });
  });

  // ─── create ─────────────────────────────────────────────────
  describe("create", () => {
    it("ファイルなしで投稿を作成する", async () => {
      const created = { id: "1", title: "T", content: "C", authorId: "u1", image: null, createdAt: new Date() };
      mockPrisma.post.create.mockResolvedValue(created);

      const result = await service.create("u1", "T", "C");

      expect(mockPrisma.post.create).toHaveBeenCalledWith({
        data: { title: "T", content: "C", authorId: "u1", image: undefined },
      });
      expect(result).toEqual(created);
    });
  });

  // ─── update ─────────────────────────────────────────────────
  describe("update", () => {
    const existingPost = {
      id: "post1",
      title: "Old",
      content: "Old content",
      authorId: "user1",
      image: null,
      createdAt: new Date(),
    };

    it("オーナーが更新できる", async () => {
      mockPrisma.post.findUnique.mockResolvedValue(existingPost);
      const updated = { ...existingPost, title: "New" };
      mockPrisma.post.update.mockResolvedValue(updated);

      const result = await service.update("post1", "user1", { title: "New" });

      expect(mockPrisma.post.update).toHaveBeenCalledWith({
        where: { id: "post1" },
        data: { title: "New" },
      });
      expect(result.title).toBe("New");
    });

    it("オーナー以外は ForbiddenException", async () => {
      mockPrisma.post.findUnique.mockResolvedValue(existingPost);

      await expect(
        service.update("post1", "other-user", { title: "Hacked" }),
      ).rejects.toThrow(ForbiddenException);
    });

    it("存在しない投稿は HttpException (404)", async () => {
      mockPrisma.post.findUnique.mockResolvedValue(null);

      await expect(
        service.update("no-such-post", "user1", { title: "X" }),
      ).rejects.toThrow(HttpException);
    });
  });

  // ─── remove ─────────────────────────────────────────────────
  describe("remove", () => {
    const existingPost = {
      id: "post1",
      title: "T",
      content: "C",
      authorId: "user1",
      image: null,
      createdAt: new Date(),
    };

    it("オーナーが削除できる", async () => {
      mockPrisma.post.findUnique.mockResolvedValue(existingPost);
      mockPrisma.post.delete.mockResolvedValue(existingPost);

      const result = await service.remove("post1", "user1");

      expect(mockPrisma.post.delete).toHaveBeenCalledWith({ where: { id: "post1" } });
      expect(result).toEqual(existingPost);
    });

    it("オーナー以外は ForbiddenException", async () => {
      mockPrisma.post.findUnique.mockResolvedValue(existingPost);

      await expect(service.remove("post1", "other-user")).rejects.toThrow(
        ForbiddenException,
      );
    });

    it("存在しない投稿は HttpException (404)", async () => {
      mockPrisma.post.findUnique.mockResolvedValue(null);

      await expect(service.remove("no-such-post", "user1")).rejects.toThrow(
        HttpException,
      );
    });
  });
});
