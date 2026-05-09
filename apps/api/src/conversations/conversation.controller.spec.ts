import { BadRequestException } from "@nestjs/common";
import { ConversationsController } from "./conversation.controller";
import { ConversationFileStorageService } from "./conversation-file-storage.service";

const mockService = {
  create: jest.fn(),
  findAllForUser: jest.fn(),
  findOneForUser: jest.fn(),
  createMessage: jest.fn(),
  findMessages: jest.fn(),
  markAsRead: jest.fn(),
  getUnreadCount: jest.fn(),
};

const mockGateway = {
  broadcastMessage: jest.fn(),
};

const mockFileStorage: jest.Mocked<ConversationFileStorageService> = {
  saveFile: jest.fn(),
  deleteFile: jest.fn(),
} as unknown as jest.Mocked<ConversationFileStorageService>;

const req = {
  user: { id: "user-1", email: "test@test.com", role: "user" as const },
};

describe("ConversationsController", () => {
  let controller: ConversationsController;

  beforeEach(() => {
    controller = new ConversationsController(
      mockService as never,
      mockGateway as never,
      mockFileStorage
    );
    jest.clearAllMocks();
  });

  // ─── create ─────────────────────────────────────────────────
  describe("create", () => {
    it("会話を作成してサービスの結果を返すこと", async () => {
      const conversation = {
        id: "conv-1",
        participantIds: ["user-1", "user-2"],
      };
      mockService.create.mockResolvedValue(conversation);

      const dto = { postId: "p-1", sightingId: "s-1" };
      const result = await controller.create(req, dto);

      expect(mockService.create).toHaveBeenCalledWith("user-1", dto);
      expect(result).toBe(conversation);
    });
  });

  // ─── findAll ─────────────────────────────────────────────────
  describe("findAll", () => {
    it("自分が参加する会話一覧を返すこと", async () => {
      const conversations = [{ id: "conv-1" }, { id: "conv-2" }];
      mockService.findAllForUser.mockResolvedValue(conversations);

      const result = await controller.findAll(req);

      expect(mockService.findAllForUser).toHaveBeenCalledWith("user-1");
      expect(result).toBe(conversations);
    });
  });

  // ─── createMessage ──────────────────────────────────────────
  describe("createMessage", () => {
    it("メッセージ作成後にbroadcastMessageを呼び出すこと", async () => {
      const message = {
        id: "msg-1",
        conversationId: "conv-1",
        senderId: "user-1",
        body: "hello",
        createdAt: new Date(),
        readAt: null,
      };
      mockService.createMessage.mockResolvedValue(message);

      const result = await controller.createMessage(req, "conv-1", {
        body: "hello",
      });

      expect(mockService.createMessage).toHaveBeenCalledWith(
        "user-1",
        "conv-1",
        { body: "hello" }
      );
      expect(mockGateway.broadcastMessage).toHaveBeenCalledWith(
        "conv-1",
        message
      );
      expect(result).toBe(message);
    });

    it("サービスが例外を投げた場合はbroadcastMessageを呼ばないこと", async () => {
      mockService.createMessage.mockRejectedValue(new Error("forbidden"));

      await expect(
        controller.createMessage(req, "conv-1", { body: "hello" })
      ).rejects.toThrow("forbidden");

      expect(mockGateway.broadcastMessage).not.toHaveBeenCalled();
    });

    it("画像ファイルが添付された場合はfileStorageに保存してimageUrlを含むDTOでcreateMessageを呼ぶこと", async () => {
      const file = {
        buffer: Buffer.from("image"),
        originalname: "photo.jpg",
        mimetype: "image/jpeg",
        size: 100,
      } as Express.Multer.File;
      mockFileStorage.saveFile.mockResolvedValue(
        "uploads/conversations/conv-1/uuid.jpg"
      );
      const message = {
        id: "msg-2",
        conversationId: "conv-1",
        senderId: "user-1",
        body: null,
        imageUrl: "/uploads/conversations/conv-1/uuid.jpg",
        createdAt: new Date(),
        readAt: null,
      };
      mockService.createMessage.mockResolvedValue(message);

      const result = await controller.createMessage(req, "conv-1", {}, file);

      expect(mockFileStorage.saveFile).toHaveBeenCalledWith("conv-1", file);
      expect(mockService.createMessage).toHaveBeenCalledWith(
        "user-1",
        "conv-1",
        {
          imageUrl: "/uploads/conversations/conv-1/uuid.jpg",
        }
      );
      expect(result).toBe(message);
    });

    it("未対応のファイル形式（HEIC等）は400エラーになること", async () => {
      const file = {
        buffer: Buffer.from("heic"),
        originalname: "photo.heic",
        mimetype: "image/heic",
        size: 100,
      } as Express.Multer.File;

      try {
        await controller.createMessage(req, "conv-1", {}, file);
        fail("例外がスローされるべき");
      } catch (e) {
        expect(e).toBeInstanceOf(BadRequestException);
        const response = (e as BadRequestException).getResponse();
        expect(response).toMatchObject({
          code: "E_FILE_UNSUPPORTED_TYPE",
          message: expect.any(String),
        });
      }
    });

    it("GIF・WebP は許容されること", async () => {
      for (const mimetype of ["image/gif", "image/webp"]) {
        const file = {
          buffer: Buffer.from("data"),
          originalname: "image",
          mimetype,
          size: 100,
        } as Express.Multer.File;

        await expect(
          controller.createMessage(req, "conv-1", {}, file)
        ).resolves.not.toThrow();
      }
    });

    it("20MB超のファイルは400エラーになること", async () => {
      const file = {
        buffer: Buffer.alloc(0),
        originalname: "big.jpg",
        mimetype: "image/jpeg",
        size: 21 * 1024 * 1024,
      } as Express.Multer.File;

      try {
        await controller.createMessage(req, "conv-1", {}, file);
        fail("例外がスローされるべき");
      } catch (e) {
        expect(e).toBeInstanceOf(BadRequestException);
        const response = (e as BadRequestException).getResponse();
        expect(response).toMatchObject({
          code: "E_FILE_SIZE_EXCEEDED",
          message: expect.any(String),
        });
      }
    });
  });

  // ─── findMessages ───────────────────────────────────────────
  describe("findMessages", () => {
    it("会話内のメッセージ一覧を返すこと", async () => {
      const messages = [{ id: "msg-1", body: "hello" }];
      mockService.findMessages.mockResolvedValue(messages);

      const result = await controller.findMessages(req, "conv-1");

      expect(mockService.findMessages).toHaveBeenCalledWith("user-1", "conv-1");
      expect(result).toBe(messages);
    });
  });

  // ─── getUnreadCount ─────────────────────────────────────────
  describe("getUnreadCount", () => {
    it("ユーザーの未読メッセージ数を返すこと", async () => {
      mockService.getUnreadCount.mockResolvedValue({ count: 3 });

      const result = await controller.getUnreadCount(req);

      expect(mockService.getUnreadCount).toHaveBeenCalledWith("user-1");
      expect(result).toEqual({ count: 3 });
    });
  });

  // ─── markAsRead ─────────────────────────────────────────────
  describe("markAsRead", () => {
    it("既読更新結果を返すこと", async () => {
      mockService.markAsRead.mockResolvedValue({ count: 2 });

      const result = await controller.markAsRead(req, "conv-1");

      expect(mockService.markAsRead).toHaveBeenCalledWith("user-1", "conv-1");
      expect(result).toEqual({ count: 2 });
    });
  });
});
