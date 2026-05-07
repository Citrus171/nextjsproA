import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { ConversationsService } from "./conversation.service";
import { PrismaService } from "../prisma.service";

const mockPrisma = {
  post: { findUnique: jest.fn() },
  sighting: { findUnique: jest.fn() },
  conversation: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
  },
  message: {
    create: jest.fn(),
    findMany: jest.fn(),
    updateMany: jest.fn(),
    count: jest.fn(),
  },
};

describe("ConversationsService", () => {
  let service: ConversationsService;

  beforeEach(() => {
    service = new ConversationsService(mockPrisma as unknown as PrismaService);
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
        postId: "post-1",
        userId: "sighter-1",
      });
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

    it("同一postId+sightingIdの会話は既存の会話を返すこと", async () => {
      mockPrisma.post.findUnique.mockResolvedValue({
        id: "post-1",
        userId: "owner-1",
      });
      mockPrisma.sighting.findUnique.mockResolvedValue({
        id: "sighting-1",
        postId: "post-1",
        userId: "sighter-1",
      });
      mockPrisma.conversation.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
          code: "P2002",
          clientVersion: "0.0.0",
        })
      );
      mockPrisma.conversation.findFirst.mockResolvedValue({
        id: "conv-1",
        postId: "post-1",
        sightingId: "sighting-1",
        ownerId: "owner-1",
        sighterId: "sighter-1",
      });

      const result = await service.create("owner-1", dto);

      expect(mockPrisma.conversation.findFirst).toHaveBeenCalledWith({
        where: { postId: "post-1", sightingId: "sighting-1" },
      });
      expect(result).toMatchObject({ id: "conv-1" });
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
        postId: "post-1",
        userId: "sighter-1",
      });

      await expect(service.create("stranger", dto)).rejects.toThrow(
        ForbiddenException
      );
    });

    it("standalone Sighting は NotFoundException で会話を作成できないこと", async () => {
      mockPrisma.post.findUnique.mockResolvedValue({
        id: "post-1",
        userId: "owner-1",
      });
      mockPrisma.sighting.findUnique.mockResolvedValue({
        id: "sighting-1",
        postId: null,
        userId: "sighter-1",
      });

      await expect(service.create("owner-1", dto)).rejects.toThrow(
        NotFoundException
      );
    });
  });

  // ─── findAllForUser ─────────────────────────────────────────
  describe("findAllForUser", () => {
    const mockConversations = [
      {
        id: "conv-1",
        postId: "post-1",
        sightingId: "sighting-1",
        ownerId: "user-1",
        sighterId: "sighter-1",
        createdAt: new Date("2024-01-01"),
        post: { title: "迷子のネコ" },
        owner: { nickname: "ownerNick" },
        sighter: { nickname: "sighterNick" },
        messages: [
          { body: "最新メッセージ", createdAt: new Date("2024-01-02") },
        ],
        _count: { messages: 2 },
      },
      {
        id: "conv-2",
        postId: "post-2",
        sightingId: "sighting-2",
        ownerId: "owner-2",
        sighterId: "user-1",
        createdAt: new Date("2024-01-01"),
        post: { title: null },
        owner: { nickname: "owner2Nick" },
        sighter: { nickname: "user1Nick" },
        messages: [],
        _count: { messages: 0 },
      },
    ];

    it("自分がownerまたはsighterとして参加する会話一覧をinclude付きで取得すること", async () => {
      mockPrisma.conversation.findMany.mockResolvedValue(mockConversations);

      await service.findAllForUser("user-1");

      expect(mockPrisma.conversation.findMany).toHaveBeenCalledWith({
        where: {
          OR: [{ ownerId: "user-1" }, { sighterId: "user-1" }],
        },
        include: {
          post: { select: { title: true } },
          owner: { select: { nickname: true } },
          sighter: { select: { nickname: true } },
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { body: true, createdAt: true },
          },
          _count: {
            select: {
              messages: {
                where: { senderId: { not: "user-1" }, readAt: null },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });
    });

    it("ownerの場合は相手（sighter）のニックネームをpartnerNicknameとして返すこと", async () => {
      mockPrisma.conversation.findMany.mockResolvedValue([
        mockConversations[0],
      ]);

      const result = await service.findAllForUser("user-1");

      expect(result[0]).toMatchObject({
        id: "conv-1",
        partnerNickname: "sighterNick",
        postTitle: "迷子のネコ",
        lastMessage: {
          body: "最新メッセージ",
          createdAt: new Date("2024-01-02"),
        },
        unreadCount: 2,
      });
    });

    it("sighterの場合は相手（owner）のニックネームをpartnerNicknameとして返すこと", async () => {
      mockPrisma.conversation.findMany.mockResolvedValue([
        mockConversations[1],
      ]);

      const result = await service.findAllForUser("user-1");

      expect(result[0]).toMatchObject({
        id: "conv-2",
        partnerNickname: "owner2Nick",
        postTitle: null,
        lastMessage: null,
        unreadCount: 0,
      });
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
          imageUrl: null,
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

    it("imageUrlのみ指定でメッセージを送信できること", async () => {
      mockPrisma.conversation.findUnique.mockResolvedValue(conversation);
      mockPrisma.message.create.mockResolvedValue({
        id: "msg-2",
        conversationId: "conv-1",
        senderId: "user-1",
        body: null,
        imageUrl: "/uploads/conversations/conv-1/uuid.jpg",
        readAt: null,
      });

      const result = await service.createMessage("user-1", "conv-1", {
        imageUrl: "/uploads/conversations/conv-1/uuid.jpg",
      });

      expect(mockPrisma.message.create).toHaveBeenCalledWith({
        data: {
          conversationId: "conv-1",
          senderId: "user-1",
          body: null,
          imageUrl: "/uploads/conversations/conv-1/uuid.jpg",
        },
      });
      expect(result).toMatchObject({ id: "msg-2" });
    });

    it("bodyとimageUrl両方指定でメッセージを送信できること", async () => {
      mockPrisma.conversation.findUnique.mockResolvedValue(conversation);
      mockPrisma.message.create.mockResolvedValue({
        id: "msg-3",
        conversationId: "conv-1",
        senderId: "user-1",
        body: "写真を送ります",
        imageUrl: "/uploads/conversations/conv-1/uuid.jpg",
        readAt: null,
      });

      const result = await service.createMessage("user-1", "conv-1", {
        body: "写真を送ります",
        imageUrl: "/uploads/conversations/conv-1/uuid.jpg",
      });

      expect(mockPrisma.message.create).toHaveBeenCalledWith({
        data: {
          conversationId: "conv-1",
          senderId: "user-1",
          body: "写真を送ります",
          imageUrl: "/uploads/conversations/conv-1/uuid.jpg",
        },
      });
      expect(result).toMatchObject({ id: "msg-3" });
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

  // ─── getUnreadCount ─────────────────────────────────────────
  describe("getUnreadCount", () => {
    it("ユーザーの全未読メッセージ数を返すこと", async () => {
      mockPrisma.message.count.mockResolvedValue(5);

      const result = await service.getUnreadCount("user-1");

      expect(mockPrisma.message.count).toHaveBeenCalledWith({
        where: {
          senderId: { not: "user-1" },
          readAt: null,
          conversation: {
            OR: [{ ownerId: "user-1" }, { sighterId: "user-1" }],
          },
        },
      });
      expect(result).toEqual({ count: 5 });
    });

    it("未読メッセージがない場合は 0 を返すこと", async () => {
      mockPrisma.message.count.mockResolvedValue(0);

      const result = await service.getUnreadCount("user-1");

      expect(result).toEqual({ count: 0 });
    });
  });

  // ─── findOneForUser ────────────────────────────────────────
  describe("findOneForUser", () => {
    const mockConv = {
      id: "conv-1",
      postId: "post-1",
      sightingId: "sighting-1",
      ownerId: "owner-1",
      sighterId: "sighter-1",
      createdAt: new Date("2024-01-01"),
      post: { title: "迷子のネコ" },
      owner: { nickname: "オーナー" },
      sighter: { nickname: "目撃者" },
      messages: [{ body: "最新メッセージ", createdAt: new Date("2024-01-02") }],
      _count: { messages: 0 },
    };

    it("投稿者が会話を取得すると相手は目撃者のニックネームであること", async () => {
      mockPrisma.conversation.findFirst.mockResolvedValue(mockConv);

      const result = await service.findOneForUser("owner-1", "conv-1");

      expect(result.partnerNickname).toBe("目撃者");
      expect(result.postTitle).toBe("迷子のネコ");
    });

    it("目撃者が会話を取得すると相手は投稿者のニックネームであること", async () => {
      mockPrisma.conversation.findFirst.mockResolvedValue(mockConv);

      const result = await service.findOneForUser("sighter-1", "conv-1");

      expect(result.partnerNickname).toBe("オーナー");
    });

    it("参加者以外が会話を取得するとNotFoundException", async () => {
      mockPrisma.conversation.findFirst.mockResolvedValue(null);

      await expect(
        service.findOneForUser("stranger", "conv-1")
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── markAsRead ─────────────────────────────────────────────
  describe("markAsRead", () => {
    const conversation = {
      id: "conv-1",
      ownerId: "user-1",
      sighterId: "sighter-1",
    };

    it("相手が送ったunreadメッセージをすべて既読にすること", async () => {
      mockPrisma.conversation.findUnique.mockResolvedValue(conversation);
      mockPrisma.message.updateMany.mockResolvedValue({ count: 3 });

      const result = await service.markAsRead("user-1", "conv-1");

      expect(mockPrisma.message.updateMany).toHaveBeenCalledWith({
        where: {
          conversationId: "conv-1",
          senderId: { not: "user-1" },
          readAt: null,
        },
        data: { readAt: expect.any(Date) },
      });
      expect(result).toEqual({ count: 3 });
    });

    it("会話参加者以外はForbiddenException", async () => {
      mockPrisma.conversation.findUnique.mockResolvedValue(conversation);

      await expect(service.markAsRead("stranger", "conv-1")).rejects.toThrow(
        ForbiddenException
      );
    });

    it("存在しない会話はNotFoundException", async () => {
      mockPrisma.conversation.findUnique.mockResolvedValue(null);

      await expect(service.markAsRead("user-1", "conv-999")).rejects.toThrow(
        NotFoundException
      );
    });
  });
});
