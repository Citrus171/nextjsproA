import { io, type Socket } from "socket.io-client";

export function createConversationSocket(token: string): Socket {
  return io("/conversations", { auth: { token } });
}
