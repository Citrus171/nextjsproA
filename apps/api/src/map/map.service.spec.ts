import { MapService } from "./map.service";

const mockPrisma = {
  post: {
    findMany: jest.fn(),
  },
  sighting: {
    findMany: jest.fn(),
  },
};

describe("MapService", () => {
  let service: MapService;

  beforeEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    service = new MapService(mockPrisma as any);
    jest.clearAllMocks();
  });

  describe("getMarkers", () => {
    it("bbox内のPostマーカーが type='post' で返ること", async () => {
      mockPrisma.post.findMany.mockResolvedValue([
        { id: "post-1", status: "lost", location: { lat: 35.9, lng: 139.6 } },
      ]);
      mockPrisma.sighting.findMany.mockResolvedValue([]);

      const result = await service.getMarkers({
        minLat: 35.0,
        maxLat: 36.0,
        minLng: 139.0,
        maxLng: 140.0,
      });

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        type: "post",
        id: "post-1",
        lat: 35.9,
        lng: 139.6,
        status: "lost",
      });
    });

    it("bbox内のSightingマーカーが type='sighting' で返ること", async () => {
      mockPrisma.post.findMany.mockResolvedValue([]);
      mockPrisma.sighting.findMany.mockResolvedValue([
        {
          id: "s-1",
          postId: "post-1",
          lat: 35.85,
          lng: 139.55,
          post: { status: "lost" },
        },
      ]);

      const result = await service.getMarkers({
        minLat: 35.0,
        maxLat: 36.0,
        minLng: 139.0,
        maxLng: 140.0,
      });

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        type: "sighting",
        id: "s-1",
        postId: "post-1",
        lat: 35.85,
        lng: 139.55,
        status: "lost",
      });
    });
    it("statusフィルタ指定時にPostクエリのwhereにstatusが含まれること", async () => {
      mockPrisma.post.findMany.mockResolvedValue([]);
      mockPrisma.sighting.findMany.mockResolvedValue([]);

      await service.getMarkers({ status: "lost" });

      const postCall = mockPrisma.post.findMany.mock.calls[0][0];
      expect(postCall.where.status).toBe("lost");
    });

    it("statusフィルタ指定時にSightingクエリのwhereにpost.statusが含まれること", async () => {
      mockPrisma.post.findMany.mockResolvedValue([]);
      mockPrisma.sighting.findMany.mockResolvedValue([]);

      await service.getMarkers({ status: "resolved" });

      const sightingCall = mockPrisma.sighting.findMany.mock.calls[0][0];
      expect(sightingCall.where.post).toEqual({ status: "resolved" });
    });

    it("bboxクエリ条件がPostのlocation.lat/lngフィルタとして渡ること", async () => {
      mockPrisma.post.findMany.mockResolvedValue([]);
      mockPrisma.sighting.findMany.mockResolvedValue([]);

      await service.getMarkers({
        minLat: 35.0,
        maxLat: 36.0,
        minLng: 139.0,
        maxLng: 140.0,
      });

      const postCall = mockPrisma.post.findMany.mock.calls[0][0];
      expect(postCall.where.location).toMatchObject({
        lat: { gte: 35.0, lte: 36.0 },
        lng: { gte: 139.0, lte: 140.0 },
      });
    });

    it("bboxクエリ条件がSightingのlat/lngフィルタとして渡ること", async () => {
      mockPrisma.post.findMany.mockResolvedValue([]);
      mockPrisma.sighting.findMany.mockResolvedValue([]);

      await service.getMarkers({
        minLat: 35.0,
        maxLat: 36.0,
        minLng: 139.0,
        maxLng: 140.0,
      });

      const sightingCall = mockPrisma.sighting.findMany.mock.calls[0][0];
      expect(sightingCall.where.lat).toMatchObject({ gte: 35.0, lte: 36.0 });
      expect(sightingCall.where.lng).toMatchObject({ gte: 139.0, lte: 140.0 });
    });

    it("フィルタなしで全マーカー（Post+Sighting）が返ること", async () => {
      mockPrisma.post.findMany.mockResolvedValue([
        { id: "post-1", status: "lost", location: { lat: 35.9, lng: 139.6 } },
      ]);
      mockPrisma.sighting.findMany.mockResolvedValue([
        {
          id: "s-1",
          postId: "post-1",
          lat: 35.85,
          lng: 139.55,
          post: { status: "lost" },
        },
      ]);

      const result = await service.getMarkers({});

      expect(result).toHaveLength(2);
      expect(result.map((r) => r.type)).toEqual(
        expect.arrayContaining(["post", "sighting"])
      );
    });
  });
});
