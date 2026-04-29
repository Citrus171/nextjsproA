import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useApiClient } from "../api/orvalClient";
import { ChevronLeft } from "lucide-react";
import type { ConversationListItemDto } from "../../../../packages/api-client/src/index";

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffMin < 1) return "今";
  if (diffMin < 60) return `${diffMin}分前`;
  if (diffHour < 24) return `${diffHour}時間前`;
  if (diffDay < 7) return `${diffDay}日前`;
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
}

export default function Conversations() {
  const client = useApiClient();
  const navigate = useNavigate();

  const {
    data: conversations,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["conversations"],
    queryFn: () => client.listConversations(),
    refetchInterval: (query) => (query.state.error ? false : 5000),
  });

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto p-4 sm:p-8">
        <p className="text-center text-muted-foreground text-sm">
          読み込み中...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto p-4 sm:p-8">
        <p className="text-center text-destructive text-sm">
          会話の取得に失敗しました
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-8 font-manrope">
      <div className="flex items-center gap-4 mb-8">
        <button
          type="button"
          onClick={() => navigate("/")}
          className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none transition-colors"
          aria-label="Mapに戻る"
        >
          <ChevronLeft size={24} className="text-foreground" />
        </button>
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
          会話一覧
        </h1>
      </div>
      {!conversations || conversations.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground text-sm">会話はまだありません</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {conversations.map((conv: ConversationListItemDto) => (
            <li key={conv.id}>
              <button
                type="button"
                aria-label={conv.partnerNickname}
                onClick={() => navigate(`/conversations/${conv.id}`)}
                className="w-full text-left bg-card rounded-3xl shadow-sm p-4 flex items-center gap-4 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-foreground text-sm truncate">
                      {conv.partnerNickname}
                    </span>
                    {conv.postTitle && (
                      <span className="text-xs text-muted-foreground truncate">
                        {conv.postTitle}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {conv.lastMessage
                      ? conv.lastMessage.body
                      : "メッセージはまだありません"}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  {conv.lastMessage && (
                    <span className="text-xs text-muted-foreground">
                      {formatDate(conv.lastMessage.createdAt)}
                    </span>
                  )}
                  {conv.unreadCount > 0 && (
                    <span
                      role="status"
                      className="bg-primary text-primary-foreground text-xs rounded-full min-w-6 h-6 px-1.5 flex items-center justify-center font-bold"
                    >
                      {conv.unreadCount}
                    </span>
                  )}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
