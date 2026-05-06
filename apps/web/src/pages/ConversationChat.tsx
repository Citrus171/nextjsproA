import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ChevronLeft, ImageIcon, X } from "lucide-react";
import { createConversationSocket } from "../lib/conversationSocket";
import { useApiClient } from "../api/orvalClient";
import { useAuth } from "../auth/AuthProvider";
import type { MessageResponseDto } from "../../../../packages/api-client/src/index";

type SendMessageInput = { body?: string; image?: File };

export default function ConversationChat() {
  const { id } = useParams<{ id: string }>();
  const client = useApiClient();
  const { token, userId } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<MessageResponseDto[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | undefined>(
    undefined
  );
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [modalImageUrl, setModalImageUrl] = useState<string | null>(null);
  const [socketDisconnected, setSocketDisconnected] = useState(false);
  const fetchMessagesRef = useRef<(() => void) | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

    let wasConnected = false;
    const socket = createConversationSocket(token);

    socket.on("newMessage", (msg: MessageResponseDto) => {
      setMessages((prev) =>
        prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]
      );
    });

    socket.on("disconnect", (reason) => {
      if (reason === "io client disconnect") return;
      if (wasConnected) {
        setSocketDisconnected(true);
      }
    });

    socket.on("connect", () => {
      wasConnected = true;
      setSocketDisconnected(false);
      socket.emit("joinConversation", id);
      fetchMessagesRef.current?.();
    });

    socket.on("connect_error", () => {
      if (wasConnected) {
        setSocketDisconnected(true);
      }
    });

    return () => {
      socket.off("newMessage");
      socket.off("disconnect");
      socket.off("connect");
      socket.off("connect_error");
      socket.disconnect();
    };
  }, [id, token]);

  const { mutate: sendMessage } = useMutation({
    mutationFn: ({ body, image }: SendMessageInput) =>
      client.sendMessage(id!, { body, image }),
    onSuccess: (data) => {
      setMessages((prev) => [...prev, data]);
      setInputValue("");
      setSelectedImage(undefined);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
    },
  });

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedImage(file);
    setPreviewUrl(URL.createObjectURL(file));
    e.target.value = "";
  }

  function cancelImage() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedImage(undefined);
    setPreviewUrl(null);
  }

  if (isLoading)
    return (
      <div className="max-w-2xl mx-auto p-4 sm:p-8 text-center h-screen flex items-center justify-center">
        <p className="text-muted-foreground text-sm">読み込み中...</p>
      </div>
    );
  if (error)
    return (
      <div className="max-w-2xl mx-auto p-4 sm:p-8 text-center h-screen flex items-center justify-center">
        <p className="text-destructive text-sm">
          メッセージの取得に失敗しました
        </p>
      </div>
    );

  const isOverLimit = inputValue.length > 1000;
  const canSend = !isOverLimit && (inputValue.length > 0 || !!selectedImage);

  return (
    <div className="max-w-2xl mx-auto h-[100dvh] flex flex-col font-manrope">
      {/* Header */}
      <div
        data-testid="chat-header"
        className="flex items-center gap-3 px-4 py-3 border-b border-border shrink-0"
      >
        <button
          type="button"
          aria-label="会話一覧に戻る"
          onClick={() => navigate("/conversations")}
          className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none transition-colors"
        >
          <ChevronLeft size={24} className="text-foreground" />
        </button>
        {conversation && (
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold text-foreground truncate">
              {conversation.partnerNickname}
            </h1>
            {conversation.postTitle && (
              <p className="text-xs text-muted-foreground truncate">
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
          className="bg-destructive/10 text-destructive text-xs px-3 py-2 text-center font-medium shrink-0"
        >
          接続が切れました。再接続中…
        </div>
      )}

      {/* Resolved Banner */}
      {conversation?.postStatus === "resolved" && (
        <div
          role="status"
          className="bg-muted text-muted-foreground text-xs px-3 py-2 text-center font-medium shrink-0"
        >
          この投稿は解決済みです
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
                  ? "bg-primary text-primary-foreground rounded-[1.25rem] rounded-br-sm ml-auto"
                  : "bg-muted text-foreground rounded-[1.25rem] rounded-bl-sm mr-auto"
              }`}
            >
              {msg.body && <p>{msg.body}</p>}
              {msg.imageUrl && (
                <button
                  type="button"
                  onClick={() => setModalImageUrl(msg.imageUrl!)}
                  className="mt-1 block"
                >
                  <img
                    src={msg.imageUrl}
                    alt="送信画像"
                    className="max-w-[200px] rounded-lg cursor-pointer"
                  />
                </button>
              )}
              <div
                className={`text-xs mt-1 ${
                  isSelf
                    ? "text-primary-foreground/70"
                    : "text-muted-foreground"
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

      {/* Image Preview */}
      {previewUrl && (
        <div className="px-4 py-2 border-t border-border bg-card shrink-0 flex items-center gap-2">
          <img
            src={previewUrl.startsWith("blob:") ? previewUrl : undefined}
            alt="送信画像プレビュー"
            className="h-16 w-16 object-cover rounded-lg"
          />
          <button
            type="button"
            aria-label="画像をキャンセル"
            onClick={cancelImage}
            className="flex items-center justify-center w-6 h-6 rounded-full bg-muted hover:bg-destructive/20 transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Input Area */}
      <div
        data-testid="chat-input"
        className="sticky bottom-0 px-4 py-3 border-t border-border bg-card shrink-0 pb-[calc(0.75rem+env(safe-area-inset-bottom))]"
      >
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png"
            className="hidden"
            onChange={handleImageSelect}
          />
          <button
            type="button"
            aria-label="画像を選択"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none transition-colors shrink-0"
          >
            <ImageIcon size={20} className="text-muted-foreground" />
          </button>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="flex-1 h-12 px-4 bg-muted rounded-full text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="メッセージを入力"
          />
          <button
            type="button"
            disabled={!canSend}
            onClick={() =>
              sendMessage({
                body: inputValue || undefined,
                image: selectedImage,
              })
            }
            className={`h-12 px-6 rounded-full text-sm font-bold transition-all focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none ${
              !canSend
                ? "bg-muted text-muted-foreground"
                : "bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.98]"
            }`}
          >
            送信
          </button>
        </div>
        {isOverLimit && (
          <p className="text-xs text-destructive mt-1 ml-4">
            1000文字以内で入力してください
          </p>
        )}
      </div>

      {/* Full-size Image Modal */}
      {modalImageUrl && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
          onClick={() => setModalImageUrl(null)}
        >
          <img
            src={modalImageUrl}
            alt="フルサイズ画像"
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
