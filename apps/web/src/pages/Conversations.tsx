import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useApiClient } from "../api/orvalClient";
import type { ConversationListItemDto } from "../../../../packages/api-client/src/index";

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
    refetchInterval: 5000,
  });

  if (isLoading) {
    return <p>読み込み中...</p>;
  }

  if (error) {
    return <p>会話の取得に失敗しました</p>;
  }

  return (
    <div>
      <div>
        <button type="button" onClick={() => navigate("/")}>
          ← Map
        </button>
      </div>
      {(!conversations || conversations.length === 0) ? (
        <p>会話はまだありません</p>
      ) : (
    <ul>
      {conversations.map((conv: ConversationListItemDto) => (
        <li key={conv.id}>
          <button
            type="button"
            aria-label={conv.partnerNickname}
            onClick={() => navigate(`/conversations/${conv.id}`)}
            style={{ width: "100%", textAlign: "left" }}
          >
            <span>{conv.partnerNickname}</span>
            {conv.postTitle && <span>{conv.postTitle}</span>}
            <span>
              {conv.lastMessage
                ? conv.lastMessage.body
                : "メッセージはまだありません"}
            </span>
            {conv.unreadCount > 0 && <span>{conv.unreadCount}</span>}
          </button>
        </li>
      ))}
    </ul>
      )}
    </div>
  );
}
