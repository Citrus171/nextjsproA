import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ChevronLeft } from "lucide-react";
import { createConversationSocket } from "../lib/conversationSocket";
import { useApiClient } from "../api/orvalClient";
import { useAuth } from "../auth/AuthProvider";
import type { MessageResponseDto } from "../../../../packages/api-client/src/index";

export default function ConversationChat() {
  const { id } = useParams<{ id: string }>();
  const client = useApiClient();
  const { token, userId } = useAuth();
  const navigate = useNavigate();
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
      setMessages((prev) => {
        if (prev.length === 0) return initialMessages;
        const serverIds = new Set(initialMessages.map((m) => m.id));
        const socketOnly = prev.filter((m) => !serverIds.has(m.id));
        return [...initialMessages, ...socketOnly];
      });
    }
  }, [initialMessages]);

  useEffect(() => {
    if (!id || !token) return;

    client.markAsRead(id);

    let isFirstConnect = true;
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
      if (!isFirstConnect) {
        fetchMessagesRef.current?.();
      }
      isFirstConnect = false;
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

  if (isLoading)
    return (
      <div className="max-w-2xl mx-auto p-4 sm:p-8 text-center h-screen flex items-center justify-center">
        <p className="text-slate-400 text-sm">読み込み中...</p>
      </div>
    );
  if (error)
    return (
      <div className="max-w-2xl mx-auto p-4 sm:p-8 text-center h-screen flex items-center justify-center">
        <p className="text-red-500 text-sm">メッセージの取得に失敗しました</p>
      </div>
    );

  const isOverLimit = inputValue.length > 1000;

  return (
    <div className="max-w-2xl mx-auto h-[100dvh] flex flex-col font-manrope">
      {/* Header */}
      <div
        data-testid="chat-header"
        className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 shrink-0"
      >
        <button
          type="button"
          aria-label="会話一覧に戻る"
          onClick={() => navigate("/conversations")}
          className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-slate-100 transition-colors"
        >
          <ChevronLeft size={24} className="text-slate-700" />
        </button>
        {conversation && (
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold text-slate-900 truncate">
              {conversation.partnerNickname}
            </h1>
            {conversation.postTitle && (
              <p className="text-xs text-slate-400 truncate">
                {conversation.postTitle}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Disconnect Banner */}
      {socketDisconnected && (
        <div
          role="alert"
          aria-live="assertive"
          className="bg-red-50 text-red-700 text-xs px-3 py-2 text-center font-medium shrink-0"
        >
          接続が切れました。再接続中…
        </div>
      )}

      {/* Message List */}
      <div
        data-testid="message-list"
        className="flex-1 overflow-y-auto p-4 space-y-1"
      >
        {messages.map((msg) => {
          const isSelf = msg.senderId === userId;
          return (
            <div
              key={msg.id}
              data-sender={isSelf ? "self" : "other"}
              className={`max-w-[75%] px-4 py-2 ${
                isSelf
                  ? "bg-[#1a73e8] text-white rounded-[1.25rem] rounded-br-sm ml-auto"
                  : "bg-slate-100 text-slate-900 rounded-[1.25rem] rounded-bl-sm mr-auto"
              }`}
            >
              {msg.body}
              <div
                className={`text-[10px] mt-1 ${
                  isSelf ? "text-blue-200" : "text-slate-400"
                }`}
              >
                {new Date(msg.createdAt).toLocaleTimeString("ja-JP", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Input Area */}
      <div
        data-testid="chat-input"
        className="sticky bottom-0 px-4 py-3 border-t border-slate-100 bg-white shrink-0"
      >
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="flex-1 h-12 px-4 bg-slate-50 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="メッセージを入力"
          />
          <button
            type="button"
            disabled={isOverLimit || inputValue.length === 0}
            onClick={() => sendMessage(inputValue)}
            className={`h-12 px-6 rounded-full text-sm font-bold transition-all ${
              isOverLimit || inputValue.length === 0
                ? "bg-slate-100 text-slate-400"
                : "bg-[#1a73e8] text-white hover:bg-blue-700 active:scale-[0.98]"
            }`}
          >
            送信
          </button>
        </div>
        {isOverLimit && (
          <p className="text-[10px] text-red-500 mt-1 ml-4">
            1000文字以内で入力してください
          </p>
        )}
      </div>
    </div>
  );
}
