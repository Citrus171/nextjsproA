import { ConversationsController } from "./conversation.controller";

const mockService = {
  create: jest.fn(),
  findAllForUser: jest.fn(),
  createMessage: jest.fn(),
  findMessages: jest.fn(),
  markAsRead: jest.fn(),
};

const mockGateway = {
  broadcastMessage: jest.fn(),
};

const req = { user: { userId: "user-1" } };

describe("ConversationsController", () => {
  let controller: ConversationsController;

  beforeEach(() => {
    controller = new ConversationsController(
      mockService as never,
      mockGateway as never
    );
    jest.clearAllMocks();
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
