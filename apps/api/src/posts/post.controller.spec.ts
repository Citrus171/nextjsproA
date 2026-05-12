import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { PostsController, imageFileFilter } from "./post.controller";
import { PostsService } from "./post.service";

const makePost = (
  overrides: Record<string, unknown> = {}
): Record<string, unknown> => ({
  id: "post1",
  title: "Title",
  description: "Content",
  userId: "user1",
  status: "lost",
  lostDate: new Date("2024-01-01"),
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
  petDetail: null,
  location: null,
  images: [],
  ...overrides,
});

const mockPostsService = {
  create: jest.fn(),
  findAll: jest.fn(),
  findById: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
  addImages: jest.fn(),
  removeImage: jest.fn(),
  toggleFavorite: jest.fn(),
};

describe("PostsController", () => {
  let controller: PostsController;

  beforeEach(() => {
    controller = new PostsController(
      mockPostsService as unknown as PostsService
    );
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

    it("mine=true の時、req.user.id を userId として findAll に渡す", async () => {
      mockPostsService.findAll.mockResolvedValue({ items: [], total: 0 });
      const req = {
        user: { id: "user1", email: "test@test.com", role: "user" as const },
      };

      await controller.list("1", "10", "true", req);

      expect(mockPostsService.findAll).toHaveBeenCalledWith(1, 10, "user1");
    });

    it("mine=true でもページネーションが正しく機能する", async () => {
      mockPostsService.findAll.mockResolvedValue({ items: [], total: 0 });
      const req = {
        user: { id: "user1", email: "test@test.com", role: "user" as const },
      };

      await controller.list("3", "5", "true", req);

      expect(mockPostsService.findAll).toHaveBeenCalledWith(3, 5, "user1");
    });

    it("mine=true 未認証の時、UnauthorizedException をスローする", async () => {
      try {
        await controller.list("1", "10", "true", {} as any);
        fail("例外がスローされるべき");
      } catch (e: unknown) {
        expect(e).toBeInstanceOf(UnauthorizedException);
        const response = (e as UnauthorizedException).getResponse();
        expect(response).toMatchObject({
          code: "E_AUTH_REQUIRED",
          message: expect.any(String),
        });
      }
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
    it("dto と files をサービスに渡す", async () => {
      const post = makePost();
      mockPostsService.create.mockResolvedValue(post);
      const req = {
        user: { id: "user1", email: "test@test.com", role: "user" as const },
      };
      const dto = { title: "Title", description: "Content" };

      const result = await controller.create(req, dto as any, []);

      expect(mockPostsService.create).toHaveBeenCalledWith("user1", dto, []);
      expect(result).toEqual(post);
    });

    it("ファイル付きで作成できる", async () => {
      const post = makePost();
      mockPostsService.create.mockResolvedValue(post);
      const req = {
        user: { id: "user1", email: "test@test.com", role: "user" as const },
      };
      const dto = { title: "Title", description: "Content" };
      const files = [
        {
          originalname: "img.png",
          mimetype: "image/png",
          buffer: Buffer.from(""),
        } as any,
      ];

      await controller.create(req, dto as any, files);

      expect(mockPostsService.create).toHaveBeenCalledWith("user1", dto, files);
    });

    it("files が undefined の時は空配列を渡す", async () => {
      const post = makePost();
      mockPostsService.create.mockResolvedValue(post);
      const req = {
        user: { id: "user1", email: "test@test.com", role: "user" as const },
      };

      await controller.create(
        req,
        { description: "C" } as any,
        undefined as any
      );

      expect(mockPostsService.create).toHaveBeenCalledWith(
        "user1",
        { description: "C" },
        []
      );
    });

    it("petDetail と location を含む dto をサービスに渡す", async () => {
      const post = makePost();
      mockPostsService.create.mockResolvedValue(post);
      const req = {
        user: { id: "user1", email: "test@test.com", role: "user" as const },
      };
      const dto = {
        title: "Title",
        description: "Content",
        petDetail: {
          name: "Mimi",
          color: "white",
          age: "2歳",
          features: "人懐こい",
        },
        location: {
          prefecture: "saitama",
          city: "さいたま市",
          address: "南区",
          lat: 35.0,
          lng: 139.0,
        },
      };

      await controller.create(req, dto as any, []);

      expect(mockPostsService.create).toHaveBeenCalledWith("user1", dto, []);
    });
  });

  // ─── update (PATCH) ──────────────────────────────────────────
  describe("update", () => {
    it("オーナーが更新できる", async () => {
      const updated = makePost({ title: "New" });
      mockPostsService.update.mockResolvedValue(updated);
      const req = {
        user: { id: "user1", email: "test@test.com", role: "user" as const },
      };

      const result = await controller.update(req, "post1", {
        title: "New",
      } as any);

      expect(mockPostsService.update).toHaveBeenCalledWith(
        "post1",
        "user1",
        {
          title: "New",
        },
        false
      );
      expect(result).toEqual(updated);
    });

    it("オーナー以外は ForbiddenException を伝播する", async () => {
      mockPostsService.update.mockRejectedValue(new ForbiddenException());
      const req = {
        user: { id: "other", email: "other@test.com", role: "user" as const },
      };

      await expect(
        controller.update(req, "post1", { title: "X" } as any)
      ).rejects.toThrow(ForbiddenException);
    });

    it("存在しない投稿は HttpException を伝播する", async () => {
      mockPostsService.update.mockRejectedValue(
        new HttpException("Not found", 404)
      );
      const req = {
        user: { id: "user1", email: "test@test.com", role: "user" as const },
      };

      await expect(
        controller.update(req, "no-such", {} as any)
      ).rejects.toThrow(HttpException);
    });

    it("petDetail と location を含む dto をサービスに渡す", async () => {
      const updated = makePost();
      mockPostsService.update.mockResolvedValue(updated);
      const req = {
        user: { id: "user1", email: "test@test.com", role: "user" as const },
      };
      const dto = {
        petDetail: {
          name: "New",
          color: "black",
          age: "1歳",
          features: "元気",
        },
        location: { city: "川口市" },
      };

      const result = await controller.update(req, "post1", dto as any);

      expect(mockPostsService.update).toHaveBeenCalledWith(
        "post1",
        "user1",
        dto,
        false
      );
      expect(result).toEqual(updated);
    });
  });

  // ─── addImages ───────────────────────────────────────────────
  describe("addImages", () => {
    it("画像を追加できる", async () => {
      const response = {
        remainingSlots: 4,
        images: [
          { id: "img1", url: "uploads/post1/a.png", createdAt: new Date() },
        ],
      };
      mockPostsService.addImages.mockResolvedValue(response);
      const req = {
        user: { id: "user1", email: "test@test.com", role: "user" as const },
      };
      const files = [{ originalname: "a.png", buffer: Buffer.from("") } as any];

      const result = await controller.addImages(req, "post1", files);

      expect(mockPostsService.addImages).toHaveBeenCalledWith(
        "post1",
        "user1",
        files,
        false
      );
      expect(result).toEqual(response);
    });

    it("files が undefined の時は空配列を渡す", async () => {
      mockPostsService.addImages.mockResolvedValue({
        remainingSlots: 5,
        images: [],
      });
      const req = {
        user: { id: "user1", email: "test@test.com", role: "user" as const },
      };

      await controller.addImages(req, "post1", undefined as any);

      expect(mockPostsService.addImages).toHaveBeenCalledWith(
        "post1",
        "user1",
        [],
        false
      );
    });

    it("オーナー以外は ForbiddenException を伝播する", async () => {
      mockPostsService.addImages.mockRejectedValue(new ForbiddenException());
      const req = {
        user: { id: "other", email: "other@test.com", role: "user" as const },
      };

      await expect(controller.addImages(req, "post1", [])).rejects.toThrow(
        ForbiddenException
      );
    });

    it("枚数超過は BadRequestException を伝播する", async () => {
      mockPostsService.addImages.mockRejectedValue(new BadRequestException());
      const req = {
        user: { id: "user1", email: "test@test.com", role: "user" as const },
      };

      await expect(controller.addImages(req, "post1", [])).rejects.toThrow(
        BadRequestException
      );
    });
  });

  // ─── removeImage ─────────────────────────────────────────────
  describe("removeImage", () => {
    it("オーナーが画像を削除できる", async () => {
      const image = {
        id: "img1",
        url: "uploads/post1/a.png",
        postId: "post1",
        createdAt: new Date(),
      };
      mockPostsService.removeImage.mockResolvedValue(image);
      const req = {
        user: { id: "user1", email: "test@test.com", role: "user" as const },
      };

      const result = await controller.removeImage(req, "post1", "img1");

      expect(mockPostsService.removeImage).toHaveBeenCalledWith(
        "post1",
        "img1",
        "user1",
        false
      );
      expect(result).toEqual(image);
    });

    it("オーナー以外は ForbiddenException を伝播する", async () => {
      mockPostsService.removeImage.mockRejectedValue(new ForbiddenException());
      const req = {
        user: { id: "other", email: "other@test.com", role: "user" as const },
      };

      await expect(
        controller.removeImage(req, "post1", "img1")
      ).rejects.toThrow(ForbiddenException);
    });

    it("存在しない画像は NotFoundException を伝播する", async () => {
      mockPostsService.removeImage.mockRejectedValue(new NotFoundException());
      const req = {
        user: { id: "user1", email: "test@test.com", role: "user" as const },
      };

      await expect(
        controller.removeImage(req, "post1", "no-img")
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── toggleFavorite ──────────────────────────────────────────
  describe("toggleFavorite", () => {
    it("{ favorited: true } を返す", async () => {
      mockPostsService.toggleFavorite.mockResolvedValue({ favorited: true });
      const req = {
        user: { id: "user1", email: "test@test.com", role: "user" as const },
      };

      const result = await controller.toggleFavorite(req, "post1");

      expect(mockPostsService.toggleFavorite).toHaveBeenCalledWith(
        "user1",
        "post1"
      );
      expect(result).toEqual({ favorited: true });
    });

    it("ForbiddenException を伝播する", async () => {
      mockPostsService.toggleFavorite.mockRejectedValue(
        new ForbiddenException()
      );
      const req = {
        user: { id: "owner", email: "owner@test.com", role: "user" as const },
      };

      await expect(controller.toggleFavorite(req, "post1")).rejects.toThrow(
        ForbiddenException
      );
    });

    it("BadRequestException を伝播する", async () => {
      mockPostsService.toggleFavorite.mockRejectedValue(
        new BadRequestException()
      );
      const req = {
        user: { id: "user1", email: "test@test.com", role: "user" as const },
      };

      await expect(controller.toggleFavorite(req, "post1")).rejects.toThrow(
        BadRequestException
      );
    });
  });

  // ─── imageFileFilter ─────────────────────────────────────────
  describe("imageFileFilter", () => {
    it("fileがnullの時、cb(null, false)を呼ぶこと", () => {
      const cb = jest.fn();
      imageFileFilter(
        {} as Express.Request,
        null as unknown as Express.Multer.File,
        cb
      );
      expect(cb).toHaveBeenCalledWith(null, false);
    });

    it("originalnameがない時、cb(null, false)を呼ぶこと", () => {
      const cb = jest.fn();
      imageFileFilter(
        {} as Express.Request,
        { mimetype: "image/png" } as any,
        cb
      );
      expect(cb).toHaveBeenCalledWith(null, false);
    });

    it("許可されたMIMEタイプの時、cb(null, true)を呼ぶこと", () => {
      const cb = jest.fn();
      imageFileFilter(
        {} as Express.Request,
        { originalname: "photo.png", mimetype: "image/png" } as any,
        cb
      );
      expect(cb).toHaveBeenCalledWith(null, true);
    });

    it("許可されていないMIMEタイプの時、BadRequestExceptionを渡すこと", () => {
      const cb = jest.fn();
      imageFileFilter(
        {} as Express.Request,
        { originalname: "doc.pdf", mimetype: "application/pdf" } as any,
        cb
      );
      expect(cb).toHaveBeenCalledWith(expect.any(BadRequestException), false);
    });
  });

  // ─── remove ──────────────────────────────────────────────────
  describe("remove", () => {
    it("オーナーが削除できる", async () => {
      const post = makePost();
      mockPostsService.remove.mockResolvedValue(post);
      const req = {
        user: { id: "user1", email: "test@test.com", role: "user" as const },
      };

      const result = await controller.remove(req, "post1");

      expect(mockPostsService.remove).toHaveBeenCalledWith(
        "post1",
        "user1",
        false
      );
      expect(result).toEqual(post);
    });

    it("オーナー以外は ForbiddenException を伝播する", async () => {
      mockPostsService.remove.mockRejectedValue(new ForbiddenException());
      const req = {
        user: { id: "other", email: "other@test.com", role: "user" as const },
      };

      await expect(controller.remove(req, "post1")).rejects.toThrow(
        ForbiddenException
      );
    });

    it("存在しない投稿は HttpException を伝播する", async () => {
      mockPostsService.remove.mockRejectedValue(
        new HttpException("Not found", 404)
      );
      const req = {
        user: { id: "user1", email: "test@test.com", role: "user" as const },
      };

      await expect(controller.remove(req, "no-such")).rejects.toThrow(
        HttpException
      );
    });
  });
});
