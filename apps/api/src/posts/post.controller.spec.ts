import { ForbiddenException, HttpException } from "@nestjs/common";
import { PostsController } from "./post.controller";
import { PostsService } from "./post.service";

const makePost = (overrides = {}) => ({
  id: "post1",
  title: "Title",
  content: "Content",
  authorId: "user1",
  image: null,
  createdAt: new Date("2024-01-01"),
  ...overrides,
});

const mockPostsService = {
  create: jest.fn(),
  findAll: jest.fn(),
  findById: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
};

describe("PostsController", () => {
  let controller: PostsController;

  beforeEach(() => {
    controller = new PostsController(mockPostsService as unknown as PostsService);
    jest.clearAllMocks();
  });

  // ─── list ────────────────────────────────────────────────────
  describe("list", () => {
    it("デフォルト（page=1, perPage=10）で findAll を呼ぶ", async () => {
      mockPostsService.findAll.mockResolvedValue({ items: [], total: 0 });

      await controller.list("1", "10");

      expect(mockPostsService.findAll).toHaveBeenCalledWith(1, 10);
    });

    it("文字列クエリを数値に変換して渡す", async () => {
      mockPostsService.findAll.mockResolvedValue({ items: [], total: 0 });

      await controller.list("2", "5");

      expect(mockPostsService.findAll).toHaveBeenCalledWith(2, 5);
    });

    it("不正な文字列は 1 / 10 にフォールバックする", async () => {
      mockPostsService.findAll.mockResolvedValue({ items: [], total: 0 });

      await controller.list("abc", "xyz");

      expect(mockPostsService.findAll).toHaveBeenCalledWith(1, 10);
    });

    it("items と total を返す", async () => {
      const posts = [makePost()];
      mockPostsService.findAll.mockResolvedValue({ items: posts, total: 1 });

      const result = await controller.list("1", "10");

      expect(result).toEqual({ items: posts, total: 1 });
    });
  });

  // ─── get ─────────────────────────────────────────────────────
  describe("get", () => {
    it("指定 ID の投稿を返す", async () => {
      const post = makePost();
      mockPostsService.findById.mockResolvedValue(post);

      const result = await controller.get("post1");

      expect(mockPostsService.findById).toHaveBeenCalledWith("post1");
      expect(result).toEqual(post);
    });
  });

  // ─── create ──────────────────────────────────────────────────
  describe("create", () => {
    it("req.user.id を authorId として投稿を作成する", async () => {
      const post = makePost();
      mockPostsService.create.mockResolvedValue(post);
      const req = { user: { id: "user1" } };
      const dto = { title: "Title", content: "Content" };

      const result = await controller.create(req, dto as any, undefined as any);

      expect(mockPostsService.create).toHaveBeenCalledWith("user1", "Title", "Content", undefined);
      expect(result).toEqual(post);
    });

    it("ファイル付きで作成できる", async () => {
      const post = makePost({ image: "uploads/uuid.png" });
      mockPostsService.create.mockResolvedValue(post);
      const req = { user: { id: "user1" } };
      const dto = { title: "Title", content: "Content" };
      const file = { originalname: "img.png", mimetype: "image/png", buffer: Buffer.from("") } as any;

      await controller.create(req, dto as any, file);

      expect(mockPostsService.create).toHaveBeenCalledWith("user1", "Title", "Content", file);
    });
  });

  // ─── update ──────────────────────────────────────────────────
  describe("update", () => {
    it("オーナーが更新できる", async () => {
      const updated = makePost({ title: "New" });
      mockPostsService.update.mockResolvedValue(updated);
      const req = { user: { id: "user1" } };

      const result = await controller.update(req, "post1", { title: "New" } as any, undefined as any);

      expect(mockPostsService.update).toHaveBeenCalledWith("post1", "user1", { title: "New" }, undefined);
      expect(result).toEqual(updated);
    });

    it("オーナー以外は ForbiddenException を伝播する", async () => {
      mockPostsService.update.mockRejectedValue(new ForbiddenException());
      const req = { user: { id: "other" } };

      await expect(
        controller.update(req, "post1", { title: "X" } as any, undefined as any),
      ).rejects.toThrow(ForbiddenException);
    });

    it("存在しない投稿は HttpException を伝播する", async () => {
      mockPostsService.update.mockRejectedValue(new HttpException("Not found", 404));
      const req = { user: { id: "user1" } };

      await expect(
        controller.update(req, "no-such", {} as any, undefined as any),
      ).rejects.toThrow(HttpException);
    });
  });

  // ─── remove ──────────────────────────────────────────────────
  describe("remove", () => {
    it("オーナーが削除できる", async () => {
      const post = makePost();
      mockPostsService.remove.mockResolvedValue(post);
      const req = { user: { id: "user1" } };

      const result = await controller.remove(req, "post1");

      expect(mockPostsService.remove).toHaveBeenCalledWith("post1", "user1");
      expect(result).toEqual(post);
    });

    it("オーナー以外は ForbiddenException を伝播する", async () => {
      mockPostsService.remove.mockRejectedValue(new ForbiddenException());
      const req = { user: { id: "other" } };

      await expect(controller.remove(req, "post1")).rejects.toThrow(ForbiddenException);
    });

    it("存在しない投稿は HttpException を伝播する", async () => {
      mockPostsService.remove.mockRejectedValue(new HttpException("Not found", 404));
      const req = { user: { id: "user1" } };

      await expect(controller.remove(req, "no-such")).rejects.toThrow(HttpException);
    });
  });
});
