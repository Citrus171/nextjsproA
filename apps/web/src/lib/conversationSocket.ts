import { io, type Socket } from "socket.io-client";

export function createConversationSocket(token: string): Socket {
  return io("/conversations", {
    auth: { token },
    transports: ["websocket", "polling"],
    upgrade: false,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
    timeout: 20000,
  });
}
