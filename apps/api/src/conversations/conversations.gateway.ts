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

@WebSocketGateway({
  cors: { origin: process.env.WEB_ORIGIN || "http://localhost:5173" },
  namespace: "/conversations",
})
export class ConversationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly userSocketMap = new Map<string, string>();

  constructor(private jwtService: JwtService) {}

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
      this.userSocketMap.set(payload.sub, client.id);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data.userId as string | undefined;
    if (userId && this.userSocketMap.get(userId) === client.id) {
      this.userSocketMap.delete(userId);
    }
  }

  @SubscribeMessage("joinConversation")
  handleJoin(
    @MessageBody() conversationId: string,
    @ConnectedSocket() client: Socket
  ) {
    client.join(`conversation:${conversationId}`);
  }

  @SubscribeMessage("leaveConversation")
  handleLeave(
    @MessageBody() conversationId: string,
    @ConnectedSocket() client: Socket
  ) {
    client.leave(`conversation:${conversationId}`);
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
