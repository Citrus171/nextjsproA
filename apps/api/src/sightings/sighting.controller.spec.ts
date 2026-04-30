import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { SightingsController } from "./sighting.controller";
import { SightingsService } from "./sighting.service";

const mockSightingsService = {
  create: jest.fn(),
  findByPost: jest.fn(),
  findOne: jest.fn(),
  remove: jest.fn(),
  toggleFavorite: jest.fn(),
};

describe("SightingsController", () => {
  let controller: SightingsController;

  beforeEach(() => {
    controller = new SightingsController(
      mockSightingsService as unknown as SightingsService
    );
    jest.clearAllMocks();
  });

  // ─── create ─────────────────────────────────────────────────
  describe("create", () => {
    it("目撃情報を作成してサービスの結果を返すこと", async () => {
      const sighting = { id: "s-1", postId: "p-1", userId: "user-1" };
      mockSightingsService.create.mockResolvedValue(sighting);
      const req = {
        user: { id: "user-1", email: "test@test.com", role: "user" as const },
      };
      const dto = { postId: "p-1", lat: 35.0, lng: 139.0, note: "test" };

      const result = await controller.create(req, dto as any);

      expect(mockSightingsService.create).toHaveBeenCalledWith("user-1", dto);
      expect(result).toBe(sighting);
    });
  });

  // ─── findByPost ───────────────────────────────────────────────
  describe("findByPost", () => {
    it("postIdに紐づく目撃情報一覧を返すこと", async () => {
      const sightings = [{ id: "s-1" }, { id: "s-2" }];
      mockSightingsService.findByPost.mockResolvedValue(sightings);

      const result = await controller.findByPost("p-1");

      expect(mockSightingsService.findByPost).toHaveBeenCalledWith("p-1");
      expect(result).toBe(sightings);
    });
  });

  // ─── findOne ──────────────────────────────────────────────────
  describe("findOne", () => {
    it("指定IDの目撃詳細を返すこと", async () => {
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
        nickname: "報告者",
      };
      mockSightingsService.findOne.mockResolvedValue(sighting);

      const result = await controller.findOne("s-1");

      expect(mockSightingsService.findOne).toHaveBeenCalledWith("s-1");
      expect(result).toEqual(sighting);
    });

    it("NotFoundException を伝播する", async () => {
      mockSightingsService.findOne.mockRejectedValue(new NotFoundException());

      await expect(controller.findOne("nonexistent")).rejects.toThrow(
        NotFoundException
      );
    });
  });

  // ─── remove ──────────────────────────────────────────────────
  describe("remove", () => {
    it("目撃情報を削除してサービスの結果を返すこと", async () => {
      mockSightingsService.remove.mockResolvedValue({ id: "s-1" });
      const req = {
        user: { id: "user-1", email: "test@test.com", role: "user" as const },
      };

      const result = await controller.remove(req, "s-1");

      expect(mockSightingsService.remove).toHaveBeenCalledWith(
        "user-1",
        "s-1",
        false
      );
      expect(result).toEqual({ id: "s-1" });
    });

    it("ForbiddenException を伝播する", async () => {
      mockSightingsService.remove.mockRejectedValue(new ForbiddenException());
      const req = {
        user: { id: "user-1", email: "test@test.com", role: "user" as const },
      };

      await expect(controller.remove(req, "s-1")).rejects.toThrow(
        ForbiddenException
      );
    });
  });

  // ─── toggleFavorite ──────────────────────────────────────────
  describe("toggleFavorite", () => {
    it("{ favorited: true } を返す", async () => {
      mockSightingsService.toggleFavorite.mockResolvedValue({
        favorited: true,
      });
      const req = {
        user: { id: "user1", email: "test@test.com", role: "user" as const },
      };

      const result = await controller.toggleFavorite(req as any, "s-1");

      expect(mockSightingsService.toggleFavorite).toHaveBeenCalledWith(
        "user1",
        "s-1"
      );
      expect(result).toEqual({ favorited: true });
    });

    it("{ favorited: false } を返す（解除）", async () => {
      mockSightingsService.toggleFavorite.mockResolvedValue({
        favorited: false,
      });
      const req = {
        user: { id: "user1", email: "test@test.com", role: "user" as const },
      };

      const result = await controller.toggleFavorite(req as any, "s-1");

      expect(result).toEqual({ favorited: false });
    });

    it("BadRequestException を伝播する", async () => {
      mockSightingsService.toggleFavorite.mockRejectedValue(
        new BadRequestException()
      );
      const req = {
        user: { id: "user1", email: "test@test.com", role: "user" as const },
      };

      await expect(
        controller.toggleFavorite(req as any, "s-1")
      ).rejects.toThrow(BadRequestException);
    });

    it("NotFoundException を伝播する", async () => {
      mockSightingsService.toggleFavorite.mockRejectedValue(
        new NotFoundException()
      );
      const req = {
        user: { id: "user1", email: "test@test.com", role: "user" as const },
      };

      await expect(
        controller.toggleFavorite(req as any, "s-1")
      ).rejects.toThrow(NotFoundException);
    });
  });
});
