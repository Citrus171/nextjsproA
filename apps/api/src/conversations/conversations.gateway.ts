import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { JwtService } from "@nestjs/jwt";
import { Message } from "@prisma/client";
import { JwtPayload } from "../auth/interfaces/jwt-payload.interface";
import { ConversationsService } from "./conversation.service";

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
  private readonly userSocketMap = new Map<string, string>();

  constructor(
    private jwtService: JwtService,
    private conversationsService: ConversationsService
  ) {}

  handleConnection(client: Socket) {
    const raw =
      client.handshake.auth?.token ??
      (client.handshake.headers?.authorization as string | undefined);

    if (!raw) {
      client.disconnect();
      return;
    }

    try {
      const token = raw.startsWith("Bearer ") ? raw.slice(7) : raw;
      const payload = this.jwtService.verify<JwtPayload>(token);
      client.data.userId = payload.sub;
      client.data.token = token;
      this.userSocketMap.set(payload.sub, client.id);
    } catch {
      client.disconnect();
    }
  }

  private reVerifyOrDisconnect(client: Socket): boolean {
    const token = client.data.token as string | undefined;
    if (!token) {
      client.disconnect();
      return false;
    }
    try {
      this.jwtService.verify<JwtPayload>(token);
      return true;
    } catch {
      const userId = client.data.userId as string | undefined;
      console.warn(`[WS] JWT期限切れのため切断: userId=${userId ?? "unknown"}`);
      client.disconnect();
      return false;
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data.userId as string | undefined;
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
    const userId = client.data.userId as string | undefined;
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
    const userId = client.data.userId as string | undefined;
    if (!userId) {
      client.disconnect();
      return;
    }
    void client.leave(`conversation:${conversationId}`);
  }

  broadcastMessage(conversationId: string, message: Message) {
    const { id, senderId, body, createdAt } = message;
    const senderSocketId = this.userSocketMap.get(senderId);
    const target = senderSocketId
      ? this.server.except(senderSocketId).to(`conversation:${conversationId}`)
      : this.server.to(`conversation:${conversationId}`);
    target.emit("newMessage", {
      id,
      conversationId,
      senderId,
      body,
      createdAt,
    });
  }
}
