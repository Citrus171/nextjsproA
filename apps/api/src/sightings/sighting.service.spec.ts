import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { SightingsService } from "./sighting.service";

const mockPrisma = {
  post: { findUnique: jest.fn() },
  sighting: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    delete: jest.fn(),
  },
};

describe("SightingsService", () => {
  let service: SightingsService;

  beforeEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    service = new SightingsService(mockPrisma as any);
    jest.clearAllMocks();
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

    it("投稿者本人が自分のPostにSightingを作成しようとすると ForbiddenException", async () => {
      mockPrisma.post.findUnique.mockResolvedValue({
        id: "post-1",
        userId: "owner-1",
      });

      await expect(service.create("owner-1", dto)).rejects.toThrow(
        ForbiddenException
      );
    });

    it("存在しないPostにSightingを作成しようとすると NotFoundException", async () => {
      mockPrisma.post.findUnique.mockResolvedValue(null);

      await expect(service.create("other-user", dto)).rejects.toThrow(
        NotFoundException
      );
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

      await expect(service.remove("other-user", "s-1")).rejects.toThrow(
        ForbiddenException
      );
    });

    it("存在しないSightingを削除しようとすると NotFoundException", async () => {
      mockPrisma.sighting.findUnique.mockResolvedValue(null);

      await expect(service.remove("user-1", "s-1")).rejects.toThrow(
        NotFoundException
      );
    });
  });
});
