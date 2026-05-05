import { JwtService } from "@nestjs/jwt";
import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { ConversationsGateway } from "./conversations.gateway";
import { ConversationsService } from "./conversation.service";
import { Socket } from "socket.io";

function makeSocket(token?: string, authToken?: string): jest.Mocked<Socket> {
  return {
    handshake: {
      auth: authToken !== undefined ? { token: authToken } : {},
      headers: token !== undefined ? { authorization: token } : {},
    },
    data: {},
    disconnect: jest.fn(),
    join: jest.fn(),
    leave: jest.fn(),
  } as unknown as jest.Mocked<Socket>;
}

describe("ConversationsGateway", () => {
  let gateway: ConversationsGateway;
  let jwtService: jest.Mocked<JwtService>;
  let conversationsService: jest.Mocked<ConversationsService>;

  beforeEach(() => {
    jest.useFakeTimers();
    jwtService = { verify: jest.fn() } as unknown as jest.Mocked<JwtService>;
    conversationsService = {
      findOneForUser: jest.fn(),
    } as unknown as jest.Mocked<ConversationsService>;
    gateway = new ConversationsGateway(jwtService, conversationsService);
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  // ─── handleConnection ──────────────────────────────────────
  describe("handleConnection", () => {
    it("トークンなしで接続した場合は切断される", () => {
      const client = makeSocket();
      gateway.handleConnection(client);
      expect(client.disconnect).toHaveBeenCalled();
    });

    it("無効なトークンで接続した場合は切断される", () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error("invalid token");
      });
      const client = makeSocket(undefined, "invalid.token");
      gateway.handleConnection(client);
      expect(client.disconnect).toHaveBeenCalled();
    });

    it("有効なトークンで接続した場合はsocket.data.userIdが設定される", () => {
      jwtService.verify.mockReturnValue({ sub: "user-1", email: "a@b.com" });
      const client = makeSocket(undefined, "valid.token");
      gateway.handleConnection(client);
      expect(client.disconnect).not.toHaveBeenCalled();
      expect(client.data.userId).toBe("user-1");
    });

    it("Authorizationヘッダー（Bearer形式）でも認証できる", () => {
      jwtService.verify.mockReturnValue({ sub: "user-2", email: "b@c.com" });
      const client = makeSocket("Bearer valid.token");
      gateway.handleConnection(client);
      expect(client.disconnect).not.toHaveBeenCalled();
      expect(client.data.userId).toBe("user-2");
    });
  });

  // ─── JWT 再検証 ─────────────────────────────────────────────
  describe("JWT 再検証", () => {
    it("joinConversation 時にトークンが期限切れの場合は切断されること", async () => {
      jwtService.verify
        .mockReturnValueOnce({ sub: "user-1", email: "a@b.com" })
        .mockImplementationOnce(() => {
          throw new Error("jwt expired");
        });
      const client = makeSocket(undefined, "token");
      gateway.handleConnection(client);

      await gateway.handleJoin("conv-1", client);

      expect(client.disconnect).toHaveBeenCalled();
      expect(client.join).not.toHaveBeenCalled();
    });

    it("leaveConversation 時にトークンが期限切れの場合は切断されること", () => {
      jwtService.verify
        .mockReturnValueOnce({ sub: "user-1", email: "a@b.com" })
        .mockImplementationOnce(() => {
          throw new Error("jwt expired");
        });
      const client = makeSocket(undefined, "token");
      gateway.handleConnection(client);

      gateway.handleLeave("conv-1", client);

      expect(client.disconnect).toHaveBeenCalled();
      expect(client.leave).not.toHaveBeenCalled();
    });
  });

  // ─── handleJoin ────────────────────────────────────────────
  describe("handleJoin", () => {
    it("userIdがない場合は切断されjoinしない", async () => {
      const client = makeSocket();
      await gateway.handleJoin("conv-1", client);
      expect(client.disconnect).toHaveBeenCalled();
      expect(client.join).not.toHaveBeenCalled();
    });

    it("会話参加権限がない場合は切断されjoinしない", async () => {
      conversationsService.findOneForUser.mockRejectedValue(
        new ForbiddenException()
      );
      const client = makeSocket();
      client.data.userId = "user-1";
      await gateway.handleJoin("conv-1", client);
      expect(client.disconnect).toHaveBeenCalled();
      expect(client.join).not.toHaveBeenCalled();
    });

    it("会話が存在しない場合は切断されjoinしない", async () => {
      conversationsService.findOneForUser.mockRejectedValue(
        new NotFoundException()
      );
      const client = makeSocket();
      client.data.userId = "user-1";
      await gateway.handleJoin("conv-1", client);
      expect(client.disconnect).toHaveBeenCalled();
      expect(client.join).not.toHaveBeenCalled();
    });

    it("会話参加権限がある場合は指定した会話ルームにjoinすること", async () => {
      jwtService.verify.mockReturnValue({ sub: "user-1", email: "a@b.com" });
      conversationsService.findOneForUser.mockResolvedValue({} as never);
      const client = makeSocket(undefined, "valid.token");
      gateway.handleConnection(client);
      await gateway.handleJoin("conv-1", client);
      expect(client.disconnect).not.toHaveBeenCalled();
      expect(client.join).toHaveBeenCalledWith("conversation:conv-1");
    });
  });

  // ─── handleLeave ───────────────────────────────────────────
  describe("handleLeave", () => {
    it("userIdがない場合は切断されleaveしない", () => {
      const client = makeSocket();
      gateway.handleLeave("conv-1", client);
      expect(client.disconnect).toHaveBeenCalled();
      expect(client.leave).not.toHaveBeenCalled();
    });

    it("userIdがある場合は指定した会話ルームからleaveすること", () => {
      jwtService.verify.mockReturnValue({ sub: "user-1", email: "a@b.com" });
      const client = makeSocket(undefined, "valid.token");
      gateway.handleConnection(client);
      gateway.handleLeave("conv-1", client);
      expect(client.disconnect).not.toHaveBeenCalled();
      expect(client.leave).toHaveBeenCalledWith("conversation:conv-1");
    });
  });

  // ─── handleDisconnect ─────────────────────────────────────
  describe("handleDisconnect", () => {
    it("切断時に userSocketMap から該当エントリが削除されること", () => {
      jwtService.verify.mockReturnValue({ sub: "user-1", email: "a@b.com" });
      const client = makeSocket(undefined, "valid.token");
      gateway.handleConnection(client);

      gateway.handleDisconnect(client);

      // broadcastMessage で senderSocketId が undefined になることで検証
      const emitMock = jest.fn();
      const toMock = jest.fn().mockReturnValue({ emit: emitMock });
      gateway.server = { to: toMock } as never;
      gateway.broadcastMessage("conv-1", {
        id: "m1",
        conversationId: "conv-1",
        senderId: "user-1",
        body: "hi",
        createdAt: new Date(),
      } as import("@prisma/client").Message);
      // except は呼ばれず to のみで emit されること（マップから削除済みのため）
      expect(toMock).toHaveBeenCalledWith("conversation:conv-1");
    });

    it("別のソケットで上書きされている場合は削除しないこと", () => {
      jwtService.verify.mockReturnValue({ sub: "user-1", email: "a@b.com" });
      const client1 = makeSocket(undefined, "valid.token");
      const client2 = {
        ...makeSocket(undefined, "valid.token"),
        id: "other-socket-id",
      } as jest.Mocked<Socket>;
      gateway.handleConnection(client1);
      gateway.handleConnection(client2);

      // client1 が切断してもclient2のエントリは残る
      gateway.handleDisconnect(client1);

      const emitMock = jest.fn();
      const exceptMock = jest.fn().mockReturnValue({ emit: emitMock });
      const toMock = jest
        .fn()
        .mockReturnValue({ emit: emitMock, except: exceptMock });
      gateway.server = {
        to: toMock,
        except: jest.fn().mockReturnValue({ to: toMock }),
      } as never;
      // マップにまだ user-1 のエントリが残っていること（client2 の socketId）
      // broadcastMessage が except を使う = マップにエントリあり
      const exceptServer = {
        to: jest.fn().mockReturnValue({ emit: emitMock }),
      };
      gateway.server = {
        to: toMock,
        except: jest.fn().mockReturnValue(exceptServer),
      } as never;
      gateway.broadcastMessage("conv-1", {
        id: "m2",
        conversationId: "conv-1",
        senderId: "user-1",
        body: "hi",
        createdAt: new Date(),
      } as import("@prisma/client").Message);
      expect(
        (gateway.server as never as { except: jest.Mock }).except
      ).toHaveBeenCalled();
    });
  });

  // ─── 定期JWT検証 ─────────────────────────────────────────
  describe("定期JWT検証", () => {
    it("トークンが期限切れの場合、60秒後に定期チェックで切断されること", () => {
      jwtService.verify
        .mockReturnValueOnce({ sub: "user-1", email: "a@b.com" })
        .mockImplementationOnce(() => {
          throw new Error("jwt expired");
        });
      const client = makeSocket(undefined, "valid.token");
      gateway.handleConnection(client);

      jest.advanceTimersByTime(60000);

      expect(client.disconnect).toHaveBeenCalled();
    });

    it("有効なトークンを保持している場合、60秒経過後も切断されないこと", () => {
      jwtService.verify.mockReturnValue({ sub: "user-1", email: "a@b.com" });
      const client = makeSocket(undefined, "valid.token");
      gateway.handleConnection(client);

      jest.advanceTimersByTime(60000);

      expect(client.disconnect).not.toHaveBeenCalled();
    });

    it("切断時に定期チェックのタイマーが解除されること", () => {
      const clearIntervalSpy = jest.spyOn(global, "clearInterval");
      jwtService.verify.mockReturnValue({ sub: "user-1", email: "a@b.com" });
      const client = makeSocket(undefined, "valid.token");
      gateway.handleConnection(client);

      gateway.handleDisconnect(client);

      expect(clearIntervalSpy).toHaveBeenCalled();
      clearIntervalSpy.mockRestore();
    });
  });

  // ─── refreshToken ────────────────────────────────────────
  describe("refreshToken", () => {
    it("有効なトークンで client.data.token が更新され、tokenRefreshed が emit されること", () => {
      const client = makeSocket();
      client.data.userId = "user-1";
      client.data.token = "old-token";
      client.emit = jest.fn();
      jwtService.verify.mockReturnValue({ sub: "user-2", email: "b@c.com" });

      gateway.handleRefreshToken("new-valid-token", client);

      expect(client.data.token).toBe("new-valid-token");
      expect(client.data.userId).toBe("user-2");
      expect(client.emit).toHaveBeenCalledWith("tokenRefreshed", {
        success: true,
      });
    });

    it("無効なトークンで tokenRefreshed の失敗が emit されること", () => {
      const client = makeSocket();
      client.data.token = "old-token";
      client.emit = jest.fn();
      jwtService.verify.mockImplementation(() => {
        throw new Error("invalid token");
      });

      gateway.handleRefreshToken("invalid-token", client);

      expect(client.data.token).toBe("old-token");
      expect(client.emit).toHaveBeenCalledWith("tokenRefreshed", {
        success: false,
      });
    });

    it("Bearer プレフィックス付きトークンも処理できること", () => {
      const client = makeSocket();
      client.emit = jest.fn();
      jwtService.verify.mockReturnValue({ sub: "user-3", email: "c@d.com" });

      gateway.handleRefreshToken("Bearer new-token", client);

      expect(client.data.token).toBe("new-token");
      expect(client.data.userId).toBe("user-3");
      expect(client.emit).toHaveBeenCalledWith("tokenRefreshed", {
        success: true,
      });
    });
  });

  // ─── broadcastMessage ──────────────────────────────────────
  describe("broadcastMessage", () => {
    it("最小化されたペイロードのみemitする", () => {
      const emitMock = jest.fn();
      const toMock = jest.fn().mockReturnValue({ emit: emitMock });
      gateway.server = { to: toMock } as never;

      const message = {
        id: "msg-1",
        conversationId: "conv-1",
        senderId: "user-1",
        body: "hello",
        createdAt: new Date("2026-01-01"),
        readAt: new Date("2026-01-02"),
      } as import("@prisma/client").Message;

      gateway.broadcastMessage("conv-1", message);

      expect(toMock).toHaveBeenCalledWith("conversation:conv-1");
      expect(emitMock).toHaveBeenCalledWith("newMessage", {
        id: "msg-1",
        conversationId: "conv-1",
        senderId: "user-1",
        body: "hello",
        createdAt: message.createdAt,
      });
      // readAt は含まれないこと
      const emitted = emitMock.mock.calls[0][1] as Record<string, unknown>;
      expect(emitted).not.toHaveProperty("readAt");
    });
  });
});
