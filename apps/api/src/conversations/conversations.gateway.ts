import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";

@WebSocketGateway({ cors: true, namespace: "/conversations" })
export class ConversationsGateway {
  @WebSocketServer()
  server: Server;

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

  broadcastMessage(conversationId: string, message: unknown) {
    this.server
      .to(`conversation:${conversationId}`)
      .emit("newMessage", message);
  }
}
