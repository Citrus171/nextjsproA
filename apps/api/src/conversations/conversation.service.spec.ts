import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { ConversationsService } from "./conversation.service";

const mockPrisma = {
  post: { findUnique: jest.fn() },
  sighting: { findUnique: jest.fn() },
  conversation: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
  },
  message: {
    create: jest.fn(),
    findMany: jest.fn(),
    updateMany: jest.fn(),
  },
};

describe("ConversationsService", () => {
  let service: ConversationsService;

  beforeEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    service = new ConversationsService(mockPrisma as any);
    jest.clearAllMocks();
  });

  // ─── create ────────────────────────────────────────────────
  describe("create", () => {
    const dto = { postId: "post-1", sightingId: "sighting-1" };

    it("有効なデータで会話を作成できること", async () => {
      mockPrisma.post.findUnique.mockResolvedValue({
        id: "post-1",
        userId: "owner-1",
      });
      mockPrisma.sighting.findUnique.mockResolvedValue({
        id: "sighting-1",
        userId: "sighter-1",
      });
      mockPrisma.conversation.findUnique.mockResolvedValue(null);
      mockPrisma.conversation.create.mockResolvedValue({
        id: "conv-1",
        postId: "post-1",
        sightingId: "sighting-1",
        ownerId: "owner-1",
        sighterId: "sighter-1",
      });

      const result = await service.create("owner-1", dto);

      expect(mockPrisma.conversation.create).toHaveBeenCalledWith({
        data: {
          postId: "post-1",
          sightingId: "sighting-1",
          ownerId: "owner-1",
          sighterId: "sighter-1",
        },
      });
      expect(result).toMatchObject({ id: "conv-1" });
    });

    it("同一postId+sightingIdの会話はConflictException", async () => {
      mockPrisma.post.findUnique.mockResolvedValue({
        id: "post-1",
        userId: "owner-1",
      });
      mockPrisma.sighting.findUnique.mockResolvedValue({
        id: "sighting-1",
        userId: "sighter-1",
      });
      mockPrisma.conversation.findUnique.mockResolvedValue({ id: "conv-1" });

      await expect(service.create("owner-1", dto)).rejects.toThrow(
        ConflictException
      );
    });

    it("存在しないpostIdはNotFoundException", async () => {
      mockPrisma.post.findUnique.mockResolvedValue(null);

      await expect(service.create("owner-1", dto)).rejects.toThrow(
        NotFoundException
      );
    });

    it("存在しないsightingIdはNotFoundException", async () => {
      mockPrisma.post.findUnique.mockResolvedValue({
        id: "post-1",
        userId: "owner-1",
      });
      mockPrisma.sighting.findUnique.mockResolvedValue(null);

      await expect(service.create("owner-1", dto)).rejects.toThrow(
        NotFoundException
      );
    });

    it("会話参加者以外（無関係なユーザー）はForbiddenException", async () => {
      mockPrisma.post.findUnique.mockResolvedValue({
        id: "post-1",
        userId: "owner-1",
      });
      mockPrisma.sighting.findUnique.mockResolvedValue({
        id: "sighting-1",
        userId: "sighter-1",
      });

      await expect(service.create("stranger", dto)).rejects.toThrow(
        ForbiddenException
      );
    });
  });

  // ─── findAllForUser ─────────────────────────────────────────
  describe("findAllForUser", () => {
    it("自分がownerまたはsighterとして参加する会話一覧を返すこと", async () => {
      const conversations = [
        { id: "conv-1", ownerId: "user-1", sighterId: "sighter-1" },
        { id: "conv-2", ownerId: "owner-2", sighterId: "user-1" },
      ];
      mockPrisma.conversation.findMany.mockResolvedValue(conversations);

      const result = await service.findAllForUser("user-1");

      expect(mockPrisma.conversation.findMany).toHaveBeenCalledWith({
        where: {
          OR: [{ ownerId: "user-1" }, { sighterId: "user-1" }],
        },
        orderBy: { createdAt: "desc" },
      });
      expect(result).toHaveLength(2);
    });
  });

  // ─── createMessage ──────────────────────────────────────────
  describe("createMessage", () => {
    const conversation = {
      id: "conv-1",
      ownerId: "user-1",
      sighterId: "sighter-1",
    };

    it("会話参加者がメッセージを送信できること", async () => {
      mockPrisma.conversation.findUnique.mockResolvedValue(conversation);
      mockPrisma.message.create.mockResolvedValue({
        id: "msg-1",
        conversationId: "conv-1",
        senderId: "user-1",
        body: "こんにちは",
        readAt: null,
      });

      const result = await service.createMessage("user-1", "conv-1", {
        body: "こんにちは",
      });

      expect(mockPrisma.message.create).toHaveBeenCalledWith({
        data: {
          conversationId: "conv-1",
          senderId: "user-1",
          body: "こんにちは",
        },
      });
      expect(result).toMatchObject({ id: "msg-1" });
    });

    it("bodyが1000文字超過はBadRequestException", async () => {
      mockPrisma.conversation.findUnique.mockResolvedValue(conversation);

      await expect(
        service.createMessage("user-1", "conv-1", { body: "a".repeat(1001) })
      ).rejects.toThrow(BadRequestException);
    });

    it("会話参加者以外のメッセージ送信はForbiddenException", async () => {
      mockPrisma.conversation.findUnique.mockResolvedValue(conversation);

      await expect(
        service.createMessage("stranger", "conv-1", { body: "test" })
      ).rejects.toThrow(ForbiddenException);
    });

    it("存在しない会話へのメッセージはNotFoundException", async () => {
      mockPrisma.conversation.findUnique.mockResolvedValue(null);

      await expect(
        service.createMessage("user-1", "conv-999", { body: "test" })
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── findMessages ───────────────────────────────────────────
  describe("findMessages", () => {
    const conversation = {
      id: "conv-1",
      ownerId: "user-1",
      sighterId: "sighter-1",
    };

    it("会話参加者がメッセージ一覧を取得できること", async () => {
      mockPrisma.conversation.findUnique.mockResolvedValue(conversation);
      mockPrisma.message.findMany.mockResolvedValue([
        { id: "msg-1", body: "hello" },
        { id: "msg-2", body: "world" },
      ]);

      const result = await service.findMessages("user-1", "conv-1");

      expect(mockPrisma.message.findMany).toHaveBeenCalledWith({
        where: { conversationId: "conv-1" },
        orderBy: { createdAt: "asc" },
      });
      expect(result).toHaveLength(2);
    });

    it("会話参加者以外のメッセージ一覧取得はForbiddenException", async () => {
      mockPrisma.conversation.findUnique.mockResolvedValue(conversation);

      await expect(service.findMessages("stranger", "conv-1")).rejects.toThrow(
        ForbiddenException
      );
    });

    it("存在しない会話のメッセージ一覧はNotFoundException", async () => {
      mockPrisma.conversation.findUnique.mockResolvedValue(null);

      await expect(service.findMessages("user-1", "conv-999")).rejects.toThrow(
        NotFoundException
      );
    });
  });
});
