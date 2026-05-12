import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from "@nestjs/websockets";
import { Logger } from "@nestjs/common";
import { Server, Socket } from "socket.io";
import { JwtService } from "@nestjs/jwt";
import { Message } from "@prisma/client";
import { JwtPayload } from "../auth/interfaces/jwt-payload.interface";
import { ConversationsService } from "./conversation.service";

interface SocketData {
  userId?: string;
  token?: string;
  tokenCheckInterval?: ReturnType<typeof setInterval>;
}

interface HandshakeAuth {
  auth?: { token?: string };
  headers?: { authorization?: string };
}

@WebSocketGateway({
  cors: { origin: process.env.WEB_ORIGIN || "http://localhost:5173" },
  namespace: "/conversations",
})
export class ConversationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  // userId → socketId の1対1マッピング。
  // 同一ユーザーが複数タブ/ブラウザで接続した場合は後勝ちとなる。
  // 意図的な単一接続制約であり、複数接続が必要な場合は Map<string, Set<string>> に変更する。
  private readonly logger = new Logger(ConversationsGateway.name);
  private readonly userSocketMap = new Map<string, string>();

  constructor(
    private jwtService: JwtService,
    private conversationsService: ConversationsService
  ) {}

  handleConnection(client: Socket) {
    const hs = client.handshake as unknown as HandshakeAuth;
    const raw = hs.auth?.token ?? hs.headers?.authorization;

    if (!raw) {
      client.disconnect();
      return;
    }

    try {
      const token = raw.startsWith("Bearer ") ? raw.slice(7) : raw;
      const payload = this.jwtService.verify<JwtPayload>(token, {
        algorithms: ["HS256"],
      });
      const data = client.data as unknown as SocketData;
      data.userId = payload.sub;
      data.token = token;
      this.userSocketMap.set(payload.sub, client.id);
      const interval = setInterval(() => {
        try {
          this.jwtService.verify<JwtPayload>(data.token!, {
            algorithms: ["HS256"],
          });
        } catch {
          clearInterval(interval);
          client.disconnect();
        }
      }, 15000);
      data.tokenCheckInterval = interval;
    } catch {
      client.disconnect();
    }
  }

  private reVerifyOrDisconnect(client: Socket): boolean {
    const data = client.data as unknown as SocketData;
    const token = data.token;
    if (!token) {
      client.disconnect();
      return false;
    }
    try {
      this.jwtService.verify<JwtPayload>(token, { algorithms: ["HS256"] });
      return true;
    } catch {
      const userId = data.userId;
      this.logger.warn(`JWT期限切れのため切断: userId=${userId ?? "unknown"}`);
      client.disconnect();
      return false;
    }
  }

  handleDisconnect(client: Socket) {
    const data = client.data as unknown as SocketData;
    const interval = data.tokenCheckInterval;
    if (interval) {
      clearInterval(interval);
    }
    const userId = data.userId;
    if (userId && this.userSocketMap.get(userId) === client.id) {
      this.userSocketMap.delete(userId);
    }
  }

  @SubscribeMessage("joinConversation")
  async handleJoin(
    @MessageBody() conversationId: string,
    @ConnectedSocket() client: Socket
  ) {
    if (!this.reVerifyOrDisconnect(client)) return;
    const data = client.data as unknown as SocketData;
    const userId = data.userId;
    if (!userId) {
      client.disconnect();
      return;
    }
    try {
      await this.conversationsService.findOneForUser(userId, conversationId);
    } catch {
      client.disconnect();
      return;
    }
    void client.join(`conversation:${conversationId}`);
  }

  @SubscribeMessage("leaveConversation")
  handleLeave(
    @MessageBody() conversationId: string,
    @ConnectedSocket() client: Socket
  ) {
    if (!this.reVerifyOrDisconnect(client)) return;
    const data = client.data as unknown as SocketData;
    const userId = data.userId;
    if (!userId) {
      client.disconnect();
      return;
    }
    void client.leave(`conversation:${conversationId}`);
  }

  @SubscribeMessage("refreshToken")
  handleRefreshToken(
    @MessageBody() rawToken: string,
    @ConnectedSocket() client: Socket
  ) {
    const token = rawToken.startsWith("Bearer ") ? rawToken.slice(7) : rawToken;
    try {
      const payload = this.jwtService.verify<JwtPayload>(token, {
        algorithms: ["HS256"],
      });
      const data = client.data as unknown as SocketData;
      data.token = token;
      data.userId = payload.sub;
      client.emit("tokenRefreshed", { success: true });
    } catch {
      client.emit("tokenRefreshed", { success: false });
    }
  }

  broadcastMessage(conversationId: string, message: Message) {
    const { id, senderId, body, imageUrl, createdAt } = message;
    const senderSocketId = this.userSocketMap.get(senderId);
    const target = senderSocketId
      ? this.server.except(senderSocketId).to(`conversation:${conversationId}`)
      : this.server.to(`conversation:${conversationId}`);
    target.emit("newMessage", {
      id,
      conversationId,
      senderId,
      body,
      imageUrl,
      createdAt,
    });
  }
}
