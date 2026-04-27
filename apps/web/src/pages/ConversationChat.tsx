import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { createConversationSocket } from "../lib/conversationSocket";
import { useApiClient } from "../api/orvalClient";
import { useAuth } from "../auth/AuthProvider";
import type { MessageResponseDto } from "../../../../packages/api-client/src/index";

export default function ConversationChat() {
  const { id } = useParams<{ id: string }>();
  const client = useApiClient();
  const { token, userId } = useAuth();
  const [messages, setMessages] = useState<MessageResponseDto[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [socketDisconnected, setSocketDisconnected] = useState(false);
  const fetchMessagesRef = useRef<(() => void) | null>(null);

  const { data: conversation } = useQuery({
    queryKey: ["conversation", id],
    queryFn: () => client.getConversation(id!),
    enabled: !!id,
  });

  const {
    data: initialMessages,
    isLoading,
    error,
    refetch: refetchMessages,
  } = useQuery({
    queryKey: ["messages", id],
    queryFn: () => client.getMessages(id!),
    enabled: !!id,
  });

  useEffect(() => {
    fetchMessagesRef.current = () => {
      void refetchMessages();
    };
  }, [refetchMessages]);

  useEffect(() => {
    if (initialMessages) {
      setMessages(initialMessages);
    }
  }, [initialMessages]);

  useEffect(() => {
    if (!id || !token) return;

    client.markAsRead(id);

    const socket = createConversationSocket(token);
    socket.emit("joinConversation", id);

    socket.on("newMessage", (msg: MessageResponseDto) => {
      setMessages((prev) => [...prev, msg]);
    });

    socket.on("disconnect", () => {
      setSocketDisconnected(true);
    });

    socket.on("connect", () => {
      setSocketDisconnected(false);
      socket.emit("joinConversation", id);
      fetchMessagesRef.current?.();
    });

    socket.on("connect_error", () => {
      setSocketDisconnected(true);
    });

    return () => {
      socket.disconnect();
    };
  }, [id, token]);

  const { mutate: sendMessage } = useMutation({
    mutationFn: (body: string) => client.sendMessage(id!, { body }),
    onSuccess: (data) => {
      setMessages((prev) => [...prev, data]);
      setInputValue("");
    },
  });

  if (isLoading) return <p>読み込み中...</p>;
  if (error) return <p>メッセージの取得に失敗しました</p>;

  const isOverLimit = inputValue.length > 1000;

  return (
    <div>
      {socketDisconnected && (
        <div
          role="alert"
          aria-live="assertive"
          style={{
            background: "#fef2f2",
            color: "#b91c1c",
            padding: "8px 12px",
            fontSize: 13,
          }}
        >
          接続が切れました。再接続中…
        </div>
      )}
      <div>
        {conversation && (
          <>
            <span>{conversation.partnerNickname}</span>
            {conversation.postTitle && <span>{conversation.postTitle}</span>}
          </>
        )}
      </div>

      <div>
        {messages.map((msg) => (
          <div
            key={msg.id}
            data-sender={msg.senderId === userId ? "self" : "other"}
          >
            {msg.body}
          </div>
        ))}
      </div>

      <div>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
        />
        <button
          type="button"
          disabled={isOverLimit || inputValue.length === 0}
          onClick={() => sendMessage(inputValue)}
        >
          送信
        </button>
      </div>
    </div>
  );
}
