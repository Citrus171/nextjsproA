import { JwtService } from "@nestjs/jwt";
import { ConversationsGateway } from "./conversations.gateway";
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

  beforeEach(() => {
    jwtService = { verify: jest.fn() } as unknown as jest.Mocked<JwtService>;
    gateway = new ConversationsGateway(jwtService);
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
