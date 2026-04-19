import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { JwtService } from "@nestjs/jwt";
import { Message } from "@prisma/client";

@WebSocketGateway({
  cors: { origin: process.env.WEB_ORIGIN || "http://localhost:5173" },
  namespace: "/conversations",
})
export class ConversationsGateway implements OnGatewayConnection {
  @WebSocketServer()
  server: Server;

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
      this.jwtService.verify(token);
    } catch {
      client.disconnect();
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
    this.server
      .to(`conversation:${conversationId}`)
      .emit("newMessage", message);
  }
}
