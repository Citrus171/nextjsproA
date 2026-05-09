import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { SightingsService } from "./sighting.service";
import { PrismaService } from "../prisma.service";

const mockPrisma = {
  post: { findUnique: jest.fn() },
  sighting: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    delete: jest.fn(),
  },
  sightingFavorite: {
    findUnique: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
  },
  $transaction: jest.fn(),
};

describe("SightingsService", () => {
  let service: SightingsService;

  beforeEach(() => {
    service = new SightingsService(mockPrisma as unknown as PrismaService);
    jest.clearAllMocks();
    mockPrisma.$transaction.mockImplementation(
      async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => fn(mockPrisma)
    );
  });

  // ─── create ────────────────────────────────────────────────
  describe("create", () => {
    const dto = {
      postId: "post-1",
      lat: 35.9,
      lng: 139.6,
      sightedAt: "2026-04-19T10:00:00.000Z",
    };

    it("有効なデータでSightingを作成できること", async () => {
      mockPrisma.post.findUnique.mockResolvedValue({
        id: "post-1",
        userId: "owner-1",
      });
      mockPrisma.sighting.create.mockResolvedValue({ id: "s-1", ...dto });

      const result = await service.create("other-user", dto);

      expect(mockPrisma.sighting.create).toHaveBeenCalledWith({
        data: {
          postId: "post-1",
          userId: "other-user",
          lat: 35.9,
          lng: 139.6,
          address: undefined,
          sightedAt: new Date("2026-04-19T10:00:00.000Z"),
          comment: undefined,
        },
      });
      expect(result).toMatchObject({ id: "s-1" });
    });

    it("postId がない時は Post チェックをスキップして Sighting を作成できること", async () => {
      const dtoWithoutPostId = {
        lat: 35.9,
        lng: 139.6,
        sightedAt: "2026-04-19T10:00:00.000Z",
      };
      mockPrisma.sighting.create.mockResolvedValue({
        id: "s-standalone",
        postId: null,
        userId: "other-user",
        ...dtoWithoutPostId,
      });

      const result = await service.create(
        "other-user",
        dtoWithoutPostId as never
      );

      expect(mockPrisma.post.findUnique).not.toHaveBeenCalled();
      expect(mockPrisma.sighting.create).toHaveBeenCalledWith({
        data: {
          postId: null,
          userId: "other-user",
          lat: 35.9,
          lng: 139.6,
          address: undefined,
          sightedAt: new Date("2026-04-19T10:00:00.000Z"),
          comment: undefined,
        },
      });
      expect(result).toMatchObject({ id: "s-standalone", postId: null });
    });

    it("postId が空文字の時は Post チェックを行って NotFoundException になること", async () => {
      const dtoWithEmptyPostId = {
        postId: "",
        lat: 35.9,
        lng: 139.6,
        sightedAt: "2026-04-19T10:00:00.000Z",
      };

      mockPrisma.post.findUnique.mockResolvedValue(null);

      try {
        await service.create("other-user", dtoWithEmptyPostId as never);
        fail("例外がスローされるべき");
      } catch (e) {
        expect(e).toBeInstanceOf(NotFoundException);
        const response = (e as NotFoundException).getResponse();
        expect(response).toMatchObject({
          code: "E_POST_NOT_FOUND",
          message: expect.any(String),
        });
      }

      expect(mockPrisma.post.findUnique).toHaveBeenCalledWith({
        where: { id: "" },
      });
    });

    it("投稿者本人が自分のPostにSightingを作成しようとすると ForbiddenException", async () => {
      mockPrisma.post.findUnique.mockResolvedValue({
        id: "post-1",
        userId: "owner-1",
      });

      try {
        await service.create("owner-1", dto);
        fail("例外がスローされるべき");
      } catch (e) {
        expect(e).toBeInstanceOf(ForbiddenException);
        const response = (e as ForbiddenException).getResponse();
        expect(response).toMatchObject({
          code: "E_SIGHTING_SELF_CREATE",
          message: expect.any(String),
        });
      }
    });

    it("存在しないPostにSightingを作成しようとすると NotFoundException", async () => {
      mockPrisma.post.findUnique.mockResolvedValue(null);

      try {
        await service.create("other-user", dto);
        fail("例外がスローされるべき");
      } catch (e) {
        expect(e).toBeInstanceOf(NotFoundException);
        const response = (e as NotFoundException).getResponse();
        expect(response).toMatchObject({
          code: "E_POST_NOT_FOUND",
          message: expect.any(String),
        });
      }
    });
  });

  // ─── findByPost ─────────────────────────────────────────────
  describe("findByPost", () => {
    it("postIdに紐づくSighting一覧をcreatedAt降順で返すこと", async () => {
      const sightings = [
        { id: "s-2", postId: "post-1" },
        { id: "s-1", postId: "post-1" },
      ];
      mockPrisma.sighting.findMany.mockResolvedValue(sightings);

      const result = await service.findByPost("post-1");

      expect(mockPrisma.sighting.findMany).toHaveBeenCalledWith({
        where: { postId: "post-1" },
        orderBy: { createdAt: "desc" },
      });
      expect(result).toHaveLength(2);
    });
  });

  // ─── findOne ───────────────────────────────────────────────
  describe("findOne", () => {
    it("指定IDの目撃情報を報告者のニックネーム付きで返すこと", async () => {
      const sighting = {
        id: "s-1",
        postId: "post-1",
        userId: "user-1",
        lat: 35.9,
        lng: 139.6,
        address: "埼玉県さいたま市浦和区",
        sightedAt: new Date("2026-04-19T10:00:00.000Z"),
        comment: "公園付近で目撃",
        createdAt: new Date("2026-04-19T10:00:00.000Z"),
        user: { nickname: "報告者ニックネーム" },
      };
      mockPrisma.sighting.findUnique.mockResolvedValue(sighting);

      const result = await service.findOne("s-1");

      expect(mockPrisma.sighting.findUnique).toHaveBeenCalledWith({
        where: { id: "s-1" },
        include: { user: { select: { nickname: true } } },
      });
      expect(result).toEqual({
        id: "s-1",
        postId: "post-1",
        userId: "user-1",
        lat: 35.9,
        lng: 139.6,
        address: "埼玉県さいたま市浦和区",
        sightedAt: new Date("2026-04-19T10:00:00.000Z"),
        comment: "公園付近で目撃",
        createdAt: new Date("2026-04-19T10:00:00.000Z"),
        nickname: "報告者ニックネーム",
      });
    });

    it("存在しないIDを指定するとNotFoundExceptionを送出すること", async () => {
      mockPrisma.sighting.findUnique.mockResolvedValue(null);

      try {
        await service.findOne("nonexistent");
        fail("例外がスローされるべき");
      } catch (e) {
        expect(e).toBeInstanceOf(NotFoundException);
        const response = (e as NotFoundException).getResponse();
        expect(response).toMatchObject({
          code: "E_SIGHTING_NOT_FOUND",
          message: expect.any(String),
        });
      }
    });
  });

  // ─── remove ─────────────────────────────────────────────────
  describe("remove", () => {
    it("本人がSightingを削除できること", async () => {
      mockPrisma.sighting.findUnique.mockResolvedValue({
        id: "s-1",
        userId: "user-1",
      });

      await service.remove("user-1", "s-1");

      expect(mockPrisma.sighting.delete).toHaveBeenCalledWith({
        where: { id: "s-1" },
      });
    });

    it("他者が削除しようとすると ForbiddenException", async () => {
      mockPrisma.sighting.findUnique.mockResolvedValue({
        id: "s-1",
        userId: "user-1",
      });

      try {
        await service.remove("other-user", "s-1");
        fail("例外がスローされるべき");
      } catch (e) {
        expect(e).toBeInstanceOf(ForbiddenException);
        const response = (e as ForbiddenException).getResponse();
        expect(response).toMatchObject({
          code: "E_SIGHTING_NOT_OWNER",
          message: expect.any(String),
        });
      }
    });

    it("存在しないSightingを削除しようとすると NotFoundException", async () => {
      mockPrisma.sighting.findUnique.mockResolvedValue(null);

      try {
        await service.remove("user-1", "s-1");
        fail("例外がスローされるべき");
      } catch (e) {
        expect(e).toBeInstanceOf(NotFoundException);
        const response = (e as NotFoundException).getResponse();
        expect(response).toMatchObject({
          code: "E_SIGHTING_NOT_FOUND",
          message: expect.any(String),
        });
      }
    });

    it("管理者は他者のSightingを削除できること", async () => {
      mockPrisma.sighting.findUnique.mockResolvedValue({
        id: "s-1",
        userId: "user-1",
      });

      await service.remove("admin-user", "s-1", true);

      expect(mockPrisma.sighting.delete).toHaveBeenCalledWith({
        where: { id: "s-1" },
      });
    });
  });

  // ─── toggleFavorite ─────────────────────────────────────────
  describe("toggleFavorite", () => {
    const userId = "user-1";
    const sightingId = "s-1";
    const existingSighting = { id: sightingId, userId: "other-user" };

    it("お気に入りしていない状態でtoggleFavoriteを呼ぶと { favorited: true } を返す", async () => {
      mockPrisma.sighting.findUnique.mockResolvedValue(existingSighting);
      mockPrisma.sightingFavorite.findUnique.mockResolvedValue(null);
      mockPrisma.sightingFavorite.count.mockResolvedValue(0);
      mockPrisma.sightingFavorite.create.mockResolvedValue({ id: "fav-1" });

      const result = await service.toggleFavorite(userId, sightingId);

      expect(result).toEqual({ favorited: true });
      expect(mockPrisma.sightingFavorite.create).toHaveBeenCalledWith({
        data: { userId, sightingId },
      });
    });

    it("既にお気に入り済みの状態でtoggleFavoriteを呼ぶと { favorited: false } を返す", async () => {
      mockPrisma.sighting.findUnique.mockResolvedValue(existingSighting);
      mockPrisma.sightingFavorite.findUnique.mockResolvedValue({ id: "fav-1" });
      mockPrisma.sightingFavorite.delete.mockResolvedValue({ id: "fav-1" });

      const result = await service.toggleFavorite(userId, sightingId);

      expect(result).toEqual({ favorited: false });
      expect(mockPrisma.sightingFavorite.delete).toHaveBeenCalledWith({
        where: { userId_sightingId: { userId, sightingId } },
      });
    });

    it("自分の目撃情報をお気に入りしようとすると ForbiddenException", async () => {
      mockPrisma.sighting.findUnique.mockResolvedValue({
        id: sightingId,
        userId,
      });

      try {
        await service.toggleFavorite(userId, sightingId);
        fail("例外がスローされるべき");
      } catch (e) {
        expect(e).toBeInstanceOf(ForbiddenException);
        const response = (e as ForbiddenException).getResponse();
        expect(response).toMatchObject({
          code: "E_SIGHTING_SELF_FAVORITE",
          message: expect.any(String),
        });
      }
    });

    it("お気に入りが20件の状態でtoggleFavoriteを呼ぶと BadRequestException", async () => {
      mockPrisma.sighting.findUnique.mockResolvedValue(existingSighting);
      mockPrisma.sightingFavorite.findUnique.mockResolvedValue(null);
      mockPrisma.sightingFavorite.count.mockResolvedValue(20);

      try {
        await service.toggleFavorite(userId, sightingId);
        fail("例外がスローされるべき");
      } catch (e) {
        expect(e).toBeInstanceOf(BadRequestException);
        const response = (e as BadRequestException).getResponse();
        expect(response).toMatchObject({
          code: "E_SIGHTING_FAVORITE_LIMIT",
          message: expect.any(String),
        });
      }
    });

    it("存在しないSightingをお気に入りしようとすると NotFoundException", async () => {
      mockPrisma.sighting.findUnique.mockResolvedValue(null);

      try {
        await service.toggleFavorite(userId, sightingId);
        fail("例外がスローされるべき");
      } catch (e) {
        expect(e).toBeInstanceOf(NotFoundException);
        const response = (e as NotFoundException).getResponse();
        expect(response).toMatchObject({
          code: "E_SIGHTING_NOT_FOUND",
          message: expect.any(String),
        });
      }
    });
  });
});
