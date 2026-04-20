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

  // ─── toggleFavorite ──────────────────────────────────────────
  describe("toggleFavorite", () => {
    it("{ favorited: true } を返す", async () => {
      mockSightingsService.toggleFavorite.mockResolvedValue({
        favorited: true,
      });
      const req = { user: { id: "user1" } };

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
      const req = { user: { id: "user1" } };

      const result = await controller.toggleFavorite(req as any, "s-1");

      expect(result).toEqual({ favorited: false });
    });

    it("BadRequestException を伝播する", async () => {
      mockSightingsService.toggleFavorite.mockRejectedValue(
        new BadRequestException()
      );
      const req = { user: { id: "user1" } };

      await expect(
        controller.toggleFavorite(req as any, "s-1")
      ).rejects.toThrow(BadRequestException);
    });

    it("NotFoundException を伝播する", async () => {
      mockSightingsService.toggleFavorite.mockRejectedValue(
        new NotFoundException()
      );
      const req = { user: { id: "user1" } };

      await expect(
        controller.toggleFavorite(req as any, "s-1")
      ).rejects.toThrow(NotFoundException);
    });
  });
});
