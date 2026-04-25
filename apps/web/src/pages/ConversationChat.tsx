import { useState, useEffect } from "react";
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

  const { data: conversation } = useQuery({
    queryKey: ["conversation", id],
    queryFn: () => client.getConversation(id!),
    enabled: !!id,
  });

  const {
    data: initialMessages,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["messages", id],
    queryFn: () => client.getMessages(id!),
    enabled: !!id,
  });

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
